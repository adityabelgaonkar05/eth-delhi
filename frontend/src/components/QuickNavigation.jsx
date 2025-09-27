import React from 'react';
import { Link } from 'react-router-dom';

const QuickNavigation = () => {
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '15px',
      borderRadius: '10px',
      fontSize: '14px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      minWidth: '200px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>
        🚀 Quick Navigation
      </div>
      <Link 
        to="/game" 
        style={{ 
          color: '#4CAF50', 
          textDecoration: 'none',
          padding: '8px 12px',
          borderRadius: '5px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>🎮</span> Game
      </Link>
      <Link 
        to="/pets" 
        style={{ 
          color: '#FF9800', 
          textDecoration: 'none',
          padding: '8px 12px',
          borderRadius: '5px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>🐾</span> Pet Shop
      </Link>
      <Link 
        to="/leaderboards" 
        style={{ 
          color: '#9C27B0', 
          textDecoration: 'none',
          padding: '8px 12px',
          borderRadius: '5px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>🏆</span> Leaderboards
      </Link>
      <Link 
        to="/profile" 
        style={{ 
          color: '#E91E63', 
          textDecoration: 'none',
          padding: '8px 12px',
          borderRadius: '5px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>👤</span> Profile
      </Link>
      <Link 
        to="/search-profile" 
        style={{ 
          color: '#607D8B', 
          textDecoration: 'none',
          padding: '8px 12px',
          borderRadius: '5px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>🔍</span> Search
      </Link>
      <Link 
        to="/library" 
        style={{ 
          color: '#2196F3', 
          textDecoration: 'none',
          padding: '8px 12px',
          borderRadius: '5px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>📚</span> Library
      </Link>
      <Link 
        to="/townhall" 
        style={{ 
          color: '#F44336', 
          textDecoration: 'none',
          padding: '8px 12px',
          borderRadius: '5px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>🏛️</span> Town Hall
      </Link>
      <Link 
        to="/walrus-test" 
        style={{ 
          color: '#8B5CF6', 
          textDecoration: 'none',
          padding: '8px 12px',
          borderRadius: '5px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>🦭</span> Walrus Test
      </Link>
    </div>
  );
};

export default QuickNavigation;