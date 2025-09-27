const express = require("express");
require("dotenv").config();
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/db");
const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173", // React dev server
    methods: ["GET", "POST"],
  },
});
const indexRoutes = require("./routes/indexRoutes");

app.use(cors());
app.use(express.json());

//using routes
app.use("/api", indexRoutes);

// Store connected players by room
const playersByRoom = new Map();

// Game state by room
const gameStateByRoom = new Map();

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
