import React from "react";
import { useToken } from "../context/TokenContract";
import { useWallet } from "../context/WalletContext";

const TokenJoinLeaveTest = () => {
  const {
    balance,
    symbol,
    isLoading,
    hasJoined,
    joinTokensGiven,
    manualGiveJoinTokens,
    manualRemoveLeaveTokens,
  } = useToken();
  const { isConnected, account } = useWallet();

  if (!isConnected) {
    return (
      <div className="bg-yellow-100 border-3 border-yellow-500 p-4 rounded-xl mb-4">
        <h3 className="font-bold text-yellow-800 mb-2">
          🔗 Token Join/Leave Test
        </h3>
        <p className="text-yellow-700">
          Please connect your wallet to test the join/leave token system.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-100 border-3 border-blue-500 p-6 rounded-xl mb-4">
      <h3 className="font-bold text-blue-800 mb-4 text-lg">
        🧪 Token Join/Leave Test Panel
      </h3>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border-2 border-blue-300 p-3 rounded-lg">
          <h4 className="font-bold text-blue-700 mb-2">Current Status</h4>
          <div className="space-y-1 text-sm">
            <div>
              Balance:{" "}
              <span className="font-mono">
                {balance || "0"} {symbol || "CVRS"}
              </span>
            </div>
            <div>
              Has Joined:{" "}
              <span className={hasJoined ? "text-green-600" : "text-red-600"}>
                {hasJoined ? "✅ Yes" : "❌ No"}
              </span>
            </div>
            <div>
              Join Tokens Given:{" "}
              <span
                className={joinTokensGiven ? "text-green-600" : "text-red-600"}
              >
                {joinTokensGiven ? "✅ Yes" : "❌ No"}
              </span>
            </div>
            <div>
              Loading:{" "}
              <span
                className={isLoading ? "text-yellow-600" : "text-green-600"}
              >
                {isLoading ? "⏳ Yes" : "✅ No"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-blue-300 p-3 rounded-lg">
          <h4 className="font-bold text-blue-700 mb-2">Account Info</h4>
          <div className="space-y-1 text-sm">
            <div>
              Address: <span className="font-mono text-xs">{account}</span>
            </div>
            <div>
              Connected: <span className="text-green-600">✅ Yes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Controls */}
      <div className="bg-white border-2 border-blue-300 p-4 rounded-lg">
        <h4 className="font-bold text-blue-700 mb-3">
          Manual Controls (For Testing)
        </h4>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={manualGiveJoinTokens}
            disabled={isLoading || joinTokensGiven}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
          >
            {isLoading ? "⏳ Processing..." : "🎉 Give Join Tokens"}
          </button>

          <button
            onClick={manualRemoveLeaveTokens}
            disabled={isLoading || !joinTokensGiven}
            className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
          >
            {isLoading ? "⏳ Processing..." : "👋 Remove Leave Tokens"}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 bg-blue-50 border-2 border-blue-200 p-3 rounded-lg">
        <h4 className="font-bold text-blue-700 mb-2">📋 How It Works</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            • <strong>Auto Join:</strong> When you connect your wallet, you
            automatically receive 100 CVRS tokens
          </li>
          <li>
            • <strong>Auto Leave:</strong> When you switch tabs, close the
            browser, or disconnect, 100 tokens are removed
          </li>
          <li>
            • <strong>Manual Controls:</strong> Use the buttons above to
            manually trigger join/leave actions
          </li>
          <li>
            • <strong>Status Tracking:</strong> The system tracks whether you've
            received join tokens in this session
          </li>
        </ul>
      </div>
    </div>
  );
};

export default TokenJoinLeaveTest;
