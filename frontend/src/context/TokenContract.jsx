import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { ethers } from "ethers";
import { useWallet } from "./WalletContext";
import tokenABI from "../contractData/CryptoVerseToken.json";

export const TokenContext = createContext();

const RPC =
  import.meta.env.VITE_FLOW_RPC || "https://rest-testnet.onflow.org/v1";
const CHAINID = 545;

const contractABI = tokenABI.abi;
const TOKEN_ADDRESS = tokenABI.address;

export const TokenProvider = ({ children }) => {
  const { account } = useWallet();
  const [balance, setBalance] = useState(null);
  const [symbol, setSymbol] = useState(null);

  const fetchBalance = useCallback(async () => {
    console.log("Fetching token balance for account: ", account);
    try {
      // Initialize provider inside useCallback to avoid dependency issues
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

      setBalance(ethers.formatUnits(rawBalance, decimals));
      setSymbol(tokenSymbol);
      console.log("The balance is: ", tokenContract.balanceOf(account));
    } catch (err) {
      console.error("Error fetching token balance:", err);
      setBalance(null);
      setSymbol(null);
    } finally {
      console.log("The process of fetching balance is over");
    }
  }, [account]);

  // Fetch token balance whenever account changes
  useEffect(() => {
    if (!account) return;

    console.log("Fetching token balance for account: ", account);

    fetchBalance();
  }, [account, fetchBalance]);

  return (
    <TokenContext.Provider value={{ fetchBalance, balance, symbol }}>
      {children}
    </TokenContext.Provider>
  );
};

// Hook to use the token context
export const useToken = () => {
  return useContext(TokenContext);
};
