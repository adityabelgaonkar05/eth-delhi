import { useState, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Custom hook for Walrus-based user profile management
 * Provides decentralized profile storage with smart contract fallback
 */
export const useWalrusProfile = () => {
  const { socket } = useSocket();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  
  // Cache for profile search results
  const searchCacheRef = useRef(new Map());
  const profileCacheRef = useRef(new Map());

  // Update user profile on Walrus
  const updateUserProfile = useCallback(async (userAddress, profileData) => {
    if (!socket || !userAddress || !profileData) {
      throw new Error('Missing required parameters or socket not connected');
    }

    return new Promise((resolve, reject) => {
      setIsLoading(true);
      setError(null);

      const timeout = setTimeout(() => {
        reject(new Error('Profile update timeout'));
        setIsLoading(false);
      }, 15000); // 15s timeout

      const handleProfileUpdated = (data) => {
        clearTimeout(timeout);
        setIsLoading(false);
        
        // Cache the updated profile
        profileCacheRef.current.set(userAddress.toLowerCase(), {
          ...profileData,
          blobId: data.blobId,
          timestamp: Date.now()
        });
        
        setCurrentProfile({
          ...profileData,
          blobId: data.blobId
        });
        
        resolve(data);
        socket.off('profileUpdated', handleProfileUpdated);
        socket.off('profileError', handleProfileError);
      };

      const handleProfileError = (errorData) => {
        clearTimeout(timeout);
        setIsLoading(false);
        setError(errorData.message);
        reject(new Error(errorData.message));
        socket.off('profileUpdated', handleProfileUpdated);
        socket.off('profileError', handleProfileError);
      };

      socket.on('profileUpdated', handleProfileUpdated);
      socket.on('profileError', handleProfileError);

      socket.emit('updateUserProfile', {
        userAddress,
        profileData
      });
    });
  }, [socket]);

  // Get user profile from Walrus
  const getUserProfile = useCallback(async (userAddress, blobId = null, useCache = true) => {
    if (!socket || !userAddress) {
      throw new Error('Missing required parameters or socket not connected');
    }

    // Check cache first if enabled
    if (useCache) {
      const cached = profileCacheRef.current.get(userAddress.toLowerCase());
      if (cached && (Date.now() - cached.timestamp < 300000)) { // 5min cache
        return cached;
      }
    }

    return new Promise((resolve, reject) => {
      setIsLoading(true);
      setError(null);

      const timeout = setTimeout(() => {
        reject(new Error('Profile fetch timeout - using contract fallback'));
        setIsLoading(false);
      }, 12000); // 12s timeout (server has 10s, plus buffer)

      const handleProfileData = (data) => {
        clearTimeout(timeout);
        setIsLoading(false);
        
        const profileData = {
          ...data.profile,
          blobId: data.blobId,
          source: data.source,
          timestamp: Date.now()
        };
        
        // Cache the profile
        profileCacheRef.current.set(userAddress.toLowerCase(), profileData);
        
        setCurrentProfile(profileData);
        resolve(profileData);
        
        socket.off('profileData', handleProfileData);
        socket.off('profileError', handleProfileError);
      };

      const handleProfileError = (errorData) => {
        clearTimeout(timeout);
        setIsLoading(false);
        setError(errorData.message);
        
        if (errorData.useContractFallback) {
          console.log('🔄 Switching to contract fallback for profile');
          // The calling component should handle contract fallback
        }
        
        reject(new Error(errorData.message));
        socket.off('profileData', handleProfileData);
        socket.off('profileError', handleProfileError);
      };

      socket.on('profileData', handleProfileData);
      socket.on('profileError', handleProfileError);

      socket.emit('getUserProfile', {
        userAddress,
        blobId
      });
    });
  }, [socket]);

  // Search players by username
  const searchPlayers = useCallback(async (searchTerm, useContractFallback = true) => {
    if (!socket || !searchTerm || searchTerm.trim().length < 2) {
      throw new Error('Invalid search term or socket not connected');
    }

    const cacheKey = searchTerm.trim().toLowerCase();
    
    // Check cache first
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 60000)) { // 1min cache for searches
      return cached.results;
    }

    return new Promise((resolve, reject) => {
      setIsLoading(true);
      setError(null);

      const timeout = setTimeout(() => {
        reject(new Error('Search timeout'));
        setIsLoading(false);
      }, 10000); // 10s timeout

      const handleSearchResults = (data) => {
        clearTimeout(timeout);
        setIsLoading(false);
        
        // Cache search results
        searchCacheRef.current.set(cacheKey, {
          results: data.results,
          searchMethod: data.searchMethod,
          timestamp: Date.now()
        });
        
        resolve({
          results: data.results,
          method: data.searchMethod,
          term: data.searchTerm
        });
        
        socket.off('searchResults', handleSearchResults);
        socket.off('searchError', handleSearchError);
      };

      const handleSearchError = (errorData) => {
        clearTimeout(timeout);
        setIsLoading(false);
        setError(errorData.message);
        reject(new Error(errorData.message));
        socket.off('searchResults', handleSearchResults);
        socket.off('searchError', handleSearchError);
      };

      socket.on('searchResults', handleSearchResults);
      socket.on('searchError', handleSearchError);

      socket.emit('searchPlayers', {
        searchTerm: searchTerm.trim(),
        useContractFallback
      });
    });
  }, [socket]);

  // Clear caches
  const clearCache = useCallback(() => {
    searchCacheRef.current.clear();
    profileCacheRef.current.clear();
    setCurrentProfile(null);
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    currentProfile,
    
    // Actions
    updateUserProfile,
    getUserProfile,
    searchPlayers,
    clearCache,
    
    // Utilities
    isProfileCached: (userAddress) => {
      const cached = profileCacheRef.current.get(userAddress.toLowerCase());
      return cached && (Date.now() - cached.timestamp < 300000);
    },
    
    getCachedProfile: (userAddress) => {
      return profileCacheRef.current.get(userAddress.toLowerCase());
    }
  };
};

export default useWalrusProfile;