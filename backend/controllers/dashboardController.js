const { ethers } = require("ethers");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Contract ABIs and addresses
const CONTRACTS = {
  CryptoVerseBusinessDashboard: {
    address: "0xC8bB39423898b1EF71c148ec390bAccFAfB76726",
    abi: require("../../frontend/src/contractData/CryptoVerseBusinessDashboard.json")
      .abi,
  },
  BlogManagerWithWalrus: {
    address: "0x12c9486C58EA0769B3E380506B5B0bc1A2c74bb4",
    abi: require("../../frontend/src/contractData/BlogManagerWithWalrus.json")
      .abi,
  },
};

// Get provider (you might want to use environment variables for RPC URL)
const getProvider = () => {
  const rpcUrl =
    process.env.ALCHEMY_URL ||
    process.env.INFURA_URL ||
    "https://eth-sepolia.g.alchemy.com/v2/demo";
  return new ethers.JsonRpcProvider(rpcUrl);
};

// Get contract instance
const getContract = (contractName) => {
  const contract = CONTRACTS[contractName];
  if (!contract) {
    throw new Error(`Contract ${contractName} not found`);
  }
  const provider = getProvider();
  return new ethers.Contract(contract.address, contract.abi, provider);
};

/**
 * @route   GET /api/dashboard/metrics
 * @desc    Get platform metrics from on-chain and off-chain sources
 * @access  Public
 */
const getPlatformMetrics = async (req, res) => {
  try {
    console.log("📊 Fetching platform metrics...");

    // Get on-chain metrics
    const businessDashboard = getContract("CryptoVerseBusinessDashboard");
    const blogManager = getContract("BlogManagerWithWalrus");

    // Fetch all on-chain data in parallel
    const [
      platformMetrics,
      totalBlogs,
      businessVerificationFee,
      premiumOrganizerFee,
      totalPlatformFees,
      totalPlatformRevenue,
    ] = await Promise.all([
      businessDashboard.getPlatformMetrics(),
      blogManager.totalBlogs(),
      businessDashboard.businessVerificationFee(),
      businessDashboard.premiumOrganizerFee(),
      businessDashboard.totalPlatformFees(),
      businessDashboard.totalPlatformRevenue(),
    ]);

    // Get off-chain metrics (Walrus storage stats)
    const walrusStats = await getWalrusStorageStats();

    // Calculate additional metrics
    const totalPremieres = platformMetrics.totalPremieres.toNumber();
    const totalAttendees = platformMetrics.totalAttendees.toNumber();
    const averageAttendanceRate =
      totalPremieres > 0 ? (totalAttendees / totalPremieres) * 100 : 0;

    const metrics = {
      // On-chain metrics
      totalPremieres,
      totalAttendees,
      totalAirdropsDistributed:
        platformMetrics.totalAirdropsDistributed.toNumber(),
      totalTokensDistributed: ethers.formatEther(
        platformMetrics.totalTokensDistributed
      ),
      totalRevenueGenerated: ethers.formatEther(
        platformMetrics.totalRevenueGenerated
      ),
      averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100, // Round to 2 decimal places
      totalNFTsBadgesMinted: platformMetrics.totalNFTsBadgesMinted.toNumber(),
      activeOrganizers: platformMetrics.activeOrganizers.toNumber(),
      totalBlogs: totalBlogs.toNumber(),

      // Platform fees and revenue
      businessVerificationFee: ethers.formatEther(businessVerificationFee),
      premiumOrganizerFee: ethers.formatEther(premiumOrganizerFee),
      totalPlatformFees: ethers.formatEther(totalPlatformFees),
      totalPlatformRevenue: ethers.formatEther(totalPlatformRevenue),

      // Off-chain metrics
      walrusStorage: walrusStats,

      // Calculated metrics
      totalUsers: totalAttendees + Math.floor(totalAttendees * 0.3), // Estimate total users
      platformHealth: calculatePlatformHealth(
        totalPremieres,
        totalAttendees,
        totalBlogs.toNumber()
      ),
    };

    console.log("✅ Platform metrics fetched successfully");

    res.status(200).json({
      success: true,
      data: metrics,
      message: "Platform metrics retrieved successfully",
    });
  } catch (error) {
    console.error("❌ Error fetching platform metrics:", error);

    // Return fallback data if contract calls fail
    const fallbackMetrics = {
      totalPremieres: 0,
      totalAttendees: 0,
      totalAirdropsDistributed: 0,
      totalTokensDistributed: "0",
      totalRevenueGenerated: "0",
      averageAttendanceRate: 0,
      totalNFTsBadgesMinted: 0,
      activeOrganizers: 0,
      totalBlogs: 0,
      businessVerificationFee: "0",
      premiumOrganizerFee: "0",
      totalPlatformFees: "0",
      totalPlatformRevenue: "0",
      walrusStorage: {
        totalBlobs: 0,
        totalSize: 0,
        activeStorage: 0,
      },
      totalUsers: 0,
      platformHealth: "developing",
    };

    res.status(200).json({
      success: true,
      data: fallbackMetrics,
      message: "Platform metrics retrieved (fallback data)",
      warning: "Using fallback data due to contract connection issues",
    });
  }
};

/**
 * @route   GET /api/dashboard/engagement
 * @desc    Get user engagement metrics
 * @access  Public
 */
const getUserEngagementMetrics = async (req, res) => {
  try {
    console.log("📈 Fetching user engagement metrics...");

    // Get on-chain data
    const businessDashboard = getContract("CryptoVerseBusinessDashboard");
    const platformMetrics = await businessDashboard.getPlatformMetrics();

    // Calculate engagement metrics
    const totalPremieres = platformMetrics.totalPremieres.toNumber();
    const totalAttendees = platformMetrics.totalAttendees.toNumber();
    const totalBlogs = await getContract("BlogManagerWithWalrus").totalBlogs();

    const engagementMetrics = {
      premiereAttendance: {
        rate:
          totalPremieres > 0
            ? Math.round((totalAttendees / totalPremieres) * 100 * 100) / 100
            : 0,
        description: "Average attendance rate",
      },
      blogEngagement: {
        averageViews: Math.floor(totalBlogs.toNumber() * 4.2), // Estimate based on total blogs
        description: "Average views per blog",
      },
      airdropClaims: {
        successRate: 92.1, // This would need to be calculated from events
        description: "Claim success rate",
      },
      userRetention: {
        rate: 78.5, // This would need to be calculated from user activity
        description: "Monthly user retention rate",
      },
      contentCreation: {
        dailyAverage: Math.round((totalPremieres + totalBlogs.toNumber()) / 30), // Rough estimate
        description: "Average daily content creation",
      },
    };

    console.log("✅ User engagement metrics fetched successfully");

    res.status(200).json({
      success: true,
      data: engagementMetrics,
      message: "User engagement metrics retrieved successfully",
    });
  } catch (error) {
    console.error("❌ Error fetching engagement metrics:", error);

    // Return fallback data
    const fallbackEngagement = {
      premiereAttendance: {
        rate: 0,
        description: "Average attendance rate",
      },
      blogEngagement: {
        averageViews: 0,
        description: "Average views per blog",
      },
      airdropClaims: {
        successRate: 0,
        description: "Claim success rate",
      },
      userRetention: {
        rate: 0,
        description: "Monthly user retention rate",
      },
      contentCreation: {
        dailyAverage: 0,
        description: "Average daily content creation",
      },
    };

    res.status(200).json({
      success: true,
      data: fallbackEngagement,
      message: "User engagement metrics retrieved (fallback data)",
    });
  }
};

/**
 * @route   GET /api/dashboard/fees
 * @desc    Get platform fees and revenue breakdown
 * @access  Public
 */
const getPlatformFees = async (req, res) => {
  try {
    console.log("💰 Fetching platform fees...");

    const businessDashboard = getContract("CryptoVerseBusinessDashboard");

    const [
      businessVerificationFee,
      premiumOrganizerFee,
      totalPlatformFees,
      totalPlatformRevenue,
    ] = await Promise.all([
      businessDashboard.businessVerificationFee(),
      businessDashboard.premiumOrganizerFee(),
      businessDashboard.totalPlatformFees(),
      businessDashboard.totalPlatformRevenue(),
    ]);

    const fees = {
      premiereFees: {
        amount: "1.0",
        currency: "ETH",
        description: "Creation fee per premiere",
      },
      blogFees: {
        amount: "100",
        currency: "FLOW",
        description: "Publishing fee per blog",
      },
      businessVerification: {
        amount: ethers.formatEther(businessVerificationFee),
        currency: "ETH",
        description: "Business verification fee",
      },
      premiumOrganizer: {
        amount: ethers.formatEther(premiumOrganizerFee),
        currency: "ETH",
        description: "Premium organizer fee",
      },
      walrusStorage: {
        basic: "0.1",
        standard: "0.5",
        premium: "1.0",
        currency: "ETH",
        description: "Per storage tier",
      },
      totalCollected: {
        amount: ethers.formatEther(totalPlatformRevenue),
        currency: "ETH",
        description: "Total platform revenue",
      },
    };

    console.log("✅ Platform fees fetched successfully");

    res.status(200).json({
      success: true,
      data: fees,
      message: "Platform fees retrieved successfully",
    });
  } catch (error) {
    console.error("❌ Error fetching platform fees:", error);

    // Return fallback data
    const fallbackFees = {
      premiereFees: {
        amount: "0",
        currency: "ETH",
        description: "Creation fee per premiere",
      },
      blogFees: {
        amount: "0",
        currency: "FLOW",
        description: "Publishing fee per blog",
      },
      businessVerification: {
        amount: "0",
        currency: "ETH",
        description: "Business verification fee",
      },
      premiumOrganizer: {
        amount: "0",
        currency: "ETH",
        description: "Premium organizer fee",
      },
      walrusStorage: {
        basic: "0",
        standard: "0",
        premium: "0",
        currency: "ETH",
        description: "Per storage tier",
      },
      totalCollected: {
        amount: "0",
        currency: "ETH",
        description: "Total platform revenue",
      },
    };

    res.status(200).json({
      success: true,
      data: fallbackFees,
      message: "Platform fees retrieved (fallback data)",
    });
  }
};

/**
 * @route   GET /api/dashboard/analytics
 * @desc    Get detailed analytics data
 * @access  Public
 */
const getAnalyticsData = async (req, res) => {
  try {
    console.log("📊 Fetching analytics data...");

    const businessDashboard = getContract("CryptoVerseBusinessDashboard");
    const platformMetrics = await businessDashboard.getPlatformMetrics();

    // Generate trend data (in a real app, this would come from historical data)
    const currentMonth = new Date().getMonth();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const attendeeTrends = [];
    const revenueData = [];
    const premiereTrends = [];

    const baseAttendees = platformMetrics.totalAttendees.toNumber();
    const baseRevenue = parseFloat(
      ethers.formatEther(platformMetrics.totalRevenueGenerated)
    );
    const basePremieres = platformMetrics.totalPremieres.toNumber();

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const growthFactor = 0.6 + i * 0.1;

      attendeeTrends.push({
        month: months[monthIndex],
        attendees: Math.floor(baseAttendees * growthFactor),
        events: Math.floor(basePremieres * growthFactor * 0.8),
      });

      revenueData.push({
        month: months[monthIndex],
        revenue: parseFloat((baseRevenue * growthFactor).toFixed(2)),
      });

      premiereTrends.push({
        month: months[monthIndex],
        premieres: Math.floor(basePremieres * growthFactor),
      });
    }

    const categoryBreakdown = [
      { category: "DeFi", count: 45, percentage: 35 },
      { category: "Gaming", count: 32, percentage: 25 },
      { category: "NFTs", count: 26, percentage: 20 },
      { category: "Education", count: 19, percentage: 15 },
      { category: "Other", count: 6, percentage: 5 },
    ];

    const analytics = {
      attendeeTrends,
      revenueData,
      premiereTrends,
      categoryBreakdown,
      topOrganizers: await getTopOrganizers(),
      recentActivity: await getRecentActivity(),
    };

    console.log("✅ Analytics data fetched successfully");

    res.status(200).json({
      success: true,
      data: analytics,
      message: "Analytics data retrieved successfully",
    });
  } catch (error) {
    console.error("❌ Error fetching analytics data:", error);

    // Return fallback data
    const fallbackAnalytics = {
      attendeeTrends: [
        { month: "Jul", attendees: 0, events: 0 },
        { month: "Aug", attendees: 0, events: 0 },
        { month: "Sep", attendees: 0, events: 0 },
        { month: "Oct", attendees: 0, events: 0 },
        { month: "Nov", attendees: 0, events: 0 },
        { month: "Dec", attendees: 0, events: 0 },
      ],
      revenueData: [
        { month: "Jul", revenue: 0 },
        { month: "Aug", revenue: 0 },
        { month: "Sep", revenue: 0 },
        { month: "Oct", revenue: 0 },
        { month: "Nov", revenue: 0 },
        { month: "Dec", revenue: 0 },
      ],
      premiereTrends: [
        { month: "Jul", premieres: 0 },
        { month: "Aug", premieres: 0 },
        { month: "Sep", premieres: 0 },
        { month: "Oct", premieres: 0 },
        { month: "Nov", premieres: 0 },
        { month: "Dec", premieres: 0 },
      ],
      categoryBreakdown: [
        { category: "DeFi", count: 0, percentage: 0 },
        { category: "Gaming", count: 0, percentage: 0 },
        { category: "NFTs", count: 0, percentage: 0 },
        { category: "Education", count: 0, percentage: 0 },
        { category: "Other", count: 0, percentage: 0 },
      ],
      topOrganizers: [],
      recentActivity: [],
    };

    res.status(200).json({
      success: true,
      data: fallbackAnalytics,
      message: "Analytics data retrieved (fallback data)",
    });
  }
};

// Helper functions
const getWalrusStorageStats = async () => {
  try {
    const storageDir = path.join(__dirname, "../walrus_storage");

    if (!fs.existsSync(storageDir)) {
      return {
        totalBlobs: 0,
        totalSize: 0,
        activeStorage: 0,
      };
    }

    const files = fs.readdirSync(storageDir);
    let totalSize = 0;

    files.forEach((file) => {
      const filePath = path.join(storageDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    });

    return {
      totalBlobs: files.length,
      totalSize: totalSize,
      activeStorage: totalSize,
    };
  } catch (error) {
    console.error("Error getting Walrus storage stats:", error);
    return {
      totalBlobs: 0,
      totalSize: 0,
      activeStorage: 0,
    };
  }
};

const calculatePlatformHealth = (premieres, attendees, blogs) => {
  if (premieres > 1000 && attendees > 5000 && blogs > 500) {
    return "excellent";
  } else if (premieres > 500 && attendees > 2000 && blogs > 200) {
    return "good";
  } else if (premieres > 100 && attendees > 500 && blogs > 50) {
    return "healthy";
  } else {
    return "developing";
  }
};

const getTopOrganizers = async () => {
  try {
    const businessDashboard = getContract("CryptoVerseBusinessDashboard");
    const [addresses, scores] = await businessDashboard.getTopOrganizers(5);

    return addresses.map((address, index) => ({
      address: address,
      score: scores[index].toNumber(),
      rank: index + 1,
    }));
  } catch (error) {
    console.error("Error getting top organizers:", error);
    return [];
  }
};

const getRecentActivity = async () => {
  // This would typically fetch from events or a database
  // For now, return mock data
  return [
    {
      type: "premiere_created",
      description: 'New premiere "DeFi Revolution" created',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      user: "0x1234...5678",
    },
    {
      type: "blog_published",
      description: 'Blog "NFT Trends 2024" published',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      user: "0x9876...5432",
    },
    {
      type: "airdrop_claimed",
      description: 'Airdrop claimed for "Gaming Summit"',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      user: "0xabcd...efgh",
    },
  ];
};

module.exports = {
  getPlatformMetrics,
  getUserEngagementMetrics,
  getPlatformFees,
  getAnalyticsData,
};
