// Utility functions for the game

export function parseTiles({ tileData, tileSize = 16, tilesetImage }) {
  const tiles = []
  
  tileData.forEach((row, y) => {
    row.forEach((tile, x) => {
      if (tile !== 0) {
        tiles.push({
          position: {
            x: x * tileSize,
            y: y * tileSize
          },
          tileId: tile
        })
      }
    })
  })
  
  return tiles
}

export function createCollisionBlocks(collisionData, tileSize = 16) {
  const collisionBlocks = []
  
  collisionData.forEach((row, y) => {
    row.forEach((tile, x) => {
      if (tile === 1) {
        collisionBlocks.push({
          position: {
            x: x * tileSize,
            y: y * tileSize
          },
          width: tileSize,
          height: tileSize
        })
      }
    })
  })
  
  return collisionBlocks
}

export function checkCollision(rect1, rect2) {
  return (
    rect1.position.x < rect2.position.x + rect2.width &&
    rect1.position.x + rect1.width > rect2.position.x &&
    rect1.position.y < rect2.position.y + rect2.height &&
    rect1.position.y + rect1.height > rect2.position.y
  )
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      console.log(`Successfully loaded image: ${src}`)
      resolve(image)
    }
    image.onerror = (error) => {
      console.error(`Failed to load image: ${src}`, error)
      reject(new Error(`Failed to load image: ${src}`))
    }
    image.src = src
  })
}

export const KEYS = {
  w: { pressed: false },
  a: { pressed: false },
  s: { pressed: false },
  d: { pressed: false }
}

export function updateKeys() {
  const keys = { ...KEYS }
  
  // Event listeners will be handled in React component
  return keys
}