import React from 'react';
import GameChat from './GameChat';

const ChatTest = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">WebSocket Chat Test</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Instructions</h2>
            <div className="space-y-3 text-sm text-gray-300">
              <p><strong>1.</strong> Open multiple browser tabs/windows to this page</p>
              <p><strong>2.</strong> Press <kbd className="bg-gray-700 px-2 py-1 rounded">Tab</kbd> to start typing in chat</p>
              <p><strong>3.</strong> Type a message and press <kbd className="bg-gray-700 px-2 py-1 rounded">Enter</kbd> to send</p>
              <p><strong>4.</strong> Press <kbd className="bg-gray-700 px-2 py-1 rounded">Esc</kbd> to cancel typing</p>
              <p><strong>5.</strong> Click the <kbd className="bg-gray-700 px-2 py-1 rounded">+</kbd> button to expand chat</p>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Features</h2>
            <div className="space-y-2 text-sm text-gray-300">
              <p>• Real-time messaging across browser tabs</p>
              <p>• Room-based chat (each page has its own room)</p>
              <p>• Message history persistence</p>
              <p>• Minecraft-style chat interface</p>
              <p>• Connection status indicator</p>
              <p>• Auto-scroll to latest messages</p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Different Rooms</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-900/30 p-4 rounded border border-blue-500">
              <h3 className="font-semibold text-blue-300 mb-2">Main Room</h3>
              <p className="text-xs text-gray-400">Default game room</p>
            </div>
            <div className="bg-purple-900/30 p-4 rounded border border-purple-500">
              <h3 className="font-semibold text-purple-300 mb-2">Cinema Room</h3>
              <p className="text-xs text-gray-400">Movie premieres</p>
            </div>
            <div className="bg-green-900/30 p-4 rounded border border-green-500">
              <h3 className="font-semibold text-green-300 mb-2">Library Room</h3>
              <p className="text-xs text-gray-400">Reading & research</p>
            </div>
            <div className="bg-yellow-900/30 p-4 rounded border border-yellow-500">
              <h3 className="font-semibold text-yellow-300 mb-2">Business Room</h3>
              <p className="text-xs text-gray-400">Corporate events</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat positioned at bottom left like in the game */}
      <GameChat
        room="test"
        username={`Tester-${Math.floor(Math.random() * 1000)}`}
        isVisible={true}
      />
    </div>
  );
};

export default ChatTest;