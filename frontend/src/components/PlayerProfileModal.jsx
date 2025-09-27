import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  useUserRegistry, 
  useCryptoVerseToken, 
  useBadgeManager,
  useLeaderboardManager,
  useCryptoVersePetNFT
} from '../context/ContractContext';
import useWalrusProfile from '../hooks/useWalrusProfile';

const PlayerProfileModal = ({ 
  isOpen, 
  onClose, 
  playerData, // { id, username, address }
  userColor 
}) => {
  const { contract: userRegistry } = useUserRegistry();
  const { contract: cryptoVerseToken } = useCryptoVerseToken();
  const { contract: badgeManager } = useBadgeManager();
  const { contract: leaderboardManager } = useLeaderboardManager();
  const { contract: petNFT } = useCryptoVersePetNFT();

  // Walrus profile hook
  const { 
    getUserProfile: getWalrusProfile, 
    isLoading: walrusLoading,
    error: walrusError 
  } = useWalrusProfile();

  const [profileData, setProfileData] = useState({
    userProfile: null,
    tokenBalance: '0',
    userBadges: [],
    leaderboardRank: null,
    userPets: [],
    walrusProfile: null,
    dataSource: 'loading' // 'walrus', 'contract', 'loading', 'error'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && playerData?.address) {
      loadPlayerProfile();
    }
  }, [isOpen, playerData?.address]);

  const loadPlayerProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Initialize data with loading state
      setProfileData(prev => ({
        ...prev,
        dataSource: 'loading'
      }));
      
      let walrusData = null;
      let contractData = {};
      let dataSource = 'contract'; // default to contract
      
      // Try to load from Walrus first (with 10s timeout)
      try {
        console.log('🦭 Attempting to load profile from Walrus...');
        walrusData = await getWalrusProfile(playerData.address);
        dataSource = 'walrus';
        
        console.log('✅ Loaded profile from Walrus:', walrusData.source);
        
        // If Walrus data is fresh, use it primarily
        if (walrusData && walrusData.source === 'walrus') {
          contractData = {
            userProfile: {
              username: walrusData.username || playerData.username || 'Anonymous',
              email: walrusData.email || '',
              isVerified: walrusData.isVerified || false,
              reputation: walrusData.reputation || 0,
              bio: walrusData.bio || '',
              avatar: walrusData.avatar || '',
              userAddress: playerData.address,
              isActive: true,
              joinedAt: walrusData.joinedAt || 0,
              lastActive: walrusData.lastActive || Date.now()
            }
          };
        }
      } catch (walrusErr) {
        console.warn('⚠️ Walrus profile loading failed, falling back to contracts:', walrusErr.message);
        // Continue with contract loading
      }

      // Load from contracts (either as fallback or primary)
      if (!walrusData || dataSource === 'contract') {
        console.log('📄 Loading profile data from smart contracts...');
        
        // Load User Registry Profile
        if (userRegistry && playerData.address) {
          try {
            const userProfile = await userRegistry.read('getUserProfile', playerData.address);
            contractData.userProfile = {
              userAddress: userProfile.userAddress,
              username: userProfile.username || playerData.username || 'Anonymous',
              email: userProfile.email || '',
              isVerified: userProfile.isVerified,
              isActive: userProfile.isActive,
              reputation: userProfile.reputation ? Number(userProfile.reputation) : 0,
              joinedAt: userProfile.joinedAt ? Number(userProfile.joinedAt) : 0,
              lastActive: userProfile.lastActive ? Number(userProfile.lastActive) : 0
            };
          } catch (error) {
            console.error('Error loading user profile from contract:', error);
            contractData.userProfile = {
              username: playerData.username || 'Anonymous',
              isVerified: false,
              reputation: 0,
              userAddress: playerData.address
            };
          }
        }
      }

      // Load Token Balance (always from contract)
      if (cryptoVerseToken && playerData.address) {
        try {
          const balance = await cryptoVerseToken.read('balanceOf', playerData.address);
          contractData.tokenBalance = ethers.formatEther(balance);
        } catch (error) {
          console.error('Error loading token balance:', error);
          contractData.tokenBalance = '0';
        }
      }

      // Load User Badges (first 5 for quick view)
      if (badgeManager && playerData.address) {
        try {
          const badgeIds = await badgeManager.read('getUserBadges', playerData.address);
          const badges = await Promise.all(
            badgeIds.slice(0, 5).map(async (badgeId) => {
              try {
                const badge = await badgeManager.read('getBadge', badgeId);
                return {
                  id: Number(badgeId),
                  name: badge.name,
                  description: badge.description,
                  category: badge.category,
                  rarity: badge.rarity
                };
              } catch (error) {
                return null;
              }
            })
          );
          contractData.userBadges = badges.filter(badge => badge !== null);
        } catch (error) {
          console.error('Error loading badges:', error);
          contractData.userBadges = [];
        }
      }

      // Load Leaderboard Rank
      if (leaderboardManager && playerData.address) {
        try {
          const rank = await leaderboardManager.read('getUserRank', playerData.address);
          contractData.leaderboardRank = Number(rank);
        } catch (error) {
          console.error('Error loading leaderboard rank:', error);
          contractData.leaderboardRank = null;
        }
      }

      // Load User Pets (first 3 for quick view)
      if (petNFT && playerData.address) {
        try {
          const petIds = await petNFT.read('getPetsByOwner', playerData.address);
          const pets = await Promise.all(
            petIds.slice(0, 3).map(async (petId) => {
              try {
                const pet = await petNFT.read('getPet', petId);
                return {
                  id: Number(petId),
                  name: pet.name,
                  species: pet.species,
                  rarity: pet.rarity,
                  level: Number(pet.level)
                };
              } catch (error) {
                return null;
              }
            })
          );
          contractData.userPets = pets.filter(pet => pet !== null);
        } catch (error) {
          console.error('Error loading pets:', error);
          contractData.userPets = [];
        }
      }

      // Combine Walrus and contract data
      const finalData = {
        ...contractData,
        walrusProfile: walrusData,
        dataSource
      };

      console.log(`✅ Profile loaded via ${dataSource}:`, finalData);
      setProfileData(finalData);
    } catch (error) {
      console.error('Error loading player profile:', error);
      setError('Failed to load player profile');
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case 'common': return '#9CA3AF';
      case 'uncommon': return '#10B981';
      case 'rare': return '#3B82F6';
      case 'epic': return '#8B5CF6';
      case 'legendary': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getReputationLevel = (reputation) => {
    if (reputation >= 1000) return { level: 'Legend', color: '#F59E0B' };
    if (reputation >= 500) return { level: 'Expert', color: '#8B5CF6' };
    if (reputation >= 250) return { level: 'Advanced', color: '#3B82F6' };
    if (reputation >= 100) return { level: 'Intermediate', color: '#10B981' };
    if (reputation >= 25) return { level: 'Beginner', color: '#6B7280' };
    return { level: 'Rookie', color: '#9CA3AF' };
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 border-4 border-gray-600 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
        style={{
          fontFamily: "'Press Start 2P', monospace",
          border: `4px solid ${userColor || '#4CAF50'}`,
          boxShadow: `0 0 20px ${userColor || '#4CAF50'}40`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin text-4xl mb-4">⚡</div>
            <p className="text-white text-xs">Loading profile...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 text-xs mb-4">❌ {error}</p>
            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-xs"
            >
              Close
            </button>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 
                  className="text-xl font-bold mb-2"
                  style={{ color: userColor || '#4CAF50' }}
                >
                  {profileData.userProfile?.username || 'Anonymous'}
                </h2>
                <div className="flex items-center gap-2 mb-2">
                  {profileData.userProfile?.isVerified && (
                    <span className="text-blue-400 text-xs">✓ Verified</span>
                  )}
                  <span 
                    className="text-xs px-2 py-1 rounded"
                    style={{ 
                      backgroundColor: getReputationLevel(profileData.userProfile?.reputation || 0).color + '20',
                      color: getReputationLevel(profileData.userProfile?.reputation || 0).color 
                    }}
                  >
                    {getReputationLevel(profileData.userProfile?.reputation || 0).level}
                  </span>
                  
                  {/* Data Source Indicator */}
                  <span 
                    className="text-xs px-2 py-1 rounded flex items-center gap-1"
                    style={{ 
                      backgroundColor: profileData.dataSource === 'walrus' ? '#8B5CF620' : '#6B728020',
                      color: profileData.dataSource === 'walrus' ? '#8B5CF6' : '#6B7280'
                    }}
                  >
                    {profileData.dataSource === 'walrus' ? '🦭' : '⛓️'}
                    {profileData.dataSource === 'walrus' ? 'Walrus' : 'Chain'}
                  </span>
                </div>
                <p className="text-gray-400 text-xs">
                  Player ID: {playerData.id}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-800 p-3 rounded">
                <p className="text-gray-400 text-xs mb-1">CRV Balance</p>
                <p className="text-green-400 text-sm font-bold">
                  {Number(profileData.tokenBalance).toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-800 p-3 rounded">
                <p className="text-gray-400 text-xs mb-1">Reputation</p>
                <p className="text-yellow-400 text-sm font-bold">
                  {profileData.userProfile?.reputation || 0}
                </p>
              </div>
            </div>

            {/* Badges */}
            {profileData.userBadges && profileData.userBadges.length > 0 && (
              <div className="mb-6">
                <h3 className="text-white text-sm mb-3">🏆 Badges</h3>
                <div className="flex flex-wrap gap-2">
                  {profileData.userBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="bg-gray-800 px-2 py-1 rounded text-xs"
                      style={{
                        border: `1px solid ${getRarityColor(badge.rarity)}`,
                        color: getRarityColor(badge.rarity)
                      }}
                      title={badge.description}
                    >
                      {badge.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pets */}
            {profileData.userPets && profileData.userPets.length > 0 && (
              <div className="mb-6">
                <h3 className="text-white text-sm mb-3">🐾 Pets</h3>
                <div className="space-y-2">
                  {profileData.userPets.map((pet) => (
                    <div key={pet.id} className="bg-gray-800 p-2 rounded flex justify-between items-center">
                      <div>
                        <p className="text-white text-xs font-bold">{pet.name}</p>
                        <p className="text-gray-400 text-xs">{pet.species}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: getRarityColor(pet.rarity) }}>
                          Lv.{pet.level}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leaderboard Rank */}
            {profileData.leaderboardRank && (
              <div className="mb-6">
                <h3 className="text-white text-sm mb-2">📊 Leaderboard</h3>
                <p className="text-yellow-400 text-xs">
                  Rank #{profileData.leaderboardRank}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {/* TODO: Add friend/follow functionality */}}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs"
              >
                👋 Wave
              </button>
              <button
                onClick={() => {/* TODO: Add trade functionality */}}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs"
              >
                🤝 Trade
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerProfileModal;