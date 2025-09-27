import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const GameChat = ({ room = "main", username = "Anonymous", isVisible = true }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [chatError, setChatError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize socket connection
  useEffect(() => {
    if (!isVisible) return;
    
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Join the room (this registers the player in the game)
    newSocket.emit('joinRoom', room);
    
    // Wait a moment then request chat history
    setTimeout(() => {
      newSocket.emit('getChatHistory', room);
    }, 1000);

    // Listen for chat messages
    newSocket.on('chatMessage', (message) => {
      console.log('💬 Received chat message:', message);
      setMessages(prev => [...prev, message]);
    });

    // Listen for chat history
    newSocket.on('chatHistory', (history) => {
      console.log('📜 Received chat history:', history);
      setMessages(history);
    });

    // Listen for chat errors
    newSocket.on('chatError', (error) => {
      console.error('💬 Chat error:', error);
      setChatError(error.message);
      setTimeout(() => setChatError(''), 5000);
    });

    // Handle connection events
    newSocket.on('connect', () => {
      console.log('🔗 Connected to chat server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from chat server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🚫 Socket connection error:', error);
      setIsConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, [room, isVisible]);

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
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setIsTyping(!isTyping);
      if (!isTyping) {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  };

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
      className="fixed bottom-4 left-4 z-50"
      style={{ fontFamily: 'monospace' }}
    >
      {/* Chat Container */}
      <div 
        ref={chatContainerRef}
        className={`bg-black/80 backdrop-blur-sm border border-gray-600 transition-all duration-200 ${
          isExpanded || isTyping 
            ? 'w-80 h-64' 
            : 'w-80 h-32'
        }`}
        style={{
          borderRadius: '4px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-gray-600 bg-black/90">
          <div className="flex items-center space-x-2">
            <span className="text-white text-xs font-bold">
              Chat • {room}
            </span>
            <div 
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`}
              title={isConnected ? 'Connected' : 'Disconnected'}
            />
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white text-xs px-1"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>

        {/* Error Display */}
        {chatError && (
          <div className="bg-red-900/80 border-b border-red-600 p-2">
            <span className="text-red-200 text-xs">{chatError}</span>
          </div>
        )}

        {/* Messages */}
        <div 
          className={`overflow-y-auto p-2 space-y-1 ${
            isExpanded || isTyping ? 'h-40' : 'h-16'
          } ${chatError ? 'h-12' : ''}`}
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: '#4B5563 transparent' 
          }}
        >
          {messages.length === 0 && !chatError && (
            <div className="text-xs text-gray-500 italic">
              No messages yet. Be the first to say something!
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="text-xs">
              <span className="text-gray-400 mr-1">
                [{formatTime(msg.timestamp)}]
              </span>
              <span 
                className="font-bold mr-1"
                style={{ color: msg.playerColor }}
              >
                {msg.username}:
              </span>
              <span className="text-white">
                {msg.message}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-600 bg-black/90">
          <form onSubmit={sendMessage} className="flex">
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
                  : isTyping 
                    ? "Type your message..." 
                    : "Press Tab to chat"
              }
              className="flex-1 bg-transparent text-white text-xs p-2 outline-none placeholder-gray-500"
              maxLength={200}
              autoComplete="off"
              disabled={!!chatError}
            />
            {isTyping && !chatError && (
              <button
                type="submit"
                className="px-3 text-xs text-gray-400 hover:text-white"
              >
                Send
              </button>
            )}
          </form>
        </div>

        {/* Instructions */}
        {!isTyping && !chatError && (
          <div className="absolute -top-6 left-0 text-xs text-gray-500 bg-black/60 px-2 py-1 rounded">
            Press Tab to chat
          </div>
        )}
      </div>

      {/* CSS for scrollbar styling */}
      <style jsx>{`
        div::-webkit-scrollbar {
          width: 4px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: #4B5563;
          border-radius: 2px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #6B7280;
        }
      `}</style>
    </div>
  );
};

export default GameChat;