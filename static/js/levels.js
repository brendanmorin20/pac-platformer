/**
 * levels.js — fetches level JSON from the Flask API and wraps it in a
 * small runtime object with convenience accessors used by physics/
 * collision/rendering code.
 */
class MovingPlatform {
  constructor(def) {
    this.x0 = def.x;
    this.y0 = def.y;
    this.x = def.x;
    this.y = def.y;
    this.w = def.w;
    this.h = def.h;
    this.axis = def.axis === "y" ? "y" : "x";
    this.range = def.range;
    this.speed = def.speed;
    this.t = 0;
    this.prevX = def.x;
    this.prevY = def.y;
  }

  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.t += dt;
    // Triangle wave between 0 and range, so motion is smooth and reverses
    // cleanly without snapping.
    const period = (this.range * 2) / this.speed;
    const phase = (this.t % period) / period; // 0..1
    const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2; // 0..1..0
    if (this.axis === "x") {
      this.x = this.x0 + tri * this.range;
    } else {
      this.y = this.y0 + tri * this.range;
    }
  }

  get deltaX() {
    return this.x - this.prevX;
  }

  get deltaY() {
    return this.y - this.prevY;
  }
}

class Coin {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.r = 9;
    this.collected = false;
    this.bob = Math.random() * Math.PI * 2;
  }

  get rect() {
    return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 };
  }
}

class Level {
  constructor(data) {
    this.name = data.name;
    this.width = data.width;
    this.height = data.height;
    this.gravity = data.gravity;
    this.playerStart = data.playerStart;
    this.coinsRequired = data.coinsRequired || 0;
    this.platforms = data.platforms.map((p) => ({ ...p }));
    this.movingPlatforms = (data.movingPlatforms || []).map((p) => new MovingPlatform(p));
    this.hazards = data.hazards.map((h) => ({ ...h }));
    this.coins = data.coins.map((c) => new Coin(c));
    this.checkpoints = (data.checkpoints || []).map((c) => ({ ...c }));
    this.goal = { ...data.goal };
    this.furthestX = this.playerStart.x;
  }

  solidRects() {
    const solid = this.platforms.filter((p) => p.type !== "oneway");
    const moving = this.movingPlatforms.map((m) => ({ x: m.x, y: m.y, w: m.w, h: m.h }));
    return [...solid, ...moving];
  }

  oneWayRects() {
    return this.platforms.filter((p) => p.type === "oneway");
  }

  update(dt) {
    for (const mp of this.movingPlatforms) mp.update(dt);
  }

  collectedCoinCount() {
    return this.coins.filter((c) => c.collected).length;
  }

  totalCoins() {
    return this.coins.length;
  }
}

const Levels = (() => {
  async function fetchLevel(number) {
    const res = await fetch(`/api/levels/${number}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to load level ${number}`);
    }
    const data = await res.json();
    return new Level(data);
  }

  return { fetchLevel, Level, MovingPlatform, Coin };
})();