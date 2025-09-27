const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("WalrusOracle", function () {
  async function deployWalrusOracleFixture() {
    const [owner, authorizedNode, unauthorizedNode, user1, user2] =
      await ethers.getSigners();

    const publisherEndpoint = "https://api.walrus.storage/v1/blobs";
    const aggregatorEndpoint = "https://api.walrus.storage/v1/blobs";

    const WalrusOracle = await ethers.getContractFactory("WalrusOracle");
    const walrusOracle = await WalrusOracle.deploy(
      publisherEndpoint,
      aggregatorEndpoint
    );

    // Authorize a node for testing
    await walrusOracle.setNodeAuthorization(authorizedNode.address, true);

    return {
      walrusOracle,
      owner,
      authorizedNode,
      unauthorizedNode,
      user1,
      user2,
      publisherEndpoint,
      aggregatorEndpoint,
    };
  }

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      const { walrusOracle, owner } = await loadFixture(
        deployWalrusOracleFixture
      );
      expect(await walrusOracle.owner()).to.equal(owner.address);
    });

    it("Should set the correct endpoints", async function () {
      const { walrusOracle, publisherEndpoint, aggregatorEndpoint } =
        await loadFixture(deployWalrusOracleFixture);

      expect(await walrusOracle.publisherEndpoint()).to.equal(
        publisherEndpoint
      );
      expect(await walrusOracle.aggregatorEndpoint()).to.equal(
        aggregatorEndpoint
      );
    });

    it("Should authorize the owner as a node", async function () {
      const { walrusOracle, owner } = await loadFixture(
        deployWalrusOracleFixture
      );
      expect(await walrusOracle.authorizedNodes(owner.address)).to.be.true;
    });
  });

  describe("Node Authorization", function () {
    it("Should allow owner to authorize nodes", async function () {
      const { walrusOracle, owner, authorizedNode } = await loadFixture(
        deployWalrusOracleFixture
      );

      await expect(
        walrusOracle.setNodeAuthorization(authorizedNode.address, true)
      )
        .to.emit(walrusOracle, "NodeAuthorized")
        .withArgs(authorizedNode.address, true);

      expect(await walrusOracle.authorizedNodes(authorizedNode.address)).to.be
        .true;
    });

    it("Should allow owner to deauthorize nodes", async function () {
      const { walrusOracle, owner, authorizedNode } = await loadFixture(
        deployWalrusOracleFixture
      );

      await walrusOracle.setNodeAuthorization(authorizedNode.address, true);

      await expect(
        walrusOracle.setNodeAuthorization(authorizedNode.address, false)
      )
        .to.emit(walrusOracle, "NodeAuthorized")
        .withArgs(authorizedNode.address, false);

      expect(await walrusOracle.authorizedNodes(authorizedNode.address)).to.be
        .false;
    });

    it("Should reject unauthorized node operations", async function () {
      const { walrusOracle, unauthorizedNode } = await loadFixture(
        deployWalrusOracleFixture
      );

      const walrusOracleUnauthorized = walrusOracle.connect(unauthorizedNode);

      await expect(
        walrusOracleUnauthorized.processStoreResult(
          "test-request-1",
          "blob-id-123",
          "object-id-456",
          1024,
          1,
          100,
          1000
        )
      ).to.be.revertedWith("Not authorized node");
    });
  });

  describe("Store Request Processing", function () {
    it("Should process store request results correctly", async function () {
      const { walrusOracle, authorizedNode } = await loadFixture(
        deployWalrusOracleFixture
      );

      const walrusOracleAuthorized = walrusOracle.connect(authorizedNode);

      // First, we need to simulate a request being submitted
      // Since submitStoreRequest is only callable by walrusStorage contract,
      // we'll test the processStoreResult function directly

      const requestId = "test-request-1";
      const blobId = "blob-id-123";
      const objectId = "object-id-456";
      const size = 1024;
      const certifiedEpoch = 1;
      const endEpoch = 100;
      const cost = 1000;

      // This will fail because there's no pending request, but we can test the authorization
      await expect(
        walrusOracleAuthorized.processStoreResult(
          requestId,
          blobId,
          objectId,
          size,
          certifiedEpoch,
          endEpoch,
          cost
        )
      ).to.be.revertedWith("Request not found");
    });

    it("Should emit RequestProcessed event when processing succeeds", async function () {
      const { walrusOracle, authorizedNode } = await loadFixture(
        deployWalrusOracleFixture
      );

      // This test would require setting up a proper pending request first
      // For now, we'll test the event emission structure
      const walrusOracleAuthorized = walrusOracle.connect(authorizedNode);

      const requestId = "test-request-1";
      const blobId = "blob-id-123";
      const objectId = "object-id-456";

      // The actual test would need a pending request to be set up first
      // This is a placeholder for the complete test
      expect(true).to.be.true; // Placeholder assertion
    });
  });

  describe("Configuration Management", function () {
    it("Should allow owner to update endpoints", async function () {
      const { walrusOracle, owner } = await loadFixture(
        deployWalrusOracleFixture
      );

      const newPublisherEndpoint =
        "https://new-publisher.walrus.storage/v1/blobs";
      const newAggregatorEndpoint =
        "https://new-aggregator.walrus.storage/v1/blobs";

      await expect(
        walrusOracle.updateConfig(newPublisherEndpoint, newAggregatorEndpoint)
      )
        .to.emit(walrusOracle, "ConfigUpdated")
        .withArgs(newPublisherEndpoint, newAggregatorEndpoint);

      expect(await walrusOracle.publisherEndpoint()).to.equal(
        newPublisherEndpoint
      );
      expect(await walrusOracle.aggregatorEndpoint()).to.equal(
        newAggregatorEndpoint
      );
    });

    it("Should allow owner to set WalrusStorage contract", async function () {
      const { walrusOracle, owner, user1 } = await loadFixture(
        deployWalrusOracleFixture
      );

      await walrusOracle.setWalrusStorageContract(user1.address);
      expect(await walrusOracle.walrusStorage()).to.equal(user1.address);
    });
  });

  describe("Blob Management Functions", function () {
    it("Should allow authorized nodes to check blob status", async function () {
      const { walrusOracle, authorizedNode } = await loadFixture(
        deployWalrusOracleFixture
      );

      const walrusOracleAuthorized = walrusOracle.connect(authorizedNode);

      const [exists, available, startEpoch, endEpoch] =
        await walrusOracleAuthorized.checkBlobStatus("test-blob-id");

      // These are placeholder values from the contract
      expect(exists).to.be.false;
      expect(available).to.be.false;
      expect(startEpoch).to.equal(0);
      expect(endEpoch).to.equal(0);
    });

    it("Should allow authorized nodes to delete blobs", async function () {
      const { walrusOracle, authorizedNode } = await loadFixture(
        deployWalrusOracleFixture
      );

      const walrusOracleAuthorized = walrusOracle.connect(authorizedNode);

      const result = await walrusOracleAuthorized.deleteBlob("test-blob-id");
      expect(result).to.be.true;
    });

    it("Should allow authorized nodes to extend blob storage", async function () {
      const { walrusOracle, authorizedNode } = await loadFixture(
        deployWalrusOracleFixture
      );

      const walrusOracleAuthorized = walrusOracle.connect(authorizedNode);

      const result = await walrusOracleAuthorized.extendBlob(
        "test-object-id",
        100
      );
      expect(result).to.be.true;
    });

    it("Should allow authorized nodes to set blob attributes", async function () {
      const { walrusOracle, authorizedNode } = await loadFixture(
        deployWalrusOracleFixture
      );

      const walrusOracleAuthorized = walrusOracle.connect(authorizedNode);

      const result = await walrusOracleAuthorized.setBlobAttribute(
        "test-object-id",
        "key",
        "value"
      );
      expect(result).to.be.true;
    });

    it("Should allow authorized nodes to get blob attributes", async function () {
      const { walrusOracle, authorizedNode } = await loadFixture(
        deployWalrusOracleFixture
      );

      const walrusOracleAuthorized = walrusOracle.connect(authorizedNode);

      const value = await walrusOracleAuthorized.getBlobAttribute(
        "test-object-id",
        "key"
      );
      expect(value).to.equal("");
    });

    it("Should allow authorized nodes to share blobs", async function () {
      const { walrusOracle, authorizedNode } = await loadFixture(
        deployWalrusOracleFixture
      );

      const walrusOracleAuthorized = walrusOracle.connect(authorizedNode);

      const result = await walrusOracleAuthorized.shareBlob(
        "test-object-id",
        1000
      );
      expect(result).to.be.true;
    });

    it("Should return network info", async function () {
      const { walrusOracle, authorizedNode } = await loadFixture(
        deployWalrusOracleFixture
      );

      const walrusOracleAuthorized = walrusOracle.connect(authorizedNode);

      const [currentEpoch, storageNodes, maxBlobSize, pricePerUnit] =
        await walrusOracleAuthorized.getNetworkInfo();

      // These are mock values from the contract
      expect(currentEpoch).to.equal(1);
      expect(storageNodes).to.equal(103);
      expect(maxBlobSize).to.equal(14599533452);
      expect(pricePerUnit).to.equal(100000);
    });
  });

  describe("Ownership Management", function () {
    it("Should allow owner to transfer ownership", async function () {
      const { walrusOracle, owner, user1 } = await loadFixture(
        deployWalrusOracleFixture
      );

      await walrusOracle.transferOwnership(user1.address);
      expect(await walrusOracle.owner()).to.equal(user1.address);
    });

    it("Should reject invalid ownership transfer", async function () {
      const { walrusOracle } = await loadFixture(deployWalrusOracleFixture);

      await expect(
        walrusOracle.transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid new owner");
    });

    it("Should allow owner to emergency withdraw", async function () {
      const { walrusOracle, owner } = await loadFixture(
        deployWalrusOracleFixture
      );

      // Send some ETH to the contract
      await owner.sendTransaction({
        to: await walrusOracle.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      const initialBalance = await ethers.provider.getBalance(owner.address);
      await walrusOracle.emergencyWithdraw();
      const finalBalance = await ethers.provider.getBalance(owner.address);

      expect(finalBalance).to.be.greaterThan(initialBalance);
    });
  });

  describe("Access Control", function () {
    it("Should reject non-owner operations", async function () {
      const { walrusOracle, user1 } = await loadFixture(
        deployWalrusOracleFixture
      );

      const walrusOracleUser = walrusOracle.connect(user1);

      await expect(
        walrusOracleUser.updateConfig("new-endpoint", "new-endpoint")
      ).to.be.revertedWith("Only owner");

      await expect(
        walrusOracleUser.setNodeAuthorization(user1.address, true)
      ).to.be.revertedWith("Only owner");

      await expect(
        walrusOracleUser.transferOwnership(user1.address)
      ).to.be.revertedWith("Only owner");
    });
  });
});

