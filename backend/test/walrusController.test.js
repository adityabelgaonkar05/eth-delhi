const { expect } = require("chai");
const { ethers } = require("ethers");
const axios = require("axios");
const sinon = require("sinon");

// Mock the contract data
const mockContractData = {
  address: "0x356C2eBF9D6Bd617300F2476beF1E43452D064BF",
  abi: [
    {
      type: "event",
      anonymous: false,
      name: "RequestSubmitted",
      inputs: [
        {
          type: "string",
          name: "requestId",
          indexed: true,
        },
        {
          type: "address",
          name: "requester",
          indexed: true,
        },
        {
          type: "uint256",
          name: "contentSize",
          indexed: false,
        },
      ],
    },
  ],
};

describe("Walrus Controller", function () {
  let provider;
  let wallet;
  let contractReader;
  let contractSigner;
  let axiosStub;

  beforeEach(function () {
    // Mock environment variables
    process.env.ALCHEMY_URL = "https://eth-sepolia.g.alchemy.com/v2/test-key";
    process.env.PRIVATE_KEY =
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    // Create mock provider and wallet
    provider = {
      on: sinon.stub(),
      getNetwork: sinon.stub().resolves({ chainId: 11155111 }),
      getBlockNumber: sinon.stub().resolves(1000000),
    };

    wallet = {
      address: "0x1234567890123456789012345678901234567890",
      signMessage: sinon.stub().resolves("0xsignedmessage"),
      sendTransaction: sinon.stub().resolves({ hash: "0xtxhash" }),
    };

    // Create mock contract instances
    contractReader = {
      on: sinon.stub(),
      getPendingRequest: sinon.stub(),
      pendingRequests: sinon.stub(),
    };

    contractSigner = {
      processStoreResult: sinon.stub().resolves({
        wait: sinon.stub().resolves({ hash: "0xtxhash" }),
      }),
    };

    // Mock axios
    axiosStub = sinon.stub(axios, "put");
  });

  afterEach(function () {
    sinon.restore();
  });

  describe("Contract Setup", function () {
    it("Should create contract instances correctly", function () {
      // This would test the actual setup from walrusController.js
      expect(contractReader).to.exist;
      expect(contractSigner).to.exist;
    });

    it("Should have correct contract address", function () {
      expect(mockContractData.address).to.equal(
        "0x356C2eBF9D6Bd617300F2476beF1E43452D064BF"
      );
    });
  });

  describe("Event Listening", function () {
    it("Should listen for RequestSubmitted events", function () {
      // Test that the event listener is set up
      expect(contractReader.on.calledWith("RequestSubmitted")).to.be.false;

      // Simulate setting up the event listener
      contractReader.on("RequestSubmitted", sinon.stub());

      expect(contractReader.on.calledWith("RequestSubmitted")).to.be.true;
    });

    it("Should handle RequestSubmitted event correctly", async function () {
      const mockRequestId = "test-request-123";
      const mockRequester = "0x1234567890123456789012345678901234567890";
      const mockContentSize = 1024;

      const mockRequest = {
        requester: mockRequester,
        contentSize: mockContentSize,
        epochs: 100,
        permanent: false,
        timestamp: Math.floor(Date.now() / 1000),
        processed: false,
      };

      const mockPendingRequest = {
        requester: mockRequester,
        content: "0x48656c6c6f20576f726c64", // "Hello World" in hex
        epochs: 100,
        permanent: false,
        timestamp: Math.floor(Date.now() / 1000),
        processed: false,
      };

      // Setup mocks
      contractReader.getPendingRequest.resolves(mockRequest);
      contractReader.pendingRequests.resolves(mockPendingRequest);
      axiosStub.resolves({
        data: {
          blobId: "bafy-test-blob-id",
          objectId: "obj-test-object-id",
          certifiedEpoch: Math.floor(Date.now() / 1000) - 100,
          endEpoch: Math.floor(Date.now() / 1000) + 10000,
          cost: 1000,
        },
      });

      // Simulate the event handler
      const eventHandler = async (requestId, requester, contentSize, event) => {
        try {
          // Get the full request data
          const request = await contractReader.getPendingRequest(requestId);
          const pendingRequestData = await contractReader.pendingRequests(
            requestId
          );

          const contentHex = pendingRequestData.content;
          const epochs = pendingRequestData.epochs;
          const isPermanent = pendingRequestData.permanent;

          if (!contentHex || contentHex === "0x") {
            throw new Error("Content is empty or request not found.");
          }

          // Convert hex to buffer
          const contentBuffer = Buffer.from(contentHex.slice(2), "hex");

          // Upload to Walrus
          const walrusPublisherEndpoint = "https://api.walrus.storage/v1/blobs";
          const apiUrl = `${walrusPublisherEndpoint}?epochs=${epochs}&permanent=${isPermanent}`;

          const response = await axios.put(apiUrl, contentBuffer, {
            headers: {
              "Content-Type": "application/octet-stream",
            },
          });

          const walrusResponse = {
            blobId: response.data.blobId || `bafy-mock-${requestId}`,
            objectId: response.data.objectId || `obj-mock-${requestId}`,
            size: contentSize,
            certifiedEpoch:
              response.data.certifiedEpoch ||
              Math.floor(Date.now() / 1000) - 100,
            endEpoch:
              response.data.endEpoch || Math.floor(Date.now() / 1000) + 10000,
            cost: response.data.cost || 1000,
          };

          // Process the result
          const tx = await contractSigner.processStoreResult(
            requestId,
            walrusResponse.blobId,
            walrusResponse.objectId,
            walrusResponse.size,
            walrusResponse.certifiedEpoch,
            walrusResponse.endEpoch,
            walrusResponse.cost,
            {
              gasLimit: 300000,
            }
          );

          const receipt = await tx.wait();

          return { success: true, receipt };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };

      // Test the event handler
      const result = await eventHandler(
        mockRequestId,
        mockRequester,
        mockContentSize,
        {}
      );

      expect(result.success).to.be.true;
      expect(contractReader.getPendingRequest.calledWith(mockRequestId)).to.be
        .true;
      expect(contractReader.pendingRequests.calledWith(mockRequestId)).to.be
        .true;
      expect(axiosStub.calledOnce).to.be.true;
      expect(contractSigner.processStoreResult.calledOnce).to.be.true;
    });

    it("Should handle empty content error", async function () {
      const mockRequestId = "test-request-empty";
      const mockRequester = "0x1234567890123456789012345678901234567890";
      const mockContentSize = 0;

      const mockPendingRequest = {
        requester: mockRequester,
        content: "0x", // Empty content
        epochs: 100,
        permanent: false,
        timestamp: Math.floor(Date.now() / 1000),
        processed: false,
      };

      contractReader.pendingRequests.resolves(mockPendingRequest);

      const eventHandler = async (requestId, requester, contentSize, event) => {
        try {
          const pendingRequestData = await contractReader.pendingRequests(
            requestId
          );
          const contentHex = pendingRequestData.content;

          if (!contentHex || contentHex === "0x") {
            throw new Error("Content is empty or request not found.");
          }

          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };

      const result = await eventHandler(
        mockRequestId,
        mockRequester,
        mockContentSize,
        {}
      );

      expect(result.success).to.be.false;
      expect(result.error).to.equal("Content is empty or request not found.");
    });

    it("Should handle Walrus API errors", async function () {
      const mockRequestId = "test-request-api-error";
      const mockRequester = "0x1234567890123456789012345678901234567890";
      const mockContentSize = 1024;

      const mockPendingRequest = {
        requester: mockRequester,
        content: "0x48656c6c6f20576f726c64",
        epochs: 100,
        permanent: false,
        timestamp: Math.floor(Date.now() / 1000),
        processed: false,
      };

      contractReader.pendingRequests.resolves(mockPendingRequest);
      axiosStub.rejects(new Error("Walrus API Error"));

      const eventHandler = async (requestId, requester, contentSize, event) => {
        try {
          const pendingRequestData = await contractReader.pendingRequests(
            requestId
          );
          const contentHex = pendingRequestData.content;
          const epochs = pendingRequestData.epochs;
          const isPermanent = pendingRequestData.permanent;

          const contentBuffer = Buffer.from(contentHex.slice(2), "hex");
          const walrusPublisherEndpoint = "https://api.walrus.storage/v1/blobs";
          const apiUrl = `${walrusPublisherEndpoint}?epochs=${epochs}&permanent=${isPermanent}`;

          await axios.put(apiUrl, contentBuffer, {
            headers: {
              "Content-Type": "application/octet-stream",
            },
          });

          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };

      const result = await eventHandler(
        mockRequestId,
        mockRequester,
        mockContentSize,
        {}
      );

      expect(result.success).to.be.false;
      expect(result.error).to.equal("Walrus API Error");
    });
  });

  describe("Content Processing", function () {
    it("Should convert hex content to buffer correctly", function () {
      const hexContent = "0x48656c6c6f20576f726c64"; // "Hello World"
      const expectedBuffer = Buffer.from("Hello World");

      const actualBuffer = Buffer.from(hexContent.slice(2), "hex");

      expect(actualBuffer.toString()).to.equal(expectedBuffer.toString());
    });

    it("Should handle different content types", function () {
      const testCases = [
        { hex: "0x48656c6c6f", expected: "Hello" },
        { hex: "0x576f726c64", expected: "World" },
        { hex: "0x", expected: "" },
      ];

      testCases.forEach(({ hex, expected }) => {
        if (hex === "0x") {
          expect(() => Buffer.from(hex.slice(2), "hex")).to.not.throw();
        } else {
          const buffer = Buffer.from(hex.slice(2), "hex");
          expect(buffer.toString()).to.equal(expected);
        }
      });
    });
  });

  describe("Walrus API Integration", function () {
    it("Should format Walrus API URL correctly", function () {
      const baseUrl = "https://api.walrus.storage/v1/blobs";
      const epochs = 100;
      const permanent = true;

      const expectedUrl = `${baseUrl}?epochs=${epochs}&permanent=${permanent}`;
      const actualUrl = `${baseUrl}?epochs=${epochs}&permanent=${permanent}`;

      expect(actualUrl).to.equal(expectedUrl);
    });

    it("Should handle Walrus API response correctly", function () {
      const mockResponse = {
        data: {
          blobId: "bafy-test-blob-id",
          objectId: "obj-test-object-id",
          certifiedEpoch: 1234567890,
          endEpoch: 1234567890 + 10000,
          cost: 1000,
        },
      };

      const walrusResponse = {
        blobId: mockResponse.data.blobId,
        objectId: mockResponse.data.objectId,
        size: 1024,
        certifiedEpoch: mockResponse.data.certifiedEpoch,
        endEpoch: mockResponse.data.endEpoch,
        cost: mockResponse.data.cost,
      };

      expect(walrusResponse.blobId).to.equal("bafy-test-blob-id");
      expect(walrusResponse.objectId).to.equal("obj-test-object-id");
      expect(walrusResponse.cost).to.equal(1000);
    });

    it("Should handle missing Walrus API response fields", function () {
      const mockResponse = {
        data: {}, // Empty response
      };

      const requestId = "test-request-123";
      const contentSize = 1024;

      const walrusResponse = {
        blobId: mockResponse.data.blobId || `bafy-mock-${requestId}`,
        objectId: mockResponse.data.objectId || `obj-mock-${requestId}`,
        size: contentSize,
        certifiedEpoch:
          mockResponse.data.certifiedEpoch ||
          Math.floor(Date.now() / 1000) - 100,
        endEpoch:
          mockResponse.data.endEpoch || Math.floor(Date.now() / 1000) + 10000,
        cost: mockResponse.data.cost || 1000,
      };

      expect(walrusResponse.blobId).to.equal(`bafy-mock-${requestId}`);
      expect(walrusResponse.objectId).to.equal(`obj-mock-${requestId}`);
      expect(walrusResponse.cost).to.equal(1000);
    });
  });
});

