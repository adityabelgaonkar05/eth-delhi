import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useContracts } from '../context/ContractContext';
import { useWallet } from '../context/WalletContext';

const ReputationLeaderboard = () => {
  const { account } = useWallet();
  const { contracts } = useContracts();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRanking, setUserRanking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (contracts?.LeaderboardManager && contracts?.UserRegistry) {
      loadLeaderboardData();
      if (account) {
        loadUserRanking();
      }
    }
  }, [contracts, account]);

  const loadLeaderboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const leaderboardManager = contracts.LeaderboardManager.contract;
      const userRegistry = contracts.UserRegistry.contract;

      // Get top 10 entries from the "most_active" leaderboard (which represents reputation/activity)
      const topEntries = await leaderboardManager.getTopEntries("most_active", 10);
      
      // Get leaderboard stats
      const [size, maxEntries, lastUpdate, averageScore] = await leaderboardManager.getLeaderboardStats("most_active");
      
      setStats({
        totalPlayers: size.toString(),
        maxEntries: maxEntries.toString(),
        lastUpdate: new Date(Number(lastUpdate) * 1000).toLocaleDateString(),
        averageReputation: Number(averageScore).toString()
      });

      // Format the leaderboard data with user profiles
      const formattedData = await Promise.all(
        topEntries.map(async (entry, index) => {
          try {
            // Get user profile from UserRegistry
            const userProfile = await userRegistry.getUserProfile(entry.user);
            
            return {
              rank: index + 1,
              address: entry.user,
              score: Number(entry.score),
              lastUpdated: new Date(Number(entry.lastUpdated) * 1000).toLocaleDateString(),
              // User profile data
              username: userProfile.username || 'Anonymous',
              isVerified: userProfile.isVerified,
              isActive: userProfile.isActive,
              reputation: userProfile.reputation ? Number(userProfile.reputation) : Number(entry.score),
              // Truncate address for display
              displayAddress: `${entry.user.slice(0, 6)}...${entry.user.slice(-4)}`
            };
          } catch (error) {
            console.error('Error processing entry:', error);
            return {
              rank: index + 1,
              address: entry.user,
              score: Number(entry.score),
              lastUpdated: new Date(Number(entry.lastUpdated) * 1000).toLocaleDateString(),
              username: 'Anonymous',
              isVerified: false,
              isActive: false,
              reputation: Number(entry.score),
              displayAddress: `${entry.user.slice(0, 6)}...${entry.user.slice(-4)}`
            };
          }
        })
      );

      setLeaderboardData(formattedData);
    } catch (error) {
      console.error('Error loading reputation leaderboard data:', error);
      setError(`Failed to load leaderboard: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRanking = async () => {
    try {
      const leaderboardManager = contracts.LeaderboardManager.contract;
      const [position, score, rank] = await leaderboardManager.getUserRanking("most_active", account);
      
      if (Number(position) > 0) {
        setUserRanking({
          position: position.toString(),
          score: Number(score).toString(),
          rank: rank.toString()
        });
      } else {
        setUserRanking(null);
      }
    } catch (error) {
      console.error('Error loading user reputation ranking:', error);
      setUserRanking(null);
    }
  };

  const refreshLeaderboard = () => {
    loadLeaderboardData();
    if (account) {
      loadUserRanking();
    }
  };

  const getReputationBadge = (reputation) => {
    if (reputation >= 1000) return { emoji: '👑', label: 'Legend', color: 'text-yellow-500' };
    if (reputation >= 500) return { emoji: '⭐', label: 'Master', color: 'text-purple-500' };
    if (reputation >= 250) return { emoji: '🔥', label: 'Expert', color: 'text-red-500' };
    if (reputation >= 100) return { emoji: '💎', label: 'Pro', color: 'text-blue-500' };
    if (reputation >= 50) return { emoji: '🌟', label: 'Rising', color: 'text-green-500' };
    return { emoji: '🌱', label: 'Rookie', color: 'text-gray-500' };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🏆 Reputation Leaderboard</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🏆 Reputation Leaderboard</h2>
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={refreshLeaderboard}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🏆 Reputation Leaderboard</h2>
          <p className="text-gray-600">Top players by platform activity and reputation</p>
        </div>
        <button
          onClick={refreshLeaderboard}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalPlayers}</div>
            <div className="text-sm text-gray-600">Active Players</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.averageReputation}</div>
            <div className="text-sm text-gray-600">Avg Reputation</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.maxEntries}</div>
            <div className="text-sm text-gray-600">Max Entries</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-sm font-bold text-gray-700">{stats.lastUpdate}</div>
            <div className="text-sm text-gray-600">Last Update</div>
          </div>
        </div>
      )}

      {/* User Ranking */}
      {account && userRanking && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-purple-900">Your Ranking</h3>
              <p className="text-purple-700">Position #{userRanking.position} with {userRanking.score} reputation points</p>
            </div>
            <div className="text-2xl font-bold text-purple-600">#{userRanking.rank}</div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Rank</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Player</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Reputation</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Status</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.length > 0 ? (
              leaderboardData.map((entry) => {
                const badge = getReputationBadge(entry.reputation);
                return (
                  <tr key={entry.address} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-2">
                      <div className="flex items-center">
                        {entry.rank <= 3 && (
                          <span className="mr-2">
                            {entry.rank === 1 && '🥇'}
                            {entry.rank === 2 && '🥈'}
                            {entry.rank === 3 && '🥉'}
                          </span>
                        )}
                        <span className="font-semibold">#{entry.rank}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white text-sm font-bold">
                            {entry.username.charAt(0).toUpperCase() || entry.address.slice(2, 4).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {entry.username !== 'Anonymous' ? entry.username : entry.displayAddress}
                            </span>
                            {entry.isVerified && (
                              <span className="text-blue-500" title="Verified User">
                                ✓
                              </span>
                            )}
                          </div>
                          {account && entry.address.toLowerCase() === account.toLowerCase() && (
                            <div className="text-sm text-purple-600">You</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xl ${badge.color}`}>{badge.emoji}</span>
                        <div>
                          <div className="font-bold text-gray-900">{entry.reputation}</div>
                          <div className={`text-xs ${badge.color}`}>{badge.label}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${entry.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <span className={`text-sm ${entry.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                          {entry.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-gray-500 text-sm">
                      {entry.lastUpdated}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No reputation data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-700 mb-3">Reputation Levels</h4>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <span>🌱</span>
            <span className="text-gray-500">Rookie (0-49)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🌟</span>
            <span className="text-green-500">Rising (50-99)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>💎</span>
            <span className="text-blue-500">Pro (100-249)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🔥</span>
            <span className="text-red-500">Expert (250-499)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>⭐</span>
            <span className="text-purple-500">Master (500-999)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>👑</span>
            <span className="text-yellow-500">Legend (1000+)</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>Rankings are based on platform activity, engagement, and community contributions</p>
      </div>
    </div>
  );
};

export default ReputationLeaderboard;