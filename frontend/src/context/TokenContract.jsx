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

  /**
   * Manual function to give 100 tokens to the user
   * This function is called when user clicks a button to claim their join tokens
   * It mints 100 CVRS tokens to the user's wallet address
   * @returns {Promise<Object>} Result object with success status and transaction details
   */
  const claimJoinTokens = useCallback(async () => {
    if (!account || !isConnected) {
      console.error("❌ Cannot claim tokens: Wallet not connected");
      return { success: false, error: "Wallet not connected" };
    }

    if (hasReceivedJoinTokens.current) {
      console.warn("⚠️ User has already claimed join tokens in this session");
      return {
        success: false,
        error: "Join tokens already claimed in this session",
      };
    }

    console.log("🎉 User claiming join tokens! Giving 100 CVRS tokens...");
    setIsLoading(true);

    try {
      const result = await giveJoinTokens(account);
      if (result.success) {
        console.log("✅ Join tokens claimed successfully:", result.txHash);
        hasReceivedJoinTokens.current = true;
        joinTokensGiven.current = true;
        setHasJoined(true);

        // Refresh balance after giving tokens
        setTimeout(() => {
          fetchBalance();
        }, 2000);

        return {
          success: true,
          txHash: result.txHash,
          amount: result.amount,
          message: "Successfully claimed 100 CVRS join tokens!",
        };
      } else {
        console.error("❌ Failed to claim join tokens:", result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("❌ Error in claimJoinTokens:", error);
      return { success: false, error: error.message };
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
        // Note: No automatic token giving on return - user must manually claim
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
  }, [handleUserLeave]);

  // Handle wallet connection changes
  useEffect(() => {
    if (!isConnected) {
      // Reset state when wallet disconnects
      hasReceivedJoinTokens.current = false;
      joinTokensGiven.current = false;
      setHasJoined(false);
      console.log("🔗 Wallet disconnected - resetting token state");
    } else if (isConnected && account) {
      console.log("🔗 Wallet connected - ready to claim join tokens manually");
    }
  }, [isConnected, account]);

  // Fetch token balance whenever account changes
  useEffect(() => {
    if (!account) {
      setBalance(null);
      setSymbol(null);
      return;
    }

    fetchBalance();
  }, [account, fetchBalance]);

  /**
   * Manual function to remove leave tokens (for testing/debugging)
   * This function manually triggers the leave token removal process
   * @returns {Promise<Object>} Result object with success status and transaction details
   */
  const manualRemoveLeaveTokens = useCallback(async () => {
    if (!account) {
      console.error("❌ Cannot remove tokens: No account connected");
      return { success: false, error: "No account connected" };
    }

    console.log("🧪 Manual leave token removal triggered");
    return await handleUserLeave();
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
        // Main function for claiming join tokens
        claimJoinTokens,
        // Manual functions for testing/debugging
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
