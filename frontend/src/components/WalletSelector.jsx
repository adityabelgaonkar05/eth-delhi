import React from "react";
import { useWallet } from "../context/WalletContext";

const WalletSelector = () => {
  const {
    account,
    isConnected,
    isConnecting,
    fetchWallet,
    disconnectWallet,
    availableWallets,
    walletType,
  } = useWallet();

  const handleWalletConnect = (wallet) => {
    fetchWallet(wallet);
  };

  if (isConnected) {
    return (
      <div className="wallet-connected">
        <div className="wallet-info">
          <h3>
            ✅ Connected to {walletType === "evm" ? "EVM" : "Flow"} Wallet
          </h3>
          <p>
            <strong>Address:</strong>
            {account
              ? `${account.slice(0, 6)}...${account.slice(-4)}`
              : "Loading..."}
          </p>
          <p>
            <strong>Network:</strong>{" "}
            {walletType === "evm" ? "Flow EVM Testnet" : "Flow Testnet"}
          </p>
        </div>
        <button onClick={disconnectWallet} className="disconnect-btn">
          Disconnect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-selector">
      <h3>Connect Your Wallet</h3>
      <p>Choose from EVM wallets or Flow-native wallets:</p>

      {isConnecting ? (
        <div className="connecting">
          <p>🔄 Connecting to wallet...</p>
        </div>
      ) : (
        <div className="wallet-options">
          {/* EVM Wallets */}
          <div className="wallet-category">
            <h4>🔗 EVM Wallets (Flow EVM Testnet)</h4>
            <div className="wallet-grid">
              {availableWallets
                .filter((wallet) => wallet.type === "evm")
                .map((wallet) => (
                  <button
                    key={wallet.name}
                    onClick={() => handleWalletConnect(wallet)}
                    className="wallet-option evm-wallet"
                  >
                    <span className="wallet-icon">{wallet.icon}</span>
                    <span className="wallet-name">{wallet.name}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Flow Wallets */}
          <div className="wallet-category">
            <h4>🌊 Flow Native Wallets</h4>
            <div className="wallet-grid">
              {availableWallets
                .filter((wallet) => wallet.type === "flow")
                .map((wallet) => (
                  <button
                    key={wallet.name}
                    onClick={() => handleWalletConnect(wallet)}
                    className="wallet-option flow-wallet"
                    title={wallet.description}
                  >
                    <span className="wallet-icon">{wallet.icon}</span>
                    <span className="wallet-name">{wallet.name}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      <div className="wallet-info">
        <h4>💡 About Wallet Types:</h4>
        <ul>
          <li>
            <strong>EVM Wallets:</strong> Use Flow EVM testnet (compatible with
            Ethereum apps)
          </li>
          <li>
            <strong>Flow Wallets:</strong> Native Flow blockchain wallets
            (Cadence smart contracts)
          </li>
        </ul>
      </div>

      <style jsx>{`
        .wallet-selector {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: "Inter", sans-serif;
        }

        .wallet-connected {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        }

        .wallet-category {
          margin: 20px 0;
          padding: 15px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .wallet-category h4 {
          margin: 0 0 15px 0;
          color: #374151;
        }

        .wallet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
        }

        .wallet-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 15px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .wallet-option:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .evm-wallet {
          border-left: 4px solid #3b82f6;
        }

        .flow-wallet {
          border-left: 4px solid #10b981;
        }

        .wallet-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }

        .wallet-name {
          font-weight: 600;
          color: #374151;
        }

        .disconnect-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid white;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          margin-top: 15px;
        }

        .connecting {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }

        .wallet-info {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin-top: 20px;
        }

        .wallet-info h4 {
          margin: 0 0 10px 0;
          color: #374151;
        }

        .wallet-info ul {
          margin: 0;
          padding-left: 20px;
        }

        .wallet-info li {
          margin: 5px 0;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default WalletSelector;
