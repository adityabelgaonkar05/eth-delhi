// UserRegistry.test.js
// ====================
// Comprehensive unit tests for the UserRegistry contract
// Tests user registration, profile management, statistics, and integration with other contracts.

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("UserRegistry", function () {
  async function deployUserRegistryFixture() {
    const [owner, backend, user1, user2, user3, platform, unauthorized] =
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

    // Grant necessary roles
    await selfProtocol.grantRole(
      await selfProtocol.VERIFIER_ROLE(),
      backend.address
    );
    await userRegistry.grantRole(
      await userRegistry.PLATFORM_ROLE(),
      platform.address
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

    return {
      userRegistry,
      selfProtocol,
      cvrsToken,
      owner,
      backend,
      user1,
      user2,
      user3,
      platform,
      unauthorized,
    };
  }

  describe("Deployment", function () {
    it("Should deploy with correct initial values", async function () {
      const { userRegistry, selfProtocol, cvrsToken, owner } =
        await loadFixture(deployUserRegistryFixture);

      expect(
        await userRegistry.hasRole(
          await userRegistry.DEFAULT_ADMIN_ROLE(),
          owner.address
        )
      ).to.be.true;
      expect(
        await userRegistry.hasRole(
          await userRegistry.ADMIN_ROLE(),
          owner.address
        )
      ).to.be.true;
      expect(
        await userRegistry.hasRole(
          await userRegistry.MODERATOR_ROLE(),
          owner.address
        )
      ).to.be.true;
      expect(
        await userRegistry.hasRole(
          await userRegistry.PLATFORM_ROLE(),
          owner.address
        )
      ).to.be.true;
      expect(await userRegistry.totalUsers()).to.equal(0);
      expect(await userRegistry.totalVerifiedUsers()).to.equal(0);
    });

    it("Should have correct contract references", async function () {
      const { userRegistry, selfProtocol, cvrsToken } = await loadFixture(
        deployUserRegistryFixture
      );

      expect(await userRegistry.selfProtocol()).to.equal(
        await selfProtocol.getAddress()
      );
      expect(await userRegistry.cvrsToken()).to.equal(
        await cvrsToken.getAddress()
      );
    });
  });

  describe("User Registration", function () {
    it("Should allow verified users to register", async function () {
      const { userRegistry, user1 } = await loadFixture(
        deployUserRegistryFixture
      );

      await expect(
        userRegistry
          .connect(user1)
          .registerUser("alice", "alice@test.com", "Alice's bio")
      )
        .to.emit(userRegistry, "UserRegistered")
        .withArgs(user1.address, "alice", anyValue);

      expect(await userRegistry.totalUsers()).to.equal(1);
      expect(await userRegistry.totalVerifiedUsers()).to.equal(1);
    });

    it("Should store user profile correctly", async function () {
      const { userRegistry, user1 } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      const profile = await userRegistry.getUserProfile(user1.address);
      expect(profile.userAddress).to.equal(user1.address);
      expect(profile.username).to.equal("alice");
      expect(profile.email).to.equal("alice@test.com");
      expect(profile.bio).to.equal("Alice's bio");
      expect(profile.isVerified).to.be.true;
      expect(profile.isActive).to.be.true;
      expect(profile.registeredAt).to.be.greaterThan(0);
      expect(profile.lastActive).to.be.greaterThan(0);
      expect(profile.totalRewards).to.equal(0);
      expect(profile.streakCount).to.equal(0);
      expect(profile.reputation).to.equal(50);
    });

    it("Should prevent duplicate registration", async function () {
      const { userRegistry, user1 } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      await expect(
        userRegistry
          .connect(user1)
          .registerUser("alice2", "alice2@test.com", "Alice's bio 2")
      ).to.be.revertedWithCustomError(userRegistry, "UserAlreadyRegistered");
    });

    it("Should prevent duplicate usernames", async function () {
      const { userRegistry, user1, user2 } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      await expect(
        userRegistry
          .connect(user2)
          .registerUser("alice", "alice2@test.com", "Alice's bio 2")
      ).to.be.revertedWithCustomError(userRegistry, "UsernameExists");
    });

    it("Should prevent invalid usernames", async function () {
      const { userRegistry, user1 } = await loadFixture(
        deployUserRegistryFixture
      );

      // Empty username
      await expect(
        userRegistry
          .connect(user1)
          .registerUser("", "alice@test.com", "Alice's bio")
      ).to.be.revertedWithCustomError(userRegistry, "InvalidUsername");

      // Username too long (over 32 characters)
      const longUsername = "a".repeat(33);
      await expect(
        userRegistry
          .connect(user1)
          .registerUser(longUsername, "alice@test.com", "Alice's bio")
      ).to.be.revertedWithCustomError(userRegistry, "InvalidUsername");
    });

    it("Should prevent unverified users from registering", async function () {
      const { userRegistry, unauthorized } = await loadFixture(
        deployUserRegistryFixture
      );

      await expect(
        userRegistry
          .connect(unauthorized)
          .registerUser("bob", "bob@test.com", "Bob's bio")
      ).to.be.revertedWithCustomError(userRegistry, "NotVerified");
    });

    it("Should update username mapping correctly", async function () {
      const { userRegistry, user1 } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      expect(await userRegistry.usernameToAddress("alice")).to.equal(
        user1.address
      );
    });
  });

  describe("Profile Management", function () {
    it("Should allow users to update their profile", async function () {
      const { userRegistry, user1 } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      await expect(
        userRegistry
          .connect(user1)
          .updateProfile(
            "alice.new@test.com",
            "Updated bio",
            "https://avatar.com/alice"
          )
      )
        .to.emit(userRegistry, "UserUpdated")
        .withArgs(user1.address, "alice");

      const profile = await userRegistry.getUserProfile(user1.address);
      expect(profile.email).to.equal("alice.new@test.com");
      expect(profile.bio).to.equal("Updated bio");
      expect(profile.avatarUrl).to.equal("https://avatar.com/alice");
      expect(profile.lastActive).to.be.greaterThan(0);
    });

    it("Should prevent unregistered users from updating profile", async function () {
      const { userRegistry, user1 } = await loadFixture(
        deployUserRegistryFixture
      );

      await expect(
        userRegistry
          .connect(user1)
          .updateProfile("alice@test.com", "Bio", "avatar")
      ).to.be.revertedWithCustomError(userRegistry, "UserNotRegistered");
    });

    it("Should update last active timestamp", async function () {
      const { userRegistry, user1, platform } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      const initialLastActive = (
        await userRegistry.getUserProfile(user1.address)
      ).lastActive;

      // Wait a bit and update last active
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await userRegistry.connect(platform).updateLastActive(user1.address);

      const updatedProfile = await userRegistry.getUserProfile(user1.address);
      expect(updatedProfile.lastActive).to.be.greaterThan(initialLastActive);
    });

    it("Should only allow platform role to update last active", async function () {
      const { userRegistry, user1, unauthorized } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      await expect(
        userRegistry.connect(unauthorized).updateLastActive(user1.address)
      ).to.be.reverted;
    });
  });

  describe("Statistics Management", function () {
    it("Should allow platform to update user statistics", async function () {
      const { userRegistry, user1, platform } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      // Update various statistics
      await userRegistry
        .connect(platform)
        .updateStats(user1.address, "blogsRead", 5);
      await userRegistry
        .connect(platform)
        .updateStats(user1.address, "quizzesCompleted", 3);
      await userRegistry
        .connect(platform)
        .updateStats(user1.address, "eventsAttended", 2);
      await userRegistry
        .connect(platform)
        .updateStats(user1.address, "badgesEarned", 1);
      await userRegistry
        .connect(platform)
        .updateStats(user1.address, "nftsMinted", 4);

      const stats = await userRegistry.getUserStats(user1.address);
      expect(stats.blogsRead).to.equal(5);
      expect(stats.quizzesCompleted).to.equal(3);
      expect(stats.eventsAttended).to.equal(2);
      expect(stats.badgesEarned).to.equal(1);
      expect(stats.nftsMinted).to.equal(4);
    });

    it("Should accumulate statistics correctly", async function () {
      const { userRegistry, user1, platform } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      // Add to same statistic multiple times
      await userRegistry
        .connect(platform)
        .updateStats(user1.address, "blogsRead", 3);
      await userRegistry
        .connect(platform)
        .updateStats(user1.address, "blogsRead", 2);

      const stats = await userRegistry.getUserStats(user1.address);
      expect(stats.blogsRead).to.equal(5);
    });

    it("Should only allow platform role to update statistics", async function () {
      const { userRegistry, user1, unauthorized } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      await expect(
        userRegistry
          .connect(unauthorized)
          .updateStats(user1.address, "blogsRead", 1)
      ).to.be.reverted;
    });

    it("Should update last active when statistics are updated", async function () {
      const { userRegistry, user1, platform } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      const initialLastActive = (
        await userRegistry.getUserProfile(user1.address)
      ).lastActive;

      // Wait a bit and update stats
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await userRegistry
        .connect(platform)
        .updateStats(user1.address, "blogsRead", 1);

      const updatedProfile = await userRegistry.getUserProfile(user1.address);
      expect(updatedProfile.lastActive).to.be.greaterThan(initialLastActive);
    });
  });

  describe("Badge Management", function () {
    it("Should allow platform to award badges", async function () {
      const { userRegistry, user1, platform } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      await expect(
        userRegistry.connect(platform).awardBadge(user1.address, "First Blog")
      )
        .to.emit(userRegistry, "BadgeAwarded")
        .withArgs(user1.address, "First Blog");

      const badges = await userRegistry.getUserBadges(user1.address);
      expect(badges).to.have.lengthOf(1);
      expect(badges[0]).to.equal("First Blog");

      const stats = await userRegistry.getUserStats(user1.address);
      expect(stats.badgesEarned).to.equal(1);
    });

    it("Should allow multiple badges per user", async function () {
      const { userRegistry, user1, platform } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      await userRegistry
        .connect(platform)
        .awardBadge(user1.address, "First Blog");
      await userRegistry
        .connect(platform)
        .awardBadge(user1.address, "Quiz Master");
      await userRegistry
        .connect(platform)
        .awardBadge(user1.address, "Event Attendee");

      const badges = await userRegistry.getUserBadges(user1.address);
      expect(badges).to.have.lengthOf(3);
      expect(badges).to.include("First Blog");
      expect(badges).to.include("Quiz Master");
      expect(badges).to.include("Event Attendee");

      const stats = await userRegistry.getUserStats(user1.address);
      expect(stats.badgesEarned).to.equal(3);
    });

    it("Should only allow platform role to award badges", async function () {
      const { userRegistry, user1, unauthorized } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      await expect(
        userRegistry
          .connect(unauthorized)
          .awardBadge(user1.address, "Unauthorized Badge")
      ).to.be.reverted;
    });

    it("Should prevent awarding badges to unregistered users", async function () {
      const { userRegistry, user1, platform } = await loadFixture(
        deployUserRegistryFixture
      );

      await expect(
        userRegistry.connect(platform).awardBadge(user1.address, "Badge")
      ).to.be.revertedWithCustomError(userRegistry, "UserNotRegistered");
    });
  });

  describe("User Status and Verification", function () {
    it("Should return correct user status", async function () {
      const { userRegistry, user1, user2 } = await loadFixture(
        deployUserRegistryFixture
      );

      // user1 is verified but not registered
      let [registered, verified] = await userRegistry.getUserStatus(
        user1.address
      );
      expect(registered).to.be.false;
      expect(verified).to.be.false;

      // Register user1
      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      [registered, verified] = await userRegistry.getUserStatus(user1.address);
      expect(registered).to.be.true;
      expect(verified).to.be.true;

      // user2 is verified but not registered
      [registered, verified] = await userRegistry.getUserStatus(user2.address);
      expect(registered).to.be.false;
      expect(verified).to.be.false;
    });

    it("Should return updated verification status from Self Protocol", async function () {
      const { userRegistry, selfProtocol, backend, user1 } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      // Initially verified
      const profile1 = await userRegistry.getUserProfile(user1.address);
      expect(profile1.isVerified).to.be.true;

      // Revoke verification in Self Protocol
      await selfProtocol.connect(backend).revokeVerification(user1.address);

      // Profile should reflect updated verification status
      const profile2 = await userRegistry.getUserProfile(user1.address);
      expect(profile2.isVerified).to.be.false;
    });
  });

  describe("User Queries", function () {
    it("Should return registered users with pagination", async function () {
      const { userRegistry, user1, user2, user3 } = await loadFixture(
        deployUserRegistryFixture
      );

      // Register all users
      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");
      await userRegistry
        .connect(user2)
        .registerUser("bob", "bob@test.com", "Bob's bio");
      await userRegistry
        .connect(user3)
        .registerUser("charlie", "charlie@test.com", "Charlie's bio");

      // Test pagination
      const users1 = await userRegistry.getRegisteredUsers(0, 2);
      expect(users1).to.have.lengthOf(2);

      const users2 = await userRegistry.getRegisteredUsers(2, 2);
      expect(users2).to.have.lengthOf(1);

      const users3 = await userRegistry.getRegisteredUsers(0, 10);
      expect(users3).to.have.lengthOf(3);
    });

    it("Should handle empty pagination results", async function () {
      const { userRegistry } = await loadFixture(deployUserRegistryFixture);

      const users = await userRegistry.getRegisteredUsers(0, 10);
      expect(users).to.have.lengthOf(0);
    });

    it("Should handle out-of-bounds pagination", async function () {
      const { userRegistry, user1 } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      const users = await userRegistry.getRegisteredUsers(10, 5);
      expect(users).to.have.lengthOf(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to pause and unpause", async function () {
      const { userRegistry, owner, user1 } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry.connect(owner).pause();
      expect(await userRegistry.paused()).to.be.true;

      await expect(
        userRegistry
          .connect(user1)
          .registerUser("alice", "alice@test.com", "Alice's bio")
      ).to.be.reverted;

      await userRegistry.connect(owner).unpause();
      expect(await userRegistry.paused()).to.be.false;

      // Should work after unpause
      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");
    });

    it("Should allow admin to update Self Protocol contract", async function () {
      const { userRegistry, owner } = await loadFixture(
        deployUserRegistryFixture
      );

      // Deploy new Self Protocol contract
      const NewSelfProtocol = await ethers.getContractFactory(
        "SelfProtocolIntegration"
      );
      const newSelfProtocol = await NewSelfProtocol.deploy();

      await userRegistry
        .connect(owner)
        .updateSelfProtocol(await newSelfProtocol.getAddress());

      expect(await userRegistry.selfProtocol()).to.equal(
        await newSelfProtocol.getAddress()
      );
    });

    it("Should prevent updating to zero address", async function () {
      const { userRegistry, owner } = await loadFixture(
        deployUserRegistryFixture
      );

      await expect(
        userRegistry.connect(owner).updateSelfProtocol(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should only allow admin to perform admin functions", async function () {
      const { userRegistry, user1 } = await loadFixture(
        deployUserRegistryFixture
      );

      await expect(userRegistry.connect(user1).pause()).to.be.reverted;
      await expect(
        userRegistry.connect(user1).updateSelfProtocol(user1.address)
      ).to.be.reverted;
    });
  });

  describe("Integration with Self Protocol", function () {
    it("Should handle verification status changes", async function () {
      const { userRegistry, selfProtocol, backend, user1 } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      // Initially verified
      let [registered, verified] = await userRegistry.getUserStatus(
        user1.address
      );
      expect(registered).to.be.true;
      expect(verified).to.be.true;

      // Revoke verification
      await selfProtocol.connect(backend).revokeVerification(user1.address);

      // Status should reflect revocation
      [registered, verified] = await userRegistry.getUserStatus(user1.address);
      expect(registered).to.be.true;
      expect(verified).to.be.false;

      // Re-verify
      await selfProtocol
        .connect(backend)
        .verifyUser(user1.address, "did:self:user1");

      // Status should reflect re-verification
      [registered, verified] = await userRegistry.getUserStatus(user1.address);
      expect(registered).to.be.true;
      expect(verified).to.be.true;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero address queries gracefully", async function () {
      const { userRegistry } = await loadFixture(deployUserRegistryFixture);

      const profile = await userRegistry.getUserProfile(ethers.ZeroAddress);
      expect(profile.userAddress).to.equal(ethers.ZeroAddress);
      expect(profile.isVerified).to.be.false;

      const stats = await userRegistry.getUserStats(ethers.ZeroAddress);
      expect(stats.blogsRead).to.equal(0);
      expect(stats.quizzesCompleted).to.equal(0);

      const badges = await userRegistry.getUserBadges(ethers.ZeroAddress);
      expect(badges).to.have.lengthOf(0);

      const [registered, verified] = await userRegistry.getUserStatus(
        ethers.ZeroAddress
      );
      expect(registered).to.be.false;
      expect(verified).to.be.false;
    });

    it("Should handle maximum username length", async function () {
      const { userRegistry, user1 } = await loadFixture(
        deployUserRegistryFixture
      );

      const maxUsername = "a".repeat(32);
      await userRegistry
        .connect(user1)
        .registerUser(maxUsername, "alice@test.com", "Alice's bio");

      const profile = await userRegistry.getUserProfile(user1.address);
      expect(profile.username).to.equal(maxUsername);
    });

    it("Should handle large statistics updates", async function () {
      const { userRegistry, user1, platform } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      const largeNumber = ethers.parseEther("1000000");
      await userRegistry
        .connect(platform)
        .updateStats(user1.address, "blogsRead", largeNumber);

      const stats = await userRegistry.getUserStats(user1.address);
      expect(stats.blogsRead).to.equal(largeNumber);
    });

    it("Should handle multiple badge awards efficiently", async function () {
      const { userRegistry, user1, platform } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      // Award many badges
      for (let i = 0; i < 50; i++) {
        await userRegistry
          .connect(platform)
          .awardBadge(user1.address, `Badge ${i}`);
      }

      const badges = await userRegistry.getUserBadges(user1.address);
      expect(badges).to.have.lengthOf(50);

      const stats = await userRegistry.getUserStats(user1.address);
      expect(stats.badgesEarned).to.equal(50);
    });

    it("Should maintain consistency after multiple operations", async function () {
      const { userRegistry, user1, platform } = await loadFixture(
        deployUserRegistryFixture
      );

      // Register user
      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      // Update profile multiple times
      await userRegistry
        .connect(user1)
        .updateProfile("alice1@test.com", "Bio 1", "avatar1");
      await userRegistry
        .connect(user1)
        .updateProfile("alice2@test.com", "Bio 2", "avatar2");

      // Update statistics multiple times
      await userRegistry
        .connect(platform)
        .updateStats(user1.address, "blogsRead", 1);
      await userRegistry
        .connect(platform)
        .updateStats(user1.address, "blogsRead", 2);
      await userRegistry
        .connect(platform)
        .updateStats(user1.address, "quizzesCompleted", 1);

      // Award badges
      await userRegistry.connect(platform).awardBadge(user1.address, "Badge 1");
      await userRegistry.connect(platform).awardBadge(user1.address, "Badge 2");

      // Verify final state
      const profile = await userRegistry.getUserProfile(user1.address);
      expect(profile.email).to.equal("alice2@test.com");
      expect(profile.bio).to.equal("Bio 2");
      expect(profile.avatarUrl).to.equal("avatar2");

      const stats = await userRegistry.getUserStats(user1.address);
      expect(stats.blogsRead).to.equal(3);
      expect(stats.quizzesCompleted).to.equal(1);

      const badges = await userRegistry.getUserBadges(user1.address);
      expect(badges).to.have.lengthOf(2);
    });
  });

  describe("Access Control", function () {
    it("Should prevent unauthorized access to platform functions", async function () {
      const { userRegistry, user1, user2, unauthorized } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      await expect(
        userRegistry
          .connect(unauthorized)
          .updateStats(user1.address, "blogsRead", 1)
      ).to.be.reverted;

      await expect(
        userRegistry.connect(unauthorized).awardBadge(user1.address, "Badge")
      ).to.be.reverted;

      await expect(
        userRegistry.connect(unauthorized).updateLastActive(user1.address)
      ).to.be.reverted;
    });

    it("Should prevent users from accessing other users' data inappropriately", async function () {
      const { userRegistry, user1, user2 } = await loadFixture(
        deployUserRegistryFixture
      );

      await userRegistry
        .connect(user1)
        .registerUser("alice", "alice@test.com", "Alice's bio");

      // Users can read other users' public data (this is expected behavior)
      const profile = await userRegistry.getUserProfile(user1.address);
      expect(profile.username).to.equal("alice");

      // But users cannot update other users' profiles
      await expect(
        userRegistry
          .connect(user2)
          .updateProfile("alice@test.com", "Bio", "avatar")
      ).to.be.revertedWithCustomError(userRegistry, "UserNotRegistered");
    });
  });
});
