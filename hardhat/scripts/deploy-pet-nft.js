const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting CryptoVerse Pet NFT deployment...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    try {
        // Get the CryptoVerseToken contract address (should be deployed first)
        const CVRS_TOKEN_ADDRESS = process.env.CVRS_TOKEN_ADDRESS || "0x..."; // Replace with actual deployed address
        const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address; // Use deployer as treasury by default
        
        console.log("🎯 Using CVRS Token address:", CVRS_TOKEN_ADDRESS);
        console.log("💰 Using Treasury address:", TREASURY_ADDRESS);
        
        // Deploy CryptoVersePetNFT
        console.log("\n📦 Deploying CryptoVersePetNFT...");
        const CryptoVersePetNFT = await ethers.getContractFactory("CryptoVersePetNFT");
        const petNFT = await CryptoVersePetNFT.deploy(CVRS_TOKEN_ADDRESS, TREASURY_ADDRESS);
        
        await petNFT.waitForDeployment();
        const petNFTAddress = await petNFT.getAddress();
        
        console.log("✅ CryptoVersePetNFT deployed to:", petNFTAddress);
        
        // Verify contract deployment
        console.log("\n🔍 Verifying deployment...");
        
        // Check if pets were created
        const totalPets = await petNFT.totalPets();
        console.log("📊 Total pets created:", totalPets.toString());
        
        // Get marketplace stats
        const stats = await petNFT.getMarketplaceStats();
        console.log("📈 Marketplace Stats:");
        console.log("   - Total Pets:", stats.totalPetsCreated.toString());
        console.log("   - Available for Sale:", stats.availableCount.toString());
        console.log("   - Total Sales:", stats.totalSalesCount.toString());
        console.log("   - Total Revenue:", ethers.formatEther(stats.totalRevenueAmount), "CVRS");
        
        // Display pet details
        console.log("\n🐾 Pet Collection:");
        for (let i = 1; i <= totalPets; i++) {
            try {
                const pet = await petNFT.getPetDetails(i);
                const tierNames = ["COMMON", "RARE", "EPIC", "LEGENDARY"];
                console.log(`   Pet ${i}: ${pet.name} (${tierNames[pet.tier]}) - ${ethers.formatEther(pet.price)} CVRS`);
            } catch (error) {
                console.log(`   Pet ${i}: Error fetching details`);
            }
        }
        
        // Display tier prices
        console.log("\n💰 Tier Pricing:");
        const tierNames = ["COMMON", "RARE", "EPIC", "LEGENDARY"];
        for (let tier = 0; tier < 4; tier++) {
            try {
                const price = await petNFT.tierPrices(tier);
                console.log(`   ${tierNames[tier]}: ${ethers.formatEther(price)} CVRS`);
            } catch (error) {
                console.log(`   ${tierNames[tier]}: Error fetching price`);
            }
        }
        
        // Save deployment info
        const deploymentInfo = {
            network: network.name,
            deployer: deployer.address,
            contracts: {
                CryptoVersePetNFT: {
                    address: petNFTAddress,
                    constructor: [CVRS_TOKEN_ADDRESS, TREASURY_ADDRESS]
                }
            },
            metadata: {
                totalPets: totalPets.toString(),
                deploymentTime: new Date().toISOString(),
                tierPrices: {
                    COMMON: "100 CVRS",
                    RARE: "250 CVRS", 
                    EPIC: "500 CVRS",
                    LEGENDARY: "1000 CVRS"
                }
            }
        };
        
        console.log("\n📋 Deployment Summary:");
        console.log("=====================================");
        console.log(`Network: ${network.name}`);
        console.log(`CryptoVersePetNFT: ${petNFTAddress}`);
        console.log(`CVRS Token: ${CVRS_TOKEN_ADDRESS}`);
        console.log(`Treasury: ${TREASURY_ADDRESS}`);
        console.log("=====================================");
        
        console.log("\n🎉 Pet NFT deployment completed successfully!");
        console.log("💡 Next steps:");
        console.log("   1. Update frontend with contract address");
        console.log("   2. Set proper metadata URLs");
        console.log("   3. Test pet purchasing with CVRS tokens");
        
        return deploymentInfo;
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        throw error;
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then((deploymentInfo) => {
        console.log("Deployment info:", JSON.stringify(deploymentInfo, null, 2));
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });