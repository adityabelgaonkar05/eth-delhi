class MultiPlayer {
  constructor({ id, x, y, size, color = '#4CAF50', isLocal = false }) {
    this.id = id
    this.x = x
    this.y = y
    this.width = size
    this.height = size
    this.color = color
    this.isLocal = isLocal
    this.velocity = { x: 0, y: 0 }
    this.center = {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
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
  }

  updatePosition(x, y) {
    this.x = x
    this.y = y
    this.center = {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
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