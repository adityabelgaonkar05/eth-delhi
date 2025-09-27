const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Deploying CryptoVerse Pet NFT to Flow testnet...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Get account balance
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "FLOW");

    try {
        // Use the already deployed CVRS token address
        const CVRS_TOKEN_ADDRESS = "0xAC7eC9008D7Bd2354786E2bdeEd83907D1FB2Cc3"; // From existing deployment
        const TREASURY_ADDRESS = deployer.address; // Use deployer as treasury for simplicity
        
        console.log("🎯 Using CVRS Token address:", CVRS_TOKEN_ADDRESS);
        console.log("💰 Using Treasury address:", TREASURY_ADDRESS);
        
        // Deploy CryptoVersePetNFT
        console.log("\n📦 Deploying CryptoVersePetNFT...");
        const CryptoVersePetNFT = await ethers.getContractFactory("CryptoVersePetNFT");
        
        console.log("⏳ Deployment in progress...");
        const petNFT = await CryptoVersePetNFT.deploy(CVRS_TOKEN_ADDRESS, TREASURY_ADDRESS);
        
        console.log("⏳ Waiting for deployment confirmation...");
        await petNFT.waitForDeployment();
        const petNFTAddress = await petNFT.getAddress();
        
        console.log("✅ CryptoVersePetNFT deployed to:", petNFTAddress);
        
        // Verify contract deployment and get pet information
        console.log("\n🔍 Verifying deployment...");
        
        const totalPets = await petNFT.totalPets();
        console.log("📊 Total pets created:", totalPets.toString());
        
        // Get marketplace stats
        const stats = await petNFT.getMarketplaceStats();
        console.log("📈 Marketplace Stats:");
        console.log("   - Total Pets:", stats.totalPetsCreated.toString());
        console.log("   - Available for Sale:", stats.availableCount.toString());
        console.log("   - Total Sales:", stats.totalSalesCount.toString());
        console.log("   - Total Revenue:", ethers.formatEther(stats.totalRevenueAmount), "CVRS");
        
        // Display pet collection details
        console.log("\n🐾 Pet Collection:");
        const tierNames = ["COMMON", "RARE", "EPIC", "LEGENDARY"];
        const tierPrices = ["100", "250", "500", "1000"];
        
        for (let i = 1; i <= totalPets; i++) {
            try {
                const pet = await petNFT.getPetDetails(i);
                console.log(`   Pet ${i}: ${pet.name} (${tierNames[pet.tier]}) - ${ethers.formatEther(pet.price)} CVRS`);
            } catch (error) {
                console.log(`   Pet ${i}: Error fetching details -`, error.message);
            }
        }
        
        // Display tier pricing
        console.log("\n💰 Tier Pricing:");
        for (let tier = 0; tier < 4; tier++) {
            console.log(`   ${tierNames[tier]}: ${tierPrices[tier]} CVRS`);
        }
        
        // Save contract data for frontend
        const contractsDir = path.join(__dirname, "../frontend/src/contractData");
        if (!fs.existsSync(contractsDir)) {
            fs.mkdirSync(contractsDir, { recursive: true });
        }
        
        // Save Pet NFT contract data
        const contractData = {
            address: petNFTAddress,
            abi: [
                "function totalPets() view returns (uint256)",
                "function getAvailablePets() view returns (uint256[], tuple(uint256 petId, string name, string description, uint8 tier, string imageURI, uint256 price, bool isForSale, uint256 createdAt)[])",
                "function getPetDetails(uint256 tokenId) view returns (tuple(uint256 petId, string name, string description, uint8 tier, string imageURI, uint256 price, bool isForSale, uint256 createdAt))",
                "function getUserPets(address user) view returns (uint256[])",
                "function getUserPurchases(address user) view returns (tuple(uint256 tokenId, address buyer, uint256 price, uint256 timestamp, uint8 tier)[])",
                "function purchasePet(uint256 tokenId)",
                "function getMarketplaceStats() view returns (uint256, uint256, uint256, uint256)",
                "function tierPrices(uint8 tier) view returns (uint256)",
                "function balanceOf(address owner) view returns (uint256)",
                "function ownerOf(uint256 tokenId) view returns (address)",
                "function tokenURI(uint256 tokenId) view returns (string)"
            ],
            network: network.name,
            deployedAt: new Date().toISOString()
        };
        
        const contractDataPath = path.join(contractsDir, "CryptoVersePetNFT.json");
        fs.writeFileSync(contractDataPath, JSON.stringify(contractData, null, 2));
        console.log("💾 Contract data saved to:", contractDataPath);
        
        // Create deployment summary
        const deploymentSummary = {
            network: network.name,
            deployer: deployer.address,
            deployerBalance: ethers.formatEther(balance),
            contracts: {
                CryptoVersePetNFT: {
                    address: petNFTAddress,
                    cvrsTokenAddress: CVRS_TOKEN_ADDRESS,
                    treasuryAddress: TREASURY_ADDRESS
                }
            },
            petCollection: {
                totalPets: totalPets.toString(),
                availableForSale: stats.availableCount.toString(),
                tierPricing: {
                    COMMON: "100 CVRS",
                    RARE: "250 CVRS", 
                    EPIC: "500 CVRS",
                    LEGENDARY: "1000 CVRS"
                }
            },
            metadata: {
                deploymentTime: new Date().toISOString(),
                metadataLocation: "frontend/public/metadata/",
                imageLocation: "frontend/public/images/"
            }
        };
        
        console.log("\n📋 Deployment Summary:");
        console.log("=====================================");
        console.log(`Network: ${network.name}`);
        console.log(`CryptoVersePetNFT: ${petNFTAddress}`);
        console.log(`CVRS Token: ${CVRS_TOKEN_ADDRESS}`);
        console.log(`Treasury: ${TREASURY_ADDRESS}`);
        console.log(`Gas Used: Check transaction receipt`);
        console.log("=====================================");
        
        console.log("\n🎉 Pet NFT deployment completed successfully!");
        console.log("\n💡 Next steps:");
        console.log("   1. Update your frontend environment with the new contract address:");
        console.log(`      REACT_APP_PET_NFT_CONTRACT=${petNFTAddress}`);
        console.log("   2. Test the Pet Shop at http://localhost:5173/pets");
        console.log("   3. Ensure your CVRS token has sufficient supply for rewards");
        console.log("   4. Test purchasing pets with CVRS tokens");
        console.log("   5. Update metadata URLs to point to your domain");
        
        console.log("\n📱 Frontend Integration:");
        console.log("   - Pet Shop component: /pets");
        console.log("   - Contract data saved to: frontend/src/contractData/CryptoVersePetNFT.json");
        console.log("   - Metadata files: frontend/public/metadata/pet[1-7].json");
        console.log("   - Pet images: frontend/public/images/pet[1-7].webp");
        
        return deploymentSummary;
        
    } catch (error) {
        console.error("❌ Pet NFT deployment failed:", error.message);
        console.error("\n🔍 Troubleshooting:");
        console.error("   1. Ensure you have sufficient FLOW tokens for gas");
        console.error("   2. Check that CVRS_TOKEN_ADDRESS is set correctly");
        console.error("   3. Verify Flow testnet RPC connection");
        console.error("   4. Check contract compilation with: npx hardhat compile");
        throw error;
    }
}

main()
    .then((deploymentSummary) => {
        if (deploymentSummary) {
            console.log("\n📊 Deployment Data:");
            console.log(JSON.stringify(deploymentSummary, null, 2));
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error("💥 Deployment script failed:", error);
        process.exit(1);
    });