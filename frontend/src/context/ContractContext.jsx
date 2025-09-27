import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { ethers } from "ethers";
import { useWallet } from "./WalletContext";

// Import all contract ABIs
import CryptoVerseTokenABI from "../contractData/CryptoVerseToken.json";
import BadgeManagerABI from "../contractData/BadgeManager.json";
import BlogManagerABI from "../contractData/BlogManagerWithWalrus.json";
import BusinessDashboardABI from "../contractData/CryptoVerseBusinessDashboard.json";
import EscrowManagerABI from "../contractData/EscrowManager.json";
import LeaderboardManagerABI from "../contractData/LeaderboardManager.json";
import PremiereAttendanceBadgeABI from "../contractData/PremiereAttendanceBadge.json";
import ReputationAirdropEscrowABI from "../contractData/ReputationAirdropEscrow.json";
import ReputationOracleABI from "../contractData/ReputationOracle.json";
import SelfProtocolIntegrationABI from "../contractData/SelfProtocolIntegration.json";
import UserRegistryABI from "../contractData/UserRegistry.json";
import VideoPremiereManagerABI from "../contractData/VideoPremiereManager.json";
import WalrusOracleABI from "../contractData/WalrusOracle.json";
import WalrusStorageABI from "../contractData/WalrusStorage.json";
import CryptoVersePetNFTABI from "../contractData/CryptoVersePetNFT.json";

export const ContractContext = createContext();

// Contract configurations
const CONTRACT_CONFIGS = {
  CryptoVerseToken: {
    abi: CryptoVerseTokenABI.abi,
    address: CryptoVerseTokenABI.address,
    name: "CryptoVerse Token",
    type: "ERC20",
  },
  BadgeManager: {
    abi: BadgeManagerABI.abi,
    address: BadgeManagerABI.address,
    name: "Badge Manager",
    type: "Manager",
  },
  BlogManager: {
    abi: BlogManagerABI.abi,
    address: BlogManagerABI.address,
    name: "Blog Manager",
    type: "Manager",
  },
  BusinessDashboard: {
    abi: BusinessDashboardABI.abi,
    address: BusinessDashboardABI.address,
    name: "Business Dashboard",
    type: "Dashboard",
  },
  EscrowManager: {
    abi: EscrowManagerABI.abi,
    address: EscrowManagerABI.address,
    name: "Escrow Manager",
    type: "Manager",
  },
  LeaderboardManager: {
    abi: LeaderboardManagerABI.abi,
    address: LeaderboardManagerABI.address,
    name: "Leaderboard Manager",
    type: "Manager",
  },
  PremiereAttendanceBadge: {
    abi: PremiereAttendanceBadgeABI.abi,
    address: PremiereAttendanceBadgeABI.address,
    name: "Premiere Attendance Badge",
    type: "Badge",
  },
  ReputationAirdropEscrow: {
    abi: ReputationAirdropEscrowABI.abi,
    address: ReputationAirdropEscrowABI.address,
    name: "Reputation Airdrop Escrow",
    type: "Escrow",
  },
  ReputationOracle: {
    abi: ReputationOracleABI.abi,
    address: ReputationOracleABI.address,
    name: "Reputation Oracle",
    type: "Oracle",
  },
  SelfProtocolIntegration: {
    abi: SelfProtocolIntegrationABI.abi,
    address: SelfProtocolIntegrationABI.address,
    name: "Self Protocol Integration",
    type: "Integration",
  },
  UserRegistry: {
    abi: UserRegistryABI.abi,
    address: UserRegistryABI.address,
    name: "User Registry",
    type: "Registry",
  },
  VideoPremiereManager: {
    abi: VideoPremiereManagerABI.abi,
    address: VideoPremiereManagerABI.address,
    name: "Video Premiere Manager",
    type: "Manager",
  },
  WalrusOracle: {
    abi: WalrusOracleABI.abi,
    address: WalrusOracleABI.address,
    name: "Walrus Oracle",
    type: "Oracle",
  },
  WalrusStorage: {
    abi: WalrusStorageABI.abi,
    address: WalrusStorageABI.address,
    name: "Walrus Storage",
    type: "Storage",
  },
  CryptoVersePetNFT: {
    abi: CryptoVersePetNFTABI.abi,
    address: CryptoVersePetNFTABI.address,
    name: "CryptoVerse Pet NFT",
    type: "ERC721",
  },
};

// Network configuration
const RPC =
  import.meta.env.VITE_FLOW_RPC || "https://rest-testnet.onflow.org/v1";
const CHAINID = 545;

export const ContractProvider = ({ children }) => {
  const { signer } = useWallet();
  const [contracts, setContracts] = useState({});
  const [provider, setProvider] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true since contracts need to be loaded
  const [error, setError] = useState(null);

  // Initialize provider
  useEffect(() => {
    const initProvider = async () => {
      try {
        console.log("Initializing contract provider with RPC:", RPC);
        const rpcProvider = new ethers.JsonRpcProvider(RPC, CHAINID);

        // Test the connection
        const network = await rpcProvider.getNetwork();
        console.log(
          "Contract provider initialized successfully. Network:",
          network
        );

        setProvider(rpcProvider);
        setError(null);
      } catch (err) {
        console.error("Error initializing contract provider:", err);
        setError(`Failed to initialize contract provider: ${err.message}`);
        setIsLoading(false); // Stop loading if provider fails
      }
    };

    initProvider();
  }, []);

  // Initialize contracts
  const initializeContracts = useCallback(async () => {
    if (!provider) {
      console.log("Provider not available, skipping contract initialization");
      return;
    }

    console.log("Starting contract initialization...");
    setIsLoading(true);
    setError(null);

    try {
      const contractInstances = {};

      // Create contract instances for each contract
      for (const [contractName, config] of Object.entries(CONTRACT_CONFIGS)) {
        try {
          console.log(
            `Initializing contract: ${contractName} at ${config.address}`
          );
          console.log(
            `Contract ABI length: ${
              config.abi ? config.abi.length : "undefined"
            }`
          );

          if (!config.address) {
            console.error(`No address found for contract ${contractName}`);
            continue;
          }

          if (!config.abi) {
            console.error(`No ABI found for contract ${contractName}`);
            continue;
          }

          const contract = new ethers.Contract(
            config.address,
            config.abi,
            provider
          );

          contractInstances[contractName] = {
            contract,
            config,
            // Add helper methods
            getAddress: () => config.address,
            getName: () => config.name,
            getType: () => config.type,
            // Add read methods
            read: async (methodName, ...args) => {
              try {
                return await contract[methodName](...args);
              } catch (err) {
                console.error(
                  `Error reading ${methodName} from ${contractName}:`,
                  err
                );
                throw err;
              }
            },
            // Add write methods (requires signer)
            write: async (methodName, ...args) => {
              if (!signer) {
                throw new Error("Signer required for write operations");
              }
              try {
                const contractWithSigner = contract.connect(signer);
                const tx = await contractWithSigner[methodName](...args);
                return tx;
              } catch (err) {
                console.error(
                  `Error writing ${methodName} to ${contractName}:`,
                  err
                );
                throw err;
              }
            },
            // Add estimate gas method
            estimateGas: async (methodName, ...args) => {
              try {
                return await contract.estimateGas[methodName](...args);
              } catch (err) {
                console.error(
                  `Error estimating gas for ${methodName} in ${contractName}:`,
                  err
                );
                throw err;
              }
            },
          };

          console.log(`Successfully initialized contract: ${contractName}`);
        } catch (err) {
          console.error(`Error initializing ${contractName}:`, err);
          // Continue with other contracts even if one fails
        }
      }

      setContracts(contractInstances);
      console.log(
        `Contract initialization completed. Loaded ${
          Object.keys(contractInstances).length
        } contracts:`,
        Object.keys(contractInstances)
      );
    } catch (err) {
      console.error("Error initializing contracts:", err);
      setError(`Failed to initialize contracts: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [provider, signer]);

  // Initialize contracts when provider is ready
  useEffect(() => {
    if (provider) {
      initializeContracts();
    }
  }, [provider, initializeContracts]);

  // Helper function to get a specific contract
  const getContract = useCallback(
    (contractName) => {
      console.log(
        `getContract called for ${contractName}, isLoading: ${isLoading}, contracts:`,
        Object.keys(contracts)
      );
      if (!contracts[contractName]) {
        if (isLoading) {
          // Return null if still loading instead of throwing error
          console.log(
            `Contract ${contractName} not found, but still loading. Returning null.`
          );
          return null;
        }
        console.error(
          `Contract ${contractName} not found and not loading. Available contracts:`,
          Object.keys(contracts)
        );
        throw new Error(`Contract ${contractName} not found`);
      }
      console.log(`Contract ${contractName} found successfully`);
      return contracts[contractName];
    },
    [contracts, isLoading]
  );

  // Helper function to get all contracts
  const getAllContracts = useCallback(() => {
    return contracts;
  }, [contracts]);

  // Helper function to get contracts by type
  const getContractsByType = useCallback(
    (type) => {
      return Object.entries(contracts)
        .filter(([, contract]) => contract.config.type === type)
        .reduce((acc, [name, contract]) => {
          acc[name] = contract;
          return acc;
        }, {});
    },
    [contracts]
  );

  // Helper function to execute a read operation
  const readContract = useCallback(
    async (contractName, methodName, ...args) => {
      const contract = getContract(contractName);
      return await contract.read(methodName, ...args);
    },
    [getContract]
  );

  // Helper function to execute a write operation
  const writeContract = useCallback(
    async (contractName, methodName, ...args) => {
      const contract = getContract(contractName);
      return await contract.write(methodName, ...args);
    },
    [getContract]
  );

  // Helper function to estimate gas
  const estimateGas = useCallback(
    async (contractName, methodName, ...args) => {
      const contract = getContract(contractName);
      return await contract.estimateGas(methodName, ...args);
    },
    [getContract]
  );

  // Helper function to wait for transaction
  const waitForTransaction = useCallback(
    async (txHash, confirmations = 1) => {
      if (!provider) {
        throw new Error("Provider not available");
      }
      try {
        const receipt = await provider.waitForTransaction(
          txHash,
          confirmations
        );
        return receipt;
      } catch (err) {
        console.error("Error waiting for transaction:", err);
        throw err;
      }
    },
    [provider]
  );

  // Helper function to get transaction details
  const getTransaction = useCallback(
    async (txHash) => {
      if (!provider) {
        throw new Error("Provider not available");
      }
      try {
        const tx = await provider.getTransaction(txHash);
        return tx;
      } catch (err) {
        console.error("Error getting transaction:", err);
        throw err;
      }
    },
    [provider]
  );

  // Helper function to get transaction receipt
  const getTransactionReceipt = useCallback(
    async (txHash) => {
      if (!provider) {
        throw new Error("Provider not available");
      }
      try {
        const receipt = await provider.getTransactionReceipt(txHash);
        return receipt;
      } catch (err) {
        console.error("Error getting transaction receipt:", err);
        throw err;
      }
    },
    [provider]
  );

  // Helper function to get block number
  const getBlockNumber = useCallback(async () => {
    if (!provider) {
      throw new Error("Provider not available");
    }
    try {
      return await provider.getBlockNumber();
    } catch (err) {
      console.error("Error getting block number:", err);
      throw err;
    }
  }, [provider]);

  // Helper function to get network info
  const getNetwork = useCallback(async () => {
    if (!provider) {
      throw new Error("Provider not available");
    }
    try {
      return await provider.getNetwork();
    } catch (err) {
      console.error("Error getting network:", err);
      throw err;
    }
  }, [provider]);

  const value = {
    // Contract instances
    contracts,
    provider,

    // Loading and error states
    isLoading,
    error,

    // Helper functions
    getContract,
    getAllContracts,
    getContractsByType,
    readContract,
    writeContract,
    estimateGas,

    // Transaction helpers
    waitForTransaction,
    getTransaction,
    getTransactionReceipt,
    getBlockNumber,
    getNetwork,

    // Contract configurations
    CONTRACT_CONFIGS,

    // Re-initialize contracts
    initializeContracts,
  };

  return (
    <ContractContext.Provider value={value}>
      {children}
    </ContractContext.Provider>
  );
};

// Hook to use the contract context
export const useContracts = () => {
  const context = useContext(ContractContext);
  if (!context) {
    throw new Error("useContracts must be used within a ContractProvider");
  }
  return context;
};

// Specific contract hooks for convenience
export const useCryptoVerseToken = () => {
  const { getContract, isLoading } = useContracts();
  const contract = getContract("CryptoVerseToken");
  return { contract, isLoading };
};

export const useBadgeManager = () => {
  const { getContract, isLoading } = useContracts();
  const contract = getContract("BadgeManager");
  return { contract, isLoading };
};

export const useBlogManager = () => {
  const { getContract, isLoading } = useContracts();
  const contract = getContract("BlogManager");
  return { contract, isLoading };
};

export const useBusinessDashboard = () => {
  const { getContract, isLoading } = useContracts();
  const contract = getContract("BusinessDashboard");
  return { contract, isLoading };
};

export const useEscrowManager = () => {
  const { getContract, isLoading } = useContracts();
  const contract = getContract("EscrowManager");
  return { contract, isLoading };
};

export const useLeaderboardManager = () => {
  const { getContract, isLoading } = useContracts();
  const contract = getContract("LeaderboardManager");
  return { contract, isLoading };
};

export const useUserRegistry = () => {
  const { getContract, isLoading } = useContracts();
  const contract = getContract("UserRegistry");
  return { contract, isLoading };
};

export const useVideoPremiereManager = () => {
  const { getContract, isLoading } = useContracts();
  const contract = getContract("VideoPremiereManager");
  return { contract, isLoading };
};

export const useReputationOracle = () => {
  const { getContract, isLoading } = useContracts();
  const contract = getContract("ReputationOracle");
  return { contract, isLoading };
};

export const useWalrusOracle = () => {
  const { getContract, isLoading } = useContracts();
  const contract = getContract("WalrusOracle");
  return { contract, isLoading };
};

export const useWalrusStorage = () => {
  const { getContract, isLoading } = useContracts();
  const contract = getContract("WalrusStorage");
  return { contract, isLoading };
};

export const useCryptoVersePetNFT = () => {
  const { getContract, isLoading } = useContracts();
  const contract = getContract("CryptoVersePetNFT");
  return { contract, isLoading };
};
