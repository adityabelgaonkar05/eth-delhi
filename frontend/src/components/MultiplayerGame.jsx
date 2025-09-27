import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from 'react-router-dom'
import { io } from "socket.io-client";
import Player from "../game/classes/Player";
import MultiPlayer from "../game/classes/MultiPlayer";
import CollisionBlock from "../game/classes/CollisionBlock";
import Sprite from "../game/classes/Sprite";
import TokenBalance from "./TokenBalance";
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
  l_New_Layer_13,
} from "../game/data/gameData";
import { loadImage } from "../game/utils/gameUtils";

const MultiplayerGame = () => {
  console.log("MultiplayerGame component rendering...");

  const navigate = useNavigate()
  const canvasRef = useRef(null);
  const playerRef = useRef(null); // Local player
  const otherPlayersRef = useRef(new Map()); // Other players
  const collisionBlocksRef = useRef([]);
  const spritesRef = useRef([]);
  const socketRef = useRef(null);
  const keysRef = useRef({
    w: { pressed: false },
    a: { pressed: false },
    s: { pressed: false },
    d: { pressed: false },
  });
  const backgroundCanvasRef = useRef(null);
  const animationIdRef = useRef(null);
  const lastTimeRef = useRef(performance.now());
  const elapsedTimeRef = useRef(0);

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)
  const [playerCount, setPlayerCount] = useState(0)
  const [playerCoords, setPlayerCoords] = useState({ x: 0, y: 0 })
  const [showLibraryPrompt, setShowLibraryPrompt] = useState(false)
  const [hasShownLibraryPrompt, setHasShownLibraryPrompt] = useState(false)
  const [libraryPromptCooldown, setLibraryPromptCooldown] = useState(false)
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0)
  const cooldownTimeoutRef = useRef(null)
  const cooldownIntervalRef = useRef(null)

  // Cinema room states
  const [showCinemaPrompt, setShowCinemaPrompt] = useState(false)
  const [hasShownCinemaPrompt, setHasShownCinemaPrompt] = useState(false)
  const [cinemaPromptCooldown, setCinemaPromptCooldown] = useState(false)
  const [cinemaCooldownTimeLeft, setCinemaCooldownTimeLeft] = useState(0)
  const cinemaCooldownTimeoutRef = useRef(null)
  const cinemaCooldownIntervalRef = useRef(null)

  // Townhall room states
  const [showTownhallPrompt, setShowTownhallPrompt] = useState(false)
  const [hasShownTownhallPrompt, setHasShownTownhallPrompt] = useState(false)
  const [townhallPromptCooldown, setTownhallPromptCooldown] = useState(false)
  const [townhallCooldownTimeLeft, setTownhallCooldownTimeLeft] = useState(0)
  const townhallCooldownTimeoutRef = useRef(null)
  const townhallCooldownIntervalRef = useRef(null)

  console.log("MultiplayerGame state:", {
    isLoading,
    error,
    connected,
    playerCount,
  });

  // Start cooldown period to prevent prompt spam
  const startCooldown = useCallback(() => {
    console.log('startCooldown called - setting cooldown to true')
    setLibraryPromptCooldown(true)
    setCooldownTimeLeft(5)
    
    // Clear any existing timeout and interval
    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current)
    }
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current)
    }
    
    // Start countdown interval
    cooldownIntervalRef.current = setInterval(() => {
      setCooldownTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(cooldownIntervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    // Set 5-second cooldown
    cooldownTimeoutRef.current = setTimeout(() => {
      console.log('Cooldown timeout triggered - setting cooldown to false')
      setLibraryPromptCooldown(false)
      setHasShownLibraryPrompt(false) // Reset so it can trigger again after cooldown
      setCooldownTimeLeft(0)
      console.log('Library prompt cooldown ended')
    }, 5000) // 5 seconds cooldown
  }, [])

  // Start cinema cooldown period to prevent prompt spam
  const startCinemaCooldown = useCallback(() => {
    console.log('startCinemaCooldown called - setting cooldown to true')
    setCinemaPromptCooldown(true)
    setCinemaCooldownTimeLeft(5)
    
    // Clear any existing timeout and interval
    if (cinemaCooldownTimeoutRef.current) {
      clearTimeout(cinemaCooldownTimeoutRef.current)
    }
    if (cinemaCooldownIntervalRef.current) {
      clearInterval(cinemaCooldownIntervalRef.current)
    }
    
    // Start countdown interval
    cinemaCooldownIntervalRef.current = setInterval(() => {
      setCinemaCooldownTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(cinemaCooldownIntervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    // Set 5-second cooldown
    cinemaCooldownTimeoutRef.current = setTimeout(() => {
      console.log('Cinema cooldown timeout triggered - setting cooldown to false')
      setCinemaPromptCooldown(false)
      setHasShownCinemaPrompt(false) // Reset so it can trigger again after cooldown
      setCinemaCooldownTimeLeft(0)
      console.log('Cinema prompt cooldown ended')
    }, 5000) // 5 seconds cooldown
  }, [])

  // Start townhall cooldown period to prevent prompt spam
  const startTownhallCooldown = useCallback(() => {
    console.log('startTownhallCooldown called - setting cooldown to true')
    setTownhallPromptCooldown(true)
    setTownhallCooldownTimeLeft(5)
    
    // Clear any existing timeout and interval
    if (townhallCooldownTimeoutRef.current) {
      clearTimeout(townhallCooldownTimeoutRef.current)
    }
    if (townhallCooldownIntervalRef.current) {
      clearInterval(townhallCooldownIntervalRef.current)
    }
    
    // Start countdown interval
    townhallCooldownIntervalRef.current = setInterval(() => {
      setTownhallCooldownTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(townhallCooldownIntervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    // Set 5-second cooldown
    townhallCooldownTimeoutRef.current = setTimeout(() => {
      console.log('Townhall cooldown timeout triggered - setting cooldown to false')
      setTownhallPromptCooldown(false)
      setHasShownTownhallPrompt(false) // Reset so it can trigger again after cooldown
      setTownhallCooldownTimeLeft(0)
      console.log('Townhall prompt cooldown ended')
    }, 5000) // 5 seconds cooldown
  }, [])

  // Handle library navigation
  const handleGoToLibrary = useCallback(() => {
    setShowLibraryPrompt(false)
    startCooldown()
    navigate('/library')
  }, [startCooldown, navigate])

  const handleStayInGame = useCallback(() => {
    console.log('handleStayInGame called - starting cooldown')
    setShowLibraryPrompt(false)
    startCooldown()
  }, [startCooldown])

  // Handle cinema navigation
  const handleGoToCinema = useCallback(() => {
    setShowCinemaPrompt(false)
    startCinemaCooldown()
    navigate('/cinema')
  }, [startCinemaCooldown, navigate])

  const handleStayInGameCinema = useCallback(() => {
    console.log('handleStayInGameCinema called - starting cooldown')
    setShowCinemaPrompt(false)
    startCinemaCooldown()
  }, [startCinemaCooldown])

  // Handle townhall navigation
  const handleGoToTownhall = useCallback(() => {
    setShowTownhallPrompt(false)
    startTownhallCooldown()
    navigate('/townhall')
  }, [startTownhallCooldown, navigate])

  const handleStayInGameTownhall = useCallback(() => {
    console.log('handleStayInGameTownhall called - starting cooldown')
    setShowTownhallPrompt(false)
    startTownhallCooldown()
  }, [startTownhallCooldown])

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
  };

  const tilesets = {
    l_New_Layer_1: { imageUrl: "/images/terrain.png", tileSize: 16 },
    l_New_Layer_2: { imageUrl: "/images/terrain.png", tileSize: 16 },
    l_New_Layer_3: { imageUrl: "/images/decorations.png", tileSize: 16 },
    l_New_Layer_4: { imageUrl: "/images/terrain.png", tileSize: 16 },
    l_New_Layer_5: { imageUrl: "/images/terrain.png", tileSize: 16 },
    l_New_Layer_6: { imageUrl: "/images/decorations.png", tileSize: 16 },
    l_New_Layer_8: { imageUrl: "/images/terrain.png", tileSize: 16 },
    l_New_Layer_9: { imageUrl: "/images/terrain.png", tileSize: 16 },
    l_New_Layer_10: { imageUrl: "/images/decorations.png", tileSize: 16 },
    l_New_Layer_11: { imageUrl: "/images/decorations.png", tileSize: 16 },
    l_New_Layer_7: { imageUrl: "/images/decorations.png", tileSize: 16 },
    l_New_Layer_12: { imageUrl: "/images/decorations.png", tileSize: 16 },
    l_New_Layer_13: { imageUrl: "/images/decorations.png", tileSize: 16 },
  };

  const renderLayer = (tilesData, tilesetImage, tileSize, context) => {
    const tilesPerRow = Math.ceil(tilesetImage.width / tileSize);

    tilesData.forEach((row, y) => {
      row.forEach((symbol, x) => {
        if (symbol !== 0) {
          const tileIndex = symbol - 1;
          const srcX = (tileIndex % tilesPerRow) * tileSize;
          const srcY = Math.floor(tileIndex / tilesPerRow) * tileSize;

          context.drawImage(
            tilesetImage,
            srcX,
            srcY,
            tileSize,
            tileSize,
            x * 16,
            y * 16,
            16,
            16
          );
        }
      });
    });
  };

  const renderStaticLayers = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    console.log("Creating offscreen canvas...");
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    const offscreenContext = offscreenCanvas.getContext("2d");

    try {
      let layersProcessed = 0;
      for (const [layerName, tilesData] of Object.entries(layersData)) {
        const tilesetInfo = tilesets[layerName];
        if (tilesetInfo) {
          console.log(
            `Loading tileset for ${layerName}: ${tilesetInfo.imageUrl}`
          );
          try {
            const tilesetImage = await loadImage(tilesetInfo.imageUrl);
            console.log(
              `Loaded tileset for ${layerName}, size: ${tilesetImage.width}x${tilesetImage.height}`
            );
            renderLayer(
              tilesData,
              tilesetImage,
              tilesetInfo.tileSize,
              offscreenContext
            );
            layersProcessed++;
          } catch (error) {
            console.error(
              `Failed to load image for layer ${layerName}:`,
              error
            );
            throw error;
          }
        }
      }
      console.log(`Successfully processed ${layersProcessed} layers`);
      return offscreenCanvas;
    } catch (error) {
      console.error("Error in renderStaticLayers:", error);
      throw error;
    }
  };

  // Initialize Socket.IO connection
  const initializeSocket = useCallback(() => {
    console.log("Initializing socket connection...");
    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to server:", socket.id);
      setConnected(true);
      // Emit room join for main game
      socket.emit("joinRoom", "main");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnected(false);
    });

    socket.on("gameState", (gameState) => {
      console.log("Received game state:", gameState);

      // Create other players
      Object.entries(gameState.players).forEach(([playerId, playerData]) => {
        if (playerId !== socket.id) {
          const otherPlayer = new MultiPlayer({
            id: playerId,
            x: playerData.x,
            y: playerData.y,
            size: playerData.size,
            color: playerData.color,
            isLocal: false,
          });
          otherPlayer.updateSprite(
            playerData.facing,
            playerData.currentSprite,
            playerData.moving
          );
          otherPlayersRef.current.set(playerId, otherPlayer);
        }
      });

      setPlayerCount(Object.keys(gameState.players).length);
    });

    socket.on("playerJoined", (playerData) => {
      console.log("Player joined:", playerData);
      const newPlayer = new MultiPlayer({
        id: playerData.id,
        x: playerData.x,
        y: playerData.y,
        size: playerData.size,
        color: playerData.color,
        isLocal: false,
      });
      otherPlayersRef.current.set(playerData.id, newPlayer);
      setPlayerCount((prev) => prev + 1);
    });

    socket.on("playerLeft", (playerId) => {
      console.log("Player left:", playerId);
      otherPlayersRef.current.delete(playerId);
      setPlayerCount((prev) => prev - 1);
    });

    socket.on("playerMoved", (data) => {
      const player = otherPlayersRef.current.get(data.id);
      if (player) {
        player.updatePosition(data.x, data.y);
        player.updateSprite(data.facing, data.currentSprite, data.moving);
      }
    });

    socket.on("playerInputChanged", (data) => {
      const player = otherPlayersRef.current.get(data.id);
      if (player) {
        player.updateSprite(data.facing, data.currentSprite, data.moving);
      }
    });

    return socket;
  }, []);

  // Initialize game objects
  const initializeGame = useCallback(async () => {
    console.log("initializeGame function called!");

    const canvas = canvasRef.current;
    console.log("Canvas ref:", canvas);
    if (!canvas) {
      console.log("Canvas not found, returning early");
      setError("Failed to initialize canvas");
      return;
    }

    console.log("Initializing multiplayer game...");

    try {
      const dpr = window.devicePixelRatio || 1;
      // Main map is 40 tiles wide × 20 tiles high, each tile is 16px
      canvas.width = 40 * 16 * dpr; // 640px
      canvas.height = 20 * 16 * dpr; // 320px

      // Create collision blocks
      const blockSize = 16;
      const collisionBlocks = [];
      collisions.forEach((row, y) => {
        row.forEach((symbol, x) => {
          if (symbol === 1) {
            collisionBlocks.push(
              new CollisionBlock({
                x: x * blockSize,
                y: y * blockSize,
                size: blockSize,
              })
            );
          }
        });
      });
      collisionBlocksRef.current = collisionBlocks;
      console.log("Created", collisionBlocks.length, "collision blocks");

      // Create local player
      playerRef.current = new Player({
        x: 143,
        y: 100,
        size: 15,
      });
      console.log("Created local player");

      // Initialize falling leaves
      spritesRef.current = [
        new Sprite({
          x: 20,
          y: 20,
          velocity: {
            x: 0.08,
            y: 0.08,
          },
        }),
      ];
      console.log("Created sprites");

      // Initialize socket connection
      initializeSocket();

      // Render background
      console.log("Rendering static layers...");
      const backgroundCanvas = await renderStaticLayers();
      if (backgroundCanvas) {
        backgroundCanvasRef.current = backgroundCanvas;
        console.log("Background rendered successfully");
        setIsLoading(false);
      } else {
        throw new Error("Failed to create background canvas");
      }
    } catch (error) {
      console.error("Game initialization error:", error);
      setError(`Failed to initialize game: ${error.message}`);
    }
  }, [initializeSocket]);

  // Send player movement to server
  // Send player movement to server
  const sendPlayerMovement = useCallback(() => {
    if (socketRef.current && playerRef.current) {
      const coords = {
        x: playerRef.current.x,
        y: playerRef.current.y,
        facing: playerRef.current.facing,
        currentSprite:
          playerRef.current.facing === "down"
            ? "walkDown"
            : playerRef.current.facing === "up"
            ? "walkUp"
            : playerRef.current.facing === "left"
            ? "walkLeft"
            : "walkRight",
        moving:
          playerRef.current.velocity.x !== 0 ||
          playerRef.current.velocity.y !== 0,
        room: "main",
      };

      // Update coordinate display with socket data
      setPlayerCoords({ x: coords.x, y: coords.y });

      socketRef.current.emit("playerMove", coords);
    }
  }, []);

  // Send player input changes immediately
  const sendPlayerInput = useCallback((facing, moving) => {
    if (socketRef.current) {
      const currentSprite =
        facing === "down"
          ? "walkDown"
          : facing === "up"
          ? "walkUp"
          : facing === "left"
          ? "walkLeft"
          : "walkRight";

      socketRef.current.emit("playerInput", {
        facing,
        currentSprite,
        moving,
        room: "main",
      });
    }
  }, []);

  // Game animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !playerRef.current || !backgroundCanvasRef.current) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    // Calculate delta time
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTimeRef.current) / 1000;
    lastTimeRef.current = currentTime;
    elapsedTimeRef.current += deltaTime;

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
      );
      elapsedTimeRef.current = 0;
    }

    // Update local player
    const wasMoving =
      playerRef.current.velocity.x !== 0 || playerRef.current.velocity.y !== 0;
    playerRef.current.handleInput(keysRef.current);
    playerRef.current.update(deltaTime, collisionBlocksRef.current);
    const isMoving =
      playerRef.current.velocity.x !== 0 || playerRef.current.velocity.y !== 0;

    // Check for library interaction zone (coordinates 258,80 to 272,80)
    const playerX = playerRef.current.x
    const playerY = playerRef.current.y
    const isInLibraryZone = playerX >= 258 && playerX <= 272 && playerY >= 75 && playerY <= 85
    
    // Check for cinema interaction zone (coordinates 481,117)
    const isInCinemaZone = playerX >= 475 && playerX <= 485 && playerY >= 112 && playerY <= 122
    
    // Check for townhall interaction zone (coordinates 259,224)
    const isInTownhallZone = playerX >= 253 && playerX <= 265 && playerY >= 219 && playerY <= 229
    
    // Debug logging (remove in production)
    if (playerX >= 250 && playerX <= 280 && playerY >= 70 && playerY <= 90) {
      console.log(`Player at (${Math.round(playerX)}, ${Math.round(playerY)}), in library zone: ${isInLibraryZone}, prompt shown: ${hasShownLibraryPrompt}, cooldown: ${libraryPromptCooldown}`)
    }
    if (playerX >= 470 && playerX <= 490 && playerY >= 110 && playerY <= 125) {
      console.log(`Player at (${Math.round(playerX)}, ${Math.round(playerY)}), in cinema zone: ${isInCinemaZone}, prompt shown: ${hasShownCinemaPrompt}, cooldown: ${cinemaPromptCooldown}`)
    }
    if (playerX >= 250 && playerX <= 270 && playerY >= 215 && playerY <= 235) {
      console.log(`Player at (${Math.round(playerX)}, ${Math.round(playerY)}), in townhall zone: ${isInTownhallZone}, prompt shown: ${hasShownTownhallPrompt}, cooldown: ${townhallPromptCooldown}`)
    }
    
    // Only trigger library prompt if in zone, not already shown, and not in cooldown
    if (isInLibraryZone && !hasShownLibraryPrompt && !libraryPromptCooldown) {
      console.log('Triggering library prompt!')
      setShowLibraryPrompt(true)
      setHasShownLibraryPrompt(true)
    }
    
    // Only trigger cinema prompt if in zone, not already shown, and not in cooldown
    if (isInCinemaZone && !hasShownCinemaPrompt && !cinemaPromptCooldown) {
      console.log('Triggering cinema prompt!')
      setShowCinemaPrompt(true)
      setHasShownCinemaPrompt(true)
    }
    
    // Only trigger townhall prompt if in zone, not already shown, and not in cooldown
    if (isInTownhallZone && !hasShownTownhallPrompt && !townhallPromptCooldown) {
      console.log('Triggering townhall prompt!')
      setShowTownhallPrompt(true)
      setHasShownTownhallPrompt(true)
    }
    
    // Don't reset the prompt state when leaving zone - let cooldown handle it
    // This prevents the loop issue

    // Send movement updates
    sendPlayerMovement();

    // Send input state changes immediately for responsiveness
    if (wasMoving !== isMoving) {
      sendPlayerInput(playerRef.current.facing, isMoving);
    }

    // Update other players
    otherPlayersRef.current.forEach((player) => {
      player.update(deltaTime);
    });

    // Render scene
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(backgroundCanvasRef.current, 0, 0)

    // Draw library entrance indicator
    ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'
    ctx.fillRect(257, 75, 14, 10) // Highlight the library entrance area (X: 258-272, Y: 75-85)
    
    // Draw cinema entrance indicator
    ctx.fillStyle = 'rgba(255, 0, 255, 0.3)'
    ctx.fillRect(481.5, 120, 13, 10) // Highlight the cinema entrance area (X: 475-485, Y: 112-122)
    
    // Draw townhall entrance indicator
    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)'
    ctx.fillRect(258, 219, 13, 10) // Highlight the townhall entrance area (X: 253-265, Y: 219-229)
    
    // Draw local player
    playerRef.current.draw(ctx);

    // Draw other players
    otherPlayersRef.current.forEach((player) => {
      player.draw(ctx);
    });

    // Update and render falling leaves
    for (let i = spritesRef.current.length - 1; i >= 0; i--) {
      const leaf = spritesRef.current[i];
      leaf.update(deltaTime);
      leaf.draw(ctx);

      if (leaf.alpha <= 0) {
        spritesRef.current.splice(i, 1);
      }
    }

    ctx.restore();

    animationIdRef.current = requestAnimationFrame(animate);
  }, [sendPlayerMovement, sendPlayerInput]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle ESC key to close prompts
      if (e.key === 'Escape') {
        if (showLibraryPrompt) {
          handleStayInGame()
          return
        }
        if (showCinemaPrompt) {
          handleStayInGameCinema()
          return
        }
        if (showTownhallPrompt) {
          handleStayInGameTownhall()
          return
        }
      }

      const wasPressed = Object.values(keysRef.current).some(key => key.pressed)
      
      switch (e.key.toLowerCase()) {
        case "w":
        case "arrowup":
          keysRef.current.w.pressed = true;
          break;
        case "a":
        case "arrowleft":
          keysRef.current.a.pressed = true;
          break;
        case "s":
        case "arrowdown":
          keysRef.current.s.pressed = true;
          break;
        case "d":
        case "arrowright":
          keysRef.current.d.pressed = true;
          break;
      }

      const isPressed = Object.values(keysRef.current).some(
        (key) => key.pressed
      );
      if (!wasPressed && isPressed && playerRef.current) {
        sendPlayerInput(playerRef.current.facing, true);
      }
    };

    const handleKeyUp = (e) => {
      switch (e.key.toLowerCase()) {
        case "w":
        case "arrowup":
          keysRef.current.w.pressed = false;
          break;
        case "a":
        case "arrowleft":
          keysRef.current.a.pressed = false;
          break;
        case "s":
        case "arrowdown":
          keysRef.current.s.pressed = false;
          break;
        case "d":
        case "arrowright":
          keysRef.current.d.pressed = false;
          break;
      }

      const isPressed = Object.values(keysRef.current).some(
        (key) => key.pressed
      );
      if (!isPressed && playerRef.current) {
        sendPlayerInput(playerRef.current.facing, false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [sendPlayerInput, showLibraryPrompt, showCinemaPrompt, showTownhallPrompt, handleStayInGame, handleStayInGameCinema, handleStayInGameTownhall])

  // Initialize game on component mount
  useEffect(() => {
    console.log("MultiplayerGame useEffect triggered - initializing game...");
    const init = async () => {
      try {
        await initializeGame();
      } catch (error) {
        console.error("Error during game initialization:", error);
        setError(`Initialization failed: ${error.message}`);
      }
    };
    init();

    return () => {
      console.log("MultiplayerGame component cleanup");
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      // Cleanup cooldown timeout and interval
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current)
      }
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current)
      }
    }
  }, [])

  // Start animation loop when not loading
  useEffect(() => {
    if (!isLoading && !error) {
      animate();
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isLoading, error, animate]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#333",
        position: "relative",
      }}
    >
      <div>
        {/* Token Balance */}
        <TokenBalance />

        {/* Connection status */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            color: "white",
            background: "rgba(0,0,0,0.7)",
            padding: "10px",
            borderRadius: "5px",
            fontSize: "14px",
          }}
        >
          <div>Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}</div>
          <div>Players: {playerCount}</div>
        </div>

        {/* Player coordinates */}
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            right: "10px",
            color: "white",
            background: "rgba(0,0,0,0.7)",
            padding: "8px",
            borderRadius: "5px",
            fontSize: "12px",
            fontFamily: "monospace",
          }}
        >
          <div>X: {Math.round(playerCoords.x)}</div>
          <div>Y: {Math.round(playerCoords.y)}</div>
          {libraryPromptCooldown && (
            <div style={{ color: '#ff6b6b', fontSize: '10px', marginTop: '2px' }}>
              Library cooldown: {cooldownTimeLeft}s
            </div>
          )}
          {cinemaPromptCooldown && (
            <div style={{ color: '#ff6b6b', fontSize: '10px', marginTop: '2px' }}>
              Cinema cooldown: {cinemaCooldownTimeLeft}s
            </div>
          )}
          {townhallPromptCooldown && (
            <div style={{ color: '#ff6b6b', fontSize: '10px', marginTop: '2px' }}>
              Townhall cooldown: {townhallCooldownTimeLeft}s
            </div>
          )}
        </div>

        <canvas
          ref={canvasRef}
          style={{
            border: "2px solid #fff",
            backgroundColor: "#87CEEB",
            display: isLoading || error ? "none" : "block",
            width: "100vw",
            height: "100vh",
            objectFit: "fill",
            imageRendering: "pixelated",
          }}
        />
        <div
          style={{
            color: "white",
            textAlign: "center",
            marginTop: "10px",
            display: isLoading || error ? "none" : "block",
          }}
        >
          Use WASD or Arrow Keys to move • Multiplayer Mode
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "320px",
              width: "640px",
              fontSize: "18px",
              color: "red",
              border: "2px solid #fff",
              backgroundColor: "#222",
            }}
          >
            Error: {error}
          </div>
        )}

        {isLoading && !error && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "320px",
              width: "640px",
              fontSize: "18px",
              color: "white",
              border: "2px solid #fff",
              backgroundColor: "#222",
            }}
          >
            Loading multiplayer game...
          </div>
        )}

        {/* Library Interaction Prompt */}
        {showLibraryPrompt && (
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
                📚 Library Access
              </h2>
              
              <p style={{
                color: '#ccc',
                fontSize: '16px',
                marginBottom: '30px',
                lineHeight: '1.5'
              }}>
                You've discovered the library entrance!<br/>
                Would you like to enter the library?
              </p>
              
              <div style={{
                display: 'flex',
                gap: '15px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={handleGoToLibrary}
                  style={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    transition: 'background-color 0.3s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#45a049'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#4CAF50'}
                >
                  Enter Library
                </button>
                
                <button
                  onClick={handleStayInGame}
                  style={{
                    backgroundColor: '#666',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    transition: 'background-color 0.3s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#555'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#666'}
                >
                  Stay in Game
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

        {/* Cinema Interaction Prompt */}
        {showCinemaPrompt && (
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
                🎬 Cinema Access
              </h2>
              
              <p style={{
                color: '#ccc',
                fontSize: '16px',
                marginBottom: '30px',
                lineHeight: '1.5'
              }}>
                You've discovered the cinema entrance!<br/>
                Would you like to enter the cinema?
              </p>
              
              <div style={{
                display: 'flex',
                gap: '15px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={handleGoToCinema}
                  style={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    transition: 'background-color 0.3s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#45a049'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#4CAF50'}
                >
                  Enter Cinema
                </button>
                
                <button
                  onClick={handleStayInGameCinema}
                  style={{
                    backgroundColor: '#666',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    transition: 'background-color 0.3s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#555'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#666'}
                >
                  Stay in Game
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

        {/* Townhall Interaction Prompt */}
        {showTownhallPrompt && (
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
                🏛️ Townhall Access
              </h2>
              
              <p style={{
                color: '#ccc',
                fontSize: '16px',
                marginBottom: '30px',
                lineHeight: '1.5'
              }}>
                You've discovered the townhall entrance!<br/>
                Would you like to enter the townhall?
              </p>
              
              <div style={{
                display: 'flex',
                gap: '15px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={handleGoToTownhall}
                  style={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    transition: 'background-color 0.3s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#45a049'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#4CAF50'}
                >
                  Enter Townhall
                </button>
                
                <button
                  onClick={handleStayInGameTownhall}
                  style={{
                    backgroundColor: '#666',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    transition: 'background-color 0.3s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#555'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#666'}
                >
                  Stay in Game
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
    </div>
  );
};
export default MultiplayerGame;
