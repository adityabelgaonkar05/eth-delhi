// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./CryptoVerseToken.sol";
import "./UserRegistry.sol";

/**
 * @title EscrowManager
 * @dev Manages escrow services, airdrops, and secure token transfers for CryptoVerse
 * @notice Handles merkle-tree based airdrops, escrow contracts, and reward distributions
 */
contract EscrowManager is AccessControl, ReentrancyGuard, Pausable {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");

    // Contract references
    CryptoVerseToken public cvrsToken;
    UserRegistry public userRegistry;

    // Airdrop campaign structure (level requirements removed)
    struct AirdropCampaign {
        uint256 campaignId;
        string name;
        string description;
        bytes32 merkleRoot;
        uint256 totalTokens;
        uint256 claimedTokens;
        uint256 startTime;
        uint256 endTime;
        uint256 individualLimit;
        bool isActive;
        bool requiresVerification; // Only verification required
        mapping(address => bool) hasClaimed;
        mapping(address => uint256) claimedAmounts;
    }

    // Escrow contract structure
    struct EscrowContract {
        uint256 escrowId;
        address sender;
        address recipient;
        uint256 amount;
        uint256 createdAt;
        uint256 releaseTime;
        bool isReleased;
        bool isCancelled;
        string purpose;
        bool requiresApproval;
        bool isApproved;
    }

    // Batch payment structure
    struct BatchPayment {
        uint256 batchId;
        address sender;
        uint256 totalAmount;
        uint256 recipientCount;
        uint256 createdAt;
        bool isExecuted;
        string description;
        mapping(address => uint256) payments;
        address[] recipients;
    }

    // State variables
    mapping(uint256 => AirdropCampaign) public airdropCampaigns;
    mapping(uint256 => EscrowContract) public escrowContracts;
    mapping(uint256 => BatchPayment) public batchPayments;
    mapping(address => uint256[]) public userEscrows;
    mapping(address => uint256[]) public userAirdrops;
    mapping(bytes32 => bool) public usedProofs;

    uint256 public campaignCounter;
    uint256 public escrowCounter;
    uint256 public batchCounter;
    uint256 public escrowFeePercent = 100; // 1%
    uint256 public constant FEE_DENOMINATOR = 10000;
    address public feeRecipient;

    // Events
    event AirdropCampaignCreated(
        uint256 indexed campaignId,
        string name,
        uint256 totalTokens,
        bytes32 merkleRoot
    );
    event AirdropClaimed(
        uint256 indexed campaignId,
        address indexed user,
        uint256 amount
    );
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed sender,
        address indexed recipient,
        uint256 amount
    );
    event EscrowReleased(
        uint256 indexed escrowId,
        address indexed recipient,
        uint256 amount
    );
    event EscrowCancelled(uint256 indexed escrowId, address indexed sender);
    event BatchPaymentCreated(
        uint256 indexed batchId,
        address indexed sender,
        uint256 recipientCount,
        uint256 totalAmount
    );
    event BatchPaymentExecuted(uint256 indexed batchId, uint256 successCount);

    // Errors (level-related errors removed)
    error CampaignNotActive();
    error AlreadyClaimed();
    error InvalidProof();
    error NotVerified();
    error EscrowNotFound();
    error NotAuthorized();
    error EscrowAlreadyReleased();
    error EscrowNotDue();
    error InvalidBatchPayment();
    error InsufficientBalance();

    constructor(
        address _cvrsToken,
        address _userRegistry,
        address _feeRecipient
    ) {
    require(_cvrsToken != address(0), "CVRS token address cannot be zero");
    require(_userRegistry != address(0), "UserRegistry address cannot be zero");
    require(_feeRecipient != address(0), "Fee recipient address cannot be zero");

    cvrsToken = CryptoVerseToken(_cvrsToken);
    userRegistry = UserRegistry(_userRegistry);
    feeRecipient = _feeRecipient;

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(ADMIN_ROLE, msg.sender);
    _grantRole(DISTRIBUTOR_ROLE, msg.sender);
    _grantRole(PLATFORM_ROLE, msg.sender);
    }

    // Airdrop Functions

    /**
     * @notice Create a new airdrop campaign with merkle tree verification
     * @param _name Campaign name
     * @param _description Campaign description
     * @param _merkleRoot Merkle root for claiming verification
     * @param _totalTokens Total tokens allocated for the campaign
     * @param _startTime Campaign start time
     * @param _endTime Campaign end time
     * @param _individualLimit Maximum tokens per individual claim
     * @param _requiresVerification Whether Self Protocol verification is required
     */
    function createAirdropCampaign(
        string calldata _name,
        string calldata _description,
        bytes32 _merkleRoot,
        uint256 _totalTokens,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _individualLimit,
        bool _requiresVerification
    ) external onlyRole(DISTRIBUTOR_ROLE) {
        require(_totalTokens > 0, "Invalid token amount");
        require(_endTime > _startTime, "Invalid time range");
        require(_startTime > block.timestamp, "Start time must be in future");

        uint256 campaignId = campaignCounter++;

        AirdropCampaign storage campaign = airdropCampaigns[campaignId];
        campaign.campaignId = campaignId;
        campaign.name = _name;
        campaign.description = _description;
        campaign.merkleRoot = _merkleRoot;
        campaign.totalTokens = _totalTokens;
        campaign.startTime = _startTime;
        campaign.endTime = _endTime;
        campaign.individualLimit = _individualLimit;
        campaign.isActive = true;
        campaign.requiresVerification = _requiresVerification;

        // Transfer tokens to this contract for distribution
        require(
            cvrsToken.transferFrom(msg.sender, address(this), _totalTokens),
            "Token transfer failed"
        );

        emit AirdropCampaignCreated(campaignId, _name, _totalTokens, _merkleRoot);
    }

    /**
     * @notice Claim tokens from an airdrop campaign
     * @param _campaignId Campaign ID
     * @param _amount Amount to claim
     * @param _merkleProof Merkle proof for verification
     */
    function claimAirdrop(
        uint256 _campaignId,
        uint256 _amount,
        bytes32[] calldata _merkleProof
    ) external whenNotPaused nonReentrant {
        AirdropCampaign storage campaign = airdropCampaigns[_campaignId];
        
        if (!campaign.isActive) revert CampaignNotActive();
        if (block.timestamp < campaign.startTime || block.timestamp > campaign.endTime) {
            revert CampaignNotActive();
        }
        if (campaign.hasClaimed[msg.sender]) revert AlreadyClaimed();
        if (_amount > campaign.individualLimit) revert("Amount exceeds limit");

        // Check user requirements (level requirements removed - handled off-chain)
        if (campaign.requiresVerification) {
            if (!userRegistry.selfProtocol().isUserVerified(msg.sender)) {
                revert NotVerified();
            }
        }

        // Verify merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, _amount));
        if (!MerkleProof.verify(_merkleProof, campaign.merkleRoot, leaf)) {
            revert InvalidProof();
        }

        // Prevent replay attacks
        bytes32 proofHash = keccak256(abi.encode(_merkleProof, msg.sender, _amount));
        require(!usedProofs[proofHash], "Proof already used");
        usedProofs[proofHash] = true;

        // Update campaign state
        campaign.hasClaimed[msg.sender] = true;
        campaign.claimedAmounts[msg.sender] = _amount;
        campaign.claimedTokens += _amount;

        // Transfer tokens
        require(cvrsToken.transfer(msg.sender, _amount), "Token transfer failed");

        // Track user participation
        userAirdrops[msg.sender].push(_campaignId);

        emit AirdropClaimed(_campaignId, msg.sender, _amount);
    }

    // Escrow Functions

    /**
     * @notice Create an escrow contract
     * @param _recipient Recipient address
     * @param _amount Amount to escrow
     * @param _releaseTime Time when funds can be released
     * @param _purpose Purpose of the escrow
     * @param _requiresApproval Whether release requires approval
     */
    function createEscrow(
        address _recipient,
        uint256 _amount,
        uint256 _releaseTime,
        string calldata _purpose,
        bool _requiresApproval
    ) external whenNotPaused nonReentrant returns (uint256 escrowId) {
        require(_recipient != address(0), "Invalid recipient");
        require(_amount > 0, "Invalid amount");
        require(_releaseTime > block.timestamp, "Release time must be in future");

        escrowId = escrowCounter++;

        // Calculate fee
        uint256 fee = (_amount * escrowFeePercent) / FEE_DENOMINATOR;
        uint256 totalRequired = _amount + fee;

        // Transfer tokens to this contract
        require(
            cvrsToken.transferFrom(msg.sender, address(this), totalRequired),
            "Token transfer failed"
        );

        // Transfer fee to fee recipient
        if (fee > 0) {
            require(cvrsToken.transfer(feeRecipient, fee), "Fee transfer failed");
        }

        // Create escrow
        escrowContracts[escrowId] = EscrowContract({
            escrowId: escrowId,
            sender: msg.sender,
            recipient: _recipient,
            amount: _amount,
            createdAt: block.timestamp,
            releaseTime: _releaseTime,
            isReleased: false,
            isCancelled: false,
            purpose: _purpose,
            requiresApproval: _requiresApproval,
            isApproved: false
        });

        userEscrows[msg.sender].push(escrowId);
        userEscrows[_recipient].push(escrowId);

        emit EscrowCreated(escrowId, msg.sender, _recipient, _amount);
    }

    /**
     * @notice Release funds from escrow (can be called by sender or recipient)
     * @param _escrowId Escrow contract ID
     */
    function releaseEscrow(uint256 _escrowId) external whenNotPaused nonReentrant {
        EscrowContract storage escrow = escrowContracts[_escrowId];
        
        if (escrow.sender == address(0)) revert EscrowNotFound();
        if (escrow.isReleased || escrow.isCancelled) revert EscrowAlreadyReleased();
        if (block.timestamp < escrow.releaseTime) revert EscrowNotDue();
        if (msg.sender != escrow.sender && msg.sender != escrow.recipient) {
            revert NotAuthorized();
        }

        // Check approval requirement
        if (escrow.requiresApproval && !escrow.isApproved) {
            require(msg.sender == escrow.sender, "Requires sender approval");
            escrow.isApproved = true;
            return; // Don't release yet, just approve
        }

        // Release funds
        escrow.isReleased = true;
        require(cvrsToken.transfer(escrow.recipient, escrow.amount), "Token transfer failed");

        emit EscrowReleased(_escrowId, escrow.recipient, escrow.amount);
    }

    /**
     * @notice Cancel an escrow contract (sender only, before release time)
     * @param _escrowId Escrow contract ID
     */
    function cancelEscrow(uint256 _escrowId) external nonReentrant {
        EscrowContract storage escrow = escrowContracts[_escrowId];
        
        if (escrow.sender != msg.sender) revert NotAuthorized();
        if (escrow.isReleased || escrow.isCancelled) revert EscrowAlreadyReleased();
        if (block.timestamp >= escrow.releaseTime) revert("Cannot cancel after release time");

        escrow.isCancelled = true;
        require(cvrsToken.transfer(escrow.sender, escrow.amount), "Token transfer failed");

        emit EscrowCancelled(_escrowId, msg.sender);
    }

    // Batch Payment Functions

    /**
     * @notice Create a batch payment to multiple recipients
     * @param _recipients Array of recipient addresses
     * @param _amounts Array of amounts for each recipient
     * @param _description Description of the batch payment
     */
    function createBatchPayment(
        address[] calldata _recipients,
        uint256[] calldata _amounts,
        string calldata _description
    ) external whenNotPaused nonReentrant returns (uint256 batchId) {
        require(_recipients.length == _amounts.length, "Arrays length mismatch");
        require(_recipients.length > 0, "Empty recipients array");

        batchId = batchCounter++;
        uint256 totalAmount = 0;

        // Calculate total amount
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }

        require(totalAmount > 0, "Invalid total amount");

        // Transfer total amount to this contract
        require(
            cvrsToken.transferFrom(msg.sender, address(this), totalAmount),
            "Token transfer failed"
        );

        // Create batch payment
        BatchPayment storage batch = batchPayments[batchId];
        batch.batchId = batchId;
        batch.sender = msg.sender;
        batch.totalAmount = totalAmount;
        batch.recipientCount = _recipients.length;
        batch.createdAt = block.timestamp;
        batch.description = _description;

        // Store payment details
        for (uint256 i = 0; i < _recipients.length; i++) {
            batch.payments[_recipients[i]] = _amounts[i];
            batch.recipients.push(_recipients[i]);
        }

        emit BatchPaymentCreated(batchId, msg.sender, _recipients.length, totalAmount);
    }

    /**
     * @notice Execute a batch payment
     * @param _batchId Batch payment ID
     */
    function executeBatchPayment(uint256 _batchId) external whenNotPaused nonReentrant {
        BatchPayment storage batch = batchPayments[_batchId];
        
        require(batch.sender == msg.sender, "Not authorized");
        require(!batch.isExecuted, "Already executed");

        batch.isExecuted = true;
        uint256 successCount = 0;

        // Execute payments
        for (uint256 i = 0; i < batch.recipients.length; i++) {
            address recipient = batch.recipients[i];
            uint256 amount = batch.payments[recipient];
            
            if (amount > 0) {
                bool success = cvrsToken.transfer(recipient, amount);
                if (success) {
                    successCount++;
                }
            }
        }

        emit BatchPaymentExecuted(_batchId, successCount);
    }

    // View Functions

    /**
     * @notice Check if user has claimed from a campaign
     * @param _campaignId Campaign ID
     * @param _user User address
     * @return Whether user has claimed
     */
    function hasClaimed(uint256 _campaignId, address _user) external view returns (bool) {
        return airdropCampaigns[_campaignId].hasClaimed[_user];
    }

    /**
     * @notice Get campaign details
     * @param _campaignId Campaign ID
     * @return name Campaign name
     * @return description Campaign description
     * @return totalTokens Total tokens allocated
     * @return claimedTokens Total tokens claimed
     * @return startTime Campaign start time
     * @return endTime Campaign end time
     * @return isActive Whether campaign is active
     */
    function getCampaignInfo(uint256 _campaignId) external view returns (
        string memory name,
        string memory description,
        uint256 totalTokens,
        uint256 claimedTokens,
        uint256 startTime,
        uint256 endTime,
        bool isActive
    ) {
        AirdropCampaign storage campaign = airdropCampaigns[_campaignId];
        return (
            campaign.name,
            campaign.description,
            campaign.totalTokens,
            campaign.claimedTokens,
            campaign.startTime,
            campaign.endTime,
            campaign.isActive
        );
    }

    /**
     * @notice Get user's escrow contracts
     * @param _user User address
     * @return Array of escrow IDs
     */
    function getUserEscrows(address _user) external view returns (uint256[] memory) {
        return userEscrows[_user];
    }

    /**
     * @notice Get user's airdrop participations
     * @param _user User address
     * @return Array of campaign IDs
     */
    function getUserAirdrops(address _user) external view returns (uint256[] memory) {
        return userAirdrops[_user];
    }

    // Admin Functions

    /**
     * @notice Set escrow fee percentage
     * @param _feePercent New fee percentage (in basis points)
     */
    function setEscrowFee(uint256 _feePercent) external onlyRole(ADMIN_ROLE) {
        require(_feePercent <= 1000, "Fee too high"); // Max 10%
        escrowFeePercent = _feePercent;
    }

    /**
     * @notice Set fee recipient
     * @param _feeRecipient New fee recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyRole(ADMIN_ROLE) {
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Toggle campaign active status
     * @param _campaignId Campaign ID
     * @param _isActive New active status
     */
    function setCampaignActive(
        uint256 _campaignId,
        bool _isActive
    ) external onlyRole(ADMIN_ROLE) {
        airdropCampaigns[_campaignId].isActive = _isActive;
    }

    /**
     * @notice Emergency withdraw remaining campaign tokens
     * @param _campaignId Campaign ID
     */
    function withdrawCampaignTokens(uint256 _campaignId) external onlyRole(ADMIN_ROLE) {
        AirdropCampaign storage campaign = airdropCampaigns[_campaignId];
        require(block.timestamp > campaign.endTime, "Campaign still active");
        
        uint256 remainingTokens = campaign.totalTokens - campaign.claimedTokens;
        if (remainingTokens > 0) {
            campaign.totalTokens = campaign.claimedTokens; // Update to prevent double withdrawal
            require(cvrsToken.transfer(msg.sender, remainingTokens), "Transfer failed");
        }
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}