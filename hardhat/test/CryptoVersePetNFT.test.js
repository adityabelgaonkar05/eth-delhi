const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CryptoVersePetNFT", function () {
  let CryptoVerseToken;
  let cvrsToken;
  let CryptoVersePetNFT;
  let petNFT;
  let owner;
  let user1;
  let user2;
  let treasury;

  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens for testing

  beforeEach(async function () {
    [owner, user1, user2, treasury] = await ethers.getSigners();

    // Deploy CVRS Token first
    CryptoVerseToken = await ethers.getContractFactory("CryptoVerseToken");
    cvrsToken = await CryptoVerseToken.deploy(owner.address, owner.address);
    await cvrsToken.waitForDeployment();

    // Mint some tokens for testing
    await cvrsToken.mintReward(user1.address, INITIAL_SUPPLY, "testing");
    await cvrsToken.mintReward(user2.address, INITIAL_SUPPLY, "testing");

    // Deploy Pet NFT contract
    CryptoVersePetNFT = await ethers.getContractFactory("CryptoVersePetNFT");
    petNFT = await CryptoVersePetNFT.deploy(
      await cvrsToken.getAddress(),
      treasury.address
    );
    await petNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct parameters", async function () {
      expect(await petNFT.name()).to.equal("CryptoVerse Pet Collection");
      expect(await petNFT.symbol()).to.equal("CVPET");
      expect(await petNFT.totalPets()).to.equal(7);
      expect(await petNFT.treasury()).to.equal(treasury.address);
    });

    it("Should create 7 initial pets with correct tiers and prices", async function () {
      const totalPets = await petNFT.totalPets();
      expect(totalPets).to.equal(7);

      // Check tier prices
      expect(await petNFT.tierPrices(0)).to.equal(ethers.parseEther("100")); // COMMON
      expect(await petNFT.tierPrices(1)).to.equal(ethers.parseEther("250")); // RARE
      expect(await petNFT.tierPrices(2)).to.equal(ethers.parseEther("500")); // EPIC
      expect(await petNFT.tierPrices(3)).to.equal(ethers.parseEther("1000")); // LEGENDARY

      // Check specific pets
      const pet1 = await petNFT.getPetDetails(1);
      expect(pet1.name).to.equal("Pixel Pup");
      expect(pet1.tier).to.equal(0); // COMMON
      expect(pet1.price).to.equal(ethers.parseEther("100"));

      const pet7 = await petNFT.getPetDetails(7);
      expect(pet7.name).to.equal("Cosmic Guardian");
      expect(pet7.tier).to.equal(3); // LEGENDARY
      expect(pet7.price).to.equal(ethers.parseEther("1000"));
    });

    it("Should have all pets available for sale initially", async function () {
      const [tokenIds, availablePets] = await petNFT.getAvailablePets();
      expect(tokenIds.length).to.equal(7);
      
      for (let i = 0; i < 7; i++) {
        expect(availablePets[i].isForSale).to.be.true;
        expect(await petNFT.ownerOf(tokenIds[i])).to.equal(await petNFT.getAddress());
      }
    });
  });

  describe("Pet Purchase", function () {
    beforeEach(async function () {
      // Approve Pet NFT contract to spend user's CVRS tokens
      await cvrsToken.connect(user1).approve(
        await petNFT.getAddress(),
        ethers.parseEther("10000")
      );
    });

    it("Should allow purchasing a pet with sufficient CVRS balance and approval", async function () {
      const petId = 1;
      const pet = await petNFT.getPetDetails(petId);
      const price = pet.price;

      // Get initial balances
      const initialUserBalance = await cvrsToken.balanceOf(user1.address);
      const initialTreasuryBalance = await cvrsToken.balanceOf(treasury.address);

      // Purchase pet
      await expect(petNFT.connect(user1).purchasePet(petId))
        .to.emit(petNFT, "PetPurchased")
        .withArgs(petId, user1.address, price, 0); // 0 = COMMON tier

      // Check ownership transfer
      expect(await petNFT.ownerOf(petId)).to.equal(user1.address);

      // Check CVRS token transfer
      const finalUserBalance = await cvrsToken.balanceOf(user1.address);
      const finalTreasuryBalance = await cvrsToken.balanceOf(treasury.address);
      
      expect(finalUserBalance).to.equal(initialUserBalance - price);
      expect(finalTreasuryBalance).to.equal(initialTreasuryBalance + price);

      // Check pet is no longer for sale
      const updatedPet = await petNFT.getPetDetails(petId);
      expect(updatedPet.isForSale).to.be.false;

      // Check user's pets
      const userPets = await petNFT.getUserPets(user1.address);
      expect(userPets.length).to.equal(1);
      expect(userPets[0]).to.equal(petId);
    });

    it("Should fail if user has insufficient CVRS balance", async function () {
      // Transfer most tokens away to create insufficient balance
      const userBalance = await cvrsToken.balanceOf(user1.address);
      await cvrsToken.connect(user1).transfer(user2.address, userBalance - ethers.parseEther("50"));

      // Try to purchase expensive pet (should fail)
      await expect(petNFT.connect(user1).purchasePet(7))
        .to.be.revertedWithCustomError(petNFT, "InsufficientCVRSBalance");
    });

    it("Should fail if user has insufficient CVRS allowance", async function () {
      // Set low allowance
      await cvrsToken.connect(user1).approve(
        await petNFT.getAddress(),
        ethers.parseEther("50")
      );

      // Try to purchase expensive pet (should fail)
      await expect(petNFT.connect(user1).purchasePet(7))
        .to.be.revertedWithCustomError(petNFT, "InsufficientCVRSAllowance");
    });

    it("Should fail if pet is already sold", async function () {
      const petId = 1;

      // First purchase
      await petNFT.connect(user1).purchasePet(petId);

      // Approve user2 for spending
      await cvrsToken.connect(user2).approve(
        await petNFT.getAddress(),
        ethers.parseEther("1000")
      );

      // Try to purchase same pet again (should fail)
      await expect(petNFT.connect(user2).purchasePet(petId))
        .to.be.revertedWithCustomError(petNFT, "PetNotForSale");
    });

    it("Should fail if pet doesn't exist", async function () {
      await expect(petNFT.connect(user1).purchasePet(999))
        .to.be.revertedWithCustomError(petNFT, "PetDoesNotExist");
    });
  });

  describe("Marketplace Stats", function () {
    beforeEach(async function () {
      await cvrsToken.connect(user1).approve(
        await petNFT.getAddress(),
        ethers.parseEther("10000")
      );
    });

    it("Should track marketplace statistics correctly", async function () {
      let stats = await petNFT.getMarketplaceStats();
      expect(stats.totalPetsCreated).to.equal(7);
      expect(stats.totalSalesCount).to.equal(0);
      expect(stats.totalRevenueAmount).to.equal(0);
      expect(stats.availableCount).to.equal(7);

      // Purchase a pet
      await petNFT.connect(user1).purchasePet(1);

      stats = await petNFT.getMarketplaceStats();
      expect(stats.totalPetsCreated).to.equal(7);
      expect(stats.totalSalesCount).to.equal(1);
      expect(stats.totalRevenueAmount).to.equal(ethers.parseEther("100"));
      expect(stats.availableCount).to.equal(6);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to update tier prices", async function () {
      const newPrice = ethers.parseEther("150");
      
      await expect(petNFT.updateTierPrice(0, newPrice)) // Update COMMON tier
        .to.emit(petNFT, "TierPriceUpdated")
        .withArgs(0, newPrice);

      expect(await petNFT.tierPrices(0)).to.equal(newPrice);

      // Check that existing pets of this tier also have updated prices
      const pet1 = await petNFT.getPetDetails(1); // COMMON tier pet
      expect(pet1.price).to.equal(newPrice);
    });

    it("Should allow admin to update treasury address", async function () {
      const newTreasury = user2.address;
      
      await expect(petNFT.updateTreasury(newTreasury))
        .to.emit(petNFT, "TreasuryUpdated")
        .withArgs(treasury.address, newTreasury);

      expect(await petNFT.treasury()).to.equal(newTreasury);
    });

    it("Should allow admin to pause/unpause contract", async function () {
      await petNFT.pause();
      expect(await petNFT.paused()).to.be.true;

      // Should fail to purchase when paused
      await cvrsToken.connect(user1).approve(
        await petNFT.getAddress(),
        ethers.parseEther("1000")
      );
      
      await expect(petNFT.connect(user1).purchasePet(1))
        .to.be.revertedWith("Pausable: paused");

      await petNFT.unpause();
      expect(await petNFT.paused()).to.be.false;

      // Should work again after unpause
      await expect(petNFT.connect(user1).purchasePet(1))
        .to.emit(petNFT, "PetPurchased");
    });

    it("Should not allow non-admin to call admin functions", async function () {
      await expect(petNFT.connect(user1).updateTierPrice(0, ethers.parseEther("150")))
        .to.be.reverted;

      await expect(petNFT.connect(user1).updateTreasury(user2.address))
        .to.be.reverted;

      await expect(petNFT.connect(user1).pause())
        .to.be.reverted;
    });
  });

  describe("Pet Tiers", function () {
    it("Should return correct pets by tier", async function () {
      const commonPets = await petNFT.getPetsByTier(0); // COMMON
      const rarePets = await petNFT.getPetsByTier(1);   // RARE
      const epicPets = await petNFT.getPetsByTier(2);   // EPIC
      const legendaryPets = await petNFT.getPetsByTier(3); // LEGENDARY

      expect(commonPets.length).to.equal(2); // pet1, pet2
      expect(rarePets.length).to.equal(2);   // pet3, pet4
      expect(epicPets.length).to.equal(2);   // pet5, pet6
      expect(legendaryPets.length).to.equal(1); // pet7

      expect(commonPets[0]).to.equal(1);
      expect(commonPets[1]).to.equal(2);
      expect(legendaryPets[0]).to.equal(7);
    });
  });

  describe("Purchase History", function () {
    beforeEach(async function () {
      await cvrsToken.connect(user1).approve(
        await petNFT.getAddress(),
        ethers.parseEther("10000")
      );
    });

    it("Should track user purchase history", async function () {
      // Initially no purchases
      let purchases = await petNFT.getUserPurchases(user1.address);
      expect(purchases.length).to.equal(0);

      // Purchase a pet
      await petNFT.connect(user1).purchasePet(1);

      // Check purchase history
      purchases = await petNFT.getUserPurchases(user1.address);
      expect(purchases.length).to.equal(1);
      expect(purchases[0].tokenId).to.equal(1);
      expect(purchases[0].buyer).to.equal(user1.address);
      expect(purchases[0].price).to.equal(ethers.parseEther("100"));
      expect(purchases[0].tier).to.equal(0); // COMMON
    });
  });
});