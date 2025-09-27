import React from 'react';

const PlayerNameTag = ({ 
  username, 
  x, 
  y, 
  isVisible, 
  onClick,
  userColor 
}) => {
  if (!isVisible) return null;

  return (
    <div
      className="absolute z-50 pointer-events-auto cursor-pointer"
      style={{
        left: x,
        top: y - 30, // Position above player
        transform: 'translate(-50%, 0)', // Center horizontally
      }}
      onClick={onClick}
    >
      <div
        className="px-2 py-1 rounded text-xs font-bold border-2 transition-all duration-200 hover:scale-110 hover:shadow-lg"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          border: `2px solid ${userColor || '#4CAF50'}`,
          color: userColor || '#4CAF50',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '10px',
          textShadow: '1px 1px 0px rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)'
        }}
      >
        {username}
        <div
          className="absolute left-1/2 top-full w-0 h-0"
          style={{
            transform: 'translateX(-50%)',
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: `4px solid ${userColor || '#4CAF50'}`,
          }}
        />
      </div>
    </div>
  );
};

export default PlayerNameTag;