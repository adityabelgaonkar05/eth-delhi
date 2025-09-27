const express = require("express");
require("dotenv").config();
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const selfAuthRoutes = require("./routes/auth/selfAuth");
const adminRoutes = require("./routes/auth/admin");
const WalrusUserService = require("./services/WalrusUserService");
const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"],
  },
});

// Enhanced CORS configuration for localtunnel and development
app.use(cors({
  origin: [
    'http://localhost:5173', // Frontend dev server
    'http://localhost:3000', // Alternative frontend port
    /\.loca\.lt$/, // Allow all localtunnel subdomains
    /\.ngrok\.io$/, // Allow all ngrok subdomains
    /\.ngrok-free\.app$/, // Allow new ngrok domains
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Middleware to handle localtunnel bypass
app.use((req, res, next) => {
  // Add localtunnel bypass header
  if (req.get('host') && req.get('host').includes('loca.lt')) {
    res.setHeader('Bypass-Tunnel-Reminder', 'true');
  }
  next();
});

// Add a health check endpoint for tunnel verification
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CryptoVerse Backend',
    port: process.env.PORT || 3001
  });
});

// Authentication routes
app.use('/api/auth', selfAuthRoutes);
app.use('/api/admin', adminRoutes);
const indexRoutes = require("./routes/indexRoutes");

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true // Allow cookies
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

//using routes
app.use("/api", indexRoutes);

// Initialize Walrus service
const walrusService = new WalrusUserService();
console.log("🦭 Walrus User Service initialized");

// Store connected players by room
const playersByRoom = new Map();

// Game state by room
const gameStateByRoom = new Map();

// Store chat messages by room (keep last 50 messages per room)
const chatMessagesByRoom = new Map();

// User profile blob IDs mapping (address -> blobId)
const userProfileBlobIds = new Map();

// Initialize room if it doesn't exist
const initializeRoom = (room) => {
  if (!playersByRoom.has(room)) {
    playersByRoom.set(room, new Map());
  }
  if (!gameStateByRoom.has(room)) {
    gameStateByRoom.set(room, {
      players: {},
      lastUpdate: Date.now(),
    });
  }
  if (!chatMessagesByRoom.has(room)) {
    chatMessagesByRoom.set(room, []);
  }
};

// Get spawn position based on room
const getSpawnPosition = (room) => {
  switch (room) {
    case "cinema":
      return {
        x: 100 + Math.random() * 50,
        y: 250 + Math.random() * 50,
      };
    case "library":
      return {
        x: 100 + Math.random() * 50,
        y: 200 + Math.random() * 50,
      };
    case "townhall":
      return {
        x: 150 + Math.random() * 50,
        y: 300 + Math.random() * 50,
      };
    default: // main game
      return {
        x: 143 + Math.random() * 50,
        y: 100 + Math.random() * 50,
      };
  }
};

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  let currentRoom = "main"; // Default room

  // Handle room joining
  socket.on("joinRoom", (room) => {
    currentRoom = room || "main";
    console.log(`Player ${socket.id} joining room: ${currentRoom}`);

    // Initialize room if needed
    initializeRoom(currentRoom);

    // Join the socket room for broadcasting
    socket.join(currentRoom);

    const spawnPos = getSpawnPosition(currentRoom);

    // Initialize new player
    const newPlayer = {
      id: socket.id,
      x: spawnPos.x,
      y: spawnPos.y,
      size: 15,
      facing: "down",
      currentSprite: "walkDown",
      moving: false,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`, // Random color for each player
      room: currentRoom,
    };

    const roomPlayers = playersByRoom.get(currentRoom);
    const roomGameState = gameStateByRoom.get(currentRoom);

    roomPlayers.set(socket.id, newPlayer);
    roomGameState.players[socket.id] = newPlayer;

    // Send current game state to new player
    socket.emit("gameState", roomGameState);

    // Broadcast new player to all other players in the same room
    socket.to(currentRoom).emit("playerJoined", newPlayer);
  });

  // Handle player movement
  socket.on("playerMove", (data) => {
    const room = data.room || currentRoom;
    const roomPlayers = playersByRoom.get(room);
    const roomGameState = gameStateByRoom.get(room);

    if (roomPlayers && roomGameState) {
      const player = roomPlayers.get(socket.id);
      if (player) {
        // Update player position and state
        player.x = data.x;
        player.y = data.y;
        player.facing = data.facing;
        player.currentSprite = data.currentSprite;
        player.moving = data.moving;

        roomGameState.players[socket.id] = player;

        // Broadcast movement to all other players in the same room
        socket.to(room).emit("playerMoved", {
          id: socket.id,
          ...data,
        });
      }
    }
  });

  // Handle chat messages
  socket.on("sendChatMessage", (data) => {
    console.log(`Received chat message from ${socket.id}:`, data);
    
    // Check if it's a private message command
    if (data.message.trim().startsWith('/pc ')) {
      handlePrivateMessage(socket, data);
      return;
    }
    
    const room = data.room || currentRoom;
    const roomPlayers = playersByRoom.get(room);
    const roomMessages = chatMessagesByRoom.get(room);

    // Only allow chat from registered players
    if (!roomPlayers || !roomPlayers.has(socket.id)) {
      console.log(`Chat message rejected - player ${socket.id} not registered in room ${room}`);
      socket.emit("chatError", { message: "You must be registered in the game to use chat" });
      return;
    }

    // Initialize room if it doesn't exist
    initializeRoom(room);
    
    const updatedRoomMessages = chatMessagesByRoom.get(room);
    const player = roomPlayers.get(socket.id);

    const chatMessage = {
      id: Date.now() + Math.random(), // Unique ID
      playerId: socket.id,
      playerColor: player.color,
      username: data.username || `Player-${socket.id.slice(-4)}`,
      message: data.message.trim(),
      timestamp: new Date().toISOString(),
      room: room
    };

    // Add message to room history (keep last 50 messages)
    updatedRoomMessages.push(chatMessage);
    if (updatedRoomMessages.length > 50) {
      updatedRoomMessages.shift(); // Remove oldest message
    }

    // Broadcast message to all players in the room
    io.to(room).emit("chatMessage", chatMessage);
    console.log(`Chat message broadcasted to room ${room}: ${chatMessage.username}: ${chatMessage.message}`);
  });

  // Handle private messages
  function handlePrivateMessage(socket, data) {
    const room = data.room || currentRoom;
    const roomPlayers = playersByRoom.get(room);

    // Only allow private messages from registered players
    if (!roomPlayers || !roomPlayers.has(socket.id)) {
      console.log(`Private message rejected - player ${socket.id} not registered in room ${room}`);
      socket.emit("chatError", { message: "You must be registered in the game to use chat" });
      return;
    }

    // Parse the private message command: /pc <username> <message>
    const messageContent = data.message.trim().substring(4); // Remove '/pc '
    const spaceIndex = messageContent.indexOf(' ');
    
    if (spaceIndex === -1) {
      socket.emit("chatError", { message: "Usage: /pc <player_name> <message>" });
      return;
    }

    const targetUsername = messageContent.substring(0, spaceIndex).trim();
    const privateMessage = messageContent.substring(spaceIndex + 1).trim();

    if (!targetUsername || !privateMessage) {
      socket.emit("chatError", { message: "Usage: /pc <player_name> <message>" });
      return;
    }

    // Find the target player in the same room
    let targetSocketId = null;
    let targetPlayer = null;

    roomPlayers.forEach((player, socketId) => {
      const playerUsername = player.username || `Player-${socketId.slice(-4)}`;
      if (playerUsername.toLowerCase() === targetUsername.toLowerCase()) {
        targetSocketId = socketId;
        targetPlayer = player;
      }
    });

    if (!targetSocketId) {
      socket.emit("chatError", { 
        message: `Player "${targetUsername}" not found in this room.` 
      });
      return;
    }

    if (targetSocketId === socket.id) {
      socket.emit("chatError", { 
        message: "You cannot send a private message to yourself!" 
      });
      return;
    }

    const senderPlayer = roomPlayers.get(socket.id);
    const senderUsername = data.username || `Player-${socket.id.slice(-4)}`;

    // Create private message object
    const privateChatMessage = {
      id: Date.now() + Math.random(),
      playerId: socket.id,
      playerColor: senderPlayer.color,
      username: senderUsername,
      message: privateMessage,
      timestamp: new Date().toISOString(),
      room: room,
      isPrivate: true,
      targetUsername: targetPlayer.username || `Player-${targetSocketId.slice(-4)}`,
      targetPlayerId: targetSocketId
    };

    // Send to target player
    io.to(targetSocketId).emit("privateMessage", privateChatMessage);
    
    // Send confirmation to sender
    const senderConfirmation = {
      ...privateChatMessage,
      isSenderConfirmation: true
    };
    socket.emit("privateMessage", senderConfirmation);

    console.log(`Private message sent from ${senderUsername} to ${targetPlayer.username || targetSocketId}: ${privateMessage}`);
  }

  // Send chat history when player joins room
  socket.on("getChatHistory", (room) => {
    const targetRoom = room || currentRoom;
    const roomPlayers = playersByRoom.get(targetRoom);
    
    // Only send chat history to registered players
    if (!roomPlayers || !roomPlayers.has(socket.id)) {
      console.log(`Chat history request rejected - player ${socket.id} not registered in room ${targetRoom}`);
      return;
    }
    
    console.log(`Sending chat history for room ${targetRoom} to ${socket.id}`);
    
    // Initialize room if it doesn't exist
    initializeRoom(targetRoom);
    
    const roomMessages = chatMessagesByRoom.get(targetRoom);
    if (roomMessages) {
      socket.emit("chatHistory", roomMessages);
      console.log(`Sent ${roomMessages.length} messages to ${socket.id}`);
    }
  });

  // Handle player input (for real-time responsiveness)
  socket.on("playerInput", (inputData) => {
    const room = inputData.room || currentRoom;
    const roomPlayers = playersByRoom.get(room);
    const roomGameState = gameStateByRoom.get(room);

    if (roomPlayers && roomGameState) {
      const player = roomPlayers.get(socket.id);
      if (player) {
        player.facing = inputData.facing;
        player.currentSprite = inputData.currentSprite;
        player.moving = inputData.moving;

        roomGameState.players[socket.id] = player;

        // Broadcast input state to other players in the same room immediately
        socket.to(room).emit("playerInputChanged", {
          id: socket.id,
          facing: inputData.facing,
          currentSprite: inputData.currentSprite,
          moving: inputData.moving,
        });
      }
    }
  });

  // Handle user profile updates to Walrus
  socket.on("updateUserProfile", async (data) => {
    try {
      console.log(`🦭 Updating user profile for ${socket.id}:`, data);
      
      const { userAddress, profileData } = data;
      
      if (!userAddress || !profileData) {
        socket.emit("profileError", { message: "Missing user address or profile data" });
        return;
      }

      // Get current blob ID if exists
      const currentBlobId = userProfileBlobIds.get(userAddress.toLowerCase());
      
      // Store/update profile on Walrus
      const newBlobId = await walrusService.updateUserProfile(
        userAddress, 
        currentBlobId, 
        profileData
      );
      
      // Update blob ID mapping
      userProfileBlobIds.set(userAddress.toLowerCase(), newBlobId);
      
      // Update player data in room
      const roomPlayers = playersByRoom.get(currentRoom);
      if (roomPlayers && roomPlayers.has(socket.id)) {
        const player = roomPlayers.get(socket.id);
        player.walletAddress = userAddress;
        player.username = profileData.username || player.username;
        player.walrusBlobId = newBlobId;
      }
      
      socket.emit("profileUpdated", { 
        blobId: newBlobId, 
        message: "Profile updated successfully" 
      });
      
      console.log(`✅ User profile updated on Walrus: ${newBlobId}`);
      
    } catch (error) {
      console.error(`❌ Error updating user profile:`, error);
      socket.emit("profileError", { 
        message: `Failed to update profile: ${error.message}` 
      });
    }
  });

  // Handle player search by username
  socket.on("searchPlayers", async (data) => {
    try {
      console.log(`🔍 Searching players for ${socket.id}:`, data);
      
      const { searchTerm, useContractFallback = true } = data;
      
      if (!searchTerm || searchTerm.trim().length < 2) {
        socket.emit("searchResults", { results: [], message: "Search term too short" });
        return;
      }
      
      let results = [];
      let searchMethod = "walrus";
      
      try {
        // First, try Walrus search with timeout
        const walrusResults = await walrusService.searchUsersByUsername(searchTerm.trim());
        results = walrusResults;
        
        if (results.length === 0) {
          searchMethod = "cache_empty";
        }
        
      } catch (error) {
        console.warn(`⚠️ Walrus search failed: ${error.message}`);
        searchMethod = "walrus_failed";
        
        if (useContractFallback) {
          // TODO: Implement contract-based search as fallback
          // For now, search connected players
          searchMethod = "fallback_connected";
          results = searchConnectedPlayers(searchTerm);
        }
      }
      
      socket.emit("searchResults", { 
        results, 
        searchMethod, 
        searchTerm,
        message: `Found ${results.length} players`
      });
      
      console.log(`🔍 Search completed: ${results.length} results via ${searchMethod}`);
      
    } catch (error) {
      console.error(`❌ Error searching players:`, error);
      socket.emit("searchError", { 
        message: `Search failed: ${error.message}` 
      });
    }
  });

  // Handle getting user profile from Walrus
  socket.on("getUserProfile", async (data) => {
    try {
      console.log(`📄 Getting user profile for ${socket.id}:`, data);
      
      const { userAddress, blobId } = data;
      
      let targetBlobId = blobId;
      if (!targetBlobId && userAddress) {
        targetBlobId = userProfileBlobIds.get(userAddress.toLowerCase());
      }
      
      if (!targetBlobId) {
        socket.emit("profileError", { message: "No profile blob ID found" });
        return;
      }
      
      // Try to get from cache first
      const cachedProfile = walrusService.getCachedProfile(userAddress);
      if (cachedProfile) {
        socket.emit("profileData", {
          profile: cachedProfile.data,
          blobId: cachedProfile.blobId,
          source: "cache"
        });
        return;
      }
      
      // Fetch from Walrus with 10s timeout
      const profileData = await walrusService.getUserProfile(targetBlobId, 10000);
      
      socket.emit("profileData", {
        profile: profileData,
        blobId: targetBlobId,
        source: "walrus"
      });
      
      console.log(`✅ User profile retrieved from Walrus`);
      
    } catch (error) {
      console.error(`❌ Error getting user profile:`, error);
      
      // If Walrus fails, could fall back to contracts here
      socket.emit("profileError", { 
        message: `Failed to get profile: ${error.message}`,
        useContractFallback: true
      });
    }
  });

  // Helper function to search connected players
  function searchConnectedPlayers(searchTerm) {
    const results = [];
    const searchLower = searchTerm.toLowerCase();
    
    for (const [room, roomPlayers] of playersByRoom.entries()) {
      roomPlayers.forEach((player, playerId) => {
        const username = player.username || `Player-${playerId.slice(-4)}`;
        if (username.toLowerCase().includes(searchLower)) {
          results.push({
            userAddress: player.walletAddress,
            username: username,
            isOnline: true,
            room: room,
            source: "connected"
          });
        }
      });
    }
    
    return results;
  }

  // Handle player disconnect
  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);

    // Remove player from all rooms
    for (const [room, roomPlayers] of playersByRoom.entries()) {
      if (roomPlayers.has(socket.id)) {
        roomPlayers.delete(socket.id);
        const roomGameState = gameStateByRoom.get(room);
        if (roomGameState) {
          delete roomGameState.players[socket.id];
        }

        // Broadcast player left to all players in that room
        socket.to(room).emit("playerLeft", socket.id);
        console.log(`Removed player ${socket.id} from room ${room}`);
      }
    }
  });
});

// Send game state updates periodically (for synchronization)
setInterval(() => {
  for (const [room, roomGameState] of gameStateByRoom.entries()) {
    roomGameState.lastUpdate = Date.now();
    io.to(room).emit("gameSync", roomGameState);
  }
}, 1000 / 20); // 20 FPS sync rate

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  connectDB();
  console.log(`🚀 Multiplayer game server running on port ${PORT}`);
  console.log(`🎮 Ready for players to connect!`);
});
