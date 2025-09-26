// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./WalrusStorage.sol";

/**
 * @title EventNFTWithWalrus
 * @dev Enhanced EventNFT with Walrus storage for metadata and artwork
 * @notice NFT metadata and artwork stored on decentralized Walrus network
 */
contract EventNFTWithWalrus is ERC721URIStorage, AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    WalrusStorage public walrusStorage;
    
    struct NFTMetadata {
        string name;
        string description;
        string image;               // Walrus blob ID for image
        string animationUrl;        // Walrus blob ID for animation/video
        string externalUrl;
        uint256 eventId;
        uint256 mintedAt;
        address originalOwner;
        BadgeType badgeType;
        mapping(string => string) attributes; // Dynamic attributes
        string[] attributeKeys;     // Track attribute keys
    }
    
    enum BadgeType {
        PARTICIPATION,
        COMPLETION,
        ACHIEVEMENT,
        SPECIAL_EDITION,
        CREATOR,
        EARLY_BIRD,
        TOP_PERFORMER
    }
    
    struct BadgeTemplate {
        string name;
        string description;
        string imageWalrusId;       // Template image on Walrus
        string animationWalrusId;   // Template animation on Walrus
        BadgeType badgeType;
        bool isActive;
        uint256 maxSupply;
        uint256 currentSupply;
        mapping(string => string) defaultAttributes;
        string[] defaultAttributeKeys;
    }
    
    // Storage
    mapping(uint256 => NFTMetadata) public nftMetadata;
    mapping(uint256 => BadgeTemplate) public badgeTemplates;
    mapping(uint256 => string) public tokenWalrusMetadataId; // Walrus blob ID for complete metadata
    mapping(string => uint256) public walrusIdToTokenId;
    mapping(address => uint256[]) public ownerTokens;
    mapping(uint256 => uint256) public tokenToBadgeTemplate; // Token to template mapping
    
    uint256 private _tokenIdCounter = 1;
    uint256 public nextTemplateId = 1;
    uint256 public totalSupply;
    uint256 public mintingFee = 10 ether; // 10 FLOW tokens
    
    // Events
    event BadgeTemplateCreated(uint256 indexed templateId, string name, BadgeType badgeType);
    event NFTMintedWithWalrus(
        uint256 indexed tokenId, 
        address indexed to, 
        uint256 indexed eventId,
        string walrusMetadataId,
        string walrusImageId
    );
    event NFTMetadataStored(uint256 indexed tokenId, string walrusId);
    event NFTImageStored(uint256 indexed tokenId, string walrusId, uint256 imageSize);
    event BadgeUpgraded(uint256 indexed tokenId, BadgeType oldType, BadgeType newType);
    event WalrusStorageUpdated(address oldStorage, address newStorage);
    
    // Errors
    error InvalidAddress();
    error InvalidTemplate();
    error TemplateNotActive();
    error MaxSupplyReached();
    error InsufficientPayment();
    error TokenNotFound();
    error WalrusStorageError();
    error ImageTooLarge();
    error UnauthorizedUpgrade();
    
    constructor(address _walrusStorage) ERC721("CryptoVerse Event Badge", "CVEB") {
        if (_walrusStorage == address(0)) revert InvalidAddress();
        
        address owner = 0x4C3F5a84041E562928394d63b3E339bE70DBcC17;
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(ADMIN_ROLE, owner);
        _grantRole(MINTER_ROLE, owner);
        
        walrusStorage = WalrusStorage(payable(_walrusStorage));
        
        // Create default badge templates
        _createDefaultTemplates();
    }
    
    /**
     * @notice Create a new badge template with artwork stored on Walrus
     */
    function createBadgeTemplate(
        string memory _name,
        string memory _description,
        bytes calldata _imageData,
        bytes calldata _animationData,
        BadgeType _badgeType,
        uint256 _maxSupply,
        string[] calldata _attributeKeys,
        string[] calldata _attributeValues
    ) external payable onlyRole(ADMIN_ROLE) nonReentrant {
        if (_imageData.length == 0) revert ImageTooLarge();
        if (_imageData.length > 50 * 1024 * 1024) revert ImageTooLarge(); // 50MB limit
        
        // Calculate Walrus storage costs
        uint256 imageCost = walrusStorage.calculateStorageCost(
            _imageData.length,
            WalrusStorage.StorageTier.PERMANENT
        );
        
        uint256 animationCost = 0;
        if (_animationData.length > 0) {
            animationCost = walrusStorage.calculateStorageCost(
                _animationData.length,
                WalrusStorage.StorageTier.PERMANENT
            );
        }
        
        uint256 totalCost = imageCost + animationCost;
        if (msg.value < totalCost) revert InsufficientPayment();
        
        uint256 templateId = nextTemplateId++;
        
        // Store image on Walrus
        string memory imageWalrusId;
        try walrusStorage.storeBlob{value: imageCost}(
            _imageData,
            WalrusStorage.StorageTier.PERMANENT,
            true // Badge templates are public
        ) returns (string memory blobId) {
            imageWalrusId = blobId;
        } catch {
            revert WalrusStorageError();
        }
        
        // Store animation if provided
        string memory animationWalrusId = "";
        if (_animationData.length > 0) {
            try walrusStorage.storeBlob{value: animationCost}(
                _animationData,
                WalrusStorage.StorageTier.PERMANENT,
                true
            ) returns (string memory blobId) {
                animationWalrusId = blobId;
            } catch {
                // Animation is optional, continue without it
            }
        }
        
        // Create template
        BadgeTemplate storage template = badgeTemplates[templateId];
        template.name = _name;
        template.description = _description;
        template.imageWalrusId = imageWalrusId;
        template.animationWalrusId = animationWalrusId;
        template.badgeType = _badgeType;
        template.isActive = true;
        template.maxSupply = _maxSupply;
        template.currentSupply = 0;
        
        // Set default attributes
        require(_attributeKeys.length == _attributeValues.length, "Attribute arrays mismatch");
        for (uint256 i = 0; i < _attributeKeys.length; i++) {
            template.defaultAttributes[_attributeKeys[i]] = _attributeValues[i];
            template.defaultAttributeKeys.push(_attributeKeys[i]);
        }
        
        // Refund excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
        
        emit BadgeTemplateCreated(templateId, _name, _badgeType);
    }
    
    /**
     * @notice Mint badge using template with metadata stored on Walrus
     */
    function mintBadgeWithTemplate(
        address _to,
        uint256 _templateId,
        uint256 _eventId,
        string[] calldata _customAttributeKeys,
        string[] calldata _customAttributeValues
    ) external payable onlyRole(MINTER_ROLE) nonReentrant {
        BadgeTemplate storage template = badgeTemplates[_templateId];
        if (!template.isActive) revert TemplateNotActive();
        if (template.currentSupply >= template.maxSupply && template.maxSupply > 0) revert MaxSupplyReached();
        
        uint256 tokenId = _tokenIdCounter++;
        
        // Create NFT metadata
        NFTMetadata storage metadata = nftMetadata[tokenId];
        metadata.name = string(abi.encodePacked(template.name, " #", _toString(tokenId)));
        metadata.description = template.description;
        metadata.image = template.imageWalrusId;
        metadata.animationUrl = template.animationWalrusId;
        metadata.eventId = _eventId;
        metadata.mintedAt = block.timestamp;
        metadata.originalOwner = _to;
        metadata.badgeType = template.badgeType;
        
        // Copy default attributes
        for (uint256 i = 0; i < template.defaultAttributeKeys.length; i++) {
            string memory key = template.defaultAttributeKeys[i];
            metadata.attributes[key] = template.defaultAttributes[key];
            metadata.attributeKeys.push(key);
        }
        
        // Add custom attributes
        require(_customAttributeKeys.length == _customAttributeValues.length, "Custom attribute arrays mismatch");
        for (uint256 i = 0; i < _customAttributeKeys.length; i++) {
            metadata.attributes[_customAttributeKeys[i]] = _customAttributeValues[i];
            metadata.attributeKeys.push(_customAttributeKeys[i]);
        }
        
        // Generate and store complete metadata on Walrus
        bytes memory completeMetadata = _generateMetadataJSON(tokenId);
        uint256 metadataCost = walrusStorage.calculateStorageCost(
            completeMetadata.length,
            WalrusStorage.StorageTier.PERMANENT
        );
        
        if (msg.value >= metadataCost) {
            try walrusStorage.storeBlob{value: metadataCost}(
                completeMetadata,
                WalrusStorage.StorageTier.PERMANENT,
                true
            ) returns (string memory blobId) {
                tokenWalrusMetadataId[tokenId] = blobId;
                walrusIdToTokenId[blobId] = tokenId;
                
                // Set token URI to Walrus aggregator URL
                _setTokenURI(tokenId, string(abi.encodePacked("walrus://", blobId)));
            } catch {
                // Metadata storage failed, use default URI
                _setTokenURI(tokenId, "");
            }
        }
        
        // Mint NFT
        _safeMint(_to, tokenId);
        
        // Update mappings
        ownerTokens[_to].push(tokenId);
        tokenToBadgeTemplate[tokenId] = _templateId;
        template.currentSupply++;
        totalSupply++;
        
        // Refund excess payment
        if (msg.value > metadataCost) {
            payable(msg.sender).transfer(msg.value - metadataCost);
        }
        
        emit NFTMintedWithWalrus(
            tokenId,
            _to,
            _eventId,
            tokenWalrusMetadataId[tokenId],
            template.imageWalrusId
        );
    }
    
    /**
     * @notice Simple badge minting (backward compatibility)
     */
    function mintBadge(address _to) external onlyRole(MINTER_ROLE) {
        // Use default participation template (ID 1)
        this.mintBadgeWithTemplate{value: 0}(_to, 1, 0, new string[](0), new string[](0));
    }
    
    /**
     * @notice Get NFT metadata from Walrus
     */
    function getMetadataFromWalrus(uint256 _tokenId) external view returns (
        bytes memory metadata
    ) {
        if (_ownerOf(_tokenId) == address(0)) revert TokenNotFound();
        
        string memory walrusId = tokenWalrusMetadataId[_tokenId];
        if (bytes(walrusId).length == 0) {
            return new bytes(0);
        }
        
        (bytes memory metadataBytes,) = walrusStorage.retrieveBlob(walrusId);
        return metadataBytes;
    }
    
    /**
     * @notice Get NFT image from Walrus
     */
    function getImageFromWalrus(uint256 _tokenId) external view returns (
        bytes memory imageData,
        string memory metadata
    ) {
        if (_ownerOf(_tokenId) == address(0)) revert TokenNotFound();
        
        NFTMetadata storage metadata_ = nftMetadata[_tokenId];
        return walrusStorage.retrieveBlob(metadata_.image);
    }
    
    /**
     * @notice Upgrade badge type (special permissions)
     */
    function upgradeBadge(
        uint256 _tokenId,
        BadgeType _newBadgeType,
        string calldata _upgradedImageWalrusId
    ) external onlyRole(ADMIN_ROLE) {
        if (_ownerOf(_tokenId) == address(0)) revert TokenNotFound();
        
        NFTMetadata storage metadata = nftMetadata[_tokenId];
        BadgeType oldType = metadata.badgeType;
        
        metadata.badgeType = _newBadgeType;
        if (bytes(_upgradedImageWalrusId).length > 0) {
            metadata.image = _upgradedImageWalrusId;
        }
        
        // Regenerate metadata on Walrus
        bytes memory newMetadata = _generateMetadataJSON(_tokenId);
        uint256 metadataCost = walrusStorage.calculateStorageCost(
            newMetadata.length,
            WalrusStorage.StorageTier.PERMANENT
        );
        
        try walrusStorage.storeBlob{value: metadataCost}(
            newMetadata,
            WalrusStorage.StorageTier.PERMANENT,
            true
        ) returns (string memory blobId) {
            tokenWalrusMetadataId[_tokenId] = blobId;
            walrusIdToTokenId[blobId] = _tokenId;
            _setTokenURI(_tokenId, string(abi.encodePacked("walrus://", blobId)));
        } catch {
            revert WalrusStorageError();
        }
        
        emit BadgeUpgraded(_tokenId, oldType, _newBadgeType);
    }
    
    /**
     * @notice Get tokens owned by address
     */
    function tokensOfOwner(address _owner) external view returns (uint256[] memory) {
        return ownerTokens[_owner];
    }
    
    /**
     * @notice Get badge template details
     */
    function getBadgeTemplate(uint256 _templateId) external view returns (
        string memory name,
        string memory description,
        string memory imageWalrusId,
        string memory animationWalrusId,
        BadgeType badgeType,
        bool isActive,
        uint256 maxSupply,
        uint256 currentSupply
    ) {
        BadgeTemplate storage template = badgeTemplates[_templateId];
        return (
            template.name,
            template.description,
            template.imageWalrusId,
            template.animationWalrusId,
            template.badgeType,
            template.isActive,
            template.maxSupply,
            template.currentSupply
        );
    }
    
    /**
     * @notice Get NFT attributes
     */
    function getNFTAttribute(uint256 _tokenId, string calldata _key) external view returns (string memory) {
        if (_ownerOf(_tokenId) == address(0)) revert TokenNotFound();
        return nftMetadata[_tokenId].attributes[_key];
    }
    
    /**
     * @notice Get all NFT attribute keys
     */
    function getNFTAttributeKeys(uint256 _tokenId) external view returns (string[] memory) {
        if (_ownerOf(_tokenId) == address(0)) revert TokenNotFound();
        return nftMetadata[_tokenId].attributeKeys;
    }
    
    // Admin functions
    function updateWalrusStorage(address _newWalrusStorage) external onlyRole(ADMIN_ROLE) {
        if (_newWalrusStorage == address(0)) revert InvalidAddress();
        
        address oldStorage = address(walrusStorage);
        walrusStorage = WalrusStorage(payable(_newWalrusStorage));
        emit WalrusStorageUpdated(oldStorage, _newWalrusStorage);
    }
    
    function updateMintingFee(uint256 _newFee) external onlyRole(ADMIN_ROLE) {
        mintingFee = _newFee;
    }
    
    function toggleBadgeTemplate(uint256 _templateId, bool _isActive) external onlyRole(ADMIN_ROLE) {
        badgeTemplates[_templateId].isActive = _isActive;
    }
    
    function grantMinterRole(address account) external onlyRole(ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, account);
    }
    
    function revokeMinterRole(address account) external onlyRole(ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, account);
    }
    
    function withdrawFunds() external onlyRole(ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }
    
    // Internal functions
    function _createDefaultTemplates() internal {
        // Create default participation template
        BadgeTemplate storage participation = badgeTemplates[1];
        participation.name = "Participation Badge";
        participation.description = "Awarded for participating in CryptoVerse events";
        participation.imageWalrusId = ""; // Will be set after deployment
        participation.badgeType = BadgeType.PARTICIPATION;
        participation.isActive = true;
        participation.maxSupply = 0; // Unlimited
        participation.currentSupply = 0;
        
        nextTemplateId = 2;
    }
    
    function _generateMetadataJSON(uint256 _tokenId) internal view returns (bytes memory) {
        NFTMetadata storage metadata = nftMetadata[_tokenId];
        
        // Generate OpenSea-compatible JSON metadata
        string memory json = string(abi.encodePacked(
            '{"name":"', metadata.name,
            '","description":"', metadata.description,
            '","image":"walrus://', metadata.image,
            '"'
        ));
        
        if (bytes(metadata.animationUrl).length > 0) {
            json = string(abi.encodePacked(
                json,
                ',"animation_url":"walrus://', metadata.animationUrl, '"'
            ));
        }
        
        if (bytes(metadata.externalUrl).length > 0) {
            json = string(abi.encodePacked(
                json,
                ',"external_url":"', metadata.externalUrl, '"'
            ));
        }
        
        // Add attributes
        json = string(abi.encodePacked(json, ',"attributes":['));
        
        for (uint256 i = 0; i < metadata.attributeKeys.length; i++) {
            string memory key = metadata.attributeKeys[i];
            string memory value = metadata.attributes[key];
            
            if (i > 0) {
                json = string(abi.encodePacked(json, ','));
            }
            
            json = string(abi.encodePacked(
                json,
                '{"trait_type":"', key,
                '","value":"', value, '"}'
            ));
        }
        
        json = string(abi.encodePacked(json, ']}'));
        
        return bytes(json);
    }
    
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    // Override _update to track token ownership
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        
        // Update owner token tracking
        if (from != address(0) && from != to) {
            // Remove from old owner's list
            uint256[] storage fromTokens = ownerTokens[from];
            for (uint256 i = 0; i < fromTokens.length; i++) {
                if (fromTokens[i] == tokenId) {
                    fromTokens[i] = fromTokens[fromTokens.length - 1];
                    fromTokens.pop();
                    break;
                }
            }
        }
        
        if (to != address(0) && from != to) {
            // Add to new owner's list
            ownerTokens[to].push(tokenId);
        }
        
        return super._update(to, tokenId, auth);
    }
    
    receive() external payable {}
}