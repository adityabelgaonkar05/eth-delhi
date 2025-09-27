const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🎮 Deploying Pet NFT with Real Walrus Metadata...");

  // Load Walrus verified upload data
  const walrusDataPath = path.join(__dirname, '../frontend/src/contractData/WalrusVerifiedUpload.json');
  const walrusData = JSON.parse(fs.readFileSync(walrusDataPath, 'utf8'));

  console.log(`📊 Found ${walrusData.successfulUploads} pets with Walrus metadata`);

  // Get deployed token addresses
  const cvrsTokenAddress = "0x4B5e2Ea58B618A958AB0EE1B3B2b3c5c76C4b9a1"; // Update with actual CVRS token address
  const treasury = "0x4C3F5a84041E562928394d63b3E339bE70DBcC17"; // Update with actual treasury

  console.log(`💰 Using CVRS Token: ${cvrsTokenAddress}`);
  console.log(`🏦 Using Treasury: ${treasury}`);

  // Deploy Pet NFT contract
  const CryptoVersePetNFT = await ethers.getContractFactory("CryptoVersePetNFT");
  const petNFT = await CryptoVersePetNFT.deploy(cvrsTokenAddress, treasury);

  await petNFT.waitForDeployment();
  const petNFTAddress = await petNFT.getAddress();

  console.log(`🐾 Pet NFT deployed to: ${petNFTAddress}`);

  // Prepare metadata URLs from Walrus data
  const metadataUrls = [];
  for (let i = 1; i <= 7; i++) {
    const asset = walrusData.assets.find(a => a.petId === i);
    if (asset && asset.metadataBlobId) {
      metadataUrls.push(asset.metadataUrl);
      console.log(`✅ Pet ${i}: Using Walrus metadata: ${asset.metadataUrl}`);
    } else {
      // Fallback for pets that failed to upload
      const fallbackUrl = `https://localhost:3000/metadata/pet${i}.json`;
      metadataUrls.push(fallbackUrl);
      console.log(`⚠️  Pet ${i}: Using fallback metadata: ${fallbackUrl}`);
    }
  }

  // Initialize all pets with their Walrus metadata
  console.log("\n🔄 Initializing pets with Walrus metadata...");
  
  try {
    const tx = await petNFT.initializePets(metadataUrls);
    await tx.wait();
    console.log("✅ All pets initialized with Walrus metadata!");
  } catch (error) {
    console.error("❌ Error initializing pets:", error.message);
    // Try individual initialization if batch fails
    console.log("🔄 Trying individual pet initialization...");
    
    for (let i = 0; i < metadataUrls.length; i++) {
      try {
        const tx = await petNFT.initializePets([metadataUrls[i]]);
        await tx.wait();
        console.log(`✅ Pet ${i + 1} initialized`);
      } catch (err) {
        console.error(`❌ Failed to initialize pet ${i + 1}:`, err.message);
      }
    }
  }

  // Save contract data
  const contractData = {
    address: petNFTAddress,
    abi: CryptoVersePetNFT.interface.formatJson(),
    network: 'flowTestnet',
    deployedAt: new Date().toISOString(),
    walrusIntegration: true,
    walrusMetadataUrls: metadataUrls,
    successfulWalrusUploads: walrusData.successfulUploads
  };

  const contractDataPath = path.join(__dirname, '../frontend/src/contractData/CryptoVersePetNFT.json');
  fs.writeFileSync(contractDataPath, JSON.stringify(contractData, null, 2));

  console.log("\n🎉 Pet NFT Deployment Summary:");
  console.log(`📍 Contract Address: ${petNFTAddress}`);
  console.log(`🌊 Walrus Pets: ${walrusData.successfulUploads}/7`);
  console.log(`💾 Contract data saved to: ${contractDataPath}`);
  
  console.log("\n🔗 Walrus Blob URLs:");
  walrusData.assets.forEach(asset => {
    if (asset.imageBlobId) {
      console.log(`🐾 ${asset.name}: ${asset.imageUrl}`);
      console.log(`📄 Metadata: ${asset.metadataUrl}`);
      console.log(`🔍 Walruscan: ${asset.walruscanUrl}`);
      console.log("");
    }
  });

  console.log("✅ Pet NFT with Walrus integration deployed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });