import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import Player from '../game/classes/Player'
import MultiPlayer from '../game/classes/MultiPlayer'
import CollisionBlock from '../game/classes/CollisionBlock'
import { 
  cinemaCollisions,
  cinema_l_New_Layer_1, 
  cinema_l_New_Layer_2, 
  cinema_l_New_Layer_3, 
  cinema_l_New_Layer_4, 
  cinema_l_New_Layer_5, 
  cinema_l_New_Layer_6 
} from '../game/data/cinemaData'
import { loadImage } from '../game/utils/gameUtils'

const Cinema = () => {
  console.log('Cinema component rendering...')
  
  const canvasRef = useRef(null)
  const playerRef = useRef(null) // Local player
  const otherPlayersRef = useRef(new Map()) // Other players
  const collisionBlocksRef = useRef([])
  const socketRef = useRef(null)
  const keysRef = useRef({
    w: { pressed: false },
    a: { pressed: false },
    s: { pressed: false },
    d: { pressed: false }
  })
  const backgroundCanvasRef = useRef(null)
  const animationIdRef = useRef(null)
  const lastTimeRef = useRef(performance.now())

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)
  const [playerCount, setPlayerCount] = useState(0)

  console.log('Cinema state:', { isLoading, error, connected, playerCount })

  // Initialize Socket.IO connection
  const initializeSocket = useCallback(() => {
    console.log('Initializing cinema socket connection...')
    const socket = io('http://localhost:3001')
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Connected to cinema server:', socket.id)
      setConnected(true)
      // Emit room join for cinema
      socket.emit('joinRoom', 'cinema')
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from cinema server')
      setConnected(false)
    })

    socket.on('gameState', (gameState) => {
      console.log('Received cinema game state:', gameState)
      
      // Create other players
      Object.entries(gameState.players).forEach(([playerId, playerData]) => {
        if (playerId !== socket.id) {
          const otherPlayer = new MultiPlayer({
            id: playerId,
            x: playerData.x,
            y: playerData.y,
            size: playerData.size,
            color: playerData.color,
            isLocal: false
          })
          otherPlayer.updateSprite(playerData.facing, playerData.currentSprite, playerData.moving)
          otherPlayersRef.current.set(playerId, otherPlayer)
        }
      })
      
      setPlayerCount(Object.keys(gameState.players).length)
    })

    socket.on('playerJoined', (playerData) => {
      console.log('Player joined cinema:', playerData)
      const newPlayer = new MultiPlayer({
        id: playerData.id,
        x: playerData.x,
        y: playerData.y,
        size: playerData.size,
        color: playerData.color,
        isLocal: false
      })
      otherPlayersRef.current.set(playerData.id, newPlayer)
      setPlayerCount(prev => prev + 1)
    })

    socket.on('playerLeft', (playerId) => {
      console.log('Player left cinema:', playerId)
      otherPlayersRef.current.delete(playerId)
      setPlayerCount(prev => prev - 1)
    })

    socket.on('playerMoved', (data) => {
      const player = otherPlayersRef.current.get(data.id)
      if (player) {
        player.updatePosition(data.x, data.y)
        player.updateSprite(data.facing, data.currentSprite, data.moving)
      }
    })

    socket.on('playerInputChanged', (data) => {
      const player = otherPlayersRef.current.get(data.id)
      if (player) {
        player.updateSprite(data.facing, data.currentSprite, data.moving)
      }
    })

    return socket
  }, [])

  // Send player movement to server
  const sendPlayerMovement = useCallback(() => {
    if (socketRef.current && playerRef.current) {
      socketRef.current.emit('playerMove', {
        x: playerRef.current.x,
        y: playerRef.current.y,
        facing: playerRef.current.facing,
        currentSprite: playerRef.current.facing === 'down' ? 'walkDown' : 
                       playerRef.current.facing === 'up' ? 'walkUp' :
                       playerRef.current.facing === 'left' ? 'walkLeft' : 'walkRight',
        moving: playerRef.current.velocity.x !== 0 || playerRef.current.velocity.y !== 0,
        room: 'cinema'
      })
    }
  }, [])

  // Send player input changes immediately
  const sendPlayerInput = useCallback((facing, moving) => {
    if (socketRef.current) {
      const currentSprite = facing === 'down' ? 'walkDown' : 
                           facing === 'up' ? 'walkUp' :
                           facing === 'left' ? 'walkLeft' : 'walkRight'
      
      socketRef.current.emit('playerInput', {
        facing,
        currentSprite,
        moving,
        room: 'cinema'
      })
    }
  }, [])

  // Layer data and tileset configuration for cinema
  const layersData = {
    cinema_l_New_Layer_1,
    cinema_l_New_Layer_3, 
    cinema_l_New_Layer_2,
    cinema_l_New_Layer_5,
    cinema_l_New_Layer_4,
    cinema_l_New_Layer_6,
  }

  const tilesets = {
    cinema_l_New_Layer_1: { imageUrl: '/images/terrain.png', tileSize: 16 },
    cinema_l_New_Layer_3: { imageUrl: '/images/terrain.png', tileSize: 16 },
    cinema_l_New_Layer_2: { imageUrl: '/images/decorations.png', tileSize: 8 },
    cinema_l_New_Layer_5: { imageUrl: '/images/decorations.png', tileSize: 8 },
    cinema_l_New_Layer_4: { imageUrl: '/images/decorations.png', tileSize: 8 },
    cinema_l_New_Layer_6: { imageUrl: '/images/terrain.png', tileSize: 16 },
  }

  const renderLayer = (tilesData, tilesetImage, tileSize, context) => {
    const tilesPerRow = Math.ceil(tilesetImage.width / tileSize)

    tilesData.forEach((row, y) => {
      row.forEach((symbol, x) => {
        if (symbol !== 0) {
          const tileIndex = symbol - 1
          const srcX = (tileIndex % tilesPerRow) * tileSize
          const srcY = Math.floor(tileIndex / tilesPerRow) * tileSize

          context.drawImage(
            tilesetImage,
            srcX,
            srcY,
            tileSize,
            tileSize,
            x * 16,
            y * 16,
            16,
            16,
          )
        }
      })
    })
  }

  const renderStaticLayers = async () => {
    const canvas = canvasRef.current
    if (!canvas) return null

    console.log('Creating cinema offscreen canvas...')
    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = canvas.width
    offscreenCanvas.height = canvas.height
    const offscreenContext = offscreenCanvas.getContext('2d')

    try {
      let layersProcessed = 0
      for (const [layerName, tilesData] of Object.entries(layersData)) {
        const tilesetInfo = tilesets[layerName]
        if (tilesetInfo) {
          console.log(`Loading cinema tileset for ${layerName}: ${tilesetInfo.imageUrl}`)
          try {
            const tilesetImage = await loadImage(tilesetInfo.imageUrl)
            console.log(`Loaded cinema tileset for ${layerName}, size: ${tilesetImage.width}x${tilesetImage.height}`)
            renderLayer(tilesData, tilesetImage, tilesetInfo.tileSize, offscreenContext)
            layersProcessed++
          } catch (error) {
            console.error(`Failed to load cinema image for layer ${layerName}:`, error)
            throw error
          }
        }
      }
      console.log(`Successfully processed ${layersProcessed} cinema layers`)
      return offscreenCanvas
    } catch (error) {
      console.error('Error in cinema renderStaticLayers:', error)
      throw error
    }
  }

  // Initialize game objects
  const initializeGame = useCallback(async () => {
    console.log('initializeCinema function called!')
    
    const canvas = canvasRef.current
    console.log('Canvas ref:', canvas)
    if (!canvas) {
      console.log('Canvas not found, returning early')
      setError('Failed to initialize cinema canvas')
      return
    }

    console.log('Initializing cinema game...')

    try {
      const dpr = window.devicePixelRatio || 1
      canvas.width = 1024 * dpr
      canvas.height = 576 * dpr

      // Create collision blocks for cinema
      const blockSize = 16
      const collisionBlocks = []
      cinemaCollisions.forEach((row, y) => {
        row.forEach((symbol, x) => {
          if (symbol === 1) {
            collisionBlocks.push(
              new CollisionBlock({
                x: x * blockSize,
                y: y * blockSize,
                size: blockSize,
              })
            )
          }
        })
      })
      collisionBlocksRef.current = collisionBlocks
      console.log('Created', collisionBlocks.length, 'cinema collision blocks')

      // Create player (cinema starting position)
      playerRef.current = new Player({
        x: 100,
        y: 250,
        size: 15,
      })
      console.log('Created cinema player')

      // Initialize socket connection
      initializeSocket()

      // Render cinema background
      console.log('Rendering cinema static layers...')
      const backgroundCanvas = await renderStaticLayers()
      if (backgroundCanvas) {
        backgroundCanvasRef.current = backgroundCanvas
        console.log('Cinema background rendered successfully')
        setIsLoading(false)
      } else {
        throw new Error('Failed to create cinema background canvas')
      }
    } catch (error) {
      console.error('Cinema game initialization error:', error)
      setError(`Failed to initialize cinema: ${error.message}`)
    }
  }, [])

  // Game animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !playerRef.current || !backgroundCanvasRef.current) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    // Calculate delta time
    const currentTime = performance.now()
    const deltaTime = (currentTime - lastTimeRef.current) / 1000
    lastTimeRef.current = currentTime

    // Update local player
    const wasMoving = playerRef.current.velocity.x !== 0 || playerRef.current.velocity.y !== 0
    playerRef.current.handleInput(keysRef.current)
    playerRef.current.update(deltaTime, collisionBlocksRef.current)
    const isMoving = playerRef.current.velocity.x !== 0 || playerRef.current.velocity.y !== 0

    // Send movement updates
    sendPlayerMovement()

    // Send input state changes immediately for responsiveness
    if (wasMoving !== isMoving) {
      sendPlayerInput(playerRef.current.facing, isMoving)
    }

    // Update other players
    otherPlayersRef.current.forEach(player => {
      player.update(deltaTime)
    })

    // Render scene
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(backgroundCanvasRef.current, 0, 0)
    
    // Draw local player
    playerRef.current.draw(ctx)

    // Draw other players
    otherPlayersRef.current.forEach(player => {
      player.draw(ctx)
    })
    
    ctx.restore()

    animationIdRef.current = requestAnimationFrame(animate)
  }, [sendPlayerMovement, sendPlayerInput])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      const wasPressed = Object.values(keysRef.current).some(key => key.pressed)
      
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          keysRef.current.w.pressed = true
          break
        case 'a':
        case 'arrowleft':
          keysRef.current.a.pressed = true
          break
        case 's':
        case 'arrowdown':
          keysRef.current.s.pressed = true
          break
        case 'd':
        case 'arrowright':
          keysRef.current.d.pressed = true
          break
      }

      const isPressed = Object.values(keysRef.current).some(key => key.pressed)
      if (!wasPressed && isPressed && playerRef.current) {
        sendPlayerInput(playerRef.current.facing, true)
      }
    }

    const handleKeyUp = (e) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          keysRef.current.w.pressed = false
          break
        case 'a':
        case 'arrowleft':
          keysRef.current.a.pressed = false
          break
        case 's':
        case 'arrowdown':
          keysRef.current.s.pressed = false
          break
        case 'd':
        case 'arrowright':
          keysRef.current.d.pressed = false
          break
      }

      const isPressed = Object.values(keysRef.current).some(key => key.pressed)
      if (!isPressed && playerRef.current) {
        sendPlayerInput(playerRef.current.facing, false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [sendPlayerInput])

  // Initialize game on component mount
  useEffect(() => {
    console.log('Cinema useEffect triggered - initializing game...')
    const init = async () => {
      try {
        await initializeGame()
      } catch (error) {
        console.error('Error during cinema initialization:', error)
        setError(`Cinema initialization failed: ${error.message}`)
      }
    }
    init()

    return () => {
      console.log('Cinema component cleanup')
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  // Start animation loop when not loading
  useEffect(() => {
    if (!isLoading && !error) {
      animate()
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [isLoading, error, animate])

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      backgroundColor: '#1a1a2e',
      position: 'relative'
    }}>
      <div>
        {/* Connection status */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          color: 'white',
          background: 'rgba(0,0,0,0.7)',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          <div>🎬 Cinema Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</div>
          <div>Players: {playerCount}</div>
        </div>

        <canvas 
          ref={canvasRef}
          style={{ 
            border: '2px solid #fff',
            backgroundColor: '#16213e',
            display: isLoading || error ? 'none' : 'block'
          }}
        />
        <div style={{ 
          color: 'white', 
          textAlign: 'center', 
          marginTop: '10px',
          display: isLoading || error ? 'none' : 'block'
        }}>
          🎬 Cinema • Use WASD or Arrow Keys to move • Multiplayer Mode
        </div>
        
        {error && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '576px',
            width: '1024px',
            fontSize: '18px',
            color: 'red',
            border: '2px solid #fff',
            backgroundColor: '#222'
          }}>
            Error: {error}
          </div>
        )}
        
        {isLoading && !error && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '576px',
            width: '1024px',
            fontSize: '18px',
            color: 'white',
            border: '2px solid #fff',
            backgroundColor: '#222'
          }}>
            🎬 Loading cinema...
          </div>
        )}
      </div>
    </div>
  )
}

export default Cinema