/**
 * camera.js — a simple side-scrolling camera that keeps the player roughly
 * centered horizontally, clamped to the level bounds so it never shows
 * past the edges of the world.
 */
class Camera {
  constructor(viewWidth) {
    this.viewWidth = viewWidth;
    this.x = 0;
  }

  update(player, levelWidth) {
    const targetX = player.x + player.w / 2 - this.viewWidth / 2;
    // Smooth follow (critically damped-ish) rather than hard snap, for feel.
    this.x += (targetX - this.x) * 0.15;
    this.x = Physics.clamp(this.x, 0, Math.max(0, levelWidth - this.viewWidth));
  }
}