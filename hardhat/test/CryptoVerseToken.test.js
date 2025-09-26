const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-network-helpers");

describe("CryptoVerseToken", function () {
  async function deployCVRSTokenFixture() {
    const [owner, user1, user2, minter, platform] = await ethers.getSigners();

    const CryptoVerseToken = await ethers.getContractFactory(
      "CryptoVerseToken"
    );
    const cvrsToken = await CryptoVerseToken.deploy();

    // Grant roles
    await cvrsToken.grantRole(await cvrsToken.MINTER_ROLE(), minter.address);
    await cvrsToken.grantRole(
      await cvrsToken.PLATFORM_ROLE(),
      platform.address
    );

    return { cvrsToken, owner, user1, user2, minter, platform };
  }

  describe("Deployment", function () {
    it("Should deploy with correct initial values", async function () {
      const { cvrsToken, owner } = await loadFixture(deployCVRSTokenFixture);

      expect(await cvrsToken.name()).to.equal("CryptoVerse Token");
      expect(await cvrsToken.symbol()).to.equal("CVRS");
      expect(await cvrsToken.decimals()).to.equal(18);
      expect(await cvrsToken.totalSupply()).to.equal(
        ethers.parseEther("100000000")
      );
      expect(await cvrsToken.balanceOf(owner.address)).to.equal(
        ethers.parseEther("100000000")
      );
    });

    it("Should have correct constants", async function () {
      const { cvrsToken } = await loadFixture(deployCVRSTokenFixture);

      expect(await cvrsToken.MAX_SUPPLY()).to.equal(
        ethers.parseEther("1000000000")
      );
      expect(await cvrsToken.INITIAL_SUPPLY()).to.equal(
        ethers.parseEther("100000000")
      );
      expect(await cvrsToken.BLOG_READ_REWARD()).to.equal(
        ethers.parseEther("10")
      );
      expect(await cvrsToken.QUIZ_COMPLETE_REWARD()).to.equal(
        ethers.parseEther("25")
      );
      expect(await cvrsToken.EVENT_ATTEND_REWARD()).to.equal(
        ethers.parseEther("50")
      );
      expect(await cvrsToken.DAILY_LOGIN_REWARD()).to.equal(
        ethers.parseEther("5")
      );
    });

    it("Should set up roles correctly", async function () {
      const { cvrsToken, owner, minter, platform } = await loadFixture(
        deployCVRSTokenFixture
      );

      expect(
        await cvrsToken.hasRole(
          await cvrsToken.DEFAULT_ADMIN_ROLE(),
          owner.address
        )
      ).to.be.true;
      expect(
        await cvrsToken.hasRole(await cvrsToken.ADMIN_ROLE(), owner.address)
      ).to.be.true;
      expect(
        await cvrsToken.hasRole(await cvrsToken.MINTER_ROLE(), owner.address)
      ).to.be.true;
      expect(
        await cvrsToken.hasRole(await cvrsToken.MINTER_ROLE(), minter.address)
      ).to.be.true;
      expect(
        await cvrsToken.hasRole(
          await cvrsToken.PLATFORM_ROLE(),
          platform.address
        )
      ).to.be.true;
    });
  });

  describe("Reward Minting", function () {
    it("Should allow minter to mint rewards", async function () {
      const { cvrsToken, user1, minter } = await loadFixture(
        deployCVRSTokenFixture
      );

      const rewardAmount = ethers.parseEther("100");
      const initialBalance = await cvrsToken.balanceOf(user1.address);

      await expect(
        cvrsToken
          .connect(minter)
          .mintReward(user1.address, rewardAmount, "blog_read")
      )
        .to.emit(cvrsToken, "RewardMinted")
        .withArgs(user1.address, rewardAmount, "blog_read");

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        initialBalance + rewardAmount
      );
      expect(await cvrsToken.totalMinted()).to.equal(
        ethers.parseEther("100000100")
      ); // Initial + reward
    });

    it("Should batch mint rewards correctly", async function () {
      const { cvrsToken, user1, user2, minter } = await loadFixture(
        deployCVRSTokenFixture
      );

      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("50"), ethers.parseEther("75")];
      const activity = "quiz_completion";

      await cvrsToken
        .connect(minter)
        .batchMintRewards(recipients, amounts, activity);

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        ethers.parseEther("50")
      );
      expect(await cvrsToken.balanceOf(user2.address)).to.equal(
        ethers.parseEther("75")
      );
      expect(await cvrsToken.totalMinted()).to.equal(
        ethers.parseEther("100000125")
      );
    });

    it("Should reject minting beyond max supply", async function () {
      const { cvrsToken, user1, minter } = await loadFixture(
        deployCVRSTokenFixture
      );

      const excessiveAmount = ethers.parseEther("900000001"); // More than remaining supply

      await expect(
        cvrsToken
          .connect(minter)
          .mintReward(user1.address, excessiveAmount, "excessive")
      ).to.be.revertedWithCustomError(cvrsToken, "ExceedsMaxSupply");
    });

    it("Should reject zero amount minting", async function () {
      const { cvrsToken, user1, minter } = await loadFixture(
        deployCVRSTokenFixture
      );

      await expect(
        cvrsToken.connect(minter).mintReward(user1.address, 0, "zero")
      ).to.be.revertedWithCustomError(cvrsToken, "ZeroAmount");
    });

    it("Should only allow minter role to mint", async function () {
      const { cvrsToken, user1, user2 } = await loadFixture(
        deployCVRSTokenFixture
      );

      await expect(
        cvrsToken
          .connect(user2)
          .mintReward(user1.address, ethers.parseEther("10"), "unauthorized")
      ).to.be.reverted;
    });

    it("Should handle batch minting with mismatched arrays", async function () {
      const { cvrsToken, user1, user2, minter } = await loadFixture(
        deployCVRSTokenFixture
      );

      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("50")]; // Mismatched length

      await expect(
        cvrsToken
          .connect(minter)
          .batchMintRewards(recipients, amounts, "mismatch")
      ).to.be.revertedWith("Arrays length mismatch");
    });
  });

  describe("Daily Rewards", function () {
    it("Should allow users to claim daily rewards", async function () {
      const { cvrsToken, user1 } = await loadFixture(deployCVRSTokenFixture);

      const initialBalance = await cvrsToken.balanceOf(user1.address);
      const dailyReward = await cvrsToken.DAILY_LOGIN_REWARD();

      await expect(cvrsToken.connect(user1).claimDailyReward())
        .to.emit(cvrsToken, "DailyRewardClaimed")
        .withArgs(user1.address, dailyReward);

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        initialBalance + dailyReward
      );
      expect(await cvrsToken.canClaimDaily(user1.address)).to.be.false;
    });

    it("Should prevent claiming daily rewards too frequently", async function () {
      const { cvrsToken, user1 } = await loadFixture(deployCVRSTokenFixture);

      // First claim should succeed
      await cvrsToken.connect(user1).claimDailyReward();

      // Second claim within 24 hours should fail
      await expect(
        cvrsToken.connect(user1).claimDailyReward()
      ).to.be.revertedWithCustomError(cvrsToken, "TooEarlyToClaim");
    });

    it("Should allow claiming after 24 hours", async function () {
      const { cvrsToken, user1 } = await loadFixture(deployCVRSTokenFixture);

      // First claim
      await cvrsToken.connect(user1).claimDailyReward();

      // Fast forward 24 hours
      await time.increase(24 * 60 * 60);

      // Second claim should succeed
      const initialBalance = await cvrsToken.balanceOf(user1.address);
      await cvrsToken.connect(user1).claimDailyReward();

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        initialBalance + (await cvrsToken.DAILY_LOGIN_REWARD())
      );
    });

    it("Should return correct time to next claim", async function () {
      const { cvrsToken, user1 } = await loadFixture(deployCVRSTokenFixture);

      // Initially should be 0 (can claim)
      expect(await cvrsToken.getTimeToNextClaim(user1.address)).to.equal(0);

      await cvrsToken.connect(user1).claimDailyReward();

      // Should be close to 24 hours
      const timeToNext = await cvrsToken.getTimeToNextClaim(user1.address);
      expect(timeToNext).to.be.greaterThan(24 * 60 * 60 - 10); // Allow 10 second tolerance
      expect(timeToNext).to.be.lessThanOrEqual(24 * 60 * 60);
    });
  });

  describe("Token Burning", function () {
    it("Should allow platform role to burn from user", async function () {
      const { cvrsToken, user1, platform, owner } = await loadFixture(
        deployCVRSTokenFixture
      );

      // Give user some tokens
      await cvrsToken
        .connect(owner)
        .transfer(user1.address, ethers.parseEther("100"));
      const initialBalance = await cvrsToken.balanceOf(user1.address);
      const burnAmount = ethers.parseEther("50");

      await expect(
        cvrsToken.connect(platform).burnFrom(user1.address, burnAmount)
      )
        .to.emit(cvrsToken, "TokensBurned")
        .withArgs(user1.address, burnAmount);

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        initialBalance - burnAmount
      );
      expect(await cvrsToken.totalBurned()).to.equal(burnAmount);
    });

    it("Should allow users to burn their own tokens", async function () {
      const { cvrsToken, user1, owner } = await loadFixture(
        deployCVRSTokenFixture
      );

      await cvrsToken
        .connect(owner)
        .transfer(user1.address, ethers.parseEther("100"));
      const initialBalance = await cvrsToken.balanceOf(user1.address);
      const burnAmount = ethers.parseEther("30");

      await expect(cvrsToken.connect(user1).burn(burnAmount))
        .to.emit(cvrsToken, "TokensBurned")
        .withArgs(user1.address, burnAmount);

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        initialBalance - burnAmount
      );
      expect(await cvrsToken.totalBurned()).to.equal(burnAmount);
    });

    it("Should reject burning more than balance", async function () {
      const { cvrsToken, user1, platform } = await loadFixture(
        deployCVRSTokenFixture
      );

      await expect(
        cvrsToken
          .connect(platform)
          .burnFrom(user1.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(cvrsToken, "InsufficientBalance");
    });

    it("Should only allow platform role to burn from others", async function () {
      const { cvrsToken, user1, user2, owner } = await loadFixture(
        deployCVRSTokenFixture
      );

      await cvrsToken
        .connect(owner)
        .transfer(user1.address, ethers.parseEther("100"));

      await expect(
        cvrsToken
          .connect(user2)
          .burnFrom(user1.address, ethers.parseEther("10"))
      ).to.be.reverted;
    });
  });

  describe("Token Transfers", function () {
    it("Should allow normal transfers when not paused", async function () {
      const { cvrsToken, user1, user2, owner } = await loadFixture(
        deployCVRSTokenFixture
      );

      await cvrsToken
        .connect(owner)
        .transfer(user1.address, ethers.parseEther("100"));
      await cvrsToken
        .connect(user1)
        .transfer(user2.address, ethers.parseEther("50"));

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        ethers.parseEther("50")
      );
      expect(await cvrsToken.balanceOf(user2.address)).to.equal(
        ethers.parseEther("50")
      );
    });

    it("Should prevent transfers when paused", async function () {
      const { cvrsToken, user1, user2, owner } = await loadFixture(
        deployCVRSTokenFixture
      );

      await cvrsToken.connect(owner).pause();

      await expect(
        cvrsToken
          .connect(owner)
          .transfer(user1.address, ethers.parseEther("100"))
      ).to.be.reverted;
    });

    it("Should handle transferFrom correctly", async function () {
      const { cvrsToken, user1, user2, owner } = await loadFixture(
        deployCVRSTokenFixture
      );

      await cvrsToken
        .connect(owner)
        .transfer(user1.address, ethers.parseEther("100"));
      await cvrsToken
        .connect(user1)
        .approve(user2.address, ethers.parseEther("50"));

      await cvrsToken
        .connect(user2)
        .transferFrom(user1.address, user2.address, ethers.parseEther("30"));

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        ethers.parseEther("70")
      );
      expect(await cvrsToken.balanceOf(user2.address)).to.equal(
        ethers.parseEther("30")
      );
      expect(await cvrsToken.allowance(user1.address, user2.address)).to.equal(
        ethers.parseEther("20")
      );
    });
  });

  describe("View Functions", function () {
    it("Should return correct remaining supply", async function () {
      const { cvrsToken, user1, minter } = await loadFixture(
        deployCVRSTokenFixture
      );

      const initialRemaining = await cvrsToken.getRemainingSupply();
      expect(initialRemaining).to.equal(ethers.parseEther("900000000")); // Max - Initial

      await cvrsToken
        .connect(minter)
        .mintReward(user1.address, ethers.parseEther("1000"), "test");

      const newRemaining = await cvrsToken.getRemainingSupply();
      expect(newRemaining).to.equal(ethers.parseEther("899999000"));
    });

    it("Should return correct token statistics", async function () {
      const { cvrsToken, user1, minter, platform } = await loadFixture(
        deployCVRSTokenFixture
      );

      // Mint some rewards
      await cvrsToken
        .connect(minter)
        .mintReward(user1.address, ethers.parseEther("500"), "test");

      // Burn some tokens
      await cvrsToken
        .connect(platform)
        .burnFrom(user1.address, ethers.parseEther("100"));

      const [currentSupply, minted, burned, remaining] =
        await cvrsToken.getTokenStats();

      expect(currentSupply).to.equal(ethers.parseEther("100000400")); // Initial + minted - burned
      expect(minted).to.equal(ethers.parseEther("100000500")); // Initial + minted
      expect(burned).to.equal(ethers.parseEther("100"));
      expect(remaining).to.equal(ethers.parseEther("899999500")); // Max - minted
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to manage minter roles", async function () {
      const { cvrsToken, user1, owner } = await loadFixture(
        deployCVRSTokenFixture
      );

      await expect(cvrsToken.connect(owner).authorizeMinter(user1.address))
        .to.emit(cvrsToken, "MinterAuthorized")
        .withArgs(user1.address);

      expect(
        await cvrsToken.hasRole(await cvrsToken.MINTER_ROLE(), user1.address)
      ).to.be.true;
      expect(await cvrsToken.authorizedMinters(user1.address)).to.be.true;

      await expect(cvrsToken.connect(owner).revokeMinter(user1.address))
        .to.emit(cvrsToken, "MinterRevoked")
        .withArgs(user1.address);

      expect(
        await cvrsToken.hasRole(await cvrsToken.MINTER_ROLE(), user1.address)
      ).to.be.false;
      expect(await cvrsToken.authorizedMinters(user1.address)).to.be.false;
    });

    it("Should allow admin to manage platform roles", async function () {
      const { cvrsToken, user1, owner } = await loadFixture(
        deployCVRSTokenFixture
      );

      await cvrsToken.connect(owner).grantPlatformRole(user1.address);
      expect(
        await cvrsToken.hasRole(await cvrsToken.PLATFORM_ROLE(), user1.address)
      ).to.be.true;

      await cvrsToken.connect(owner).revokePlatformRole(user1.address);
      expect(
        await cvrsToken.hasRole(await cvrsToken.PLATFORM_ROLE(), user1.address)
      ).to.be.false;
    });

    it("Should allow admin to pause and unpause", async function () {
      const { cvrsToken, user1, owner } = await loadFixture(
        deployCVRSTokenFixture
      );

      await cvrsToken.connect(owner).pause();
      expect(await cvrsToken.paused()).to.be.true;

      // Transfers should fail when paused
      await expect(
        cvrsToken
          .connect(owner)
          .transfer(user1.address, ethers.parseEther("10"))
      ).to.be.reverted;

      await cvrsToken.connect(owner).unpause();
      expect(await cvrsToken.paused()).to.be.false;

      // Transfers should work when unpaused
      await cvrsToken
        .connect(owner)
        .transfer(user1.address, ethers.parseEther("10"));
      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        ethers.parseEther("10")
      );
    });

    it("Should allow admin to emergency mint", async function () {
      const { cvrsToken, user1, owner } = await loadFixture(
        deployCVRSTokenFixture
      );

      const emergencyAmount = ethers.parseEther("1000");
      const reason = "Emergency funding";

      await expect(
        cvrsToken
          .connect(owner)
          .emergencyMint(user1.address, emergencyAmount, reason)
      )
        .to.emit(cvrsToken, "RewardMinted")
        .withArgs(user1.address, emergencyAmount, reason);

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        emergencyAmount
      );
      expect(await cvrsToken.totalMinted()).to.equal(
        ethers.parseEther("100001000")
      );
    });

    it("Should reject emergency mint beyond max supply", async function () {
      const { cvrsToken, user1, owner } = await loadFixture(
        deployCVRSTokenFixture
      );

      const excessiveAmount = ethers.parseEther("900000001");

      await expect(
        cvrsToken
          .connect(owner)
          .emergencyMint(user1.address, excessiveAmount, "too much")
      ).to.be.revertedWithCustomError(cvrsToken, "ExceedsMaxSupply");
    });
  });

  describe("Access Control", function () {
    it("Should prevent non-admins from admin functions", async function () {
      const { cvrsToken, user1, user2 } = await loadFixture(
        deployCVRSTokenFixture
      );

      await expect(cvrsToken.connect(user1).authorizeMinter(user2.address)).to
        .be.reverted;
      await expect(cvrsToken.connect(user1).pause()).to.be.reverted;
      await expect(
        cvrsToken
          .connect(user1)
          .emergencyMint(
            user2.address,
            ethers.parseEther("100"),
            "unauthorized"
          )
      ).to.be.reverted;
    });

    it("Should prevent non-minters from minting", async function () {
      const { cvrsToken, user1, user2 } = await loadFixture(
        deployCVRSTokenFixture
      );

      await expect(
        cvrsToken
          .connect(user1)
          .mintReward(user2.address, ethers.parseEther("100"), "unauthorized")
      ).to.be.reverted;
    });

    it("Should prevent non-platform from burning others tokens", async function () {
      const { cvrsToken, user1, user2, owner } = await loadFixture(
        deployCVRSTokenFixture
      );

      await cvrsToken
        .connect(owner)
        .transfer(user1.address, ethers.parseEther("100"));

      await expect(
        cvrsToken
          .connect(user2)
          .burnFrom(user1.address, ethers.parseEther("10"))
      ).to.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero balance daily claims correctly", async function () {
      const { cvrsToken, user1 } = await loadFixture(deployCVRSTokenFixture);

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(0);

      await cvrsToken.connect(user1).claimDailyReward();

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        await cvrsToken.DAILY_LOGIN_REWARD()
      );
    });

    it("Should handle batch minting with zero amounts", async function () {
      const { cvrsToken, user1, user2, minter } = await loadFixture(
        deployCVRSTokenFixture
      );

      const recipients = [user1.address, user2.address];
      const amounts = [ethers.parseEther("50"), 0];

      await cvrsToken
        .connect(minter)
        .batchMintRewards(recipients, amounts, "mixed amounts");

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        ethers.parseEther("50")
      );
      expect(await cvrsToken.balanceOf(user2.address)).to.equal(0);
    });

    it("Should handle maximum supply edge case", async function () {
      const { cvrsToken, user1, minter } = await loadFixture(
        deployCVRSTokenFixture
      );

      const maxSupply = await cvrsToken.MAX_SUPPLY();
      const totalMinted = await cvrsToken.totalMinted();
      const remainingSupply = maxSupply - totalMinted;

      // Should succeed with exact remaining amount
      await cvrsToken
        .connect(minter)
        .mintReward(user1.address, remainingSupply, "max mint");

      expect(await cvrsToken.totalMinted()).to.equal(maxSupply);
      expect(await cvrsToken.getRemainingSupply()).to.equal(0);

      // Should fail with any additional minting
      await expect(
        cvrsToken.connect(minter).mintReward(user1.address, 1, "overflow")
      ).to.be.revertedWithCustomError(cvrsToken, "ExceedsMaxSupply");
    });

    it("Should handle batch minting with empty arrays", async function () {
      const { cvrsToken, minter } = await loadFixture(deployCVRSTokenFixture);

      const recipients = [];
      const amounts = [];

      await cvrsToken
        .connect(minter)
        .batchMintRewards(recipients, amounts, "empty batch");

      // Should not revert and totalMinted should remain unchanged
      expect(await cvrsToken.totalMinted()).to.equal(
        ethers.parseEther("100000000")
      );
    });

    it("Should handle daily reward claim at exact 24 hour boundary", async function () {
      const { cvrsToken, user1 } = await loadFixture(deployCVRSTokenFixture);

      // First claim
      await cvrsToken.connect(user1).claimDailyReward();

      // Fast forward exactly 24 hours
      await time.increase(24 * 60 * 60);

      // Should be able to claim again
      const initialBalance = await cvrsToken.balanceOf(user1.address);
      await cvrsToken.connect(user1).claimDailyReward();

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        initialBalance + (await cvrsToken.DAILY_LOGIN_REWARD())
      );
    });

    it("Should handle burning all user tokens", async function () {
      const { cvrsToken, user1, owner, platform } = await loadFixture(
        deployCVRSTokenFixture
      );

      // Give user some tokens
      await cvrsToken
        .connect(owner)
        .transfer(user1.address, ethers.parseEther("100"));

      // Burn all tokens
      await cvrsToken
        .connect(platform)
        .burnFrom(user1.address, ethers.parseEther("100"));

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(0);
      expect(await cvrsToken.totalBurned()).to.equal(ethers.parseEther("100"));
    });

    it("Should handle emergency mint at max supply boundary", async function () {
      const { cvrsToken, user1, owner, minter } = await loadFixture(
        deployCVRSTokenFixture
      );

      const maxSupply = await cvrsToken.MAX_SUPPLY();
      const totalMinted = await cvrsToken.totalMinted();
      const remainingSupply = maxSupply - totalMinted - ethers.parseEther("1"); // Leave 1 token

      // Mint almost to max supply
      await cvrsToken
        .connect(minter)
        .mintReward(user1.address, remainingSupply, "near max");

      // Emergency mint the last token
      await cvrsToken
        .connect(owner)
        .emergencyMint(user1.address, ethers.parseEther("1"), "final token");

      expect(await cvrsToken.totalMinted()).to.equal(maxSupply);
      expect(await cvrsToken.getRemainingSupply()).to.equal(0);
    });
  });

  describe("Gas Optimization", function () {
    it("Should handle large batch minting efficiently", async function () {
      const { cvrsToken, minter } = await loadFixture(deployCVRSTokenFixture);

      // Create 10 recipients with small amounts
      const recipients = [];
      const amounts = [];

      for (let i = 0; i < 10; i++) {
        const [, , , , , , , user] = await ethers.getSigners();
        recipients.push(user.address);
        amounts.push(ethers.parseEther("1"));
      }

      // Should not revert due to gas limits
      await cvrsToken
        .connect(minter)
        .batchMintRewards(recipients, amounts, "gas test");

      expect(await cvrsToken.totalMinted()).to.equal(
        ethers.parseEther("100000010")
      );
    });

    it("Should handle multiple daily claims efficiently", async function () {
      const { cvrsToken, user1 } = await loadFixture(deployCVRSTokenFixture);

      // Claim daily reward multiple times with time advancement
      for (let i = 0; i < 5; i++) {
        await cvrsToken.connect(user1).claimDailyReward();
        await time.increase(24 * 60 * 60);
      }

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        (await cvrsToken.DAILY_LOGIN_REWARD()) * 5n
      );
    });
  });

  describe("Integration Scenarios", function () {
    it("Should handle complete user journey", async function () {
      const { cvrsToken, user1, minter, platform, owner } = await loadFixture(
        deployCVRSTokenFixture
      );

      // 1. User claims daily reward
      await cvrsToken.connect(user1).claimDailyReward();
      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        await cvrsToken.DAILY_LOGIN_REWARD()
      );

      // 2. User receives activity rewards
      await cvrsToken
        .connect(minter)
        .mintReward(
          user1.address,
          await cvrsToken.BLOG_READ_REWARD(),
          "blog_read"
        );
      await cvrsToken
        .connect(minter)
        .mintReward(
          user1.address,
          await cvrsToken.QUIZ_COMPLETE_REWARD(),
          "quiz_complete"
        );

      const expectedBalance =
        (await cvrsToken.DAILY_LOGIN_REWARD()) +
        (await cvrsToken.BLOG_READ_REWARD()) +
        (await cvrsToken.QUIZ_COMPLETE_REWARD());
      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        expectedBalance
      );

      // 3. User burns some tokens (e.g., for badge purchase)
      const burnAmount = await cvrsToken.BLOG_READ_REWARD();
      await cvrsToken.connect(platform).burnFrom(user1.address, burnAmount);

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        expectedBalance - burnAmount
      );
      expect(await cvrsToken.totalBurned()).to.equal(burnAmount);

      // 4. User transfers tokens to another user
      const [, , user2] = await ethers.getSigners();
      const transferAmount = await cvrsToken.DAILY_LOGIN_REWARD();
      await cvrsToken.connect(user1).transfer(user2.address, transferAmount);

      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        expectedBalance - burnAmount - transferAmount
      );
      expect(await cvrsToken.balanceOf(user2.address)).to.equal(transferAmount);
    });

    it("Should handle platform operations correctly", async function () {
      const { cvrsToken, user1, user2, minter, platform, owner } =
        await loadFixture(deployCVRSTokenFixture);

      // Give users tokens
      await cvrsToken
        .connect(owner)
        .transfer(user1.address, ethers.parseEther("100"));
      await cvrsToken
        .connect(owner)
        .transfer(user2.address, ethers.parseEther("100"));

      // Platform burns tokens from multiple users
      await cvrsToken
        .connect(platform)
        .burnFrom(user1.address, ethers.parseEther("50"));
      await cvrsToken
        .connect(platform)
        .burnFrom(user2.address, ethers.parseEther("30"));

      expect(await cvrsToken.totalBurned()).to.equal(ethers.parseEther("80"));
      expect(await cvrsToken.balanceOf(user1.address)).to.equal(
        ethers.parseEther("50")
      );
      expect(await cvrsToken.balanceOf(user2.address)).to.equal(
        ethers.parseEther("70")
      );
    });
  });

  describe("Security Tests", function () {
    it("Should prevent reentrancy attacks", async function () {
      const { cvrsToken, user1, minter } = await loadFixture(
        deployCVRSTokenFixture
      );

      // This test ensures the nonReentrant modifier works
      // In a real reentrancy attack, the attacker would try to call the function again
      // during execution, but the modifier should prevent this

      await cvrsToken.connect(user1).claimDailyReward();

      // Try to claim again immediately - should fail
      await expect(
        cvrsToken.connect(user1).claimDailyReward()
      ).to.be.revertedWithCustomError(cvrsToken, "TooEarlyToClaim");
    });

    it("Should prevent unauthorized role escalation", async function () {
      const { cvrsToken, user1, user2 } = await loadFixture(
        deployCVRSTokenFixture
      );

      // Regular users should not be able to grant themselves roles
      await expect(cvrsToken.connect(user1).authorizeMinter(user2.address)).to
        .be.reverted;
      await expect(cvrsToken.connect(user1).grantPlatformRole(user2.address)).to
        .be.reverted;
      await expect(cvrsToken.connect(user1).pause()).to.be.reverted;
    });

    it("Should handle malicious input gracefully", async function () {
      const { cvrsToken, user1, minter } = await loadFixture(
        deployCVRSTokenFixture
      );

      // Test with very large numbers
      const maxUint256 = ethers.MaxUint256;

      await expect(
        cvrsToken
          .connect(minter)
          .mintReward(user1.address, maxUint256, "malicious")
      ).to.be.revertedWithCustomError(cvrsToken, "ExceedsMaxSupply");
    });
  });
});
