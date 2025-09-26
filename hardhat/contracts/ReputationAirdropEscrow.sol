// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./SelfProtocolIntegration.sol";

/**
 * @title ReputationAirdropEscrow
 * @dev Advanced escrow management for reputation-based airdrops with professional controls
 * @notice Handles token escrow, reputation-based distribution, and security features for business use
 */
contract ReputationAirdropEscrow is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    
    // Contract references
    SelfProtocolIntegration public selfProtocol;

    // Core structures
    struct EscrowCampaign {
        uint256 campaignId;
        address organizer;
        IERC20 token;
        uint256 totalAmount;
        uint256 reputationCapPercent;    // Basis points (e.g., 8000 = 80%)
        uint256 distributedAmount;
        uint256 remainingAmount;
        uint256 totalParticipants;
        uint256 totalReputationScore;
        uint256 cappedReputationScore;
        uint256 createdAt;
        uint256 completedAt;
        uint256 timeoutDuration;
        CampaignStatus status;
        bool requiresSelfProtocol;
        mapping(address => ParticipantInfo) participants;
        address[] participantList;
    }

    struct ParticipantInfo {
        uint256 reputationScore;
        uint256 calculatedShare;
        bool hasClaimedShare;
        bool isVerified;
        uint256 registeredAt;
    }

    struct BatchDistributionInput {
        address participant;
        uint256 reputationScore;
    }

    enum CampaignStatus {
        ACTIVE,      // Accepting participants and reputation data
        CALCULATING, // Calculating distributions
        DISTRIBUTING, // Allowing claims
        COMPLETED,    // All distributed
        CANCELLED,    // Cancelled by organizer
        EXPIRED       // Expired due to timeout
    }

    // Storage
    mapping(uint256 => EscrowCampaign) private campaigns;
    mapping(address => uint256[]) public organizerCampaigns;
    mapping(address => uint256[]) public participantCampaigns;
    
    uint256 public nextCampaignId = 1;
    uint256 public defaultTimeoutDuration = 30 days;
    uint256 public platformFeePercent = 250; // 2.5% platform fee (basis points)
    address public feeRecipient;

    // Security features
    mapping(address => bool) public blacklistedAddresses;
    mapping(uint256 => mapping(address => bool)) public campaignBlacklist;
    uint256 public maxParticipantsPerCampaign = 10000;
    uint256 public minEscrowAmount = 1000 * 10**18; // Minimum 1000 tokens

    // Events
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed organizer,
        address indexed token,
        uint256 totalAmount,
        uint256 reputationCapPercent
    );

    event ParticipantRegistered(
        uint256 indexed campaignId,
        address indexed participant,
        uint256 reputationScore
    );

    event DistributionCalculated(
        uint256 indexed campaignId,
        uint256 totalParticipants,
        uint256 cappedReputationScore,
        uint256 distributionAmount
    );

    event TokensClaimed(
        uint256 indexed campaignId,
        address indexed participant,
        uint256 amount
    );

    event ExcessTokensRefunded(
        uint256 indexed campaignId,
        address indexed organizer,
        uint256 refundAmount
    );

    event CampaignCancelled(
        uint256 indexed campaignId,
        string reason
    );

    event CampaignExpired(
        uint256 indexed campaignId
    );

    event EmergencyWithdrawal(
        uint256 indexed campaignId,
        address indexed organizer,
        uint256 amount
    );

    // Modifiers
    modifier onlyOrganizer(uint256 _campaignId) {
        require(campaigns[_campaignId].organizer == msg.sender, "Not campaign organizer");
        _;
    }

    modifier campaignExists(uint256 _campaignId) {
        require(campaigns[_campaignId].campaignId != 0, "Campaign does not exist");
        _;
    }

    modifier validReputationScore(uint256 _score) {
        require(_score > 0 && _score <= 10000000, "Invalid reputation score");
        _;
    }

    modifier notBlacklisted(address _address) {
        require(!blacklistedAddresses[_address], "Address blacklisted");
        _;
    }

    constructor(
        address _selfProtocol,
        address _feeRecipient
    ) {
        require(_selfProtocol != address(0), "Invalid SelfProtocol address");
        require(_feeRecipient != address(0), "Invalid fee recipient");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ORGANIZER_ROLE, msg.sender);

        selfProtocol = SelfProtocolIntegration(_selfProtocol);
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Create a new reputation-based airdrop escrow campaign
     * @param _token Token contract for the airdrop
     * @param _totalAmount Total tokens to escrow
     * @param _reputationCapPercent Maximum percentage of total reputation to consider (basis points)
     * @param _timeoutDuration Duration after which organizer can reclaim tokens
     * @param _requiresSelfProtocol Whether participants need Self Protocol verification
     */
    function createCampaign(
        address _token,
        uint256 _totalAmount,
        uint256 _reputationCapPercent,
        uint256 _timeoutDuration,
        bool _requiresSelfProtocol
    ) external whenNotPaused nonReentrant returns (uint256 campaignId) {
        require(hasRole(ORGANIZER_ROLE, msg.sender), "Not authorized organizer");
        require(_token != address(0), "Invalid token address");
        require(_totalAmount >= minEscrowAmount, "Amount below minimum");
        require(_reputationCapPercent > 0 && _reputationCapPercent <= 10000, "Invalid cap percentage");
        require(_timeoutDuration >= 7 days && _timeoutDuration <= 365 days, "Invalid timeout duration");

        campaignId = nextCampaignId++;

        // Transfer tokens to escrow
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _totalAmount);

        // Initialize campaign
        EscrowCampaign storage campaign = campaigns[campaignId];
        campaign.campaignId = campaignId;
        campaign.organizer = msg.sender;
        campaign.token = IERC20(_token);
        campaign.totalAmount = _totalAmount;
        campaign.reputationCapPercent = _reputationCapPercent;
        campaign.distributedAmount = 0;
        campaign.remainingAmount = _totalAmount;
        campaign.totalParticipants = 0;
        campaign.totalReputationScore = 0;
        campaign.cappedReputationScore = 0;
        campaign.createdAt = block.timestamp;
        campaign.completedAt = 0;
        campaign.timeoutDuration = _timeoutDuration;
        campaign.status = CampaignStatus.ACTIVE;
        campaign.requiresSelfProtocol = _requiresSelfProtocol;

        organizerCampaigns[msg.sender].push(campaignId);

        emit CampaignCreated(
            campaignId,
            msg.sender,
            _token,
            _totalAmount,
            _reputationCapPercent
        );

        return campaignId;
    }

    /**
     * @notice Register participant with reputation score (Oracle only)
     * @param _campaignId Campaign ID
     * @param _participant Participant address
     * @param _reputationScore Off-chain reputation score
     */
    function registerParticipant(
        uint256 _campaignId,
        address _participant,
        uint256 _reputationScore
    ) external 
        campaignExists(_campaignId) 
        onlyRole(ORACLE_ROLE) 
        validReputationScore(_reputationScore)
        notBlacklisted(_participant)
    {
        EscrowCampaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.ACTIVE, "Campaign not accepting participants");
        require(campaign.totalParticipants < maxParticipantsPerCampaign, "Campaign at capacity");
        require(campaign.participants[_participant].reputationScore == 0, "Already registered");
        require(!campaignBlacklist[_campaignId][_participant], "Participant blacklisted for campaign");

        // Verify through Self Protocol if required
        if (campaign.requiresSelfProtocol) {
            require(selfProtocol.isUserVerified(_participant), "Self Protocol verification required");
        }

        // Register participant
        campaign.participants[_participant] = ParticipantInfo({
            reputationScore: _reputationScore,
            calculatedShare: 0,
            hasClaimedShare: false,
            isVerified: campaign.requiresSelfProtocol ? selfProtocol.isUserVerified(_participant) : true,
            registeredAt: block.timestamp
        });

        campaign.participantList.push(_participant);
        campaign.totalParticipants++;
        campaign.totalReputationScore += _reputationScore;

        participantCampaigns[_participant].push(_campaignId);

        emit ParticipantRegistered(_campaignId, _participant, _reputationScore);
    }

    /**
     * @notice Batch register participants (Gas efficient)
     * @param _campaignId Campaign ID
     * @param _participants Array of participant data
     */
    function batchRegisterParticipants(
        uint256 _campaignId,
        BatchDistributionInput[] calldata _participants
    ) external campaignExists(_campaignId) onlyRole(ORACLE_ROLE) {
        EscrowCampaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.ACTIVE, "Campaign not accepting participants");
        require(_participants.length <= 500, "Batch too large");

        uint256 totalReputationAdded = 0;

        for (uint256 i = 0; i < _participants.length; i++) {
            address participant = _participants[i].participant;
            uint256 reputationScore = _participants[i].reputationScore;

            // Skip invalid entries
            if (participant == address(0) || 
                reputationScore == 0 || 
                campaign.participants[participant].reputationScore != 0 ||
                blacklistedAddresses[participant] ||
                campaignBlacklist[_campaignId][participant] ||
                campaign.totalParticipants >= maxParticipantsPerCampaign) {
                continue;
            }

            // Verify Self Protocol if required
            if (campaign.requiresSelfProtocol && !selfProtocol.isUserVerified(participant)) {
                continue;
            }

            // Register participant
            campaign.participants[participant] = ParticipantInfo({
                reputationScore: reputationScore,
                calculatedShare: 0,
                hasClaimedShare: false,
                isVerified: campaign.requiresSelfProtocol ? selfProtocol.isUserVerified(participant) : true,
                registeredAt: block.timestamp
            });

            campaign.participantList.push(participant);
            campaign.totalParticipants++;
            totalReputationAdded += reputationScore;

            participantCampaigns[participant].push(_campaignId);

            emit ParticipantRegistered(_campaignId, participant, reputationScore);
        }

        campaign.totalReputationScore += totalReputationAdded;
    }

    /**
     * @notice Calculate distribution shares based on reputation scores and cap
     * @param _campaignId Campaign ID
     */
    function calculateDistribution(
        uint256 _campaignId
    ) external campaignExists(_campaignId) onlyOrganizer(_campaignId) {
        EscrowCampaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.ACTIVE, "Invalid status for calculation");
        require(campaign.totalParticipants > 0, "No participants registered");

        campaign.status = CampaignStatus.CALCULATING;

        // Calculate capped reputation score
        uint256 cappedReputation = (campaign.totalReputationScore * campaign.reputationCapPercent) / 10000;
        campaign.cappedReputationScore = cappedReputation;

        // Calculate platform fee
        uint256 platformFee = (campaign.totalAmount * platformFeePercent) / 10000;
        uint256 distributionAmount = campaign.totalAmount - platformFee;

        // Calculate shares for each participant
        for (uint256 i = 0; i < campaign.participantList.length; i++) {
            address participant = campaign.participantList[i];
            ParticipantInfo storage participantInfo = campaign.participants[participant];
            
            if (participantInfo.isVerified) {
                // Calculate share based on capped reputation
                uint256 share = (participantInfo.reputationScore * distributionAmount) / cappedReputation;
                participantInfo.calculatedShare = share;
                campaign.distributedAmount += share;
            }
        }

        // Calculate remaining amount for refund
        campaign.remainingAmount = campaign.totalAmount - campaign.distributedAmount - platformFee;
        
        // Transfer platform fee
        if (platformFee > 0) {
            campaign.token.safeTransfer(feeRecipient, platformFee);
        }

        campaign.status = CampaignStatus.DISTRIBUTING;

        emit DistributionCalculated(
            _campaignId,
            campaign.totalParticipants,
            cappedReputation,
            campaign.distributedAmount
        );
    }

    /**
     * @notice Claim calculated token share
     * @param _campaignId Campaign ID
     */
    function claimTokens(
        uint256 _campaignId
    ) external campaignExists(_campaignId) nonReentrant notBlacklisted(msg.sender) {
        EscrowCampaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.DISTRIBUTING, "Claims not available");

        ParticipantInfo storage participant = campaign.participants[msg.sender];
        require(participant.reputationScore > 0, "Not a participant");
        require(!participant.hasClaimedShare, "Already claimed");
        require(participant.calculatedShare > 0, "No tokens to claim");
        require(participant.isVerified, "Not verified");

        participant.hasClaimedShare = true;
        campaign.token.safeTransfer(msg.sender, participant.calculatedShare);

        emit TokensClaimed(_campaignId, msg.sender, participant.calculatedShare);

        // Check if all tokens have been claimed
        _checkCampaignCompletion(_campaignId);
    }

    /**
     * @notice Batch process claims for multiple participants (Gas efficient for organizers)
     * @param _campaignId Campaign ID
     * @param _participants Array of participants to process claims for
     */
    function batchProcessClaims(
        uint256 _campaignId,
        address[] calldata _participants
    ) external campaignExists(_campaignId) onlyOrganizer(_campaignId) {
        EscrowCampaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.DISTRIBUTING, "Claims not available");
        require(_participants.length <= 200, "Batch too large");

        for (uint256 i = 0; i < _participants.length; i++) {
            address participant = _participants[i];
            ParticipantInfo storage participantInfo = campaign.participants[participant];
            
            if (!participantInfo.hasClaimedShare && 
                participantInfo.calculatedShare > 0 && 
                participantInfo.isVerified &&
                !blacklistedAddresses[participant]) {
                
                participantInfo.hasClaimedShare = true;
                campaign.token.safeTransfer(participant, participantInfo.calculatedShare);
                
                emit TokensClaimed(_campaignId, participant, participantInfo.calculatedShare);
            }
        }

        _checkCampaignCompletion(_campaignId);
    }

    /**
     * @notice Refund excess tokens to organizer
     * @param _campaignId Campaign ID
     */
    function refundExcessTokens(
        uint256 _campaignId
    ) external campaignExists(_campaignId) onlyOrganizer(_campaignId) {
        EscrowCampaign storage campaign = campaigns[_campaignId];
        require(
            campaign.status == CampaignStatus.DISTRIBUTING || 
            campaign.status == CampaignStatus.COMPLETED,
            "Invalid status for refund"
        );
        require(campaign.remainingAmount > 0, "No excess tokens to refund");

        uint256 refundAmount = campaign.remainingAmount;
        campaign.remainingAmount = 0;

        campaign.token.safeTransfer(campaign.organizer, refundAmount);

        emit ExcessTokensRefunded(_campaignId, campaign.organizer, refundAmount);
    }

    /**
     * @notice Cancel campaign and refund all tokens (before distribution calculation)
     * @param _campaignId Campaign ID
     * @param _reason Reason for cancellation
     */
    function cancelCampaign(
        uint256 _campaignId,
        string calldata _reason
    ) external campaignExists(_campaignId) onlyOrganizer(_campaignId) {
        EscrowCampaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.ACTIVE, "Cannot cancel after calculation");

        campaign.status = CampaignStatus.CANCELLED;
        campaign.token.safeTransfer(campaign.organizer, campaign.totalAmount);

        emit CampaignCancelled(_campaignId, _reason);
    }

    /**
     * @notice Emergency withdrawal after timeout
     * @param _campaignId Campaign ID
     */
    function emergencyWithdraw(
        uint256 _campaignId
    ) external campaignExists(_campaignId) onlyOrganizer(_campaignId) {
        EscrowCampaign storage campaign = campaigns[_campaignId];
        require(
            block.timestamp > campaign.createdAt + campaign.timeoutDuration,
            "Timeout not reached"
        );

        uint256 withdrawAmount = campaign.totalAmount - campaign.distributedAmount;
        require(withdrawAmount > 0, "No tokens to withdraw");

        campaign.status = CampaignStatus.EXPIRED;
        campaign.remainingAmount = 0;
        
        campaign.token.safeTransfer(campaign.organizer, withdrawAmount);

        emit CampaignExpired(_campaignId);
        emit EmergencyWithdrawal(_campaignId, campaign.organizer, withdrawAmount);
    }

    /**
     * @dev Check if campaign is completed and update status
     */
    function _checkCampaignCompletion(uint256 _campaignId) internal {
        EscrowCampaign storage campaign = campaigns[_campaignId];
        
        // Count unclaimed shares
        uint256 unclaimedShares = 0;
        for (uint256 i = 0; i < campaign.participantList.length; i++) {
            address participant = campaign.participantList[i];
            if (!campaign.participants[participant].hasClaimedShare && 
                campaign.participants[participant].calculatedShare > 0) {
                unclaimedShares++;
            }
        }

        if (unclaimedShares == 0) {
            campaign.status = CampaignStatus.COMPLETED;
            campaign.completedAt = block.timestamp;
        }
    }

    // View functions

    /**
     * @notice Get campaign details
     */
    function getCampaign(uint256 _campaignId) external view returns (
        address organizer,
        address token,
        uint256 totalAmount,
        uint256 reputationCapPercent,
        uint256 distributedAmount,
        uint256 remainingAmount,
        uint256 totalParticipants,
        uint256 totalReputationScore,
        uint256 cappedReputationScore,
        CampaignStatus status,
        bool requiresSelfProtocol
    ) {
        EscrowCampaign storage campaign = campaigns[_campaignId];
        return (
            campaign.organizer,
            address(campaign.token),
            campaign.totalAmount,
            campaign.reputationCapPercent,
            campaign.distributedAmount,
            campaign.remainingAmount,
            campaign.totalParticipants,
            campaign.totalReputationScore,
            campaign.cappedReputationScore,
            campaign.status,
            campaign.requiresSelfProtocol
        );
    }

    /**
     * @notice Get participant information
     */
    function getParticipantInfo(uint256 _campaignId, address _participant) external view returns (
        uint256 reputationScore,
        uint256 calculatedShare,
        bool hasClaimedShare,
        bool isVerified
    ) {
        ParticipantInfo storage participant = campaigns[_campaignId].participants[_participant];
        return (
            participant.reputationScore,
            participant.calculatedShare,
            participant.hasClaimedShare,
            participant.isVerified
        );
    }

    /**
     * @notice Get all participants for a campaign
     */
    function getCampaignParticipants(uint256 _campaignId) external view returns (address[] memory) {
        return campaigns[_campaignId].participantList;
    }

    /**
     * @notice Get organizer's campaigns
     */
    function getOrganizerCampaigns(address _organizer) external view returns (uint256[] memory) {
        return organizerCampaigns[_organizer];
    }

    /**
     * @notice Get participant's campaigns
     */
    function getParticipantCampaigns(address _participant) external view returns (uint256[] memory) {
        return participantCampaigns[_participant];
    }

    // Admin functions

    /**
     * @notice Add address to blacklist
     */
    function addToBlacklist(address _address) external onlyRole(ADMIN_ROLE) {
        blacklistedAddresses[_address] = true;
    }

    /**
     * @notice Remove address from blacklist
     */
    function removeFromBlacklist(address _address) external onlyRole(ADMIN_ROLE) {
        blacklistedAddresses[_address] = false;
    }

    /**
     * @notice Add address to campaign-specific blacklist
     */
    function addToCampaignBlacklist(uint256 _campaignId, address _participant) external onlyRole(ADMIN_ROLE) {
        campaignBlacklist[_campaignId][_participant] = true;
    }

    /**
     * @notice Set platform fee percentage
     */
    function setPlatformFee(uint256 _feePercent) external onlyRole(ADMIN_ROLE) {
        require(_feePercent <= 1000, "Fee too high"); // Max 10%
        platformFeePercent = _feePercent;
    }

    /**
     * @notice Set fee recipient
     */
    function setFeeRecipient(address _newRecipient) external onlyRole(ADMIN_ROLE) {
        require(_newRecipient != address(0), "Invalid recipient");
        feeRecipient = _newRecipient;
    }

    /**
     * @notice Set maximum participants per campaign
     */
    function setMaxParticipants(uint256 _maxParticipants) external onlyRole(ADMIN_ROLE) {
        require(_maxParticipants >= 100 && _maxParticipants <= 50000, "Invalid participant limit");
        maxParticipantsPerCampaign = _maxParticipants;
    }

    /**
     * @notice Set minimum escrow amount
     */
    function setMinEscrowAmount(uint256 _minAmount) external onlyRole(ADMIN_ROLE) {
        minEscrowAmount = _minAmount;
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
     * @notice Emergency token recovery (Admin only)
     */
    function emergencyTokenRecovery(
        address _token,
        address _to,
        uint256 _amount
    ) external onlyRole(ADMIN_ROLE) {
        IERC20(_token).safeTransfer(_to, _amount);
    }
}