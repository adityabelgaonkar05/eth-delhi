import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  useContracts,
  useCryptoVerseToken,
  useBadgeManager,
  useUserRegistry,
} from "../context/ContractContext";
import { useWallet } from "../context/WalletContext";

const ContractExample = () => {
  const { account, isConnected } = useWallet();
  const { contracts, isLoading, error, getContractsByType } = useContracts();

  // Specific contract hooks
  const { contract: cryptoVerseToken, isLoading: tokenLoading } =
    useCryptoVerseToken();
  const { contract: badgeManager, isLoading: badgeLoading } = useBadgeManager();
  const { contract: userRegistry, isLoading: userLoading } = useUserRegistry();

  const [balance, setBalance] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(false);

  // Example: Get token balance
  const fetchTokenBalance = useCallback(async () => {
    if (!isConnected || !cryptoVerseToken) return;

    try {
      setLoading(true);
      const balance = await cryptoVerseToken.read("balanceOf", account);
      const decimals = await cryptoVerseToken.read("decimals");
      const formattedBalance = ethers.formatUnits(balance, decimals);
      setBalance(formattedBalance);
    } catch (err) {
      console.error("Error fetching token balance:", err);
    } finally {
      setLoading(false);
    }
  }, [isConnected, cryptoVerseToken, account]);

  // Example: Get user information
  const fetchUserInfo = useCallback(async () => {
    if (!isConnected || !userRegistry) return;

    try {
      setLoading(true);
      const userInfo = await userRegistry.read("getUserInfo", account);
      setUserInfo(userInfo);
    } catch (err) {
      console.error("Error fetching user info:", err);
    } finally {
      setLoading(false);
    }
  }, [isConnected, userRegistry, account]);

  // Example: Get user badges
  const fetchUserBadges = useCallback(async () => {
    if (!isConnected || !badgeManager) return;

    try {
      setLoading(true);
      const badgeCount = await badgeManager.read("getUserBadgeCount", account);
      const userBadges = [];

      for (let i = 0; i < badgeCount; i++) {
        const badge = await badgeManager.read("getUserBadge", account, i);
        userBadges.push(badge);
      }

      setBadges(userBadges);
    } catch (err) {
      console.error("Error fetching user badges:", err);
    } finally {
      setLoading(false);
    }
  }, [isConnected, badgeManager, account]);

  // Example: Transfer tokens (write operation)
  const transferTokens = async (to, amount) => {
    if (!isConnected || !cryptoVerseToken) return;

    try {
      setLoading(true);

      // Estimate gas first
      const gasEstimate = await cryptoVerseToken.estimateGas(
        "transfer",
        to,
        amount
      );
      console.log("Gas estimate:", gasEstimate.toString());

      // Execute transfer
      const tx = await cryptoVerseToken.write("transfer", to, amount);
      console.log("Transfer transaction:", tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("Transfer confirmed:", receipt);

      // Refresh balance
      await fetchTokenBalance();
    } catch (err) {
      console.error("Error transferring tokens:", err);
    } finally {
      setLoading(false);
    }
  };

  // Example: Mint a badge (write operation)
  const mintBadge = async (badgeType) => {
    if (!isConnected || !badgeManager) return;

    try {
      setLoading(true);

      const tx = await badgeManager.write("mintBadge", account, badgeType);
      console.log("Mint badge transaction:", tx.hash);

      const receipt = await tx.wait();
      console.log("Badge minted:", receipt);

      // Refresh badges
      await fetchUserBadges();
    } catch (err) {
      console.error("Error minting badge:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load data when connected
  useEffect(() => {
    if (isConnected) {
      fetchTokenBalance();
      fetchUserInfo();
      fetchUserBadges();
    }
  }, [isConnected, account, fetchTokenBalance, fetchUserInfo, fetchUserBadges]);

  if (!isConnected) {
    return (
      <div className="p-6 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Contract Example</h2>
        <p className="text-gray-600">
          Please connect your wallet to interact with contracts.
        </p>
      </div>
    );
  }

  if (isLoading || loading || tokenLoading || badgeLoading || userLoading) {
    return (
      <div className="p-6 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Contract Example</h2>
        <p className="text-gray-600">Loading contract data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-100 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-red-800">Contract Error</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Contract Interaction Example</h2>

      {/* Contract Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Contract Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-green-100 rounded">
            <p className="text-sm text-green-800">
              Total Contracts: {Object.keys(contracts).length}
            </p>
          </div>
          <div className="p-3 bg-blue-100 rounded">
            <p className="text-sm text-blue-800">
              Manager Contracts:{" "}
              {Object.keys(getContractsByType("Manager")).length}
            </p>
          </div>
        </div>
      </div>

      {/* Token Balance */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Token Balance</h3>
        <div className="p-4 bg-gray-50 rounded">
          <p className="text-lg">
            <span className="font-medium">CVT Balance:</span>{" "}
            {balance || "Loading..."}
          </p>
          <button
            onClick={fetchTokenBalance}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Balance
          </button>
        </div>
      </div>

      {/* User Information */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">User Information</h3>
        <div className="p-4 bg-gray-50 rounded">
          {userInfo ? (
            <div>
              <p>
                <span className="font-medium">Username:</span>{" "}
                {userInfo.username || "Not set"}
              </p>
              <p>
                <span className="font-medium">Reputation:</span>{" "}
                {userInfo.reputation?.toString() || "0"}
              </p>
              <p>
                <span className="font-medium">Join Date:</span>{" "}
                {new Date(userInfo.joinDate * 1000).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p>No user information found</p>
          )}
          <button
            onClick={fetchUserInfo}
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Refresh User Info
          </button>
        </div>
      </div>

      {/* User Badges */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">User Badges</h3>
        <div className="p-4 bg-gray-50 rounded">
          {badges.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {badges.map((badge, index) => (
                <div key={index} className="p-2 bg-yellow-100 rounded">
                  <p className="text-sm">Badge #{index + 1}</p>
                  <p className="text-xs text-gray-600">
                    Type: {badge.badgeType}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p>No badges found</p>
          )}
          <button
            onClick={fetchUserBadges}
            className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Refresh Badges
          </button>
        </div>
      </div>

      {/* Contract Actions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Contract Actions</h3>
        <div className="space-y-3">
          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-medium mb-2">Transfer Tokens</h4>
            <p className="text-sm text-gray-600 mb-2">
              Transfer CVT tokens to another address
            </p>
            <button
              onClick={() => transferTokens("0x...", "1000000000000000000")} // 1 token
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Transfer 1 CVT
            </button>
          </div>

          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-medium mb-2">Mint Badge</h4>
            <p className="text-sm text-gray-600 mb-2">
              Mint a new badge for the user
            </p>
            <button
              onClick={() => mintBadge(1)} // Badge type 1
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            >
              Mint Badge Type 1
            </button>
          </div>
        </div>
      </div>

      {/* Available Contracts */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Available Contracts</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(contracts).map(([name, contract]) => (
            <div key={name} className="p-3 bg-gray-50 rounded">
              <p className="font-medium text-sm">{contract.getName()}</p>
              <p className="text-xs text-gray-600">{contract.getType()}</p>
              <p className="text-xs text-gray-500">{contract.getAddress()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContractExample;
