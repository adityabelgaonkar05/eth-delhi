import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { 
  useUserRegistry, 
  useCryptoVerseToken, 
  useBadgeManager,
  useLeaderboardManager,
  useReputationOracle,
  useCryptoVersePetNFT
} from '../context/ContractContext';

const UserProfile = ({ userAddress = null }) => {
  const { account, isConnected } = useWallet();
  const { contract: userRegistry } = useUserRegistry();
  const { contract: cryptoVerseToken } = useCryptoVerseToken();
  const { contract: badgeManager } = useBadgeManager();
  const { contract: leaderboardManager } = useLeaderboardManager();
  const { contract: reputationOracle } = useReputationOracle();
  const { contract: petNFT } = useCryptoVersePetNFT();

  // Use provided address or connected account
  const profileAddress = userAddress || account;

  const [profileData, setProfileData] = useState({
    userProfile: null,
    tokenBalance: '0',
    userBadges: [],
    leaderboardRankings: {},
    userPets: [],
    activityStats: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profileAddress && userRegistry && cryptoVerseToken) {
      loadUserProfile();
    }
  }, [profileAddress, userRegistry, cryptoVerseToken]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = {};

      // 1. Load User Registry Profile
      if (userRegistry) {
        try {
          const userProfile = await userRegistry.read('getUserProfile', profileAddress);
          data.userProfile = {
            userAddress: userProfile.userAddress,
            username: userProfile.username || 'Anonymous',
            email: userProfile.email || '',
            isVerified: userProfile.isVerified,
            isActive: userProfile.isActive,
            reputation: userProfile.reputation ? Number(userProfile.reputation) : 0,
            joinedAt: userProfile.joinedAt ? Number(userProfile.joinedAt) : 0,
            lastActive: userProfile.lastActive ? Number(userProfile.lastActive) : 0
          };
        } catch (error) {
          console.error('Error loading user profile:', error);
          data.userProfile = null;
        }
      }

      // 2. Load Token Balance
      if (cryptoVerseToken) {
        try {
          const balance = await cryptoVerseToken.read('balanceOf', profileAddress);
          data.tokenBalance = ethers.formatEther(balance);
        } catch (error) {
          console.error('Error loading token balance:', error);
          data.tokenBalance = '0';
        }
      }

      // 3. Load User Badges
      if (badgeManager) {
        try {
          const badgeIds = await badgeManager.read('getUserBadges', profileAddress);
          const badges = await Promise.all(
            badgeIds.map(async (badgeId) => {
              try {
                const badge = await badgeManager.read('getBadge', badgeId);
                return {
                  id: Number(badgeId),
                  name: badge.name,
                  description: badge.description,
                  category: badge.category,
                  rarity: badge.rarity,
                  isActive: badge.isActive
                };
              } catch (error) {
                console.error('Error loading badge:', error);
                return null;
              }
            })
          );
          data.userBadges = badges.filter(badge => badge !== null);
        } catch (error) {
          console.error('Error loading user badges:', error);
          data.userBadges = [];
        }
      }

      // 4. Load Leaderboard Rankings
      if (leaderboardManager) {
        try {
          const leaderboards = ['richest', 'most_active', 'most_events', 'quiz_master', 'badge_collector'];
          const rankings = {};
          
          for (const leaderboardType of leaderboards) {
            try {
              const [position, score, rank] = await leaderboardManager.read('getUserRanking', leaderboardType, profileAddress);
              if (Number(position) > 0) {
                rankings[leaderboardType] = {
                  position: Number(position),
                  score: Number(score),
                  rank: Number(rank)
                };
              }
            } catch (error) {
              console.error(`Error loading ${leaderboardType} ranking:`, error);
            }
          }
          data.leaderboardRankings = rankings;
        } catch (error) {
          console.error('Error loading leaderboard rankings:', error);
          data.leaderboardRankings = {};
        }
      }

      // 5. Load User's Pets
      if (petNFT) {
        try {
          const userTokens = await petNFT.read('getUserPets', profileAddress);
          const pets = await Promise.all(
            userTokens.map(async (tokenId) => {
              try {
                const pet = await petNFT.read('getPetDetails', tokenId);
                return {
                  tokenId: Number(tokenId),
                  name: pet.name,
                  tier: Number(pet.tier),
                  price: ethers.formatEther(pet.price),
                  isForSale: pet.isForSale
                };
              } catch (error) {
                console.error('Error loading pet:', error);
                return null;
              }
            })
          );
          data.userPets = pets.filter(pet => pet !== null);
        } catch (error) {
          console.error('Error loading user pets:', error);
          data.userPets = [];
        }
      }

      // 6. Calculate Activity Stats
      data.activityStats = {
        totalBadges: data.userBadges.length,
        totalPets: data.userPets.length,
        leaderboardPositions: Object.keys(data.leaderboardRankings).length,
        accountAge: data.userProfile?.joinedAt ? 
          Math.floor((Date.now() / 1000 - data.userProfile.joinedAt) / (24 * 60 * 60)) : 0
      };

      setProfileData(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError(`Failed to load profile: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getReputationLevel = (reputation) => {
    if (reputation >= 1000) return { level: 'Legend', emoji: '👑', color: 'text-yellow-500' };
    if (reputation >= 500) return { level: 'Master', emoji: '⭐', color: 'text-purple-500' };
    if (reputation >= 250) return { level: 'Expert', emoji: '🔥', color: 'text-red-500' };
    if (reputation >= 100) return { level: 'Pro', emoji: '💎', color: 'text-blue-500' };
    if (reputation >= 50) return { level: 'Rising', emoji: '🌟', color: 'text-green-500' };
    return { level: 'Rookie', emoji: '🌱', color: 'text-gray-500' };
  };

  const getTierColor = (tier) => {
    const colors = {
      0: 'text-gray-600',
      1: 'text-blue-600',
      2: 'text-purple-600',
      3: 'text-yellow-600'
    };
    return colors[tier] || 'text-gray-600';
  };

  const getTierName = (tier) => {
    const names = { 0: 'Common', 1: 'Rare', 2: 'Epic', 3: 'Legendary' };
    return names[tier] || 'Unknown';
  };

  if (!profileAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">👤 User Profile</h2>
          <p className="text-gray-600 mb-4">Please connect your wallet to view your profile</p>
          <div className="text-6xl mb-4">🔗</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={loadUserProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const reputationLevel = getReputationLevel(profileData.userProfile?.reputation || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-bold">
                  {profileData.userProfile?.username?.charAt(0)?.toUpperCase() || 
                   profileAddress.slice(2, 4).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {profileData.userProfile?.username || 'Anonymous User'}
                </h1>
                <p className="text-gray-600">{formatAddress(profileAddress)}</p>
                <div className="flex items-center gap-4 mt-2">
                  {profileData.userProfile?.isVerified && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                      ✓ Verified
                    </span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    profileData.userProfile?.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {profileData.userProfile?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-3xl ${reputationLevel.color}`}>{reputationLevel.emoji}</span>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {profileData.userProfile?.reputation || 0}
                  </div>
                  <div className={`text-sm ${reputationLevel.color}`}>{reputationLevel.level}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-600">{parseFloat(profileData.tokenBalance).toFixed(2)}</div>
            <div className="text-gray-600">CVRS Balance</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{profileData.activityStats.totalBadges}</div>
            <div className="text-gray-600">Badges Earned</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-600">{profileData.activityStats.totalPets}</div>
            <div className="text-gray-600">Pets Owned</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-orange-600">{profileData.activityStats.accountAge}</div>
            <div className="text-gray-600">Days Active</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leaderboard Rankings */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🏆 Leaderboard Rankings</h2>
            {Object.keys(profileData.leaderboardRankings).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(profileData.leaderboardRankings).map(([type, ranking]) => (
                  <div key={type} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900 capitalize">
                        {type.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-600">Score: {ranking.score}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600">#{ranking.rank}</div>
                      <div className="text-sm text-gray-600">Position {ranking.position}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No leaderboard rankings yet</p>
            )}
          </div>

          {/* Badges */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🏅 Badges Earned</h2>
            {profileData.userBadges.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {profileData.userBadges.map((badge) => (
                  <div key={badge.id} className="p-3 bg-gray-50 rounded-lg text-center">
                    <div className="text-2xl mb-1">🏅</div>
                    <div className="font-medium text-gray-900 text-sm">{badge.name}</div>
                    <div className="text-xs text-gray-600">{badge.category}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No badges earned yet</p>
            )}
          </div>
        </div>

        {/* Pets Collection */}
        {profileData.userPets.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🐾 Pet Collection</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {profileData.userPets.map((pet) => (
                <div key={pet.tokenId} className="p-4 bg-gray-50 rounded-lg text-center">
                  <div className="text-3xl mb-2">🐾</div>
                  <div className="font-medium text-gray-900">{pet.name}</div>
                  <div className={`text-sm ${getTierColor(pet.tier)}`}>
                    {getTierName(pet.tier)}
                  </div>
                  <div className="text-xs text-gray-600">#{pet.tokenId}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Account Details</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-500">Address:</span> {formatAddress(profileAddress)}</div>
                <div><span className="text-gray-500">Joined:</span> {formatDate(profileData.userProfile?.joinedAt)}</div>
                <div><span className="text-gray-500">Last Active:</span> {formatDate(profileData.userProfile?.lastActive)}</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Activity Summary</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-500">Reputation:</span> {profileData.userProfile?.reputation || 0} points</div>
                <div><span className="text-gray-500">Leaderboard Positions:</span> {profileData.activityStats.leaderboardPositions}</div>
                <div><span className="text-gray-500">Total Assets:</span> {profileData.activityStats.totalPets} pets, {profileData.activityStats.totalBadges} badges</div>
              </div>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="text-center mt-6">
          <button
            onClick={loadUserProfile}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;