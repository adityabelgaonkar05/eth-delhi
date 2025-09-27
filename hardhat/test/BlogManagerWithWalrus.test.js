const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
  time,
  mine,
} = require("@nomicfoundation/hardhat-network-helpers");

describe("BlogManagerWithWalrus", function () {
  // Test constants
  const BLOG_CONTENT =
    "This is a test blog post content with some meaningful text that demonstrates the blog functionality.";
  const BLOG_TITLE = "Test Blog Post";
  const COMMENT_CONTENT = "This is a test comment on the blog post.";
  const PREMIUM_PRICE = ethers.parseEther("1");
  const PUBLISHING_FEE = ethers.parseEther("100");

  async function deployBlogManagerFixture() {
    const [owner, author, reader, commenter, admin] = await ethers.getSigners();

    // Deploy SelfProtocolIntegration first (no arguments)
    const SelfProtocolIntegration = await ethers.getContractFactory(
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

    const selfProtocol = await SelfProtocolIntegration.deploy(
      "cryptoverse-app",
      "https://developer.selfprotocol.com",
      verificationConfig
    );

    // Deploy CryptoVerseToken (no arguments needed for UserRegistry test)
    const CryptoVerseToken = await ethers.getContractFactory(
      "CryptoVerseToken"
    );
    const cvrsToken = await CryptoVerseToken.deploy();

    // Deploy UserRegistry (needs selfProtocol and cvrsToken addresses)
    const UserRegistry = await ethers.getContractFactory("UserRegistry");
    const userRegistry = await UserRegistry.deploy(
      await selfProtocol.getAddress(),
      await cvrsToken.getAddress()
    );

    // Deploy WalrusStorage mock
    const WalrusStorage = await ethers.getContractFactory("WalrusStorage");
    const walrusStorage = await WalrusStorage.deploy();

    // Deploy BlogManagerWithWalrus
    const BlogManagerWithWalrus = await ethers.getContractFactory(
      "BlogManagerWithWalrus"
    );
    const blogManager = await BlogManagerWithWalrus.deploy(
      await userRegistry.getAddress(),
      await selfProtocol.getAddress(),
      await walrusStorage.getAddress()
    );

    // Set up initial verification for test accounts
    await selfProtocol.verifyHuman(author.address, "test-did-author");
    await selfProtocol.verifyHuman(reader.address, "test-did-reader");
    await selfProtocol.verifyHuman(commenter.address, "test-did-commenter");

    // Grant admin role
    await blogManager.grantRole(await blogManager.ADMIN_ROLE(), admin.address);

    return {
      blogManager,
      userRegistry,
      selfProtocol,
      walrusStorage,
      cvrsToken,
      owner,
      author,
      reader,
      commenter,
      admin,
    };
  }

  async function createSampleBlog(
    blogManager,
    author,
    walrusStorage,
    isPremium = false
  ) {
    const blogContent = ethers.toUtf8Bytes(BLOG_CONTENT);
    const metadata = {
      description: "A test blog post for unit testing",
      tags: ["test", "blockchain", "web3"],
      category: "Technology",
      thumbnailBlobId: "",
      estimatedReadTime: 5,
      language: "en",
      allowComments: true,
      premiumPrice: isPremium ? PREMIUM_PRICE : 0,
    };

    const storageTier = 1; // PERSISTENT
    const storageCost = await walrusStorage.calculateStorageCost(
      blogContent.length,
      storageTier
    );
    const totalCost = PUBLISHING_FEE + storageCost;

    await blogManager.connect(author).publishBlog(
      BLOG_TITLE,
      blogContent,
      metadata,
      isPremium,
      storageTier,
      { value: totalCost + ethers.parseEther("0.1") } // Extra for metadata
    );

    return { blogContent, metadata, storageCost, totalCost };
  }

  describe("Deployment", function () {
    it("Should deploy with correct initial values", async function () {
      const { blogManager, userRegistry, selfProtocol, walrusStorage, owner } =
        await loadFixture(deployBlogManagerFixture);

      expect(await blogManager.userRegistry()).to.equal(
        await userRegistry.getAddress()
      );
      expect(await blogManager.selfProtocol()).to.equal(
        await selfProtocol.getAddress()
      );
      expect(await blogManager.walrusStorage()).to.equal(
        await walrusStorage.getAddress()
      );
      expect(await blogManager.nextBlogId()).to.equal(1);
      expect(await blogManager.nextCommentId()).to.equal(1);
      expect(await blogManager.totalBlogs()).to.equal(0);
      expect(await blogManager.publishingFee()).to.equal(PUBLISHING_FEE);
      expect(
        await blogManager.hasRole(
          await blogManager.DEFAULT_ADMIN_ROLE(),
          owner.address
        )
      ).to.be.true;
    });

    it("Should revert if deployed with zero addresses", async function () {
      const BlogManagerWithWalrus = await ethers.getContractFactory(
        "BlogManagerWithWalrus"
      );

      await expect(
        BlogManagerWithWalrus.deploy(
          ethers.ZeroAddress,
          ethers.ZeroAddress,
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("UserRegistry address cannot be zero");
    });
  });

  describe("Blog Publishing", function () {
    it("Should publish a regular blog successfully", async function () {
      const { blogManager, author, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await expect(createSampleBlog(blogManager, author, walrusStorage)).to.not
        .be.reverted;

      expect(await blogManager.totalBlogs()).to.equal(1);
      expect(await blogManager.nextBlogId()).to.equal(2);

      const blog = await blogManager.blogPosts(1);
      expect(blog.id).to.equal(1);
      expect(blog.author).to.equal(author.address);
      expect(blog.title).to.equal(BLOG_TITLE);
      expect(blog.isActive).to.be.true;
      expect(blog.isPremium).to.be.false;
    });

    it("Should publish a premium blog successfully", async function () {
      const { blogManager, author, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage, true);

      const blog = await blogManager.blogPosts(1);
      expect(blog.isPremium).to.be.true;

      const metadata = await blogManager.blogMetadata(1);
      expect(metadata.premiumPrice).to.equal(PREMIUM_PRICE);
    });

    it("Should emit BlogPublished event", async function () {
      const { blogManager, author, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      const blogContent = ethers.toUtf8Bytes(BLOG_CONTENT);
      const metadata = {
        description: "Test description",
        tags: ["test"],
        category: "Technology",
        thumbnailBlobId: "",
        estimatedReadTime: 5,
        language: "en",
        allowComments: true,
        premiumPrice: 0,
      };

      const storageTier = 1;
      const storageCost = await walrusStorage.calculateStorageCost(
        blogContent.length,
        storageTier
      );
      const totalCost = PUBLISHING_FEE + storageCost;

      await expect(
        blogManager
          .connect(author)
          .publishBlog(BLOG_TITLE, blogContent, metadata, false, storageTier, {
            value: totalCost + ethers.parseEther("0.1"),
          })
      )
        .to.emit(blogManager, "BlogPublished")
        .withArgs(1, author.address, BLOG_TITLE, "blob_1", "blob_2");
    });

    it("Should revert if user is not verified", async function () {
      const { blogManager, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );
      const [, , , , unverifiedUser] = await ethers.getSigners();

      const blogContent = ethers.toUtf8Bytes(BLOG_CONTENT);
      const metadata = {
        description: "Test",
        tags: ["test"],
        category: "Tech",
        thumbnailBlobId: "",
        estimatedReadTime: 5,
        language: "en",
        allowComments: true,
        premiumPrice: 0,
      };

      await expect(
        blogManager
          .connect(unverifiedUser)
          .publishBlog(BLOG_TITLE, blogContent, metadata, false, 1, {
            value: ethers.parseEther("200"),
          })
      ).to.be.revertedWithCustomError(blogManager, "VerificationRequired");
    });

    it("Should revert if title or content is empty", async function () {
      const { blogManager, author, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      const metadata = {
        description: "Test",
        tags: ["test"],
        category: "Tech",
        thumbnailBlobId: "",
        estimatedReadTime: 5,
        language: "en",
        allowComments: true,
        premiumPrice: 0,
      };

      await expect(
        blogManager.connect(author).publishBlog(
          "", // Empty title
          ethers.toUtf8Bytes(BLOG_CONTENT),
          metadata,
          false,
          1,
          { value: ethers.parseEther("200") }
        )
      ).to.be.revertedWithCustomError(blogManager, "EmptyContent");

      await expect(
        blogManager.connect(author).publishBlog(
          BLOG_TITLE,
          "0x", // Empty content
          metadata,
          false,
          1,
          { value: ethers.parseEther("200") }
        )
      ).to.be.revertedWithCustomError(blogManager, "EmptyContent");
    });

    it("Should revert if insufficient payment", async function () {
      const { blogManager, author } = await loadFixture(
        deployBlogManagerFixture
      );

      const blogContent = ethers.toUtf8Bytes(BLOG_CONTENT);
      const metadata = {
        description: "Test",
        tags: ["test"],
        category: "Tech",
        thumbnailBlobId: "",
        estimatedReadTime: 5,
        language: "en",
        allowComments: true,
        premiumPrice: 0,
      };

      await expect(
        blogManager.connect(author).publishBlog(
          BLOG_TITLE,
          blogContent,
          metadata,
          false,
          1,
          { value: ethers.parseEther("1") } // Insufficient payment
        )
      ).to.be.revertedWithCustomError(blogManager, "InsufficientPayment");
    });

    it("Should refund excess payment", async function () {
      const { blogManager, author, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      const blogContent = ethers.toUtf8Bytes(BLOG_CONTENT);
      const metadata = {
        description: "Test",
        tags: ["test"],
        category: "Tech",
        thumbnailBlobId: "",
        estimatedReadTime: 5,
        language: "en",
        allowComments: true,
        premiumPrice: 0,
      };

      const storageTier = 1;
      const storageCost = await walrusStorage.calculateStorageCost(
        blogContent.length,
        storageTier
      );
      const totalCost = PUBLISHING_FEE + storageCost;
      const overpayment = ethers.parseEther("10");

      const initialBalance = await ethers.provider.getBalance(author.address);

      const tx = await blogManager
        .connect(author)
        .publishBlog(BLOG_TITLE, blogContent, metadata, false, storageTier, {
          value: totalCost + overpayment,
        });

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const finalBalance = await ethers.provider.getBalance(author.address);

      // Should get back most of the overpayment (minus some for metadata storage)
      expect(finalBalance).to.be.gt(
        initialBalance - totalCost - gasUsed - ethers.parseEther("1")
      );
    });
  });

  describe("Blog Content Retrieval", function () {
    it("Should retrieve public blog content", async function () {
      const { blogManager, author, reader, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage);

      const [content, metadata] = await blogManager
        .connect(reader)
        .getBlogContent(1);
      expect(ethers.toUtf8String(content)).to.equal(BLOG_CONTENT);
    });

    it("Should allow author to retrieve their premium content", async function () {
      const { blogManager, author, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage, true);

      const [content] = await blogManager.connect(author).getBlogContent(1);
      expect(ethers.toUtf8String(content)).to.equal(BLOG_CONTENT);
    });

    it("Should revert when non-purchaser tries to access premium content", async function () {
      const { blogManager, author, reader, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage, true);

      await expect(
        blogManager.connect(reader).getBlogContent(1)
      ).to.be.revertedWithCustomError(
        blogManager,
        "PremiumContentNotPurchased"
      );
    });

    it("Should revert for non-existent blog", async function () {
      const { blogManager, reader } = await loadFixture(
        deployBlogManagerFixture
      );

      await expect(
        blogManager.connect(reader).getBlogContent(999)
      ).to.be.revertedWithCustomError(blogManager, "BlogNotFound");
    });

    it("Should retrieve blog metadata from Walrus", async function () {
      const { blogManager, author, reader, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage);

      const metadata = await blogManager
        .connect(reader)
        .getBlogMetadataFromWalrus(1);
      expect(metadata.length).to.be.gt(0);
    });
  });

  describe("Premium Content Access", function () {
    it("Should allow purchase of premium content access", async function () {
      const { blogManager, author, reader, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage, true);

      await expect(
        blogManager
          .connect(reader)
          .purchasePremiumAccess(1, { value: PREMIUM_PRICE })
      )
        .to.emit(blogManager, "PremiumContentPurchased")
        .withArgs(1, reader.address, PREMIUM_PRICE);

      expect(await blogManager.hasPurchased(1, reader.address)).to.be.true;

      // Should now be able to access content
      const [content] = await blogManager.connect(reader).getBlogContent(1);
      expect(ethers.toUtf8String(content)).to.equal(BLOG_CONTENT);
    });

    it("Should transfer payment to author minus platform fee", async function () {
      const { blogManager, author, reader, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage, true);

      const initialAuthorBalance = await ethers.provider.getBalance(
        author.address
      );

      await blogManager
        .connect(reader)
        .purchasePremiumAccess(1, { value: PREMIUM_PRICE });

      const finalAuthorBalance = await ethers.provider.getBalance(
        author.address
      );
      const expectedAuthorPayment = (PREMIUM_PRICE * 95n) / 100n; // 95% (minus 5% platform fee)

      expect(finalAuthorBalance - initialAuthorBalance).to.equal(
        expectedAuthorPayment
      );
    });

    it("Should revert if insufficient payment for premium access", async function () {
      const { blogManager, author, reader, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage, true);

      await expect(
        blogManager
          .connect(reader)
          .purchasePremiumAccess(1, { value: PREMIUM_PRICE / 2n })
      ).to.be.revertedWithCustomError(blogManager, "InsufficientPayment");
    });

    it("Should refund excess payment for premium access", async function () {
      const { blogManager, author, reader, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage, true);

      const overpayment = ethers.parseEther("2");
      const initialReaderBalance = await ethers.provider.getBalance(
        reader.address
      );

      const tx = await blogManager.connect(reader).purchasePremiumAccess(1, {
        value: PREMIUM_PRICE + overpayment,
      });

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const finalReaderBalance = await ethers.provider.getBalance(
        reader.address
      );

      // Should get back the overpayment minus gas
      expect(finalReaderBalance).to.be.approximately(
        initialReaderBalance - PREMIUM_PRICE - gasUsed,
        ethers.parseEther("0.01") // Small tolerance for gas estimation
      );
    });
  });

  describe("Blog Interactions", function () {
    it("Should allow verified users to like blogs", async function () {
      const { blogManager, author, reader, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage);

      await expect(blogManager.connect(reader).likeBlog(1))
        .to.emit(blogManager, "BlogLiked")
        .withArgs(1, reader.address);

      expect(await blogManager.hasLiked(1, reader.address)).to.be.true;

      const blog = await blogManager.blogPosts(1);
      expect(blog.likes).to.equal(1);
    });

    it("Should prevent double-liking", async function () {
      const { blogManager, author, reader, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage);
      await blogManager.connect(reader).likeBlog(1);

      await expect(
        blogManager.connect(reader).likeBlog(1)
      ).to.be.revertedWithCustomError(blogManager, "AlreadyLiked");
    });

    it("Should track blog views", async function () {
      const { blogManager, author, reader, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage);

      await expect(blogManager.connect(reader).viewBlog(1))
        .to.emit(blogManager, "BlogViewed")
        .withArgs(1, reader.address);

      expect(await blogManager.hasViewed(1, reader.address)).to.be.true;

      const blog = await blogManager.blogPosts(1);
      expect(blog.views).to.equal(1);
    });

    it("Should not duplicate view counts from same user", async function () {
      const { blogManager, author, reader, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage);

      await blogManager.connect(reader).viewBlog(1);
      await blogManager.connect(reader).viewBlog(1); // Second view

      const blog = await blogManager.blogPosts(1);
      expect(blog.views).to.equal(1); // Should still be 1
    });
  });

  describe("Comments", function () {
    it("Should allow verified users to add comments", async function () {
      const { blogManager, author, commenter, walrusStorage } =
        await loadFixture(deployBlogManagerFixture);

      await createSampleBlog(blogManager, author, walrusStorage);

      const commentContent = ethers.toUtf8Bytes(COMMENT_CONTENT);
      const commentCost = await walrusStorage.calculateStorageCost(
        commentContent.length,
        0
      ); // EPHEMERAL

      await expect(
        blogManager
          .connect(commenter)
          .addComment(1, commentContent, { value: commentCost })
      )
        .to.emit(blogManager, "CommentAdded")
        .withArgs(1, 1, commenter.address, "blob_3");

      const comments = await blogManager.blogComments(1, 0);
      expect(comments.id).to.equal(1);
      expect(comments.author).to.equal(commenter.address);
      expect(comments.isActive).to.be.true;
    });

    it("Should revert comment from unverified user", async function () {
      const { blogManager, author, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );
      const [, , , , , unverifiedUser] = await ethers.getSigners();

      await createSampleBlog(blogManager, author, walrusStorage);

      const commentContent = ethers.toUtf8Bytes(COMMENT_CONTENT);
      const commentCost = await walrusStorage.calculateStorageCost(
        commentContent.length,
        0
      );

      await expect(
        blogManager
          .connect(unverifiedUser)
          .addComment(1, commentContent, { value: commentCost })
      ).to.be.revertedWithCustomError(blogManager, "VerificationRequired");
    });

    it("Should revert if insufficient payment for comment storage", async function () {
      const { blogManager, author, commenter, walrusStorage } =
        await loadFixture(deployBlogManagerFixture);

      await createSampleBlog(blogManager, author, walrusStorage);

      const commentContent = ethers.toUtf8Bytes(COMMENT_CONTENT);

      await expect(
        blogManager
          .connect(commenter)
          .addComment(1, commentContent, { value: ethers.parseEther("0.001") })
      ).to.be.revertedWithCustomError(blogManager, "InsufficientPayment");
    });

    it("Should revert for empty comment content", async function () {
      const { blogManager, author, commenter, walrusStorage } =
        await loadFixture(deployBlogManagerFixture);

      await createSampleBlog(blogManager, author, walrusStorage);

      await expect(
        blogManager
          .connect(commenter)
          .addComment(1, "0x", { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(blogManager, "EmptyContent");
    });
  });

  describe("Blog Statistics", function () {
    it("Should return correct blog statistics", async function () {
      const { blogManager, author, reader, commenter, walrusStorage } =
        await loadFixture(deployBlogManagerFixture);

      await createSampleBlog(blogManager, author, walrusStorage);

      // Add interactions
      await blogManager.connect(reader).viewBlog(1);
      await blogManager.connect(reader).likeBlog(1);

      const commentContent = ethers.toUtf8Bytes(COMMENT_CONTENT);
      const commentCost = await walrusStorage.calculateStorageCost(
        commentContent.length,
        0
      );
      await blogManager
        .connect(commenter)
        .addComment(1, commentContent, { value: commentCost });

      const [
        totalViews,
        uniqueViewers,
        totalLikes,
        totalComments,
        totalShares,
      ] = await blogManager.getBlogStats(1);

      expect(totalViews).to.equal(1);
      expect(uniqueViewers).to.equal(1);
      expect(totalLikes).to.equal(1);
      expect(totalComments).to.equal(1);
      expect(totalShares).to.equal(0);
    });
  });

  describe("Blog Queries", function () {
    it("Should return blogs by author with pagination", async function () {
      const { blogManager, author, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      // Create multiple blogs
      await createSampleBlog(blogManager, author, walrusStorage);
      await createSampleBlog(blogManager, author, walrusStorage);
      await createSampleBlog(blogManager, author, walrusStorage);

      const blogIds = await blogManager.getBlogsByAuthor(author.address, 0, 2);
      expect(blogIds.length).to.equal(2);
      expect(blogIds[0]).to.equal(1);
      expect(blogIds[1]).to.equal(2);

      const blogIds2 = await blogManager.getBlogsByAuthor(author.address, 2, 2);
      expect(blogIds2.length).to.equal(1);
      expect(blogIds2[0]).to.equal(3);
    });

    it("Should return empty array for invalid pagination", async function () {
      const { blogManager, author, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage);

      const blogIds = await blogManager.getBlogsByAuthor(author.address, 10, 5);
      expect(blogIds.length).to.equal(0);
    });

    it("Should return blog by Walrus blob ID", async function () {
      const { blogManager, author, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage);

      const blogId = await blogManager.getBlogByWalrusId("blob_1");
      expect(blogId).to.equal(1);
    });
  });

  describe("Storage Extension", function () {
    it("Should allow authors to extend blog storage", async function () {
      const { blogManager, author, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage);

      const extensionPeriod = 30 * 24 * 60 * 60; // 30 days
      const extensionCost = ethers.parseEther("0.1");

      await expect(
        blogManager
          .connect(author)
          .extendBlogStorage(1, extensionPeriod, { value: extensionCost })
      )
        .to.emit(blogManager, "BlogContentExtended")
        .withArgs(1, Math.floor(extensionPeriod / (2 * 7 * 24 * 60 * 60))); // Convert to epochs (2 weeks)
    });

    it("Should revert if non-author tries to extend storage", async function () {
      const { blogManager, author, reader, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage);

      const extensionPeriod = 30 * 24 * 60 * 60;
      const extensionCost = ethers.parseEther("0.1");

      await expect(
        blogManager
          .connect(reader)
          .extendBlogStorage(1, extensionPeriod, { value: extensionCost })
      ).to.be.revertedWithCustomError(blogManager, "NotBlogAuthor");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to update SelfProtocol address", async function () {
      const { blogManager, admin, selfProtocol } = await loadFixture(
        deployBlogManagerFixture
      );

      const SelfProtocolIntegration = await ethers.getContractFactory(
        "SelfProtocolIntegration"
      );
      const newSelfProtocol = await SelfProtocolIntegration.deploy();

      await expect(
        blogManager
          .connect(admin)
          .updateSelfProtocol(await newSelfProtocol.getAddress())
      )
        .to.emit(blogManager, "SelfProtocolUpdated")
        .withArgs(
          await selfProtocol.getAddress(),
          await newSelfProtocol.getAddress()
        );

      expect(await blogManager.selfProtocol()).to.equal(
        await newSelfProtocol.getAddress()
      );
    });

    it("Should revert when updating SelfProtocol to zero address", async function () {
      const { blogManager, admin } = await loadFixture(
        deployBlogManagerFixture
      );

      await expect(
        blogManager.connect(admin).updateSelfProtocol(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(blogManager, "InvalidAddress");
    });

    it("Should allow admin to update publishing fee", async function () {
      const { blogManager, admin } = await loadFixture(
        deployBlogManagerFixture
      );

      const newFee = ethers.parseEther("200");

      await expect(blogManager.connect(admin).updatePublishingFee(newFee))
        .to.emit(blogManager, "PublishingFeeUpdated")
        .withArgs(PUBLISHING_FEE, newFee);

      expect(await blogManager.publishingFee()).to.equal(newFee);
    });

    it("Should allow admin to pause and unpause", async function () {
      const { blogManager, admin } = await loadFixture(
        deployBlogManagerFixture
      );

      await blogManager.connect(admin).pause();
      expect(await blogManager.paused()).to.be.true;

      await blogManager.connect(admin).unpause();
      expect(await blogManager.paused()).to.be.false;
    });

    it("Should allow admin to withdraw funds", async function () {
      const { blogManager, admin } = await loadFixture(
        deployBlogManagerFixture
      );

      // Send some ETH to the contract
      await admin.sendTransaction({
        to: await blogManager.getAddress(),
        value: ethers.parseEther("1"),
      });

      const initialBalance = await ethers.provider.getBalance(admin.address);
      const contractBalance = await ethers.provider.getBalance(
        await blogManager.getAddress()
      );

      const tx = await blogManager.connect(admin).withdrawFunds();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(admin.address);
      expect(finalBalance).to.be.approximately(
        initialBalance + contractBalance - gasUsed,
        ethers.parseEther("0.01")
      );
    });

    it("Should revert admin functions when called by non-admin", async function () {
      const { blogManager, author } = await loadFixture(
        deployBlogManagerFixture
      );

      await expect(
        blogManager
          .connect(author)
          .updatePublishingFee(ethers.parseEther("200"))
      ).to.be.reverted;

      await expect(blogManager.connect(author).pause()).to.be.reverted;

      await expect(blogManager.connect(author).withdrawFunds()).to.be.reverted;
    });
  });

  describe("Pausable Functionality", function () {
    it("Should prevent publishing when paused", async function () {
      const { blogManager, author, admin, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await blogManager.connect(admin).pause();

      const blogContent = ethers.toUtf8Bytes(BLOG_CONTENT);
      const metadata = {
        description: "Test",
        tags: ["test"],
        category: "Tech",
        thumbnailBlobId: "",
        estimatedReadTime: 5,
        language: "en",
        allowComments: true,
        premiumPrice: 0,
      };

      await expect(
        blogManager
          .connect(author)
          .publishBlog(BLOG_TITLE, blogContent, metadata, false, 1, {
            value: ethers.parseEther("200"),
          })
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent liking when paused", async function () {
      const { blogManager, author, reader, admin, walrusStorage } =
        await loadFixture(deployBlogManagerFixture);

      await createSampleBlog(blogManager, author, walrusStorage);
      await blogManager.connect(admin).pause();

      await expect(blogManager.connect(reader).likeBlog(1)).to.be.revertedWith(
        "Pausable: paused"
      );
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very large content sizes", async function () {
      const { blogManager, author } = await loadFixture(
        deployBlogManagerFixture
      );

      const largeContent = new Array(14 * 1024 * 1024 * 1024).fill(65); // ~14GB (over limit)

      await expect(
        blogManager.connect(author).publishBlog(
          BLOG_TITLE,
          largeContent,
          {
            description: "Large content test",
            tags: ["test"],
            category: "Tech",
            thumbnailBlobId: "",
            estimatedReadTime: 60,
            language: "en",
            allowComments: true,
            premiumPrice: 0,
          },
          false,
          1,
          { value: ethers.parseEther("1000") }
        )
      ).to.be.revertedWithCustomError(blogManager, "ContentTooLarge");
    });

    it("Should handle metadata storage failure gracefully", async function () {
      const { blogManager, author, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      const blogContent = ethers.toUtf8Bytes(BLOG_CONTENT);
      const metadata = {
        description: "Test with insufficient metadata payment",
        tags: ["test"],
        category: "Tech",
        thumbnailBlobId: "",
        estimatedReadTime: 5,
        language: "en",
        allowComments: true,
        premiumPrice: 0,
      };

      const storageTier = 1;
      const storageCost = await walrusStorage.calculateStorageCost(
        blogContent.length,
        storageTier
      );
      const totalCost = PUBLISHING_FEE + storageCost;

      // Don't provide extra for metadata storage
      await expect(
        blogManager
          .connect(author)
          .publishBlog(BLOG_TITLE, blogContent, metadata, false, storageTier, {
            value: totalCost,
          })
      ).to.not.be.reverted; // Should succeed even without metadata storage

      const blog = await blogManager.blogPosts(1);
      expect(blog.walrusMetadataId).to.equal(""); // No metadata stored
    });

    it("Should handle non-premium content purchase gracefully", async function () {
      const { blogManager, author, reader, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      await createSampleBlog(blogManager, author, walrusStorage, false); // Not premium

      // Should not revert when trying to purchase access to non-premium content
      await expect(
        blogManager
          .connect(reader)
          .purchasePremiumAccess(1, { value: ethers.parseEther("1") })
      ).to.not.be.reverted;
    });
  });

  describe("Gas Optimization", function () {
    it("Should handle batch operations efficiently", async function () {
      const { blogManager, author, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );

      // Create multiple blogs and measure gas
      const blogCount = 5;
      const gasUsed = [];

      for (let i = 0; i < blogCount; i++) {
        const tx = await createSampleBlog(blogManager, author, walrusStorage);
        gasUsed.push(tx.gasUsed);
      }

      expect(gasUsed.every((gas) => gas < 1000000)).to.be.true; // All under 1M gas
    });

    it("Should handle large number of interactions efficiently", async function () {
      const { blogManager, author, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );
      const signers = await ethers.getSigners();

      await createSampleBlog(blogManager, author, walrusStorage);

      // Setup verification for multiple users
      const { selfProtocol } = await loadFixture(deployBlogManagerFixture);
      for (let i = 5; i < 15; i++) {
        await selfProtocol.verifyHuman(signers[i].address, `test-did-${i}`);
      }

      // Multiple users interact with the blog
      for (let i = 5; i < 15; i++) {
        await blogManager.connect(signers[i]).viewBlog(1);
        await blogManager.connect(signers[i]).likeBlog(1);
      }

      const blog = await blogManager.blogPosts(1);
      expect(blog.views).to.equal(10);
      expect(blog.likes).to.equal(10);
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete blog lifecycle", async function () {
      const { blogManager, author, reader, commenter, walrusStorage } =
        await loadFixture(deployBlogManagerFixture);

      // 1. Publish blog
      await createSampleBlog(blogManager, author, walrusStorage, true);

      // 2. Reader views and likes
      await blogManager.connect(reader).viewBlog(1);
      await blogManager.connect(reader).likeBlog(1);

      // 3. Reader purchases premium access
      await blogManager
        .connect(reader)
        .purchasePremiumAccess(1, { value: PREMIUM_PRICE });

      // 4. Reader accesses content
      const [content] = await blogManager.connect(reader).getBlogContent(1);
      expect(ethers.toUtf8String(content)).to.equal(BLOG_CONTENT);

      // 5. Commenter adds comment
      const commentContent = ethers.toUtf8Bytes(COMMENT_CONTENT);
      const commentCost = await walrusStorage.calculateStorageCost(
        commentContent.length,
        0
      );
      await blogManager
        .connect(commenter)
        .addComment(1, commentContent, { value: commentCost });

      // 6. Author extends storage
      const extensionCost = ethers.parseEther("0.1");
      await blogManager
        .connect(author)
        .extendBlogStorage(1, 30 * 24 * 60 * 60, { value: extensionCost });

      // Verify final state
      const blog = await blogManager.blogPosts(1);
      expect(blog.views).to.equal(1);
      expect(blog.likes).to.equal(1);

      const [totalViews, uniqueViewers, totalLikes, totalComments] =
        await blogManager.getBlogStats(1);
      expect(totalViews).to.equal(1);
      expect(uniqueViewers).to.equal(1);
      expect(totalLikes).to.equal(1);
      expect(totalComments).to.equal(1);
    });

    it("Should handle multiple authors and cross-interactions", async function () {
      const { blogManager, walrusStorage } = await loadFixture(
        deployBlogManagerFixture
      );
      const [, author1, author2, reader1, reader2] = await ethers.getSigners();

      const { selfProtocol } = await loadFixture(deployBlogManagerFixture);
      await selfProtocol.verifyHuman(author1.address, "author1-did");
      await selfProtocol.verifyHuman(author2.address, "author2-did");
      await selfProtocol.verifyHuman(reader1.address, "reader1-did");
      await selfProtocol.verifyHuman(reader2.address, "reader2-did");

      // Each author publishes blogs
      await createSampleBlog(blogManager, author1, walrusStorage);
      await createSampleBlog(blogManager, author2, walrusStorage);

      // Cross-interactions
      await blogManager.connect(reader1).viewBlog(1);
      await blogManager.connect(reader1).likeBlog(2);
      await blogManager.connect(reader2).viewBlog(2);
      await blogManager.connect(reader2).likeBlog(1);

      // Check author blogs
      const author1Blogs = await blogManager.getBlogsByAuthor(
        author1.address,
        0,
        10
      );
      const author2Blogs = await blogManager.getBlogsByAuthor(
        author2.address,
        0,
        10
      );

      expect(author1Blogs.length).to.equal(1);
      expect(author2Blogs.length).to.equal(1);
      expect(author1Blogs[0]).to.equal(1);
      expect(author2Blogs[0]).to.equal(2);

      expect(await blogManager.totalBlogs()).to.equal(2);
    });
  });
});
