import React, { useState } from 'react';
import UserProfile from './UserProfile';

const ProfileSearch = () => {
  const [searchAddress, setSearchAddress] = useState('');
  const [viewingAddress, setViewingAddress] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = () => {
    if (!searchAddress.trim()) {
      setError('Please enter a valid address');
      return;
    }

    // Basic address validation
    if (!searchAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Please enter a valid Ethereum address');
      return;
    }

    setError('');
    setViewingAddress(searchAddress.trim());
  };

  const handleReset = () => {
    setSearchAddress('');
    setViewingAddress(null);
    setError('');
  };

  if (viewingAddress) {
    return (
      <div>
        {/* Search Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Search
              </button>
              <div>
                <div className="text-sm text-gray-500">Viewing Profile:</div>
                <div className="font-mono text-sm text-gray-700">
                  {viewingAddress.slice(0, 10)}...{viewingAddress.slice(-8)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Component */}
        <UserProfile userAddress={viewingAddress} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Search Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔍 Profile Search
          </h1>
          <p className="text-lg text-gray-600">
            Search for any user's profile by their wallet address
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Wallet Address
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                id="address"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="0x..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          {/* Tips */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Tips:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Enter a valid Ethereum address (starts with 0x)</li>
              <li>• Make sure the address is 42 characters long</li>
              <li>• You can view any registered user's public profile</li>
              <li>• Use your browser's back button to return to search</li>
            </ul>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-4">Or view your own profile:</p>
            <button
              onClick={() => window.location.href = '/profile'}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              👤 My Profile
            </button>
          </div>
        </div>

        {/* Sample Addresses (for testing) */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">🧪 Test with Sample Addresses</h3>
          <p className="text-sm text-gray-600 mb-4">
            Click any address below to quickly test the profile viewer:
          </p>
          <div className="space-y-2">
            {[
              '0x4C3F5a84041E562928394d63b3E339bE70DBcC17',
              '0x742d35Cc6634C0532925a3b8D3A5d4F7d1b5f1c2',
              '0x8ba1f109551bD432803012645Hac136c4a6b5bd7'
            ].map((address, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchAddress(address);
                  setViewingAddress(address);
                }}
                className="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded font-mono text-sm"
              >
                {address}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSearch;