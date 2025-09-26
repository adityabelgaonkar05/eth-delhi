const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const cors = require('cors')

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173", // React dev server
    methods: ["GET", "POST"]
  }
})

app.use(cors())
app.use(express.json())

// Store connected players
const players = new Map()

// Game state
const gameState = {
  players: {},
  lastUpdate: Date.now()
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`)

  // Initialize new player
  const newPlayer = {
    id: socket.id,
    x: 143 + Math.random() * 50, // Spawn near starting position with some randomness
    y: 100 + Math.random() * 50,
    size: 15,
    facing: 'down',
    currentSprite: 'walkDown',
    moving: false,
    color: `hsl(${Math.random() * 360}, 70%, 50%)` // Random color for each player
  }

  players.set(socket.id, newPlayer)
  gameState.players[socket.id] = newPlayer

  // Send current game state to new player
  socket.emit('gameState', gameState)
  
  // Broadcast new player to all other players
  socket.broadcast.emit('playerJoined', newPlayer)

  // Handle player movement
  socket.on('playerMove', (data) => {
    const player = players.get(socket.id)
    if (player) {
      // Update player position and state
      player.x = data.x
      player.y = data.y
      player.facing = data.facing
      player.currentSprite = data.currentSprite
      player.moving = data.moving
      
      gameState.players[socket.id] = player
      
      // Broadcast movement to all other players
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        ...data
      })
    }
  })

  // Handle player input (for real-time responsiveness)
  socket.on('playerInput', (inputData) => {
    const player = players.get(socket.id)
    if (player) {
      player.facing = inputData.facing
      player.currentSprite = inputData.currentSprite
      player.moving = inputData.moving
      
      gameState.players[socket.id] = player
      
      // Broadcast input state to other players immediately
      socket.broadcast.emit('playerInputChanged', {
        id: socket.id,
        facing: inputData.facing,
        currentSprite: inputData.currentSprite,
        moving: inputData.moving
      })
    }
  })

  // Handle player disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`)
    players.delete(socket.id)
    delete gameState.players[socket.id]
    
    // Broadcast player left to all players
    socket.broadcast.emit('playerLeft', socket.id)
  })
})

// Send game state updates periodically (for synchronization)
setInterval(() => {
  gameState.lastUpdate = Date.now()
  io.emit('gameSync', gameState)
}, 1000 / 20) // 20 FPS sync rate

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`🚀 Multiplayer game server running on port ${PORT}`)
  console.log(`🎮 Ready for players to connect!`)
})