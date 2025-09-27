// ONLY FOR WALLET TESTING
import { ethers } from "ethers";
import { createContext, useState, useEffect, useContext } from "react";

export const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [availableWallets, setAvailableWallets] = useState([]);

  // Detect available wallets
  const detectWallets = () => {
    const wallets = [];

    // Check for MetaMask
    if (window.ethereum?.isMetaMask) {
      wallets.push({ name: "MetaMask", provider: window.ethereum });
    }

    // Check for Coinbase Wallet
    if (window.ethereum?.isCoinbaseWallet) {
      wallets.push({ name: "Coinbase Wallet", provider: window.ethereum });
    }

    // Check for Trust Wallet
    if (window.ethereum?.isTrust) {
      wallets.push({ name: "Trust Wallet", provider: window.ethereum });
    }

    // Check for Brave Wallet
    if (window.ethereum?.isBraveWallet) {
      wallets.push({ name: "Brave Wallet", provider: window.ethereum });
    }

    // Check for Rainbow Wallet
    if (window.ethereum?.isRainbow) {
      wallets.push({ name: "Rainbow Wallet", provider: window.ethereum });
    }

    // Generic ethereum provider (fallback)
    if (window.ethereum && wallets.length === 0) {
      wallets.push({ name: "Unknown Wallet", provider: window.ethereum });
    }

    // Check for multiple providers (EIP-5749)
    if (window.ethereum?.providers?.length > 0) {
      window.ethereum.providers.forEach((provider) => {
        if (provider.isMetaMask) wallets.push({ name: "MetaMask", provider });
        if (provider.isCoinbaseWallet)
          wallets.push({ name: "Coinbase Wallet", provider });
        if (provider.isTrust) wallets.push({ name: "Trust Wallet", provider });
        // Add more as needed
      });
    }

    setAvailableWallets(wallets);
    return wallets;
  };

  const fetchWallet = async (selectedProvider = null) => {
    try {
      setIsConnecting(true);

      // Use selected provider or default to window.ethereum
      const provider = selectedProvider || window.ethereum;

      if (!provider) {
        alert(
          "No Web3 wallet found. Please install MetaMask, Coinbase Wallet, or another Web3 wallet."
        );
        return;
      }

      // Request account access
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });

      setAccount(accounts[0]);

      // Create ethers provider (works with any EIP-1193 compatible wallet)
      const ethersProvider = new ethers.BrowserProvider(provider);
      const newSigner = await ethersProvider.getSigner();
      setSigner(newSigner);

      console.log("Connected to wallet:", accounts[0]);
      console.log("Signer set:", newSigner);
    } catch (err) {
      console.error("Error connecting to wallet:", err.message);
      alert(`Failed to connect wallet: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else if (accounts[0] !== account) {
      setAccount(accounts[0]);
      console.log("Account changed to:", accounts[0]);
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  useEffect(() => {
    // Detect available wallets
    detectWallets();

    // Check if already connected
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            const provider = new ethers.BrowserProvider(window.ethereum);
            const newSigner = await provider.getSigner();
            setSigner(newSigner);
          }
        } catch (err) {
          console.error("Error checking connection:", err);
        }
      }
    };

    checkConnection();

    // Set up event listeners for any available provider
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  const value = {
    account,
    signer,
    isConnecting,
    fetchWallet,
    disconnectWallet,
    isConnected: !!account,
    availableWallets,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
