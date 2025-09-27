const axios = require("axios");

/**
 * Walrus Storage Backend Service
 *
 * This service provides backend functions to interact with Walrus Storage
 * and manage user data, files, and metadata in your database.
 *
 * Official Walrus API Documentation: https://docs.walrus.storage/
 * Testnet Explorer: https://walruscan.io/
 */

// Walrus API Configuration
const WALRUS_API_BASE = "https://api.walrus.storage/v1";
const WALRUS_EXPLORER_BASE = "https://walruscan.io";

// Default configuration
const DEFAULT_CONFIG = {
  epochs: 2, // Default storage duration (2 epochs = ~4 weeks)
  permanent: false, // Default to temporary storage
  timeout: 30000, // 30 seconds timeout for requests
};

/**
 * Create axios instance with default configuration
 */
const walrusApi = axios.create({
  baseURL: WALRUS_API_BASE,
  timeout: DEFAULT_CONFIG.timeout,
  headers: {
    "Content-Type": "application/octet-stream",
  },
});

/**
 * Handle Walrus API errors with detailed error information
 * @param {Error} error - The error object from axios
 * @returns {Object} Formatted error object
 */
const handleWalrusError = (error) => {
  console.error("Walrus API Error:", error);

  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    return {
      success: false,
      error: `Walrus API Error (${status}): ${
        data?.message || data?.error || "Unknown error"
      }`,
      status,
      details: data,
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      success: false,
      error:
        "No response from Walrus API. Please check your internet connection.",
      type: "network",
    };
  } else {
    // Something else happened
    return {
      success: false,
      error: `Request setup error: ${error.message}`,
      type: "setup",
    };
  }
};

/**
 * Upload a blob to Walrus Storage
 *
 * @param {Buffer|Uint8Array|ArrayBuffer} fileBuffer - The file content to upload
 * @param {number} epochs - Number of epochs to store (default: 2)
 * @param {boolean} permanent - Whether to store permanently (default: false)
 * @returns {Promise<Object>} Upload result with blobId, objectId, and metadata
 *
 * @example
 * const fileBuffer = Buffer.from([1, 2, 3, 4]);
 * const result = await uploadBlob(fileBuffer, 4, false);
 * console.log(result.blobId); // Real Walrus blob ID
 */
const uploadBlob = async (
  fileBuffer,
  epochs = DEFAULT_CONFIG.epochs,
  permanent = DEFAULT_CONFIG.permanent
) => {
  try {
    console.log("🔄 Uploading blob to Walrus Storage...", {
      size: fileBuffer.length,
      epochs,
      permanent,
    });

    // Validate input
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error("File buffer is empty or invalid");
    }

    if (epochs < 1 || epochs > 1000) {
      throw new Error("Epochs must be between 1 and 1000");
    }

    // Prepare upload parameters
    const params = new URLSearchParams({
      epochs: epochs.toString(),
      permanent: permanent.toString(),
    });

    // Upload to Walrus
    const response = await walrusApi.put(`/blobs?${params}`, fileBuffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": fileBuffer.length.toString(),
      },
    });

    const { blobId, objectId, certifiedEpoch, endEpoch, cost } = response.data;

    console.log("✅ Blob uploaded successfully:", {
      blobId,
      objectId,
      certifiedEpoch,
      endEpoch,
      cost,
      explorerUrl: `${WALRUS_EXPLORER_BASE}/blob/${blobId}`,
    });

    return {
      success: true,
      blobId,
      objectId,
      certifiedEpoch,
      endEpoch,
      cost,
      size: fileBuffer.length,
      epochs,
      permanent,
      explorerUrl: `${WALRUS_EXPLORER_BASE}/blob/${blobId}`,
      uploadTime: new Date().toISOString(),
    };
  } catch (error) {
    return handleWalrusError(error);
  }
};

/**
 * Get metadata for a specific blob from Walrus Storage
 *
 * @param {string} blobId - The Walrus blob ID
 * @returns {Promise<Object>} Blob metadata including size, epochs, cost, etc.
 *
 * @example
 * const metadata = await getBlobMetadata('0x1234...');
 * console.log(metadata.size); // File size in bytes
 */
const getBlobMetadata = async (blobId) => {
  try {
    console.log("🔄 Fetching blob metadata from Walrus...", { blobId });

    if (!blobId || typeof blobId !== "string") {
      throw new Error("Invalid blob ID provided");
    }

    const response = await walrusApi.get(`/blobs/${blobId}`);

    const metadata = response.data;

    console.log("✅ Blob metadata retrieved:", {
      blobId,
      size: metadata.size,
      epochs: metadata.epochs,
      cost: metadata.cost,
    });

    return {
      success: true,
      blobId,
      ...metadata,
      explorerUrl: `${WALRUS_EXPLORER_BASE}/blob/${blobId}`,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return handleWalrusError(error);
  }
};

/**
 * Download blob content from Walrus Storage
 *
 * @param {string} blobId - The Walrus blob ID
 * @returns {Promise<Object>} Blob content and metadata
 *
 * @example
 * const result = await downloadBlob('0x1234...');
 * console.log(result.content); // Raw file content as Buffer
 */
const downloadBlob = async (blobId) => {
  try {
    console.log("🔄 Downloading blob content from Walrus...", { blobId });

    if (!blobId || typeof blobId !== "string") {
      throw new Error("Invalid blob ID provided");
    }

    const response = await walrusApi.get(`/blobs/${blobId}/content`, {
      responseType: "arraybuffer",
    });

    const content = Buffer.from(response.data);
    const contentType =
      response.headers["content-type"] || "application/octet-stream";
    const contentLength = response.headers["content-length"] || content.length;

    console.log("✅ Blob content downloaded:", {
      blobId,
      size: content.length,
      contentType,
    });

    return {
      success: true,
      blobId,
      content,
      contentType,
      size: content.length,
      contentLength: parseInt(contentLength),
      downloadedAt: new Date().toISOString(),
    };
  } catch (error) {
    return handleWalrusError(error);
  }
};

/**
 * List all blobs for a specific account/wallet
 *
 * @param {string} account - The wallet address or account identifier
 * @param {Object} options - Optional parameters for listing
 * @param {number} options.limit - Maximum number of blobs to return (default: 100)
 * @param {number} options.offset - Number of blobs to skip (default: 0)
 * @returns {Promise<Object>} List of blobs with metadata
 *
 * @example
 * const blobs = await listUserBlobs('0x1234...', { limit: 50 });
 * console.log(blobs.blobs); // Array of blob objects
 */
const listUserBlobs = async (account, options = {}) => {
  try {
    console.log("🔄 Listing user blobs from Walrus...", { account, options });

    if (!account || typeof account !== "string") {
      throw new Error("Invalid account address provided");
    }

    const { limit = 100, offset = 0 } = options;

    // Validate options
    if (limit < 1 || limit > 1000) {
      throw new Error("Limit must be between 1 and 1000");
    }

    if (offset < 0) {
      throw new Error("Offset must be non-negative");
    }

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await walrusApi.get(
      `/accounts/${account}/blobs?${params}`
    );

    const { blobs, total, hasMore } = response.data;

    console.log("✅ User blobs listed:", {
      account,
      count: blobs.length,
      total,
      hasMore,
    });

    return {
      success: true,
      account,
      blobs: blobs.map((blob) => ({
        ...blob,
        explorerUrl: `${WALRUS_EXPLORER_BASE}/blob/${blob.blobId}`,
      })),
      total,
      hasMore,
      limit,
      offset,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return handleWalrusError(error);
  }
};

/**
 * Utility function to convert text to buffer for upload
 *
 * @param {string} text - The text content to convert
 * @param {string} encoding - Text encoding (default: 'utf8')
 * @returns {Buffer} Text content as Buffer
 *
 * @example
 * const buffer = textToBuffer('Hello, Walrus!');
 * const result = await uploadBlob(buffer);
 */
const textToBuffer = (text, encoding = "utf8") => {
  return Buffer.from(text, encoding);
};

/**
 * Utility function to get Walrus explorer URL for a blob
 *
 * @param {string} blobId - The Walrus blob ID
 * @returns {string} Explorer URL
 *
 * @example
 * const url = getExplorerUrl('0x1234...');
 * console.log(url); // https://walruscan.io/blob/0x1234...
 */
const getExplorerUrl = (blobId) => {
  return `${WALRUS_EXPLORER_BASE}/blob/${blobId}`;
};

/**
 * Utility function to format file size in human-readable format
 *
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 *
 * @example
 * const size = formatFileSize(1024); // "1.0 KB"
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Utility function to calculate estimated cost for storage
 *
 * @param {number} size - File size in bytes
 * @param {number} epochs - Number of epochs
 * @param {boolean} permanent - Whether storage is permanent
 * @returns {Object} Estimated cost information
 *
 * @example
 * const cost = calculateStorageCost(1024, 4, false);
 * console.log(cost.estimated); // Estimated cost in wei
 */
const calculateStorageCost = (size, epochs = 2, permanent = false) => {
  // These are rough estimates - actual costs may vary
  const baseCostPerByte = 0.000000001; // 1 gwei per byte
  const epochMultiplier = permanent ? 1000 : 1; // Permanent storage costs more

  const estimatedCost = size * baseCostPerByte * epochs * epochMultiplier;

  return {
    size,
    epochs,
    permanent,
    estimatedCost,
    estimatedCostFormatted: `${estimatedCost.toFixed(9)} ETH`,
    note: "This is a rough estimate. Actual costs may vary.",
  };
};

/**
 * Save blob metadata to database
 *
 * @param {Object} db - Database connection/instance
 * @param {Object} blobData - Blob data from Walrus
 * @param {string} userId - User ID who uploaded the blob
 * @param {Object} additionalMetadata - Additional metadata to store
 * @returns {Promise<Object>} Database save result
 */
const saveBlobToDatabase = async (
  db,
  blobData,
  userId,
  additionalMetadata = {}
) => {
  try {
    const blobRecord = {
      blobId: blobData.blobId,
      objectId: blobData.objectId,
      userId,
      size: blobData.size,
      epochs: blobData.epochs,
      permanent: blobData.permanent,
      cost: blobData.cost,
      certifiedEpoch: blobData.certifiedEpoch,
      endEpoch: blobData.endEpoch,
      explorerUrl: blobData.explorerUrl,
      uploadTime: blobData.uploadTime,
      ...additionalMetadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // This is a generic example - adapt to your database
    const result = await db.collection("walrus_blobs").insertOne(blobRecord);

    console.log("✅ Blob metadata saved to database:", result.insertedId);

    return {
      success: true,
      databaseId: result.insertedId,
      blobRecord,
    };
  } catch (error) {
    console.error("❌ Failed to save blob to database:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get user's blobs from database
 *
 * @param {Object} db - Database connection/instance
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Database query result
 */
const getUserBlobsFromDatabase = async (db, userId, options = {}) => {
  try {
    const {
      limit = 50,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = -1,
    } = options;

    const query = { userId };
    const sort = { [sortBy]: sortOrder };

    const blobs = await db
      .collection("walrus_blobs")
      .find(query)
      .sort(sort)
      .skip(offset)
      .limit(limit)
      .toArray();

    const total = await db.collection("walrus_blobs").countDocuments(query);

    console.log("✅ User blobs retrieved from database:", blobs.length);

    return {
      success: true,
      blobs,
      total,
      hasMore: offset + blobs.length < total,
      limit,
      offset,
    };
  } catch (error) {
    console.error("❌ Failed to get user blobs from database:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Export all functions
module.exports = {
  uploadBlob,
  getBlobMetadata,
  downloadBlob,
  listUserBlobs,
  textToBuffer,
  getExplorerUrl,
  formatFileSize,
  calculateStorageCost,
  saveBlobToDatabase,
  getUserBlobsFromDatabase,
  // Constants
  WALRUS_API_BASE,
  WALRUS_EXPLORER_BASE,
  DEFAULT_CONFIG,
};
