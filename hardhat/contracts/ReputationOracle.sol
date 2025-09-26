// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./VideoPremiereManager.sol";
import "./ReputationAirdropEscrow.sol";

/**
 * @title ReputationOracle
 * @dev Oracle contract for managing off-chain reputation data and Sybil attack prevention
 * @notice Handles reputation score validation, data integrity, and secure oracle operations
 */
contract ReputationOracle is AccessControl, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_NODE_ROLE = keccak256("ORACLE_NODE_ROLE");
    bytes32 public constant DATA_PROVIDER_ROLE = keccak256("DATA_PROVIDER_ROLE");

    // Contract references
    VideoPremiereManager public premiereManager;
    ReputationAirdropEscrow public escrowManager;

    // Oracle node structure
    struct OracleNode {
        address nodeAddress;
        string nodeName;
        string endpoint;
        uint256 reputation;
        uint256 totalRequests;
        uint256 successfulRequests;
        bool isActive;
        uint256 registeredAt;
        uint256 lastActiveAt;
    }

    // Reputation data request structure
    struct ReputationRequest {
        uint256 requestId;
        address requester;
        address[] targets;          // Addresses to get reputation for
        string dataSource;          // External reputation system (Twitter, Discord, etc.)
        uint256 requestedAt;
        uint256 expiresAt;
        bool fulfilled;
        uint256 consensusThreshold; // Number of oracle nodes needed for consensus
        mapping(address => uint256) responses;   // Oracle responses
        mapping(address => bool) hasResponded;   // Track oracle responses
        uint256 responseCount;
        ReputationRequestType requestType;
    }

    // Batch reputation data for efficient processing
    struct BatchReputationData {
        address[] users;
        uint256[] scores;
        string dataSource;
        uint256 timestamp;
        bytes32 dataHash;
        bytes signature;
    }

    // Sybil detection data
    struct SybilDetectionData {
        address user;
        uint256 riskScore;          // 0-1000 (0 = low risk, 1000 = high risk)
        string[] riskFactors;       // Array of risk factors identified
        uint256 checkedAt;
        bool isPassed;              // Whether user passed Sybil check
    }

    enum ReputationRequestType {
        PREMIERE_REGISTRATION,
        AIRDROP_CALCULATION,
        BULK_VERIFICATION,
        SYBIL_CHECK
    }

    // Storage
    mapping(uint256 => ReputationRequest) private requests;
    mapping(address => OracleNode) public oracleNodes;
    mapping(address => uint256[]) public userRequests;
    mapping(address => mapping(string => uint256)) public userReputation; // user => dataSource => score
    mapping(address => SybilDetectionData) public sybilData;
    mapping(bytes32 => bool) public processedDataHashes; // Prevent replay attacks

    uint256 public nextRequestId = 1;
    uint256 public requestExpirationTime = 1 hours;
    uint256 public minOracleNodes = 3;
    uint256 public maxOracleNodes = 10;
    uint256 public consensusThreshold = 2; // Minimum nodes needed for consensus
    uint256 public sybilThreshold = 500;   // Risk score threshold for Sybil detection

    // Supported reputation sources
    mapping(string => bool) public supportedDataSources;
    string[] public dataSourceList;

    // Oracle node performance tracking
    mapping(address => uint256) public nodeStakeAmount;
    mapping(address => uint256) public nodeRewards;
    mapping(address => uint256) public nodeSlashAmount;
    uint256 public minStakeAmount = 1000 * 10**18;

    // Events
    event ReputationRequestCreated(
        uint256 indexed requestId,
        address indexed requester,
        uint256 targetCount,
        string dataSource,
        ReputationRequestType requestType
    );

    event ReputationDataSubmitted(
        uint256 indexed requestId,
        address indexed oracleNode,
        uint256 responseCount
    );

    event ReputationConsensusReached(
        uint256 indexed requestId,
        uint256 consensusCount,
        bool successful
    );

    event BatchReputationProcessed(
        bytes32 indexed dataHash,
        address indexed submitter,
        uint256 userCount,
        string dataSource
    );

    event SybilCheckCompleted(
        address indexed user,
        uint256 riskScore,
        bool passed
    );

    event OracleNodeRegistered(
        address indexed nodeAddress,
        string nodeName,
        uint256 stakeAmount
    );

    event OracleNodeSlashed(
        address indexed nodeAddress,
        uint256 slashAmount,
        string reason
    );

    // Modifiers
    modifier onlyActiveOracle() {
        require(oracleNodes[msg.sender].isActive, "Oracle node not active");
        require(hasRole(ORACLE_NODE_ROLE, msg.sender), "Not an oracle node");
        _;
    }

    modifier validDataSource(string memory _dataSource) {
        require(supportedDataSources[_dataSource], "Unsupported data source");
        _;
    }

    modifier requestExists(uint256 _requestId) {
        require(requests[_requestId].requestId != 0, "Request does not exist");
        _;
    }

    constructor(
        address _premiereManager,
        address _escrowManager
    ) {
        require(_premiereManager != address(0), "Invalid premiere manager");
        require(_escrowManager != address(0), "Invalid escrow manager");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        premiereManager = VideoPremiereManager(_premiereManager);
        escrowManager = ReputationAirdropEscrow(_escrowManager);

        // Initialize supported data sources
        supportedDataSources["twitter"] = true;
        supportedDataSources["discord"] = true;
        supportedDataSources["github"] = true;
        supportedDataSources["linkedin"] = true;
        supportedDataSources["reddit"] = true;
        
        dataSourceList = ["twitter", "discord", "github", "linkedin", "reddit"];
    }

    /**
     * @notice Register as an oracle node with stake
     * @param _nodeName Name of the oracle node
     * @param _endpoint API endpoint for the oracle node
     */
    function registerOracleNode(
        string calldata _nodeName,
        string calldata _endpoint
    ) external payable whenNotPaused {
        require(msg.value >= minStakeAmount, "Insufficient stake amount");
        require(!oracleNodes[msg.sender].isActive, "Node already registered");
        require(bytes(_nodeName).length > 0 && bytes(_endpoint).length > 0, "Invalid parameters");

        oracleNodes[msg.sender] = OracleNode({
            nodeAddress: msg.sender,
            nodeName: _nodeName,
            endpoint: _endpoint,
            reputation: 1000, // Start with neutral reputation
            totalRequests: 0,
            successfulRequests: 0,
            isActive: true,
            registeredAt: block.timestamp,
            lastActiveAt: block.timestamp
        });

        nodeStakeAmount[msg.sender] = msg.value;
        _grantRole(ORACLE_NODE_ROLE, msg.sender);

        emit OracleNodeRegistered(msg.sender, _nodeName, msg.value);
    }

    /**
     * @notice Create reputation data request
     * @param _targets Array of user addresses to get reputation for
     * @param _dataSource External reputation system
     * @param _requestType Type of reputation request
     * @return requestId The created request ID
     */
    function createReputationRequest(
        address[] calldata _targets,
        string calldata _dataSource,
        ReputationRequestType _requestType
    ) external validDataSource(_dataSource) whenNotPaused returns (uint256 requestId) {
        require(_targets.length > 0 && _targets.length <= 1000, "Invalid target count");
        
        requestId = nextRequestId++;

        ReputationRequest storage request = requests[requestId];
        request.requestId = requestId;
        request.requester = msg.sender;
        request.targets = _targets;
        request.dataSource = _dataSource;
        request.requestedAt = block.timestamp;
        request.expiresAt = block.timestamp + requestExpirationTime;
        request.fulfilled = false;
        request.consensusThreshold = consensusThreshold;
        request.responseCount = 0;
        request.requestType = _requestType;

        for (uint256 i = 0; i < _targets.length; i++) {
            userRequests[_targets[i]].push(requestId);
        }

        emit ReputationRequestCreated(
            requestId,
            msg.sender,
            _targets.length,
            _dataSource,
            _requestType
        );

        return requestId;
    }

    /**
     * @notice Submit reputation data for a request (Oracle nodes only)
     * @param _requestId Request ID
     * @param _reputationScores Array of reputation scores corresponding to target users
     * @param _dataHash Hash of the reputation data for integrity verification
     * @param _signature Signature of the data for authenticity
     */
    function submitReputationData(
        uint256 _requestId,
        uint256[] calldata _reputationScores,
        bytes32 _dataHash,
        bytes calldata _signature
    ) external requestExists(_requestId) onlyActiveOracle nonReentrant {
        ReputationRequest storage request = requests[_requestId];
        require(!request.fulfilled, "Request already fulfilled");
        require(block.timestamp <= request.expiresAt, "Request expired");
        require(!request.hasResponded[msg.sender], "Already responded");
        require(_reputationScores.length == request.targets.length, "Score count mismatch");

        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(_requestId, _dataHash, block.chainid));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(_signature);
        require(signer == msg.sender, "Invalid signature");

        // Store responses (simplified - in production, would store individual scores)
        request.hasResponded[msg.sender] = true;
        request.responseCount++;

        oracleNodes[msg.sender].totalRequests++;
        oracleNodes[msg.sender].lastActiveAt = block.timestamp;

        emit ReputationDataSubmitted(_requestId, msg.sender, _reputationScores.length);

        // Check if consensus is reached
        if (request.responseCount >= request.consensusThreshold) {
            _processConsensus(_requestId, _reputationScores);
        }
    }

    /**
     * @notice Submit batch reputation data with signature verification
     * @param _batchData Batch reputation data with signatures
     */
    function submitBatchReputationData(
        BatchReputationData calldata _batchData
    ) external onlyRole(DATA_PROVIDER_ROLE) validDataSource(_batchData.dataSource) whenNotPaused {
        require(_batchData.users.length == _batchData.scores.length, "Array length mismatch");
        require(_batchData.users.length <= 500, "Batch too large");
        require(!processedDataHashes[_batchData.dataHash], "Data already processed");

        // Verify data integrity
        bytes32 computedHash = keccak256(abi.encodePacked(
            _batchData.users,
            _batchData.scores,
            _batchData.dataSource,
            _batchData.timestamp
        ));
        require(computedHash == _batchData.dataHash, "Data hash mismatch");

        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(_batchData.dataHash, block.chainid));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(_batchData.signature);
        require(hasRole(DATA_PROVIDER_ROLE, signer), "Invalid signer");

        // Process batch data
        for (uint256 i = 0; i < _batchData.users.length; i++) {
            address user = _batchData.users[i];
            uint256 score = _batchData.scores[i];
            
            if (user != address(0) && score > 0 && score <= 10000000) {
                userReputation[user][_batchData.dataSource] = score;
            }
        }

        processedDataHashes[_batchData.dataHash] = true;

        emit BatchReputationProcessed(
            _batchData.dataHash,
            msg.sender,
            _batchData.users.length,
            _batchData.dataSource
        );
    }

    /**
     * @notice Submit Sybil detection results
     * @param _user User address
     * @param _riskScore Risk score (0-1000)
     * @param _riskFactors Array of identified risk factors
     */
    function submitSybilDetection(
        address _user,
        uint256 _riskScore,
        string[] calldata _riskFactors
    ) external onlyActiveOracle {
        require(_user != address(0), "Invalid user address");
        require(_riskScore <= 1000, "Invalid risk score");

        bool passed = _riskScore < sybilThreshold;

        sybilData[_user] = SybilDetectionData({
            user: _user,
            riskScore: _riskScore,
            riskFactors: _riskFactors,
            checkedAt: block.timestamp,
            isPassed: passed
        });

        emit SybilCheckCompleted(_user, _riskScore, passed);
    }

    /**
     * @notice Register attendees for premiere with reputation validation
     * @param _premiereId Premiere ID
     * @param _attendees Array of attendee addresses
     * @param _reputationScores Array of reputation scores
     * @param _dataSource Source of reputation data
     */
    function registerPremiereAttendees(
        uint256 _premiereId,
        address[] calldata _attendees,
        uint256[] calldata _reputationScores,
        string calldata _dataSource
    ) external onlyActiveOracle validDataSource(_dataSource) {
        require(_attendees.length == _reputationScores.length, "Array length mismatch");
        require(_attendees.length <= 200, "Batch too large");

        for (uint256 i = 0; i < _attendees.length; i++) {
            address attendee = _attendees[i];
            uint256 score = _reputationScores[i];

            // Basic validation
            if (attendee != address(0) && 
                score >= 100 && 
                score <= 10000000 &&
                sybilData[attendee].isPassed) {
                
                // Update stored reputation
                userReputation[attendee][_dataSource] = score;
                
                // Register with premiere manager
                try premiereManager.registerAttendee(_premiereId, attendee, score) {
                    // Successfully registered
                } catch {
                    // Skip failed registrations
                }
            }
        }
    }

    /**
     * @notice Register participants for airdrop campaign
     * @param _campaignId Campaign ID in escrow manager
     * @param _participants Array of participant addresses
     * @param _reputationScores Array of reputation scores
     * @param _dataSource Source of reputation data
     */
    function registerAirdropParticipants(
        uint256 _campaignId,
        address[] calldata _participants,
        uint256[] calldata _reputationScores,
        string calldata _dataSource
    ) external onlyActiveOracle validDataSource(_dataSource) {
        require(_participants.length == _reputationScores.length, "Array length mismatch");

        ReputationAirdropEscrow.BatchDistributionInput[] memory batchData = 
            new ReputationAirdropEscrow.BatchDistributionInput[](_participants.length);

        for (uint256 i = 0; i < _participants.length; i++) {
            address participant = _participants[i];
            uint256 score = _reputationScores[i];

            if (participant != address(0) && 
                score >= 100 && 
                score <= 10000000 &&
                sybilData[participant].isPassed) {
                
                userReputation[participant][_dataSource] = score;
                
                batchData[i] = ReputationAirdropEscrow.BatchDistributionInput({
                    participant: participant,
                    reputationScore: score
                });
            }
        }

        escrowManager.batchRegisterParticipants(_campaignId, batchData);
    }

    /**
     * @dev Process consensus for reputation request
     */
    function _processConsensus(uint256 _requestId, uint256[] calldata /* _scores */) internal {
        ReputationRequest storage request = requests[_requestId];
        
        // Mark as fulfilled
        request.fulfilled = true;

        // Update oracle node reputation for successful completion
        for (uint256 i = 0; i < request.targets.length; i++) {
            address oracleAddr = msg.sender; // Simplified - would iterate through responders
            oracleNodes[oracleAddr].successfulRequests++;
        }

        emit ReputationConsensusReached(_requestId, request.responseCount, true);

        // Process based on request type
        if (request.requestType == ReputationRequestType.PREMIERE_REGISTRATION) {
            // Automatically register attendees if this was for a premiere
            // Implementation would depend on specific requirements
        }
    }

    // View functions

    /**
     * @notice Get user reputation for a specific data source
     */
    function getUserReputation(address _user, string calldata _dataSource) external view returns (uint256) {
        return userReputation[_user][_dataSource];
    }

    /**
     * @notice Get user's aggregated reputation across all sources
     */
    function getAggregatedReputation(address _user) external view returns (uint256) {
        uint256 totalScore = 0;
        uint256 sourceCount = 0;

        for (uint256 i = 0; i < dataSourceList.length; i++) {
            uint256 score = userReputation[_user][dataSourceList[i]];
            if (score > 0) {
                totalScore += score;
                sourceCount++;
            }
        }

        return sourceCount > 0 ? totalScore / sourceCount : 0;
    }

    /**
     * @notice Get Sybil detection data for user
     */
    function getSybilData(address _user) external view returns (
        uint256 riskScore,
        string[] memory riskFactors,
        uint256 checkedAt,
        bool isPassed
    ) {
        SybilDetectionData storage data = sybilData[_user];
        return (data.riskScore, data.riskFactors, data.checkedAt, data.isPassed);
    }

    /**
     * @notice Get oracle node information
     */
    function getOracleNode(address _nodeAddress) external view returns (
        string memory nodeName,
        string memory endpoint,
        uint256 reputation,
        uint256 totalRequests,
        uint256 successfulRequests,
        bool isActive,
        uint256 stakeAmount
    ) {
        OracleNode storage node = oracleNodes[_nodeAddress];
        return (
            node.nodeName,
            node.endpoint,
            node.reputation,
            node.totalRequests,
            node.successfulRequests,
            node.isActive,
            nodeStakeAmount[_nodeAddress]
        );
    }

    /**
     * @notice Get request details
     */
    function getRequest(uint256 _requestId) external view returns (
        address requester,
        address[] memory targets,
        string memory dataSource,
        uint256 requestedAt,
        uint256 expiresAt,
        bool fulfilled,
        uint256 responseCount,
        ReputationRequestType requestType
    ) {
        ReputationRequest storage request = requests[_requestId];
        return (
            request.requester,
            request.targets,
            request.dataSource,
            request.requestedAt,
            request.expiresAt,
            request.fulfilled,
            request.responseCount,
            request.requestType
        );
    }

    // Admin functions

    /**
     * @notice Add supported data source
     */
    function addDataSource(string calldata _dataSource) external onlyRole(ADMIN_ROLE) {
        require(!supportedDataSources[_dataSource], "Data source already supported");
        supportedDataSources[_dataSource] = true;
        dataSourceList.push(_dataSource);
    }

    /**
     * @notice Remove supported data source
     */
    function removeDataSource(string calldata _dataSource) external onlyRole(ADMIN_ROLE) {
        supportedDataSources[_dataSource] = false;
    }

    /**
     * @notice Slash oracle node for malicious behavior
     */
    function slashOracleNode(address _nodeAddress, uint256 _slashAmount, string calldata _reason) external onlyRole(ADMIN_ROLE) {
        require(oracleNodes[_nodeAddress].isActive, "Node not active");
        require(_slashAmount <= nodeStakeAmount[_nodeAddress], "Slash amount exceeds stake");

        nodeSlashAmount[_nodeAddress] += _slashAmount;
        nodeStakeAmount[_nodeAddress] -= _slashAmount;
        
        if (nodeStakeAmount[_nodeAddress] < minStakeAmount) {
            oracleNodes[_nodeAddress].isActive = false;
            _revokeRole(ORACLE_NODE_ROLE, _nodeAddress);
        }

        emit OracleNodeSlashed(_nodeAddress, _slashAmount, _reason);
    }

    /**
     * @notice Set Sybil detection threshold
     */
    function setSybilThreshold(uint256 _threshold) external onlyRole(ADMIN_ROLE) {
        require(_threshold <= 1000, "Invalid threshold");
        sybilThreshold = _threshold;
    }

    /**
     * @notice Set consensus threshold
     */
    function setConsensusThreshold(uint256 _threshold) external onlyRole(ADMIN_ROLE) {
        require(_threshold >= 1 && _threshold <= maxOracleNodes, "Invalid threshold");
        consensusThreshold = _threshold;
    }

    /**
     * @notice Withdraw slashed funds
     */
    function withdrawSlashedFunds() external onlyRole(ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }

    /**
     * @notice Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}