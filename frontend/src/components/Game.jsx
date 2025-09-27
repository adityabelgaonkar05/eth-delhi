import { useEffect, useRef, useState, useCallback } from "react";
import Player from "../game/classes/Player";
import CollisionBlock from "../game/classes/CollisionBlock";
import Sprite from "../game/classes/Sprite";
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

const Game = () => {
  console.log("Game component rendering...");

  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  const collisionBlocksRef = useRef([]);
  const spritesRef = useRef([]);
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

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log("Game state:", { isLoading, error });

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

    console.log("Initializing game...");

    try {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = 1024 * dpr;
      canvas.height = 576 * dpr;

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

      // Create player (moved 3 pixels right as requested)
      playerRef.current = new Player({
        x: 143, // Original was 140, moved 3 pixels right
        y: 100,
        size: 15,
      });
      console.log("Created player");

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
  }, []); // Add empty dependency array for useCallback

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

    // Update player
    playerRef.current.handleInput(keysRef.current);
    playerRef.current.update(deltaTime, collisionBlocksRef.current);

    // Render scene
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundCanvasRef.current, 0, 0);
    playerRef.current.draw(ctx);

    // Update and render falling leaves
    for (let i = spritesRef.current.length - 1; i >= 0; i--) {
      const leaf = spritesRef.current[i];
      leaf.update(deltaTime);
      leaf.draw(ctx);

      // Remove leaves that have faded out
      if (leaf.alpha <= 0) {
        spritesRef.current.splice(i, 1);
      }
    }

    ctx.restore();

    animationIdRef.current = requestAnimationFrame(animate);
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
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
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Initialize game on component mount
  useEffect(() => {
    console.log("Game useEffect triggered - initializing game...");
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
      console.log("Game component cleanup");
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []); // Remove initializeGame from dependencies

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
          Use WASD or Arrow Keys to move
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "576px",
              width: "1024px",
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
              height: "576px",
              width: "1024px",
              fontSize: "18px",
              color: "white",
              border: "2px solid #fff",
              backgroundColor: "#222",
            }}
          >
            Loading game...
          </div>
        )}
      </div>
    </div>
  );
};

export default Game;
