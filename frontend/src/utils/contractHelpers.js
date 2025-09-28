import { ethers } from "ethers";

// Contract ABIs and addresses
import VideoPremiereManagerData from "../contractData/VideoPremiereManager.json";
import BlogManagerWithWalrusData from "../contractData/BlogManagerWithWalrus.json";
import CryptoVerseBusinessDashboardData from "../contractData/CryptoVerseBusinessDashboard.json";
import BadgeManagerData from "../contractData/BadgeManager.json";
import EscrowManagerData from "../contractData/EscrowManager.json";
import ReputationOracleData from "../contractData/ReputationOracle.json";
import CryptoVerseTokenData from "../contractData/CryptoVerseToken.json";

// Contract addresses and ABIs
export const CONTRACTS = {
  VideoPremiereManager: {
    address: VideoPremiereManagerData.address,
    abi: VideoPremiereManagerData.abi,
  },
  BlogManagerWithWalrus: {
    address: BlogManagerWithWalrusData.address,
    abi: BlogManagerWithWalrusData.abi,
  },
  CryptoVerseBusinessDashboard: {
    address: CryptoVerseBusinessDashboardData.address,
    abi: CryptoVerseBusinessDashboardData.abi,
  },
  BadgeManager: {
    address: BadgeManagerData.address,
    abi: BadgeManagerData.abi,
  },
  EscrowManager: {
    address: EscrowManagerData.address,
    abi: EscrowManagerData.abi,
  },
  ReputationOracle: {
    address: ReputationOracleData.address,
    abi: ReputationOracleData.abi,
  },
  CryptoVerseToken: {
    address: CryptoVerseTokenData.address,
    abi: CryptoVerseTokenData.abi,
  },
};

// Get provider and signer
export const getProvider = () => {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  throw new Error(
    "No web3 provider found. Please install MetaMask or another Web3 wallet."
  );
};

export const getSigner = async () => {
  const provider = getProvider();
  return await provider.getSigner();
};

// Get contract instance
export const getContract = async (contractName, withSigner = false) => {
  const contract = CONTRACTS[contractName];
  if (!contract) {
    throw new Error(`Contract ${contractName} not found`);
  }

  const provider = withSigner ? await getSigner() : getProvider();
  return new ethers.Contract(contract.address, contract.abi, provider);
};

// Event Management Functions
export const createVideoPremiere = async (premiereData) => {
  try {
    const contract = getContract("VideoPremiereManager", true);

    const tx = await contract.createVideoPremiere(
      premiereData.title,
      premiereData.description,
      premiereData.videoData, // This should be processed video data for Walrus
      premiereData.thumbnailData, // This should be processed thumbnail data
      Math.floor(
        new Date(
          premiereData.scheduledDate + "T" + premiereData.scheduledTime
        ).getTime() / 1000
      ),
      premiereData.capacity,
      premiereData.storageTier || "standard"
    );

    const receipt = await tx.wait();

    // Extract premiere ID from events
    const premiereCreatedEvent = receipt.events?.find(
      (e) => e.event === "PremiereCreated"
    );
    const premiereId = premiereCreatedEvent?.args?.premiereId;

    return { success: true, premiereId, txHash: receipt.transactionHash };
  } catch (error) {
    console.error("Error creating premiere:", error);
    return { success: false, error: error.message };
  }
};

export const configureAirdrop = async (premiereId, airdropConfig) => {
  try {
    const contract = getContract("VideoPremiereManager", true);

    const tx = await contract.configureAirdrop(
      premiereId,
      airdropConfig.tokenAddress,
      ethers.utils.parseEther(airdropConfig.totalAmount.toString()),
      airdropConfig.reputationCapPercent
    );

    const receipt = await tx.wait();
    return { success: true, txHash: receipt.transactionHash };
  } catch (error) {
    console.error("Error configuring airdrop:", error);
    return { success: false, error: error.message };
  }
};

export const getPremiereDetails = async (premiereId) => {
  try {
    const contract = getContract("VideoPremiereManager");
    const premiere = await contract.getPremiere(premiereId);

    return {
      id: premiere.id.toString(),
      organizer: premiere.organizer,
      title: premiere.title,
      description: premiere.description,
      videoWalrusHash: premiere.videoWalrusHash,
      thumbnailWalrusHash: premiere.thumbnailWalrusHash,
      scheduledTime: new Date(premiere.scheduledTime.toNumber() * 1000),
      capacity: premiere.capacity.toNumber(),
      attendeeCount: premiere.attendeeCount.toNumber(),
      status: premiere.status,
    };
  } catch (error) {
    console.error("Error getting premiere details:", error);
    return null;
  }
};

export const getUpcomingPremieres = async (limit = 10) => {
  try {
    const contract = getContract("VideoPremiereManager");
    const totalPremieres = await contract.totalPremieres();
    const upcomingEvents = [];

    // Get the latest premieres and filter for upcoming ones
    const startId = Math.max(1, totalPremieres.toNumber() - 20); // Check last 20 premieres

    for (
      let i = startId;
      i <= totalPremieres.toNumber() && upcomingEvents.length < limit;
      i++
    ) {
      try {
        const premiere = await getPremiereDetails(i);
        if (premiere && premiere.scheduledTime > new Date()) {
          upcomingEvents.push({
            id: premiere.id,
            title: premiere.title,
            date: premiere.scheduledTime.toISOString().split("T")[0],
            time: premiere.scheduledTime.toTimeString().slice(0, 5),
            attendees: premiere.attendeeCount,
            capacity: premiere.capacity,
            category: "Event", // Could be enhanced to get category from metadata
          });
        }
      } catch (error) {
        console.warn(`Error getting premiere ${i}:`, error);
        continue;
      }
    }

    // Sort by date
    upcomingEvents.sort(
      (a, b) =>
        new Date(a.date + "T" + a.time) - new Date(b.date + "T" + b.time)
    );

    return upcomingEvents;
  } catch (error) {
    console.error("Error getting upcoming premieres:", error);
    return [];
  }
};

export const getAnalyticsData = async () => {
  try {
    const platformMetrics = await getPlatformMetrics();

    // In a real implementation, you would fetch historical data from events or a subgraph
    // For now, we'll generate realistic data based on current metrics
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

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const baseAttendees = platformMetrics?.totalAttendees || 1000;
      const baseRevenue = parseFloat(
        platformMetrics?.totalRevenueGenerated || "10"
      );

      attendeeTrends.push({
        month: months[monthIndex],
        attendees: Math.floor(baseAttendees * (0.6 + i * 0.1)),
        events: Math.floor(15 + i * 3),
      });

      revenueData.push({
        month: months[monthIndex],
        revenue: parseFloat((baseRevenue * (0.3 + i * 0.15)).toFixed(2)),
      });
    }

    const categoryBreakdown = [
      { category: "DeFi", count: 45, percentage: 35 },
      { category: "Gaming", count: 32, percentage: 25 },
      { category: "NFTs", count: 26, percentage: 20 },
      { category: "Education", count: 19, percentage: 15 },
      { category: "Other", count: 6, percentage: 5 },
    ];

    return {
      attendeeTrends,
      revenueData,
      categoryBreakdown,
    };
  } catch (error) {
    console.error("Error getting analytics data:", error);
    return null;
  }
};

export const getPremiereAttendees = async (premiereId) => {
  try {
    const contract = getContract("VideoPremiereManager");
    const attendees = await contract.getPremiereAttendees(premiereId);

    // Get detailed info for each attendee
    const attendeeDetails = await Promise.all(
      attendees.map(async (address) => {
        const info = await contract.getAttendeeInfo(premiereId, address);
        return {
          address,
          reputationScore: info.reputationScore.toNumber(),
          hasAttended: info.hasAttended,
          hasClaimedAirdrop: info.hasClaimedAirdrop,
          airdropAmount: ethers.utils.formatEther(info.airdropAmount),
          joinedAt: new Date(info.joinedAt.toNumber() * 1000),
        };
      })
    );

    return attendeeDetails;
  } catch (error) {
    console.error("Error getting attendees:", error);
    return [];
  }
};

// Get all premieres from the blockchain
export const getAllPremieres = async () => {
  try {
    const contract = await getContract("VideoPremiereManager");
    const nextPremiereId = await contract.nextPremiereId();
    const premieres = [];
    
    // Get premieres from ID 1 to nextPremiereId-1
    for (let i = 1; i < nextPremiereId; i++) {
      try {
        const premiere = await contract.premieres(i);
        const registration = await contract.registrations(i);
        
        if (premiere.isActive) {
          premieres.push({
            id: i,
            title: premiere.title,
            description: premiere.description,
            organizer: premiere.organizer,
            scheduledTime: new Date(Number(premiere.scheduledTime) * 1000),
            capacity: premiere.capacity.toString(),
            attendeeCount: registration.attendeeCount.toString(),
            isActive: premiere.isActive,
            walrusVideoId: premiere.walrusVideoId,
            walrusThumbnailId: premiere.walrusThumbnailId
          });
        }
      } catch (error) {
        console.error(`Error loading premiere ${i}:`, error);
      }
    }
    
    return premieres;
  } catch (error) {
    console.error("Error fetching all premieres:", error);
    return [];
  }
};

// Blog Management Functions
export const publishBlog = async (blogData) => {
  try {
    const contract = await getContract("BlogManagerWithWalrus", true);

    // Prepare metadata according to the BlogMetadata struct
    const metadata = {
      description: blogData.description || "",
      tags: blogData.additionalTags
        ? blogData.additionalTags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : [],
      category: blogData.category || "",
      thumbnailBlobId: "", // Would be set after thumbnail upload to Walrus
      estimatedReadTime: parseInt(blogData.readTime) || 5,
      language: blogData.contentLanguage || "en",
      allowComments: blogData.allowComments !== false,
      premiumPrice:
        blogData.isPremium && blogData.premiumPrice
          ? ethers.parseEther(blogData.premiumPrice.toString())
          : 0,
    };

    // Convert content to bytes
    const contentBytes = ethers.toUtf8Bytes(blogData.content);
    const contentSize = contentBytes.length;

    // Calculate storage tier (0=EPHEMERAL, 1=STANDARD, 2=PERMANENT)
    const storageTier = parseInt(blogData.storageTier) || 1;

    // Calculate estimated cost (100 FLOW + storage costs)
    // These are rough estimates - the actual costs are calculated by the Walrus contract
    let estimatedStorageCost = 0;
    if (storageTier === 0) estimatedStorageCost = 0; // EPHEMERAL - free
    else if (storageTier === 1)
      estimatedStorageCost = ethers.parseEther("0.1"); // STANDARD
    else if (storageTier === 2) estimatedStorageCost = ethers.parseEther("0.5"); // PERMANENT

    const publishingFee = ethers.parseEther("100"); // 100 FLOW tokens
    const totalCost = publishingFee + estimatedStorageCost;

    console.log("💰 Blog publishing costs:", {
      contentSize,
      storageTier,
      publishingFee: ethers.formatEther(publishingFee),
      estimatedStorageCost: ethers.formatEther(estimatedStorageCost),
      totalCost: ethers.formatEther(totalCost),
      isPremium: blogData.isPremium || false,
    });

    // Call the contract's publishBlog function with all required parameters
    const tx = await contract.publishBlog(
      blogData.title, // string memory _title
      contentBytes, // bytes calldata _content
      metadata, // BlogMetadata memory _metadata
      blogData.isPremium || false, // bool _isPremium
      storageTier, // WalrusStorage.StorageTier _storageTier
      { value: totalCost } // Send payment with transaction
    );

    console.log("📝 Blog publishing transaction submitted:", tx.hash);

    const receipt = await tx.wait();
    console.log(
      "✅ Blog publishing transaction confirmed:",
      receipt.transactionHash
    );

    // Extract blog ID from events
    const blogPublishedEvent = receipt.logs?.find((log) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === "BlogPublished";
      } catch {
        return false;
      }
    });

    const blogId = blogPublishedEvent
      ? contract.interface.parseLog(blogPublishedEvent).args.blogId.toString()
      : null;

    console.log("🎉 Blog published successfully with ID:", blogId);

    return { success: true, blogId, txHash: receipt.transactionHash };
  } catch (error) {
    console.error("❌ Error publishing blog:", error);

    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.message.includes("InsufficientPayment")) {
      errorMessage =
        "Insufficient payment. Please ensure you have enough FLOW tokens to cover the publishing fee and storage costs.";
    } else if (error.message.includes("EmptyContent")) {
      errorMessage = "Blog content cannot be empty.";
    } else if (error.message.includes("ContentTooLarge")) {
      errorMessage = "Blog content is too large. Maximum size is 13GB.";
    } else if (error.message.includes("execution reverted")) {
      errorMessage =
        "Transaction failed. This could be due to insufficient funds or contract issues.";
    }

    return { success: false, error: errorMessage };
  }
};

export const getBlogStats = async (blogId) => {
  try {
    const contract = getContract("BlogManagerWithWalrus");
    const stats = await contract.getBlogStats(blogId);

    return {
      totalViews: stats.totalViews.toNumber(),
      uniqueViewers: stats.uniqueViewers.toNumber(),
      totalLikes: stats.totalLikes.toNumber(),
      totalComments: stats.totalComments.toNumber(),
      totalShares: stats.totalShares.toNumber(),
    };
  } catch (error) {
    console.error("Error getting blog stats:", error);
    return null;
  }
};

export const getBlogsByAuthor = async (
  authorAddress,
  offset = 0,
  limit = 10
) => {
  try {
    const contract = getContract("BlogManagerWithWalrus");
    const blogIds = await contract.getBlogsByAuthor(
      authorAddress,
      offset,
      limit
    );

    // Get details for each blog
    const blogDetails = await Promise.all(
      blogIds.map(async (blogId) => {
        const blog = await contract.blogPosts(blogId);
        const stats = await getBlogStats(blogId);

        return {
          id: blogId.toString(),
          author: blog.author,
          title: blog.title,
          walrusBlobId: blog.walrusBlobId,
          publishedAt: new Date(blog.publishedAt.toNumber() * 1000),
          likes: blog.likes.toNumber(),
          views: blog.views.toNumber(),
          isActive: blog.isActive,
          isPremium: blog.isPremium,
          stats,
        };
      })
    );

    return blogDetails;
  } catch (error) {
    console.error("Error getting blogs by author:", error);
    return [];
  }
};

// Get all blogs from the blockchain
export const getAllBlogs = async () => {
  try {
    const contract = await getContract("BlogManagerWithWalrus");
    const totalBlogs = await contract.totalBlogs();
    const blogs = [];
    
    // Get blogs from ID 1 to totalBlogs
    for (let i = 1; i <= totalBlogs; i++) {
      try {
        const blogPost = await contract.blogPosts(i);
        const blogMetadata = await contract.blogMetadata(i);
        
        if (blogPost.isActive) {
          blogs.push({
            id: i,
            title: blogPost.title,
            author: blogPost.author,
            publishedAt: new Date(Number(blogPost.publishedAt) * 1000),
            likes: blogPost.likes.toString(),
            views: blogPost.views.toString(),
            isPremium: blogPost.isPremium,
            description: blogMetadata.description,
            category: blogMetadata.category,
            tags: blogMetadata.tags,
            walrusBlobId: blogPost.walrusBlobId,
            contentSize: blogPost.contentSize.toString(),
            tier: blogPost.tier
          });
        }
      } catch (error) {
        console.error(`Error loading blog ${i}:`, error);
      }
    }
    
    return blogs;
  } catch (error) {
    console.error("Error fetching all blogs:", error);
    return [];
  }
};

// Reward user with CVRS tokens for blog reading
export const rewardBlogReading = async (userAddress) => {
  try {
    const contract = await getContract("CryptoVerseToken", true);
    const rewardAmount = '10000000000000000000'; // 10 CVRS tokens
    
    await contract.mintReward(
      userAddress,
      rewardAmount,
      'Blog Reading Hub Visit'
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error granting blog reading reward:', error);
    return { success: false, error: error.message };
  }
};

// NFT Badge Functions
export const batchMintAttendanceBadges = async (
  premiereId,
  batchSize,
  startIndex
) => {
  try {
    const contract = getContract("VideoPremiereManager", true);

    const tx = await contract.batchMintAttendanceBadges(
      premiereId,
      batchSize,
      startIndex
    );

    const receipt = await tx.wait();
    return { success: true, txHash: receipt.transactionHash };
  } catch (error) {
    console.error("Error batch minting badges:", error);
    return { success: false, error: error.message };
  }
};

// Business Dashboard Functions
export const registerOrganizer = async (organizerData) => {
  try {
    const contract = getContract("CryptoVerseBusinessDashboard", true);

    const value =
      organizerData.requestVerification && organizerData.paymentAmount
        ? ethers.utils.parseEther(organizerData.paymentAmount.toString())
        : 0;

    const tx = await contract.registerOrganizer(
      organizerData.businessName,
      organizerData.description || "",
      organizerData.website || "",
      organizerData.contactEmail,
      organizerData.requestVerification || false,
      { value }
    );

    const receipt = await tx.wait();
    return { success: true, txHash: receipt.transactionHash };
  } catch (error) {
    console.error("Error registering organizer:", error);
    return { success: false, error: error.message };
  }
};

export const updateBusinessVerification = async (
  organizerAddress,
  verified
) => {
  try {
    const contract = getContract("CryptoVerseBusinessDashboard", true);

    const tx = await contract.updateBusinessVerification(
      organizerAddress,
      verified
    );
    const receipt = await tx.wait();

    return { success: true, txHash: receipt.transactionHash };
  } catch (error) {
    console.error("Error updating business verification:", error);
    return { success: false, error: error.message };
  }
};

export const updateOrganizerReputation = async (organizerAddress, newScore) => {
  try {
    const contract = getContract("CryptoVerseBusinessDashboard", true);

    const tx = await contract.updateOrganizerReputation(
      organizerAddress,
      newScore
    );
    const receipt = await tx.wait();

    return { success: true, txHash: receipt.transactionHash };
  } catch (error) {
    console.error("Error updating reputation:", error);
    return { success: false, error: error.message };
  }
};

export const getOrganizerAnalytics = async (organizerAddress) => {
  try {
    const contract = getContract("CryptoVerseBusinessDashboard");
    const analytics = await contract.getOrganizerAnalytics(organizerAddress);

    return {
      profile: {
        organizer: analytics.profile.organizer,
        businessName: analytics.profile.businessName,
        description: analytics.profile.description,
        website: analytics.profile.website,
        contactEmail: analytics.profile.contactEmail,
        isVerifiedBusiness: analytics.profile.isVerifiedBusiness,
        totalPremieres: analytics.profile.totalPremieres.toNumber(),
        totalAttendees: analytics.profile.totalAttendees.toNumber(),
        totalAirdropsValue: ethers.utils.formatEther(
          analytics.profile.totalAirdropsValue
        ),
        reputationScore: analytics.profile.reputationScore.toNumber(),
        joinedAt: new Date(analytics.profile.joinedAt.toNumber() * 1000),
        lastActiveAt: new Date(
          analytics.profile.lastActiveAt.toNumber() * 1000
        ),
        isActive: analytics.profile.isActive,
      },
      metrics: {
        totalPremieres: analytics.metrics.totalPremieres.toNumber(),
        totalAttendees: analytics.metrics.totalAttendees.toNumber(),
        totalAirdropsDistributed:
          analytics.metrics.totalAirdropsDistributed.toNumber(),
        totalTokensDistributed: ethers.utils.formatEther(
          analytics.metrics.totalTokensDistributed
        ),
        totalRevenueGenerated: ethers.utils.formatEther(
          analytics.metrics.totalRevenueGenerated
        ),
        averageAttendanceRate:
          analytics.metrics.averageAttendanceRate.toNumber(),
        totalNFTsBadgesMinted:
          analytics.metrics.totalNFTsBadgesMinted.toNumber(),
        activeOrganizers: analytics.metrics.activeOrganizers.toNumber(),
      },
    };
  } catch (error) {
    console.error("Error getting organizer analytics:", error);
    return null;
  }
};

export const getPlatformMetrics = async () => {
  try {
    const contract = getContract("CryptoVerseBusinessDashboard");
    const metrics = await contract.getPlatformMetrics();

    return {
      totalPremieres: metrics.totalPremieres.toNumber(),
      totalAttendees: metrics.totalAttendees.toNumber(),
      totalAirdropsDistributed: metrics.totalAirdropsDistributed.toNumber(),
      totalTokensDistributed: ethers.utils.formatEther(
        metrics.totalTokensDistributed
      ),
      totalRevenueGenerated: ethers.utils.formatEther(
        metrics.totalRevenueGenerated
      ),
      averageAttendanceRate: metrics.averageAttendanceRate.toNumber(),
      totalNFTsBadgesMinted: metrics.totalNFTsBadgesMinted.toNumber(),
      activeOrganizers: metrics.activeOrganizers.toNumber(),
    };
  } catch (error) {
    console.error("Error getting platform metrics:", error);
    return null;
  }
};

// Token Management Functions
export const giveJoinTokens = async (userAddress) => {
  try {
    const contract = await getContract("CryptoVerseToken", true);

    // Give 100 tokens to user when they first join
    const joinAmount = ethers.parseEther("100"); // 100 CVRS tokens

    const tx = await contract.mintReward(userAddress, joinAmount, "first_join");

    const receipt = await tx.wait();
    console.log("🎉 Join tokens minted successfully:", receipt.transactionHash);

    return { success: true, txHash: receipt.transactionHash, amount: "100" };
  } catch (error) {
    console.error("❌ Error giving join tokens:", error);
    return { success: false, error: error.message };
  }
};

export const removeLeaveTokens = async (userAddress) => {
  try {
    const contract = await getContract("CryptoVerseToken", true);

    // Remove 100 tokens from user when they leave
    const leaveAmount = ethers.parseEther("100"); // 100 CVRS tokens

    // Check if user has enough tokens to remove
    const balance = await contract.balanceOf(userAddress);
    if (balance < leaveAmount) {
      console.log(
        "⚠️ User doesn't have enough tokens to remove, burning available balance"
      );
      const burnAmount = balance;
      if (burnAmount > 0) {
        const tx = await contract.burnFrom(userAddress, burnAmount);
        const receipt = await tx.wait();
        console.log("🔥 Tokens burned on leave:", receipt.transactionHash);
        return {
          success: true,
          txHash: receipt.transactionHash,
          amount: ethers.formatEther(burnAmount),
        };
      }
      return { success: true, message: "No tokens to remove" };
    }

    const tx = await contract.burnFrom(userAddress, leaveAmount);
    const receipt = await tx.wait();
    console.log(
      "🔥 Leave tokens burned successfully:",
      receipt.transactionHash
    );

    return { success: true, txHash: receipt.transactionHash, amount: "100" };
  } catch (error) {
    console.error("❌ Error removing leave tokens:", error);
    return { success: false, error: error.message };
  }
};

export const getTokenBalance = async (userAddress) => {
  try {
    const contract = await getContract("CryptoVerseToken");
    const balance = await contract.balanceOf(userAddress);
    const decimals = await contract.decimals();
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.error("❌ Error getting token balance:", error);
    return "0";
  }
};

// Utility functions
export const formatAddress = (address) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatEther = (value) => {
  return parseFloat(ethers.utils.formatEther(value)).toFixed(4);
};

export const parseEther = (value) => {
  return ethers.utils.parseEther(value.toString());
};

// Event listeners for real-time updates
export const subscribeToPremiereEvents = (callback) => {
  const contract = getContract("VideoPremiereManager");

  const filters = [
    contract.filters.PremiereCreated(),
    contract.filters.AttendeeRegistered(),
    contract.filters.PremiereCompleted(),
    contract.filters.AirdropDistributed(),
  ];

  filters.forEach((filter) => {
    contract.on(filter, (...args) => {
      callback(args[args.length - 1]); // Last argument is the event
    });
  });

  // Return cleanup function
  return () => {
    filters.forEach((filter) => {
      contract.removeAllListeners(filter);
    });
  };
};

export const subscribeToBlogEvents = (callback) => {
  const contract = getContract("BlogManagerWithWalrus");

  const filters = [
    contract.filters.BlogPublished(),
    contract.filters.BlogViewed(),
    contract.filters.BlogLiked(),
    contract.filters.CommentAdded(),
  ];

  filters.forEach((filter) => {
    contract.on(filter, (...args) => {
      callback(args[args.length - 1]); // Last argument is the event
    });
  });

  // Return cleanup function
  return () => {
    filters.forEach((filter) => {
      contract.removeAllListeners(filter);
    });
  };
};
