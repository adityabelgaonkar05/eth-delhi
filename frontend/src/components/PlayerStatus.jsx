import React from "react";
import { useWallet } from "../context/WalletContext";

const PlayerStatus = () => {
  const { address, isConnected } = useWallet();

  // Mock player data - in a real game, this would come from your game state/contracts
  const playerData = {
    name: "Player",
    level: 1,
    reputation: 150,
    experience: 75,
    maxExperience: 100,
    // Generate a simple avatar based on address
    avatar: address ? `🎮` : `👤`
  };

  if (!isConnected) {
    return (
      <div 
        style={{
          position: 'absolute',
          top: '32px',
          left: '32px',
          fontFamily: 'monospace',
          fontSize: '11px',
          lineHeight: '1.1',
          backgroundColor: '#2a1810',
          border: '3px solid #8b4513',
          borderRadius: '0',
          boxShadow: '6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321',
          width: '200px',
          height: '80px',
          padding: '10px 12px',
          imageRendering: 'pixelated',
          textShadow: '2px 2px 0px #1a0f08',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          transform: 'scale(1)',
          transformOrigin: 'top left'
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
        
        <div style={{ color: '#d2b48c', marginBottom: '4px', fontWeight: 'bold' }}>⚔️ PLAYER STATUS ⚔️</div>
        <div style={{ color: '#ff4444', fontWeight: 'bold', fontSize: '12px' }}>
          NOT CONNECTED
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{
        position: 'absolute',
        top: '32px',
        left: '32px',
        fontFamily: 'monospace',
        fontSize: '10px',
        lineHeight: '1.1',
        backgroundColor: '#2a1810',
        border: '3px solid #8b4513',
        borderRadius: '0',
        boxShadow: '6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321',
        width: '220px',
        height: '85px',
        padding: '8px 10px',
        imageRendering: 'pixelated',
        textShadow: '2px 2px 0px #1a0f08',
        transform: 'scale(1)',
        transformOrigin: 'top left'
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
      
      {/* Player Info Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '6px',
        justifyContent: 'space-between'
      }}>
        <div style={{ color: '#d2b48c', fontWeight: 'bold', fontSize: '11px' }}>
          ⚔️ {playerData.name.toUpperCase()}
        </div>
        <div style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '11px' }}>
          LEVEL {playerData.level}
        </div>
      </div>

      {/* Experience Bar */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{ 
          color: '#d2b48c', 
          fontSize: '9px', 
          marginBottom: '2px',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>EXP</span>
          <span style={{ color: '#44ff44' }}>{playerData.experience}/{playerData.maxExperience}</span>
        </div>
        <div style={{
          width: '100%',
          height: '6px',
          backgroundColor: '#654321',
          border: '1px solid #8b4513',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${(playerData.experience / playerData.maxExperience) * 100}%`,
            height: '100%',
            backgroundColor: '#44ff44',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Reputation */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ color: '#d2b48c', fontSize: '9px' }}>REPUTATION</span>
        <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '10px' }}>
          {playerData.reputation}
        </span>
      </div>
    </div>
  );
};

export default PlayerStatus;
