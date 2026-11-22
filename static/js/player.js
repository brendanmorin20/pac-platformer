/**
 * player.js — the player entity: an original round, Pac-Man-inspired
 * avatar (no copyrighted art/assets). Handles its own update + draw.
 */
class Player {
  constructor(x, y) {
    this.startX = x;
    this.startY = y;
    this.w = 36;
    this.h = 36;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.facing = 1; // 1 = right, -1 = left
    this.lives = 3;
    this.coins = 0;
    this.invulnerable = 0; // seconds of remaining invulnerability after respawn
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.mouthAngle = 0.25; // radians, animates while moving
    this.mouthDir = 1;
    this.alive = true;
    this.ridingPlatform = null; // MovingPlatform the player stood on last frame, if any
  }

  get rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  respawnAt(point) {
    this.x = point.x;
    this.y = point.y;
    this.vx = 0;
    this.vy = 0;
    this.invulnerable = 1.5;
  }

  reset() {
    this.respawnAt({ x: this.startX, y: this.startY });
    this.lives = 3;
    this.coins = 0;
    this.invulnerable = 0;
  }

  requestJump() {
    this.jumpBufferTimer = Physics.JUMP_BUFFER;
  }

  update(dt, input, level) {
    // Carry the player along with whatever moving platform they were
    // standing on at the end of the previous frame, before applying this
    // frame's own physics. This must happen first so the carried offset
    // participates correctly in this frame's collision resolution.
    if (this.ridingPlatform) {
      this.x += this.ridingPlatform.deltaX;
      this.y += this.ridingPlatform.deltaY;
    }

    // Horizontal movement
    let dir = 0;
    if (input.left) dir -= 1;
    if (input.right) dir += 1;
    if (dir !== 0) this.facing = dir;

    this.vx = Physics.integrateHorizontal(this.vx, dir, dt);

    // Coyote time / jump buffer bookkeeping
    if (this.grounded) {
      this.coyoteTimer = Physics.COYOTE_TIME;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.vy = Physics.JUMP_VELOCITY;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
    }

    this.vy = Physics.integrateVertical(this.vy, level.gravity, dt);

    // Resolve collisions axis by axis
    const solids = level.solidRects();
    const oneWays = level.oneWayRects();

    Collision.resolveHorizontal(this, solids, this.vx * dt);
    this.grounded = Collision.resolveVertical(this, solids, oneWays, this.vy * dt);

    // Figure out whether we're now standing on a moving platform, so next
    // frame can carry the player along with it.
    this.ridingPlatform = null;
    if (this.grounded) {
      const myBottom = this.y + this.h;
      for (const mp of level.movingPlatforms) {
        const standingOnTop = Math.abs(myBottom - mp.y) < 2;
        const withinX = this.x + this.w > mp.x && this.x < mp.x + mp.w;
        if (standingOnTop && withinX) {
          this.ridingPlatform = mp;
          break;
        }
      }
    }

    // Falling off the bottom of the world is handled by game.js (needs level height)

    if (this.invulnerable > 0) this.invulnerable = Math.max(0, this.invulnerable - dt);

    // Mouth animation: only "chomp" while moving
    if (Math.abs(this.vx) > 10) {
      this.mouthAngle += this.mouthDir * dt * 6;
      if (this.mouthAngle > 0.5 || this.mouthAngle < 0.05) this.mouthDir *= -1;
    }
  }

  draw(ctx, cameraX) {
    const cx = this.x - cameraX + this.w / 2;
    const cy = this.y + this.h / 2;
    const r = this.w / 2;

    // Flicker while invulnerable so the player gets clear visual feedback.
    if (this.invulnerable > 0 && Math.floor(this.invulnerable * 20) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(cx, cy);
    if (this.facing < 0) ctx.scale(-1, 1);

    ctx.fillStyle = "#2ee6d6";
    ctx.beginPath();
    ctx.arc(0, 0, r, this.mouthAngle, Math.PI * 2 - this.mouthAngle);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    // Simple eye for a bit of character/orientation.
    ctx.fillStyle = "#06201d";
    ctx.beginPath();
    ctx.arc(r * 0.15, -r * 0.55, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}