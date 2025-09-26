// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./SelfProtocolIntegration.sol";
import "./CryptoVerseToken.sol";

/**
 * @title UserRegistry
 * @dev Manages user profiles and verification with simplified Self Protocol integration
 * @notice Handles user registration and verification status (NO LEVELING/XP SYSTEM)
 * 
 * CHANGES MADE:
 * - Updated to use simplified SelfProtocolIntegration contract
 * - Removed complex on-chain verification logic  
 * - Simplified verification checks to boolean status
 * - REMOVED ALL LEVELING AND XP LOGIC (moved off-chain)
 * - Reduced gas costs by removing unnecessary calculations
 * - Focus on essential on-chain data only: verification, badges, stats
 */
contract UserRegistry is AccessControl, ReentrancyGuard, Pausable {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");

    // Contract references (simplified)
    SelfProtocolIntegration public selfProtocol;
    CryptoVerseToken public cvrsToken;

    // User profile structure (leveling removed - handled off-chain)
    struct UserProfile {
        address userAddress;
        string username;
        string email;
        string bio;
        string avatarUrl;
        bool isVerified; // Simplified: just verified status
        uint256 registeredAt;
        uint256 lastActive;
        bool isActive;
        uint256 totalRewards; // Token rewards earned
        uint256 streakCount; // Login/activity streaks
        uint8 reputation; // Basic reputation score
    }

    // Statistics structure
    struct UserStats {
        uint256 blogsRead;
        uint256 quizzesCompleted;
        uint256 eventsAttended;
        uint256 badgesEarned;
        uint256 nftsMinted;
    }

    // State variables (level mappings removed)
    mapping(address => UserProfile) public userProfiles;
    mapping(address => UserStats) public userStats;
    mapping(string => address) public usernameToAddress;
    mapping(address => string[]) public userBadges;
    
    address[] public registeredUsers;
    uint256 public totalUsers;
    uint256 public totalVerifiedUsers;

    // Events (level events removed)
    event UserRegistered(address indexed user, string username, uint256 timestamp);
    event UserUpdated(address indexed user, string username);
    event UserVerified(address indexed user, bool verified);
    event UsernameChanged(address indexed user, string oldUsername, string newUsername);
    event BadgeAwarded(address indexed user, string badgeName);

    // Errors (level errors removed)
    error UserAlreadyRegistered();
    error UserNotRegistered();
    error UsernameExists();
    error InvalidUsername();
    error NotVerified();

    constructor(address _selfProtocol, address _cvrsToken) {
        selfProtocol = SelfProtocolIntegration(_selfProtocol);
        cvrsToken = CryptoVerseToken(_cvrsToken);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MODERATOR_ROLE, msg.sender);
        _grantRole(PLATFORM_ROLE, msg.sender);
    }

    /**
     * @notice Register a new user (requires Self Protocol verification)
     * @param username Unique username
     * @param email User email
     * @param bio User biography
     */
    function registerUser(
        string calldata username,
        string calldata email,
        string calldata bio
    ) external whenNotPaused {
        if (userProfiles[msg.sender].userAddress != address(0)) {
            revert UserAlreadyRegistered();
        }
        if (bytes(username).length == 0 || bytes(username).length > 32) {
            revert InvalidUsername();
        }
        if (usernameToAddress[username] != address(0)) {
            revert UsernameExists();
        }

        // Check Self Protocol verification (simplified)
        if (!selfProtocol.isUserVerified(msg.sender)) {
            revert NotVerified();
        }

        // Create user profile (no levels - handled off-chain)
        userProfiles[msg.sender] = UserProfile({
            userAddress: msg.sender,
            username: username,
            email: email,
            bio: bio,
            avatarUrl: "",
            isVerified: true, // Already verified through Self Protocol
            registeredAt: block.timestamp,
            lastActive: block.timestamp,
            isActive: true,
            totalRewards: 0,
            streakCount: 0,
            reputation: 50
        });

        // Update mappings
        usernameToAddress[username] = msg.sender;
        registeredUsers.push(msg.sender);
        totalUsers++;
        totalVerifiedUsers++;

        emit UserRegistered(msg.sender, username, block.timestamp);
    }

    /**
     * @notice Update user profile
     * @param email New email
     * @param bio New bio
     * @param avatarUrl New avatar URL
     */
    function updateProfile(
        string calldata email,
        string calldata bio,
        string calldata avatarUrl
    ) external whenNotPaused {
        UserProfile storage profile = userProfiles[msg.sender];
        if (profile.userAddress == address(0)) revert UserNotRegistered();

        profile.email = email;
        profile.bio = bio;
        profile.avatarUrl = avatarUrl;
        profile.lastActive = block.timestamp;

        emit UserUpdated(msg.sender, profile.username);
    }

    /**
     * @notice Update user statistics
     * @param user User address
     * @param statType Type of statistic to update
     * @param amount Amount to add
     */
    function updateStats(
        address user,
        string calldata statType,
        uint256 amount
    ) external onlyRole(PLATFORM_ROLE) {
        UserStats storage stats = userStats[user];
        
        if (keccak256(bytes(statType)) == keccak256("blogsRead")) {
            stats.blogsRead += amount;
        } else if (keccak256(bytes(statType)) == keccak256("quizzesCompleted")) {
            stats.quizzesCompleted += amount;
        } else if (keccak256(bytes(statType)) == keccak256("eventsAttended")) {
            stats.eventsAttended += amount;
        } else if (keccak256(bytes(statType)) == keccak256("badgesEarned")) {
            stats.badgesEarned += amount;
        } else if (keccak256(bytes(statType)) == keccak256("nftsMinted")) {
            stats.nftsMinted += amount;
        }

        userProfiles[user].lastActive = block.timestamp;
    }

    /**
     * @notice Get user profile with current verification status
     * @param _user User address
     * @return profile User profile with updated verification status
     */
    function getUserProfile(address _user) external view returns (UserProfile memory profile) {
        profile = userProfiles[_user];
        // Update verification status from Self Protocol (simplified)
        profile.isVerified = selfProtocol.isUserVerified(_user);
    }

    /**
     * @notice Get user statistics
     * @param _user User address
     * @return stats User statistics
     */
    function getUserStats(address _user) external view returns (UserStats memory) {
        return userStats[_user];
    }

    /**
     * @notice Check if user is registered and verified
     * @param user User address
     * @return registered True if user is registered
     * @return verified True if user is verified
     */
    function getUserStatus(address user) external view returns (bool registered, bool verified) {
        registered = userProfiles[user].userAddress != address(0);
        verified = registered && selfProtocol.isUserVerified(user);
    }

    /**
     * @notice Get user badges
     * @param user User address
     * @return badges Array of badge names
     */
    function getUserBadges(address user) external view returns (string[] memory) {
        return userBadges[user];
    }

    /**
     * @notice Award badge to user
     * @param user User address
     * @param badgeName Badge name
     */
    function awardBadge(address user, string calldata badgeName) external onlyRole(PLATFORM_ROLE) {
        if (userProfiles[user].userAddress == address(0)) revert UserNotRegistered();
        
        userBadges[user].push(badgeName);
        userStats[user].badgesEarned++;
        
        emit BadgeAwarded(user, badgeName);
    }

    /**
     * @notice Update user's last active timestamp
     * @param user User address
     */
    function updateLastActive(address user) external onlyRole(PLATFORM_ROLE) {
        if (userProfiles[user].userAddress == address(0)) revert UserNotRegistered();
        userProfiles[user].lastActive = block.timestamp;
    }

    /**
     * @notice Get all registered users (paginated)
     * @param start Start index
     * @param limit Number of users to return
     * @return users Array of user addresses
     */
    function getRegisteredUsers(uint256 start, uint256 limit) 
        external view returns (address[] memory users) 
    {
        if (start >= registeredUsers.length) return users;
        
        uint256 end = start + limit;
        if (end > registeredUsers.length) {
            end = registeredUsers.length;
        }
        
        users = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            users[i - start] = registeredUsers[i];
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

    /**
     * @notice Update Self Protocol contract address
     * @param newSelfProtocol New Self Protocol contract address
     */
    function updateSelfProtocol(address newSelfProtocol) external onlyRole(ADMIN_ROLE) {
        require(newSelfProtocol != address(0), "Invalid address");
        selfProtocol = SelfProtocolIntegration(newSelfProtocol);
    }
}