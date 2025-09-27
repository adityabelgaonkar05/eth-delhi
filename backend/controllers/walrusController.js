// index.js
require("dotenv").config();
const { ethers } = require("ethers");
const axios = require("axios");
const contractData = require("../walrusData/WalrusOracle.json"); // Make sure this path is correct

// --- Basic Setup (from your code) ---
const contractABI = contractData.abi;
const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
const contractAddress = contractData.address;
const privateKey = process.env.PRIVATE_KEY;
const walrusPublisherEndpoint = "https://api.walrus.storage/v1/blobs"; // Example endpoint

// --- Create Instances ---
// 1. Contract instance for LISTENING to events (read-only)
const oracleContractReader = new ethers.Contract(
  contractAddress,
  contractABI,
  provider
);

// 2. Wallet instance for SIGNING and SENDING transactions
const wallet = new ethers.Wallet(privateKey, provider);

// 3. Contract instance connected to the wallet for SENDING transactions (write)
const oracleContractSigner = new ethers.Contract(
  contractAddress,
  contractABI,
  wallet
);

console.log("✅ Oracle node setup complete!");
console.log(
  `👂 Listening for "RequestSubmitted" events on contract: ${contractAddress}`
);

// --- Main Event Listener Logic ---
// Added "async" to the callback function to allow "await"
oracleContractReader.on(
  "RequestSubmitted",
  async (requestId, requester, contentSize, event) => {
    console.log(`\n[+] New Event Detected! Request ID: ${requestId}`);

    try {
      // STEP 1: Get the full request data from the contract's public mapping
      console.log("   - 1. Fetching full request details from the contract...");
      const request = await oracleContractReader.getPendingRequest(requestId);

      // We also need the actual content, which is stored in the pendingRequests mapping.
      // Note: Solidity's automatic getter for mappings with structs returns an array-like object.
      const pendingRequestData = await oracleContractReader.pendingRequests(
        requestId
      );
      const contentHex = pendingRequestData.content; // The content is a hex string
      const epochs = pendingRequestData.epochs;
      const isPermanent = pendingRequestData.permanent;

      if (!contentHex || contentHex === "0x") {
        throw new Error("Content is empty or request not found.");
      }

      console.log(`   - Done. Storing data for requester: ${requester}`);

      // STEP 2: Execute the off-chain task (call Walrus API)
      console.log(`   - 2. Uploading ${contentSize} bytes to Walrus...`);

      // Convert the hex string content to a Buffer for the upload
      const contentBuffer = Buffer.from(contentHex.slice(2), "hex");

      const apiUrl = `${walrusPublisherEndpoint}?epochs=${epochs}&permanent=${isPermanent}`;

      const response = await axios.put(apiUrl, contentBuffer, {
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });

      // Let's assume the Walrus API returns data like this:
      const walrusResponse = {
        blobId: response.data.blobId || `bafy-mock-${requestId}`,
        objectId: response.data.objectId || `obj-mock-${requestId}`,
        size: contentSize,
        certifiedEpoch:
          response.data.certifiedEpoch || Math.floor(Date.now() / 1000) - 100,
        endEpoch:
          response.data.endEpoch || Math.floor(Date.now() / 1000) + 10000,
        cost: response.data.cost || 1000,
      };

      console.log(
        `   - Done. Walrus API Success! Blob ID: ${walrusResponse.blobId}`
      );

      // STEP 3: Send the callback transaction to the contract
      console.log(
        `   - 3. Sending callback transaction to processStoreResult...`
      );

      const tx = await oracleContractSigner.processStoreResult(
        requestId,
        walrusResponse.blobId,
        walrusResponse.objectId,
        walrusResponse.size,
        walrusResponse.certifiedEpoch,
        walrusResponse.endEpoch,
        walrusResponse.cost,
        {
          // You might need to manually set gas limits depending on the network
          gasLimit: 300000,
        }
      );

      console.log(`   - Transaction sent! Waiting for confirmation...`);
      const receipt = await tx.wait(); // Wait for the transaction to be mined

      console.log(`[✔] SUCCESS! Request ID ${requestId} processed.`);
      console.log(`   - Transaction Hash: ${receipt.hash}`);
    } catch (error) {
      console.error(`\n[!] ERROR processing Request ID ${requestId}:`);
      console.error(error.message);
    }
  }
);
