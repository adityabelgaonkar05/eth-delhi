// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// Interface for the new Self Protocol Integration contract
interface ISelfProtocolIntegration {
    struct UserVerification {
        bool isVerified;
        uint256 attestationId;
        string attestationHash;
        uint256 verifiedAt;
        uint256 minimumAge;
        string nationality;
        string gender;
        string name;
        uint256 dateOfBirth;
        string passportNumber;
        uint256 expiryDate;
        bool ofacCleared;
    }

    function isUserVerified(address user) external view returns (bool);
    function getUserVerification(address user) external view returns (UserVerification memory);
    function userMeetsAgeRequirement(address user) external view returns (bool);
    function getUserNationality(address user) external view returns (string memory);
}

// Interface for CryptoVerse Token
interface ICryptoVerseToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title UserRegistry
 * @dev Manages user profiles with real Self Protocol verification integration
 * @notice Handles user registration with enhanced Self Protocol verification features
 * 
 * UPDATES FOR REAL SELF PROTOCOL:
 * - Integration with real Self Protocol contract interface
 * - Enhanced verification status tracking with attestation details
 * - Age verification support
 * - Nationality and gender disclosure handling
 * - OFAC compliance checking
 * - Document type tracking (passport/EU ID)
 * - Zero-knowledge proof attestation tracking
 */
contract UserRegistry is AccessControl, ReentrancyGuard, Pausable {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");

    // Contract references
    ISelfProtocolIntegration public selfProtocol;
    ICryptoVerseToken public cvrsToken;

    // Enhanced user profile structure with Self Protocol data
    struct UserProfile {
        address userAddress;
        string username;
        string email;
        string bio;
        string avatarUrl;
        bool isVerified;
        uint256 registeredAt;
        uint256 lastActive;
        bool isActive;
        uint256 totalRewards;
        uint256 streakCount;
        uint8 reputation;
        // Self Protocol specific fields
        uint256 verifiedAt;
        uint256 attestationId; // Document type used (1=passport, 2=EU ID)
        string attestationHash; // Zero-knowledge proof hash
        uint256 minimumAge; // Verified minimum age
        string nationality; // Disclosed nationality (if any)
        string gender; // Disclosed gender (if any)
        bool ofacCleared; // OFAC screening status
    }

    // Statistics structure
    struct UserStats {
        uint256 blogsRead;
        uint256 quizzesCompleted;
        uint256 eventsAttended;
        uint256 badgesEarned;
        uint256 nftsMinted;
        uint256 verificationScore; // Based on Self Protocol verification quality
    }

    // Verification tiers based on Self Protocol data
    enum VerificationTier {
        UNVERIFIED,    // Not verified
        BASIC,         // Age verified only
        STANDARD,      // Age + nationality/gender
        PREMIUM,       // Full verification + OFAC cleared
        ENTERPRISE     // Premium + additional compliance checks
    }

    // State variables
    mapping(address => UserProfile) public userProfiles;
    mapping(address => UserStats) public userStats;
    mapping(string => address) public usernameToAddress;
    mapping(address => string[]) public userBadges;
    mapping(address => VerificationTier) public userVerificationTier;
    mapping(uint256 => uint256) public attestationTypeCount; // Track document types used
    
    address[] public registeredUsers;
    uint256 public totalUsers;
    uint256 public totalVerifiedUsers;
    uint256 public totalOfacClearedUsers;

    // Configuration
    uint256 public minimumAgeRequirement = 18;
    mapping(string => bool) public restrictedCountries;

    // Events
    event UserRegistered(address indexed user, string username, uint256 timestamp);
    event UserUpdated(address indexed user, string username);
    event UserVerified(address indexed user, bool verified, uint256 attestationId, string attestationHash);
    event VerificationTierUpdated(address indexed user, VerificationTier oldTier, VerificationTier newTier);
    event UsernameChanged(address indexed user, string oldUsername, string newUsername);
    event BadgeAwarded(address indexed user, string badgeName);
    event SelfProtocolDataSynced(address indexed user, uint256 timestamp);

    // Errors
    error UserAlreadyRegistered();
    error UserNotRegistered();
    error UsernameExists();
    error InvalidUsername();
    error NotVerified();
    error AgeTooLow();
    error CountryRestricted();
    error OFACCheckRequired();
    error VerificationExpired();

    constructor(address _selfProtocol, address _cvrsToken) {
        selfProtocol = ISelfProtocolIntegration(_selfProtocol);
        cvrsToken = ICryptoVerseToken(_cvrsToken);
        
        address owner = 0x4C3F5A84041e562928394D63B3E339Be70dBCcC1;
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(ADMIN_ROLE, owner);
        _grantRole(MODERATOR_ROLE, owner);
        _grantRole(PLATFORM_ROLE, owner);
    }

    /**
     * @notice Register a new user with enhanced Self Protocol verification
     * @param username Unique username
     * @param email User email
     * @param bio User biography
     */
    function registerUser(
        string calldata username,
        string calldata email,
        string calldata bio
    ) external whenNotPaused nonReentrant {
        if (userProfiles[msg.sender].userAddress != address(0)) {
            revert UserAlreadyRegistered();
        }
        if (bytes(username).length == 0 || bytes(username).length > 32) {
            revert InvalidUsername();
        }
        if (usernameToAddress[username] != address(0)) {
            revert UsernameExists();
        }

        // Get detailed verification data from Self Protocol
        if (!selfProtocol.isUserVerified(msg.sender)) {
            revert NotVerified();
        }

        ISelfProtocolIntegration.UserVerification memory verification = 
            selfProtocol.getUserVerification(msg.sender);

        // Validate age requirement
        if (!selfProtocol.userMeetsAgeRequirement(msg.sender)) {
            revert AgeTooLow();
        }

        // Check country restrictions
        if (bytes(verification.nationality).length > 0 && 
            restrictedCountries[verification.nationality]) {
            revert CountryRestricted();
        }

        // Create enhanced user profile with Self Protocol data
        userProfiles[msg.sender] = UserProfile({
            userAddress: msg.sender,
            username: username,
            email: email,
            bio: bio,
            avatarUrl: "",
            isVerified: true,
            registeredAt: block.timestamp,
            lastActive: block.timestamp,
            isActive: true,
            totalRewards: 0,
            streakCount: 0,
            reputation: _calculateInitialReputation(verification),
            // Self Protocol data
            verifiedAt: verification.verifiedAt,
            attestationId: verification.attestationId,
            attestationHash: verification.attestationHash,
            minimumAge: verification.minimumAge,
            nationality: verification.nationality,
            gender: verification.gender,
            ofacCleared: verification.ofacCleared
        });

        // Initialize stats with verification score
        userStats[msg.sender] = UserStats({
            blogsRead: 0,
            quizzesCompleted: 0,
            eventsAttended: 0,
            badgesEarned: 0,
            nftsMinted: 0,
            verificationScore: _calculateVerificationScore(verification)
        });

        // Set verification tier
        userVerificationTier[msg.sender] = _determineVerificationTier(verification);

        // Update mappings and counters
        usernameToAddress[username] = msg.sender;
        registeredUsers.push(msg.sender);
        totalUsers++;
        totalVerifiedUsers++;
        attestationTypeCount[verification.attestationId]++;
        
        if (verification.ofacCleared) {
            totalOfacClearedUsers++;
        }

        emit UserRegistered(msg.sender, username, block.timestamp);
        emit UserVerified(msg.sender, true, verification.attestationId, verification.attestationHash);
        emit VerificationTierUpdated(msg.sender, VerificationTier.UNVERIFIED, userVerificationTier[msg.sender]);
    }

    /**
     * @notice Sync user's Self Protocol verification data
     * @dev Updates user profile with latest Self Protocol verification status
     */
    function syncSelfProtocolData(address user) external {
        if (userProfiles[user].userAddress == address(0)) revert UserNotRegistered();

        UserProfile storage profile = userProfiles[user];
        VerificationTier oldTier = userVerificationTier[user];

        // Get latest verification data
        bool isVerified = selfProtocol.isUserVerified(user);
        
        if (isVerified) {
            ISelfProtocolIntegration.UserVerification memory verification = 
                selfProtocol.getUserVerification(user);

            // Update verification data
            profile.isVerified = true;
            profile.verifiedAt = verification.verifiedAt;
            profile.attestationId = verification.attestationId;
            profile.attestationHash = verification.attestationHash;
            profile.minimumAge = verification.minimumAge;
            profile.nationality = verification.nationality;
            profile.gender = verification.gender;
            profile.ofacCleared = verification.ofacCleared;

            // Update verification score and tier
            userStats[user].verificationScore = _calculateVerificationScore(verification);
            VerificationTier newTier = _determineVerificationTier(verification);
            userVerificationTier[user] = newTier;

            if (newTier != oldTier) {
                emit VerificationTierUpdated(user, oldTier, newTier);
            }
        } else {
            // User lost verification
            profile.isVerified = false;
            userVerificationTier[user] = VerificationTier.UNVERIFIED;
            
            if (oldTier != VerificationTier.UNVERIFIED) {
                emit VerificationTierUpdated(user, oldTier, VerificationTier.UNVERIFIED);
            }
        }

        emit SelfProtocolDataSynced(user, block.timestamp);
    }

    /**
     * @notice Get enhanced user profile with Self Protocol verification details
     * @param _user User address
     * @return profile Complete user profile with verification data
     * @return tier Current verification tier
     * @return verificationValid Whether verification is still valid
     */
    function getEnhancedUserProfile(address _user) external view returns (
        UserProfile memory profile,
        VerificationTier tier,
        bool verificationValid
    ) {
        profile = userProfiles[_user];
        tier = userVerificationTier[_user];
        verificationValid = selfProtocol.isUserVerified(_user);
        
        // Update real-time verification status
        if (profile.userAddress != address(0)) {
            profile.isVerified = verificationValid;
        }
    }

    /**
     * @notice Get user's verification tier and requirements
     * @param user User address
     * @return tier Current verification tier
     * @return requirements Description of current tier requirements
     * @return nextTierRequirements What's needed for next tier
     */
    function getUserVerificationInfo(address user) external view returns (
        VerificationTier tier,
        string memory requirements,
        string memory nextTierRequirements
    ) {
        tier = userVerificationTier[user];
        
        if (tier == VerificationTier.UNVERIFIED) {
            requirements = "Not verified";
            nextTierRequirements = "Complete Self Protocol age verification";
        } else if (tier == VerificationTier.BASIC) {
            requirements = "Age verified";
            nextTierRequirements = "Provide nationality and gender disclosure";
        } else if (tier == VerificationTier.STANDARD) {
            requirements = "Age + basic disclosures";
            nextTierRequirements = "Complete OFAC screening";
        } else if (tier == VerificationTier.PREMIUM) {
            requirements = "Full verification + OFAC cleared";
            nextTierRequirements = "Already at premium tier";
        } else if (tier == VerificationTier.ENTERPRISE) {
            requirements = "Enterprise-grade verification";
            nextTierRequirements = "Maximum tier achieved";
        }
    }

    /**
     * @notice Check if user meets specific requirements
     * @param user User address
     * @param requireOFAC Whether OFAC clearance is required
     * @param minimumTier Minimum verification tier required
     * @return meets Whether user meets requirements
     * @return reason Reason if requirements not met
     */
    function checkUserRequirements(
        address user,
        bool requireOFAC,
        VerificationTier minimumTier
    ) external view returns (bool meets, string memory reason) {
        UserProfile memory profile = userProfiles[user];
        
        if (profile.userAddress == address(0)) {
            return (false, "User not registered");
        }
        
        if (!selfProtocol.isUserVerified(user)) {
            return (false, "User not verified with Self Protocol");
        }
        
        if (userVerificationTier[user] < minimumTier) {
            return (false, "Verification tier too low");
        }
        
        if (requireOFAC && !profile.ofacCleared) {
            return (false, "OFAC clearance required");
        }
        
        return (true, "Requirements met");
    }

    /**
     * @notice Calculate initial reputation based on verification quality
     */
    function _calculateInitialReputation(ISelfProtocolIntegration.UserVerification memory verification) 
        internal pure returns (uint8) {
        uint8 reputation = 50; // Base reputation
        
        if (verification.minimumAge >= 21) reputation += 10; // Higher age bonus
        if (bytes(verification.nationality).length > 0) reputation += 15; // Nationality disclosed
        if (bytes(verification.gender).length > 0) reputation += 10; // Gender disclosed
        if (verification.ofacCleared) reputation += 25; // OFAC cleared bonus
        if (verification.attestationId == 1) reputation += 5; // Passport verification bonus
        
        return reputation > 100 ? 100 : reputation;
    }

    /**
     * @notice Calculate verification score based on Self Protocol data quality
     */
    function _calculateVerificationScore(ISelfProtocolIntegration.UserVerification memory verification)
        internal view returns (uint256) {
        uint256 score = 100; // Base score
        
        // Age verification quality
        if (verification.minimumAge >= 18) score += 50;
        if (verification.minimumAge >= 21) score += 25;
        if (verification.minimumAge >= 25) score += 25;
        
        // Disclosure bonuses
        if (bytes(verification.nationality).length > 0) score += 100;
        if (bytes(verification.gender).length > 0) score += 50;
        if (bytes(verification.name).length > 0) score += 75;
        
        // Security bonuses
        if (verification.ofacCleared) score += 200;
        if (verification.attestationId == 1) score += 50; // Passport
        if (verification.attestationId == 2) score += 25; // EU ID
        
        // Freshness bonus (more recent verifications score higher)
        uint256 daysSinceVerification = (block.timestamp - verification.verifiedAt) / 86400;
        if (daysSinceVerification < 30) score += 100;
        else if (daysSinceVerification < 90) score += 50;
        else if (daysSinceVerification < 180) score += 25;
        
        return score;
    }

    /**
     * @notice Determine verification tier based on Self Protocol data
     */
    function _determineVerificationTier(ISelfProtocolIntegration.UserVerification memory verification)
        internal pure returns (VerificationTier) {
        if (!verification.isVerified) return VerificationTier.UNVERIFIED;
        
        bool hasDisclosures = bytes(verification.nationality).length > 0 || 
                            bytes(verification.gender).length > 0;
        
        if (verification.ofacCleared && hasDisclosures && verification.minimumAge >= 21) {
            return VerificationTier.ENTERPRISE;
        } else if (verification.ofacCleared && hasDisclosures) {
            return VerificationTier.PREMIUM;
        } else if (hasDisclosures) {
            return VerificationTier.STANDARD;
        } else {
            return VerificationTier.BASIC;
        }
    }

    /**
     * @notice Admin function to set country restrictions
     * @param country Country code to restrict
     * @param restricted Whether country is restricted
     */
    function setCountryRestriction(string calldata country, bool restricted) 
        external onlyRole(ADMIN_ROLE) {
        restrictedCountries[country] = restricted;
    }

    /**
     * @notice Admin function to update minimum age requirement
     * @param newMinimumAge New minimum age
     */
    function setMinimumAge(uint256 newMinimumAge) external onlyRole(ADMIN_ROLE) {
        minimumAgeRequirement = newMinimumAge;
    }

    /**
     * @notice Get verification statistics
     * @return totalUsersCount Total number of registered users
     * @return totalVerifiedCount Total number of verified users
     * @return totalOfacClearedCount Total number of OFAC cleared users
     * @return passportVerifications Total passport verifications
     * @return euIdVerifications Total EU ID verifications
     * @return tierCounts Count per verification tier
     */
    function getVerificationStats() external view returns (
        uint256 totalUsersCount,
        uint256 totalVerifiedCount,
        uint256 totalOfacClearedCount,
        uint256 passportVerifications,
        uint256 euIdVerifications,
        uint256[5] memory tierCounts // Count per verification tier
    ) {
        totalUsersCount = totalUsers;
        totalVerifiedCount = totalVerifiedUsers;
        totalOfacClearedCount = totalOfacClearedUsers;
        passportVerifications = attestationTypeCount[1];
        euIdVerifications = attestationTypeCount[2];
        
        // Count users per tier
        for (uint256 i = 0; i < registeredUsers.length; i++) {
            VerificationTier tier = userVerificationTier[registeredUsers[i]];
            tierCounts[uint256(tier)]++;
        }
    }

    // Existing functions remain the same but updated to work with new profile structure
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

    function updateStats(
        address user,
        string calldata statType,
        uint256 amount
    ) external onlyRole(PLATFORM_ROLE) {
        UserStats storage stats = userStats[user];
        
        bytes32 statHash = keccak256(bytes(statType));
        if (statHash == keccak256("blogsRead")) {
            stats.blogsRead += amount;
        } else if (statHash == keccak256("quizzesCompleted")) {
            stats.quizzesCompleted += amount;
        } else if (statHash == keccak256("eventsAttended")) {
            stats.eventsAttended += amount;
        } else if (statHash == keccak256("badgesEarned")) {
            stats.badgesEarned += amount;
        } else if (statHash == keccak256("nftsMinted")) {
            stats.nftsMinted += amount;
        }

        userProfiles[user].lastActive = block.timestamp;
    }

    function getUserProfile(address _user) external view returns (UserProfile memory profile) {
        profile = userProfiles[_user];
        // Update verification status from Self Protocol
        profile.isVerified = selfProtocol.isUserVerified(_user);
    }

    function getUserStats(address _user) external view returns (UserStats memory) {
        return userStats[_user];
    }

    function getUserStatus(address user) external view returns (bool registered, bool verified) {
        registered = userProfiles[user].userAddress != address(0);
        verified = registered && selfProtocol.isUserVerified(user);
    }

    function getUserBadges(address user) external view returns (string[] memory) {
        return userBadges[user];
    }

    function awardBadge(address user, string calldata badgeName) external onlyRole(PLATFORM_ROLE) {
        if (userProfiles[user].userAddress == address(0)) revert UserNotRegistered();
        
        userBadges[user].push(badgeName);
        userStats[user].badgesEarned++;
        
        emit BadgeAwarded(user, badgeName);
    }

    function updateLastActive(address user) external onlyRole(PLATFORM_ROLE) {
        if (userProfiles[user].userAddress == address(0)) revert UserNotRegistered();
        userProfiles[user].lastActive = block.timestamp;
    }

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

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function updateSelfProtocol(address newSelfProtocol) external onlyRole(ADMIN_ROLE) {
        require(newSelfProtocol != address(0), "Invalid address");
        selfProtocol = ISelfProtocolIntegration(newSelfProtocol);
    }
}