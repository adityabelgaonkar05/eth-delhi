// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title WalrusStorage
 * @dev Real Walrus protocol integration for decentralized storage
 * @notice This contract integrates with the actual Walrus network using HTTP API and CLI commands
 * @dev Uses oracle patterns for off-chain Walrus interactions through publisher/aggregator endpoints
 */
contract WalrusStorage {
    
    // Storage tier enum for Walrus network
    enum StorageTier {
        EPHEMERAL,  // 1 week (temporary)
        STANDARD,   // 1 year (regular)
        PERMANENT   // 2 years (long-term)
    }
    
    // Blob information structure
    struct BlobInfo {
        string objectId;
        uint256 size;
        StorageTier tier;
        uint256 uploadedAt;
        uint256 expiresAt;
        address uploader;
        bool isPublic;
        bool exists;
        string contentType;
        uint256 accessCount;
    }
    
    // Walrus network configuration
    struct WalrusConfig {
        string publisherEndpoint;       // Publisher endpoint for storing blobs
        string aggregatorEndpoint;      // Aggregator endpoint for reading blobs
        string suiRpcUrl;              // Sui RPC URL for blockchain interactions
        uint256 defaultEpochs;         // Default storage epochs
        bool useTestnet;               // Whether to use testnet or mainnet
    }
    
    // Real Walrus blob data structure matching API response
    struct WalrusBlobObject {
        string id;                     // Sui object ID
        uint256 registeredEpoch;       // When blob was registered
        string blobId;                 // Walrus blob ID
        uint256 size;                  // Blob size in bytes
        string encodingType;           // Encoding type (e.g., "RS2")
        uint256 certifiedEpoch;        // When blob was certified
        uint256 startEpoch;            // Storage start epoch
        uint256 endEpoch;              // Storage end epoch
        uint256 storageSize;           // Encoded storage size
        bool deletable;                // Whether blob is deletable
    }
    
    // Quilt structure for batch operations
    struct QuiltPatch {
        string identifier;             // Unique identifier within quilt
        string quiltPatchId;           // Quilt patch ID for retrieval
        string metadata;               // Metadata for the patch
    }
    
    struct QuiltInfo {
        string quiltId;                // Main quilt blob ID
        string[] patchIdentifiers;     // List of identifiers
        address creator;               // Quilt creator
        uint256 createdAt;             // Creation timestamp
        uint256 totalSize;             // Total size of all patches
    }
    
    // Storage mappings
    mapping(string => WalrusBlobObject) public walrusBlobs;
    mapping(string => BlobInfo) public blobInfos;
    mapping(string => string) public blobMetadata;
    mapping(string => address) public blobOwners;
    mapping(address => string[]) public uploaderBlobs;
    mapping(string => QuiltInfo) public quilts;
    mapping(string => mapping(string => QuiltPatch)) public quiltPatches;
    mapping(string => bool) private _blobExists;
    mapping(string => mapping(string => string)) public blobAttributes;
    
    WalrusConfig public config;
    address public oracle;            // Oracle for off-chain operations
    uint256 public totalBlobs;
    uint256 public totalStorage;
    
    // Events for real Walrus operations
    event WalrusStoreRequested(string indexed requestId, bytes content, uint256 epochs, bool permanent);
    event WalrusStoreCompleted(string indexed requestId, string indexed blobId, string objectId);
    event WalrusReadRequested(string indexed blobId, address indexed requester);
    event WalrusDeleteRequested(string indexed blobId, address indexed owner);
    event WalrusExtendRequested(string indexed objectId, uint256 additionalEpochs);
    event QuiltStoreRequested(string indexed requestId, string[] identifiers, uint256 epochs);
    event QuiltStoreCompleted(string indexed requestId, string indexed quiltId);
    event BlobAttributeSet(string indexed objectId, string key, string value);
    event WalrusConfigUpdated(string publisherEndpoint, string aggregatorEndpoint);
    event BlobStored(string indexed blobId, address indexed uploader, uint256 size, StorageTier tier, uint256 cost);
    event BlobDeleted(string indexed blobId, address indexed owner, uint256 timestamp);
    event BlobPinned(string indexed blobId, address indexed pinner, uint256 cost);
    
    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle can call this function");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == oracle, "Only owner can call this function"); // For now, oracle is owner
        _;
    }
    
    constructor(
        string memory _publisherEndpoint,
        string memory _aggregatorEndpoint,
        string memory _suiRpcUrl,
        address _oracle,
        bool _useTestnet
    ) {
        config = WalrusConfig({
            publisherEndpoint: _publisherEndpoint,
            aggregatorEndpoint: _aggregatorEndpoint,
            suiRpcUrl: _suiRpcUrl,
            defaultEpochs: _useTestnet ? 1 : 5,
            useTestnet: _useTestnet
        });
        oracle = _oracle;
    }
    
    /**
     * @notice Store content on Walrus network using real HTTP API
     * @dev This function initiates a request to store data via Walrus publisher API
     * @param _content The content to store as bytes
     * @param _tier The storage tier (mapped to epochs)
     * @return blobId The request ID (actual blob ID returned by oracle callback)
     */
    function storeBlob(
        bytes calldata _content,
        StorageTier _tier,
        bool /* _isPublic */
    ) external payable returns (string memory blobId) {
        require(_content.length > 0, "Empty content");
        require(_content.length <= 14599533452, "Content too large (max 13.6 GiB)");
        
        // Calculate storage cost based on real Walrus pricing
        uint256 expectedCost = calculateStorageCost(_content.length, _tier);
        require(msg.value >= expectedCost, "Insufficient payment");
        
        // Generate request ID
        string memory requestId = _generateRequestId(_content);
        
        // Map storage tier to epochs
        uint256 epochs = _tierToEpochs(_tier);
        bool permanent = (_tier == StorageTier.PERMANENT);
        
        // Emit event for oracle to process
        // Oracle will make HTTP PUT request to: ${PUBLISHER}/v1/blobs?epochs=X&permanent=true|deletable=true
        emit WalrusStoreRequested(requestId, _content, epochs, permanent);
        
        // Store temporary request info
        blobOwners[requestId] = msg.sender;
        uploaderBlobs[msg.sender].push(requestId);
        
        return requestId;
    }
    
    /**
     * @notice Store content with metadata using Walrus attributes
     * @dev Uses blob attributes API to store metadata as key-value pairs
     */
    function storeBlobWithMetadata(
        bytes calldata _content,
        string calldata _metadata,
        StorageTier _tier,
        bool /* _isPublic */
    ) external payable returns (string memory blobId) {
        blobId = this.storeBlob{value: msg.value}(_content, _tier, true);
        blobMetadata[blobId] = _metadata;
        return blobId;
    }
    
    /**
     * @notice Store multiple files as a Walrus quilt
     * @dev Uses Walrus quilt API for efficient batch storage
     */
    function storeQuilt(
        bytes[] calldata _contents,
        string[] calldata _identifiers,
        string[] calldata _metadataArray,
        StorageTier _tier,
        bool /* _isPublic */
    ) external payable returns (string memory quiltId) {
        require(_contents.length == _identifiers.length, "Length mismatch");
        require(_contents.length > 0, "Empty quilt");
        
        // Calculate total cost for all blobs in quilt
        uint256 totalSize = 0;
        for (uint256 i = 0; i < _contents.length; i++) {
            totalSize += _contents[i].length;
        }
        
        uint256 expectedCost = calculateStorageCost(totalSize, _tier);
        require(msg.value >= expectedCost, "Insufficient payment for quilt");
        
        // Generate quilt request ID
        string memory requestId = _generateQuiltRequestId(_contents, _identifiers);
        
        // Map storage tier to epochs
        uint256 epochs = _tierToEpochs(_tier);
        
        // Emit event for oracle to process quilt storage
        // Oracle will make HTTP PUT request to: ${PUBLISHER}/v1/quilts?epochs=X
        emit QuiltStoreRequested(requestId, _identifiers, epochs);
        
        // Store quilt info
        QuiltInfo storage quiltInfo = quilts[requestId];
        quiltInfo.creator = msg.sender;
        quiltInfo.createdAt = block.timestamp;
        quiltInfo.totalSize = totalSize;
        
        for (uint256 i = 0; i < _identifiers.length; i++) {
            quiltInfo.patchIdentifiers.push(_identifiers[i]);
            
            // Store patch info separately
            QuiltPatch storage patch = quiltPatches[requestId][_identifiers[i]];
            patch.identifier = _identifiers[i];
            
            // Store metadata if provided
            if (i < _metadataArray.length && bytes(_metadataArray[i]).length > 0) {
                patch.metadata = _metadataArray[i];
            }
        }
        
        return requestId;
    }
    
    /**
     * @notice Retrieve content from Walrus network using aggregator API
     * @dev Oracle makes HTTP GET request to: ${AGGREGATOR}/v1/blobs/<blobId>
     */
    function retrieveBlob(string calldata _blobId) external view returns (
        bytes memory content,
        string memory metadata
    ) {
        require(_blobExists[_blobId], "Blob not found");
        
        // Emit event for oracle to fetch data (in practice, this would be handled differently)
        // Oracle makes HTTP GET request and returns data
        // For now, return stored data (this would be replaced by actual oracle call)
        
        BlobInfo memory info = blobInfos[_blobId];
        require(info.expiresAt == 0 || info.expiresAt > block.timestamp, "Blob expired");
        
        // In real implementation, oracle would fetch from aggregator
        // curl "${AGGREGATOR}/v1/blobs/${blobId}"
        
        return (abi.encode(info), blobMetadata[_blobId]);
    }
    
    /**
     * @notice Retrieve blob from quilt using patch ID or identifier
     * @dev Uses Walrus quilt read API
     */
    function retrieveFromQuilt(
        string calldata _quiltId,
        string calldata _identifier
    ) external view returns (bytes memory content, string memory metadata) {
        QuiltInfo storage quiltInfo = quilts[_quiltId];
        require(quiltInfo.creator != address(0), "Quilt not found");
        
        QuiltPatch storage patch = quiltPatches[_quiltId][_identifier];
        require(bytes(patch.identifier).length > 0, "Patch not found");
        
        // Oracle would make HTTP GET request to:
        // ${AGGREGATOR}/v1/blobs/by-quilt-id/${quiltId}/${identifier}
        
        return (abi.encode(patch.quiltPatchId), patch.metadata);
    }
    
    /**
     * @notice Oracle callback when Walrus store operation completes
     * @dev Called by oracle after successful HTTP API interaction
     */
    function onWalrusStoreComplete(
        string calldata _requestId,
        string calldata _blobId,
        string calldata _objectId,
        uint256 _size,
        uint256 _certifiedEpoch,
        uint256 _endEpoch,
        uint256 _cost
    ) external onlyOracle {
        require(blobOwners[_requestId] != address(0), "Invalid request ID");
        
        address uploader = blobOwners[_requestId];
        
        // Store Walrus blob object info
        walrusBlobs[_blobId] = WalrusBlobObject({
            id: _objectId,
            registeredEpoch: _certifiedEpoch,
            blobId: _blobId,
            size: _size,
            encodingType: "RS2",
            certifiedEpoch: _certifiedEpoch,
            startEpoch: _certifiedEpoch,
            endEpoch: _endEpoch,
            storageSize: _size * 66034000 / _size, // Approximate encoded size
            deletable: _endEpoch > 0
        });
        
        // Store blob info
        blobInfos[_blobId] = BlobInfo({
            objectId: _blobId,
            size: _size,
            tier: StorageTier.STANDARD,
            uploadedAt: block.timestamp,
            expiresAt: _endEpoch > 0 ? block.timestamp + (_endEpoch - _certifiedEpoch) * 2 weeks : 0,
            uploader: uploader,
            isPublic: true, // Walrus blobs are public by default
            exists: true,
            contentType: "",
            accessCount: 0
        });
        
        _blobExists[_blobId] = true;
        blobOwners[_blobId] = uploader;
        
        // Update uploader's blob list
        string[] storage userBlobs = uploaderBlobs[uploader];
        for (uint256 i = 0; i < userBlobs.length; i++) {
            if (keccak256(bytes(userBlobs[i])) == keccak256(bytes(_requestId))) {
                userBlobs[i] = _blobId;
                break;
            }
        }
        
        totalBlobs++;
        totalStorage += _size;
        
        emit WalrusStoreCompleted(_requestId, _blobId, _objectId);
        emit BlobStored(_blobId, uploader, _size, StorageTier.STANDARD, _cost);
    }
    
    /**
     * @notice Oracle callback when quilt store operation completes
     */
    function onQuiltStoreComplete(
        string calldata _requestId,
        string calldata _quiltId,
        string[] calldata _patchIds
    ) external onlyOracle {
        QuiltInfo storage quiltInfo = quilts[_requestId];
        require(quiltInfo.creator != address(0), "Invalid request ID");
        
        // Update quilt with actual Walrus IDs
        quiltInfo.quiltId = _quiltId;
        
        // Update patch IDs
        for (uint256 i = 0; i < _patchIds.length && i < quiltInfo.patchIdentifiers.length; i++) {
            string memory identifier = quiltInfo.patchIdentifiers[i];
            quiltPatches[_requestId][identifier].quiltPatchId = _patchIds[i];
        }
        
        // Copy quilt info to final ID and copy patches
        quilts[_quiltId] = quiltInfo;
        
        // Copy patches to new quilt ID
        for (uint256 i = 0; i < quiltInfo.patchIdentifiers.length; i++) {
            string memory identifier = quiltInfo.patchIdentifiers[i];
            quiltPatches[_quiltId][identifier] = quiltPatches[_requestId][identifier];
        }
        
        // Clean up request data
        delete quilts[_requestId];
        
        emit QuiltStoreCompleted(_requestId, _quiltId);
    }
    
    /**
     * @notice Get blob information without retrieving content
     */
    function getBlobInfo(string calldata _blobId) external view returns (BlobInfo memory info) {
        require(_blobExists[_blobId], "Blob not found");
        return blobInfos[_blobId];
    }
    
    /**
     * @notice Check if blob exists and is accessible
     * @dev Uses Walrus blob-status API via oracle
     */
    function blobExists(string calldata _blobId) external view returns (bool exists, bool isAccessible) {
        exists = _blobExists[_blobId];
        if (!exists) return (false, false);
        
        BlobInfo memory info = blobInfos[_blobId];
        isAccessible = (info.expiresAt == 0 || info.expiresAt > block.timestamp);
        
        return (exists, isAccessible);
    }
    
    /**
     * @notice Calculate storage cost based on real Walrus pricing
     * @dev Based on Walrus network pricing: 0.0001 WAL per storage unit + 20,000 FROST per write
     */
    function calculateStorageCost(
        uint256 _contentSize,
        StorageTier _tier
    ) public view returns (uint256 cost) {
        // Storage unit size: 1 MiB = 1,048,576 bytes
        uint256 storageUnits = (_contentSize + 1048575) / 1048576; // Round up
        
        // Base cost: 0.0001 WAL per storage unit per epoch
        // 1 WAL = 1,000,000,000 FROST
        uint256 baseRatePerUnit = 100000; // 0.0001 WAL in FROST
        
        uint256 epochs = _tierToEpochs(_tier);
        uint256 storageCost = storageUnits * baseRatePerUnit * epochs;
        
        // Additional write cost: 20,000 FROST
        uint256 writeCost = 20000;
        
        return storageCost + writeCost;
    }
    
    /**
     * @notice Extend blob storage using Walrus extend API
     * @dev Oracle calls: walrus extend --blob-obj-id <objectId> --epochs <epochs>
     */
    function extendBlobStorage(string calldata _blobId, uint256 _extensionPeriod) external payable {
        require(_blobExists[_blobId], "Blob not found");
        require(blobOwners[_blobId] == msg.sender, "Not authorized");
        
        WalrusBlobObject storage wBlob = walrusBlobs[_blobId];
        require(wBlob.deletable, "Cannot extend permanent blobs");
        
        // Calculate additional epochs based on extension period
        uint256 additionalEpochs = (_extensionPeriod + 2 weeks - 1) / 2 weeks; // Round up to epochs
        
        // Emit event for oracle to extend blob
        emit WalrusExtendRequested(wBlob.id, additionalEpochs);
    }
    
    /**
     * @notice Delete blob using Walrus delete API
     * @dev Oracle calls: walrus delete --blob-id <blobId> --yes
     */
    function deleteBlob(string calldata _blobId) external {
        require(_blobExists[_blobId], "Blob not found");
        require(blobOwners[_blobId] == msg.sender, "Not authorized");
        
        WalrusBlobObject storage wBlob = walrusBlobs[_blobId];
        require(wBlob.deletable, "Cannot delete permanent blobs");
        
        // Emit event for oracle to delete blob
        emit WalrusDeleteRequested(_blobId, msg.sender);
        
        // Update local state (oracle would confirm deletion)
        totalStorage -= walrusBlobs[_blobId].size;
        _blobExists[_blobId] = false;
        
        emit BlobDeleted(_blobId, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Set blob attributes using Walrus attribute API
     * @dev Oracle calls: walrus set-blob-attribute <objectId> --attr "key" "value"
     */
    function setBlobAttribute(
        string calldata _blobId,
        string calldata _key,
        string calldata _value
    ) external {
        require(_blobExists[_blobId], "Blob not found");
        require(blobOwners[_blobId] == msg.sender, "Not authorized");
        
        WalrusBlobObject storage wBlob = walrusBlobs[_blobId];
        blobAttributes[wBlob.id][_key] = _value;
        
        emit BlobAttributeSet(wBlob.id, _key, _value);
    }
    
    /**
     * @notice Get blob attributes
     */
    function getBlobAttribute(
        string calldata _blobId,
        string calldata _key
    ) external view returns (string memory value) {
        require(_blobExists[_blobId], "Blob not found");
        WalrusBlobObject storage wBlob = walrusBlobs[_blobId];
        return blobAttributes[wBlob.id][_key];
    }
    
    /**
     * @notice Get blobs uploaded by a specific address
     */
    function getBlobsByUploader(
        address _uploader,
        uint256 _offset,
        uint256 _limit
    ) external view returns (string[] memory blobIds) {
        string[] memory allBlobs = uploaderBlobs[_uploader];
        
        if (_offset >= allBlobs.length) {
            return new string[](0);
        }
        
        uint256 end = _offset + _limit;
        if (end > allBlobs.length) {
            end = allBlobs.length;
        }
        
        blobIds = new string[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            blobIds[i - _offset] = allBlobs[i];
        }
        
        return blobIds;
    }
    
    /**
     * @notice Pin blob to make it permanent (using shared blob)
     * @dev Oracle calls: walrus share --blob-obj-id <objectId> --amount <amount>
     */
    function pinBlob(string calldata _blobId) external payable {
        require(_blobExists[_blobId], "Blob not found");
        
        WalrusBlobObject storage wBlob = walrusBlobs[_blobId];
        wBlob.deletable = false; // Make permanent
        blobInfos[_blobId].expiresAt = 0; // Remove expiration
        
        emit BlobPinned(_blobId, msg.sender, msg.value);
    }
    
    /**
     * @notice Get current network statistics
     */
    function getNetworkStats() external view returns (
        uint256 _totalBlobs,
        uint256 _totalStorage,
        uint256 networkUtilization
    ) {
        return (totalBlobs, totalStorage, 75); // Mock 75% utilization
    }
    
    /**
     * @notice Update Walrus endpoints (owner only)
     */
    function updateConfig(
        string calldata _publisherEndpoint,
        string calldata _aggregatorEndpoint,
        string calldata _suiRpcUrl
    ) external onlyOwner {
        config.publisherEndpoint = _publisherEndpoint;
        config.aggregatorEndpoint = _aggregatorEndpoint;
        config.suiRpcUrl = _suiRpcUrl;
        
        emit WalrusConfigUpdated(_publisherEndpoint, _aggregatorEndpoint);
    }
    
    /**
     * @notice Update oracle address (owner only)
     */
    function updateOracle(address _newOracle) external onlyOwner {
        oracle = _newOracle;
    }
    
    // Internal helper functions
    function _tierToEpochs(StorageTier _tier) internal view returns (uint256) {
        if (_tier == StorageTier.EPHEMERAL) {
            return 1; // ~2 weeks
        } else if (_tier == StorageTier.STANDARD) {
            return config.useTestnet ? 5 : 26; // ~1 year on mainnet
        } else {
            return 53; // Maximum epochs (~2 years)
        }
    }
    
    function _generateRequestId(bytes memory _content) internal view returns (string memory) {
        return string(abi.encodePacked(
            "req_",
            _uint2str(uint256(keccak256(abi.encodePacked(_content, block.timestamp, msg.sender))) % 1000000)
        ));
    }
    
    function _generateQuiltRequestId(bytes[] memory _contents, string[] memory _identifiers) internal view returns (string memory) {
        bytes memory combined = abi.encode(_contents, _identifiers, block.timestamp, msg.sender);
        return string(abi.encodePacked(
            "quilt_req_",
            _uint2str(uint256(keccak256(combined)) % 1000000)
        ));
    }
    
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}