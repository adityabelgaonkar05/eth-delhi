import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getUsernameColor } from '../utils/colorUtils';

const GameChat = ({ room = "main", username = "Anonymous", isVisible = true, socket = null }) => {
  // Remove local socket state since we're using the passed socket
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [chatError, setChatError] = useState('');
  const inputRef = useRef(null);
  const messageTimeoutsRef = useRef(new Map());

  // Add message with auto-fade (Minecraft style)
  const addMessage = useCallback((message) => {
    const messageId = Date.now() + Math.random();
    const newMessage = { ...message, id: messageId };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Auto-remove message after 10 seconds (like Minecraft)
    const timeout = setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      messageTimeoutsRef.current.delete(messageId);
    }, 10000);
    
    messageTimeoutsRef.current.set(messageId, timeout);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      messageTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

    // Initialize chat listeners on the existing socket
  useEffect(() => {
    if (!isVisible || !socket) return;
    
    console.log("Setting up chat listeners on existing socket:", socket.id);

    // Set up chat event listeners
    socket.on('chatMessage', (message) => {
      console.log('💬 Received chat message:', message);
      addMessage(message);
    });

    // Listen for chat history (only show recent messages)
    socket.on('chatHistory', (history) => {
      console.log('📜 Received chat history:', history);
      // Only show last 5 messages from history
      const recentHistory = history.slice(-5);
      recentHistory.forEach(msg => addMessage(msg));
    });

    // Listen for chat errors
    socket.on('chatError', (error) => {
      console.error('💬 Chat error:', error);
      setChatError(error.message);
      setTimeout(() => setChatError(''), 5000);
    });

    // Handle connection events - socket is already connected
    setIsConnected(socket.connected);

    // Wait a moment then request chat history
    setTimeout(() => {
      socket.emit('getChatHistory', room);
    }, 1000);

    // Clean up listeners on unmount
    return () => {
      socket.off('chatMessage');
      socket.off('chatHistory'); 
      socket.off('chatError');
    };
  }, [room, isVisible, socket, addMessage]);

  // Handle sending messages
  const sendMessage = useCallback((e) => {
    e.preventDefault();
    if (currentMessage.trim() && socket) {
      console.log('📤 Sending message:', currentMessage);
      socket.emit('sendChatMessage', {
        room: room,
        username: username,
        message: currentMessage.trim()
      });
      setCurrentMessage('');
      setIsTyping(false);
    }
  }, [currentMessage, socket, room, username]);

  // Handle input changes
  const handleInputChange = (e) => {
    setCurrentMessage(e.target.value);
  };

  // Handle key presses
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    } else if (e.key === 'Escape') {
      setIsTyping(false);
      setCurrentMessage('');
      inputRef.current?.blur();
    }
  };

  // Handle T key to open chat (Minecraft style)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 't' && !isTyping && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Only trigger if not typing in an input field
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsTyping(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTyping]);

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Handle focus/blur for typing state
  const handleFocus = () => {
    setIsTyping(true);
  };

  const handleBlur = () => {
    if (!currentMessage.trim()) {
      setIsTyping(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      style={{ fontFamily: 'monospace' }}
    >
      {/* Messages Display (Minecraft style - bottom left) */}
      <div className="absolute bottom-4 left-4 max-w-md">
        {/* Single dark background box for all messages */}
        <div 
          className="p-3 rounded"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {messages.slice(-10).map((msg, index) => (
            <div 
              key={msg.id} 
              className="text-base mb-1 text-white"
              style={{
                animation: 'fadeInUp 0.3s ease-out'
              }}
            >
              {/* Check if it's a system message (like "Herobrine joined the game") */}
              {msg.isSystemMessage ? (
                <span className="text-yellow-400">
                  {msg.message}
                </span>
              ) : (
                <>
                  <span className="text-white">&lt;</span>
                  <span 
                    className="font-bold"
                    style={{ color: msg.playerColor || getUsernameColor(msg.username) }}
                  >
                    {msg.username}
                  </span>
                  <span className="text-white">&gt; </span>
                  <span className="text-white">
                    {msg.message}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Input Bar (only when typing) */}
      {isTyping && (
        <div className="absolute bottom-4 left-4 pointer-events-auto">
          <form onSubmit={sendMessage} className="flex items-center">
            <div 
              className="flex items-center px-3 py-2 rounded"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <span className="text-white text-base mr-1">&lt;</span>
              <span 
                className="font-bold text-base mr-1"
                style={{ color: getUsernameColor(username) }}
              >
                {username}
              </span>
              <span className="text-white text-base mr-2">&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={currentMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={
                  chatError 
                    ? "Register in game to chat" 
                    : "Type your message..."
                }
                className="bg-transparent text-white text-base outline-none placeholder-gray-500 min-w-64"
                maxLength={200}
                autoComplete="off"
                disabled={!!chatError}
                style={{ 
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </form>
        </div>
      )}

      {/* Error Display */}
      {chatError && (
        <div className="absolute bottom-4 left-4 bg-red-900/90 px-3 py-1 rounded">
          <span className="text-red-200 text-base">{chatError}</span>
        </div>
      )}

      {/* Connection Status (top-right corner) */}
      <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/60 px-3 py-1 rounded pointer-events-auto">
        <span className="text-white text-xs">
          Chat • {room}
        </span>
        <div 
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-400' : 'bg-red-400'
          }`}
          title={isConnected ? 'Connected' : 'Disconnected'}
        />
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default GameChat;