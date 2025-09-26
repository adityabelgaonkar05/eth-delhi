const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
const dpr = window.devicePixelRatio || 1

canvas.width = 1024 * dpr
canvas.height = 576 * dpr

const layersData = {
   l_New_Layer_1: l_New_Layer_1,
   l_New_Layer_2: l_New_Layer_2,
   l_New_Layer_3: l_New_Layer_3,
   l_New_Layer_4: l_New_Layer_4,
   l_New_Layer_5: l_New_Layer_5,
   l_New_Layer_6: l_New_Layer_6,
   l_New_Layer_8: l_New_Layer_8,
   l_New_Layer_9: l_New_Layer_9,
   l_New_Layer_10: l_New_Layer_10,
   l_New_Layer_11: l_New_Layer_11,
   l_New_Layer_7: l_New_Layer_7,
   l_New_Layer_12: l_New_Layer_12,
   l_New_Layer_13: l_New_Layer_13,
};

const tilesets = {
  l_New_Layer_1: { imageUrl: './images/terrain.png', tileSize: 16 },
  l_New_Layer_2: { imageUrl: './images/terrain.png', tileSize: 16 },
  l_New_Layer_3: { imageUrl: './images/decorations.png', tileSize: 16 },
  l_New_Layer_4: { imageUrl: './images/terrain.png', tileSize: 16 },
  l_New_Layer_5: { imageUrl: './images/terrain.png', tileSize: 16 },
  l_New_Layer_6: { imageUrl: './images/decorations.png', tileSize: 16 },
  l_New_Layer_8: { imageUrl: './images/terrain.png', tileSize: 16 },
  l_New_Layer_9: { imageUrl: './images/terrain.png', tileSize: 16 },
  l_New_Layer_10: { imageUrl: './images/decorations.png', tileSize: 16 },
  l_New_Layer_11: { imageUrl: './images/decorations.png', tileSize: 16 },
  l_New_Layer_7: { imageUrl: './images/decorations.png', tileSize: 16 },
  l_New_Layer_12: { imageUrl: './images/decorations.png', tileSize: 16 },
  l_New_Layer_13: { imageUrl: './images/decorations.png', tileSize: 16 },
};


// Tile setup
const collisionBlocks = []
const blockSize = 16 // Assuming each tile is 16x16 pixels

collisions.forEach((row, y) => {
  row.forEach((symbol, x) => {
    if (symbol === 1) {
      collisionBlocks.push(
        new CollisionBlock({
          x: x * blockSize,
          y: y * blockSize,
          size: blockSize,
        }),
      )
    }
  })
})

const renderLayer = (tilesData, tilesetImage, tileSize, context) => {
  // Calculate the number of tiles per row in the tileset
  // We use Math.ceil to ensure we get a whole number of tiles
  const tilesPerRow = Math.ceil(tilesetImage.width / tileSize)

  tilesData.forEach((row, y) => {
    row.forEach((symbol, x) => {
      if (symbol !== 0) {
        // Adjust index to be 0-based for calculations
        const tileIndex = symbol - 1

        // Calculate source coordinates
        const srcX = (tileIndex % tilesPerRow) * tileSize
        const srcY = Math.floor(tileIndex / tilesPerRow) * tileSize

        context.drawImage(
          tilesetImage, // source image
          srcX,
          srcY, // source x, y
          tileSize,
          tileSize, // source width, height
          x * 16,
          y * 16, // destination x, y
          16,
          16, // destination width, height
        )
      }
    })
  })
}

const renderStaticLayers = async () => {
  const offscreenCanvas = document.createElement('canvas')
  offscreenCanvas.width = canvas.width
  offscreenCanvas.height = canvas.height
  const offscreenContext = offscreenCanvas.getContext('2d')

  for (const [layerName, tilesData] of Object.entries(layersData)) {
    const tilesetInfo = tilesets[layerName]
    if (tilesetInfo) {
      try {
        const tilesetImage = await loadImage(tilesetInfo.imageUrl)
        renderLayer(
          tilesData,
          tilesetImage,
          tilesetInfo.tileSize,
          offscreenContext,
        )
      } catch (error) {
        console.error(`Failed to load image for layer ${layerName}:`, error)
      }
    }
  }

  // Optionally draw collision blocks and platforms for debugging
  // collisionBlocks.forEach(block => block.draw(offscreenContext));

  return offscreenCanvas
}
// END - Tile setup

// Change xy coordinates to move player's default position
const player = new Player({
  x: 140,
  y: 100,
  size: 15,
})

// Falling leaves system
const leafs = [
  new Sprite({
    x: 20,
    y: 20,
    velocity: {
      x: 0.08,
      y: 0.08,
    },
  }),
]

let elapsedTime = 0

const keys = {
  w: {
    pressed: false,
  },
  a: {
    pressed: false,
  },
  s: {
    pressed: false,
  },
  d: {
    pressed: false,
  },
}

let lastTime = performance.now()
function animate(backgroundCanvas) {
  // Calculate delta time
  const currentTime = performance.now()
  const deltaTime = (currentTime - lastTime) / 1000
  lastTime = currentTime
  elapsedTime += deltaTime

  // Spawn new leaves periodically
  if (elapsedTime > 1.5) {
    leafs.push(
      new Sprite({
        x: Math.random() * 150,
        y: Math.random() * 50,
        velocity: {
          x: 0.08,
          y: 0.08,
        },
      })
    )
    elapsedTime = 0
  }

  // Update player position
  player.handleInput(keys)
  player.update(deltaTime, collisionBlocks)

  // Render scene
  c.save()
  c.scale(dpr, dpr)
  c.clearRect(0, 0, canvas.width, canvas.height)
  c.drawImage(backgroundCanvas, 0, 0)
  player.draw(c)

  // Update and render falling leaves
  for (let i = leafs.length - 1; i >= 0; i--) {
    const leaf = leafs[i]
    leaf.update(deltaTime)
    leaf.draw(c)

    // Remove leaves that have faded out
    if (leaf.alpha <= 0) {
      leafs.splice(i, 1)
    }
  }

  c.restore()

  requestAnimationFrame(() => animate(backgroundCanvas))
}

const startRendering = async () => {
  try {
    const backgroundCanvas = await renderStaticLayers()
    if (!backgroundCanvas) {
      console.error('Failed to create the background canvas')
      return
    }

    animate(backgroundCanvas)
  } catch (error) {
    console.error('Error during rendering:', error)
  }
}

startRendering()

