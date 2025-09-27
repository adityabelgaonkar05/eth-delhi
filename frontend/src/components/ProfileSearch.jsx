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
      <div 
        style={{ 
          fontFamily: 'monospace',
          backgroundColor: '#333',
          minHeight: '100vh',
          padding: '20px'
        }}
      >
        {/* Search Header */}
        <div 
          style={{
            backgroundColor: '#2a1810',
            border: '3px solid #8b4513',
            borderRadius: '0',
            boxShadow: '6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321',
            padding: '20px',
            imageRendering: 'pixelated',
            textShadow: '2px 2px 0px #1a0f08',
            marginBottom: '25px',
            maxWidth: '1200px',
            margin: '0 auto 25px auto',
            position: 'relative'
          }}
        >
          {/* Medieval decorative border pattern */}
          <div style={{
            position: 'absolute',
            top: '2px',
            left: '2px',
            right: '2px',
            height: '2px',
            background: 'linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)',
            imageRendering: 'pixelated'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '2px',
            left: '2px',
            right: '2px',
            height: '2px',
            background: 'linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)',
            imageRendering: 'pixelated'
          }} />
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-white font-bold uppercase transition-all duration-200 flex items-center gap-2"
                style={{ 
                  fontFamily: 'monospace', 
                  borderStyle: 'solid',
                  border: '2px solid #8b4513',
                  backgroundColor: '#ff6b6b',
                  borderRadius: '0',
                  textShadow: '2px 2px 0px #1a0f08'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Search
              </button>
              <div>
                <div 
                  className="text-sm uppercase tracking-wider" 
                  style={{ 
                    fontFamily: 'monospace',
                    color: '#d2b48c',
                    fontWeight: 'bold'
                  }}
                >
                  Viewing Profile:
                </div>
                <div 
                  className="font-mono text-sm uppercase tracking-wider" 
                  style={{ 
                    fontFamily: 'monospace',
                    color: '#ffd700',
                    fontWeight: 'bold'
                  }}
                >
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
    <div 
      className="min-h-screen p-4" 
      style={{ 
        fontFamily: 'monospace',
        backgroundColor: '#333',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="text-center">
          <div 
            style={{
              backgroundColor: '#2a1810',
              border: '3px solid #8b4513',
              borderRadius: '0',
              boxShadow: '6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321',
              width: '600px',
              height: '140px',
              padding: '25px',
              imageRendering: 'pixelated',
              textShadow: '2px 2px 0px #1a0f08',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '0 auto 25px auto',
              position: 'relative'
            }}
          >
            {/* Medieval decorative border pattern */}
            <div style={{
              position: 'absolute',
              top: '2px',
              left: '2px',
              right: '2px',
              height: '2px',
              background: 'linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)',
              imageRendering: 'pixelated'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '2px',
              left: '2px',
              right: '2px',
              height: '2px',
              background: 'linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)',
              imageRendering: 'pixelated'
            }} />
            
            <div className="flex items-center justify-center gap-4 mb-3">
              <span style={{ color: '#d2b48c', fontSize: '2rem' }}>🔍</span>
              <h1 
                className="text-4xl font-bold uppercase tracking-wider" 
                style={{ 
                  fontFamily: 'monospace', 
                  textShadow: '3px 3px 0px #1a0f08',
                  color: '#d2b48c',
                  fontWeight: 'bold'
                }}
              >
                PROFILE SEARCH
              </h1>
              <span style={{ color: '#d2b48c', fontSize: '2rem' }}>🔍</span>
            </div>
            <p 
              className="uppercase tracking-wider text-lg" 
              style={{ 
                fontFamily: 'monospace',
                color: '#ffd700',
                fontWeight: 'bold'
              }}
            >
              SEARCH FOR ANY USER'S PROFILE
            </p>
          </div>
        </div>

        {/* Search Form */}
        <div 
          style={{
            backgroundColor: '#2a1810',
            border: '3px solid #8b4513',
            borderRadius: '0',
            boxShadow: '6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321',
            padding: '25px',
            imageRendering: 'pixelated',
            textShadow: '2px 2px 0px #1a0f08',
            position: 'relative'
          }}
        >
          {/* Medieval decorative border pattern */}
          <div style={{
            position: 'absolute',
            top: '2px',
            left: '2px',
            right: '2px',
            height: '2px',
            background: 'linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)',
            imageRendering: 'pixelated'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '2px',
            left: '2px',
            right: '2px',
            height: '2px',
            background: 'linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)',
            imageRendering: 'pixelated'
          }} />
          
          <div className="mb-6">
            <label 
              htmlFor="address" 
              className="block text-sm font-medium mb-2 uppercase tracking-wider" 
              style={{ 
                fontFamily: 'monospace',
                color: '#d2b48c',
                fontWeight: 'bold'
              }}
            >
              🏰 WALLET ADDRESS
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                id="address"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="0x..."
                className="flex-1 px-4 py-3 font-mono text-sm uppercase tracking-wider"
                style={{
                  border: '2px solid #8b4513',
                  borderRadius: '0',
                  backgroundColor: '#1a0f08',
                  color: '#ffd700',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  textShadow: '1px 1px 0px #1a0f08'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="px-6 py-3 text-white font-bold uppercase transition-all duration-200 flex items-center gap-2"
                style={{ 
                  fontFamily: 'monospace', 
                  borderStyle: 'solid',
                  border: '2px solid #8b4513',
                  backgroundColor: '#44ff44',
                  borderRadius: '0',
                  textShadow: '2px 2px 0px #1a0f08'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                SEARCH
              </button>
            </div>
            {error && (
              <p 
                className="mt-2 text-sm uppercase tracking-wider" 
                style={{ 
                  fontFamily: 'monospace',
                  color: '#ff6b6b',
                  fontWeight: 'bold'
                }}
              >
                ⚠️ {error}
              </p>
            )}
          </div>

          {/* Tips */}
          <div 
            style={{
              backgroundColor: '#1a0f08',
              border: '2px solid #44ff44',
              borderRadius: '0',
              padding: '15px',
              marginBottom: '20px'
            }}
          >
            <h3 
              className="font-semibold mb-2 uppercase tracking-wider" 
              style={{ 
                fontFamily: 'monospace',
                color: '#44ff44',
                fontWeight: 'bold'
              }}
            >
              💡 SEARCH TIPS:
            </h3>
            <ul 
              className="text-sm space-y-1 uppercase tracking-wide" 
              style={{ 
                fontFamily: 'monospace',
                color: '#ffd700',
                fontWeight: 'bold'
              }}
            >
              <li>• ENTER A VALID ETHEREUM ADDRESS (STARTS WITH 0X)</li>
              <li>• MAKE SURE THE ADDRESS IS 42 CHARACTERS LONG</li>
              <li>• YOU CAN VIEW ANY REGISTERED USER'S PUBLIC PROFILE</li>
              <li>• USE YOUR BROWSER'S BACK BUTTON TO RETURN TO SEARCH</li>
            </ul>
          </div>

          {/* Quick Actions */}
          <div className="text-center">
            <p 
              className="mb-4 uppercase tracking-wider" 
              style={{ 
                fontFamily: 'monospace',
                color: '#d2b48c',
                fontWeight: 'bold'
              }}
            >
              OR VIEW YOUR OWN PROFILE:
            </p>
            <button
              onClick={() => window.location.href = '/profile'}
              className="px-6 py-3 text-white font-bold uppercase transition-all duration-200"
              style={{ 
                fontFamily: 'monospace', 
                borderStyle: 'solid',
                border: '2px solid #8b4513',
                backgroundColor: '#ff6b6b',
                borderRadius: '0',
                textShadow: '2px 2px 0px #1a0f08'
              }}
            >
              👤 MY PROFILE
            </button>
          </div>
        </div>

        {/* Sample Addresses (for testing) */}
        <div 
          style={{
            backgroundColor: '#2a1810',
            border: '3px solid #8b4513',
            borderRadius: '0',
            boxShadow: '6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321',
            padding: '25px',
            imageRendering: 'pixelated',
            textShadow: '2px 2px 0px #1a0f08',
            position: 'relative'
          }}
        >
          {/* Medieval decorative border pattern */}
          <div style={{
            position: 'absolute',
            top: '2px',
            left: '2px',
            right: '2px',
            height: '2px',
            background: 'linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)',
            imageRendering: 'pixelated'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '2px',
            left: '2px',
            right: '2px',
            height: '2px',
            background: 'linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)',
            imageRendering: 'pixelated'
          }} />
          
          <h3 
            className="font-semibold mb-4 uppercase tracking-wider text-center" 
            style={{ 
              fontFamily: 'monospace',
              color: '#d2b48c',
              fontWeight: 'bold'
            }}
          >
            🧪 TEST WITH SAMPLE ADDRESSES
          </h3>
          <p 
            className="text-sm mb-4 uppercase tracking-wider text-center" 
            style={{ 
              fontFamily: 'monospace',
              color: '#ffd700',
              fontWeight: 'bold'
            }}
          >
            CLICK ANY ADDRESS BELOW TO QUICKLY TEST THE PROFILE VIEWER:
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
                className="block w-full text-left px-3 py-2 font-mono text-sm uppercase tracking-wider transition-all duration-200"
                style={{
                  backgroundColor: '#1a0f08',
                  border: '2px solid #654321',
                  borderRadius: '0',
                  color: '#ffd700',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  textShadow: '1px 1px 0px #1a0f08'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#2a1810';
                  e.target.style.borderColor = '#8b4513';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#1a0f08';
                  e.target.style.borderColor = '#654321';
                }}
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