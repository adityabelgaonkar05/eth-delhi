import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import Player from '../game/classes/Player'
import MultiPlayer from '../game/classes/MultiPlayer'
import CollisionBlock from '../game/classes/CollisionBlock'
import Sprite from '../game/classes/Sprite'
import { 
  collisions, 
  l_New_Layer_1, 
  l_New_Layer_2, 
  l_New_Layer_3, 
  l_New_Layer_4, 
  l_New_Layer_5, 
  l_New_Layer_6, 
  l_New_Layer_7, 
  l_New_Layer_8, 
  l_New_Layer_9, 
  l_New_Layer_10, 
  l_New_Layer_11, 
  l_New_Layer_12, 
  l_New_Layer_13 
} from '../game/data/gameData'
import { loadImage } from '../game/utils/gameUtils'

const MultiplayerGame = () => {
  console.log('MultiplayerGame component rendering...')
  
  const canvasRef = useRef(null)
  const playerRef = useRef(null) // Local player
  const otherPlayersRef = useRef(new Map()) // Other players
  const collisionBlocksRef = useRef([])
  const spritesRef = useRef([])
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
  const elapsedTimeRef = useRef(0)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)
  const [playerCount, setPlayerCount] = useState(0)

  console.log('MultiplayerGame state:', { isLoading, error, connected, playerCount })

  // Layer data and tileset configuration
  const layersData = {
    l_New_Layer_1,
    l_New_Layer_2,
    l_New_Layer_3,
    l_New_Layer_4,
    l_New_Layer_5,
    l_New_Layer_6,
    l_New_Layer_8,
    l_New_Layer_9,
    l_New_Layer_10,
    l_New_Layer_11,
    l_New_Layer_7,
    l_New_Layer_12,
    l_New_Layer_13,
  }

  const tilesets = {
    l_New_Layer_1: { imageUrl: '/images/terrain.png', tileSize: 16 },
    l_New_Layer_2: { imageUrl: '/images/terrain.png', tileSize: 16 },
    l_New_Layer_3: { imageUrl: '/images/decorations.png', tileSize: 16 },
    l_New_Layer_4: { imageUrl: '/images/terrain.png', tileSize: 16 },
    l_New_Layer_5: { imageUrl: '/images/terrain.png', tileSize: 16 },
    l_New_Layer_6: { imageUrl: '/images/decorations.png', tileSize: 16 },
    l_New_Layer_8: { imageUrl: '/images/terrain.png', tileSize: 16 },
    l_New_Layer_9: { imageUrl: '/images/terrain.png', tileSize: 16 },
    l_New_Layer_10: { imageUrl: '/images/decorations.png', tileSize: 16 },
    l_New_Layer_11: { imageUrl: '/images/decorations.png', tileSize: 16 },
    l_New_Layer_7: { imageUrl: '/images/decorations.png', tileSize: 16 },
    l_New_Layer_12: { imageUrl: '/images/decorations.png', tileSize: 16 },
    l_New_Layer_13: { imageUrl: '/images/decorations.png', tileSize: 16 },
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

    console.log('Creating offscreen canvas...')
    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = canvas.width
    offscreenCanvas.height = canvas.height
    const offscreenContext = offscreenCanvas.getContext('2d')

    try {
      let layersProcessed = 0
      for (const [layerName, tilesData] of Object.entries(layersData)) {
        const tilesetInfo = tilesets[layerName]
        if (tilesetInfo) {
          console.log(`Loading tileset for ${layerName}: ${tilesetInfo.imageUrl}`)
          try {
            const tilesetImage = await loadImage(tilesetInfo.imageUrl)
            console.log(`Loaded tileset for ${layerName}, size: ${tilesetImage.width}x${tilesetImage.height}`)
            renderLayer(tilesData, tilesetImage, tilesetInfo.tileSize, offscreenContext)
            layersProcessed++
          } catch (error) {
            console.error(`Failed to load image for layer ${layerName}:`, error)
            throw error
          }
        }
      }
      console.log(`Successfully processed ${layersProcessed} layers`)
      return offscreenCanvas
    } catch (error) {
      console.error('Error in renderStaticLayers:', error)
      throw error
    }
  }

  // Initialize Socket.IO connection
  const initializeSocket = useCallback(() => {
    console.log('Initializing socket connection...')
    const socket = io('http://localhost:3001')
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Connected to server:', socket.id)
      setConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnected(false)
    })

    socket.on('gameState', (gameState) => {
      console.log('Received game state:', gameState)
      
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
      console.log('Player joined:', playerData)
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
      console.log('Player left:', playerId)
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

  // Initialize game objects
  const initializeGame = useCallback(async () => {
    console.log('initializeGame function called!')
    
    const canvas = canvasRef.current
    console.log('Canvas ref:', canvas)
    if (!canvas) {
      console.log('Canvas not found, returning early')
      setError('Failed to initialize canvas')
      return
    }

    console.log('Initializing multiplayer game...')

    try {
      const dpr = window.devicePixelRatio || 1
      canvas.width = 1024 * dpr
      canvas.height = 576 * dpr

      // Create collision blocks
      const blockSize = 16
      const collisionBlocks = []
      collisions.forEach((row, y) => {
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
      console.log('Created', collisionBlocks.length, 'collision blocks')

      // Create local player
      playerRef.current = new Player({
        x: 143,
        y: 100,
        size: 15,
      })
      console.log('Created local player')

      // Initialize falling leaves
      spritesRef.current = [
        new Sprite({
          x: 20,
          y: 20,
          velocity: {
            x: 0.08,
            y: 0.08,
          },
        })
      ]
      console.log('Created sprites')

      // Initialize socket connection
      initializeSocket()

      // Render background
      console.log('Rendering static layers...')
      const backgroundCanvas = await renderStaticLayers()
      if (backgroundCanvas) {
        backgroundCanvasRef.current = backgroundCanvas
        console.log('Background rendered successfully')
        setIsLoading(false)
      } else {
        throw new Error('Failed to create background canvas')
      }
    } catch (error) {
      console.error('Game initialization error:', error)
      setError(`Failed to initialize game: ${error.message}`)
    }
  }, [initializeSocket])

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
        moving: playerRef.current.velocity.x !== 0 || playerRef.current.velocity.y !== 0
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
        moving
      })
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
    elapsedTimeRef.current += deltaTime

    // Spawn new leaves periodically
    if (elapsedTimeRef.current > 1.5) {
      spritesRef.current.push(
        new Sprite({
          x: Math.random() * 150,
          y: Math.random() * 50,
          velocity: {
            x: 0.08,
            y: 0.08,
          },
        })
      )
      elapsedTimeRef.current = 0
    }

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

    // Update and render falling leaves
    for (let i = spritesRef.current.length - 1; i >= 0; i--) {
      const leaf = spritesRef.current[i]
      leaf.update(deltaTime)
      leaf.draw(ctx)

      if (leaf.alpha <= 0) {
        spritesRef.current.splice(i, 1)
      }
    }

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
    console.log('MultiplayerGame useEffect triggered - initializing game...')
    const init = async () => {
      try {
        await initializeGame()
      } catch (error) {
        console.error('Error during game initialization:', error)
        setError(`Initialization failed: ${error.message}`)
      }
    }
    init()

    return () => {
      console.log('MultiplayerGame component cleanup')
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
      backgroundColor: '#333',
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
          <div>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</div>
          <div>Players: {playerCount}</div>
        </div>

        <canvas 
          ref={canvasRef}
          style={{ 
            border: '2px solid #fff',
            backgroundColor: '#87CEEB',
            display: isLoading || error ? 'none' : 'block'
          }}
        />
        <div style={{ 
          color: 'white', 
          textAlign: 'center', 
          marginTop: '10px',
          display: isLoading || error ? 'none' : 'block'
        }}>
          Use WASD or Arrow Keys to move • Multiplayer Mode
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
            Loading multiplayer game...
          </div>
        )}
      </div>
    </div>
  )
}

export default MultiplayerGame