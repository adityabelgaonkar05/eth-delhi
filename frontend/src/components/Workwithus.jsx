import React, { useState, useEffect } from "react";
import bgWorkwithus from "../assets/bg-workwithus.png";
import {
  createVideoPremiere,
  configureAirdrop,
  publishBlog,
  updateOrganizerReputation,
  getContract,
} from "../utils/contractHelpers";
import { fetchAllDashboardData } from "../services/dashboardApi";
import { useWallet } from "../context/WalletContext";

const Workwithus = () => {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  // Wallet context for blockchain operations
  const { isConnected, fetchWallet } = useWallet();

  // Load Advercase font
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @font-face {
        font-family: 'Advercase';
        src: url('./src/assets/Advercase.otf') format('opentype');
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoadingData(true);
        setDataError(null);

        console.log("🔄 Loading dashboard data...");
        const result = await fetchAllDashboardData();

        if (result.success) {
          setDashboardData(result.data);
          console.log("✅ Dashboard data loaded successfully");
        } else {
          setDataError(result.error);
          console.error("❌ Failed to load dashboard data:", result.error);
        }
      } catch (error) {
        console.error("❌ Error loading dashboard data:", error);
        setDataError(error.message);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadDashboardData();
  }, []);

  const navigationSections = [
    "Dashboard",
    "Create Premiere",
    "Create Blog",
    "Reputation Update",
    "Admin Configuration",
    "Global Metrics",
    "Emergency Recovery",
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e, formType) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let result = { success: false };

      switch (formType) {
        case "create-premiere": {
          // Convert file to bytes for Walrus storage
          const videoData = formData.videoFile
            ? await fileToBytes(formData.videoFile)
            : new Uint8Array();
          const thumbnailData = formData.thumbnailFile
            ? await fileToBytes(formData.thumbnailFile)
            : new Uint8Array();

          result = await createVideoPremiere({
            title: formData.title,
            description: formData.description,
            videoData,
            thumbnailData,
            scheduledTime: formData.scheduledTime,
            capacity: parseInt(formData.capacity),
            storageTier: formData.storageTier,
          });

          // If premiere created and airdrop configured, set up airdrop
          if (result.success && formData.tokenAddress && formData.totalTokens) {
            const airdropResult = await configureAirdrop(result.premiereId, {
              tokenAddress: formData.tokenAddress,
              totalAmount: formData.totalTokens,
              reputationCapPercent: parseInt(formData.reputationCap) * 100, // Convert to basis points
            });

            if (airdropResult.success) {
              alert(
                `Premiere created successfully with airdrop! Premiere ID: ${result.premiereId}`
              );
            } else {
              alert(
                `Premiere created but airdrop configuration failed: ${airdropResult.error}`
              );
            }
          } else if (result.success) {
            alert(
              `Premiere created successfully! Premiere ID: ${result.premiereId}`
            );
          }
          break;
        }

        case "create-blog":
          // Check if wallet is connected for blog publishing
          if (!isConnected) {
            console.log(
              "🔗 Wallet not connected, requesting connection for blog publishing..."
            );
            try {
              await fetchWallet();
              // Wait a moment for wallet connection
              await new Promise((resolve) => setTimeout(resolve, 1000));

              // Check if wallet is still not connected after attempting to connect
              if (!isConnected) {
                alert("Please connect your wallet to publish a blog post.");
                setIsSubmitting(false);
                return;
              }
            } catch (error) {
              console.error("Failed to connect wallet:", error);
              alert(
                "Failed to connect wallet. Please make sure you have MetaMask or another Web3 wallet installed and try again."
              );
              setIsSubmitting(false);
              return;
            }
          }

          // Validate required fields
          if (
            !formData.blogTitle ||
            !formData.blogContent ||
            !formData.blogDescription ||
            !formData.category
          ) {
            alert(
              "Please fill in all required fields (Title, Content, Description, Category)"
            );
            setIsSubmitting(false);
            return;
          }

          console.log("📝 Publishing blog with data:", formData);

          try {
            result = await publishBlog({
              title: formData.blogTitle,
              content: formData.blogContent,
              description: formData.blogDescription,
              category: formData.category,
              additionalTags: formData.tags || "",
              readTime: formData.readTime || 5,
              contentLanguage: formData.language || "en",
              allowComments: formData.allowComments !== false,
              isPremium: formData.isPremium || false,
              premiumPrice: formData.premiumPrice || 0,
              storageTier: formData.blogStorageTier || 1,
            });
          } catch (error) {
            console.error("❌ Blog publishing error:", error);
            result = { success: false, error: error.message };
          }

          if (result.success) {
            alert(`Blog published successfully! Blog ID: ${result.blogId}`);
            console.log("✅ Blog published successfully:", result);
          } else {
            console.error("❌ Blog publishing failed:", result.error);

            // Show specific error messages based on the error
            let errorMessage = result.error;
            if (result.error.includes("VerificationRequired")) {
              errorMessage =
                "❌ Self Protocol verification required! You must be verified as a human to publish blogs. Please complete the verification process first.";
            } else if (result.error.includes("InsufficientPayment")) {
              errorMessage =
                "❌ Insufficient payment! Please ensure you have enough FLOW tokens to cover the publishing fee and storage costs.";
            } else if (result.error.includes("execution reverted")) {
              errorMessage =
                "❌ Transaction failed! This could be due to insufficient funds, verification requirements, or contract issues. Please check your wallet and try again.";
            }

            alert(errorMessage);
          }
          break;

        case "reputation-update":
          result = await updateOrganizerReputation(
            formData.organizer,
            parseInt(formData.newScore)
          );

          if (result.success) {
            alert(`Reputation updated successfully!`);
          }
          break;

        case "verification-fee":
          try {
            const contract = getContract("CryptoVerseBusinessDashboard", true);
            const tx = await contract.setBusinessVerificationFee(formData.fee);
            await tx.wait();
            result = { success: true };
            alert("Verification fee updated successfully!");
          } catch (error) {
            result = { success: false, error: error.message };
          }
          break;

        case "premium-fee":
          try {
            const contract = getContract("CryptoVerseBusinessDashboard", true);
            const tx = await contract.setPremiumOrganizerFee(
              formData.premiumFee
            );
            await tx.wait();
            result = { success: true };
            alert("Premium fee updated successfully!");
          } catch (error) {
            result = { success: false, error: error.message };
          }
          break;

        case "global-metrics":
          try {
            const contract = getContract("CryptoVerseBusinessDashboard", true);
            const metrics = {
              totalPremieres: parseInt(formData.totalPremieres) || 0,
              totalAttendees: parseInt(formData.totalAttendees) || 0,
              totalAirdropsDistributed:
                parseInt(formData.totalAirdropsDistributed) || 0,
              totalTokensDistributed:
                parseInt(formData.totalTokensDistributed) || 0,
              totalRevenueGenerated:
                parseInt(formData.totalRevenueGenerated) || 0,
              averageAttendanceRate:
                parseInt(formData.averageAttendanceRate) || 0,
              totalNFTsBadgesMinted:
                parseInt(formData.totalNFTsBadgesMinted) || 0,
              activeOrganizers: parseInt(formData.activeOrganizers) || 0,
            };
            const tx = await contract.updateGlobalMetrics(metrics);
            await tx.wait();
            result = { success: true };
            alert("Global metrics updated successfully!");
          } catch (error) {
            result = { success: false, error: error.message };
          }
          break;

        case "emergency-recovery":
          try {
            const contract = getContract("CryptoVerseBusinessDashboard", true);
            const tx = await contract.emergencyTokenRecovery(
              formData.token,
              formData.amount
            );
            await tx.wait();
            result = { success: true };
            alert("Emergency recovery completed successfully!");
          } catch (error) {
            result = { success: false, error: error.message };
          }
          break;

        default:
          console.log(`Submitting ${formType}:`, formData);
          result = { success: true };
      }

      if (!result.success && result.error) {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error in ${formType}:`, error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      if (
        formType !== "reputation-update" &&
        formType !== "verification-fee" &&
        formType !== "premium-fee"
      ) {
        setFormData({});
      }
    }
  };

  // Helper function to convert file to bytes
  const fileToBytes = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        resolve(uint8Array);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const renderDashboard = () => {
    // Show loading state
    if (isLoadingData) {
      return (
        <div className="space-y-8">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
            <h2
              className="text-4xl font-bold mb-6 uppercase tracking-wider"
              style={{ fontFamily: "Advercase, monospace" }}
            >
              CRYPTOVERSE ADMIN DASHBOARD
            </h2>
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
                <p className="text-lg font-bold">Loading dashboard data...</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show error state
    if (dataError) {
      return (
        <div className="space-y-8">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
            <h2
              className="text-4xl font-bold mb-6 uppercase tracking-wider"
              style={{ fontFamily: "Advercase, monospace" }}
            >
              CRYPTOVERSE ADMIN DASHBOARD
            </h2>
            <div className="bg-red-100 border-3 border-red-500 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-red-800 mb-2">
                ⚠️ Data Loading Error
              </h3>
              <p className="text-red-700 mb-4">{dataError}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Get data with fallbacks
    const metrics = dashboardData?.metrics || {};
    const engagement = dashboardData?.engagement || {};
    const fees = dashboardData?.fees || {};

    return (
      <div className="space-y-8">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
          <h2
            className="text-4xl font-bold mb-6 uppercase tracking-wider"
            style={{ fontFamily: "Advercase, monospace" }}
          >
            CRYPTOVERSE ADMIN DASHBOARD
          </h2>

          {/* Platform Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-yellow-300 border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl">
              <h3 className="font-bold text-lg mb-2 uppercase">
                TOTAL PREMIERES
              </h3>
              <p className="text-3xl font-black">
                {metrics.totalPremieres
                  ? metrics.totalPremieres.toLocaleString()
                  : "0"}
              </p>
            </div>
            <div
              style={{ backgroundColor: "#00ffb6" }}
              className="border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl"
            >
              <h3 className="font-bold text-lg mb-2 uppercase">TOTAL BLOGS</h3>
              <p className="text-3xl font-black">
                {metrics.totalBlogs ? metrics.totalBlogs.toLocaleString() : "0"}
              </p>
            </div>
            <div
              style={{ backgroundColor: "#ff8352" }}
              className="border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl"
            >
              <h3 className="font-bold text-lg mb-2 uppercase text-white">
                ACTIVE USERS
              </h3>
              <p className="text-3xl font-black text-white">
                {metrics.totalUsers ? metrics.totalUsers.toLocaleString() : "0"}
              </p>
            </div>
            <div className="bg-white border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl">
              <h3 className="font-bold text-lg mb-2 uppercase">
                TOTAL REVENUE
              </h3>
              <p className="text-3xl font-black">
                $
                {metrics.totalRevenueGenerated
                  ? parseFloat(metrics.totalRevenueGenerated).toFixed(1) + "M"
                  : "0M"}
              </p>
            </div>
          </div>

          {/* User Engagement Metrics */}
          <div className="bg-gray-50 border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl mb-8">
            <h3 className="text-2xl font-bold mb-4 uppercase tracking-wider">
              USER ENGAGEMENT METRICS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border-2 border-black p-4 rounded-xl">
                <h4 className="font-bold uppercase mb-2">
                  PREMIERE ATTENDANCE
                </h4>
                <p className="text-2xl font-black text-green-600">
                  {engagement.premiereAttendance?.rate
                    ? engagement.premiereAttendance.rate + "%"
                    : "0%"}
                </p>
                <p className="text-sm text-gray-600">
                  {engagement.premiereAttendance?.description ||
                    "Average attendance rate"}
                </p>
              </div>
              <div className="bg-white border-2 border-black p-4 rounded-xl">
                <h4 className="font-bold uppercase mb-2">BLOG ENGAGEMENT</h4>
                <p className="text-2xl font-black text-blue-600">
                  {engagement.blogEngagement?.averageViews
                    ? engagement.blogEngagement.averageViews > 1000
                      ? (engagement.blogEngagement.averageViews / 1000).toFixed(
                          1
                        ) + "K"
                      : engagement.blogEngagement.averageViews
                    : "0"}
                </p>
                <p className="text-sm text-gray-600">
                  {engagement.blogEngagement?.description ||
                    "Average views per blog"}
                </p>
              </div>
              <div className="bg-white border-2 border-black p-4 rounded-xl">
                <h4 className="font-bold uppercase mb-2">AIRDROP CLAIMS</h4>
                <p className="text-2xl font-black text-purple-600">
                  {engagement.airdropClaims?.successRate
                    ? engagement.airdropClaims.successRate + "%"
                    : "0%"}
                </p>
                <p className="text-sm text-gray-600">
                  {engagement.airdropClaims?.description ||
                    "Claim success rate"}
                </p>
              </div>
            </div>
          </div>

          {/* Platform Fees */}
          <div className="bg-purple-100 border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl">
            <h3 className="text-2xl font-bold mb-4 uppercase tracking-wider">
              PLATFORM FEES & REVENUE
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border-2 border-black p-4 rounded-xl">
                <h4 className="font-bold uppercase mb-2">PREMIERE FEES</h4>
                <p className="text-xl font-black">
                  {fees.premiereFees?.amount
                    ? fees.premiereFees.amount +
                      " " +
                      fees.premiereFees.currency
                    : "0 ETH"}{" "}
                  per premiere
                </p>
                <p className="text-sm text-gray-600">
                  {fees.premiereFees?.description || "Creation fee"}
                </p>
              </div>
              <div className="bg-white border-2 border-black p-4 rounded-xl">
                <h4 className="font-bold uppercase mb-2">BLOG FEES</h4>
                <p className="text-xl font-black">
                  {fees.blogFees?.amount
                    ? fees.blogFees.amount + " " + fees.blogFees.currency
                    : "0 FLOW"}{" "}
                  per blog
                </p>
                <p className="text-sm text-gray-600">
                  {fees.blogFees?.description || "Publishing fee"}
                </p>
              </div>
              <div className="bg-white border-2 border-black p-4 rounded-xl">
                <h4 className="font-bold uppercase mb-2">WALRUS STORAGE</h4>
                <p className="text-xl font-black">
                  {fees.walrusStorage
                    ? `${fees.walrusStorage.basic}-${fees.walrusStorage.premium} ${fees.walrusStorage.currency}`
                    : "0-0 ETH"}
                </p>
                <p className="text-sm text-gray-600">
                  {fees.walrusStorage?.description || "Per storage tier"}
                </p>
              </div>
              <div className="bg-white border-2 border-black p-4 rounded-xl">
                <h4 className="font-bold uppercase mb-2">PLATFORM REVENUE</h4>
                <p className="text-xl font-black text-green-600">
                  $
                  {fees.totalCollected?.amount
                    ? parseFloat(fees.totalCollected.amount) > 1
                      ? parseFloat(fees.totalCollected.amount).toFixed(1) + "M"
                      : fees.totalCollected.amount +
                        " " +
                        fees.totalCollected.currency
                    : "0M"}
                </p>
                <p className="text-sm text-gray-600">
                  {fees.totalCollected?.description || "Total collected"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCreatePremiere = () => (
    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
      <h2
        className="text-4xl font-bold mb-8 uppercase tracking-wider"
        style={{ fontFamily: "Advercase, monospace" }}
      >
        CREATE VIDEO PREMIERE
      </h2>
      <form
        onSubmit={(e) => handleSubmit(e, "create-premiere")}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
              Title *
            </label>
            <input
              type="text"
              required
              className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
              onChange={(e) => handleInputChange("title", e.target.value)}
              value={formData.title || ""}
            />
          </div>

          <div>
            <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
              Capacity *
            </label>
            <input
              type="number"
              required
              min="1"
              max="10000"
              className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
              onChange={(e) => handleInputChange("capacity", e.target.value)}
              value={formData.capacity || ""}
            />
          </div>
        </div>

        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Description *
          </label>
          <textarea
            required
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium h-32 rounded-xl"
            onChange={(e) => handleInputChange("description", e.target.value)}
            value={formData.description || ""}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
              Scheduled Time *
            </label>
            <input
              type="datetime-local"
              required
              className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
              onChange={(e) =>
                handleInputChange("scheduledTime", e.target.value)
              }
              value={formData.scheduledTime || ""}
            />
          </div>

          <div>
            <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
              Storage Tier *
            </label>
            <select
              required
              className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
              onChange={(e) => handleInputChange("storageTier", e.target.value)}
              value={formData.storageTier || ""}
            >
              <option value="">Select Tier</option>
              <option value="basic">Basic (0.1 ETH)</option>
              <option value="standard">Standard (0.5 ETH)</option>
              <option value="premium">Premium (1.0 ETH)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Video File *
          </label>
          <input
            type="file"
            accept="video/*"
            required
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl bg-white"
            onChange={(e) => handleInputChange("videoFile", e.target.files[0])}
          />
        </div>

        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Thumbnail Image *
          </label>
          <input
            type="file"
            accept="image/*"
            required
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl bg-white"
            onChange={(e) =>
              handleInputChange("thumbnailFile", e.target.files[0])
            }
          />
        </div>

        {/* Airdrop Configuration */}
        <div className="bg-gray-50 border-3 border-gray-300 p-6 rounded-xl">
          <h3 className="text-xl font-bold mb-4 uppercase tracking-wide">
            Airdrop Configuration (Optional)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
                Token Contract Address
              </label>
              <input
                type="text"
                placeholder="0x..."
                className="w-full p-4 border-3 border-gray-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] text-lg font-medium rounded-xl font-mono"
                onChange={(e) =>
                  handleInputChange("tokenAddress", e.target.value)
                }
                value={formData.tokenAddress || ""}
              />
            </div>

            <div>
              <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
                Total Token Amount
              </label>
              <input
                type="number"
                step="0.001"
                className="w-full p-4 border-3 border-gray-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] text-lg font-medium rounded-xl"
                onChange={(e) =>
                  handleInputChange("totalTokens", e.target.value)
                }
                value={formData.totalTokens || ""}
              />
            </div>
          </div>

          <div>
            <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
              Reputation Cap Percentage (0-100%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              className="w-full p-4 border-3 border-gray-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] text-lg font-medium rounded-xl"
              onChange={(e) =>
                handleInputChange("reputationCap", e.target.value)
              }
              value={formData.reputationCap || ""}
            />
          </div>
        </div>

        <div className="bg-yellow-100 border-3 border-yellow-500 p-4 rounded-xl">
          <p className="font-bold text-yellow-800">
            💰 TOTAL COST:{" "}
            {formData.storageTier
              ? formData.storageTier === "basic"
                ? "1.1 ETH"
                : formData.storageTier === "standard"
                ? "1.5 ETH"
                : formData.storageTier === "premium"
                ? "2.0 ETH"
                : "1+ ETH"
              : "1+ ETH"}
            (1 ETH creation fee + storage tier cost)
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-yellow-300 hover:bg-yellow-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 text-xl font-black uppercase tracking-wider transition-all duration-150 rounded-2xl"
        >
          {isSubmitting ? "CREATING PREMIERE..." : "CREATE PREMIERE"}
        </button>
      </form>
    </div>
  );

  const renderCreateBlog = () => (
    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
      <h2
        className="text-4xl font-bold mb-8 uppercase tracking-wider"
        style={{ fontFamily: "Advercase, monospace" }}
      >
        CREATE BLOG POST
      </h2>
      <form
        onSubmit={(e) => handleSubmit(e, "create-blog")}
        className="space-y-6"
      >
        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Title *
          </label>
          <input
            type="text"
            required
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
            onChange={(e) => handleInputChange("blogTitle", e.target.value)}
            value={formData.blogTitle || ""}
          />
        </div>

        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Content *
          </label>
          <textarea
            required
            rows="10"
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
            onChange={(e) => handleInputChange("blogContent", e.target.value)}
            value={formData.blogContent || ""}
            placeholder="Write your blog content here..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
              Category *
            </label>
            <select
              required
              className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
              onChange={(e) => handleInputChange("category", e.target.value)}
              value={formData.category || ""}
            >
              <option value="">Select Category</option>
              <option value="defi">DeFi & Finance</option>
              <option value="nft">NFTs & Digital Art</option>
              <option value="gaming">Gaming</option>
              <option value="education">Education</option>
              <option value="technology">Technology</option>
              <option value="news">News & Updates</option>
            </select>
          </div>

          <div>
            <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
              Language *
            </label>
            <select
              required
              className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
              onChange={(e) => handleInputChange("language", e.target.value)}
              value={formData.language || ""}
            >
              <option value="">Select Language</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Description *
          </label>
          <textarea
            required
            rows="3"
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
            onChange={(e) =>
              handleInputChange("blogDescription", e.target.value)
            }
            value={formData.blogDescription || ""}
            placeholder="Brief description of your blog post..."
          />
        </div>

        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
            onChange={(e) => handleInputChange("tags", e.target.value)}
            value={formData.tags || ""}
            placeholder="blockchain, defi, tutorial"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
              Estimated Read Time (minutes)
            </label>
            <input
              type="number"
              min="1"
              className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
              onChange={(e) => handleInputChange("readTime", e.target.value)}
              value={formData.readTime || ""}
            />
          </div>

          <div>
            <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
              Storage Tier *
            </label>
            <select
              required
              className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
              onChange={(e) =>
                handleInputChange("blogStorageTier", e.target.value)
              }
              value={formData.blogStorageTier || ""}
            >
              <option value="">Select Tier</option>
              <option value="0">Ephemeral</option>
              <option value="1">Standard</option>
              <option value="2">Permanent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Thumbnail Image
          </label>
          <input
            type="file"
            accept="image/*"
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl bg-white"
            onChange={(e) =>
              handleInputChange("blogThumbnail", e.target.files[0])
            }
          />
        </div>

        {/* Premium Content Settings */}
        <div className="bg-purple-50 border-3 border-purple-300 p-6 rounded-xl">
          <h3 className="text-xl font-bold mb-4 uppercase tracking-wide">
            Premium Content Settings
          </h3>

          <div className="flex items-center space-x-3 mb-4">
            <input
              type="checkbox"
              id="isPremium"
              className="w-6 h-6 border-3 border-black"
              onChange={(e) => handleInputChange("isPremium", e.target.checked)}
              checked={formData.isPremium || false}
            />
            <label
              htmlFor="isPremium"
              className="text-lg font-bold uppercase tracking-wide"
            >
              Make this a premium blog post
            </label>
          </div>

          {formData.isPremium && (
            <div>
              <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
                Premium Price (ETH)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                className="w-full p-4 border-3 border-purple-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] text-lg font-medium rounded-xl"
                onChange={(e) =>
                  handleInputChange("premiumPrice", e.target.value)
                }
                value={formData.premiumPrice || ""}
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="allowComments"
            className="w-6 h-6 border-3 border-black"
            onChange={(e) =>
              handleInputChange("allowComments", e.target.checked)
            }
            checked={formData.allowComments !== false}
          />
          <label
            htmlFor="allowComments"
            className="text-lg font-bold uppercase tracking-wide"
          >
            Allow Comments
          </label>
        </div>

        {/* Wallet Connection Status */}
        <div
          className={`border-3 p-4 rounded-xl ${
            isConnected
              ? "bg-green-100 border-green-500"
              : "bg-yellow-100 border-yellow-500"
          }`}
        >
          <p
            className={`font-bold ${
              isConnected ? "text-green-800" : "text-yellow-800"
            }`}
          >
            {isConnected ? "✅ Wallet Connected" : "⚠️ Wallet Not Connected"}
          </p>
          <p
            className={`text-sm mt-1 ${
              isConnected ? "text-green-700" : "text-yellow-700"
            }`}
          >
            {isConnected
              ? "Ready to publish blog post to blockchain"
              : "You'll need to connect your wallet to publish this blog post. Click 'Publish Blog' to connect automatically."}
          </p>
          {!isConnected && (
            <p className="text-xs text-yellow-600 mt-2">
              💡 Don't have a wallet? Install MetaMask from{" "}
              <a
                href="https://metamask.io"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-bold"
              >
                metamask.io
              </a>
            </p>
          )}
        </div>

        <div className="bg-red-100 border-3 border-red-500 p-4 rounded-xl">
          <p className="font-bold text-red-800">
            ⚠️ IMPORTANT: Self Protocol Verification Required
          </p>
          <p className="text-sm text-red-700 mt-1">
            You must be verified as a human through Self Protocol to publish
            blogs. This is a one-time verification process for security.
          </p>
        </div>

        <div className="bg-yellow-100 border-3 border-yellow-500 p-4 rounded-xl">
          <p className="font-bold text-yellow-800">
            💰 TOTAL COST: 100 FLOW + Walrus Storage Fee
          </p>
          <p className="text-sm text-yellow-700 mt-1">
            Publishing fee: 100 FLOW + Storage:{" "}
            {formData.blogStorageTier === "0"
              ? "Free (Ephemeral)"
              : formData.blogStorageTier === "1"
              ? "0.1 ETH (Standard)"
              : formData.blogStorageTier === "2"
              ? "0.5 ETH (Permanent)"
              : "Select storage tier"}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 text-xl font-black uppercase tracking-wider transition-all duration-150 rounded-2xl text-white"
          style={{ backgroundColor: "#00ffb6" }}
        >
          {isSubmitting ? "PUBLISHING BLOG..." : "PUBLISH BLOG"}
        </button>
      </form>
    </div>
  );

  const renderReputationUpdate = () => (
    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
      <h2
        className="text-4xl font-bold mb-8 uppercase tracking-wider"
        style={{ fontFamily: "Advercase, monospace" }}
      >
        UPDATE REPUTATION
      </h2>
      <form
        onSubmit={(e) => handleSubmit(e, "reputation-update")}
        className="space-y-6"
      >
        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Organizer Wallet Address *
          </label>
          <input
            type="text"
            required
            placeholder="0x..."
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium font-mono rounded-xl"
            onChange={(e) => handleInputChange("organizer", e.target.value)}
            value={formData.organizer || ""}
          />
        </div>

        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            New Reputation Score (0-10,000) *
          </label>
          <input
            type="number"
            required
            min="0"
            max="10000"
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
            onChange={(e) => handleInputChange("newScore", e.target.value)}
            value={formData.newScore || ""}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 text-xl font-black uppercase tracking-wider transition-all duration-150 rounded-2xl text-white"
          style={{ backgroundColor: "#ff8352" }}
        >
          {isSubmitting ? "UPDATING..." : "UPDATE REPUTATION"}
        </button>
      </form>
    </div>
  );

  const renderAdminConfiguration = () => (
    <div className="space-y-8">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
        <h2
          className="text-4xl font-bold mb-8 uppercase tracking-wider"
          style={{ fontFamily: "Advercase, monospace" }}
        >
          SET BUSINESS VERIFICATION FEE
        </h2>
        <form
          onSubmit={(e) => handleSubmit(e, "verification-fee")}
          className="space-y-6"
        >
          <div>
            <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
              New Fee (wei) *
            </label>
            <input
              type="number"
              required
              className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
              onChange={(e) => handleInputChange("fee", e.target.value)}
              value={formData.fee || ""}
            />
          </div>
          <button
            type="submit"
            className="w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 text-xl font-black uppercase tracking-wider rounded-2xl text-white"
            style={{ backgroundColor: "#ff8352" }}
          >
            UPDATE FEE
          </button>
        </form>
      </div>

      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
        <h2
          className="text-4xl font-bold mb-8 uppercase tracking-wider"
          style={{ fontFamily: "Advercase, monospace" }}
        >
          SET PREMIUM ORGANIZER FEE
        </h2>
        <form
          onSubmit={(e) => handleSubmit(e, "premium-fee")}
          className="space-y-6"
        >
          <div>
            <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
              New Fee (wei) *
            </label>
            <input
              type="number"
              required
              className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
              onChange={(e) => handleInputChange("premiumFee", e.target.value)}
              value={formData.premiumFee || ""}
            />
          </div>
          <button
            type="submit"
            className="w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 text-xl font-black uppercase tracking-wider rounded-2xl"
            style={{ backgroundColor: "#00ffb6" }}
          >
            UPDATE PREMIUM FEE
          </button>
        </form>
      </div>
    </div>
  );

  const renderGlobalMetrics = () => (
    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
      <h2
        className="text-4xl font-bold mb-8 uppercase tracking-wider"
        style={{ fontFamily: "Advercase, monospace" }}
      >
        UPDATE GLOBAL METRICS
      </h2>
      <form
        onSubmit={(e) => handleSubmit(e, "global-metrics")}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            "totalPremieres",
            "totalAttendees",
            "totalAirdropsDistributed",
            "totalTokensDistributed",
            "totalRevenueGenerated",
            "averageAttendanceRate",
            "totalNFTsBadgesMinted",
            "activeOrganizers",
          ].map((field) => (
            <div key={field}>
              <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
                {field.replace(/([A-Z])/g, " $1").toUpperCase()}
              </label>
              <input
                type="number"
                className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
                onChange={(e) => handleInputChange(field, e.target.value)}
                value={formData[field] || ""}
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 text-xl font-black uppercase tracking-wider rounded-2xl text-white"
          style={{ backgroundColor: "#ff8352" }}
        >
          UPDATE METRICS
        </button>
      </form>
    </div>
  );

  const renderEmergencyRecovery = () => (
    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
      <h2
        className="text-4xl font-bold mb-8 uppercase tracking-wider text-red-600"
        style={{ fontFamily: "Advercase, monospace" }}
      >
        EMERGENCY TOKEN RECOVERY
      </h2>
      <div className="bg-red-100 border-3 border-red-500 p-4 mb-6 rounded-xl">
        <p className="font-bold uppercase text-red-700">
          ⚠️ WARNING: This action is irreversible!
        </p>
      </div>
      <form
        onSubmit={(e) => handleSubmit(e, "emergency-recovery")}
        className="space-y-6"
      >
        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Token Contract Address *
          </label>
          <input
            type="text"
            required
            placeholder="0x..."
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium font-mono rounded-xl"
            onChange={(e) => handleInputChange("token", e.target.value)}
            value={formData.token || ""}
          />
        </div>

        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Amount to Recover *
          </label>
          <input
            type="number"
            required
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
            onChange={(e) => handleInputChange("amount", e.target.value)}
            value={formData.amount || ""}
          />
        </div>

        <button
          type="submit"
          className="w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 text-xl font-black uppercase tracking-wider text-white rounded-2xl"
          style={{ backgroundColor: "#ff8352" }}
        >
          EMERGENCY RECOVER
        </button>
      </form>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "Dashboard":
        return renderDashboard();
      case "Create Premiere":
        return renderCreatePremiere();
      case "Create Blog":
        return renderCreateBlog();
      case "Reputation Update":
        return renderReputationUpdate();
      case "Admin Configuration":
        return renderAdminConfiguration();
      case "Global Metrics":
        return renderGlobalMetrics();
      case "Emergency Recovery":
        return renderEmergencyRecovery();
      default:
        return renderDashboard();
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `url(${bgWorkwithus})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="min-h-screen bg-black/20 flex">
        {/* Sidebar Navigation */}
        <div
          className={`${
            isSidebarCollapsed ? "w-20" : "w-96"
          } bg-white border-r-4 border-black shadow-[12px_0px_0px_0px_rgba(0,0,0,0.2)] overflow-y-auto relative transition-all duration-300`}
        >
          <div className="sticky top-0 bg-white border-b-4 border-black p-8 z-10">
            <div className="flex items-center justify-between">
              <div className={`${isSidebarCollapsed ? "hidden" : "block"}`}>
                <h1
                  className="text-3xl font-black text-black mb-2 uppercase tracking-wider"
                  style={{ fontFamily: "Advercase, monospace" }}
                >
                  CRYPTOVERSE
                </h1>
                <p className="text-lg font-bold text-gray-600 uppercase tracking-wide">
                  ADMIN PANEL
                </p>
              </div>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 border-2 border-black rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  {isSidebarCollapsed ? (
                    <path d="m9 18 6-6-6-6" />
                  ) : (
                    <path d="m15 18-6-6 6-6" />
                  )}
                </svg>
              </button>
            </div>
          </div>
          <nav className="p-6 space-y-3">
            {navigationSections.map((section, index) => {
              const getIcon = (idx) => {
                const iconProps = "w-5 h-5 stroke-current fill-none stroke-2";
                switch (idx) {
                  case 0: // Dashboard
                    return (
                      <svg className={iconProps} viewBox="0 0 24 24">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                    );
                  case 1: // Create Premiere
                    return (
                      <svg className={iconProps} viewBox="0 0 24 24">
                        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                        <polygon points="9.75,15.02 15.5,11.75 9.75,8.48" />
                      </svg>
                    );
                  case 2: // Create Blog
                    return (
                      <svg className={iconProps} viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10,9 9,9 8,9" />
                      </svg>
                    );
                  case 3: // Reputation Update
                    return (
                      <svg className={iconProps} viewBox="0 0 24 24">
                        <polygon points="12,2 15.09,8.26 22,9 17,14.74 18.18,21.02 12,17.77 5.82,21.02 7,14.74 2,9 8.91,8.26" />
                      </svg>
                    );
                  case 4: // Admin Configuration
                    return (
                      <svg className={iconProps} viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    );
                  case 5: // Global Metrics
                    return (
                      <svg className={iconProps} viewBox="0 0 24 24">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    );
                  case 6: // Emergency Recovery
                    return (
                      <svg className={iconProps} viewBox="0 0 24 24">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                      </svg>
                    );
                  default:
                    return null;
                }
              };

              return (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`w-full text-left p-4 border-2 font-bold uppercase tracking-wide transition-all duration-200 rounded-xl group flex items-center ${
                    isSidebarCollapsed ? "justify-center" : "space-x-4"
                  } ${
                    activeSection === section
                      ? "bg-gray-50 text-black border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transform -translate-y-0.5"
                      : "bg-white text-gray-700 border-gray-300 hover:border-gray-500 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] hover:transform hover:-translate-y-0.5"
                  }`}
                  title={isSidebarCollapsed ? section : ""}
                >
                  <div
                    className={`${
                      activeSection === section ? "text-black" : "text-gray-500"
                    } transition-colors duration-200`}
                  >
                    {getIcon(index)}
                  </div>
                  {!isSidebarCollapsed && (
                    <>
                      <div className="flex-1">
                        <div className="text-sm font-black">{section}</div>
                        {activeSection === section && (
                          <div className="text-xs font-medium text-gray-500 mt-1">
                            ACTIVE
                          </div>
                        )}
                      </div>
                      <div
                        className={`w-2 h-2 rounded-full transition-all duration-200 ${
                          activeSection === section ? "bg-black" : "bg-gray-300"
                        }`}
                      ></div>
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default Workwithus;
