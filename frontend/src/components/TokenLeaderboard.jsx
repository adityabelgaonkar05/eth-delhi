import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useContracts } from '../context/ContractContext';
import { useWallet } from '../context/WalletContext';

const TokenLeaderboard = () => {
  const { account } = useWallet();
  const { contracts } = useContracts();
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRanking, setUserRanking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (contracts?.LeaderboardManager && contracts?.CryptoVerseToken) {
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
      const cvrsToken = contracts.CryptoVerseToken.contract;

      // Get top 10 entries from the "richest" leaderboard
      const topEntries = await leaderboardManager.getTopEntries("richest", 10);
      
      // Get leaderboard stats
      const [size, maxEntries, lastUpdate, averageScore] = await leaderboardManager.getLeaderboardStats("richest");
      
      setStats({
        totalPlayers: size.toString(),
        maxEntries: maxEntries.toString(),
        lastUpdate: new Date(Number(lastUpdate) * 1000).toLocaleDateString(),
        averageBalance: ethers.formatEther(averageScore)
      });

      // Format the leaderboard data
      const formattedData = await Promise.all(
        topEntries.map(async (entry, index) => {
          try {
            // Get actual current balance from token contract
            const currentBalance = await cvrsToken.balanceOf(entry.user);
            
            return {
              rank: index + 1,
              address: entry.user,
              score: ethers.formatEther(entry.score),
              currentBalance: ethers.formatEther(currentBalance),
              lastUpdated: new Date(Number(entry.lastUpdated) * 1000).toLocaleDateString(),
              // Truncate address for display
              displayAddress: `${entry.user.slice(0, 6)}...${entry.user.slice(-4)}`
            };
          } catch (error) {
            console.error('Error processing entry:', error);
            return {
              rank: index + 1,
              address: entry.user,
              score: ethers.formatEther(entry.score),
              currentBalance: '0',
              lastUpdated: 'Unknown',
              displayAddress: `${entry.user.slice(0, 6)}...${entry.user.slice(-4)}`
            };
          }
        })
      );

      setLeaderboardData(formattedData);
    } catch (error) {
      console.error('Error loading leaderboard data:', error);
      setError(`Failed to load leaderboard: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRanking = async () => {
    try {
      const leaderboardManager = contracts.LeaderboardManager.contract;
      const [position, score, rank] = await leaderboardManager.getUserRanking("richest", account);
      
      if (Number(position) > 0) {
        setUserRanking({
          position: position.toString(),
          score: ethers.formatEther(score),
          rank: rank.toString()
        });
      } else {
        setUserRanking(null);
      }
    } catch (error) {
      console.error('Error loading user ranking:', error);
      setUserRanking(null);
    }
  };

  const refreshLeaderboard = () => {
    loadLeaderboardData();
    if (account) {
      loadUserRanking();
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Token Balance Leaderboard</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Token Balance Leaderboard</h2>
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={refreshLeaderboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
          <h2 className="text-2xl font-bold text-gray-900">💰 Token Balance Leaderboard</h2>
          <p className="text-gray-600">Top CVRS token holders in CryptoVerse</p>
        </div>
        <button
          onClick={refreshLeaderboard}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
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
            <div className="text-2xl font-bold text-blue-600">{stats.totalPlayers}</div>
            <div className="text-sm text-gray-600">Total Players</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{parseFloat(stats.averageBalance).toFixed(2)}</div>
            <div className="text-sm text-gray-600">Avg Balance</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.maxEntries}</div>
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Your Ranking</h3>
              <p className="text-blue-700">Position #{userRanking.position} with {parseFloat(userRanking.score).toFixed(2)} CVRS</p>
            </div>
            <div className="text-2xl font-bold text-blue-600">#{userRanking.rank}</div>
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
              <th className="text-left py-3 px-2 font-semibold text-gray-700">CVRS Balance</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Current Balance</th>
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.length > 0 ? (
              leaderboardData.map((entry) => (
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
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm font-bold">
                          {entry.address.slice(2, 4).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{entry.displayAddress}</div>
                        {account && entry.address.toLowerCase() === account.toLowerCase() && (
                          <div className="text-sm text-blue-600">You</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <span className="font-bold text-green-600">
                      {parseFloat(entry.score).toFixed(2)} CVRS
                    </span>
                  </td>
                  <td className="py-4 px-2">
                    <span className="text-gray-700">
                      {parseFloat(entry.currentBalance).toFixed(2)} CVRS
                    </span>
                  </td>
                  <td className="py-4 px-2 text-gray-500 text-sm">
                    {entry.lastUpdated}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500">
                  No leaderboard data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Rankings are updated automatically based on CVRS token holdings</p>
      </div>
    </div>
  );
};

export default TokenLeaderboard;