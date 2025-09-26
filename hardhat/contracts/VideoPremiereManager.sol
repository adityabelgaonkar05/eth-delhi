// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./WalrusStorage.sol";
import "./SelfProtocolIntegration.sol";
import "./PremiereAttendanceBadge.sol";

/**
 * @title VideoPremiereManager
 * @dev Professional business dashboard for crypto video premieres with reputation-based airdrops
 * @notice Manages video premieres, attendance tracking, and reputation-based reward distribution
 */
contract VideoPremiereManager is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    
   

    // Contract references
    WalrusStorage public walrusStorage;
    SelfProtocolIntegration public selfProtocol;
    PremiereAttendanceBadge public attendanceBadgeNFT;

    // Core structures
    struct VideoPremiere {
        uint256 id;
        address organizer;
        string title;
        string description;
        string videoWalrusHash;      // Main video content on Walrus
        string thumbnailWalrusHash;   // Thumbnail image on Walrus
        string metadataWalrusHash;    // Event metadata on Walrus
        uint256 scheduledTime;
        uint256 capacity;
        uint256 attendeeCount;
        PremiereStatus status;
        AirdropConfig airdropConfig;
        uint256 createdAt;
        uint256 completedAt;

    }

    struct AirdropConfig {
        IERC20 token;                // Token contract for airdrop
        uint256 totalAmount;         // Total tokens allocated for airdrop
        uint256 reputationCapPercent; // Max percentage of total reputation (basis points, e.g., 8000 = 80%)
        uint256 distributedAmount;   // Amount already distributed
        uint256 remainingAmount;     // Amount remaining for refund
        bool isConfigured;
        bool isDistributed;
    }

    struct AttendeeInfo {
        address attendee;
        uint256 reputationScore;     // Off-chain reputation score
        bool hasAttended;
        bool hasClaimedAirdrop;
        uint256 airdropAmount;
        uint256 joinedAt;
        bool isVerified;             // Self Protocol verification
    }

    struct ReputationData {
        uint256 totalReputation;     // Sum of all attendee reputations
        uint256 cappedReputation;    // Capped total based on organizer limit
        bool isCalculated;
        mapping(address => uint256) attendeeReputation;
    }

    enum PremiereStatus {
        DRAFT,
        SCHEDULED,
        LIVE,
        COMPLETED,
        CANCELLED
    }

    // Storage
    mapping(uint256 => VideoPremiere) public premieres;
    mapping(uint256 => mapping(address => AttendeeInfo)) public attendeeInfo;
    mapping(uint256 => address[]) public premiereAttendees;
    mapping(uint256 => ReputationData) private reputationData;
    mapping(address => uint256[]) public organizerPremieres;
    mapping(address => uint256[]) public attendeePremieres;

    // Configuration
    uint256 public nextPremiereId = 1;
    uint256 public escrowTimeoutDuration = 30 days; // Timeout for escrow reclaim
    uint256 public minReputationScore = 100;        // Minimum reputation for participation
    
    // Fees and costs
    uint256 public premiereCreationFee = 1 ether;   // Base fee for creating premiere
    mapping(string => uint256) public walrusStorageTiers; // Different storage tier costs

    // Events
    event PremiereCreated(
        uint256 indexed premiereId,
        address indexed organizer,
        string title,
        uint256 scheduledTime,
        string videoWalrusHash
    );
    
    event PremiereScheduled(
        uint256 indexed premiereId,
        uint256 scheduledTime,
        uint256 capacity
    );
    
    event AttendeeRegistered(
        uint256 indexed premiereId,
        address indexed attendee,
        uint256 reputationScore
    );
    
    event PremiereStarted(
        uint256 indexed premiereId,
        uint256 startTime
    );
    
    event PremiereCompleted(
        uint256 indexed premiereId,
        uint256 completedTime,
        uint256 finalAttendeeCount
    );
    
    event AirdropConfigured(
        uint256 indexed premiereId,
        address indexed token,
        uint256 totalAmount,
        uint256 reputationCapPercent
    );
    
    event AirdropDistributed(
        uint256 indexed premiereId,
        uint256 totalDistributed,
        uint256 totalAttendees
    );
    
    event AttendeeAirdropClaimed(
        uint256 indexed premiereId,
        address indexed attendee,
        uint256 amount
    );
    
    event ExcessFundsRefunded(
        uint256 indexed premiereId,
        address indexed organizer,
        uint256 refundAmount
    );
    
    event AttendanceBadgeMinted(
        uint256 indexed premiereId,
        address indexed attendee,
        uint256 tokenId
    );

    // Modifiers
    modifier onlyOrganizer(uint256 _premiereId) {
        require(premieres[_premiereId].organizer == msg.sender, "Not organizer");
        _;
    }

    modifier premiereExists(uint256 _premiereId) {
        require(premieres[_premiereId].id != 0, "Premiere does not exist");
        _;
    }

    modifier validReputation(uint256 _reputationScore) {
        require(_reputationScore >= minReputationScore, "Reputation too low");
        _;
    }

    constructor(
        address _walrusStorage,
        address _selfProtocol,
        address _attendanceBadgeNFT
    ) {
        require(_walrusStorage != address(0), "Invalid WalrusStorage address");
        require(_selfProtocol != address(0), "Invalid SelfProtocol address");
        require(_attendanceBadgeNFT != address(0), "Invalid NFT address");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ORGANIZER_ROLE, msg.sender);

        walrusStorage = WalrusStorage(payable(_walrusStorage));
        selfProtocol = SelfProtocolIntegration(_selfProtocol);
        attendanceBadgeNFT = PremiereAttendanceBadge(_attendanceBadgeNFT);

        // Initialize Walrus storage tiers
        walrusStorageTiers["basic"] = 0.1 ether;
        walrusStorageTiers["standard"] = 0.5 ether;
        walrusStorageTiers["premium"] = 1.0 ether;
    }

    /**
     * @notice Create a new video premiere
     * @param _title Premiere title
     * @param _description Premiere description
     * @param _videoData Raw video data to store on Walrus
     * @param _thumbnailData Thumbnail image data
     * @param _scheduledTime When the premiere is scheduled
     * @param _capacity Maximum number of attendees
     * @param _storageTier Walrus storage tier ("basic", "standard", "premium")
     */
    function createVideoPremiere(
        string calldata _title,
        string calldata _description,
        bytes calldata _videoData,
        bytes calldata _thumbnailData,
        uint256 _scheduledTime,
        uint256 _capacity,
        string calldata _storageTier
    ) external payable whenNotPaused nonReentrant {
        require(hasRole(ORGANIZER_ROLE, msg.sender), "Not authorized organizer");
        require(_scheduledTime > block.timestamp + 1 hours, "Schedule too soon");
        require(_capacity > 0 && _capacity <= 10000, "Invalid capacity");
        require(bytes(_title).length > 0 && bytes(_description).length > 0, "Invalid metadata");
        require(_videoData.length > 0, "No video data");

        uint256 storageCost = walrusStorageTiers[_storageTier];
        require(storageCost > 0, "Invalid storage tier");
        
        uint256 totalCost = premiereCreationFee + storageCost;
        require(msg.value >= totalCost, "Insufficient payment");

        uint256 premiereId = nextPremiereId++;

        // Store video and thumbnail on Walrus
        (string memory videoHash, string memory thumbnailHash) = _storeContentOnWalrus(
            _videoData,
            _thumbnailData,
            storageCost
        );

        // Create metadata for Walrus storage
        string memory metadataHash = _storeMetadataOnWalrus(
            _title,
            _description,
            videoHash,
            thumbnailHash,
            _scheduledTime,
            _capacity
        );

        premieres[premiereId] = VideoPremiere({
            id: premiereId,
            organizer: msg.sender,
            title: _title,
            description: _description,
            videoWalrusHash: videoHash,
            thumbnailWalrusHash: thumbnailHash,
            metadataWalrusHash: metadataHash,
            scheduledTime: _scheduledTime,
            capacity: _capacity,
            attendeeCount: 0,
            status: PremiereStatus.SCHEDULED,
            airdropConfig: AirdropConfig({
                token: IERC20(address(0)),
                totalAmount: 0,
                reputationCapPercent: 0,
                distributedAmount: 0,
                remainingAmount: 0,
                isConfigured: false,
                isDistributed: false
            }),
            createdAt: block.timestamp,
            completedAt: 0
        });

        organizerPremieres[msg.sender].push(premiereId);

        // Refund excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        emit PremiereCreated(premiereId, msg.sender, _title, _scheduledTime, videoHash);
        emit PremiereScheduled(premiereId, _scheduledTime, _capacity);
    }

    /**
     * @notice Configure airdrop for a premiere
     * @param _premiereId Premiere ID
     * @param _token Token contract for airdrop
     * @param _totalAmount Total tokens for airdrop
     * @param _reputationCapPercent Max percentage of total reputation (basis points)
     */
    function configureAirdrop(
        uint256 _premiereId,
        address _token,
        uint256 _totalAmount,
        uint256 _reputationCapPercent
    ) external premiereExists(_premiereId) onlyOrganizer(_premiereId) {
        require(_token != address(0), "Invalid token address");
        require(_totalAmount > 0, "Invalid amount");
        require(_reputationCapPercent > 0 && _reputationCapPercent <= 10000, "Invalid cap percentage");
        
        VideoPremiere storage premiere = premieres[_premiereId];
        require(premiere.status == PremiereStatus.SCHEDULED, "Invalid status for configuration");

        // Transfer tokens to contract for escrow
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _totalAmount);

        premiere.airdropConfig = AirdropConfig({
            token: IERC20(_token),
            totalAmount: _totalAmount,
            reputationCapPercent: _reputationCapPercent,
            distributedAmount: 0,
            remainingAmount: _totalAmount,
            isConfigured: true,
            isDistributed: false
        });

        emit AirdropConfigured(_premiereId, _token, _totalAmount, _reputationCapPercent);
    }

    /**
     * @notice Register attendee with reputation score (called by oracle)
     * @param _premiereId Premiere ID
     * @param _attendee Attendee address
     * @param _reputationScore Off-chain reputation score
     */
    function registerAttendee(
        uint256 _premiereId,
        address _attendee,
        uint256 _reputationScore
    ) external premiereExists(_premiereId) onlyRole(ORACLE_ROLE) validReputation(_reputationScore) {
        require(_attendee != address(0), "Invalid attendee address");
        
        VideoPremiere storage premiere = premieres[_premiereId];
        require(premiere.status == PremiereStatus.SCHEDULED, "Registration closed");
        require(premiere.attendeeCount < premiere.capacity, "Premiere at capacity");
        require(!attendeeInfo[_premiereId][_attendee].hasAttended, "Already registered");

        // Verify attendee through Self Protocol
        require(selfProtocol.isUserVerified(_attendee), "Attendee not verified");

        attendeeInfo[_premiereId][_attendee] = AttendeeInfo({
            attendee: _attendee,
            reputationScore: _reputationScore,
            hasAttended: true,
            hasClaimedAirdrop: false,
            airdropAmount: 0,
            joinedAt: block.timestamp,
            isVerified: true
        });

        premiereAttendees[_premiereId].push(_attendee);
        attendeePremieres[_attendee].push(_premiereId);
        premiere.attendeeCount++;

        // Update reputation tracking
        reputationData[_premiereId].totalReputation += _reputationScore;
        reputationData[_premiereId].attendeeReputation[_attendee] = _reputationScore;

        emit AttendeeRegistered(_premiereId, _attendee, _reputationScore);
    }

    /**
     * @notice Start a premiere (transition to LIVE status)
     * @param _premiereId Premiere ID
     */
    function startPremiere(
        uint256 _premiereId
    ) external premiereExists(_premiereId) onlyOrganizer(_premiereId) {
        VideoPremiere storage premiere = premieres[_premiereId];
        require(premiere.status == PremiereStatus.SCHEDULED, "Invalid status");
        require(block.timestamp >= premiere.scheduledTime, "Too early to start");

        premiere.status = PremiereStatus.LIVE;

        emit PremiereStarted(_premiereId, block.timestamp);
    }

    /**
     * @notice Complete a premiere and calculate airdrop distributions
     * @param _premiereId Premiere ID
     */
    function completePremiere(
        uint256 _premiereId
    ) external premiereExists(_premiereId) onlyOrganizer(_premiereId) {
        VideoPremiere storage premiere = premieres[_premiereId];
        require(premiere.status == PremiereStatus.LIVE, "Premiere not live");

        premiere.status = PremiereStatus.COMPLETED;
        premiere.completedAt = block.timestamp;

        // Calculate airdrop distributions if configured
        if (premiere.airdropConfig.isConfigured) {
            _calculateAirdropDistribution(_premiereId);
        }

        emit PremiereCompleted(_premiereId, block.timestamp, premiere.attendeeCount);
    }

    /**
     * @notice Batch mint attendance NFT badges for premiere attendees
     * @param _premiereId Premiere ID
     * @param _batchSize Number of badges to mint in this batch
     * @param _startIndex Starting index in attendee array
     */
    function batchMintAttendanceBadges(
        uint256 _premiereId,
        uint256 _batchSize,
        uint256 _startIndex
    ) external premiereExists(_premiereId) onlyOrganizer(_premiereId) {
        VideoPremiere storage premiere = premieres[_premiereId];
        require(premiere.status == PremiereStatus.COMPLETED, "Premiere not completed");

        address[] storage attendees = premiereAttendees[_premiereId];
        require(_startIndex < attendees.length, "Invalid start index");

        uint256 endIndex = _startIndex + _batchSize;
        if (endIndex > attendees.length) {
            endIndex = attendees.length;
        }

        for (uint256 i = _startIndex; i < endIndex; i++) {
            address attendee = attendees[i];
            if (attendeeInfo[_premiereId][attendee].hasAttended) {
                // Create badge metadata including Walrus video reference
                attendanceBadgeNFT.mintAttendanceBadge(
                    attendee,
                    _premiereId,
                    premiere.title,
                    premiere.videoWalrusHash,
                    premiere.thumbnailWalrusHash
                );
                
                emit AttendanceBadgeMinted(_premiereId, attendee, 0); // tokenId not returned in this context
            }
        }
    }

    /**
     * @notice Claim airdrop tokens based on reputation
     * @param _premiereId Premiere ID
     */
    function claimAirdrop(uint256 _premiereId) external premiereExists(_premiereId) nonReentrant {
        VideoPremiere storage premiere = premieres[_premiereId];
        require(premiere.status == PremiereStatus.COMPLETED, "Premiere not completed");
        require(premiere.airdropConfig.isConfigured, "Airdrop not configured");
        require(premiere.airdropConfig.isDistributed, "Airdrop not distributed yet");

        AttendeeInfo storage attendee = attendeeInfo[_premiereId][msg.sender];
        require(attendee.hasAttended, "Did not attend premiere");
        require(!attendee.hasClaimedAirdrop, "Already claimed airdrop");
        require(attendee.airdropAmount > 0, "No tokens to claim");

        attendee.hasClaimedAirdrop = true;
        premiere.airdropConfig.token.safeTransfer(msg.sender, attendee.airdropAmount);

        emit AttendeeAirdropClaimed(_premiereId, msg.sender, attendee.airdropAmount);
    }

    /**
     * @notice Refund excess airdrop tokens to organizer
     * @param _premiereId Premiere ID
     */
    function refundExcessTokens(
        uint256 _premiereId
    ) external premiereExists(_premiereId) onlyOrganizer(_premiereId) {
        VideoPremiere storage premiere = premieres[_premiereId];
        require(premiere.status == PremiereStatus.COMPLETED, "Premiere not completed");
        require(premiere.airdropConfig.isConfigured, "Airdrop not configured");
        require(premiere.airdropConfig.remainingAmount > 0, "No tokens to refund");

        uint256 refundAmount = premiere.airdropConfig.remainingAmount;
        premiere.airdropConfig.remainingAmount = 0;

        premiere.airdropConfig.token.safeTransfer(msg.sender, refundAmount);

        emit ExcessFundsRefunded(_premiereId, msg.sender, refundAmount);
    }

    /**
     * @notice Emergency reclaim tokens after timeout
     * @param _premiereId Premiere ID
     */
    function emergencyReclaimTokens(
        uint256 _premiereId
    ) external premiereExists(_premiereId) onlyOrganizer(_premiereId) {
        VideoPremiere storage premiere = premieres[_premiereId];
        require(premiere.airdropConfig.isConfigured, "Airdrop not configured");
        require(
            block.timestamp > premiere.completedAt + escrowTimeoutDuration || 
            premiere.status == PremiereStatus.CANCELLED,
            "Cannot reclaim yet"
        );

        uint256 totalAmount = premiere.airdropConfig.totalAmount - premiere.airdropConfig.distributedAmount;
        require(totalAmount > 0, "No tokens to reclaim");

        premiere.airdropConfig.remainingAmount = 0;
        premiere.airdropConfig.token.safeTransfer(msg.sender, totalAmount);

        emit ExcessFundsRefunded(_premiereId, msg.sender, totalAmount);
    }

    // Internal functions

    /**
     * @dev Calculate airdrop distribution based on reputation scores and cap
     */
    function _calculateAirdropDistribution(uint256 _premiereId) internal {
        VideoPremiere storage premiere = premieres[_premiereId];
        ReputationData storage repData = reputationData[_premiereId];
        
        uint256 totalReputation = repData.totalReputation;
        uint256 maxPayoutReputation = (totalReputation * premiere.airdropConfig.reputationCapPercent) / 10000;
        
        repData.cappedReputation = maxPayoutReputation;
        repData.isCalculated = true;

        address[] storage attendees = premiereAttendees[_premiereId];
        uint256 totalDistribution = 0;

        for (uint256 i = 0; i < attendees.length; i++) {
            address attendee = attendees[i];
            AttendeeInfo storage attendeeData = attendeeInfo[_premiereId][attendee];
            
            if (attendeeData.hasAttended) {
                // Calculate attendee's share based on capped reputation
                uint256 attendeeShare = (attendeeData.reputationScore * premiere.airdropConfig.totalAmount) / maxPayoutReputation;
                
                attendeeData.airdropAmount = attendeeShare;
                totalDistribution += attendeeShare;
            }
        }

        premiere.airdropConfig.distributedAmount = totalDistribution;
        premiere.airdropConfig.remainingAmount = premiere.airdropConfig.totalAmount - totalDistribution;
        premiere.airdropConfig.isDistributed = true;

        emit AirdropDistributed(_premiereId, totalDistribution, attendees.length);
    }

    /**
     * @dev Store video content on Walrus network
     */
    function _storeContentOnWalrus(
        bytes calldata _videoData,
        bytes calldata _thumbnailData,
        uint256 _storageCost
    ) internal returns (string memory videoHash, string memory thumbnailHash) {
        // Store video content
        videoHash = walrusStorage.storeBlob{value: _storageCost / 2}(
            _videoData,
            WalrusStorage.StorageTier.STANDARD, // 1 year storage
            false // not permanent
        );

        // Store thumbnail
        thumbnailHash = walrusStorage.storeBlob{value: _storageCost / 2}(
            _thumbnailData,
            WalrusStorage.StorageTier.STANDARD, // 1 year storage
            false // not permanent
        );
    }

    /**
     * @dev Store metadata on Walrus network
     */
    function _storeMetadataOnWalrus(
        string calldata _title,
        string calldata _description,
        string memory _videoHash,
        string memory _thumbnailHash,
        uint256 _scheduledTime,
        uint256 _capacity
    ) internal returns (string memory metadataHash) {
        // Create JSON metadata
        bytes memory metadata = abi.encodePacked(
            '{"title":"', _title, '",',
            '"description":"', _description, '",',
            '"videoHash":"', _videoHash, '",',
            '"thumbnailHash":"', _thumbnailHash, '",',
            '"scheduledTime":', _uint2str(_scheduledTime), ',',
            '"capacity":', _uint2str(_capacity), '}'
        );

        metadataHash = walrusStorage.storeBlob{value: 0.01 ether}(
            metadata,
            WalrusStorage.StorageTier.STANDARD, // 1 year storage
            false // not permanent
        );
    }

    /**
     * @dev Convert uint to string
     */
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
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

    // View functions

    /**
     * @notice Get premiere details
     */
    function getPremiere(uint256 _premiereId) external view returns (
        uint256 id,
        address organizer,
        string memory title,
        string memory description,
        string memory videoWalrusHash,
        string memory thumbnailWalrusHash,
        uint256 scheduledTime,
        uint256 capacity,
        uint256 attendeeCount,
        PremiereStatus status
    ) {
        VideoPremiere storage premiere = premieres[_premiereId];
        return (
            premiere.id,
            premiere.organizer,
            premiere.title,
            premiere.description,
            premiere.videoWalrusHash,
            premiere.thumbnailWalrusHash,
            premiere.scheduledTime,
            premiere.capacity,
            premiere.attendeeCount,
            premiere.status
        );
    }

    /**
     * @notice Get attendee information
     */
    function getAttendeeInfo(uint256 _premiereId, address _attendee) external view returns (
        uint256 reputationScore,
        bool hasAttended,
        bool hasClaimedAirdrop,
        uint256 airdropAmount,
        uint256 joinedAt
    ) {
        AttendeeInfo storage attendee = attendeeInfo[_premiereId][_attendee];
        return (
            attendee.reputationScore,
            attendee.hasAttended,
            attendee.hasClaimedAirdrop,
            attendee.airdropAmount,
            attendee.joinedAt
        );
    }

    /**
     * @notice Get all attendees for a premiere
     */
    function getPremiereAttendees(uint256 _premiereId) external view returns (address[] memory) {
        return premiereAttendees[_premiereId];
    }

    /**
     * @notice Get organizer's premieres
     */
    function getOrganizerPremieres(address _organizer) external view returns (uint256[] memory) {
        return organizerPremieres[_organizer];
    }

    /**
     * @notice Get attendee's premieres
     */
    function getAttendeePremieres(address _attendee) external view returns (uint256[] memory) {
        return attendeePremieres[_attendee];
    }

    // Admin functions

    /**
     * @notice Set minimum reputation score required
     */
    function setMinReputationScore(uint256 _minScore) external onlyRole(ADMIN_ROLE) {
        minReputationScore = _minScore;
    }

    /**
     * @notice Update Walrus storage tier costs
     */
    function updateStorageTierCost(string calldata _tier, uint256 _cost) external onlyRole(ADMIN_ROLE) {
        walrusStorageTiers[_tier] = _cost;
    }

    /**
     * @notice Set premiere creation fee
     */
    function setPremiereCreationFee(uint256 _fee) external onlyRole(ADMIN_ROLE) {
        premiereCreationFee = _fee;
    }

    /**
     * @notice Emergency pause contract
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

    /**
     * @notice Withdraw contract balance
     */
    function withdraw() external onlyRole(ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }
}