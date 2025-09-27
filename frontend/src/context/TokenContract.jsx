import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { ethers } from "ethers";
import { useWallet } from "./WalletContext";
import { giveJoinTokens, removeLeaveTokens } from "../utils/contractHelpers";
import tokenABI from "../contractData/CryptoVerseToken.json";

export const TokenContext = createContext();

const RPC =
  import.meta.env.VITE_FLOW_RPC || "https://rest-testnet.onflow.org/v1";
const CHAINID = 545;

const contractABI = tokenABI.abi;
const TOKEN_ADDRESS = tokenABI.address;

export const TokenProvider = ({ children }) => {
  const { account, isConnected } = useWallet();
  const [balance, setBalance] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Track if user has already received join tokens in this session
  const hasReceivedJoinTokens = useRef(false);
  const joinTokensGiven = useRef(false);

  const fetchBalance = useCallback(async () => {
    if (!account) return;

    console.log("🔄 Fetching token balance for account:", account);
    setIsLoading(true);

    try {
      // Initialize provider
      const provider = new ethers.JsonRpcProvider(RPC, CHAINID);
      const tokenContract = new ethers.Contract(
        TOKEN_ADDRESS,
        contractABI,
        provider
      );

      const [rawBalance, decimals, tokenSymbol] = await Promise.all([
        tokenContract.balanceOf(account),
        tokenContract.decimals(),
        tokenContract.symbol(),
      ]);

      // Format balance properly
      const formattedBalance = ethers.formatUnits(rawBalance, decimals);
      setBalance(formattedBalance);
      setSymbol(tokenSymbol);

      console.log("💰 Current token balance:", formattedBalance, tokenSymbol);
    } catch (err) {
      console.error("❌ Error fetching token balance:", err);
      setBalance(null);
      setSymbol(null);
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  // Give join tokens when user first connects
  const handleUserJoin = useCallback(async () => {
    if (!account || !isConnected || hasReceivedJoinTokens.current) return;

    console.log("🎉 User joined! Giving 100 join tokens...");
    setIsLoading(true);

    try {
      const result = await giveJoinTokens(account);
      if (result.success) {
        console.log("✅ Join tokens given successfully:", result.txHash);
        hasReceivedJoinTokens.current = true;
        joinTokensGiven.current = true;
        setHasJoined(true);

        // Refresh balance after giving tokens
        setTimeout(() => {
          fetchBalance();
        }, 2000);
      } else {
        console.error("❌ Failed to give join tokens:", result.error);
      }
    } catch (error) {
      console.error("❌ Error in handleUserJoin:", error);
    } finally {
      setIsLoading(false);
    }
  }, [account, isConnected, fetchBalance]);

  // Remove leave tokens when user leaves
  const handleUserLeave = useCallback(async () => {
    if (!account || !joinTokensGiven.current) return;

    console.log("👋 User leaving! Removing 100 leave tokens...");
    setIsLoading(true);

    try {
      const result = await removeLeaveTokens(account);
      if (result.success) {
        console.log("✅ Leave tokens removed successfully:", result.txHash);
        joinTokensGiven.current = false;
        setHasJoined(false);

        // Refresh balance after removing tokens
        setTimeout(() => {
          fetchBalance();
        }, 2000);
      } else {
        console.error("❌ Failed to remove leave tokens:", result.error);
      }
    } catch (error) {
      console.error("❌ Error in handleUserLeave:", error);
    } finally {
      setIsLoading(false);
    }
  }, [account, fetchBalance]);

  // Handle page visibility changes (user leaves/returns)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User left the page
        console.log("📱 Page hidden - user left");
        handleUserLeave();
      } else {
        // User returned to the page
        console.log("📱 Page visible - user returned");
        if (isConnected && account && !hasReceivedJoinTokens.current) {
          handleUserJoin();
        }
      }
    };

    const handleBeforeUnload = () => {
      // User is closing the tab/window
      console.log("🚪 Page unloading - user leaving");
      handleUserLeave();
    };

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [handleUserJoin, handleUserLeave, isConnected, account]);

  // Handle wallet connection changes
  useEffect(() => {
    if (isConnected && account && !hasReceivedJoinTokens.current) {
      console.log("🔗 Wallet connected - giving join tokens");
      handleUserJoin();
    } else if (!isConnected) {
      // Reset state when wallet disconnects
      hasReceivedJoinTokens.current = false;
      joinTokensGiven.current = false;
      setHasJoined(false);
    }
  }, [isConnected, account, handleUserJoin]);

  // Fetch token balance whenever account changes
  useEffect(() => {
    if (!account) {
      setBalance(null);
      setSymbol(null);
      return;
    }

    fetchBalance();
  }, [account, fetchBalance]);

  // Manual functions for testing/debugging
  const manualGiveJoinTokens = useCallback(async () => {
    if (!account) return;
    await handleUserJoin();
  }, [account, handleUserJoin]);

  const manualRemoveLeaveTokens = useCallback(async () => {
    if (!account) return;
    await handleUserLeave();
  }, [account, handleUserLeave]);

  const refreshBalance = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  return (
    <TokenContext.Provider
      value={{
        fetchBalance: refreshBalance,
        balance,
        symbol,
        isLoading,
        hasJoined,
        hasReceivedJoinTokens: hasReceivedJoinTokens.current,
        joinTokensGiven: joinTokensGiven.current,
        // Manual functions for testing
        manualGiveJoinTokens,
        manualRemoveLeaveTokens,
      }}
    >
      {children}
    </TokenContext.Provider>
  );
};

// Hook to use the token context
export const useToken = () => {
  return useContext(TokenContext);
};
