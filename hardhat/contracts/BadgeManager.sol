// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./UserRegistry.sol";
import "./CryptoVerseToken.sol";

/**
 * @title BadgeManager
 * @dev Manages badge marketplace where users can purchase profile badges with CVRS tokens
 * @notice Handles badge creation, pricing, purchasing, and ownership for the CryptoVerse platform
 */
contract BadgeManager is AccessControl, ReentrancyGuard, Pausable {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");
    
    // Badge structure
    struct Badge {
        uint256 badgeId;
        string name;
        string description;
        string imageURI;
        string category;
        uint256 price;
        string rarity;
        bool isActive;
        bool isLimited;
        uint256 maxSupply;
        uint256 currentSupply;
        uint256 createdAt;
        address creator;
        bool requiresEvent; // Whether badge requires event attendance
        uint256 requiredEventId; // Specific event ID required
    }
    
    // Purchase record
    struct Purchase {
        uint256 purchaseId;
        address buyer;
        uint256 badgeId;
        uint256 price;
        uint256 timestamp;
        string purchaseType; // "direct", "level_unlock", "event_reward"
    }
    
    // State variables
    UserRegistry public userRegistry;
    CryptoVerseToken public cvrsToken;
    
    mapping(uint256 => Badge) public badges;
    mapping(address => uint256[]) public userOwnedBadges;
    mapping(uint256 => mapping(address => bool)) public userOwnsBadge;
    mapping(string => uint256[]) public categoryBadges;
    mapping(string => uint256[]) public rarityBadges;
    mapping(uint256 => Purchase[]) public badgePurchaseHistory;
    
    uint256 public nextBadgeId = 1;
    uint256 public nextPurchaseId = 1;
    uint256 public totalBadges;
    uint256 public activeBadges;
    uint256 public totalPurchases;
    uint256 public totalRevenue;
    
    // Configuration
    mapping(string => bool) public validCategories;
    mapping(string => bool) public validRarities;
    mapping(string => uint256) public rarityMultipliers; // Price multipliers by rarity
    
    string[] public supportedCategories;
    string[] public supportedRarities;
    
    // Revenue sharing
    address public treasuryWallet;
    uint256 public treasuryFeePercentage = 30; // 30% goes to treasury
    
    // Events
    event BadgeCreated(
        uint256 indexed badgeId,
        string name,
        string category,
        string rarity,
        uint256 price,
        bool isLimited,
        uint256 maxSupply
    );
    event BadgePurchased(
        uint256 indexed badgeId,
        address indexed buyer,
        uint256 price,
        uint256 timestamp,
        string purchaseType
    );
    event BadgeUpdated(uint256 indexed badgeId, string field);
    event BadgeDeactivated(uint256 indexed badgeId, string reason);
    event CategoryAdded(string category);
    event CategoryRemoved(string category);
    event RarityAdded(string rarity, uint256 multiplier);
    event RarityRemoved(string rarity);
    event TreasuryUpdated(address newTreasury);
    event FeePercentageUpdated(uint256 newPercentage);
    
    // Custom errors
    error BadgeNotFound();
    error BadgeNotActive();
    error BadgeNotAvailable();
    error BadgeAlreadyOwned();
    error InsufficientCVRSBalance();
    error InvalidPrice();
    error InvalidCategory();
    error InvalidRarity();
    error InvalidMaxSupply();
    error UserNotRegistered();
    error InsufficientLevel();
    error EventNotAttended();
    error MaxSupplyReached();
    error UnauthorizedAccess();
    error InvalidTreasuryAddress();
    error InvalidFeePercentage();
    
    /**
     * @dev Constructor sets up the contract
     * @param _userRegistry Address of the UserRegistry contract
     * @param _cvrsToken Address of the CVRS token contract
     * @param _treasuryWallet Address for treasury fee collection
     */
    constructor(
        address _userRegistry,
        address _cvrsToken,
        address _treasuryWallet
    ) {
        require(_userRegistry != address(0), "UserRegistry address cannot be zero");
        require(_cvrsToken != address(0), "CVRS token address cannot be zero");
        require(_treasuryWallet != address(0), "Treasury address cannot be zero");

        userRegistry = UserRegistry(_userRegistry);
        cvrsToken = CryptoVerseToken(_cvrsToken);
        treasuryWallet = _treasuryWallet;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        // Initialize categories
        _addCategory("Avatar");
        _addCategory("Frame");
        _addCategory("Background");
        _addCategory("Achievement");
        _addCategory("Special");
        _addCategory("Seasonal");

        // Initialize rarities with multipliers
        _addRarity("common", 100); // 1x multiplier (100%)
        _addRarity("rare", 300); // 3x multiplier
        _addRarity("epic", 500); // 5x multiplier
        _addRarity("legendary", 1000); // 10x multiplier
    }
    
    /**
     * @notice Create a new badge (admin only) - level requirements removed
     * @param _name Badge name
     * @param _description Badge description
     * @param _imageURI Image URI for the badge
     * @param _category Badge category
     * @param _basePrice Base price before rarity multiplier
     * @param _rarity Badge rarity level
     * @param _isLimited Whether badge has limited supply
     * @param _maxSupply Maximum supply (0 for unlimited)
     * @param _requiresEvent Whether badge requires event attendance
     * @param _requiredEventId Required event ID (if applicable)
     */
    function createBadge(
        string calldata _name,
        string calldata _description,
        string calldata _imageURI,
        string calldata _category,
        uint256 _basePrice,
        string calldata _rarity,
        bool _isLimited,
        uint256 _maxSupply,
        bool _requiresEvent,
        uint256 _requiredEventId
    ) external onlyRole(ADMIN_ROLE) whenNotPaused {
        if (!validCategories[_category]) revert InvalidCategory();
        if (!validRarities[_rarity]) revert InvalidRarity();
        if (_basePrice == 0) revert InvalidPrice();
        if (_isLimited && _maxSupply == 0) revert InvalidMaxSupply();

        uint256 badgeId = nextBadgeId++;
        uint256 finalPrice = (_basePrice * rarityMultipliers[_rarity]) / 100;
        _createBadgeStruct(
            badgeId,
            _name,
            _description,
            _imageURI,
            _category,
            finalPrice,
            _rarity,
            _isLimited,
            _maxSupply,
            _requiresEvent,
            _requiredEventId
        );
        emit BadgeCreated(badgeId, _name, _category, _rarity, finalPrice, _isLimited, _maxSupply);
    }

    function _createBadgeStruct(
        uint256 badgeId,
        string calldata _name,
        string calldata _description,
        string calldata _imageURI,
        string calldata _category,
        uint256 finalPrice,
        string calldata _rarity,
        bool _isLimited,
        uint256 _maxSupply,
        bool _requiresEvent,
        uint256 _requiredEventId
    ) internal {
        badges[badgeId] = Badge({
            badgeId: badgeId,
            name: _name,
            description: _description,
            imageURI: _imageURI,
            category: _category,
            price: finalPrice,
            rarity: _rarity,
            isActive: true,
            isLimited: _isLimited,
            maxSupply: _maxSupply,
            currentSupply: 0,
            createdAt: block.timestamp,
            creator: msg.sender,
            requiresEvent: _requiresEvent,
            requiredEventId: _requiredEventId
        });
        categoryBadges[_category].push(badgeId);
        rarityBadges[_rarity].push(badgeId);
        totalBadges++;
        activeBadges++;
    }
    
    /**
     * @notice Purchase a badge with CVRS tokens
     * @param _badgeId The badge ID to purchase
     */
    function purchaseBadge(uint256 _badgeId) external whenNotPaused nonReentrant {
        // Basic user verification (removed complex level checks)
        UserRegistry.UserProfile memory profile = userRegistry.getUserProfile(msg.sender);
        if (profile.userAddress == address(0)) revert UserNotRegistered();
        if (!profile.isActive) revert UserNotRegistered();
        
        Badge storage badge = badges[_badgeId];
        if (badge.badgeId == 0) revert BadgeNotFound();
        if (!badge.isActive) revert BadgeNotActive();
        if (userOwnsBadge[_badgeId][msg.sender]) revert BadgeAlreadyOwned();
        
        // Check supply limits
        if (badge.isLimited && badge.currentSupply >= badge.maxSupply) {
            revert MaxSupplyReached();
        }
        
        // Check event requirements (simplified - remove getUserEvents call)
        if (badge.requiresEvent) {
            // Note: Event attendance verification now handled off-chain
            // Badge purchase should be called by backend after event verification
            UserRegistry.UserStats memory stats = userRegistry.getUserStats(msg.sender);
            if (stats.eventsAttended == 0) revert EventNotAttended();
        }
        
        // Check CVRS balance
        if (cvrsToken.balanceOf(msg.sender) < badge.price) revert InsufficientCVRSBalance();
        
        // Process purchase
        _processBadgePurchase(_badgeId, msg.sender, badge.price, "direct");
    }
    
    /**
     * @notice Award a badge to user for free (platform role)
     * @param _badgeId The badge ID to award
     * @param _user The user to award the badge to
     * @param _awardType The type of award ("level_unlock", "event_reward", etc.)
     */
    function awardBadge(
        uint256 _badgeId,
        address _user,
        string calldata _awardType
    ) external onlyRole(PLATFORM_ROLE) {
        // Basic user verification (simplified)
        UserRegistry.UserProfile memory profile = userRegistry.getUserProfile(_user);
        if (profile.userAddress == address(0)) revert UserNotRegistered();
        if (!profile.isActive) revert UserNotRegistered();
        
        Badge storage badge = badges[_badgeId];
        if (badge.badgeId == 0) revert BadgeNotFound();
        if (!badge.isActive) revert BadgeNotActive();
        if (userOwnsBadge[_badgeId][_user]) revert BadgeAlreadyOwned();
        
        // Check supply limits
        if (badge.isLimited && badge.currentSupply >= badge.maxSupply) {
            revert MaxSupplyReached();
        }
        
        // Award badge for free
        _processBadgePurchase(_badgeId, _user, 0, _awardType);
    }
    
    /**
     * @dev Internal function to process badge purchase/award
     */
    function _processBadgePurchase(
        uint256 _badgeId,
        address _user,
        uint256 _price,
        string memory _purchaseType
    ) internal {
        Badge storage badge = badges[_badgeId];
        
        // Transfer CVRS tokens if price > 0
        if (_price > 0) {
            // Calculate treasury fee
            uint256 treasuryFee = (_price * treasuryFeePercentage) / 100;
            uint256 burnAmount = _price - treasuryFee;
            
            // Burn most tokens and send treasury fee
            cvrsToken.burnFrom(_user, burnAmount);
            if (treasuryFee > 0) {
                cvrsToken.transferFrom(_user, treasuryWallet, treasuryFee);
            }
            
            totalRevenue += _price;
        }
        
        // Record ownership
        userOwnedBadges[_user].push(_badgeId);
        userOwnsBadge[_badgeId][_user] = true;
        badge.currentSupply++;
        
        // Add to user registry
        userRegistry.awardBadge(_user, badges[_badgeId].name);
        
        // Record purchase
        Purchase memory purchase = Purchase({
            purchaseId: nextPurchaseId++,
            buyer: _user,
            badgeId: _badgeId,
            price: _price,
            timestamp: block.timestamp,
            purchaseType: _purchaseType
        });
        
        badgePurchaseHistory[_badgeId].push(purchase);
        totalPurchases++;
        
        emit BadgePurchased(_badgeId, _user, _price, block.timestamp, _purchaseType);
    }
    
    /**
     * @notice Update badge price (admin only)
     * @param _badgeId The badge ID
     * @param _newBasePrice New base price before rarity multiplier
     */
    function updateBadgePrice(uint256 _badgeId, uint256 _newBasePrice) external onlyRole(ADMIN_ROLE) {
        if (badges[_badgeId].badgeId == 0) revert BadgeNotFound();
        if (_newBasePrice == 0) revert InvalidPrice();
        
        Badge storage badge = badges[_badgeId];
        uint256 newPrice = (_newBasePrice * rarityMultipliers[badge.rarity]) / 100;
        badge.price = newPrice;
        
        emit BadgeUpdated(_badgeId, "price");
    }
    
    /**
     * @notice Deactivate a badge (admin only)
     * @param _badgeId The badge ID to deactivate
     * @param _reason Reason for deactivation
     */
    function deactivateBadge(uint256 _badgeId, string calldata _reason) external onlyRole(ADMIN_ROLE) {
        if (badges[_badgeId].badgeId == 0) revert BadgeNotFound();
        
        badges[_badgeId].isActive = false;
        activeBadges--;
        
        emit BadgeDeactivated(_badgeId, _reason);
    }
    
    /**
     * @notice Reactivate a badge (admin only)
     * @param _badgeId The badge ID to reactivate
     */
    function reactivateBadge(uint256 _badgeId) external onlyRole(ADMIN_ROLE) {
        if (badges[_badgeId].badgeId == 0) revert BadgeNotFound();
        
        badges[_badgeId].isActive = true;
        activeBadges++;
        
        emit BadgeUpdated(_badgeId, "reactivated");
    }
    
    // View functions
    
    /**
     * @notice Get badge details
     * @param _badgeId The badge ID
     * @return Badge struct
     */
    function getBadge(uint256 _badgeId) external view returns (Badge memory) {
        if (badges[_badgeId].badgeId == 0) revert BadgeNotFound();
        return badges[_badgeId];
    }
    
    /**
     * @notice Get user's owned badges
     * @param _user The user address
     * @return Array of badge IDs
     */
    function getUserBadges(address _user) external view returns (uint256[] memory) {
        return userOwnedBadges[_user];
    }
    
    /**
     * @notice Get badges by category
     * @param _category The category name
     * @return Array of badge IDs
     */
    function getBadgesByCategory(string calldata _category) external view returns (uint256[] memory) {
        if (!validCategories[_category]) revert InvalidCategory();
        return categoryBadges[_category];
    }
    
    /**
     * @notice Get badges by rarity
     * @param _rarity The rarity level
     * @return Array of badge IDs
     */
    function getBadgesByRarity(string calldata _rarity) external view returns (uint256[] memory) {
        if (!validRarities[_rarity]) revert InvalidRarity();
        return rarityBadges[_rarity];
    }
    
    /**
     * @notice Get active badges
     * @return Array of active badge IDs
     */
    function getActiveBadges() external view returns (uint256[] memory) {
        uint256[] memory activeBadgeIds = new uint256[](activeBadges);
        uint256 index = 0;
        
        for (uint256 i = 1; i < nextBadgeId; i++) {
            if (badges[i].isActive) {
                activeBadgeIds[index] = i;
                index++;
            }
        }
        
        return activeBadgeIds;
    }
    
    /**
     * @notice Check if user owns a badge
     * @param _badgeId The badge ID
     * @param _user The user address
     * @return True if user owns the badge
     */
    function doesUserOwnBadge(uint256 _badgeId, address _user) external view returns (bool) {
        return userOwnsBadge[_badgeId][_user];
    }
    
    /**
     * @notice Get badge purchase history
     * @param _badgeId The badge ID
     * @return Array of Purchase structs
     */
    function getBadgePurchaseHistory(uint256 _badgeId) external view returns (Purchase[] memory) {
        return badgePurchaseHistory[_badgeId];
    }
    
    /**
     * @notice Get supported categories
     * @return Array of category names
     */
    function getSupportedCategories() external view returns (string[] memory) {
        return supportedCategories;
    }
    
    /**
     * @notice Get supported rarities
     * @return Array of rarity names
     */
    function getSupportedRarities() external view returns (string[] memory) {
        return supportedRarities;
    }
    
    /**
     * @notice Get marketplace statistics
     * @return total The total number of badges
     * @return active The number of active badges
     * @return purchases The total number of purchases
     * @return revenue The total revenue generated
     */
    function getMarketplaceStats() external view returns (
        uint256 total,
        uint256 active,
        uint256 purchases,
        uint256 revenue
    ) {
        return (totalBadges, activeBadges, totalPurchases, totalRevenue);
    }
    
    // Admin functions
    
    /**
     * @notice Add category (admin only)
     * @param _category The category name
     */
    function addCategory(string calldata _category) external onlyRole(ADMIN_ROLE) {
        _addCategory(_category);
    }
    
    /**
     * @notice Remove category (admin only)
     * @param _category The category name
     */
    function removeCategory(string calldata _category) external onlyRole(ADMIN_ROLE) {
        if (!validCategories[_category]) revert InvalidCategory();
        
        validCategories[_category] = false;
        
        // Remove from array
        for (uint256 i = 0; i < supportedCategories.length; i++) {
            if (keccak256(bytes(supportedCategories[i])) == keccak256(bytes(_category))) {
                supportedCategories[i] = supportedCategories[supportedCategories.length - 1];
                supportedCategories.pop();
                break;
            }
        }
        
        emit CategoryRemoved(_category);
    }
    
    /**
     * @notice Add rarity (admin only)
     * @param _rarity The rarity name
     * @param _multiplier The price multiplier (in percentage, 100 = 1x)
     */
    function addRarity(string calldata _rarity, uint256 _multiplier) external onlyRole(ADMIN_ROLE) {
        _addRarity(_rarity, _multiplier);
    }
    
    /**
     * @notice Remove rarity (admin only)
     * @param _rarity The rarity name
     */
    function removeRarity(string calldata _rarity) external onlyRole(ADMIN_ROLE) {
        if (!validRarities[_rarity]) revert InvalidRarity();
        
        validRarities[_rarity] = false;
        delete rarityMultipliers[_rarity];
        
        // Remove from array
        for (uint256 i = 0; i < supportedRarities.length; i++) {
            if (keccak256(bytes(supportedRarities[i])) == keccak256(bytes(_rarity))) {
                supportedRarities[i] = supportedRarities[supportedRarities.length - 1];
                supportedRarities.pop();
                break;
            }
        }
        
        emit RarityRemoved(_rarity);
    }
    
    /**
     * @notice Update treasury wallet (admin only)
     * @param _newTreasury New treasury wallet address
     */
    function updateTreasuryWallet(address _newTreasury) external onlyRole(ADMIN_ROLE) {
        if (_newTreasury == address(0)) revert InvalidTreasuryAddress();
        
        treasuryWallet = _newTreasury;
        emit TreasuryUpdated(_newTreasury);
    }
    
    /**
     * @notice Update treasury fee percentage (admin only)
     * @param _newPercentage New fee percentage (0-100)
     */
    function updateTreasuryFeePercentage(uint256 _newPercentage) external onlyRole(ADMIN_ROLE) {
        if (_newPercentage > 100) revert InvalidFeePercentage();
        
        treasuryFeePercentage = _newPercentage;
        emit FeePercentageUpdated(_newPercentage);
    }
    
    /**
     * @notice Pause the contract (admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause the contract (admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // Internal functions
    
    /**
     * @dev Internal function to add category
     */
    function _addCategory(string memory _category) internal {
        if (!validCategories[_category]) {
            validCategories[_category] = true;
            supportedCategories.push(_category);
            emit CategoryAdded(_category);
        }
    }
    
    /**
     * @dev Internal function to add rarity
     */
    function _addRarity(string memory _rarity, uint256 _multiplier) internal {
        if (!validRarities[_rarity]) {
            validRarities[_rarity] = true;
            rarityMultipliers[_rarity] = _multiplier;
            supportedRarities.push(_rarity);
            emit RarityAdded(_rarity, _multiplier);
        }
    }
}
