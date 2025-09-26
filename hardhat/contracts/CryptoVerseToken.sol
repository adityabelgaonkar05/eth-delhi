// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CryptoVerseToken
 * @dev ERC20 token for CryptoVerse platform with activity-based rewards
 * @notice CVRS token with minting controls and reward mechanisms (NO LEVEL REWARDS)
 * 
 * CHANGES MADE:
 * - Removed LEVEL_UP_REWARD constant (handled off-chain)
 * - All leveling logic moved to backend systems
 * - Focus on activity-based token rewards only
 */
contract CryptoVerseToken is ERC20, ERC20Burnable, ERC20Pausable, AccessControl, ReentrancyGuard {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");
    
    // Token configuration
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10**18; // 100 million tokens
    
    // Reward amounts (level-up reward removed - handled off-chain)
    uint256 public constant BLOG_READ_REWARD = 10 * 10**18; // 10 CVRS
    uint256 public constant QUIZ_COMPLETE_REWARD = 25 * 10**18; // 25 CVRS
    uint256 public constant EVENT_ATTEND_REWARD = 50 * 10**18; // 50 CVRS
    uint256 public constant DAILY_LOGIN_REWARD = 5 * 10**18; // 5 CVRS
    
    // State variables
    mapping(address => uint256) private lastClaimTime;
    mapping(address => bool) public authorizedMinters;
    
    uint256 public totalMinted;
    uint256 public totalBurned;
    
    // Events
    event RewardMinted(address indexed user, uint256 amount, string activity);
    event MinterAuthorized(address indexed minter);
    event MinterRevoked(address indexed minter);
    event TokensBurned(address indexed from, uint256 amount);
    event DailyRewardClaimed(address indexed user, uint256 amount);
    
    // Custom errors
    error ExceedsMaxSupply();
    error InsufficientBalance();
    error UnauthorizedMinter();
    error TooEarlyToClaim();
    error ZeroAmount();
    
    /**
     * @dev Constructor sets up the token with initial configuration
     */
    constructor() ERC20("CryptoVerse Token", "CVRS") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        
        // Mint initial supply to owner
        _mint(msg.sender, INITIAL_SUPPLY);
        totalMinted = INITIAL_SUPPLY;
    }
    
    /**
     * @notice Mint reward tokens to a user (minter role required)
     * @param _to The address to mint tokens to
     * @param _amount The amount of tokens to mint
     * @param _activity The activity that earned the reward
     */
    function mintReward(
        address _to, 
        uint256 _amount, 
        string calldata _activity
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (_amount == 0) revert ZeroAmount();
        if (_amount > MAX_SUPPLY - totalMinted) revert ExceedsMaxSupply();
        
        _mint(_to, _amount);
        totalMinted += _amount;
        
        emit RewardMinted(_to, _amount, _activity);
    }
    
    /**
     * @notice Batch mint rewards to multiple users (minter role required)
     * @param _recipients Array of addresses to mint tokens to
     * @param _amounts Array of amounts to mint
     * @param _activity The activity that earned the rewards
     */
    function batchMintRewards(
        address[] calldata _recipients,
        uint256[] calldata _amounts,
        string calldata _activity
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (_recipients.length != _amounts.length) revert("Arrays length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }
        
        if (totalAmount > MAX_SUPPLY - totalMinted) revert ExceedsMaxSupply();
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            if (_amounts[i] > 0) {
                _mint(_recipients[i], _amounts[i]);
                emit RewardMinted(_recipients[i], _amounts[i], _activity);
            }
        }
        
        totalMinted += totalAmount;
    }
    
    /**
     * @notice Claim daily login reward (once per 24 hours)
     */
    function claimDailyReward() external whenNotPaused nonReentrant {
        if (block.timestamp < lastClaimTime[msg.sender] + 24 hours) {
            revert TooEarlyToClaim();
        }
        
        if (DAILY_LOGIN_REWARD > MAX_SUPPLY - totalMinted) revert ExceedsMaxSupply();
        
        lastClaimTime[msg.sender] = block.timestamp;
        _mint(msg.sender, DAILY_LOGIN_REWARD);
        totalMinted += DAILY_LOGIN_REWARD;
        
        emit DailyRewardClaimed(msg.sender, DAILY_LOGIN_REWARD);
    }
    
    /**
     * @notice Burn tokens from user balance (platform role required)
     * @param _from The address to burn tokens from
     * @param _amount The amount of tokens to burn
     */
    function burnFrom(address _from, uint256 _amount) public override onlyRole(PLATFORM_ROLE) {
        if (balanceOf(_from) < _amount) revert InsufficientBalance();
        
        // Platform can burn without approval by directly calling _burn
        _burn(_from, _amount);
        totalBurned += _amount;
        
        emit TokensBurned(_from, _amount);
    }
    
    /**
     * @notice Burn own tokens
     * @param _amount The amount of tokens to burn
     */
    function burn(uint256 _amount) public override {
        super.burn(_amount);
        totalBurned += _amount;
        
        emit TokensBurned(msg.sender, _amount);
    }
    
    /**
     * @notice Transfer tokens between users (with platform integration)
     * @param _to The recipient address
     * @param _amount The amount to transfer
     */
    function transfer(address _to, uint256 _amount) public override whenNotPaused returns (bool) {
        return super.transfer(_to, _amount);
    }
    
    /**
     * @notice Transfer tokens from approved spender
     * @param _from The sender address
     * @param _to The recipient address
     * @param _amount The amount to transfer
     */
    function transferFrom(address _from, address _to, uint256 _amount) public override whenNotPaused returns (bool) {
        return super.transferFrom(_from, _to, _amount);
    }
    
    // View functions
    
    /**
     * @notice Get the time until next daily reward claim
     * @param _user The user address
     * @return Time in seconds until next claim (0 if can claim now)
     */
    function getTimeToNextClaim(address _user) external view returns (uint256) {
        uint256 nextClaimTime = lastClaimTime[_user] + 24 hours;
        return block.timestamp >= nextClaimTime ? 0 : nextClaimTime - block.timestamp;
    }
    
    /**
     * @notice Check if user can claim daily reward
     * @param _user The user address
     * @return True if user can claim daily reward
     */
    function canClaimDaily(address _user) external view returns (bool) {
        return block.timestamp >= lastClaimTime[_user] + 24 hours;
    }
    
    /**
     * @notice Get remaining supply that can be minted
     * @return Remaining mintable supply
     */
    function getRemainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalMinted;
    }
    
    /**
     * @notice Get token statistics
     * @return currentSupply The current total supply of tokens
     * @return minted The total number of tokens minted
     * @return burned The total number of tokens burned
     * @return remaining The remaining mintable supply
     */
    function getTokenStats() external view returns (
        uint256 currentSupply,
        uint256 minted,
        uint256 burned,
        uint256 remaining
    ) {
        return (
            totalSupply(),
            totalMinted,
            totalBurned,
            MAX_SUPPLY - totalMinted
        );
    }
    
    // Admin functions
    
    /**
     * @notice Authorize a new minter (admin only)
     * @param _minter The address to authorize as minter
     */
    function authorizeMinter(address _minter) external onlyRole(ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, _minter);
        authorizedMinters[_minter] = true;
        
        emit MinterAuthorized(_minter);
    }
    
    /**
     * @notice Revoke minter authorization (admin only)
     * @param _minter The address to revoke minter role from
     */
    function revokeMinter(address _minter) external onlyRole(ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, _minter);
        authorizedMinters[_minter] = false;
        
        emit MinterRevoked(_minter);
    }
    
    /**
     * @notice Grant platform role to contract (admin only)
     * @param _contract The contract address to grant role to
     */
    function grantPlatformRole(address _contract) external onlyRole(ADMIN_ROLE) {
        _grantRole(PLATFORM_ROLE, _contract);
    }
    
    /**
     * @notice Revoke platform role from contract (admin only)
     * @param _contract The contract address to revoke role from
     */
    function revokePlatformRole(address _contract) external onlyRole(ADMIN_ROLE) {
        _revokeRole(PLATFORM_ROLE, _contract);
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
     * @notice Emergency mint function (admin only, use sparingly)
     * @param _to The address to mint tokens to
     * @param _amount The amount of tokens to mint
     * @param _reason The reason for emergency mint
     */
    function emergencyMint(
        address _to, 
        uint256 _amount, 
        string calldata _reason
    ) external onlyRole(ADMIN_ROLE) {
        if (_amount > MAX_SUPPLY - totalMinted) revert ExceedsMaxSupply();
        
        _mint(_to, _amount);
        totalMinted += _amount;
        
        emit RewardMinted(_to, _amount, _reason);
    }
    
    // Required overrides
    
    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
