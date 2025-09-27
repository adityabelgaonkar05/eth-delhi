const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class WalrusUserService {
  constructor() {
    this.publisherUrl = process.env.WALRUS_PUBLISHER_URL || 'https://publisher-devnet.walrus.space/v1/store';
    this.aggregatorUrl = process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator-devnet.walrus.space/v1/';
    this.privateKey = process.env.SUI_TESTNET_PRIVATE_KEY;
    this.walrusPath = null; // Will be detected dynamically
    this.gasBudget = process.env.WALRUS_GAS_BUDGET || '1000000000';
    
    // User profile cache to avoid repeated Walrus calls
    this.profileCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Initialize Walrus path detection
    this.initializeWalrusPath();
  }

  /**
   * Detect the Walrus CLI binary path
   */
  async initializeWalrusPath() {
    const possiblePaths = [
      process.env.WALRUS_BINARY_PATH,
      '/opt/homebrew/bin/walrus',
      '/usr/local/bin/walrus',
      '/Users/shaurya/.local/bin/walrus',
      'walrus' // Try PATH
    ].filter(Boolean);

    for (const path of possiblePaths) {
      try {
        const { stdout } = await execAsync(`${path} --version`);
        if (stdout.includes('walrus')) {
          this.walrusPath = path;
          console.log(`🦭 Found Walrus CLI at: ${path}`);
          return;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    // Fallback: try which command
    try {
      const { stdout } = await execAsync('which walrus');
      const detectedPath = stdout.trim();
      if (detectedPath) {
        this.walrusPath = detectedPath;
        console.log(`🦭 Found Walrus CLI via 'which': ${detectedPath}`);
        return;
      }
    } catch (error) {
      // Continue
    }

    console.warn('⚠️ Walrus CLI not found. Please install Walrus CLI or set WALRUS_BINARY_PATH environment variable.');
  }

  /**
   * Store user profile data on Walrus
   * @param {string} userAddress - Ethereum address of the user
   * @param {object} profileData - User profile data
   * @returns {Promise<string>} - Walrus blob ID
   */
  async storeUserProfile(userAddress, profileData) {
    try {
      console.log(`🦭 Storing user profile for ${userAddress} on Walrus...`);
      
      // Create enhanced profile data with metadata
      const walrusProfile = {
        userAddress: userAddress.toLowerCase(),
        ...profileData,
        lastUpdated: new Date().toISOString(),
        version: '1.0',
        dataType: 'cryptoverse_user_profile'
      };

      // Create temporary file for Walrus upload
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      const tempFile = path.join(tempDir, `user_${userAddress.slice(2, 8)}_${Date.now()}.json`);
      await fs.writeFile(tempFile, JSON.stringify(walrusProfile, null, 2));

      console.log(`📝 Created temp profile file: ${tempFile}`);

      // Upload to Walrus using binary
      const blobId = await this.uploadFileToWalrus(tempFile);
      
      // Clean up temp file
      await fs.unlink(tempFile);
      
      // Cache the profile
      this.profileCache.set(userAddress.toLowerCase(), {
        data: walrusProfile,
        blobId,
        timestamp: Date.now()
      });

      console.log(`✅ User profile stored on Walrus with blob ID: ${blobId}`);
      return blobId;
      
    } catch (error) {
      console.error(`❌ Error storing user profile on Walrus:`, error);
      throw new Error(`Failed to store user profile: ${error.message}`);
    }
  }

  /**
   * Retrieve user profile from Walrus
   * @param {string} blobId - Walrus blob ID
   * @param {number} timeout - Timeout in milliseconds (default: 10s)
   * @returns {Promise<object>} - User profile data
   */
  async getUserProfile(blobId, timeout = 10000) {
    try {
      console.log(`🦭 Retrieving user profile from Walrus blob: ${blobId}`);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Walrus fetch timeout')), timeout);
      });

      const fetchPromise = this.fetchFromWalrus(blobId);
      
      const profileData = await Promise.race([fetchPromise, timeoutPromise]);
      
      console.log(`✅ User profile retrieved from Walrus`);
      return profileData;
      
    } catch (error) {
      console.error(`❌ Error retrieving user profile from Walrus:`, error);
      throw error;
    }
  }

  /**
   * Search users by username (requires indexing)
   * @param {string} searchTerm - Username to search for
   * @returns {Promise<Array>} - Array of matching user profiles
   */
  async searchUsersByUsername(searchTerm) {
    try {
      console.log(`🔍 Searching users by username: ${searchTerm}`);
      
      // For now, search through cached profiles
      // In production, you'd want a proper indexing system
      const matches = [];
      
      for (const [address, cached] of this.profileCache.entries()) {
        if (this.isCacheValid(cached)) {
          const profile = cached.data;
          if (profile.username && 
              profile.username.toLowerCase().includes(searchTerm.toLowerCase())) {
            matches.push({
              ...profile,
              walrusBlobId: cached.blobId
            });
          }
        }
      }
      
      console.log(`🔍 Found ${matches.length} matching users`);
      return matches;
      
    } catch (error) {
      console.error(`❌ Error searching users:`, error);
      return [];
    }
  }

  /**
   * Upload file to Walrus storage
   * @param {string} filePath - Path to file to upload
   * @returns {Promise<string>} - Blob ID
   */
  async uploadFileToWalrus(filePath) {
    // Wait for Walrus path detection if not ready
    if (!this.walrusPath) {
      console.log('⏳ Waiting for Walrus CLI path detection...');
      await this.initializeWalrusPath();
    }

    if (!this.walrusPath) {
      throw new Error('Walrus CLI not found. Please install Walrus CLI or set WALRUS_BINARY_PATH environment variable.');
    }

    return new Promise((resolve, reject) => {
      // Store for 1 epoch (approximately 24 hours) for testing purposes
      const command = `${this.walrusPath} store --epochs 1 "${filePath}"`;
      
      console.log(`🚀 Executing Walrus upload: ${command}`);
      
      exec(command, { 
        cwd: path.join(process.cwd(), '../hardhat'),
        timeout: 60000  // Increased timeout for blockchain operations
      }, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Walrus upload error:`, error);
          reject(new Error(`Walrus upload failed: ${error.message}`));
          return;
        }

        console.log(`📤 Walrus output: ${stdout}`);
        if (stderr) console.log(`📤 Walrus stderr: ${stderr}`);

        // Parse blob ID from output - Updated to match actual Walrus CLI output format
        const blobIdMatch = stdout.match(/Successfully.*?([A-Za-z0-9_-]{43,44})/);
        if (blobIdMatch) {
          const blobId = blobIdMatch[1];
          console.log(`✅ Walrus upload successful, blob ID: ${blobId}`);
          resolve(blobId);
        } else {
          // Try alternative parsing patterns
          const altMatch = stdout.match(/([A-Za-z0-9_-]{43,44})/);
          if (altMatch) {
            const blobId = altMatch[1];
            console.log(`✅ Walrus upload successful, blob ID: ${blobId}`);
            resolve(blobId);
          } else {
            console.error(`❌ Could not parse blob ID from output: ${stdout}`);
            reject(new Error('Could not extract blob ID from Walrus response'));
          }
        }
      });
    });
  }

  /**
   * Fetch data from Walrus
   * @param {string} blobId - Blob ID to fetch
   * @returns {Promise<object>} - Parsed JSON data
   */
  async fetchFromWalrus(blobId) {
    try {
      const url = `${this.aggregatorUrl}${blobId}`;
      console.log(`🌐 Fetching from Walrus: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 30000,  // Increased timeout for decentralized network propagation
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Walrus fetch error:`, error.message);
      throw error;
    }
  }

  /**
   * Check if cached data is still valid
   * @param {object} cached - Cached data object
   * @returns {boolean} - Whether cache is valid
   */
  isCacheValid(cached) {
    return cached && (Date.now() - cached.timestamp) < this.cacheTimeout;
  }

  /**
   * Get cached profile if available and valid
   * @param {string} userAddress - User address
   * @returns {object|null} - Cached profile or null
   */
  getCachedProfile(userAddress) {
    const cached = this.profileCache.get(userAddress.toLowerCase());
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }
    return null;
  }

  /**
   * Update user profile on Walrus
   * @param {string} userAddress - User address
   * @param {string} currentBlobId - Current blob ID (if exists)
   * @param {object} newProfileData - New profile data
   * @returns {Promise<string>} - New blob ID
   */
  async updateUserProfile(userAddress, currentBlobId, newProfileData) {
    try {
      console.log(`🔄 Updating user profile for ${userAddress}`);
      
      let existingData = {};
      
      // Try to get existing data first
      if (currentBlobId) {
        try {
          existingData = await this.getUserProfile(currentBlobId, 5000);
        } catch (error) {
          console.warn(`⚠️ Could not retrieve existing profile: ${error.message}`);
        }
      }
      
      // Merge existing data with new data
      const updatedProfile = {
        ...existingData,
        ...newProfileData,
        userAddress: userAddress.toLowerCase(),
        lastUpdated: new Date().toISOString()
      };
      
      // Store updated profile
      return await this.storeUserProfile(userAddress, updatedProfile);
      
    } catch (error) {
      console.error(`❌ Error updating user profile:`, error);
      throw error;
    }
  }

  /**
   * Get user address from wallet/socket mapping
   * @param {string} socketId - Socket ID
   * @param {Map} playersByRoom - Players by room mapping
   * @returns {string|null} - User address or null
   */
  getUserAddressFromSocket(socketId, playersByRoom) {
    for (const [room, players] of playersByRoom.entries()) {
      const player = players.get(socketId);
      if (player && player.walletAddress) {
        return player.walletAddress;
      }
    }
    return null;
  }
}

module.exports = WalrusUserService;