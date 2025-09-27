import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import Player from '../game/classes/Player'
import MultiPlayer from '../game/classes/MultiPlayer'
import CollisionBlock from '../game/classes/CollisionBlock'
import GameChat from './GameChat'
import TokenBalance from './TokenBalance'
import { 
  townhallCollisions,
  townhall_l_New_Layer_1,
  townhall_l_New_Layer_5,
  townhall_l_New_Layer_2,
  townhall_l_New_Layer_3,
  townhall_l_New_Layer_4,
  townhall_l_New_Layer_6,
  townhall_l_New_Layer_7,
} from '../game/data/townhallDataNew'
import { loadImage } from '../game/utils/gameUtils'

const Townhall = () => {
  console.log('Townhall component rendering...')
  
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
  const [playerCoords, setPlayerCoords] = useState({ x: 0, y: 0 })
  
  // Exit to main island states
  const [showExitPrompt, setShowExitPrompt] = useState(false)
  const [hasShownExitPrompt, setHasShownExitPrompt] = useState(false)
  const [exitPromptCooldown, setExitPromptCooldown] = useState(false)
  const [exitCooldownTimeLeft, setExitCooldownTimeLeft] = useState(0)
  const [isHoldingExit, setIsHoldingExit] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const exitCooldownTimeoutRef = useRef(null)
  const exitCooldownIntervalRef = useRef(null)
  const holdIntervalRef = useRef(null)

  console.log('Townhall state:', { isLoading, error, connected, playerCount })

  // Initialize Socket.IO connection
  const initializeSocket = useCallback(() => {
    console.log('Initializing townhall socket connection...')
    const socket = io('http://localhost:3001')
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Connected to townhall server:', socket.id)
      setConnected(true)
      // Emit room join for townhall
      socket.emit('joinRoom', 'townhall')
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from townhall server')
      setConnected(false)
    })

    socket.on('gameState', (gameState) => {
      console.log('Received townhall game state:', gameState)
      
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
      console.log('Player joined townhall:', playerData)
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
      console.log('Player left townhall:', playerId)
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
      const coords = {
        x: playerRef.current.x,
        y: playerRef.current.y,
        facing: playerRef.current.facing,
        currentSprite: playerRef.current.facing === 'down' ? 'walkDown' : 
                       playerRef.current.facing === 'up' ? 'walkUp' :
                       playerRef.current.facing === 'left' ? 'walkLeft' : 'walkRight',
        moving: playerRef.current.velocity.x !== 0 || playerRef.current.velocity.y !== 0,
        room: 'townhall'
      }
      
      // Update coordinate display with socket data
      setPlayerCoords({ x: coords.x, y: coords.y })
      
      socketRef.current.emit('playerMove', coords)
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
        room: 'townhall'
      })
    }
  }, [])

  // Start exit cooldown period to prevent prompt spam
  const startExitCooldown = useCallback(() => {
    console.log('startExitCooldown called - setting cooldown to true')
    setExitPromptCooldown(true)
    setExitCooldownTimeLeft(5)
    
    // Clear any existing timeout and interval
    if (exitCooldownTimeoutRef.current) {
      clearTimeout(exitCooldownTimeoutRef.current)
    }
    if (exitCooldownIntervalRef.current) {
      clearInterval(exitCooldownIntervalRef.current)
    }
    
    // Start countdown interval
    exitCooldownIntervalRef.current = setInterval(() => {
      setExitCooldownTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(exitCooldownIntervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    // Set 5-second cooldown
    exitCooldownTimeoutRef.current = setTimeout(() => {
      console.log('Exit cooldown timeout triggered - setting cooldown to false')
      setExitPromptCooldown(false)
      setHasShownExitPrompt(false) // Reset so it can trigger again after cooldown
      setExitCooldownTimeLeft(0)
      console.log('Exit prompt cooldown ended')
    }, 5000) // 5 seconds cooldown
  }, [])

  // Handle exit navigation
  const handleExitToMain = useCallback(() => {
    setShowExitPrompt(false)
    startExitCooldown()
    // Navigate back to main game
    window.location.href = '/game'
  }, [startExitCooldown])

  const handleStayInTownhall = useCallback(() => {
    console.log('handleStayInTownhall called - starting cooldown')
    setShowExitPrompt(false)
    setIsHoldingExit(false)
    setHoldProgress(0)
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current)
    }
    startExitCooldown()
  }, [startExitCooldown])

  // Handle hold button functionality
  const handleHoldStart = useCallback(() => {
    setIsHoldingExit(true)
    setHoldProgress(0)
    
    holdIntervalRef.current = setInterval(() => {
      setHoldProgress(prev => {
        if (prev >= 100) {
          // Hold complete - exit to main
          handleExitToMain()
          return 100
        }
        return prev + 2 // 2% per 10ms = 100% in 500ms
      })
    }, 10)
  }, [])

  const handleHoldEnd = useCallback(() => {
    setIsHoldingExit(false)
    setHoldProgress(0)
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current)
    }
  }, [])

  // Layer data and tileset configuration for townhall
  const layersData = {
    townhall_l_New_Layer_1,
    townhall_l_New_Layer_5,
    townhall_l_New_Layer_2,
    townhall_l_New_Layer_3,
    townhall_l_New_Layer_4,
    townhall_l_New_Layer_6,
    townhall_l_New_Layer_7,
  }

  const tilesets = {
    townhall_l_New_Layer_1: { imageUrl: '/images/terrain.png', tileSize: 16 },
    townhall_l_New_Layer_5: { imageUrl: '/images/decorations.png', tileSize: 16 },
    townhall_l_New_Layer_2: { imageUrl: '/images/decorations.png', tileSize: 16 },
    townhall_l_New_Layer_3: { imageUrl: '/images/decorations.png', tileSize: 16 },
    townhall_l_New_Layer_4: { imageUrl: '/images/characters.png', tileSize: 16 },
    townhall_l_New_Layer_6: { imageUrl: '/images/characters.png', tileSize: 16 },
    townhall_l_New_Layer_7: { imageUrl: '/images/characters.png', tileSize: 16 },
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

    console.log('Creating townhall offscreen canvas...')
    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = canvas.width
    offscreenCanvas.height = canvas.height
    const offscreenContext = offscreenCanvas.getContext('2d')

    try {
      let layersProcessed = 0
      for (const [layerName, tilesData] of Object.entries(layersData)) {
        const tilesetInfo = tilesets[layerName]
        if (tilesetInfo) {
          console.log(`Loading townhall tileset for ${layerName}: ${tilesetInfo.imageUrl}`)
          try {
            const tilesetImage = await loadImage(tilesetInfo.imageUrl)
            console.log(`Loaded townhall tileset for ${layerName}, size: ${tilesetImage.width}x${tilesetImage.height}`)
            renderLayer(tilesData, tilesetImage, tilesetInfo.tileSize, offscreenContext)
            layersProcessed++
          } catch (error) {
            console.error(`Failed to load townhall image for layer ${layerName}:`, error)
            throw error
          }
        }
      }
      console.log(`Successfully processed ${layersProcessed} townhall layers`)
      return offscreenCanvas
    } catch (error) {
      console.error('Error in townhall renderStaticLayers:', error)
      throw error
    }
  }

  // Initialize game objects
  const initializeGame = useCallback(async () => {
    console.log('initializeTownhall function called!')
    
    const canvas = canvasRef.current
    console.log('Canvas ref:', canvas)
    if (!canvas) {
      console.log('Canvas not found, returning early')
      setError('Failed to initialize townhall canvas')
      return
    }

    console.log('Initializing townhall game...')

    try {
      const dpr = window.devicePixelRatio || 1
      // Townhall map is 40 tiles wide × 20 tiles high, each tile is 16px
      canvas.width = (40 * 16) * dpr  // 640px
      canvas.height = (20 * 16) * dpr // 320px

      // Create collision blocks for townhall
      const blockSize = 16
      const collisionBlocks = []
      townhallCollisions.forEach((row, y) => {
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
      console.log('Created', collisionBlocks.length, 'townhall collision blocks')

      // Create player (townhall starting position)
      playerRef.current = new Player({
        x: 300,
        y: 250,
        size: 15,
      })
      console.log('Created townhall player')

      // Initialize socket connection
      initializeSocket()

      // Render townhall background
      console.log('Rendering townhall static layers...')
      const backgroundCanvas = await renderStaticLayers()
      if (backgroundCanvas) {
        backgroundCanvasRef.current = backgroundCanvas
        console.log('Townhall background rendered successfully')
        setIsLoading(false)
      } else {
        throw new Error('Failed to create townhall background canvas')
      }
    } catch (error) {
      console.error('Townhall game initialization error:', error)
      setError(`Failed to initialize townhall: ${error.message}`)
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

    // Check for exit to main island interaction zone (coordinates 303,289 to 310,289)
    const playerX = playerRef.current.x
    const playerY = playerRef.current.y
    const isInExitZone = playerX >= 303 && playerX <= 310 && playerY >= 284 && playerY <= 294
    
    // Debug logging (remove in production)
    if (playerX >= 300 && playerX <= 315 && playerY >= 280 && playerY <= 300) {
      console.log(`Player at (${Math.round(playerX)}, ${Math.round(playerY)}), in exit zone: ${isInExitZone}, prompt shown: ${hasShownExitPrompt}, cooldown: ${exitPromptCooldown}`)
    }
    
    // Only trigger exit prompt if in zone, not already shown, and not in cooldown
    if (isInExitZone && !hasShownExitPrompt && !exitPromptCooldown) {
      console.log('Triggering exit prompt!')
      setShowExitPrompt(true)
      setHasShownExitPrompt(true)
    }

    // Render scene
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(backgroundCanvasRef.current, 0, 0)
    
    // Draw exit to main island indicator
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
    ctx.fillRect(303, 300, 17, 19) // Highlight the exit area (X: 303-310, Y: 284-294)
    
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
      // Handle ESC key to close exit prompt
      if (e.key === 'Escape') {
        if (showExitPrompt) {
          handleStayInTownhall()
          return
        }
      }

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
  }, [sendPlayerInput, showExitPrompt, handleStayInTownhall])

  // Initialize game on component mount
  useEffect(() => {
    console.log('Townhall useEffect triggered - initializing game...')
    const init = async () => {
      try {
        await initializeGame()
      } catch (error) {
        console.error('Error during townhall initialization:', error)
        setError(`Townhall initialization failed: ${error.message}`)
      }
    }
    init()

    return () => {
      console.log('Townhall component cleanup')
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      // Cleanup exit cooldown timeout and interval
      if (exitCooldownTimeoutRef.current) {
        clearTimeout(exitCooldownTimeoutRef.current)
      }
      if (exitCooldownIntervalRef.current) {
        clearInterval(exitCooldownIntervalRef.current)
      }
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current)
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
        {/* Token Balance */}
        <TokenBalance />

        {/* Connection status - Bottom Right */}
        <div style={{
          position: 'absolute',
          bottom: '80px',
          right: '32px',
          fontFamily: 'monospace',
          fontSize: '11px',
          lineHeight: '1.1',
          backgroundColor: '#2a1810',
          border: '3px solid #8b4513',
          borderRadius: '0',
          boxShadow: '6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321',
          width: '160px',
          height: '70px',
          padding: '10px 12px',
          imageRendering: 'pixelated',
          textShadow: '2px 2px 0px #1a0f08',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          transform: 'scale(1)',
          transformOrigin: 'bottom right'
        }}>
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
          
          <div style={{ color: '#d2b48c', marginBottom: '4px', fontWeight: 'bold' }}>🏛️ TOWNHALL STATUS</div>
          <div style={{ color: connected ? '#44ff44' : '#ff4444', fontWeight: 'bold', fontSize: '12px', marginBottom: '2px' }}>
            {connected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
          <div style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '12px' }}>
            PLAYERS: {playerCount}
          </div>
        </div>

        {/* Player coordinates */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          color: 'white',
          background: 'rgba(0,0,0,0.7)',
          padding: '8px',
          borderRadius: '5px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <div>X: {Math.round(playerCoords.x)}</div>
          <div>Y: {Math.round(playerCoords.y)}</div>
          {exitPromptCooldown && (
            <div style={{ color: '#ff6b6b', fontSize: '10px', marginTop: '2px' }}>
              Exit cooldown: {exitCooldownTimeLeft}s
            </div>
          )}
        </div>

        <canvas 
          ref={canvasRef}
          style={{ 
            border: '2px solid #fff',
            backgroundColor: '#16213e',
            display: isLoading || error ? 'none' : 'block',
            width: '100vw',
            height: '100vh',
            objectFit: 'fill',
            imageRendering: 'pixelated'
          }}
        />
        <div style={{ 
          color: 'white', 
          textAlign: 'center', 
          marginTop: '10px',
          display: isLoading || error ? 'none' : 'block'
        }}>
          🏛️ Townhall • Use WASD or Arrow Keys to move • Multiplayer Mode
        </div>
        
        {error && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '320px',
            width: '640px',
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
            height: '320px',
            width: '640px',
            fontSize: '18px',
            color: 'white',
            border: '2px solid #fff',
            backgroundColor: '#222'
          }}>
            🏛️ Loading townhall...
          </div>
        )}

        {/* Exit to Main Island Prompt */}
        {showExitPrompt && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: '#2a2a2a',
              border: '3px solid #4a4a4a',
              borderRadius: '15px',
              padding: '30px',
              textAlign: 'center',
              maxWidth: '400px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
            }}>
              <h2 style={{
                color: '#fff',
                fontSize: '24px',
                marginBottom: '20px',
                fontFamily: 'monospace'
              }}>
                🏝️ Exit to Main Island
              </h2>
              
              <p style={{
                color: '#ccc',
                fontSize: '16px',
                marginBottom: '30px',
                lineHeight: '1.5'
              }}>
                You've found the exit portal!<br/>
                Hold the button to return to the main island.
              </p>
              
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <button
                  onMouseDown={handleHoldStart}
                  onMouseUp={handleHoldEnd}
                  onMouseLeave={handleHoldEnd}
                  onTouchStart={handleHoldStart}
                  onTouchEnd={handleHoldEnd}
                  style={{
                    backgroundColor: isHoldingExit ? '#E55A2B' : '#FF6B35',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    transition: 'background-color 0.1s',
                    position: 'relative',
                    overflow: 'hidden',
                    minWidth: '200px',
                    height: '50px'
                  }}
                >
                  {/* Progress bar overlay */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${holdProgress}%`,
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    transition: 'width 0.1s linear',
                    borderRadius: '8px'
                  }} />
                  
                  {/* Button text */}
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    {isHoldingExit ? `Exiting... ${Math.round(holdProgress)}%` : 'Hold to Exit'}
                  </span>
                </button>
              </div>
              
              <p style={{
                color: '#888',
                fontSize: '12px',
                marginTop: '20px',
                fontStyle: 'italic'
              }}>
                Press ESC to close this dialog
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Game Chat */}
      <GameChat
        room="townhall"
        username="Participant"
        isVisible={true}
      />
    </div>
  )
}

export default Townhall