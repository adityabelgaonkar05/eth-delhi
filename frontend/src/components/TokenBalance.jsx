import React from "react";
import { useToken } from "../context/TokenContract";
import { useWallet } from "../context/WalletContext";

const TokenBalance = () => {
  const { balance, symbol } = useToken();
  const { isConnected } = useWallet();

  if (!isConnected) {
    return (
      <div 
        style={{
          position: 'absolute',
          top: '32px',
          right: '32px',
          fontFamily: 'monospace',
          fontSize: '11px',
          lineHeight: '1.1',
          backgroundColor: '#2a1810',
          border: '3px solid #8b4513',
          borderRadius: '0',
          boxShadow: '6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321',
          width: '160px',
          height: '60px',
          padding: '8px 12px',
          imageRendering: 'pixelated',
          textShadow: '2px 2px 0px #1a0f08',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          transform: 'scale(1)',
          transformOrigin: 'top right'
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
        
        <div style={{ color: '#d2b48c', marginBottom: '6px', fontWeight: 'bold' }}>⚔️ TREASURE ⚔️</div>
        <div style={{ color: '#ff6b6b', fontWeight: 'bold', fontSize: '13px' }}>NO WALLET</div>
      </div>
    );
  }

  return (
    <div 
      style={{
        position: 'absolute',
        top: '32px',
        right: '32px',
        fontFamily: 'monospace',
        fontSize: '11px',
        lineHeight: '1.1',
        backgroundColor: '#2a1810',
        border: '3px solid #8b4513',
        borderRadius: '0',
        boxShadow: '6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321',
        width: '160px',
        height: '60px',
        padding: '8px 12px',
        imageRendering: 'pixelated',
        textShadow: '2px 2px 0px #1a0f08',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        transform: 'scale(1)',
        transformOrigin: 'top right'
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
      
      <div style={{ color: '#d2b48c', marginBottom: '6px', fontWeight: 'bold' }}>⚔️ TREASURE ⚔️</div>
      <div style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '13px' }}>
        {balance !== null ? (
          `${parseFloat(balance).toFixed(2)} ${symbol || "GOLD"}`
        ) : (
          <span style={{ color: '#ffeb3b' }}>COUNTING...</span>
        )}
      </div>
    </div>
  );
};

export default TokenBalance;
