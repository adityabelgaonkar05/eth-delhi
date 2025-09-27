const { ethers } = require("hardhat");
const { writeFileSync, mkdirSync, existsSync } = require("fs");
const path = require("path");

// Save contract data for frontend
function saveContractData(contractName, address, contractInstance) {
  const contractData = {
    address,
    abi: JSON.parse(contractInstance.interface.formatJson()),
  };

  const contractDataDir = path.join(
    __dirname,
    "../../frontend/src/contractData"
  );

  if (!existsSync(contractDataDir)) {
    mkdirSync(contractDataDir, { recursive: true });
  }

  const filePath = path.join(contractDataDir, `${contractName}.json`);
  writeFileSync(filePath, JSON.stringify(contractData, null, 2));
  console.log(
    `📄 Saved ${contractName} data to contractData/${contractName}.json`
  );
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying contracts with:", deployer.address);
  console.log(
    "💰 Balance:",
    ethers.formatEther(await deployer.provider.getBalance(deployer.address)),
    "ETH"
  );

  // ============================
  // Deploy Contracts
  // ============================

  // 1. CryptoVerseToken
  const CryptoVerseToken = await ethers.getContractFactory("CryptoVerseToken");
  const cryptoVerseToken = await CryptoVerseToken.deploy();
  await cryptoVerseToken.waitForDeployment();
  const cryptoVerseTokenAddress = await cryptoVerseToken.getAddress();
  saveContractData(
    "CryptoVerseToken",
    cryptoVerseTokenAddress,
    cryptoVerseToken
  );

  // 2. WalrusStorage
  const WalrusStorage = await ethers.getContractFactory("WalrusStorage");
  const walrusStorage = await WalrusStorage.deploy(
    "https://publisher-devnet.walrus.space",
    "https://aggregator-devnet.walrus.space",
    "https://fullnode.devnet.sui.io:443",
    deployer.address,
    true
  );
  await walrusStorage.waitForDeployment();
  const walrusStorageAddress = await walrusStorage.getAddress();
  saveContractData("WalrusStorage", walrusStorageAddress, walrusStorage);

  // 3. SelfProtocolIntegration
  const SelfProtocolIntegration = await ethers.getContractFactory(
    "SelfProtocolIntegration"
  );
  const selfProtocolIntegration = await SelfProtocolIntegration.deploy({
    appScope: "CryptoVerse",
    minimumAge: 18,
    requireOfacScreening: true,
    excludedCountries: [],
    verificationValidityPeriod: 31536000, // 1 year
    requireNationalityDisclosure: false,
    requireGenderDisclosure: false
  });
  await selfProtocolIntegration.waitForDeployment();
  const selfProtocolIntegrationAddress =
    await selfProtocolIntegration.getAddress();
  saveContractData(
    "SelfProtocolIntegration",
    selfProtocolIntegrationAddress,
    selfProtocolIntegration
  );

  // 4. UserRegistry
  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy(
    selfProtocolIntegrationAddress,
    cryptoVerseTokenAddress
  );
  await userRegistry.waitForDeployment();
  const userRegistryAddress = await userRegistry.getAddress();
  saveContractData("UserRegistry", userRegistryAddress, userRegistry);

  // 5. BadgeManager
  const BadgeManager = await ethers.getContractFactory("BadgeManager");
  const badgeManager = await BadgeManager.deploy(
    userRegistryAddress,
    cryptoVerseTokenAddress,
    deployer.address
  );
  await badgeManager.waitForDeployment();
  const badgeManagerAddress = await badgeManager.getAddress();
  saveContractData("BadgeManager", badgeManagerAddress, badgeManager);

  // 6. BlogManagerWithWalrus
  const BlogManager = await ethers.getContractFactory("BlogManagerWithWalrus");
  const blogManager = await BlogManager.deploy(
    userRegistryAddress,
    selfProtocolIntegrationAddress,
    walrusStorageAddress
  );
  await blogManager.waitForDeployment();
  const blogManagerAddress = await blogManager.getAddress();
  saveContractData("BlogManagerWithWalrus", blogManagerAddress, blogManager);

  // 7. CryptoVerseDeploymentFactory (Skip on Flow testnet due to size limits)
  let cryptoVerseDeploymentFactoryAddress = null;
  try {
    console.log("⏳ Attempting to deploy CryptoVerseDeploymentFactory...");
    const CryptoVerseDeploymentFactory = await ethers.getContractFactory(
      "CryptoVerseDeploymentFactory"
    );
    const cryptoVerseDeploymentFactory =
      await CryptoVerseDeploymentFactory.deploy();
    await cryptoVerseDeploymentFactory.waitForDeployment();
    cryptoVerseDeploymentFactoryAddress =
      await cryptoVerseDeploymentFactory.getAddress();
    saveContractData(
      "CryptoVerseDeploymentFactory",
      cryptoVerseDeploymentFactoryAddress,
      cryptoVerseDeploymentFactory
    );
    console.log("✅ CryptoVerseDeploymentFactory deployed successfully!");
  } catch (error) {
    if (
      error.message.includes("max initcode size exceeded") ||
      error.message.includes("code size")
    ) {
      console.log(
        "⚠️  CryptoVerseDeploymentFactory deployment failed due to contract size limit on Flow testnet"
      );
      console.log(
        "📝 This contract is too large for Flow testnet but works fine on local/mainnet"
      );
    } else {
      console.log(
        "⚠️  CryptoVerseDeploymentFactory deployment failed:",
        error.message
      );
    }
    console.log("🔄 Continuing with other contracts...");
  }

  // 8. PremiereAttendanceBadge
  const PremiereAttendanceBadge = await ethers.getContractFactory(
    "PremiereAttendanceBadge"
  );
  const premiereAttendanceBadge = await PremiereAttendanceBadge.deploy(
    walrusStorageAddress
  );
  await premiereAttendanceBadge.waitForDeployment();
  const premiereAttendanceBadgeAddress =
    await premiereAttendanceBadge.getAddress();
  saveContractData(
    "PremiereAttendanceBadge",
    premiereAttendanceBadgeAddress,
    premiereAttendanceBadge
  );

  // 10. VideoPremiereManager
  const VideoPremiereManager = await ethers.getContractFactory(
    "VideoPremiereManager"
  );
  const videoPremiereManager = await VideoPremiereManager.deploy(
    walrusStorageAddress,
    selfProtocolIntegrationAddress,
    premiereAttendanceBadgeAddress
  );
  await videoPremiereManager.waitForDeployment();
  const videoPremiereManagerAddress = await videoPremiereManager.getAddress();
  saveContractData(
    "VideoPremiereManager",
    videoPremiereManagerAddress,
    videoPremiereManager
  );

  // 11. EscrowManager
  const EscrowManager = await ethers.getContractFactory("EscrowManager");
  const escrowManager = await EscrowManager.deploy(
    cryptoVerseTokenAddress,
    userRegistryAddress,
    deployer.address
  );
  await escrowManager.waitForDeployment();
  const escrowManagerAddress = await escrowManager.getAddress();
  saveContractData("EscrowManager", escrowManagerAddress, escrowManager);

  // 12. WalrusOracle
  const WalrusOracle = await ethers.getContractFactory("WalrusOracle");
  const walrusOracle = await WalrusOracle.deploy(
    "https://publisher-devnet.walrus.space",
    "https://aggregator-devnet.walrus.space"
  );
  await walrusOracle.waitForDeployment();
  const walrusOracleAddress = await walrusOracle.getAddress();
  saveContractData("WalrusOracle", walrusOracleAddress, walrusOracle);

  // 13. ReputationOracle
  const ReputationOracle = await ethers.getContractFactory("ReputationOracle");
  const reputationOracle = await ReputationOracle.deploy(
    videoPremiereManagerAddress,
    escrowManagerAddress
  );
  await reputationOracle.waitForDeployment();
  const reputationOracleAddress = await reputationOracle.getAddress();
  saveContractData(
    "ReputationOracle",
    reputationOracleAddress,
    reputationOracle
  );

  // 14. ReputationAirdropEscrow
  const ReputationAirdropEscrow = await ethers.getContractFactory(
    "ReputationAirdropEscrow"
  );
  const reputationAirdropEscrow = await ReputationAirdropEscrow.deploy(
    selfProtocolIntegrationAddress,
    deployer.address
  );
  await reputationAirdropEscrow.waitForDeployment();
  const reputationAirdropEscrowAddress =
    await reputationAirdropEscrow.getAddress();
  saveContractData(
    "ReputationAirdropEscrow",
    reputationAirdropEscrowAddress,
    reputationAirdropEscrow
  );

  // 15. LeaderboardManager
  const LeaderboardManager = await ethers.getContractFactory(
    "LeaderboardManager"
  );
  const leaderboard = await LeaderboardManager.deploy(
    userRegistryAddress,
    cryptoVerseTokenAddress
  );
  await leaderboard.waitForDeployment();
  const leaderboardAddress = await leaderboard.getAddress();
  saveContractData("LeaderboardManager", leaderboardAddress, leaderboard);

  // 17. CryptoVerseBusinessDashboard
  let cryptoVerseBusinessDashboardAddress = null;
  try {
    console.log("⏳ Attempting to deploy CryptoVerseBusinessDashboard...");
    const CryptoVerseBusinessDashboard = await ethers.getContractFactory(
      "CryptoVerseBusinessDashboard"
    );
    const cryptoVerseBusinessDashboard =
      await CryptoVerseBusinessDashboard.deploy(
        videoPremiereManagerAddress,
        escrowManagerAddress,
        reputationOracleAddress,
        premiereAttendanceBadgeAddress
      );
    await cryptoVerseBusinessDashboard.waitForDeployment();
    cryptoVerseBusinessDashboardAddress =
      await cryptoVerseBusinessDashboard.getAddress();
    saveContractData(
      "CryptoVerseBusinessDashboard",
      cryptoVerseBusinessDashboardAddress,
      cryptoVerseBusinessDashboard
    );
    console.log("✅ CryptoVerseBusinessDashboard deployed successfully!");
  } catch (error) {
    if (
      error.message.includes("max initcode size exceeded") ||
      error.message.includes("code size")
    ) {
      console.log(
        "⚠️  CryptoVerseBusinessDashboard deployment failed due to contract size limit on Flow testnet"
      );
      console.log(
        "📝 This contract is too large for Flow testnet but works fine on local/mainnet"
      );
    } else {
      console.log(
        "⚠️  CryptoVerseBusinessDashboard deployment failed:",
        error.message
      );
    }
    console.log("🔄 Continuing with deployment summary...");
  }

  // ============================
  // Deployment Summary
  // ============================
  const deployedContracts = [
    { name: "CryptoVerseToken", address: cryptoVerseTokenAddress },
    { name: "WalrusStorage", address: walrusStorageAddress },
    {
      name: "SelfProtocolIntegration",
      address: selfProtocolIntegrationAddress,
    },
    { name: "UserRegistry", address: userRegistryAddress },
    { name: "BadgeManager", address: badgeManagerAddress },
    { name: "BlogManagerWithWalrus", address: blogManagerAddress },
    {
      name: "CryptoVerseDeploymentFactory",
      address: cryptoVerseDeploymentFactoryAddress,
    },
    {
      name: "PremiereAttendanceBadge",
      address: premiereAttendanceBadgeAddress,
    },
    { name: "VideoPremiereManager", address: videoPremiereManagerAddress },
    { name: "EscrowManager", address: escrowManagerAddress },
    { name: "WalrusOracle", address: walrusOracleAddress },
    { name: "ReputationOracle", address: reputationOracleAddress },
    {
      name: "ReputationAirdropEscrow",
      address: reputationAirdropEscrowAddress,
    },
    { name: "LeaderboardManager", address: leaderboardAddress },
    {
      name: "CryptoVerseBusinessDashboard",
      address: cryptoVerseBusinessDashboardAddress,
    },
  ].filter((contract) => contract.address !== null);

  console.log(
    `\n🎉 ${deployedContracts.length} CONTRACTS DEPLOYED SUCCESSFULLY! 🎉`
  );
  console.log("==========================================");
  console.log("📄 Deployed Contract Addresses:");
  console.log("==========================================");

  deployedContracts.forEach((contract) => {
    console.log(`🟢 ${contract.name}: ${contract.address}`);
  });

  const skippedContracts = 17 - deployedContracts.length;
  if (skippedContracts > 0) {
    console.log("==========================================");
    console.log(
      `⚠️  ${skippedContracts} contract(s) skipped due to size limits`
    );
    console.log("� These contracts work fine on local/mainnet networks");
  }

  console.log("==========================================");
  console.log(`✨ Total Contracts Deployed: ${deployedContracts.length}/17`);
  console.log("==========================================");
  console.log("\n📁 CONTRACT DATA FILES CREATED:");
  console.log("All deployed contract addresses and ABIs have been saved to:");
  console.log("📂 frontend/src/contractData/");
  console.log("==========================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Deployment failed:", err);
    process.exit(1);
  });
