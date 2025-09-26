const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("SelfProtocolIntegration", function () {
  async function deploySelfProtocolFixture() {
    const [owner, backend1, backend2, user1, user2, user3] =
      await ethers.getSigners();

    const SelfProtocol = await ethers.getContractFactory(
      "SelfProtocolIntegration"
    );
    const selfProtocol = await SelfProtocol.deploy();

    // Grant backend role to backend1
    await selfProtocol.grantRole(
      await selfProtocol.BACKEND_ROLE(),
      backend1.address
    );

    return {
      selfProtocol,
      owner,
      backend1,
      backend2,
      user1,
      user2,
      user3,
    };
  }

  describe("Deployment", function () {
    it("Should deploy with correct initial values", async function () {
      const { selfProtocol, owner } = await loadFixture(
        deploySelfProtocolFixture
      );

      expect(
        await selfProtocol.hasRole(
          await selfProtocol.DEFAULT_ADMIN_ROLE(),
          owner.address
        )
      ).to.be.true;
      expect(
        await selfProtocol.hasRole(
          await selfProtocol.ADMIN_ROLE(),
          owner.address
        )
      ).to.be.true;
      expect(
        await selfProtocol.hasRole(
          await selfProtocol.BACKEND_ROLE(),
          owner.address
        )
      ).to.be.true;
      expect(await selfProtocol.paused()).to.be.false;
    });

    it("Should set correct owner address", async function () {
      const { selfProtocol, owner } = await loadFixture(
        deploySelfProtocolFixture
      );

      // The contract should set msg.sender as owner
      expect(
        await selfProtocol.hasRole(
          await selfProtocol.DEFAULT_ADMIN_ROLE(),
          owner.address
        )
      ).to.be.true;
    });
  });

  describe("User Verification", function () {
    it("Should allow backend to verify users", async function () {
      const { selfProtocol, backend1, user1 } = await loadFixture(
        deploySelfProtocolFixture
      );

      await expect(
        selfProtocol
          .connect(backend1)
          .verifyUser(user1.address, "did:self:user1")
      ).to.emit(selfProtocol, "UserVerified");

      expect(await selfProtocol.isUserVerified(user1.address)).to.be.true;
      expect(await selfProtocol.isVerifiedHuman(user1.address)).to.be.true;
    });

    it("Should store user DID correctly", async function () {
      const { selfProtocol, backend1, user1 } = await loadFixture(
        deploySelfProtocolFixture
      );

      await selfProtocol
        .connect(backend1)
        .verifyUser(user1.address, "did:self:user1");

      const [verified, did, timestamp] = await selfProtocol.getUserVerification(
        user1.address
      );
      expect(verified).to.be.true;
      expect(did).to.equal("did:self:user1");
      expect(timestamp).to.be.greaterThan(0);

      expect(await selfProtocol.didToAddress("did:self:user1")).to.equal(
        user1.address
      );
      expect(await selfProtocol.getAddressByDID("did:self:user1")).to.equal(
        user1.address
      );
    });

    it("Should allow verification without DID", async function () {
      const { selfProtocol, backend1, user1 } = await loadFixture(
        deploySelfProtocolFixture
      );

      await selfProtocol.connect(backend1).verifyUser(user1.address, "");

      expect(await selfProtocol.isUserVerified(user1.address)).to.be.true;

      const [verified, did, timestamp] = await selfProtocol.getUserVerification(
        user1.address
      );
      expect(verified).to.be.true;
      expect(did).to.equal("");
      expect(timestamp).to.be.greaterThan(0);
    });

    it("Should prevent duplicate verification", async function () {
      const { selfProtocol, backend1, user1 } = await loadFixture(
        deploySelfProtocolFixture
      );

      await selfProtocol
        .connect(backend1)
        .verifyUser(user1.address, "did:self:user1");

      await expect(
        selfProtocol
          .connect(backend1)
          .verifyUser(user1.address, "did:self:user1-2")
      ).to.be.revertedWithCustomError(selfProtocol, "UserAlreadyVerified");
    });

    it("Should prevent duplicate DIDs", async function () {
      const { selfProtocol, backend1, user1, user2 } = await loadFixture(
        deploySelfProtocolFixture
      );

      await selfProtocol
        .connect(backend1)
        .verifyUser(user1.address, "did:self:duplicate");

      await expect(
        selfProtocol
          .connect(backend1)
          .verifyUser(user2.address, "did:self:duplicate")
      ).to.be.revertedWithCustomError(selfProtocol, "InvalidDID");
    });

    it("Should only allow backend role to verify users", async function () {
      const { selfProtocol, user1, user2 } = await loadFixture(
        deploySelfProtocolFixture
      );

      await expect(
        selfProtocol
          .connect(user1)
          .verifyUser(user2.address, "did:self:unauthorized")
      ).to.be.reverted;
    });

    it("Should not allow verification when paused", async function () {
      const { selfProtocol, backend1, user1, owner } = await loadFixture(
        deploySelfProtocolFixture
      );

      await selfProtocol.connect(owner).pause();

      await expect(
        selfProtocol
          .connect(backend1)
          .verifyUser(user1.address, "did:self:paused")
      ).to.be.reverted;
    });
  });

  describe("Batch Verification", function () {
    it("Should allow batch verification of users", async function () {
      const { selfProtocol, backend1, user1, user2, user3 } = await loadFixture(
        deploySelfProtocolFixture
      );

      const users = [user1.address, user2.address, user3.address];
      const dids = ["did:self:user1", "did:self:user2", "did:self:user3"];

      await selfProtocol.connect(backend1).batchVerifyUsers(users, dids);

      expect(await selfProtocol.isUserVerified(user1.address)).to.be.true;
      expect(await selfProtocol.isUserVerified(user2.address)).to.be.true;
      expect(await selfProtocol.isUserVerified(user3.address)).to.be.true;

      expect(await selfProtocol.userDID(user1.address)).to.equal(
        "did:self:user1"
      );
      expect(await selfProtocol.userDID(user2.address)).to.equal(
        "did:self:user2"
      );
      expect(await selfProtocol.userDID(user3.address)).to.equal(
        "did:self:user3"
      );
    });

    it("Should handle batch verification with mixed DIDs", async function () {
      const { selfProtocol, backend1, user1, user2 } = await loadFixture(
        deploySelfProtocolFixture
      );

      const users = [user1.address, user2.address];
      const dids = ["did:self:user1", ""]; // Second user has no DID

      await selfProtocol.connect(backend1).batchVerifyUsers(users, dids);

      expect(await selfProtocol.isUserVerified(user1.address)).to.be.true;
      expect(await selfProtocol.isUserVerified(user2.address)).to.be.true;

      expect(await selfProtocol.userDID(user1.address)).to.equal(
        "did:self:user1"
      );
      expect(await selfProtocol.userDID(user2.address)).to.equal("");
    });

    it("Should reject batch verification with mismatched arrays", async function () {
      const { selfProtocol, backend1, user1, user2 } = await loadFixture(
        deploySelfProtocolFixture
      );

      const users = [user1.address, user2.address];
      const dids = ["did:self:user1"]; // Mismatched length

      await expect(
        selfProtocol.connect(backend1).batchVerifyUsers(users, dids)
      ).to.be.revertedWith("Array length mismatch");
    });

    it("Should skip already verified users in batch", async function () {
      const { selfProtocol, backend1, user1, user2 } = await loadFixture(
        deploySelfProtocolFixture
      );

      // Verify user1 first
      await selfProtocol
        .connect(backend1)
        .verifyUser(user1.address, "did:self:user1");

      const users = [user1.address, user2.address];
      const dids = ["did:self:user1-new", "did:self:user2"];

      // Should not fail, just skip user1
      await selfProtocol.connect(backend1).batchVerifyUsers(users, dids);

      // user1 should still have original DID
      expect(await selfProtocol.userDID(user1.address)).to.equal(
        "did:self:user1"
      );
      expect(await selfProtocol.userDID(user2.address)).to.equal(
        "did:self:user2"
      );
    });

    it("Should only allow backend role for batch verification", async function () {
      const { selfProtocol, user1, user2, user3 } = await loadFixture(
        deploySelfProtocolFixture
      );

      const users = [user1.address, user2.address];
      const dids = ["did:self:user1", "did:self:user2"];

      await expect(selfProtocol.connect(user3).batchVerifyUsers(users, dids)).to
        .be.reverted;
    });

    it("Should not allow batch verification when paused", async function () {
      const { selfProtocol, backend1, user1, user2, owner } = await loadFixture(
        deploySelfProtocolFixture
      );

      await selfProtocol.connect(owner).pause();

      const users = [user1.address, user2.address];
      const dids = ["did:self:user1", "did:self:user2"];

      await expect(selfProtocol.connect(backend1).batchVerifyUsers(users, dids))
        .to.be.reverted;
    });
  });

  describe("Verification Revocation", function () {
    it("Should allow admin to revoke verification", async function () {
      const { selfProtocol, backend1, user1, owner } = await loadFixture(
        deploySelfProtocolFixture
      );

      await selfProtocol
        .connect(backend1)
        .verifyUser(user1.address, "did:self:user1");
      expect(await selfProtocol.isUserVerified(user1.address)).to.be.true;

      await expect(
        selfProtocol.connect(owner).revokeVerification(user1.address)
      )
        .to.emit(selfProtocol, "VerificationRevoked")
        .withArgs(user1.address, "did:self:user1");

      expect(await selfProtocol.isUserVerified(user1.address)).to.be.false;
      expect(await selfProtocol.userDID(user1.address)).to.equal("");
      expect(await selfProtocol.didToAddress("did:self:user1")).to.equal(
        ethers.ZeroAddress
      );
    });

    it("Should handle revocation without DID", async function () {
      const { selfProtocol, backend1, user1, owner } = await loadFixture(
        deploySelfProtocolFixture
      );

      await selfProtocol.connect(backend1).verifyUser(user1.address, "");

      await expect(
        selfProtocol.connect(owner).revokeVerification(user1.address)
      )
        .to.emit(selfProtocol, "VerificationRevoked")
        .withArgs(user1.address, "");

      expect(await selfProtocol.isUserVerified(user1.address)).to.be.false;
    });

    it("Should reject revocation of non-verified users", async function () {
      const { selfProtocol, user1, owner } = await loadFixture(
        deploySelfProtocolFixture
      );

      await expect(
        selfProtocol.connect(owner).revokeVerification(user1.address)
      ).to.be.revertedWithCustomError(selfProtocol, "UserNotVerified");
    });

    it("Should only allow admin role to revoke verification", async function () {
      const { selfProtocol, backend1, user1, user2 } = await loadFixture(
        deploySelfProtocolFixture
      );

      await selfProtocol
        .connect(backend1)
        .verifyUser(user1.address, "did:self:user1");

      await expect(
        selfProtocol.connect(user2).revokeVerification(user1.address)
      ).to.be.reverted;
    });
  });

  describe("Backend Management", function () {
    it("Should allow admin to update backend", async function () {
      const { selfProtocol, backend1, backend2, owner } = await loadFixture(
        deploySelfProtocolFixture
      );

      await expect(
        selfProtocol
          .connect(owner)
          .updateBackend(backend1.address, backend2.address)
      )
        .to.emit(selfProtocol, "BackendUpdated")
        .withArgs(backend1.address, backend2.address);

      expect(
        await selfProtocol.hasRole(
          await selfProtocol.BACKEND_ROLE(),
          backend1.address
        )
      ).to.be.false;
      expect(
        await selfProtocol.hasRole(
          await selfProtocol.BACKEND_ROLE(),
          backend2.address
        )
      ).to.be.true;
      expect(await selfProtocol.isBackend(backend2.address)).to.be.true;
    });

    it("Should reject zero address for new backend", async function () {
      const { selfProtocol, backend1, owner } = await loadFixture(
        deploySelfProtocolFixture
      );

      await expect(
        selfProtocol
          .connect(owner)
          .updateBackend(backend1.address, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid backend address");
    });

    it("Should reject update if old backend doesn't exist", async function () {
      const { selfProtocol, backend1, backend2, owner } = await loadFixture(
        deploySelfProtocolFixture
      );

      await expect(
        selfProtocol
          .connect(owner)
          .updateBackend(backend2.address, backend1.address)
      ).to.be.revertedWith("Old backend not found");
    });

    it("Should only allow admin to update backend", async function () {
      const { selfProtocol, backend1, backend2, user1 } = await loadFixture(
        deploySelfProtocolFixture
      );

      await expect(
        selfProtocol
          .connect(user1)
          .updateBackend(backend1.address, backend2.address)
      ).to.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return correct verification status", async function () {
      const { selfProtocol, backend1, user1, user2 } = await loadFixture(
        deploySelfProtocolFixture
      );

      // Unverified user
      expect(await selfProtocol.isUserVerified(user1.address)).to.be.false;
      expect(await selfProtocol.isCredentialValid(user1.address)).to.be.false;
      expect(await selfProtocol.canUserParticipate(user1.address)).to.be.false;

      // Verify user
      await selfProtocol
        .connect(backend1)
        .verifyUser(user1.address, "did:self:user1");

      expect(await selfProtocol.isUserVerified(user1.address)).to.be.true;
      expect(await selfProtocol.isCredentialValid(user1.address)).to.be.true;
      expect(await selfProtocol.canUserParticipate(user1.address)).to.be.true;

      // user2 should still be unverified
      expect(await selfProtocol.isUserVerified(user2.address)).to.be.false;
    });

    it("Should return correct user verification details", async function () {
      const { selfProtocol, backend1, user1 } = await loadFixture(
        deploySelfProtocolFixture
      );

      // Before verification
      let [verified, did, timestamp] = await selfProtocol.getUserVerification(
        user1.address
      );
      expect(verified).to.be.false;
      expect(did).to.equal("");
      expect(timestamp).to.equal(0);

      // After verification
      await selfProtocol
        .connect(backend1)
        .verifyUser(user1.address, "did:self:user1");

      [verified, did, timestamp] = await selfProtocol.getUserVerification(
        user1.address
      );
      expect(verified).to.be.true;
      expect(did).to.equal("did:self:user1");
      expect(timestamp).to.be.greaterThan(0);
    });

    it("Should handle DID lookups correctly", async function () {
      const { selfProtocol, backend1, user1, user2 } = await loadFixture(
        deploySelfProtocolFixture
      );

      await selfProtocol
        .connect(backend1)
        .verifyUser(user1.address, "did:self:user1");
      await selfProtocol.connect(backend1).verifyUser(user2.address, "");

      expect(await selfProtocol.getAddressByDID("did:self:user1")).to.equal(
        user1.address
      );
      expect(
        await selfProtocol.getAddressByDID("did:self:nonexistent")
      ).to.equal(ethers.ZeroAddress);
      expect(await selfProtocol.didToAddress("did:self:user1")).to.equal(
        user1.address
      );
    });

    it("Should return correct backend status", async function () {
      const { selfProtocol, backend1, backend2, owner } = await loadFixture(
        deploySelfProtocolFixture
      );

      expect(await selfProtocol.isBackend(backend1.address)).to.be.true;
      expect(await selfProtocol.isBackend(backend2.address)).to.be.false;
      expect(await selfProtocol.isBackend(owner.address)).to.be.true; // Owner also has backend role
    });
  });

  describe("Verification Statistics", function () {
    it("Should calculate verification statistics correctly", async function () {
      const { selfProtocol, backend1, user1, user2, user3 } = await loadFixture(
        deploySelfProtocolFixture
      );

      // Verify some users
      await selfProtocol
        .connect(backend1)
        .verifyUser(user1.address, "did:self:user1");
      await selfProtocol
        .connect(backend1)
        .verifyUser(user3.address, "did:self:user3");

      const addresses = [user1.address, user2.address, user3.address];
      const stats = await selfProtocol.getVerificationStats(0, 3, addresses);

      expect(stats).to.equal(2); // user1 and user3 are verified
    });

    it("Should handle partial range statistics", async function () {
      const { selfProtocol, backend1, user1, user2, user3 } = await loadFixture(
        deploySelfProtocolFixture
      );

      await selfProtocol
        .connect(backend1)
        .verifyUser(user1.address, "did:self:user1");
      await selfProtocol
        .connect(backend1)
        .verifyUser(user2.address, "did:self:user2");

      const addresses = [user1.address, user2.address, user3.address];

      // Check only first 2
      const stats1 = await selfProtocol.getVerificationStats(0, 2, addresses);
      expect(stats1).to.equal(2);

      // Check only last 2
      const stats2 = await selfProtocol.getVerificationStats(1, 3, addresses);
      expect(stats2).to.equal(1); // Only user2 is verified in this range
    });

    it("Should reject invalid ranges", async function () {
      const { selfProtocol, user1 } = await loadFixture(
        deploySelfProtocolFixture
      );

      const addresses = [user1.address];

      await expect(
        selfProtocol.getVerificationStats(0, 2, addresses)
      ).to.be.revertedWith("Invalid range");

      await expect(
        selfProtocol.getVerificationStats(2, 1, addresses)
      ).to.be.revertedWith("Invalid range");
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow admin to pause and unpause", async function () {
      const { selfProtocol, owner } = await loadFixture(
        deploySelfProtocolFixture
      );

      await selfProtocol.connect(owner).pause();
      expect(await selfProtocol.paused()).to.be.true;

      await selfProtocol.connect(owner).unpause();
      expect(await selfProtocol.paused()).to.be.false;
    });

    it("Should prevent verification when paused", async function () {
      const { selfProtocol, backend1, user1, owner } = await loadFixture(
        deploySelfProtocolFixture
      );

      await selfProtocol.connect(owner).pause();

      await expect(
        selfProtocol
          .connect(backend1)
          .verifyUser(user1.address, "did:self:paused")
      ).to.be.reverted;

      await expect(
        selfProtocol
          .connect(backend1)
          .batchVerifyUsers([user1.address], ["did:self:paused"])
      ).to.be.reverted;
    });

    it("Should allow view functions when paused", async function () {
      const { selfProtocol, backend1, user1, owner } = await loadFixture(
        deploySelfProtocolFixture
      );

      // Verify user first
      await selfProtocol
        .connect(backend1)
        .verifyUser(user1.address, "did:self:user1");

      // Pause contract
      await selfProtocol.connect(owner).pause();

      // View functions should still work
      expect(await selfProtocol.isUserVerified(user1.address)).to.be.true;
      expect(await selfProtocol.getUserVerification(user1.address)).to.not.be
        .null;
    });

    it("Should only allow admin to pause/unpause", async function () {
      const { selfProtocol, user1 } = await loadFixture(
        deploySelfProtocolFixture
      );

      await expect(selfProtocol.connect(user1).pause()).to.be.reverted;
      await expect(selfProtocol.connect(user1).unpause()).to.be.reverted;
    });
  });

  describe("Access Control", function () {
    it("Should prevent non-admins from admin functions", async function () {
      const { selfProtocol, backend1, user1, user2 } = await loadFixture(
        deploySelfProtocolFixture
      );

      await expect(
        selfProtocol.connect(user1).revokeVerification(user2.address)
      ).to.be.reverted;

      await expect(
        selfProtocol
          .connect(user1)
          .updateBackend(backend1.address, user2.address)
      ).to.be.reverted;

      await expect(selfProtocol.connect(user1).pause()).to.be.reverted;
    });

    it("Should prevent non-backends from verification functions", async function () {
      const { selfProtocol, user1, user2 } = await loadFixture(
        deploySelfProtocolFixture
      );

      await expect(
        selfProtocol
          .connect(user1)
          .verifyUser(user2.address, "did:self:unauthorized")
      ).to.be.reverted;

      await expect(
        selfProtocol
          .connect(user1)
          .batchVerifyUsers([user2.address], ["did:self:unauthorized"])
      ).to.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle empty DID strings consistently", async function () {
      const { selfProtocol, backend1, user1, user2 } = await loadFixture(
        deploySelfProtocolFixture
      );

      await selfProtocol.connect(backend1).verifyUser(user1.address, "");
      await selfProtocol.connect(backend1).verifyUser(user2.address, "   "); // Spaces

      expect(await selfProtocol.isUserVerified(user1.address)).to.be.true;
      expect(await selfProtocol.isUserVerified(user2.address)).to.be.true;

      expect(await selfProtocol.userDID(user1.address)).to.equal("");
      expect(await selfProtocol.userDID(user2.address)).to.equal("   ");
    });

    it("Should handle maximum length DIDs", async function () {
      const { selfProtocol, backend1, user1 } = await loadFixture(
        deploySelfProtocolFixture
      );

      const longDID = "did:self:" + "a".repeat(1000);
      await selfProtocol.connect(backend1).verifyUser(user1.address, longDID);

      expect(await selfProtocol.userDID(user1.address)).to.equal(longDID);
      expect(await selfProtocol.getAddressByDID(longDID)).to.equal(
        user1.address
      );
    });

    it("Should handle zero address queries gracefully", async function () {
      const { selfProtocol } = await loadFixture(deploySelfProtocolFixture);

      expect(await selfProtocol.isUserVerified(ethers.ZeroAddress)).to.be.false;
      expect(await selfProtocol.canUserParticipate(ethers.ZeroAddress)).to.be
        .false;

      const [verified, did, timestamp] = await selfProtocol.getUserVerification(
        ethers.ZeroAddress
      );
      expect(verified).to.be.false;
      expect(did).to.equal("");
      expect(timestamp).to.equal(0);
    });

    it("Should handle large batch verifications", async function () {
      const { selfProtocol, backend1 } = await loadFixture(
        deploySelfProtocolFixture
      );

      // Create 50 test addresses
      const users = [];
      const dids = [];
      for (let i = 0; i < 50; i++) {
        users.push(ethers.Wallet.createRandom().address);
        dids.push(`did:self:batch${i}`);
      }

      await selfProtocol.connect(backend1).batchVerifyUsers(users, dids);

      // Check some random ones
      expect(await selfProtocol.isUserVerified(users[0])).to.be.true;
      expect(await selfProtocol.isUserVerified(users[25])).to.be.true;
      expect(await selfProtocol.isUserVerified(users[49])).to.be.true;
    });

    it("Should maintain state consistency after multiple operations", async function () {
      const { selfProtocol, backend1, user1, owner } = await loadFixture(
        deploySelfProtocolFixture
      );

      // Verify
      await selfProtocol
        .connect(backend1)
        .verifyUser(user1.address, "did:self:user1");
      expect(await selfProtocol.isUserVerified(user1.address)).to.be.true;

      // Revoke
      await selfProtocol.connect(owner).revokeVerification(user1.address);
      expect(await selfProtocol.isUserVerified(user1.address)).to.be.false;
      expect(await selfProtocol.getAddressByDID("did:self:user1")).to.equal(
        ethers.ZeroAddress
      );

      // Re-verify with same DID should work
      await selfProtocol
        .connect(backend1)
        .verifyUser(user1.address, "did:self:user1");
      expect(await selfProtocol.isUserVerified(user1.address)).to.be.true;
      expect(await selfProtocol.getAddressByDID("did:self:user1")).to.equal(
        user1.address
      );
    });
  });
});
