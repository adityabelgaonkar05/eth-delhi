import React, { useState } from "react";
import { useToken } from "../context/TokenContract";
import { useWallet } from "../context/WalletContext";

/**
 * ClaimJoinTokensButton Component
 *
 * A simple button component that allows users to claim 100 CVRS tokens
 * when they click the button. This replaces the automatic token giving system.
 *
 * Features:
 * - Manual token claiming (100 CVRS tokens)
 * - One-time claim per session
 * - Loading states and user feedback
 * - Error handling and success messages
 * - Wallet connection validation
 */
const ClaimJoinTokensButton = () => {
  const { claimJoinTokens, isLoading, joinTokensGiven, balance, symbol } =
    useToken();
  const { isConnected, account } = useWallet();
  const [message, setMessage] = useState("");

  /**
   * Handle the claim join tokens button click
   * Calls the claimJoinTokens function and shows appropriate feedback
   */
  const handleClaimTokens = async () => {
    if (!isConnected) {
      setMessage("❌ Please connect your wallet first");
      return;
    }

    if (joinTokensGiven) {
      setMessage("⚠️ You have already claimed join tokens in this session");
      return;
    }

    setMessage("⏳ Claiming tokens...");

    try {
      const result = await claimJoinTokens();

      if (result.success) {
        setMessage(`✅ ${result.message}`);
        // Clear message after 5 seconds
        setTimeout(() => setMessage(""), 5000);
      } else {
        setMessage(`❌ ${result.error}`);
        // Clear error message after 5 seconds
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      setMessage(`❌ Unexpected error: ${error.message}`);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  // Don't render if wallet is not connected
  if (!isConnected) {
    return (
      <div className="bg-gray-100 border-2 border-gray-300 p-4 rounded-lg text-center">
        <p className="text-gray-600 font-medium">
          Connect your wallet to claim join tokens
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 p-6 rounded-xl">
      <div className="text-center">
        <h3 className="text-xl font-bold text-green-800 mb-2">
          🎉 Claim Your Join Tokens
        </h3>
        <p className="text-green-700 mb-4">
          Click the button below to claim 100 CVRS tokens for joining our
          platform!
        </p>

        {/* Current Balance Display */}
        <div className="bg-white border border-green-200 p-3 rounded-lg mb-4">
          <p className="text-sm text-gray-600">Current Balance:</p>
          <p className="text-lg font-bold text-green-600">
            {balance
              ? `${parseFloat(balance).toFixed(2)} ${symbol || "CVRS"}`
              : "Loading..."}
          </p>
        </div>

        {/* Claim Button */}
        <button
          onClick={handleClaimTokens}
          disabled={isLoading || joinTokensGiven}
          className={`
            px-8 py-3 rounded-lg font-bold text-lg transition-all duration-200 transform
            ${
              isLoading || joinTokensGiven
                ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white hover:scale-105 shadow-lg hover:shadow-xl"
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              Claiming Tokens...
            </span>
          ) : joinTokensGiven ? (
            <span className="flex items-center gap-2">✅ Tokens Claimed!</span>
          ) : (
            <span className="flex items-center gap-2">
              🎉 Claim 100 CVRS Tokens
            </span>
          )}
        </button>

        {/* Status Message */}
        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm font-medium ${
              message.includes("✅")
                ? "bg-green-100 text-green-800 border border-green-200"
                : message.includes("❌") || message.includes("⚠️")
                ? "bg-red-100 text-red-800 border border-red-200"
                : "bg-blue-100 text-blue-800 border border-blue-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-4 bg-blue-50 border border-blue-200 p-3 rounded-lg text-left">
          <h4 className="font-bold text-blue-800 mb-2">ℹ️ How it works:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Click the button to claim 100 CVRS tokens</li>
            <li>• You can only claim once per session</li>
            <li>• Tokens are automatically removed when you leave the site</li>
            <li>• Connect your wallet to get started</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ClaimJoinTokensButton;
