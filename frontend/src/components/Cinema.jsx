import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import Player from '../game/classes/Player'
import MultiPlayer from '../game/classes/MultiPlayer'
import CollisionBlock from '../game/classes/CollisionBlock'
import GameChat from './GameChat'
import TokenBalance from './TokenBalance'
import PlayerStatus from './PlayerStatus'
import { 
  cinemaCollisions,
  cinema_l_New_Layer_1, 
  cinema_l_New_Layer_2, 
  cinema_l_New_Layer_3, 
  cinema_l_New_Layer_4, 
  cinema_l_New_Layer_5, 
  cinema_l_New_Layer_6 
} from '../game/data/cinemaDataNew'
import { loadImage } from '../game/utils/gameUtils'
import { getContract, getAllPremieres } from '../utils/contractHelpers'

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

  // Premiere interaction states
  const [showPremierePrompt, setShowPremierePrompt] = useState(false)
  const [hasShownPremierePrompt, setHasShownPremierePrompt] = useState(false)
  const [premierePromptCooldown, setPremierePromptCooldown] = useState(false)
  const [premiereCooldownTimeLeft, setPremiereCooldownTimeLeft] = useState(0)
  const [showPremiereModal, setShowPremiereModal] = useState(false)
  const [premieres, setPremieres] = useState([])
  const [loadingPremieres, setLoadingPremieres] = useState(false)
  const [selectedPremiere, setSelectedPremiere] = useState(null)
  const premiereCooldownTimeoutRef = useRef(null)
  const premiereCooldownIntervalRef = useRef(null)

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
      const coords = {
        x: playerRef.current.x,
        y: playerRef.current.y,
        facing: playerRef.current.facing,
        currentSprite: playerRef.current.facing === 'down' ? 'walkDown' : 
                       playerRef.current.facing === 'up' ? 'walkUp' :
                       playerRef.current.facing === 'left' ? 'walkLeft' : 'walkRight',
        moving: playerRef.current.velocity.x !== 0 || playerRef.current.velocity.y !== 0,
        room: 'cinema'
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
        room: 'cinema'
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

  // Start premiere cooldown period to prevent prompt spam
  const startPremiereCooldown = useCallback(() => {
    console.log('startPremiereCooldown called - setting cooldown to true')
    setPremierePromptCooldown(true)
    setPremiereCooldownTimeLeft(5)
    
    // Clear any existing timeout and interval
    if (premiereCooldownTimeoutRef.current) {
      clearTimeout(premiereCooldownTimeoutRef.current)
    }
    if (premiereCooldownIntervalRef.current) {
      clearInterval(premiereCooldownIntervalRef.current)
    }
    
    // Start countdown interval
    premiereCooldownIntervalRef.current = setInterval(() => {
      setPremiereCooldownTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(premiereCooldownIntervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    // Set 5-second cooldown
    premiereCooldownTimeoutRef.current = setTimeout(() => {
      console.log('Premiere cooldown timeout triggered - setting cooldown to false')
      setPremierePromptCooldown(false)
      setHasShownPremierePrompt(false) // Reset so it can trigger again after cooldown
      setPremiereCooldownTimeLeft(0)
      console.log('Premiere prompt cooldown ended')
    }, 5000) // 5 seconds cooldown
  }, [])

  // Load premieres from blockchain
  const loadPremieres = useCallback(async () => {
    setLoadingPremieres(true)
    try {
      const premieresList = await getAllPremieres()
      setPremieres(premieresList)
    } catch (error) {
      console.error('Error loading premieres:', error)
      setPremieres([])
    } finally {
      setLoadingPremieres(false)
    }
  }, [])

  // Handle premiere navigation
  const handleOpenPremiereHub = useCallback(() => {
    setShowPremierePrompt(false)
    setShowPremiereModal(true)
    startPremiereCooldown()
    loadPremieres()
  }, [startPremiereCooldown, loadPremieres])

  const handleStayInCinemaFromPremiere = useCallback(() => {
    console.log('handleStayInCinemaFromPremiere called - starting cooldown')
    setShowPremierePrompt(false)
    startPremiereCooldown()
  }, [startPremiereCooldown])

  // Handle exit navigation
  const handleExitToMain = useCallback(() => {
    setShowExitPrompt(false)
    startExitCooldown()
    // Navigate back to main game
    window.location.href = '/game'
  }, [startExitCooldown])

  const handleStayInCinema = useCallback(() => {
    console.log('handleStayInCinema called - starting cooldown')
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
      // Cinema map is 40 tiles wide × 20 tiles high, each tile is 16px
      canvas.width = (40 * 16) * dpr  // 640px
      canvas.height = (20 * 16) * dpr // 320px

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

      // Create player (cinema starting position - bottom center of the room)
      playerRef.current = new Player({
        x: 320,  // Center horizontally (40 * 16 / 2)
        y: 280,  // Near bottom (20 * 16 - 40)
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

    // Check for exit to main island interaction zone (coordinates 304,301 to 321,301)
    const playerX = playerRef.current.x
    const playerY = playerRef.current.y
    const isInExitZone = playerX >= 304 && playerX <= 321 && playerY >= 296 && playerY <= 306
    
    // Debug logging (remove in production)
    if (playerX >= 300 && playerX <= 325 && playerY >= 290 && playerY <= 310) {
      console.log(`Player at (${Math.round(playerX)}, ${Math.round(playerY)}), in exit zone: ${isInExitZone}, prompt shown: ${hasShownExitPrompt}, cooldown: ${exitPromptCooldown}`)
    }
    
    // Only trigger exit prompt if in zone, not already shown, and not in cooldown
    if (isInExitZone && !hasShownExitPrompt && !exitPromptCooldown) {
      console.log('Triggering exit prompt!')
      setShowExitPrompt(true)
      setHasShownExitPrompt(true)
    }

    // Check for premiere interaction zone (bar from y=208 onwards)
    const isInPremiereZone = playerY >= 208 && playerY <= 230 && playerX >= 50 && playerX <= 590
    
    // Debug logging for premiere zone
    if (playerY >= 200 && playerY <= 240 && playerX >= 40 && playerX <= 600) {
      console.log(`Player at (${Math.round(playerX)}, ${Math.round(playerY)}), in premiere zone: ${isInPremiereZone}, prompt shown: ${hasShownPremierePrompt}, cooldown: ${premierePromptCooldown}`)
    }
    
    // Only trigger premiere prompt if in zone, not already shown, and not in cooldown
    if (isInPremiereZone && !hasShownPremierePrompt && !premierePromptCooldown) {
      console.log('Triggering premiere prompt!')
      setShowPremierePrompt(true)
      setHasShownPremierePrompt(true)
    }

    // Render scene
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(backgroundCanvasRef.current, 0, 0)
    
    // Draw exit to main island indicator
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
    ctx.fillRect(304, 296, 32, 23) // Highlight the exit area (X: 304-321, Y: 296-306)
    
    // Draw premiere interaction zone indicator (bar from y=208)
    ctx.fillStyle = 'rgba(255, 215, 0, 0.2)' // Gold color for premiere zone
    ctx.fillRect(50, 208, 540, 22) // Highlight the premiere bar area (X: 50-590, Y: 208-230)
    
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
        if (showPremiereModal) {
          setShowPremiereModal(false)
          return
        }
        if (showPremierePrompt) {
          handleStayInCinemaFromPremiere()
          return
        }
        if (showExitPrompt) {
          handleStayInCinema()
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
  }, [sendPlayerInput, showExitPrompt, showPremierePrompt, showPremiereModal, handleStayInCinema, handleStayInCinemaFromPremiere])

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
      // Cleanup premiere cooldown timeout and interval
      if (premiereCooldownTimeoutRef.current) {
        clearTimeout(premiereCooldownTimeoutRef.current)
      }
      if (premiereCooldownIntervalRef.current) {
        clearInterval(premiereCooldownIntervalRef.current)
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
        {/* Player Status */}
        <PlayerStatus />

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
          
          <div style={{ color: '#d2b48c', marginBottom: '4px', fontWeight: 'bold' }}>🎬 CINEMA STATUS</div>
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
            🎬 Loading cinema...
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

        {/* Premiere Interaction Prompt */}
        {showPremierePrompt && (
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
              border: '3px solid #ff6b35',
              borderRadius: '15px',
              padding: '30px',
              textAlign: 'center',
              maxWidth: '400px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
            }}>
              <h2 style={{
                color: '#ff6b35',
                fontSize: '24px',
                marginBottom: '10px',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
              }}>
                🎬 Premiere Theater! 🎬
              </h2>
              
              <p style={{
                color: '#ccc',
                fontSize: '16px',
                marginBottom: '25px',
                lineHeight: '1.4'
              }}>
                Welcome to the premiere screening area!
                <br />Discover upcoming video premieres and exclusive content.
              </p>
              
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button
                  onClick={handleStayInCinemaFromPremiere}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#777'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#666'}
                >
                  Stay in Cinema
                </button>
                
                <button
                  onClick={handleOpenPremiereHub}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#ff6b35',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s'
                  }}
                >
                  View Premieres
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

        {/* Premiere Hub Modal */}
        {showPremiereModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1001
          }}>
            <div style={{
              backgroundColor: '#1a1a1a',
              border: '3px solid #ff6b35',
              borderRadius: '15px',
              padding: '30px',
              width: '90vw',
              maxWidth: '900px',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{
                  color: '#ff6b35',
                  fontSize: '28px',
                  margin: 0,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                }}>
                  🎬 Video Premieres - Exclusive Screenings
                </h2>
                <button
                  onClick={() => setShowPremiereModal(false)}
                  style={{
                    backgroundColor: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    fontSize: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
              </div>
              
              {loadingPremieres ? (
                <div style={{
                  textAlign: 'center',
                  color: '#fff',
                  fontSize: '18px',
                  padding: '50px'
                }}>
                  🎬 Loading premieres from the blockchain...
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '20px',
                  maxHeight: '500px',
                  overflow: 'auto'
                }}>
                  {premieres.length === 0 ? (
                    <div style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      color: '#ccc',
                      fontSize: '16px',
                      padding: '50px'
                    }}>
                      🎭 No premieres scheduled yet. Create one in the business dashboard!
                    </div>
                  ) : (
                    premieres.map((premiere) => (
                      <div
                        key={premiere.id}
                        style={{
                          backgroundColor: '#2a2a2a',
                          border: '2px solid #444',
                          borderRadius: '10px',
                          padding: '20px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-5px)'
                          e.currentTarget.style.borderColor = '#ff6b35'
                          e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.3)'
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.borderColor = '#444'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                        onClick={() => setSelectedPremiere(premiere)}
                      >
                        <h3 style={{
                          color: '#fff',
                          fontSize: '18px',
                          marginBottom: '10px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {premiere.title}
                        </h3>
                        
                        <p style={{
                          color: '#ccc',
                          fontSize: '14px',
                          marginBottom: '15px',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {premiere.description || 'No description available'}
                        </p>
                        
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px',
                          color: '#888',
                          marginBottom: '10px'
                        }}>
                          <span>👤 {premiere.organizer.slice(0, 6)}...{premiere.organizer.slice(-4)}</span>
                          <span>🎪 {premiere.attendeeCount}/{premiere.capacity}</span>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px',
                          color: '#888'
                        }}>
                          <span>🕒 {premiere.scheduledTime.toLocaleDateString()}</span>
                          <span>⏰ {premiere.scheduledTime.toLocaleTimeString()}</span>
                        </div>
                        
                        {premiere.isActive && (
                          <div style={{
                            marginTop: '10px',
                            backgroundColor: '#4ade80',
                            color: 'white',
                            fontSize: '12px',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            display: 'inline-block'
                          }}>
                            🟢 Active
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
              
              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#2a2a2a',
                borderRadius: '10px',
                border: '2px solid #4ade80'
              }}>
                <h4 style={{
                  color: '#4ade80',
                  fontSize: '16px',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  🎭 Cinema Features
                </h4>
                <p style={{
                  color: '#ccc',
                  fontSize: '12px',
                  margin: 0
                }}>
                  • Click any premiere to view details<br />
                  • Join scheduled screenings<br />
                  • Interact with other viewers<br />
                  • Earn rewards for attendance
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Game Chat */}
      <GameChat
        room="cinema"
        username="Viewer"
        isVisible={true}
      />
    </div>
  )
}

export default Cinema