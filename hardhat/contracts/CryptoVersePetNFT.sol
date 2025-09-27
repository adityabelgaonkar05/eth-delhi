// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./CryptoVerseToken.sol";

/**
 * @title CryptoVersePetNFT
 * @dev NFT contract for CryptoVerse pet collection with tier-based pricing
 * @notice 7 unique pet NFTs with different rarity tiers, purchasable with CVRS tokens
 */
contract CryptoVersePetNFT is ERC721, ERC721URIStorage, ERC721Enumerable, AccessControl, ReentrancyGuard, Pausable {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // Pet rarity tiers
    enum PetTier {
        COMMON,     // pet1, pet2 - 100 CVRS each
        RARE,       // pet3, pet4 - 250 CVRS each  
        EPIC,       // pet5, pet6 - 500 CVRS each
        LEGENDARY   // pet7 - 1000 CVRS
    }
    
    // Pet NFT structure
    struct Pet {
        uint256 petId;
        string name;
        string description;
        PetTier tier;
        string imageURI;
        uint256 price;
        bool isForSale;
        uint256 createdAt;
    }
    
    // Purchase history
    struct Purchase {
        uint256 tokenId;
        address buyer;
        uint256 price;
        uint256 timestamp;
        PetTier tier;
    }
    
    // State variables
    CryptoVerseToken public cvrsToken;
    
    mapping(uint256 => Pet) public pets;
    mapping(PetTier => uint256) public tierPrices;
    mapping(PetTier => uint256[]) public tierTokens;
    mapping(address => Purchase[]) public userPurchases;
    mapping(uint256 => bool) public petExists;
    
    uint256 private _nextTokenId = 1;
    uint256 public totalPets = 7;
    uint256 public totalSales;
    uint256 public totalRevenue;
    
    // Treasury for collected CVRS tokens
    address public treasury;
    
    // Events
    event PetCreated(uint256 indexed tokenId, string name, PetTier tier, uint256 price);
    event PetPurchased(uint256 indexed tokenId, address indexed buyer, uint256 price, PetTier tier);
    event PetPriceUpdated(uint256 indexed tokenId, uint256 newPrice);
    event TierPriceUpdated(PetTier tier, uint256 newPrice);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    
    // Custom errors
    error PetNotForSale();
    error InsufficientCVRSBalance();
    error InsufficientCVRSAllowance();
    error PetDoesNotExist();
    error UnauthorizedAccess();
    error InvalidPrice();
    error TransferFailed();
    
    constructor(
        address _cvrsToken,
        address _treasury
    ) ERC721("CryptoVerse Pet Collection", "CVPET") {
        cvrsToken = CryptoVerseToken(_cvrsToken);
        treasury = _treasury;
        
        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        
        // Initialize tier prices (in CVRS tokens with 18 decimals)
        tierPrices[PetTier.COMMON] = 100 * 10**18;      // 100 CVRS
        tierPrices[PetTier.RARE] = 250 * 10**18;        // 250 CVRS  
        tierPrices[PetTier.EPIC] = 500 * 10**18;        // 500 CVRS
        tierPrices[PetTier.LEGENDARY] = 1000 * 10**18;  // 1000 CVRS
        
        // Create the 7 pets
        _createInitialPets();
    }
    
    /**
     * @dev Creates the initial 7 pet NFTs with their tiers and metadata
     */
    function _createInitialPets() private {
        // COMMON tier pets (pet1, pet2)
        _createPet("Pixel Pup", "A friendly digital companion", PetTier.COMMON, "https://your-domain.com/metadata/pet1.json");
        _createPet("Cyber Cat", "A sleek virtual feline", PetTier.COMMON, "https://your-domain.com/metadata/pet2.json");
        
        // RARE tier pets (pet3, pet4)
        _createPet("Mystic Mare", "A magical horse from the digital realm", PetTier.RARE, "https://your-domain.com/metadata/pet3.json");
        _createPet("Thunder Wolf", "A fierce lupine guardian", PetTier.RARE, "https://your-domain.com/metadata/pet4.json");
        
        // EPIC tier pets (pet5, pet6)
        _createPet("Crystal Dragon", "A majestic crystalline beast", PetTier.EPIC, "https://your-domain.com/metadata/pet5.json");
        _createPet("Phoenix Rising", "A reborn bird of eternal flame", PetTier.EPIC, "https://your-domain.com/metadata/pet6.json");
        
        // LEGENDARY tier pet (pet7)
        _createPet("Cosmic Guardian", "The ultimate protector of the CryptoVerse", PetTier.LEGENDARY, "https://your-domain.com/metadata/pet7.json");
    }
    
    /**
     * @dev Creates a new pet NFT
     */
    function _createPet(string memory name, string memory description, PetTier tier, string memory uri) private {
        uint256 tokenId = _nextTokenId++;
        uint256 price = tierPrices[tier];
        
        pets[tokenId] = Pet({
            petId: tokenId,
            name: name,
            description: description,
            tier: tier,
            imageURI: uri,
            price: price,
            isForSale: true,
            createdAt: block.timestamp
        });
        
        petExists[tokenId] = true;
        tierTokens[tier].push(tokenId);
        
        _mint(address(this), tokenId); // Mint to contract initially
        _setTokenURI(tokenId, uri);
        
        emit PetCreated(tokenId, name, tier, price);
    }
    
    /**
     * @dev Purchase a pet NFT with CVRS tokens
     */
    function purchasePet(uint256 tokenId) external nonReentrant whenNotPaused {
        if (!petExists[tokenId]) revert PetDoesNotExist();
        
        Pet memory pet = pets[tokenId];
        if (!pet.isForSale) revert PetNotForSale();
        
        // Check if pet is still owned by the contract (available for purchase)
        if (ownerOf(tokenId) != address(this)) revert PetNotForSale();
        
        uint256 price = pet.price;
        
        // Check CVRS token balance and allowance
        if (cvrsToken.balanceOf(msg.sender) < price) revert InsufficientCVRSBalance();
        if (cvrsToken.allowance(msg.sender, address(this)) < price) revert InsufficientCVRSAllowance();
        
        // Transfer CVRS tokens from buyer to treasury
        bool success = cvrsToken.transferFrom(msg.sender, treasury, price);
        if (!success) revert TransferFailed();
        
        // Transfer NFT to buyer
        _transfer(address(this), msg.sender, tokenId);
        
        // Update sale status
        pets[tokenId].isForSale = false;
        
        // Record purchase
        userPurchases[msg.sender].push(Purchase({
            tokenId: tokenId,
            buyer: msg.sender,
            price: price,
            timestamp: block.timestamp,
            tier: pet.tier
        }));
        
        totalSales++;
        totalRevenue += price;
        
        emit PetPurchased(tokenId, msg.sender, price, pet.tier);
    }
    
    /**
     * @dev Get all pets by tier
     */
    function getPetsByTier(PetTier tier) external view returns (uint256[] memory) {
        return tierTokens[tier];
    }
    
    /**
     * @dev Get pet details
     */
    function getPetDetails(uint256 tokenId) external view returns (Pet memory) {
        if (!petExists[tokenId]) revert PetDoesNotExist();
        return pets[tokenId];
    }
    
    /**
     * @dev Get all available pets for sale
     */
    function getAvailablePets() external view returns (uint256[] memory availableTokens, Pet[] memory availablePets) {
        uint256 count = 0;
        
        // Count available pets
        for (uint256 i = 1; i <= totalPets; i++) {
            if (petExists[i] && pets[i].isForSale && ownerOf(i) == address(this)) {
                count++;
            }
        }
        
        // Create arrays
        availableTokens = new uint256[](count);
        availablePets = new Pet[](count);
        
        uint256 index = 0;
        for (uint256 i = 1; i <= totalPets; i++) {
            if (petExists[i] && pets[i].isForSale && ownerOf(i) == address(this)) {
                availableTokens[index] = i;
                availablePets[index] = pets[i];
                index++;
            }
        }
    }
    
    /**
     * @dev Get user's purchase history
     */
    function getUserPurchases(address user) external view returns (Purchase[] memory) {
        return userPurchases[user];
    }
    
    /**
     * @dev Get pets owned by user
     */
    function getUserPets(address user) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(user);
        uint256[] memory tokens = new uint256[](balance);
        
        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(user, i);
        }
        
        return tokens;
    }
    
    // Admin functions
    
    /**
     * @dev Update tier pricing (Admin only)
     */
    function updateTierPrice(PetTier tier, uint256 newPrice) external onlyRole(ADMIN_ROLE) {
        if (newPrice == 0) revert InvalidPrice();
        
        tierPrices[tier] = newPrice;
        
        // Update existing pets of this tier
        uint256[] memory tokens = tierTokens[tier];
        for (uint256 i = 0; i < tokens.length; i++) {
            pets[tokens[i]].price = newPrice;
            emit PetPriceUpdated(tokens[i], newPrice);
        }
        
        emit TierPriceUpdated(tier, newPrice);
    }
    
    /**
     * @dev Update treasury address (Admin only)
     */
    function updateTreasury(address newTreasury) external onlyRole(ADMIN_ROLE) {
        if (newTreasury == address(0)) revert UnauthorizedAccess();
        
        address oldTreasury = treasury;
        treasury = newTreasury;
        
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
    
    /**
     * @dev Emergency withdraw (Admin only)
     */
    function emergencyWithdraw(uint256 tokenId) external onlyRole(ADMIN_ROLE) {
        if (ownerOf(tokenId) == address(this)) {
            _transfer(address(this), msg.sender, tokenId);
            pets[tokenId].isForSale = false;
        }
    }
    
    /**
     * @dev Pause contract (Admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause contract (Admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // View functions for marketplace
    
    /**
     * @dev Get marketplace stats
     */
    function getMarketplaceStats() external view returns (
        uint256 totalPetsCreated,
        uint256 totalSalesCount,
        uint256 totalRevenueAmount,
        uint256 availableCount
    ) {
        totalPetsCreated = totalPets;
        totalSalesCount = totalSales;
        totalRevenueAmount = totalRevenue;
        
        // Count available pets
        uint256 available = 0;
        for (uint256 i = 1; i <= totalPets; i++) {
            if (petExists[i] && pets[i].isForSale && ownerOf(i) == address(this)) {
                available++;
            }
        }
        availableCount = available;
    }
    
    // Required overrides
    
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}