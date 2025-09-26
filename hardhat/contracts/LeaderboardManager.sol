// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./UserRegistry.sol";
import "./CryptoVerseToken.sol";

/**
 * @title LeaderboardManager
 * @dev Manages competitive leaderboards for the CryptoVerse platform
 * @notice Tracks user rankings across various activities (NO LEVEL-BASED RANKINGS)
 * 
 * CHANGES MADE:
 * - Removed level-based leaderboard functionality
 * - Focus on token balance and activity-based rankings only
 * - All XP/level tracking moved off-chain
 */
contract LeaderboardManager is AccessControl, ReentrancyGuard, Pausable {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");
    
    // Leaderboard entry structure
    struct LeaderboardEntry {
        address user;
        uint256 score;
        uint256 lastUpdated;
        uint256 rank;
    }
    
    // Leaderboard configuration
    struct LeaderboardConfig {
        string name;
        string description;
        bool isActive;
        uint256 maxEntries;
        uint256 updateFrequency; // seconds between updates
        uint256 lastGlobalUpdate;
        bool requiresVerification;
    }
    
    // Season structure for competitive periods
    struct Season {
        uint256 seasonId;
        string name;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        mapping(string => uint256[]) seasonRankings; // leaderboard => user ranks
        mapping(string => mapping(address => uint256)) seasonScores;
    }
    
    // State variables
    UserRegistry public userRegistry;
    CryptoVerseToken public cvrsToken;
    
    // Leaderboard mappings
    mapping(string => LeaderboardConfig) public leaderboards;
    mapping(string => mapping(uint256 => LeaderboardEntry)) public leaderboardEntries;
    mapping(string => mapping(address => uint256)) public userPositions;
    mapping(string => uint256) public leaderboardSizes;
    mapping(string => address[]) public leaderboardUsers;
    
    // Season mappings
    mapping(uint256 => Season) public seasons;
    uint256 public currentSeasonId;
    uint256 public nextSeasonId = 1;
    
    // Supported leaderboard types
    string[] public activeLeaderboards;
    mapping(string => bool) public validLeaderboards;
    
    // Configuration
    uint256 public constant MAX_LEADERBOARD_SIZE = 1000;
    uint256 public constant MIN_UPDATE_FREQUENCY = 300; // 5 minutes
    
    // Events
    event LeaderboardCreated(string indexed leaderboardType, string name, uint256 maxEntries);
    event LeaderboardUpdated(string indexed leaderboardType, address indexed user, uint256 newRank, uint256 score);
    event SeasonStarted(uint256 indexed seasonId, string name, uint256 startTime, uint256 endTime);
    event SeasonEnded(uint256 indexed seasonId, address[] topUsers);
    event GlobalRankingUpdate(string indexed leaderboardType, uint256 timestamp);
    event UserScoreUpdated(string indexed leaderboardType, address indexed user, uint256 oldScore, uint256 newScore);
    
    // Custom errors
    error LeaderboardNotFound();
    error LeaderboardNotActive();
    error InvalidLeaderboardConfig();
    error UserNotRegistered();
    error UpdateTooFrequent();
    error InvalidSeasonConfig();
    error SeasonNotActive();
    error MaxEntriesReached();
    error UnauthorizedAccess();
    
    /**
     * @dev Constructor sets up the contract
     * @param _userRegistry Address of the UserRegistry contract
     * @param _cvrsToken Address of the CVRS token contract
     */
    constructor(address _userRegistry, address _cvrsToken) {
        userRegistry = UserRegistry(_userRegistry);
        cvrsToken = CryptoVerseToken(_cvrsToken);
        
        address owner = 0x4C3F5a84041E562928394d63b3E339bE70DBcC17;
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(ADMIN_ROLE, owner);
        
        // Initialize default leaderboards (level-based leaderboard removed)
        _createLeaderboard("richest", "Richest Players", "Ranked by CVRS token balance", 100, 3600, true);
        _createLeaderboard("most_active", "Most Active", "Ranked by platform activity", 100, 3600, true);
        _createLeaderboard("most_events", "Event Attendance", "Ranked by number of events attended", 50, 7200, true);
        _createLeaderboard("quiz_master", "Quiz Master", "Ranked by number of quizzes completed", 50, 7200, true);
        _createLeaderboard("badge_collector", "Badge Collector", "Ranked by number of badges owned", 50, 7200, true);
    }
    
    /**
     * @notice Create a new leaderboard (admin only)
     * @param _type Leaderboard type identifier
     * @param _name Display name
     * @param _description Description
     * @param _maxEntries Maximum number of entries
     * @param _updateFrequency Update frequency in seconds
     * @param _requiresVerification Whether only verified users are included
     */
    function createLeaderboard(
        string calldata _type,
        string calldata _name,
        string calldata _description,
        uint256 _maxEntries,
        uint256 _updateFrequency,
        bool _requiresVerification
    ) external onlyRole(ADMIN_ROLE) {
        _createLeaderboard(_type, _name, _description, _maxEntries, _updateFrequency, _requiresVerification);
    }
    
    /**
     * @notice Update user's score in a leaderboard (platform role)
     * @param _leaderboardType The leaderboard type
     * @param _user The user address
     * @param _score The new score
     */
    function updateUserScore(
        string calldata _leaderboardType,
        address _user,
        uint256 _score
    ) external onlyRole(PLATFORM_ROLE) whenNotPaused {
        if (!validLeaderboards[_leaderboardType]) revert LeaderboardNotFound();
        // Basic user verification (simplified)
        UserRegistry.UserProfile memory profile = userRegistry.getUserProfile(_user);
        if (profile.userAddress == address(0)) revert UserNotRegistered();
        if (!profile.isActive) revert UserNotRegistered();
        
        LeaderboardConfig storage config = leaderboards[_leaderboardType];
        if (!config.isActive) revert LeaderboardNotActive();
        
        uint256 currentPosition = userPositions[_leaderboardType][_user];
        uint256 oldScore = 0;
        
        if (currentPosition > 0) {
            // User exists in leaderboard
            oldScore = leaderboardEntries[_leaderboardType][currentPosition].score;
            leaderboardEntries[_leaderboardType][currentPosition].score = _score;
            leaderboardEntries[_leaderboardType][currentPosition].lastUpdated = block.timestamp;
        } else {
            // New user entry
            if (leaderboardSizes[_leaderboardType] >= config.maxEntries) {
                revert MaxEntriesReached();
            }
            
            uint256 newPosition = leaderboardSizes[_leaderboardType] + 1;
            
            leaderboardEntries[_leaderboardType][newPosition] = LeaderboardEntry({
                user: _user,
                score: _score,
                lastUpdated: block.timestamp,
                rank: newPosition
            });
            
            userPositions[_leaderboardType][_user] = newPosition;
            leaderboardUsers[_leaderboardType].push(_user);
            leaderboardSizes[_leaderboardType]++;
        }
        
        // Update season scores if season is active
        if (currentSeasonId > 0 && seasons[currentSeasonId].isActive) {
            seasons[currentSeasonId].seasonScores[_leaderboardType][_user] = _score;
        }
        
        emit UserScoreUpdated(_leaderboardType, _user, oldScore, _score);
    }
    
    /**
     * @notice Trigger global ranking update for a leaderboard (admin or automated)
     * @param _leaderboardType The leaderboard type
     */
    function updateGlobalRanking(string calldata _leaderboardType) external {
        if (!validLeaderboards[_leaderboardType]) revert LeaderboardNotFound();
        
        LeaderboardConfig storage config = leaderboards[_leaderboardType];
        if (!config.isActive) revert LeaderboardNotActive();
        
        // Check update frequency for non-admin calls
        if (!hasRole(ADMIN_ROLE, msg.sender)) {
            if (block.timestamp < config.lastGlobalUpdate + config.updateFrequency) {
                revert UpdateTooFrequent();
            }
        }
        
        _performRankingUpdate(_leaderboardType);
    }
    
    /**
     * @notice Start a new competitive season (admin only)
     * @param _name Season name
     * @param _duration Duration in seconds
     */
    function startSeason(string calldata _name, uint256 _duration) external onlyRole(ADMIN_ROLE) {
        if (_duration < 7 days) revert InvalidSeasonConfig(); // Minimum 1 week
        
        // End current season if active
        if (currentSeasonId > 0 && seasons[currentSeasonId].isActive) {
            _endSeason(currentSeasonId);
        }
        
        uint256 seasonId = nextSeasonId++;
        Season storage newSeason = seasons[seasonId];
        newSeason.seasonId = seasonId;
        newSeason.name = _name;
        newSeason.startTime = block.timestamp;
        newSeason.endTime = block.timestamp + _duration;
        newSeason.isActive = true;
        
        currentSeasonId = seasonId;
        
        emit SeasonStarted(seasonId, _name, newSeason.startTime, newSeason.endTime);
    }
    
    /**
     * @notice End the current season (admin only)
     * @param _seasonId The season ID to end
     */
    function endSeason(uint256 _seasonId) external onlyRole(ADMIN_ROLE) {
        _endSeason(_seasonId);
    }
    
    /**
     * @notice Batch update multiple users' scores (platform role)
     * @param _leaderboardType The leaderboard type
     * @param _users Array of user addresses
     * @param _scores Array of scores
     */
    function batchUpdateScores(
        string calldata _leaderboardType,
        address[] calldata _users,
        uint256[] calldata _scores
    ) external onlyRole(PLATFORM_ROLE) whenNotPaused {
        if (_users.length != _scores.length) revert("Arrays length mismatch");
        if (!validLeaderboards[_leaderboardType]) revert LeaderboardNotFound();
        
        for (uint256 i = 0; i < _users.length; i++) {
            UserRegistry.UserProfile memory profile = userRegistry.getUserProfile(_users[i]);
            if (profile.userAddress != address(0) && profile.isActive) {
                // Update individual score (simplified for batch operation)
                uint256 currentPosition = userPositions[_leaderboardType][_users[i]];
                if (currentPosition > 0) {
                    leaderboardEntries[_leaderboardType][currentPosition].score = _scores[i];
                    leaderboardEntries[_leaderboardType][currentPosition].lastUpdated = block.timestamp;
                }
            }
        }
    }
    
    // View functions
    
    /**
     * @notice Get leaderboard top entries
     * @param _leaderboardType The leaderboard type
     * @param _limit Number of entries to return
     * @return Array of LeaderboardEntry structs
     */
    function getTopEntries(
        string calldata _leaderboardType,
        uint256 _limit
    ) external view returns (LeaderboardEntry[] memory) {
        if (!validLeaderboards[_leaderboardType]) revert LeaderboardNotFound();
        
        uint256 size = leaderboardSizes[_leaderboardType];
        uint256 returnSize = _limit > size ? size : _limit;
        
        LeaderboardEntry[] memory topEntries = new LeaderboardEntry[](returnSize);
        
        for (uint256 i = 0; i < returnSize; i++) {
            topEntries[i] = leaderboardEntries[_leaderboardType][i + 1];
        }
        
        return topEntries;
    }
    
    /**
     * @notice Get user's ranking in a leaderboard
     * @param _leaderboardType The leaderboard type
     * @param _user The user address
     * @return position The user's position in the leaderboard
     * @return score The user's score in the leaderboard
     * @return rank The user's rank in the leaderboard
     */
    function getUserRanking(
        string calldata _leaderboardType,
        address _user
    ) external view returns (uint256 position, uint256 score, uint256 rank) {
        uint256 userPosition = userPositions[_leaderboardType][_user];
        
        if (userPosition > 0) {
            LeaderboardEntry memory entry = leaderboardEntries[_leaderboardType][userPosition];
            return (userPosition, entry.score, entry.rank);
        }
        
        return (0, 0, 0);
    }
    
    /**
     * @notice Get all active leaderboards
     * @return Array of leaderboard type names
     */
    function getActiveLeaderboards() external view returns (string[] memory) {
        return activeLeaderboards;
    }
    
    /**
     * @notice Get leaderboard configuration
     * @param _leaderboardType The leaderboard type
     * @return LeaderboardConfig struct
     */
    function getLeaderboardConfig(string calldata _leaderboardType) external view returns (LeaderboardConfig memory) {
        if (!validLeaderboards[_leaderboardType]) revert LeaderboardNotFound();
        return leaderboards[_leaderboardType];
    }
    
    /**
     * @notice Get current season information
     * @return seasonId The current season ID
     * @return name The name of the current season
     * @return startTime The start time of the current season
     * @return endTime The end time of the current season
     * @return isActive Whether the current season is active
     */
    function getCurrentSeason() external view returns (
        uint256 seasonId,
        string memory name,
        uint256 startTime,
        uint256 endTime,
        bool isActive
    ) {
        if (currentSeasonId > 0) {
            Season storage season = seasons[currentSeasonId];
            return (
                season.seasonId,
                season.name,
                season.startTime,
                season.endTime,
                season.isActive
            );
        }
        return (0, "", 0, 0, false);
    }
    
    /**
     * @notice Get user's season score
     * @param _seasonId The season ID
     * @param _leaderboardType The leaderboard type
     * @param _user The user address
     * @return User's score in that season
     */
    function getUserSeasonScore(
        uint256 _seasonId,
        string calldata _leaderboardType,
        address _user
    ) external view returns (uint256) {
        return seasons[_seasonId].seasonScores[_leaderboardType][_user];
    }
    
    /**
     * @notice Get leaderboard statistics
     * @param _leaderboardType The leaderboard type
     * @return size The current number of entries in the leaderboard
     * @return maxEntries The maximum allowed entries in the leaderboard
     * @return lastUpdate The timestamp of the last global update
     * @return averageScore The average score of all entries in the leaderboard
     */
    function getLeaderboardStats(string calldata _leaderboardType) external view returns (
        uint256 size,
        uint256 maxEntries,
        uint256 lastUpdate,
        uint256 averageScore
    ) {
        if (!validLeaderboards[_leaderboardType]) revert LeaderboardNotFound();
        
        LeaderboardConfig memory config = leaderboards[_leaderboardType];
        uint256 leaderboardSize = leaderboardSizes[_leaderboardType];
        
        // Calculate average score
        uint256 totalScore = 0;
        for (uint256 i = 1; i <= leaderboardSize; i++) {
            totalScore += leaderboardEntries[_leaderboardType][i].score;
        }
        
        uint256 avg = leaderboardSize > 0 ? totalScore / leaderboardSize : 0;
        
        return (leaderboardSize, config.maxEntries, config.lastGlobalUpdate, avg);
    }
    
    // Internal functions
    
    /**
     * @dev Internal function to create a leaderboard
     */
    function _createLeaderboard(
        string memory _type,
        string memory _name,
        string memory _description,
        uint256 _maxEntries,
        uint256 _updateFrequency,
        bool _requiresVerification
    ) internal {
        if (validLeaderboards[_type]) return; // Already exists
        if (_maxEntries > MAX_LEADERBOARD_SIZE) revert InvalidLeaderboardConfig();
        if (_updateFrequency < MIN_UPDATE_FREQUENCY) revert InvalidLeaderboardConfig();
        
        leaderboards[_type] = LeaderboardConfig({
            name: _name,
            description: _description,
            isActive: true,
            maxEntries: _maxEntries,
            updateFrequency: _updateFrequency,
            lastGlobalUpdate: block.timestamp,
            requiresVerification: _requiresVerification
        });
        
        validLeaderboards[_type] = true;
        activeLeaderboards.push(_type);
        
        emit LeaderboardCreated(_type, _name, _maxEntries);
    }
    
    /**
     * @dev Internal function to perform ranking update
     */
    function _performRankingUpdate(string memory _leaderboardType) internal {
        uint256 size = leaderboardSizes[_leaderboardType];
        
        // Simple bubble sort for ranking (gas-efficient for small lists)
        // In production, consider off-chain ranking for large datasets
        for (uint256 i = 1; i <= size; i++) {
            for (uint256 j = i + 1; j <= size; j++) {
                if (leaderboardEntries[_leaderboardType][i].score < 
                    leaderboardEntries[_leaderboardType][j].score) {
                    // Swap entries
                    LeaderboardEntry memory temp = leaderboardEntries[_leaderboardType][i];
                    leaderboardEntries[_leaderboardType][i] = leaderboardEntries[_leaderboardType][j];
                    leaderboardEntries[_leaderboardType][j] = temp;
                    
                    // Update user positions
                    userPositions[_leaderboardType][leaderboardEntries[_leaderboardType][i].user] = i;
                    userPositions[_leaderboardType][leaderboardEntries[_leaderboardType][j].user] = j;
                }
            }
        }
        
        // Update ranks
        for (uint256 i = 1; i <= size; i++) {
            leaderboardEntries[_leaderboardType][i].rank = i;
        }
        
        leaderboards[_leaderboardType].lastGlobalUpdate = block.timestamp;
        
        emit GlobalRankingUpdate(_leaderboardType, block.timestamp);
    }
    
    /**
     * @dev Internal function to end a season
     */
    function _endSeason(uint256 _seasonId) internal {
        Season storage season = seasons[_seasonId];
        if (!season.isActive) revert SeasonNotActive();
        
        season.isActive = false;
        
        // Get top users for rewards (simplified - get from richest leaderboard)
        address[] memory topUsers = new address[](3);
        for (uint256 i = 1; i <= 3 && i <= leaderboardSizes["richest"]; i++) {
            topUsers[i-1] = leaderboardEntries["richest"][i].user;
        }
        
        emit SeasonEnded(_seasonId, topUsers);
    }
    
    // Admin functions
    
    /**
     * @notice Deactivate a leaderboard (admin only)
     * @param _leaderboardType The leaderboard type
     */
    function deactivateLeaderboard(string calldata _leaderboardType) external onlyRole(ADMIN_ROLE) {
        if (!validLeaderboards[_leaderboardType]) revert LeaderboardNotFound();
        
        leaderboards[_leaderboardType].isActive = false;
    }
    
    /**
     * @notice Reactivate a leaderboard (admin only)
     * @param _leaderboardType The leaderboard type
     */
    function reactivateLeaderboard(string calldata _leaderboardType) external onlyRole(ADMIN_ROLE) {
        if (!validLeaderboards[_leaderboardType]) revert LeaderboardNotFound();
        
        leaderboards[_leaderboardType].isActive = true;
    }
    
    /**
     * @notice Update leaderboard configuration (admin only)
     * @param _leaderboardType The leaderboard type
     * @param _maxEntries New max entries
     * @param _updateFrequency New update frequency
     */
    function updateLeaderboardConfig(
        string calldata _leaderboardType,
        uint256 _maxEntries,
        uint256 _updateFrequency
    ) external onlyRole(ADMIN_ROLE) {
        if (!validLeaderboards[_leaderboardType]) revert LeaderboardNotFound();
        if (_maxEntries > MAX_LEADERBOARD_SIZE) revert InvalidLeaderboardConfig();
        if (_updateFrequency < MIN_UPDATE_FREQUENCY) revert InvalidLeaderboardConfig();
        
        leaderboards[_leaderboardType].maxEntries = _maxEntries;
        leaderboards[_leaderboardType].updateFrequency = _updateFrequency;
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
    
    /**
     * @notice Emergency reset leaderboard (admin only)
     * @param _leaderboardType The leaderboard type to reset
     */
    function emergencyResetLeaderboard(string calldata _leaderboardType) external onlyRole(ADMIN_ROLE) {
        if (!validLeaderboards[_leaderboardType]) revert LeaderboardNotFound();
        
        // Clear all entries
        address[] memory users = leaderboardUsers[_leaderboardType];
        for (uint256 i = 0; i < users.length; i++) {
            delete userPositions[_leaderboardType][users[i]];
        }
        
        delete leaderboardUsers[_leaderboardType];
        leaderboardSizes[_leaderboardType] = 0;
        leaderboards[_leaderboardType].lastGlobalUpdate = block.timestamp;
    }
}
