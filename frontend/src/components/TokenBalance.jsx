import React from "react";
import { useToken } from "../context/TokenContract";
import { useWallet } from "../context/WalletContext";

const TokenBalance = () => {
  const { balance, symbol, isLoading, hasJoined, joinTokensGiven } = useToken();
  const { isConnected } = useWallet();

  if (!isConnected) {
    return (
      <div className="absolute top-8 right-8 bg-black/80 text-white px-6 py-4 rounded-lg text-sm font-mono border border-white/20 backdrop-blur-sm min-w-[140px] text-center">
        <div className="text-gray-400 mb-1">Token Balance</div>
        <div className="text-red-400">Not Connected</div>
      </div>
    );
  }

  return (
    <div className="absolute top-8 right-8 bg-black/80 text-white px-6 py-4 rounded-lg text-sm font-mono border border-white/20 backdrop-blur-sm min-w-[140px] text-center shadow-lg shadow-black/30">
      <div className="text-gray-400 mb-1 text-xs">Token Balance</div>
      <div className="text-green-400 font-bold text-base">
        {isLoading ? (
          <span className="text-yellow-400">Loading...</span>
        ) : balance !== null ? (
          `${parseFloat(balance).toFixed(2)} ${symbol || "CVRS"}`
        ) : (
          <span className="text-yellow-400">Loading...</span>
        )}
      </div>

      {/* Join/Leave Status Indicator */}
      <div className="mt-2 text-xs">
        {hasJoined && joinTokensGiven ? (
          <div className="text-green-400 flex items-center justify-center gap-1">
            <span>🎉</span>
            <span>Joined</span>
          </div>
        ) : (
          <div className="text-gray-400 flex items-center justify-center gap-1">
            <span>⏳</span>
            <span>Waiting</span>
          </div>
        )}
      </div>

      {/* Join Tokens Info */}
      {joinTokensGiven && (
        <div className="mt-1 text-xs text-blue-400">+100 Join Tokens</div>
      )}
    </div>
  );
};

export default TokenBalance;
