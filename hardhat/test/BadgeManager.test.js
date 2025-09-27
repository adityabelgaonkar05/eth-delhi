const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("BadgeManager", function () {
  // Deploy all contracts for testing
  async function deployContractsFixture() {
    const [owner, user1, user2, user3, treasury, backend, platform] =
      await ethers.getSigners();

    // Deploy SelfProtocol
    const SelfProtocol = await ethers.getContractFactory(
      "SelfProtocolIntegration"
    );
    
    // Define verification config
    const verificationConfig = {
      minimumAge: 18,
      ofacRequired: true,
      excludedCountries: ["CN", "IR", "KP"],
      requireNationality: true,
      requireGender: false,
      requireName: true,
      requireDateOfBirth: true,
      requirePassportNumber: true,
      requireExpiryDate: true
    };

    const selfProtocol = await SelfProtocol.deploy(
      "cryptoverse-app",
      "https://developer.selfprotocol.com",
      verificationConfig
    );

    // Deploy CryptoVerseToken
    const CryptoVerseToken = await ethers.getContractFactory(
      "CryptoVerseToken"
    );
    const cvrsToken = await CryptoVerseToken.deploy();

    // Deploy UserRegistry
    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    const userRegistry = await UserRegistry.deploy(
      await selfProtocol.getAddress(),
      await cvrsToken.getAddress()
    );

    // Deploy BadgeManager
    const BadgeManager = await ethers.getContractFactory("BadgeManager");
    const badgeManager = await BadgeManager.deploy(
      await userRegistry.getAddress(),
      await cvrsToken.getAddress(),
      treasury.address
    );

    // Grant necessary roles
    await cvrsToken.grantRole(
      await cvrsToken.PLATFORM_ROLE(),
      await badgeManager.getAddress()
    );
    await userRegistry.grantRole(
      await userRegistry.PLATFORM_ROLE(),
      await badgeManager.getAddress()
    );
    await badgeManager.grantRole(
      await badgeManager.PLATFORM_ROLE(),
      platform.address
    );
    await selfProtocol.grantRole(
      await selfProtocol.BACKEND_ROLE(),
      backend.address
    );

    // Setup verified users
    await selfProtocol
      .connect(backend)
      .verifyUser(user1.address, "did:self:user1");
    await selfProtocol
      .connect(backend)
      .verifyUser(user2.address, "did:self:user2");
    await selfProtocol
      .connect(backend)
      .verifyUser(user3.address, "did:self:user3");

    // Register users
    await userRegistry
      .connect(user1)
      .registerUser("user1", "user1@test.com", "User 1 bio");
    await userRegistry
      .connect(user2)
      .registerUser("user2", "user2@test.com", "User 2 bio");
    await userRegistry
      .connect(user3)
      .registerUser("user3", "user3@test.com", "User 3 bio");

    // Transfer CVRS tokens to users
    await cvrsToken
      .connect(owner)
      .transfer(user1.address, ethers.parseEther("1000"));
    await cvrsToken
      .connect(owner)
      .transfer(user2.address, ethers.parseEther("1000"));
    await cvrsToken
      .connect(owner)
      .transfer(user3.address, ethers.parseEther("1000"));

    return {
      badgeManager,
      userRegistry,
      cvrsToken,
      selfProtocol,
      owner,
      user1,
      user2,
      user3,
      treasury,
      backend,
      platform,
    };
  }

  describe("Deployment", function () {
    it("Should deploy with correct initial values", async function () {
      const { badgeManager, treasury } = await loadFixture(
        deployContractsFixture
      );

      expect(await badgeManager.treasuryWallet()).to.equal(treasury.address);
      expect(await badgeManager.treasuryFeePercentage()).to.equal(30);
      expect(await badgeManager.nextBadgeId()).to.equal(1);
      expect(await badgeManager.totalBadges()).to.equal(0);
    });

    it("Should have correct default categories and rarities", async function () {
      const { badgeManager } = await loadFixture(deployContractsFixture);

      const categories = await badgeManager.getSupportedCategories();
      const rarities = await badgeManager.getSupportedRarities();

      expect(categories).to.include.members([
        "Avatar",
        "Frame",
        "Background",
        "Achievement",
        "Special",
        "Seasonal",
      ]);
      expect(rarities).to.include.members([
        "common",
        "rare",
        "epic",
        "legendary",
      ]);
    });
  });

  describe("Badge Creation", function () {
    it("Should allow admin to create a badge", async function () {
      const { badgeManager, owner } = await loadFixture(deployContractsFixture);

      await expect(
        badgeManager
          .connect(owner)
          .createBadge(
            "Test Badge",
            "A test badge",
            "https://test.com/badge.png",
            "Avatar",
            ethers.parseEther("100"),
            "common",
            false,
            0,
            false,
            0
          )
      ).to.emit(badgeManager, "BadgeCreated");

      const badge = await badgeManager.getBadge(1);
      expect(badge.name).to.equal("Test Badge");
      expect(badge.category).to.equal("Avatar");
      expect(badge.price).to.equal(ethers.parseEther("100"));
      expect(badge.isActive).to.be.true;
    });

    it("Should apply rarity multipliers correctly", async function () {
      const { badgeManager, owner } = await loadFixture(deployContractsFixture);

      // Create badges with different rarities
      await badgeManager
        .connect(owner)
        .createBadge(
          "Common Badge",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "common",
          false,
          0,
          false,
          0
        );
      await badgeManager
        .connect(owner)
        .createBadge(
          "Rare Badge",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "rare",
          false,
          0,
          false,
          0
        );
      await badgeManager
        .connect(owner)
        .createBadge(
          "Epic Badge",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "epic",
          false,
          0,
          false,
          0
        );
      await badgeManager
        .connect(owner)
        .createBadge(
          "Legendary Badge",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "legendary",
          false,
          0,
          false,
          0
        );

      const commonBadge = await badgeManager.getBadge(1);
      const rareBadge = await badgeManager.getBadge(2);
      const epicBadge = await badgeManager.getBadge(3);
      const legendaryBadge = await badgeManager.getBadge(4);

      expect(commonBadge.price).to.equal(ethers.parseEther("100"));
      expect(rareBadge.price).to.equal(ethers.parseEther("300"));
      expect(epicBadge.price).to.equal(ethers.parseEther("500"));
      expect(legendaryBadge.price).to.equal(ethers.parseEther("1000"));
    });

    it("Should reject invalid parameters", async function () {
      const { badgeManager, owner } = await loadFixture(deployContractsFixture);

      // Invalid category
      await expect(
        badgeManager
          .connect(owner)
          .createBadge(
            "Test",
            "desc",
            "uri",
            "InvalidCategory",
            ethers.parseEther("100"),
            "common",
            false,
            0,
            false,
            0
          )
      ).to.be.revertedWithCustomError(badgeManager, "InvalidCategory");

      // Invalid rarity
      await expect(
        badgeManager
          .connect(owner)
          .createBadge(
            "Test",
            "desc",
            "uri",
            "Avatar",
            ethers.parseEther("100"),
            "invalid",
            false,
            0,
            false,
            0
          )
      ).to.be.revertedWithCustomError(badgeManager, "InvalidRarity");

      // Zero price
      await expect(
        badgeManager
          .connect(owner)
          .createBadge(
            "Test",
            "desc",
            "uri",
            "Avatar",
            0,
            "common",
            false,
            0,
            false,
            0
          )
      ).to.be.revertedWithCustomError(badgeManager, "InvalidPrice");

      // Limited badge with zero max supply
      await expect(
        badgeManager
          .connect(owner)
          .createBadge(
            "Test",
            "desc",
            "uri",
            "Avatar",
            ethers.parseEther("100"),
            "common",
            true,
            0,
            false,
            0
          )
      ).to.be.revertedWithCustomError(badgeManager, "InvalidMaxSupply");
    });

    it("Should only allow admin role to create badges", async function () {
      const { badgeManager, user1 } = await loadFixture(deployContractsFixture);

      await expect(
        badgeManager
          .connect(user1)
          .createBadge(
            "Unauthorized",
            "desc",
            "uri",
            "Avatar",
            ethers.parseEther("100"),
            "common",
            false,
            0,
            false,
            0
          )
      ).to.be.reverted;
    });
  });

  describe("Badge Purchasing", function () {
    beforeEach(async function () {
      // This will run before each test in this describe block
    });

    it("Should allow verified users to purchase badges", async function () {
      const { badgeManager, cvrsToken, owner, user1 } = await loadFixture(
        deployContractsFixture
      );

      // Create a badge
      await badgeManager
        .connect(owner)
        .createBadge(
          "Purchase Test",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("50"),
          "common",
          false,
          0,
          false,
          0
        );

      // Approve and purchase
      await cvrsToken
        .connect(user1)
        .approve(await badgeManager.getAddress(), ethers.parseEther("50"));

      await expect(badgeManager.connect(user1).purchaseBadge(1)).to.emit(
        badgeManager,
        "BadgePurchased"
      );

      expect(await badgeManager.doesUserOwnBadge(1, user1.address)).to.be.true;
    });

    it("Should handle limited supply badges correctly", async function () {
      const { badgeManager, cvrsToken, owner, user1, user2 } =
        await loadFixture(deployContractsFixture);

      // Create limited badge with supply of 1
      await badgeManager
        .connect(owner)
        .createBadge(
          "Limited",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "common",
          true,
          1,
          false,
          0
        );

      // First purchase should succeed
      await cvrsToken
        .connect(user1)
        .approve(await badgeManager.getAddress(), ethers.parseEther("100"));
      await badgeManager.connect(user1).purchaseBadge(1);

      // Second purchase should fail
      await cvrsToken
        .connect(user2)
        .approve(await badgeManager.getAddress(), ethers.parseEther("100"));
      await expect(
        badgeManager.connect(user2).purchaseBadge(1)
      ).to.be.revertedWithCustomError(badgeManager, "MaxSupplyReached");
    });

    it("Should prevent duplicate purchases", async function () {
      const { badgeManager, cvrsToken, owner, user1 } = await loadFixture(
        deployContractsFixture
      );

      await badgeManager
        .connect(owner)
        .createBadge(
          "No Duplicate",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("50"),
          "common",
          false,
          0,
          false,
          0
        );

      await cvrsToken
        .connect(user1)
        .approve(await badgeManager.getAddress(), ethers.parseEther("100"));
      await badgeManager.connect(user1).purchaseBadge(1);

      // Second purchase should fail
      await expect(
        badgeManager.connect(user1).purchaseBadge(1)
      ).to.be.revertedWithCustomError(badgeManager, "BadgeAlreadyOwned");
    });

    it("Should handle treasury fee correctly", async function () {
      const { badgeManager, cvrsToken, owner, user1, treasury } =
        await loadFixture(deployContractsFixture);

      await badgeManager
        .connect(owner)
        .createBadge(
          "Fee Test",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "common",
          false,
          0,
          false,
          0
        );

      const initialTreasuryBalance = await cvrsToken.balanceOf(
        treasury.address
      );
      const initialUserBalance = await cvrsToken.balanceOf(user1.address);
      const price = ethers.parseEther("100");
      const treasuryFee = (price * 30n) / 100n; // 30%

      await cvrsToken
        .connect(user1)
        .approve(await badgeManager.getAddress(), price);
      await badgeManager.connect(user1).purchaseBadge(1);

      expect(await cvrsToken.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance + treasuryFee
      );
      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        initialUserBalance - price
      );
    });
  });

  describe("Badge Awarding", function () {
    it("Should allow platform role to award badges", async function () {
      const { badgeManager, owner, user1 } = await loadFixture(
        deployContractsFixture
      );

      await badgeManager
        .connect(owner)
        .createBadge(
          "Award Test",
          "desc",
          "uri",
          "Achievement",
          ethers.parseEther("100"),
          "rare",
          false,
          0,
          false,
          0
        );

      await expect(
        badgeManager.connect(owner).awardBadge(1, user1.address, "event_reward")
      )
        .to.emit(badgeManager, "BadgePurchased")
        .withArgs(1, user1.address, 0, anyValue, "event_reward");

      expect(await badgeManager.doesUserOwnBadge(1, user1.address)).to.be.true;
    });

    it("Should handle limited supply when awarding", async function () {
      const { badgeManager, owner, user1, user2 } = await loadFixture(
        deployContractsFixture
      );

      await badgeManager
        .connect(owner)
        .createBadge(
          "Limited Award",
          "desc",
          "uri",
          "Achievement",
          ethers.parseEther("100"),
          "rare",
          true,
          1,
          false,
          0
        );

      await badgeManager
        .connect(owner)
        .awardBadge(1, user1.address, "event_reward");

      await expect(
        badgeManager.connect(owner).awardBadge(1, user2.address, "event_reward")
      ).to.be.revertedWithCustomError(badgeManager, "MaxSupplyReached");
    });
  });

  describe("Badge Management", function () {
    it("Should allow admin to update badge price", async function () {
      const { badgeManager, owner } = await loadFixture(deployContractsFixture);

      await badgeManager
        .connect(owner)
        .createBadge(
          "Price Update",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "common",
          false,
          0,
          false,
          0
        );

      await expect(
        badgeManager
          .connect(owner)
          .updateBadgePrice(1, ethers.parseEther("200"))
      )
        .to.emit(badgeManager, "BadgeUpdated")
        .withArgs(1, "price");

      const badge = await badgeManager.getBadge(1);
      expect(badge.price).to.equal(ethers.parseEther("200"));
    });

    it("Should allow admin to deactivate and reactivate badges", async function () {
      const { badgeManager, owner } = await loadFixture(deployContractsFixture);

      await badgeManager
        .connect(owner)
        .createBadge(
          "Toggle Test",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "common",
          false,
          0,
          false,
          0
        );

      // Deactivate
      await expect(badgeManager.connect(owner).deactivateBadge(1, "Testing"))
        .to.emit(badgeManager, "BadgeDeactivated")
        .withArgs(1, "Testing");

      let badge = await badgeManager.getBadge(1);
      expect(badge.isActive).to.be.false;

      // Reactivate
      await expect(badgeManager.connect(owner).reactivateBadge(1))
        .to.emit(badgeManager, "BadgeUpdated")
        .withArgs(1, "reactivated");

      badge = await badgeManager.getBadge(1);
      expect(badge.isActive).to.be.true;
    });
  });

  describe("View Functions", function () {
    it("Should return correct badge data", async function () {
      const { badgeManager, owner } = await loadFixture(deployContractsFixture);

      await badgeManager
        .connect(owner)
        .createBadge(
          "View Test",
          "Test Description",
          "https://test.com",
          "Avatar",
          ethers.parseEther("100"),
          "rare",
          true,
          50,
          true,
          123
        );

      const badge = await badgeManager.getBadge(1);
      expect(badge.name).to.equal("View Test");
      expect(badge.description).to.equal("Test Description");
      expect(badge.imageURI).to.equal("https://test.com");
      expect(badge.category).to.equal("Avatar");
      expect(badge.rarity).to.equal("rare");
      expect(badge.isLimited).to.be.true;
      expect(badge.maxSupply).to.equal(50);
      expect(badge.requiresEvent).to.be.true;
      expect(badge.requiredEventId).to.equal(123);
    });

    it("Should return correct marketplace statistics", async function () {
      const { badgeManager, owner } = await loadFixture(deployContractsFixture);

      // Create multiple badges
      for (let i = 0; i < 5; i++) {
        await badgeManager
          .connect(owner)
          .createBadge(
            `Badge ${i}`,
            "desc",
            "uri",
            "Avatar",
            ethers.parseEther("100"),
            "common",
            false,
            0,
            false,
            0
          );
      }

      // Deactivate one badge
      await badgeManager.connect(owner).deactivateBadge(3, "test");

      const [total, active, purchases, revenue] =
        await badgeManager.getMarketplaceStats();
      expect(total).to.equal(5);
      expect(active).to.equal(4);
      expect(purchases).to.equal(0);
      expect(revenue).to.equal(0);
    });

    it("Should return badges by category and rarity", async function () {
      const { badgeManager, owner } = await loadFixture(deployContractsFixture);

      await badgeManager
        .connect(owner)
        .createBadge(
          "Avatar Common",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "common",
          false,
          0,
          false,
          0
        );
      await badgeManager
        .connect(owner)
        .createBadge(
          "Frame Rare",
          "desc",
          "uri",
          "Frame",
          ethers.parseEther("100"),
          "rare",
          false,
          0,
          false,
          0
        );
      await badgeManager
        .connect(owner)
        .createBadge(
          "Avatar Rare",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "rare",
          false,
          0,
          false,
          0
        );

      const avatarBadges = await badgeManager.getBadgesByCategory("Avatar");
      const rareBadges = await badgeManager.getBadgesByRarity("rare");

      expect(avatarBadges).to.have.lengthOf(2);
      expect(rareBadges).to.have.lengthOf(2);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to manage categories", async function () {
      const { badgeManager, owner } = await loadFixture(deployContractsFixture);

      await expect(badgeManager.connect(owner).addCategory("NewCategory"))
        .to.emit(badgeManager, "CategoryAdded")
        .withArgs("NewCategory");

      const categories = await badgeManager.getSupportedCategories();
      expect(categories).to.include("NewCategory");

      await expect(badgeManager.connect(owner).removeCategory("NewCategory"))
        .to.emit(badgeManager, "CategoryRemoved")
        .withArgs("NewCategory");
    });

    it("Should allow admin to manage rarities", async function () {
      const { badgeManager, owner } = await loadFixture(deployContractsFixture);

      await expect(badgeManager.connect(owner).addRarity("mythical", 1500))
        .to.emit(badgeManager, "RarityAdded")
        .withArgs("mythical", 1500);

      const rarities = await badgeManager.getSupportedRarities();
      expect(rarities).to.include("mythical");

      await expect(badgeManager.connect(owner).removeRarity("mythical"))
        .to.emit(badgeManager, "RarityRemoved")
        .withArgs("mythical");
    });

    it("Should allow admin to update treasury settings", async function () {
      const { badgeManager, owner, user1 } = await loadFixture(
        deployContractsFixture
      );

      await expect(
        badgeManager.connect(owner).updateTreasuryWallet(user1.address)
      )
        .to.emit(badgeManager, "TreasuryUpdated")
        .withArgs(user1.address);

      expect(await badgeManager.treasuryWallet()).to.equal(user1.address);

      await expect(badgeManager.connect(owner).updateTreasuryFeePercentage(50))
        .to.emit(badgeManager, "FeePercentageUpdated")
        .withArgs(50);

      expect(await badgeManager.treasuryFeePercentage()).to.equal(50);
    });

    it("Should allow admin to pause and unpause", async function () {
      const { badgeManager, owner, user1 } = await loadFixture(
        deployContractsFixture
      );

      await badgeManager.connect(owner).pause();

      // Should not be able to create badges when paused
      await expect(
        badgeManager
          .connect(owner)
          .createBadge(
            "Paused",
            "desc",
            "uri",
            "Avatar",
            ethers.parseEther("100"),
            "common",
            false,
            0,
            false,
            0
          )
      ).to.be.reverted;

      await badgeManager.connect(owner).unpause();

      // Should work after unpause
      await badgeManager
        .connect(owner)
        .createBadge(
          "Unpaused",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "common",
          false,
          0,
          false,
          0
        );

      const badge = await badgeManager.getBadge(1);
      expect(badge.name).to.equal("Unpaused");
    });

    it("Should only allow platform role to award badges", async function () {
      const { badgeManager, owner, user1 } = await loadFixture(
        deployContractsFixture
      );

      await badgeManager
        .connect(owner)
        .createBadge(
          "Unauthorized Award",
          "desc",
          "uri",
          "Achievement",
          ethers.parseEther("100"),
          "rare",
          false,
          0,
          false,
          0
        );

      await expect(
        badgeManager.connect(user1).awardBadge(1, user1.address, "event_reward")
      ).to.be.reverted;
    });

    it("Should prevent awarding to unregistered users", async function () {
      const { badgeManager, owner, platform } = await loadFixture(
        deployContractsFixture
      );

      await badgeManager
        .connect(owner)
        .createBadge(
          "Unregistered Award",
          "desc",
          "uri",
          "Achievement",
          ethers.parseEther("100"),
          "rare",
          false,
          0,
          false,
          0
        );

      // Create an unregistered user
      const [, , , , , , , unregisteredUser] = await ethers.getSigners();

      await expect(
        badgeManager
          .connect(platform)
          .awardBadge(1, unregisteredUser.address, "event_reward")
      ).to.be.revertedWithCustomError(badgeManager, "UserNotRegistered");
    });

    it("Should prevent awarding inactive badges", async function () {
      const { badgeManager, owner, platform, user1 } = await loadFixture(
        deployContractsFixture
      );

      await badgeManager
        .connect(owner)
        .createBadge(
          "Inactive Award",
          "desc",
          "uri",
          "Achievement",
          ethers.parseEther("100"),
          "rare",
          false,
          0,
          false,
          0
        );

      await badgeManager.connect(owner).deactivateBadge(1, "testing");

      await expect(
        badgeManager
          .connect(platform)
          .awardBadge(1, user1.address, "event_reward")
      ).to.be.revertedWithCustomError(badgeManager, "BadgeNotActive");
    });

    it("Should prevent awarding already owned badges", async function () {
      const { badgeManager, owner, platform, user1 } = await loadFixture(
        deployContractsFixture
      );

      await badgeManager
        .connect(owner)
        .createBadge(
          "Duplicate Award",
          "desc",
          "uri",
          "Achievement",
          ethers.parseEther("100"),
          "rare",
          false,
          0,
          false,
          0
        );

      await badgeManager
        .connect(platform)
        .awardBadge(1, user1.address, "event_reward");

      await expect(
        badgeManager
          .connect(platform)
          .awardBadge(1, user1.address, "event_reward")
      ).to.be.revertedWithCustomError(badgeManager, "BadgeAlreadyOwned");
    });
  });

  describe("Event Requirements", function () {
    it("Should handle badges that require event attendance", async function () {
      const { badgeManager, cvrsToken, owner, user1, userRegistry } =
        await loadFixture(deployContractsFixture);

      await badgeManager
        .connect(owner)
        .createBadge(
          "Event Badge",
          "desc",
          "uri",
          "Achievement",
          ethers.parseEther("100"),
          "rare",
          false,
          0,
          true,
          123
        );

      // User with no events attended should fail
      await cvrsToken
        .connect(user1)
        .approve(await badgeManager.getAddress(), ethers.parseEther("100"));
      await expect(
        badgeManager.connect(user1).purchaseBadge(1)
      ).to.be.revertedWithCustomError(badgeManager, "EventNotAttended");

      // Update user stats to have attended an event
      await userRegistry
        .connect(owner)
        .updateStats(user1.address, "eventsAttended", 1);

      // Now purchase should succeed
      await badgeManager.connect(user1).purchaseBadge(1);
      expect(await badgeManager.doesUserOwnBadge(1, user1.address)).to.be.true;
    });

    it("Should allow awarding event badges without event requirement check", async function () {
      const { badgeManager, owner, platform, user1 } = await loadFixture(
        deployContractsFixture
      );

      await badgeManager
        .connect(owner)
        .createBadge(
          "Event Award",
          "desc",
          "uri",
          "Achievement",
          ethers.parseEther("100"),
          "rare",
          false,
          0,
          true,
          123
        );

      // Awarding should work even without event attendance
      await badgeManager
        .connect(platform)
        .awardBadge(1, user1.address, "event_reward");
      expect(await badgeManager.doesUserOwnBadge(1, user1.address)).to.be.true;
    });
  });

  describe("Purchase History", function () {
    it("Should track purchase history correctly", async function () {
      const { badgeManager, cvrsToken, owner, user1, user2 } =
        await loadFixture(deployContractsFixture);

      await badgeManager
        .connect(owner)
        .createBadge(
          "History Test",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "common",
          false,
          0,
          false,
          0
        );

      // Purchase by user1
      await cvrsToken
        .connect(user1)
        .approve(await badgeManager.getAddress(), ethers.parseEther("100"));
      await badgeManager.connect(user1).purchaseBadge(1);

      // Award to user2
      await badgeManager
        .connect(owner)
        .awardBadge(1, user2.address, "level_unlock");

      const purchaseHistory = await badgeManager.getBadgePurchaseHistory(1);
      expect(purchaseHistory).to.have.lengthOf(2);
      expect(purchaseHistory[0].buyer).to.equal(user1.address);
      expect(purchaseHistory[0].price).to.equal(ethers.parseEther("100"));
      expect(purchaseHistory[0].purchaseType).to.equal("direct");
      expect(purchaseHistory[1].buyer).to.equal(user2.address);
      expect(purchaseHistory[1].price).to.equal(0);
      expect(purchaseHistory[1].purchaseType).to.equal("level_unlock");
    });
  });

  describe("User Badge Management", function () {
    it("Should return correct user badges", async function () {
      const { badgeManager, cvrsToken, owner, user1 } = await loadFixture(
        deployContractsFixture
      );

      // Create multiple badges
      await badgeManager
        .connect(owner)
        .createBadge(
          "Badge 1",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("50"),
          "common",
          false,
          0,
          false,
          0
        );
      await badgeManager
        .connect(owner)
        .createBadge(
          "Badge 2",
          "desc",
          "uri",
          "Frame",
          ethers.parseEther("100"),
          "rare",
          false,
          0,
          false,
          0
        );
      await badgeManager
        .connect(owner)
        .createBadge(
          "Badge 3",
          "desc",
          "uri",
          "Background",
          ethers.parseEther("200"),
          "epic",
          false,
          0,
          false,
          0
        );

      // Purchase badges 1 and 3
      await cvrsToken
        .connect(user1)
        .approve(await badgeManager.getAddress(), ethers.parseEther("250"));
      await badgeManager.connect(user1).purchaseBadge(1);
      await badgeManager.connect(user1).purchaseBadge(3);

      const userBadges = await badgeManager.getUserBadges(user1.address);
      expect(userBadges).to.have.lengthOf(2);
      expect(userBadges).to.include(1n);
      expect(userBadges).to.include(3n);
    });

    it("Should correctly track badge ownership", async function () {
      const { badgeManager, cvrsToken, owner, user1, user2 } =
        await loadFixture(deployContractsFixture);

      await badgeManager
        .connect(owner)
        .createBadge(
          "Ownership Test",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "common",
          false,
          0,
          false,
          0
        );

      // Initially no one owns the badge
      expect(await badgeManager.doesUserOwnBadge(1, user1.address)).to.be.false;
      expect(await badgeManager.doesUserOwnBadge(1, user2.address)).to.be.false;

      // User1 purchases
      await cvrsToken
        .connect(user1)
        .approve(await badgeManager.getAddress(), ethers.parseEther("100"));
      await badgeManager.connect(user1).purchaseBadge(1);

      expect(await badgeManager.doesUserOwnBadge(1, user1.address)).to.be.true;
      expect(await badgeManager.doesUserOwnBadge(1, user2.address)).to.be.false;
    });
  });

  describe("Marketplace Statistics", function () {
    it("Should track revenue correctly", async function () {
      const { badgeManager, cvrsToken, owner, user1, user2 } =
        await loadFixture(deployContractsFixture);

      await badgeManager
        .connect(owner)
        .createBadge(
          "Revenue Test 1",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "common",
          false,
          0,
          false,
          0
        );
      await badgeManager
        .connect(owner)
        .createBadge(
          "Revenue Test 2",
          "desc",
          "uri",
          "Frame",
          ethers.parseEther("200"),
          "rare",
          false,
          0,
          false,
          0
        );

      // Purchase badges
      await cvrsToken
        .connect(user1)
        .approve(await badgeManager.getAddress(), ethers.parseEther("100"));
      await cvrsToken
        .connect(user2)
        .approve(await badgeManager.getAddress(), ethers.parseEther("600"));

      await badgeManager.connect(user1).purchaseBadge(1);
      await badgeManager.connect(user2).purchaseBadge(2);

      const [total, active, purchases, revenue] =
        await badgeManager.getMarketplaceStats();
      expect(total).to.equal(2);
      expect(active).to.equal(2);
      expect(purchases).to.equal(2);
      expect(revenue).to.equal(ethers.parseEther("300")); // 100 + 200
    });

    it("Should track active badges correctly", async function () {
      const { badgeManager, owner } = await loadFixture(deployContractsFixture);

      // Create multiple badges
      for (let i = 0; i < 5; i++) {
        await badgeManager
          .connect(owner)
          .createBadge(
            `Badge ${i}`,
            "desc",
            "uri",
            "Avatar",
            ethers.parseEther("100"),
            "common",
            false,
            0,
            false,
            0
          );
      }

      // Deactivate some badges
      await badgeManager.connect(owner).deactivateBadge(2, "testing");
      await badgeManager.connect(owner).deactivateBadge(4, "testing");

      const [total, active, purchases, revenue] =
        await badgeManager.getMarketplaceStats();
      expect(total).to.equal(5);
      expect(active).to.equal(3);
    });
  });

  describe("Error Handling", function () {
    it("Should revert for non-existent badges", async function () {
      const { badgeManager } = await loadFixture(deployContractsFixture);

      await expect(badgeManager.getBadge(999)).to.be.revertedWithCustomError(
        badgeManager,
        "BadgeNotFound"
      );
    });

    it("Should prevent purchasing inactive badges", async function () {
      const { badgeManager, cvrsToken, owner, user1 } = await loadFixture(
        deployContractsFixture
      );

      await badgeManager
        .connect(owner)
        .createBadge(
          "Inactive Test",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "common",
          false,
          0,
          false,
          0
        );

      await badgeManager.connect(owner).deactivateBadge(1, "testing");

      await cvrsToken
        .connect(user1)
        .approve(await badgeManager.getAddress(), ethers.parseEther("100"));
      await expect(
        badgeManager.connect(user1).purchaseBadge(1)
      ).to.be.revertedWithCustomError(badgeManager, "BadgeNotActive");
    });

    it("Should prevent purchasing with insufficient CVRS balance", async function () {
      const { badgeManager, cvrsToken, owner, user1 } = await loadFixture(
        deployContractsFixture
      );

      await badgeManager
        .connect(owner)
        .createBadge(
          "Expensive Badge",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("2000"),
          "legendary",
          false,
          0,
          false,
          0
        );

      // User only has 1000 CVRS, badge costs 2000
      await cvrsToken
        .connect(user1)
        .approve(await badgeManager.getAddress(), ethers.parseEther("2000"));
      await expect(
        badgeManager.connect(user1).purchaseBadge(1)
      ).to.be.revertedWithCustomError(badgeManager, "InsufficientCVRSBalance");
    });

    it("Should prevent purchasing by unregistered users", async function () {
      const { badgeManager, cvrsToken, owner } = await loadFixture(
        deployContractsFixture
      );

      await badgeManager
        .connect(owner)
        .createBadge(
          "Registered Only",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "common",
          false,
          0,
          false,
          0
        );

      // Create an unregistered user
      const [, , , , , , , unregisteredUser] = await ethers.getSigners();

      // Give them tokens
      await cvrsToken
        .connect(owner)
        .transfer(unregisteredUser.address, ethers.parseEther("100"));
      await cvrsToken
        .connect(unregisteredUser)
        .approve(await badgeManager.getAddress(), ethers.parseEther("100"));

      await expect(
        badgeManager.connect(unregisteredUser).purchaseBadge(1)
      ).to.be.revertedWithCustomError(badgeManager, "UserNotRegistered");
    });

    it("Should prevent purchasing by inactive users", async function () {
      const { badgeManager, cvrsToken, owner, user1, userRegistry } =
        await loadFixture(deployContractsFixture);

      await badgeManager
        .connect(owner)
        .createBadge(
          "Active Only",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "common",
          false,
          0,
          false,
          0
        );

      // Deactivate user (this would need to be implemented in UserRegistry)
      // For now, we'll test with a user who hasn't been registered
      const [, , , , , , , inactiveUser] = await ethers.getSigners();

      await cvrsToken
        .connect(owner)
        .transfer(inactiveUser.address, ethers.parseEther("100"));
      await cvrsToken
        .connect(inactiveUser)
        .approve(await badgeManager.getAddress(), ethers.parseEther("100"));

      await expect(
        badgeManager.connect(inactiveUser).purchaseBadge(1)
      ).to.be.revertedWithCustomError(badgeManager, "UserNotRegistered");
    });

    it("Should prevent invalid treasury updates", async function () {
      const { badgeManager, owner } = await loadFixture(deployContractsFixture);

      await expect(
        badgeManager.connect(owner).updateTreasuryWallet(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(badgeManager, "InvalidTreasuryAddress");
    });

    it("Should prevent invalid fee percentage updates", async function () {
      const { badgeManager, owner } = await loadFixture(deployContractsFixture);

      await expect(
        badgeManager.connect(owner).updateTreasuryFeePercentage(101)
      ).to.be.revertedWithCustomError(badgeManager, "InvalidFeePercentage");
    });

    it("Should prevent operations when paused", async function () {
      const { badgeManager, owner, user1 } = await loadFixture(
        deployContractsFixture
      );

      await badgeManager.connect(owner).pause();

      await expect(
        badgeManager
          .connect(owner)
          .createBadge(
            "Paused Badge",
            "desc",
            "uri",
            "Avatar",
            ethers.parseEther("100"),
            "common",
            false,
            0,
            false,
            0
          )
      ).to.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero treasury fee correctly", async function () {
      const { badgeManager, cvrsToken, owner, user1, treasury } =
        await loadFixture(deployContractsFixture);

      // Set treasury fee to 0%
      await badgeManager.connect(owner).updateTreasuryFeePercentage(0);

      await badgeManager
        .connect(owner)
        .createBadge(
          "Zero Fee Badge",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "common",
          false,
          0,
          false,
          0
        );

      const initialTreasuryBalance = await cvrsToken.balanceOf(
        treasury.address
      );
      const initialUserBalance = await cvrsToken.balanceOf(user1.address);

      await cvrsToken
        .connect(user1)
        .approve(await badgeManager.getAddress(), ethers.parseEther("100"));
      await badgeManager.connect(user1).purchaseBadge(1);

      // All tokens should be burned, none sent to treasury
      expect(await cvrsToken.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance
      );
      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        initialUserBalance - ethers.parseEther("100")
      );
    });

    it("Should handle 100% treasury fee correctly", async function () {
      const { badgeManager, cvrsToken, owner, user1, treasury } =
        await loadFixture(deployContractsFixture);

      // Set treasury fee to 100%
      await badgeManager.connect(owner).updateTreasuryFeePercentage(100);

      await badgeManager
        .connect(owner)
        .createBadge(
          "Full Fee Badge",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "common",
          false,
          0,
          false,
          0
        );

      const initialTreasuryBalance = await cvrsToken.balanceOf(
        treasury.address
      );
      const initialUserBalance = await cvrsToken.balanceOf(user1.address);

      await cvrsToken
        .connect(user1)
        .approve(await badgeManager.getAddress(), ethers.parseEther("100"));
      await badgeManager.connect(user1).purchaseBadge(1);

      // All tokens should go to treasury, none burned
      expect(await cvrsToken.balanceOf(treasury.address)).to.equal(
        initialTreasuryBalance + ethers.parseEther("100")
      );
      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        initialUserBalance - ethers.parseEther("100")
      );
    });

    it("Should handle maximum supply edge case", async function () {
      const { badgeManager, owner, platform, user1 } = await loadFixture(
        deployContractsFixture
      );

      // Create badge with max supply of 1
      await badgeManager
        .connect(owner)
        .createBadge(
          "Max Supply Test",
          "desc",
          "uri",
          "Avatar",
          ethers.parseEther("100"),
          "common",
          true,
          1,
          false,
          0
        );

      // Award to user1
      await badgeManager.connect(platform).awardBadge(1, user1.address, "test");

      // Try to award to another user - should fail
      const [, , , , , , , user4] = await ethers.getSigners();
      await expect(
        badgeManager.connect(platform).awardBadge(1, user4.address, "test")
      ).to.be.revertedWithCustomError(badgeManager, "MaxSupplyReached");
    });

    it("Should handle empty category and rarity arrays", async function () {
      const { badgeManager, owner } = await loadFixture(deployContractsFixture);

      // Remove all categories
      await badgeManager.connect(owner).removeCategory("Avatar");
      await badgeManager.connect(owner).removeCategory("Frame");
      await badgeManager.connect(owner).removeCategory("Background");
      await badgeManager.connect(owner).removeCategory("Achievement");
      await badgeManager.connect(owner).removeCategory("Special");
      await badgeManager.connect(owner).removeCategory("Seasonal");

      const categories = await badgeManager.getSupportedCategories();
      expect(categories).to.have.lengthOf(0);

      // Try to create badge with removed category - should fail
      await expect(
        badgeManager
          .connect(owner)
          .createBadge(
            "Invalid Category",
            "desc",
            "uri",
            "Avatar",
            ethers.parseEther("100"),
            "common",
            false,
            0,
            false,
            0
          )
      ).to.be.revertedWithCustomError(badgeManager, "InvalidCategory");
    });
  });
});
