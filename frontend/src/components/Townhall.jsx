import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import Player from '../game/classes/Player'
import MultiPlayer from '../game/classes/MultiPlayer'
import CollisionBlock from '../game/classes/CollisionBlock'
import GameChat from './GameChat'
import TokenBalance from './TokenBalance'
import PlayerStatus from './PlayerStatus'
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

  // Project popup states
  const [showUploadPopup, setShowUploadPopup] = useState(false)
  const [showShowcasePopup, setShowShowcasePopup] = useState(false)
  const [showVotingPopup, setShowVotingPopup] = useState(false)
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0)
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    technologies: '',
    githubUrl: '',
    imageUrl: ''
  })

  console.log('Townhall state:', { isLoading, error, connected, playerCount })

  // Mock project data for showcase and voting
  const mockProjects = [
    {
      id: 1,
      title: "DeFi Yield Farming Dashboard",
      description: "A comprehensive dashboard for tracking yield farming opportunities across multiple DeFi protocols with real-time APY calculations and risk assessment.",
      technologies: ["React", "Web3", "Ethereum", "DeFi", "Chart.js"],
      githubUrl: "https://github.com/user/defi-dashboard",
      imageUrl: "/images/project1.jpg",
      author: "CryptoDev",
      votes: 127,
      category: "DeFi"
    },
    {
      id: 2,
      title: "NFT Marketplace with Royalties",
      description: "A decentralized NFT marketplace featuring automatic royalty distribution, lazy minting, and cross-chain compatibility.",
      technologies: ["Next.js", "Solidity", "IPFS", "Polygon", "OpenSea API"],
      githubUrl: "https://github.com/user/nft-marketplace",
      imageUrl: "/images/project2.jpg",
      author: "NFTBuilder",
      votes: 89,
      category: "NFT"
    },
    {
      id: 3,
      title: "DAO Governance Platform",
      description: "A complete DAO governance solution with proposal creation, voting mechanisms, and treasury management for decentralized organizations.",
      technologies: ["Vue.js", "Web3", "Gnosis Safe", "Snapshot", "Aragon"],
      githubUrl: "https://github.com/user/dao-governance",
      imageUrl: "/images/project3.jpg",
      author: "DAOMaster",
      votes: 156,
      category: "Governance"
    },
    {
      id: 4,
      title: "Cross-Chain Bridge Interface",
      description: "A user-friendly interface for bridging assets between different blockchain networks with real-time transaction tracking.",
      technologies: ["React", "Web3", "LayerZero", "Wormhole", "Axelar"],
      githubUrl: "https://github.com/user/cross-chain-bridge",
      imageUrl: "/images/project4.jpg",
      author: "BridgeBuilder",
      votes: 203,
      category: "Infrastructure"
    },
    {
      id: 5,
      title: "Web3 Social Media Platform",
      description: "A decentralized social media platform where users own their content and data, with token-based rewards for engagement.",
      technologies: ["React", "Solidity", "IPFS", "Lens Protocol", "Arweave"],
      githubUrl: "https://github.com/user/web3-social",
      imageUrl: "/images/project5.jpg",
      author: "SocialCrypto",
      votes: 78,
      category: "Social"
    },
    {
      id: 6,
      title: "GameFi Battle Arena",
      description: "A play-to-earn battle arena game where players can earn tokens through strategic gameplay and NFT ownership.",
      technologies: ["Unity", "Web3", "Polygon", "Chainlink VRF", "OpenSea"],
      githubUrl: "https://github.com/user/gamefi-arena",
      imageUrl: "/images/project6.jpg",
      author: "GameDev",
      votes: 234,
      category: "GameFi"
    }
  ]

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
    
    // Check for project interaction zones
    const isInUploadZone = playerX >= 87 && playerX <= 111 && playerY >= 123 && playerY <= 133
    const isInShowcaseZone = playerX >= 287 && playerX <= 299 && playerY >= 123 && playerY <= 133
    const isInVotingZone = playerX >= 510 && playerX <= 520 && playerY >= 123 && playerY <= 133
    
    // Debug logging (remove in production)
    if (playerX >= 300 && playerX <= 315 && playerY >= 280 && playerY <= 300) {
      console.log(`Player at (${Math.round(playerX)}, ${Math.round(playerY)}), in exit zone: ${isInExitZone}, prompt shown: ${hasShownExitPrompt}, cooldown: ${exitPromptCooldown}`)
    }
    
    if (playerX >= 80 && playerX <= 120 && playerY >= 120 && playerY <= 140) {
      console.log(`Player at (${Math.round(playerX)}, ${Math.round(playerY)}), in upload zone: ${isInUploadZone}`)
    }
    
    if (playerX >= 280 && playerX <= 310 && playerY >= 120 && playerY <= 140) {
      console.log(`Player at (${Math.round(playerX)}, ${Math.round(playerY)}), in showcase zone: ${isInShowcaseZone}`)
    }
    
    if (playerX >= 500 && playerX <= 530 && playerY >= 120 && playerY <= 140) {
      console.log(`Player at (${Math.round(playerX)}, ${Math.round(playerY)}), in voting zone: ${isInVotingZone}`)
    }
    
    // Only trigger exit prompt if in zone, not already shown, and not in cooldown
    if (isInExitZone && !hasShownExitPrompt && !exitPromptCooldown) {
      console.log('Triggering exit prompt!')
      setShowExitPrompt(true)
      setHasShownExitPrompt(true)
    }

    // Trigger project popups when in respective zones
    if (isInUploadZone && !showUploadPopup) {
      console.log('Triggering upload popup!')
      setShowUploadPopup(true)
    }

    if (isInShowcaseZone && !showShowcasePopup) {
      console.log('Triggering showcase popup!')
      setShowShowcasePopup(true)
      setCurrentProjectIndex(0)
    }

    if (isInVotingZone && !showVotingPopup) {
      console.log('Triggering voting popup!')
      setShowVotingPopup(true)
    }

    // Render scene
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(backgroundCanvasRef.current, 0, 0)
    
    // Draw exit to main island indicator
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
    ctx.fillRect(303, 300, 17, 19) // Highlight the exit area (X: 303-310, Y: 284-294)
    
    // Draw project interaction zones
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)'
    ctx.fillRect(87, 123, 24, 10) // Upload zone (X: 87-111, Y: 123-133)
    
    ctx.fillStyle = 'rgba(0, 100, 255, 0.3)'
    ctx.fillRect(287, 123, 12, 10) // Showcase zone (X: 287-299, Y: 123-133)
    
    ctx.fillStyle = 'rgba(255, 0, 255, 0.3)'
    ctx.fillRect(511, 127, 12, 10) // Voting zone (X: 513-525, Y: 123-133)
    
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
      // Handle ESC key to close exit prompt or project popups
      if (e.key === 'Escape') {
        if (showExitPrompt) {
          handleStayInTownhall()
          return
        }
        if (showUploadPopup) {
          setShowUploadPopup(false)
          return
        }
        if (showShowcasePopup) {
          setShowShowcasePopup(false)
          return
        }
        if (showVotingPopup) {
          setShowVotingPopup(false)
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
  }, [sendPlayerInput, showExitPrompt, showUploadPopup, showShowcasePopup, showVotingPopup, handleStayInTownhall])

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

        {/* Project Upload Popup */}
        {showUploadPopup && (
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
              backgroundColor: '#2a1810',
              border: '3px solid #8b4513',
              borderRadius: '0',
              boxShadow: '6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321',
              padding: '30px',
              textAlign: 'left',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflowY: 'auto',
              fontFamily: 'monospace',
              imageRendering: 'pixelated',
              textShadow: '2px 2px 0px #1a0f08',
              position: 'relative'
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

              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '25px',
                borderBottom: '3px solid #8b4513',
                paddingBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#d2b48c', fontSize: '2rem' }}>📤</span>
                  <h2 style={{
                    color: '#d2b48c',
                    fontSize: '24px',
                    margin: 0,
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 0px #1a0f08'
                  }}>
                    Upload Your Project
                  </h2>
                </div>
                <button
                  onClick={() => setShowUploadPopup(false)}
                  style={{
                    backgroundColor: '#ff6b6b',
                    color: '#ffffff',
                    border: '2px solid #8b4513',
                    borderRadius: '0',
                    width: '35px',
                    height: '35px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    textShadow: '1px 1px 0px #1a0f08',
                    boxShadow: '3px 3px 0px #1a0f08'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Form */}
              <div style={{ marginBottom: '25px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    color: '#d2b48c',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'block',
                    marginBottom: '8px',
                    textShadow: '1px 1px 0px #1a0f08'
                  }}>
                    🏷️ Project Title
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#1a0f08',
                      border: '2px solid #8b4513',
                      borderRadius: '0',
                      color: '#d2b48c',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      boxShadow: '3px 3px 0px #1a0f08'
                    }}
                    placeholder="Enter your project title..."
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    color: '#d2b48c',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'block',
                    marginBottom: '8px',
                    textShadow: '1px 1px 0px #1a0f08'
                  }}>
                    📝 Description
                  </label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                    rows="4"
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#1a0f08',
                      border: '2px solid #8b4513',
                      borderRadius: '0',
                      color: '#d2b48c',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      boxShadow: '3px 3px 0px #1a0f08',
                      resize: 'vertical'
                    }}
                    placeholder="Describe your project..."
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    color: '#d2b48c',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'block',
                    marginBottom: '8px',
                    textShadow: '1px 1px 0px #1a0f08'
                  }}>
                    ⚔️ Technologies Used
                  </label>
                  <input
                    type="text"
                    value={uploadForm.technologies}
                    onChange={(e) => setUploadForm({...uploadForm, technologies: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#1a0f08',
                      border: '2px solid #8b4513',
                      borderRadius: '0',
                      color: '#d2b48c',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      boxShadow: '3px 3px 0px #1a0f08'
                    }}
                    placeholder="React, Web3, Solidity, etc..."
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    color: '#d2b48c',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'block',
                    marginBottom: '8px',
                    textShadow: '1px 1px 0px #1a0f08'
                  }}>
                    🔗 GitHub Repository
                  </label>
                  <input
                    type="url"
                    value={uploadForm.githubUrl}
                    onChange={(e) => setUploadForm({...uploadForm, githubUrl: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#1a0f08',
                      border: '2px solid #8b4513',
                      borderRadius: '0',
                      color: '#d2b48c',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      boxShadow: '3px 3px 0px #1a0f08'
                    }}
                    placeholder="https://github.com/username/project"
                  />
                </div>

                <div style={{ marginBottom: '25px' }}>
                  <label style={{
                    color: '#d2b48c',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    display: 'block',
                    marginBottom: '8px',
                    textShadow: '1px 1px 0px #1a0f08'
                  }}>
                    🖼️ Project Image URL
                  </label>
                  <input
                    type="url"
                    value={uploadForm.imageUrl}
                    onChange={(e) => setUploadForm({...uploadForm, imageUrl: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#1a0f08',
                      border: '2px solid #8b4513',
                      borderRadius: '0',
                      color: '#d2b48c',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      boxShadow: '3px 3px 0px #1a0f08'
                    }}
                    placeholder="https://example.com/project-image.jpg"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                borderTop: '3px solid #8b4513',
                paddingTop: '20px'
              }}>
                <button
                  onClick={() => {
                    alert('Project uploaded successfully')
                    setShowUploadPopup(false)
                    setUploadForm({ title: '', description: '', technologies: '', githubUrl: '', imageUrl: '' })
                  }}
                  style={{
                    backgroundColor: '#44ff44',
                    color: '#1a0f08',
                    border: '2px solid #8b4513',
                    borderRadius: '0',
                    padding: '12px 30px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    textShadow: '1px 1px 0px #ffffff',
                    boxShadow: '3px 3px 0px #1a0f08'
                  }}
                >
                  🚀 SUBMIT PROJECT
                </button>
              </div>

              <p style={{
                color: '#d2b48c',
                fontSize: '12px',
                marginTop: '20px',
                fontStyle: 'italic',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                textShadow: '1px 1px 0px #1a0f08'
              }}>
                Press ESC to close this dialog
              </p>
            </div>
          </div>
        )}

        {/* Project Showcase Popup */}
        {showShowcasePopup && (
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
              backgroundColor: '#2a1810',
              border: '3px solid #8b4513',
              borderRadius: '0',
              boxShadow: '6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321',
              padding: '30px',
              textAlign: 'left',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflowY: 'auto',
              fontFamily: 'monospace',
              imageRendering: 'pixelated',
              textShadow: '2px 2px 0px #1a0f08',
              position: 'relative'
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

              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '25px',
                borderBottom: '3px solid #8b4513',
                paddingBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#d2b48c', fontSize: '2rem' }}>🏆</span>
                  <h2 style={{
                    color: '#d2b48c',
                    fontSize: '24px',
                    margin: 0,
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 0px #1a0f08'
                  }}>
                    Project Showcase
                  </h2>
                </div>
                <button
                  onClick={() => setShowShowcasePopup(false)}
                  style={{
                    backgroundColor: '#ff6b6b',
                    color: '#ffffff',
                    border: '2px solid #8b4513',
                    borderRadius: '0',
                    width: '35px',
                    height: '35px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    textShadow: '1px 1px 0px #1a0f08',
                    boxShadow: '3px 3px 0px #1a0f08'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Project Content */}
              <div style={{ marginBottom: '25px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <span style={{
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    backgroundColor: '#1a0f08',
                    border: '2px solid #8b4513',
                    borderRadius: '0',
                    padding: '8px 12px',
                    fontFamily: 'monospace',
                    textShadow: '1px 1px 0px #1a0f08',
                    boxShadow: '3px 3px 0px #1a0f08'
                  }}>
                    👤 {mockProjects[currentProjectIndex].author}
                  </span>
                  <span style={{
                    color: '#ffd700',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold'
                  }}>
                    🏷️ {mockProjects[currentProjectIndex].category}
                  </span>
                </div>

                <h3 style={{
                  color: '#d2b48c',
                  fontSize: '20px',
                  marginBottom: '15px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  textShadow: '2px 2px 0px #1a0f08'
                }}>
                  {mockProjects[currentProjectIndex].title}
                </h3>

                <p style={{
                  color: '#d2b48c',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  marginBottom: '20px',
                  fontFamily: 'monospace',
                  textShadow: '1px 1px 0px #1a0f08'
                }}>
                  {mockProjects[currentProjectIndex].description}
                </p>

                {/* Technologies */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{
                    color: '#d2b48c',
                    fontSize: '16px',
                    marginBottom: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 0px #1a0f08'
                  }}>
                    ⚔️ Technologies Used:
                  </h4>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    {mockProjects[currentProjectIndex].technologies.map((tech, index) => (
                      <span
                        key={index}
                        style={{
                          backgroundColor: '#1a0f08',
                          color: '#ffffff',
                          border: '2px solid #8b4513',
                          borderRadius: '0',
                          padding: '4px 8px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                          textShadow: '1px 1px 0px #1a0f08',
                          boxShadow: '3px 3px 0px #1a0f08'
                        }}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* GitHub Link */}
                <div style={{ marginBottom: '20px' }}>
                  <a
                    href={mockProjects[currentProjectIndex].githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#44ff44',
                      textDecoration: 'none',
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      textShadow: '1px 1px 0px #1a0f08'
                    }}
                  >
                    🔗 View on GitHub
                  </a>
                </div>
              </div>

              {/* Navigation */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '3px solid #8b4513',
                paddingTop: '20px'
              }}>
                <button
                  onClick={() => {
                    const newIndex = currentProjectIndex > 0 ? currentProjectIndex - 1 : mockProjects.length - 1
                    setCurrentProjectIndex(newIndex)
                  }}
                  style={{
                    backgroundColor: '#44ff44',
                    color: '#1a0f08',
                    border: '2px solid #8b4513',
                    borderRadius: '0',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    textShadow: '1px 1px 0px #ffffff',
                    boxShadow: '3px 3px 0px #1a0f08'
                  }}
                >
                  ← PREVIOUS
                </button>

                <span style={{
                  color: '#ffd700',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  textShadow: '1px 1px 0px #1a0f08'
                }}>
                  {currentProjectIndex + 1} of {mockProjects.length}
                </span>

                <button
                  onClick={() => {
                    const newIndex = currentProjectIndex < mockProjects.length - 1 ? currentProjectIndex + 1 : 0
                    setCurrentProjectIndex(newIndex)
                  }}
                  style={{
                    backgroundColor: '#44ff44',
                    color: '#1a0f08',
                    border: '2px solid #8b4513',
                    borderRadius: '0',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    textShadow: '1px 1px 0px #ffffff',
                    boxShadow: '3px 3px 0px #1a0f08'
                  }}
                >
                  NEXT →
                </button>
              </div>

              <p style={{
                color: '#d2b48c',
                fontSize: '12px',
                marginTop: '20px',
                fontStyle: 'italic',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                textShadow: '1px 1px 0px #1a0f08'
              }}>
                Press ESC to close this dialog
              </p>
            </div>
          </div>
        )}

        {/* Project Voting Popup */}
        {showVotingPopup && (
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
              backgroundColor: '#2a1810',
              border: '3px solid #8b4513',
              borderRadius: '0',
              boxShadow: '6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321',
              padding: '30px',
              textAlign: 'left',
              maxWidth: '700px',
              maxHeight: '80vh',
              overflowY: 'auto',
              fontFamily: 'monospace',
              imageRendering: 'pixelated',
              textShadow: '2px 2px 0px #1a0f08',
              position: 'relative'
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

              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '25px',
                borderBottom: '3px solid #8b4513',
                paddingBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#d2b48c', fontSize: '2rem' }}>🗳️</span>
                  <h2 style={{
                    color: '#d2b48c',
                    fontSize: '24px',
                    margin: 0,
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    textShadow: '2px 2px 0px #1a0f08'
                  }}>
                    Project Voting System
                  </h2>
                </div>
                <button
                  onClick={() => setShowVotingPopup(false)}
                  style={{
                    backgroundColor: '#ff6b6b',
                    color: '#ffffff',
                    border: '2px solid #8b4513',
                    borderRadius: '0',
                    width: '35px',
                    height: '35px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    textShadow: '1px 1px 0px #1a0f08',
                    boxShadow: '3px 3px 0px #1a0f08'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Voting Instructions */}
              <div style={{
                backgroundColor: '#1a0f08',
                border: '2px solid #8b4513',
                borderRadius: '0',
                padding: '15px',
                marginBottom: '25px',
                boxShadow: '3px 3px 0px #1a0f08'
              }}>
                <p style={{
                  color: '#ffd700',
                  fontSize: '16px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  textShadow: '1px 1px 0px #1a0f08',
                  margin: 0
                }}>
                  🏆 Vote for the best Web3 project! Each vote helps determine the community's favorite.
                </p>
              </div>

              {/* Projects List */}
              <div style={{ marginBottom: '25px' }}>
                {mockProjects
                  .sort((a, b) => b.votes - a.votes)
                  .map((project, index) => (
                    <div
                      key={project.id}
                      style={{
                        backgroundColor: '#1a0f08',
                        border: '2px solid #8b4513',
                        borderRadius: '0',
                        padding: '15px',
                        marginBottom: '15px',
                        boxShadow: '3px 3px 0px #1a0f08'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px'
                      }}>
                        <h4 style={{
                          color: '#d2b48c',
                          fontSize: '16px',
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                          textShadow: '1px 1px 0px #1a0f08',
                          margin: 0
                        }}>
                          #{index + 1} {project.title}
                        </h4>
                        <span style={{
                          color: '#ffd700',
                          fontSize: '14px',
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                          textShadow: '1px 1px 0px #1a0f08'
                        }}>
                          👤 {project.author}
                        </span>
                      </div>
                      
                      <p style={{
                        color: '#d2b48c',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        textShadow: '1px 1px 0px #1a0f08',
                        margin: '0 0 10px 0',
                        lineHeight: '1.4'
                      }}>
                        {project.description.substring(0, 100)}...
                      </p>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          color: '#44ff44',
                          fontSize: '14px',
                          fontFamily: 'monospace',
                          fontWeight: 'bold',
                          textShadow: '1px 1px 0px #1a0f08'
                        }}>
                          🗳️ {project.votes} votes
                        </span>
                        
                        <button
                          onClick={() => {
                            alert(`Voted for "${project.title}"!`)
                          }}
                          style={{
                            backgroundColor: '#44ff44',
                            color: '#1a0f08',
                            border: '2px solid #8b4513',
                            borderRadius: '0',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            fontWeight: 'bold',
                            textShadow: '1px 1px 0px #ffffff',
                            boxShadow: '3px 3px 0px #1a0f08'
                          }}
                        >
                          🗳️ VOTE
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              <p style={{
                color: '#d2b48c',
                fontSize: '12px',
                marginTop: '20px',
                fontStyle: 'italic',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                textShadow: '1px 1px 0px #1a0f08'
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