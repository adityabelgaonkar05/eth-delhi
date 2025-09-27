class MultiPlayer {
  constructor({ id, x, y, size, color = '#4CAF50', isLocal = false, username = 'Player', walletAddress = null }) {
    this.id = id
    this.x = x
    this.y = y
    this.width = size
    this.height = size
    this.color = color
    this.isLocal = isLocal
    this.username = username
    this.walletAddress = walletAddress
    this.velocity = { x: 0, y: 0 }
    this.center = {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
    }

    // Click detection properties
    this.isHovered = false
    this.clickBounds = {
      x: this.x - 5,
      y: this.y - 20, // Include name tag area
      width: this.width + 10,
      height: this.height + 25
    }

    // Animation properties
    this.currentFrame = 0
    this.elapsedTime = 0
    this.facing = 'down'
    this.moving = false

    // Sprite loading
    this.loaded = false
    this.image = new Image()
    this.image.onload = () => {
      this.loaded = true
    }
    this.image.src = '/images/player.png'

    // Sprite configurations for different animations
    this.sprites = {
      walkDown: {
        x: 0,
        y: 0,
        width: 16,
        height: 16,
        frameCount: 4,
      },
      walkUp: {
        x: 16,
        y: 0,
        width: 16,
        height: 16,
        frameCount: 4,
      },
      walkLeft: {
        x: 32,
        y: 0,
        width: 16,
        height: 16,
        frameCount: 4,
      },
      walkRight: {
        x: 48,
        y: 0,
        width: 16,
        height: 16,
        frameCount: 4,
      },
    }

    // Set default sprite
    this.currentSprite = this.sprites.walkDown
  }

  draw(c) {
    if (!this.loaded) return

    // Draw player name tag above player
    if (!this.isLocal) {
      c.fillStyle = 'white'
      c.font = '10px Arial'
      c.textAlign = 'center'
      c.fillText(`Player ${this.id.substring(0, 8)}`, this.x + this.width/2, this.y - 5)
    } else {
      c.fillStyle = 'yellow'
      c.font = '10px Arial'
      c.textAlign = 'center'
      c.fillText('You', this.x + this.width/2, this.y - 5)
    }

    // Add colored outline for different players
    if (!this.isLocal) {
      c.strokeStyle = this.color
      c.lineWidth = 2
      c.strokeRect(this.x - 1, this.y - 1, this.width + 2, this.height + 2)
    }

    // Draw the animated sprite
    c.drawImage(
      this.image,
      this.currentSprite.x,
      this.currentSprite.y + this.currentSprite.height * this.currentFrame,
      this.currentSprite.width,
      this.currentSprite.height,
      this.x,
      this.y,
      this.width,
      this.height
    )
  }

  update(deltaTime) {
    if (!deltaTime) return

    // Update animation frame timing
    this.elapsedTime += deltaTime
    const intervalToGoToNextFrame = 0.15

    if (this.elapsedTime > intervalToGoToNextFrame) {
      if (this.moving) {
        this.currentFrame = (this.currentFrame + 1) % this.currentSprite.frameCount
      } else {
        this.currentFrame = 0 // Show idle frame when not moving
      }
      this.elapsedTime -= intervalToGoToNextFrame
    }

    // Update center position
    this.center = {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
    }

    // Update click bounds
    this.updateClickBounds()
  }

  updatePosition(x, y) {
    this.x = x
    this.y = y
    this.center = {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
    }
    this.updateClickBounds()
  }

  updateClickBounds() {
    this.clickBounds = {
      x: this.x - 5,
      y: this.y - 20, // Include name tag area
      width: this.width + 10,
      height: this.height + 25
    }
  }

  // Check if a point is within the clickable area
  containsPoint(x, y) {
    return x >= this.clickBounds.x &&
           x <= this.clickBounds.x + this.clickBounds.width &&
           y >= this.clickBounds.y &&
           y <= this.clickBounds.y + this.clickBounds.height
  }

  // Get screen coordinates for name tag positioning
  getNameTagPosition(camera = { x: 0, y: 0 }) {
    return {
      x: this.x + this.width / 2 - camera.x,
      y: this.y - camera.y
    }
  }

  updateSprite(facing, currentSprite, moving) {
    this.facing = facing
    this.moving = moving
    if (this.sprites[currentSprite]) {
      this.currentSprite = this.sprites[currentSprite]
    }
  }
}

export default MultiPlayer