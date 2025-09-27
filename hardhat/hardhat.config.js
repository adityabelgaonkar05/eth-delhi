require("@nomicfoundation/hardhat-toolbox");
const dotenv = require("dotenv");
dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000, // Increased from 200 to reduce contract size
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    localhost: {
      allowUnlimitedContractSize: true,
    },
    flowTestnet: {
      url: process.env.FLOW_TESTNET_RPC_URL,
      accounts: [process.env.FLOW_TESTNET_PRIVATE_KEY],
      allowUnlimitedContractSize: true,
    },
  },
};
