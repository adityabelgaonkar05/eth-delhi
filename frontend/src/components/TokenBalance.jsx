import React from "react";
import { useToken } from "../context/TokenContract";
import { useWallet } from "../context/WalletContext";

const TokenBalance = () => {
  const { balance, symbol } = useToken();
  const { isConnected } = useWallet();

  if (!isConnected) {
    return (
      <div className="absolute top-8 right-8 bg-black/80 text-white px-6 py-4 rounded-lg text-sm font-mono border border-white/20 backdrop-blur-sm min-w-[120px] text-center">
        <div className="text-gray-400 mb-1">Token Balance</div>
        <div className="text-red-400">Not Connected</div>
      </div>
    );
  }

  return (
    <div className="absolute top-8 right-8 bg-black/80 text-white px-6 py-4 rounded-lg text-sm font-mono border border-white/20 backdrop-blur-sm min-w-[120px] text-center shadow-lg shadow-black/30">
      <div className="text-gray-400 mb-1 text-xs">Token Balance</div>
      <div className="text-green-400 font-bold text-base">
        {balance !== null ? (
          `${parseFloat(balance).toFixed(2)} ${symbol || "TOKENS"}`
        ) : (
          <span className="text-yellow-400">Loading...</span>
        )}
      </div>
    </div>
  );
};

export default TokenBalance;
