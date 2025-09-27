import React, { useState } from 'react';
import TokenLeaderboard from './TokenLeaderboard';
import ReputationLeaderboard from './ReputationLeaderboard';

const LeaderboardsPage = () => {
  const [activeTab, setActiveTab] = useState('tokens');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🏆 CryptoVerse Leaderboards
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Compete with other players and climb the rankings in different categories
          </p>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-6">
            <div className="bg-white rounded-lg p-1 shadow-md">
              <button
                onClick={() => setActiveTab('tokens')}
                className={`px-6 py-3 rounded-md font-semibold transition-colors ${
                  activeTab === 'tokens'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                💰 Token Balance
              </button>
              <button
                onClick={() => setActiveTab('reputation')}
                className={`px-6 py-3 rounded-md font-semibold transition-colors ${
                  activeTab === 'reputation'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                🏆 Reputation
              </button>
            </div>
          </div>
        </div>

        {/* Leaderboard Content */}
        <div className="relative">
          {activeTab === 'tokens' && <TokenLeaderboard />}
          {activeTab === 'reputation' && <ReputationLeaderboard />}
        </div>

        {/* Additional Info */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">How Rankings Work</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-blue-600 mb-2">💰 Token Balance Leaderboard</h4>
              <ul className="text-gray-600 space-y-1 text-sm">
                <li>• Ranked by total CVRS token holdings</li>
                <li>• Updated automatically when balances change</li>
                <li>• Earn CVRS through platform activities</li>
                <li>• Purchase pets and participate in events</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-purple-600 mb-2">🏆 Reputation Leaderboard</h4>
              <ul className="text-gray-600 space-y-1 text-sm">
                <li>• Ranked by activity and community engagement</li>
                <li>• Earn points through various platform activities</li>
                <li>• Complete quizzes, attend events, and engage</li>
                <li>• Build your reputation to unlock benefits</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Navigation Helper */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 mb-4">Want to improve your rankings?</p>
          <div className="flex justify-center gap-4 flex-wrap">
            <button
              onClick={() => window.location.href = '/game'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              🎮 Play Games
            </button>
            <button
              onClick={() => window.location.href = '/pets'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🐾 Adopt Pets
            </button>
            <button
              onClick={() => window.location.href = '/library'}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              📚 Visit Library
            </button>
            <button
              onClick={() => window.location.href = '/townhall'}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              🏛️ Town Hall
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardsPage;