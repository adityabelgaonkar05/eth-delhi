# ContractContext Documentation

The ContractContext provides a comprehensive way to interact with all your smart contracts from anywhere in your React application. It automatically initializes all contracts and provides helper functions for reading, writing, and managing transactions.

## Setup

The ContractContext is already set up in your App.jsx:

```jsx
<WalletProvider>
  <ContractProvider>
    <TokenProvider>{/* Your app components */}</TokenProvider>
  </ContractProvider>
</WalletProvider>
```

## Available Contracts

The following contracts are automatically initialized:

- **CryptoVerseToken** - ERC20 token contract
- **BadgeManager** - Manages user badges
- **BlogManager** - Blog management system
- **BusinessDashboard** - Business analytics dashboard
- **EscrowManager** - Escrow functionality
- **LeaderboardManager** - Leaderboard management
- **PremiereAttendanceBadge** - Special event badges
- **ReputationAirdropEscrow** - Reputation-based airdrops
- **ReputationOracle** - Reputation data oracle
- **SelfProtocolIntegration** - Self protocol integration
- **UserRegistry** - User registration and management
- **VideoPremiereManager** - Video premiere management
- **WalrusOracle** - Walrus protocol oracle
- **WalrusStorage** - Walrus protocol storage

## Basic Usage

### 1. Using the Main Hook

```jsx
import { useContracts } from "../context/ContractContext";

const MyComponent = () => {
  const {
    contracts,
    readContract,
    writeContract,
    estimateGas,
    isLoading,
    error,
  } = useContracts();

  // Your component logic
};
```

### 2. Using Specific Contract Hooks

```jsx
import {
  useCryptoVerseToken,
  useBadgeManager,
  useUserRegistry,
} from "../context/ContractContext";

const MyComponent = () => {
  const { contract: cryptoVerseToken, isLoading: tokenLoading } =
    useCryptoVerseToken();
  const { contract: badgeManager, isLoading: badgeLoading } = useBadgeManager();
  const { contract: userRegistry, isLoading: userLoading } = useUserRegistry();

  // Your component logic
};
```

## Reading from Contracts

### Method 1: Using the Contract Instance

```jsx
const { contract: cryptoVerseToken } = useCryptoVerseToken();

// Read token balance
const balance = await cryptoVerseToken.read("balanceOf", userAddress);

// Read token decimals
const decimals = await cryptoVerseToken.read("decimals");

// Read token symbol
const symbol = await cryptoVerseToken.read("symbol");
```

### Method 2: Using the Helper Function

```jsx
const { readContract } = useContracts();

// Read from any contract
const balance = await readContract(
  "CryptoVerseToken",
  "balanceOf",
  userAddress
);
const userInfo = await readContract("UserRegistry", "getUserInfo", userAddress);
```

## Writing to Contracts

### Method 1: Using the Contract Instance

```jsx
const { contract: cryptoVerseToken } = useCryptoVerseToken();

// Transfer tokens
const tx = await cryptoVerseToken.write("transfer", recipientAddress, amount);

// Wait for confirmation
const receipt = await tx.wait();
console.log("Transaction confirmed:", receipt);
```

### Method 2: Using the Helper Function

```jsx
const { writeContract } = useContracts();

// Write to any contract
const tx = await writeContract(
  "CryptoVerseToken",
  "transfer",
  recipientAddress,
  amount
);
const receipt = await tx.wait();
```

## Gas Estimation

```jsx
const { estimateGas } = useContracts();

// Estimate gas for a transaction
const gasEstimate = await estimateGas(
  "CryptoVerseToken",
  "transfer",
  recipientAddress,
  amount
);
console.log("Estimated gas:", gasEstimate.toString());
```

## Transaction Management

```jsx
const { waitForTransaction, getTransaction, getTransactionReceipt } =
  useContracts();

// Wait for transaction confirmation
const receipt = await waitForTransaction(txHash, 1); // 1 confirmation

// Get transaction details
const tx = await getTransaction(txHash);

// Get transaction receipt
const receipt = await getTransactionReceipt(txHash);
```

## Getting Contract Information

```jsx
const { getContract, getAllContracts, getContractsByType } = useContracts();

// Get a specific contract
const tokenContract = getContract("CryptoVerseToken");

// Get all contracts
const allContracts = getAllContracts();

// Get contracts by type
const managerContracts = getContractsByType("Manager");
const oracleContracts = getContractsByType("Oracle");
```

## Error Handling

```jsx
const { error, isLoading } = useContracts();

if (isLoading) {
  return <div>Loading contracts...</div>;
}

if (error) {
  return <div>Error: {error}</div>;
}

// Your component logic
```

## Complete Example

```jsx
import React, { useState, useEffect } from "react";
import { useContracts, useCryptoVerseToken } from "../context/ContractContext";
import { useWallet } from "../context/WalletContext";

const TokenManager = () => {
  const { account, isConnected } = useWallet();
  const { readContract, writeContract, estimateGas } = useContracts();
  const { contract: cryptoVerseToken, isLoading: tokenLoading } =
    useCryptoVerseToken();

  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch token balance
  const fetchBalance = async () => {
    if (!isConnected) return;

    try {
      const balance = await cryptoVerseToken.read("balanceOf", account);
      const decimals = await cryptoVerseToken.read("decimals");
      const formattedBalance = ethers.formatUnits(balance, decimals);
      setBalance(formattedBalance);
    } catch (err) {
      console.error("Error fetching balance:", err);
    }
  };

  // Transfer tokens
  const transferTokens = async (to, amount) => {
    if (!isConnected) return;

    try {
      setLoading(true);

      // Estimate gas
      const gasEstimate = await estimateGas(
        "CryptoVerseToken",
        "transfer",
        to,
        amount
      );
      console.log("Gas estimate:", gasEstimate.toString());

      // Execute transfer
      const tx = await writeContract(
        "CryptoVerseToken",
        "transfer",
        to,
        amount
      );
      console.log("Transaction hash:", tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      // Refresh balance
      await fetchBalance();
    } catch (err) {
      console.error("Error transferring tokens:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchBalance();
    }
  }, [isConnected, account]);

  if (!isConnected) {
    return <div>Please connect your wallet</div>;
  }

  return (
    <div>
      <h2>Token Manager</h2>
      <p>Balance: {balance || "Loading..."}</p>
      <button
        onClick={() => transferTokens("0x...", "1000000000000000000")}
        disabled={loading}
      >
        {loading ? "Transferring..." : "Transfer 1 Token"}
      </button>
    </div>
  );
};

export default TokenManager;
```

## Best Practices

1. **Always check wallet connection** before making contract calls
2. **Handle errors gracefully** with try-catch blocks
3. **Show loading states** during transactions
4. **Estimate gas** before expensive operations
5. **Wait for confirmations** for important transactions
6. **Use specific contract hooks** when you only need one contract
7. **Use the main hook** when you need multiple contracts or helper functions

## Contract Types

Contracts are categorized by type for easy filtering:

- **ERC20** - Token contracts
- **Manager** - Management contracts
- **Oracle** - Data oracle contracts
- **Storage** - Storage contracts
- **Registry** - Registration contracts
- **Dashboard** - Analytics contracts
- **Escrow** - Escrow contracts
- **Badge** - Badge contracts
- **Integration** - Integration contracts

This makes it easy to find and work with specific types of contracts in your application.
