import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";

export const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const fetchWallet = async () => {
    try {
      setIsConnecting(true);

      // Ensure MetaMask is available
      if (!window.ethereum || !window.ethereum.isMetaMask) {
        alert(
          "MetaMask is not installed. Please install MetaMask and try again."
        );
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        alert("No accounts found in MetaMask.");
        return;
      }

      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      const newSigner = await ethersProvider.getSigner();

      setAccount(accounts[0]);
      setSigner(newSigner);

      console.log("Connected to MetaMask:", accounts[0]);
    } catch (err) {
      console.error("Error connecting MetaMask:", err);
      alert(`Failed to connect MetaMask: ${err?.message || err}`);
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (window.ethereum?.isMetaMask) {
      // Auto-update account on change
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
          setSigner(null);
        }
      });

      // Auto-update on chain change
      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{ account, signer, fetchWallet, isConnecting }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
