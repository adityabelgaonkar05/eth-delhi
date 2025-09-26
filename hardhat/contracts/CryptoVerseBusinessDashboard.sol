// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./VideoPremiereManager.sol";
import "./ReputationAirdropEscrow.sol";
import "./ReputationOracle.sol";
import "./PremiereAttendanceBadge.sol";

/**
 * @title CryptoVerseBusinessDashboard
 * @dev Professional business dashboard for crypto video premieres with integrated airdrop mechanics
 * @notice Main control center for managing video premieres, reputation-based airdrops, and business analytics
 */
contract CryptoVerseBusinessDashboard is AccessControl, ReentrancyGuard, Pausable {
    
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant BUSINESS_ADMIN_ROLE = keccak256("BUSINESS_ADMIN_ROLE");
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");

    // Contract references
    VideoPremiereManager public premiereManager;
    ReputationAirdropEscrow public escrowManager;
    ReputationOracle public reputationOracle;
    PremiereAttendanceBadge public attendanceBadge;

    // Business analytics structures
    struct BusinessMetrics {
        uint256 totalPremieres;
        uint256 totalAttendees;
        uint256 totalAirdropsDistributed;
        uint256 totalTokensDistributed;
        uint256 totalRevenueGenerated;
        uint256 averageAttendanceRate;
        uint256 totalNFTsBadgesMinted;
        uint256 activeOrganizers;
    }

    struct OrganizerProfile {
        address organizer;
        string businessName;
        string description;
        string website;
        string contactEmail;
        bool isVerifiedBusiness;
        uint256 totalPremieres;
        uint256 totalAttendees;
        uint256 totalAirdropsValue;
        uint256 reputationScore;
        uint256 joinedAt;
        uint256 lastActiveAt;
        bool isActive;
    }

    struct PremiereAnalytics {
        uint256 premiereId;
        uint256 registrationRate;      // Percentage of registered vs capacity
        uint256 attendanceRate;        // Percentage who actually attended
        uint256 engagementScore;       // Calculated engagement metric
        uint256 airdropEfficiency;     // Percentage of airdrop claimed
        uint256 reputationDistribution; // Average reputation of attendees
        uint256 geographicReach;       // Number of different regions/countries
        uint256 totalRevenue;          // Revenue generated from this premiere
    }

    struct AirdropCampaignMetrics {
        uint256 campaignId;
        uint256 participationRate;     // Percentage of eligible who participated
        uint256 claimRate;            // Percentage who claimed their tokens
        uint256 averageReputationScore;
        uint256 distributionEfficiency; // How well the cap was utilized
        uint256 totalValueDistributed;
        uint256 costPerParticipant;
        uint256 roiMetric;            // Return on investment metric
    }

    // Storage
    mapping(address => OrganizerProfile) public organizerProfiles;
    mapping(uint256 => PremiereAnalytics) public premiereAnalytics;
    mapping(uint256 => AirdropCampaignMetrics) public airdropMetrics;
    mapping(address => bool) public verifiedBusinesses;
    
    address[] public allOrganizers;
    uint256[] public allPremieres;
    uint256[] public allCampaigns;

    BusinessMetrics public globalMetrics;

    // Configuration
    uint256 public businessVerificationFee = 5 ether;
    uint256 public premiumOrganizerFee = 2 ether;
    uint256 public analyticsUpdateInterval = 24 hours;
    mapping(address => uint256) public lastAnalyticsUpdate;

    // Revenue tracking
    mapping(address => uint256) public organizerRevenue;
    mapping(address => uint256) public organizerFees;
    uint256 public totalPlatformRevenue;
    uint256 public totalPlatformFees;

    // Events
    event OrganizerRegistered(
        address indexed organizer,
        string businessName,
        bool isVerifiedBusiness
    );

    event BusinessVerificationUpdated(
        address indexed organizer,
        bool verified
    );

    event PremiereCompleted(
        uint256 indexed premiereId,
        address indexed organizer,
        uint256 attendeeCount,
        uint256 airdropValue
    );

    event AnalyticsUpdated(
        uint256 indexed premiereId,
        uint256 engagementScore,
        uint256 attendanceRate
    );

    event AirdropCampaignCompleted(
        uint256 indexed campaignId,
        uint256 totalDistributed,
        uint256 claimRate
    );

    event RevenueDistributed(
        address indexed organizer,
        uint256 revenue,
        uint256 fees
    );

    constructor(
        address _premiereManager,
        address _escrowManager,
        address _reputationOracle,
        address _attendanceBadge
    ) {
        require(_premiereManager != address(0), "Invalid premiere manager");
        require(_escrowManager != address(0), "Invalid escrow manager");
        require(_reputationOracle != address(0), "Invalid reputation oracle");
        require(_attendanceBadge != address(0), "Invalid attendance badge");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(BUSINESS_ADMIN_ROLE, msg.sender);

        premiereManager = VideoPremiereManager(_premiereManager);
        escrowManager = ReputationAirdropEscrow(_escrowManager);
        reputationOracle = ReputationOracle(_reputationOracle);
        attendanceBadge = PremiereAttendanceBadge(_attendanceBadge);
    }

    /**
     * @notice Register as a business organizer
     * @param _businessName Name of the business
     * @param _description Business description
     * @param _website Business website
     * @param _contactEmail Contact email
     * @param _requestVerification Whether to request business verification
     */
    function registerOrganizer(
        string calldata _businessName,
        string calldata _description,
        string calldata _website,
        string calldata _contactEmail,
        bool _requestVerification
    ) external payable whenNotPaused {
        require(bytes(_businessName).length > 0, "Invalid business name");
        require(!organizerProfiles[msg.sender].isActive, "Already registered");

        uint256 requiredFee = _requestVerification ? businessVerificationFee : 0;
        require(msg.value >= requiredFee, "Insufficient verification fee");

        organizerProfiles[msg.sender] = OrganizerProfile({
            organizer: msg.sender,
            businessName: _businessName,
            description: _description,
            website: _website,
            contactEmail: _contactEmail,
            isVerifiedBusiness: false, // Verification happens separately
            totalPremieres: 0,
            totalAttendees: 0,
            totalAirdropsValue: 0,
            reputationScore: 1000, // Start with neutral reputation
            joinedAt: block.timestamp,
            lastActiveAt: block.timestamp,
            isActive: true
        });

        allOrganizers.push(msg.sender);
        _grantRole(ORGANIZER_ROLE, msg.sender);

        // Update global metrics
        globalMetrics.activeOrganizers++;

        emit OrganizerRegistered(msg.sender, _businessName, false);
    }

    /**
     * @notice Complete a video premiere and update analytics
     * @param _premiereId Premiere ID
     */
    function completePremiereWithAnalytics(uint256 _premiereId) external onlyRole(ORGANIZER_ROLE) {
        // Get premiere data
        (
            uint256 id,
            address organizer,
            , // title
            ,
            ,
            ,
            , // scheduledTime
            uint256 capacity,
            uint256 attendeeCount,
            VideoPremiereManager.PremiereStatus status
        ) = premiereManager.getPremiere(_premiereId);

        require(id != 0, "Premiere does not exist");
        require(organizer == msg.sender, "Not premiere organizer");
        require(status == VideoPremiereManager.PremiereStatus.COMPLETED, "Premiere not completed");

        // Calculate analytics
        uint256 attendanceRate = capacity > 0 ? (attendeeCount * 10000) / capacity : 0; // Basis points
        uint256 engagementScore = _calculateEngagementScore(_premiereId, attendeeCount);

        // Store analytics
        premiereAnalytics[_premiereId] = PremiereAnalytics({
            premiereId: _premiereId,
            registrationRate: attendanceRate, // Simplified - could be more complex
            attendanceRate: attendanceRate,
            engagementScore: engagementScore,
            airdropEfficiency: 0, // Will be updated when airdrop is processed
            reputationDistribution: _calculateAverageReputation(_premiereId),
            geographicReach: 1, // Simplified - would need geographic data
            totalRevenue: _calculatePremiereRevenue(_premiereId)
        });

        // Update organizer profile
        OrganizerProfile storage profile = organizerProfiles[organizer];
        profile.totalPremieres++;
        profile.totalAttendees += attendeeCount;
        profile.lastActiveAt = block.timestamp;

        // Update global metrics
        globalMetrics.totalPremieres++;
        globalMetrics.totalAttendees += attendeeCount;

        allPremieres.push(_premiereId);

        emit PremiereCompleted(_premiereId, organizer, attendeeCount, 0);
        emit AnalyticsUpdated(_premiereId, engagementScore, attendanceRate);
    }

    /**
     * @notice Complete airdrop campaign and update metrics
     * @param _campaignId Campaign ID
     */
    function completeAirdropCampaignWithMetrics(uint256 _campaignId) external onlyRole(ORGANIZER_ROLE) {
        // Get campaign data
        (
            address organizer,
            , // token
            uint256 totalAmount,
            , // reputationCapPercent
            uint256 distributedAmount,
            uint256 remainingAmount,
            uint256 totalParticipants,
            uint256 totalReputationScore,
            uint256 cappedReputationScore,
            ReputationAirdropEscrow.CampaignStatus status,
            // requiresSelfProtocol
        ) = escrowManager.getCampaign(_campaignId);

        require(organizer == msg.sender, "Not campaign organizer");
        require(
            status == ReputationAirdropEscrow.CampaignStatus.DISTRIBUTING || 
            status == ReputationAirdropEscrow.CampaignStatus.COMPLETED,
            "Campaign not ready for metrics"
        );

        // Calculate metrics
        uint256 claimRate = totalParticipants > 0 ? ((totalAmount - remainingAmount) * 10000) / totalAmount : 0;
        uint256 averageReputation = totalParticipants > 0 ? totalReputationScore / totalParticipants : 0;
        uint256 distributionEfficiency = totalReputationScore > 0 ? (cappedReputationScore * 10000) / totalReputationScore : 0;
        uint256 costPerParticipant = totalParticipants > 0 ? distributedAmount / totalParticipants : 0;

        // Store metrics
        airdropMetrics[_campaignId] = AirdropCampaignMetrics({
            campaignId: _campaignId,
            participationRate: 10000, // All registered participants by definition
            claimRate: claimRate,
            averageReputationScore: averageReputation,
            distributionEfficiency: distributionEfficiency,
            totalValueDistributed: distributedAmount,
            costPerParticipant: costPerParticipant,
            roiMetric: _calculateROI(_campaignId, distributedAmount)
        });

        // Update organizer profile
        OrganizerProfile storage profile = organizerProfiles[organizer];
        profile.totalAirdropsValue += distributedAmount;
        profile.lastActiveAt = block.timestamp;

        // Update global metrics
        globalMetrics.totalAirdropsDistributed++;
        globalMetrics.totalTokensDistributed += distributedAmount;

        allCampaigns.push(_campaignId);

        emit AirdropCampaignCompleted(_campaignId, distributedAmount, claimRate);
    }

    /**
     * @notice Verify business status (Admin only)
     * @param _organizer Organizer address
     * @param _verified Verification status
     */
    function updateBusinessVerification(address _organizer, bool _verified) external onlyRole(BUSINESS_ADMIN_ROLE) {
        require(organizerProfiles[_organizer].isActive, "Organizer not registered");
        
        organizerProfiles[_organizer].isVerifiedBusiness = _verified;
        verifiedBusinesses[_organizer] = _verified;

        emit BusinessVerificationUpdated(_organizer, _verified);
    }

    /**
     * @notice Update organizer reputation score
     * @param _organizer Organizer address
     * @param _newScore New reputation score
     */
    function updateOrganizerReputation(address _organizer, uint256 _newScore) external onlyRole(ADMIN_ROLE) {
        require(organizerProfiles[_organizer].isActive, "Organizer not registered");
        require(_newScore >= 0 && _newScore <= 10000, "Invalid reputation score");

        organizerProfiles[_organizer].reputationScore = _newScore;
    }

    /**
     * @notice Get comprehensive business analytics for an organizer
     * @param _organizer Organizer address
     * @return profile Organizer profile
     * @return metrics Performance metrics
     */
    function getOrganizerAnalytics(address _organizer) external view returns (
        OrganizerProfile memory profile,
        BusinessMetrics memory metrics
    ) {
        profile = organizerProfiles[_organizer];
        
        // Calculate organizer-specific metrics
        metrics = BusinessMetrics({
            totalPremieres: profile.totalPremieres,
            totalAttendees: profile.totalAttendees,
            totalAirdropsDistributed: _getOrganizerAirdropCount(_organizer),
            totalTokensDistributed: profile.totalAirdropsValue,
            totalRevenueGenerated: organizerRevenue[_organizer],
            averageAttendanceRate: _calculateAverageAttendanceRate(_organizer),
            totalNFTsBadgesMinted: _getOrganizerNFTCount(_organizer),
            activeOrganizers: 1 // Self
        });

        return (profile, metrics);
    }

    /**
     * @notice Get platform-wide business metrics
     */
    function getPlatformMetrics() external view returns (BusinessMetrics memory) {
        return globalMetrics;
    }

    /**
     * @notice Get detailed premiere analytics
     */
    function getPremiereAnalytics(uint256 _premiereId) external view returns (PremiereAnalytics memory) {
        return premiereAnalytics[_premiereId];
    }

    /**
     * @notice Get detailed airdrop campaign metrics
     */
    function getAirdropMetrics(uint256 _campaignId) external view returns (AirdropCampaignMetrics memory) {
        return airdropMetrics[_campaignId];
    }

    /**
     * @notice Get top performing organizers
     * @param _limit Maximum number of organizers to return
     * @return addresses Array of organizer addresses
     * @return scores Array of reputation scores
     */
    function getTopOrganizers(uint256 _limit) external view returns (
        address[] memory addresses,
        uint256[] memory scores
    ) {
        uint256 length = _limit > allOrganizers.length ? allOrganizers.length : _limit;
        addresses = new address[](length);
        scores = new uint256[](length);

        // Simple sorting by reputation score (in production, would use more sophisticated ranking)
        for (uint256 i = 0; i < length; i++) {
            uint256 maxScore = 0;
            uint256 maxIndex = 0;
            
            for (uint256 j = 0; j < allOrganizers.length; j++) {
                if (organizerProfiles[allOrganizers[j]].reputationScore > maxScore) {
                    bool alreadyIncluded = false;
                    for (uint256 k = 0; k < i; k++) {
                        if (addresses[k] == allOrganizers[j]) {
                            alreadyIncluded = true;
                            break;
                        }
                    }
                    if (!alreadyIncluded) {
                        maxScore = organizerProfiles[allOrganizers[j]].reputationScore;
                        maxIndex = j;
                    }
                }
            }
            
            if (maxScore > 0) {
                addresses[i] = allOrganizers[maxIndex];
                scores[i] = maxScore;
            }
        }

        return (addresses, scores);
    }

    // Internal calculation functions

    function _calculateEngagementScore(uint256 /* _premiereId */, uint256 _attendeeCount) internal view returns (uint256) {
        // Simplified engagement calculation
        // In production, would consider: watch time, interactions, retention, etc.
        if (_attendeeCount == 0) return 0;
        return (_attendeeCount * 100) + (block.timestamp % 1000); // Placeholder calculation
    }

    function _calculateAverageReputation(uint256 _premiereId) internal view returns (uint256) {
        // Get attendees and calculate average reputation
        address[] memory attendees = premiereManager.getPremiereAttendees(_premiereId);
        if (attendees.length == 0) return 0;

        uint256 totalReputation = 0;
        for (uint256 i = 0; i < attendees.length; i++) {
            (uint256 reputationScore,,,,) = premiereManager.getAttendeeInfo(_premiereId, attendees[i]);
            totalReputation += reputationScore;
        }

        return totalReputation / attendees.length;
    }

    function _calculatePremiereRevenue(uint256 _premiereId) internal pure returns (uint256) {
        // Placeholder calculation - would include ticket sales, sponsorships, etc.
        return _premiereId * 1 ether; // Simplified
    }

    function _calculateROI(uint256 _campaignId, uint256 _distributedAmount) internal pure returns (uint256) {
        // Simplified ROI calculation
        // In production, would consider: user acquisition cost, lifetime value, conversion rates
        return _campaignId + _distributedAmount / 1000; // Placeholder
    }

    function _getOrganizerAirdropCount(address _organizer) internal view returns (uint256) {
        uint256[] memory campaigns = escrowManager.getOrganizerCampaigns(_organizer);
        return campaigns.length;
    }

    function _calculateAverageAttendanceRate(address _organizer) internal view returns (uint256) {
        uint256[] memory premieres = premiereManager.getOrganizerPremieres(_organizer);
        if (premieres.length == 0) return 0;

        uint256 totalRate = 0;
        for (uint256 i = 0; i < premieres.length; i++) {
            if (premiereAnalytics[premieres[i]].premiereId != 0) {
                totalRate += premiereAnalytics[premieres[i]].attendanceRate;
            }
        }

        return premieres.length > 0 ? totalRate / premieres.length : 0;
    }

    function _getOrganizerNFTCount(address _organizer) internal view returns (uint256) {
        // Count NFTs minted for organizer's premieres
        uint256[] memory premieres = premiereManager.getOrganizerPremieres(_organizer);
        uint256 totalNFTs = 0;

        for (uint256 i = 0; i < premieres.length; i++) {
            uint256[] memory badges = attendanceBadge.getPremiereBadges(premieres[i]);
            totalNFTs += badges.length;
        }

        return totalNFTs;
    }

    // Admin functions

    /**
     * @notice Set business verification fee
     */
    function setBusinessVerificationFee(uint256 _fee) external onlyRole(ADMIN_ROLE) {
        businessVerificationFee = _fee;
    }

    /**
     * @notice Set premium organizer fee
     */
    function setPremiumOrganizerFee(uint256 _fee) external onlyRole(ADMIN_ROLE) {
        premiumOrganizerFee = _fee;
    }

    /**
     * @notice Update global metrics manually (Admin only)
     */
    function updateGlobalMetrics(BusinessMetrics calldata _metrics) external onlyRole(ADMIN_ROLE) {
        globalMetrics = _metrics;
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

    /**
     * @notice Withdraw contract balance
     */
    function withdraw() external onlyRole(ADMIN_ROLE) {
        totalPlatformRevenue += address(this).balance;
        payable(msg.sender).transfer(address(this).balance);
    }

    /**
     * @notice Emergency token recovery
     */
    function emergencyTokenRecovery(address _token, uint256 _amount) external onlyRole(ADMIN_ROLE) {
        IERC20(_token).transfer(msg.sender, _amount);
    }
}