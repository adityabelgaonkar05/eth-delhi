// Walrus API service for communicating with backend walrus endpoints
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

class WalrusApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Make HTTP request with error handling
   */
  async makeRequest(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Upload content to Walrus storage via backend
   * @param {string|Buffer} content - Content to upload
   * @param {number} epochs - Number of epochs for storage
   * @param {boolean} permanent - Whether storage is permanent
   * @returns {Promise<Object>} Upload result with blobId and other metadata
   */
  async uploadToWalrus(content, epochs = 1, permanent = false) {
    try {
      console.log("📤 Uploading content to Walrus via backend...");

      const response = await this.makeRequest("/walrus/upload", {
        method: "POST",
        body: JSON.stringify({
          content: typeof content === "string" ? content : Array.from(content),
          epochs,
          permanent,
        }),
      });

      console.log("✅ Walrus upload successful:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Walrus upload failed:", error);
      throw error;
    }
  }

  /**
   * Retrieve content from Walrus storage via backend
   * @param {string} blobId - Blob ID to retrieve
   * @returns {Promise<Object>} Retrieved content and metadata
   */
  async retrieveFromWalrus(blobId) {
    try {
      console.log(`📥 Retrieving blob ${blobId} from Walrus via backend...`);

      const response = await this.makeRequest(`/walrus/retrieve/${blobId}`, {
        method: "GET",
      });

      console.log("✅ Walrus retrieval successful");
      return response.data;
    } catch (error) {
      console.error("❌ Walrus retrieval failed:", error);
      throw error;
    }
  }

  /**
   * Check storage status of a blob
   * @param {string} blobId - Blob ID to check
   * @returns {Promise<Object>} Blob status information
   */
  async checkBlobStatus(blobId) {
    try {
      console.log(`🔍 Checking status of blob ${blobId}...`);

      const response = await this.makeRequest(`/walrus/status/${blobId}`, {
        method: "GET",
      });

      console.log("✅ Blob status check successful");
      return response.data;
    } catch (error) {
      console.error("❌ Blob status check failed:", error);
      throw error;
    }
  }

  /**
   * Process oracle request for Walrus storage
   * @param {string} requestId - Oracle request ID
   * @param {string} content - Content to store (hex string)
   * @param {number} epochs - Number of epochs
   * @param {boolean} permanent - Whether storage is permanent
   * @returns {Promise<Object>} Oracle processing result
   */
  async processOracleRequest(
    requestId,
    content,
    epochs = 1,
    permanent = false
  ) {
    try {
      console.log(`🔄 Processing oracle request ${requestId}...`);

      const response = await this.makeRequest(
        "/walrus/process-oracle-request",
        {
          method: "POST",
          body: JSON.stringify({
            requestId,
            content,
            epochs,
            permanent,
          }),
        }
      );

      console.log("✅ Oracle request processed successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Oracle request processing failed:", error);
      throw error;
    }
  }

  /**
   * Check Walrus service health
   * @returns {Promise<Object>} Health status of Walrus services
   */
  async checkHealth() {
    try {
      console.log("🏥 Checking Walrus service health...");

      const response = await this.makeRequest("/walrus/health", {
        method: "GET",
      });

      console.log("✅ Health check successful");
      return response.data;
    } catch (error) {
      console.error("❌ Health check failed:", error);
      throw error;
    }
  }

  /**
   * Upload file to Walrus storage (convenience method for file uploads)
   * @param {File} file - File to upload
   * @param {number} epochs - Number of epochs for storage
   * @param {boolean} permanent - Whether storage is permanent
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(file, epochs = 1, permanent = false) {
    try {
      console.log(`📁 Uploading file: ${file.name}`);

      // Convert file to array buffer
      const arrayBuffer = await file.arrayBuffer();
      const content = Array.from(new Uint8Array(arrayBuffer));

      return await this.uploadToWalrus(content, epochs, permanent);
    } catch (error) {
      console.error("❌ File upload failed:", error);
      throw error;
    }
  }

  /**
   * Upload text content to Walrus storage (convenience method for text)
   * @param {string} text - Text content to upload
   * @param {number} epochs - Number of epochs for storage
   * @param {boolean} permanent - Whether storage is permanent
   * @returns {Promise<Object>} Upload result
   */
  async uploadText(text, epochs = 1, permanent = false) {
    try {
      console.log("📝 Uploading text content to Walrus...");
      return await this.uploadToWalrus(text, epochs, permanent);
    } catch (error) {
      console.error("❌ Text upload failed:", error);
      throw error;
    }
  }

  /**
   * Upload JSON data to Walrus storage (convenience method for JSON)
   * @param {Object} data - JSON data to upload
   * @param {number} epochs - Number of epochs for storage
   * @param {boolean} permanent - Whether storage is permanent
   * @returns {Promise<Object>} Upload result
   */
  async uploadJson(data, epochs = 1, permanent = false) {
    try {
      console.log("📋 Uploading JSON data to Walrus...");
      const jsonString = JSON.stringify(data, null, 2);
      return await this.uploadToWalrus(jsonString, epochs, permanent);
    } catch (error) {
      console.error("❌ JSON upload failed:", error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const walrusApi = new WalrusApiService();
export default walrusApi;

// Export the class for custom instances if needed
export { WalrusApiService };
