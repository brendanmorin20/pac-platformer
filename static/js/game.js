/**
 * game.js — the main game loop and state machine. Ties together levels.js,
 * player.js, physics.js, collision.js, camera.js and interface.js.
 *
 * States: "title" -> "loading" -> "playing" -> ("paused" | "levelComplete"
 * | "gameOver" | "victory") -> ...
 */
const Game = (() => {
  const TOTAL_LEVELS = window.PAC_PLATFORMER_TOTAL_LEVELS || 3;
  const HAZARD_TOUCH_PENALTY_LIVES = 1;

  let canvas, ctx;
  let state = "title";
  let levelNumber = 1;
  let level = null;
  let player = null;
  let camera = null;
  let totalScore = 0;
  let levelStartTime = 0;
  let lastTimestamp = 0;
  let paused = false;

  function init() {
    canvas = document.getElementById("game-canvas");
    ctx = canvas.getContext("2d");
    Overlay.init();
    Input.bind();

    showTitleScreen();
    requestAnimationFrame(loop);
  }

  // ---- Screens -----------------------------------------------------

  async function showTitleScreen() {
    state = "title";
    let scoresHtml = '<p class="dim">Loading high scores…</p>';
    Overlay.show(titleHtml(scoresHtml));
    Overlay.on("#start-btn", startNewGame);

    try {
      const res = await fetch("/api/scores");
      const scores = await res.json();
      scoresHtml = scores.length
        ? "<ol>" + scores.map((s) => `<li>${escapeHtml(s.name)} — ${s.score}</li>`).join("") + "</ol>"
        : '<p class="dim">No scores yet. Be the first!</p>';
    } catch (e) {
      scoresHtml = '<p class="dim">High scores unavailable.</p>';
    }
    Overlay.show(titleHtml(scoresHtml));
    Overlay.on("#start-btn", startNewGame);
  }

  function titleHtml(scoresHtml) {
    return `
      <div class="panel">
        <h1>Pac-Platformer</h1>
        <p>An original round hero, three hand-built stages, zero ghosts.</p>
        <button id="start-btn" class="btn">Start Game</button>
        <h2>High Scores</h2>
        ${scoresHtml}
        <div class="controls-legend">
          <strong>Controls:</strong> ←/A →/D move · Space/↑/W jump · R restart · P/Esc pause
        </div>
      </div>`;
  }

  async function startNewGame() {
    totalScore = 0;
    levelNumber = 1;
    await loadLevel(levelNumber);
  }

  async function loadLevel(n) {
    state = "loading";
    Overlay.clear();
    try {
      level = await Levels.fetchLevel(n);
    } catch (err) {
      Overlay.show(`<div class="panel"><h1>Failed to load level</h1><p>${escapeHtml(err.message)}</p>
        <button id="retry-btn" class="btn">Back to Title</button></div>`);
      Overlay.on("#retry-btn", showTitleScreen);
      state = "title";
      return;
    }
    player = new Player(level.playerStart.x, level.playerStart.y);
    camera = new Camera(canvas.width);
    levelStartTime = performance.now();
    state = "playing";
    paused = false;
  }

  function showPause() {
    state = "paused";
    Overlay.show(`
      <div class="panel">
        <h1>Paused</h1>
        <button id="resume-btn" class="btn">Resume</button>
        <button id="restart-btn" class="btn">Restart Level</button>
        <button id="quit-btn" class="btn secondary">Quit to Title</button>
      </div>`);
    Overlay.on("#resume-btn", resume);
    Overlay.on("#restart-btn", () => loadLevel(levelNumber));
    Overlay.on("#quit-btn", showTitleScreen);
  }

  function resume() {
    Overlay.clear();
    state = "playing";
  }

  function showLevelComplete(coinBonus, timeBonus) {
    state = "levelComplete";
    const isLast = levelNumber >= TOTAL_LEVELS;
    Overlay.show(`
      <div class="panel">
        <h1>Level Complete!</h1>
        <p>Coins: +${coinBonus}</p>
        <p>Time bonus: +${timeBonus}</p>
        <p class="score-line">Total score: ${totalScore}</p>
        <button id="continue-btn" class="btn">${isLast ? "Finish" : "Continue"}</button>
      </div>`);
    Overlay.on("#continue-btn", async () => {
      if (isLast) {
        await showVictory();
      } else {
        levelNumber += 1;
        await loadLevel(levelNumber);
      }
    });
  }

  function showGameOver() {
    state = "gameOver";
    Overlay.show(`
      <div class="panel">
        <h1>Game Over</h1>
        <p class="score-line">Final score: ${totalScore}</p>
        <button id="retry-btn" class="btn">Retry Level</button>
        <button id="quit-btn" class="btn secondary">Quit to Title</button>
      </div>`);
    Overlay.on("#retry-btn", () => loadLevel(levelNumber));
    Overlay.on("#quit-btn", showTitleScreen);
  }

  async function showVictory() {
    state = "victory";
    Overlay.show(`
      <div class="panel">
        <h1>You Win!</h1>
        <p class="score-line">Final score: ${totalScore}</p>
        <label>Name for the high-score board:
          <input id="name-input" maxlength="16" value="Player" />
        </label>
        <button id="save-btn" class="btn">Save Score</button>
        <button id="title-btn" class="btn secondary">Back to Title</button>
      </div>`);
    Overlay.on("#save-btn", async () => {
      const name = document.getElementById("name-input").value || "Player";
      try {
        await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, score: totalScore, level: TOTAL_LEVELS }),
        });
      } catch (e) {
        // Non-fatal: scoreboard just won't include this run.
      }
      showTitleScreen();
    });
    Overlay.on("#title-btn", showTitleScreen);
  }

  // ---- Core loop ------------------------------------------------------

  function loop(timestamp) {
    const dt = lastTimestamp ? Math.min(0.05, (timestamp - lastTimestamp) / 1000) : 0;
    lastTimestamp = timestamp;

    if (Input.consume("pausePressed")) {
      if (state === "playing") showPause();
      else if (state === "paused") resume();
    }
    if (Input.consume("restartPressed") && (state === "playing" || state === "paused")) {
      loadLevel(levelNumber);
    }

    if (state === "playing") {
      update(dt);
    }

    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (Input.consume("jumpPressed")) {
      player.requestJump();
    }

    level.update(dt);
    player.update(dt, Input.state, level);

    level.furthestX = Math.max(level.furthestX, player.x);
    camera.update(player, level.width);

    // Coin collection
    for (const coin of level.coins) {
      if (!coin.collected && Collision.aabbOverlap(player.rect, coin.rect)) {
        coin.collected = true;
        player.coins += 1;
        totalScore += 100;
      }
    }

    // Hazards
    if (player.invulnerable <= 0) {
      for (const hz of level.hazards) {
        if (Collision.aabbOverlap(player.rect, hz)) {
          handleHazardHit();
          break;
        }
      }
    }

    // Fell off the world
    if (player.y > level.height + 100) {
      handleHazardHit();
    }

    // Goal
    const required = level.coinsRequired || 0;
    if (level.collectedCoinCount() >= required && Collision.aabbOverlap(player.rect, level.goal)) {
      handleLevelComplete();
    }
  }

  function lastCheckpointOrStart() {
    const passed = level.checkpoints.filter((cp) => cp.x <= player.x);
    if (passed.length === 0) return level.playerStart;
    return passed[passed.length - 1];
  }

  function handleHazardHit() {
    player.lives -= HAZARD_TOUCH_PENALTY_LIVES;
    if (player.lives <= 0) {
      showGameOver();
    } else {
      player.respawnAt(lastCheckpointOrStart());
    }
  }

  function handleLevelComplete() {
    const coinBonus = level.collectedCoinCount() * 100;
    const elapsedSeconds = (performance.now() - levelStartTime) / 1000;
    const timeBonus = Math.max(0, Math.round(500 - elapsedSeconds * 5));
    totalScore += timeBonus;
    showLevelComplete(coinBonus, timeBonus);
  }

  // ---- Rendering --------------------------------------------------

  function render() {
    ctx.fillStyle = "#0b1f2a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state === "title" || state === "loading") return;

    const camX = camera ? camera.x : 0;

    drawParallaxBackground(camX);
    drawPlatforms(camX);
    drawHazards(camX);
    drawCoins(camX);
    drawGoal(camX);
    if (player) player.draw(ctx, camX);

    if (level && player) {
      HUD.draw(ctx, canvas.width, player, level, levelNumber, TOTAL_LEVELS, totalScore);
    }
  }

  function drawParallaxBackground(camX) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#133445";
    for (let i = 0; i < 6; i++) {
      const x = (i * 300 - camX * 0.3) % (canvas.width + 300);
      ctx.beginPath();
      ctx.arc(x, 500, 80, Math.PI, 0);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlatforms(camX) {
    ctx.fillStyle = "#3a7d5c";
    for (const p of level.platforms) {
      ctx.fillStyle = p.type === "oneway" ? "#5b9e7c" : "#3a7d5c";
      ctx.fillRect(p.x - camX, p.y, p.w, p.h);
    }
    ctx.fillStyle = "#c47a3d";
    for (const mp of level.movingPlatforms) {
      ctx.fillRect(mp.x - camX, mp.y, mp.w, mp.h);
    }
  }

  function drawHazards(camX) {
    ctx.fillStyle = "#e23d3d";
    for (const hz of level.hazards) {
      // Draw as a row of simple triangle spikes for visual clarity.
      const spikeCount = Math.max(1, Math.round(hz.w / 16));
      const spikeW = hz.w / spikeCount;
      for (let i = 0; i < spikeCount; i++) {
        const sx = hz.x - camX + i * spikeW;
        ctx.beginPath();
        ctx.moveTo(sx, hz.y + hz.h);
        ctx.lineTo(sx + spikeW / 2, hz.y);
        ctx.lineTo(sx + spikeW, hz.y + hz.h);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawCoins(camX) {
    ctx.fillStyle = "#ffd447";
    for (const coin of level.coins) {
      if (coin.collected) continue;
      const bobY = Math.sin(performance.now() / 300 + coin.bob) * 3;
      ctx.beginPath();
      ctx.arc(coin.x - camX, coin.y + bobY, coin.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGoal(camX) {
    // The goal's hit rect (g) is deliberately much taller than its visible
    // flag so a player can't sail over it mid-jump without touching it
    // (see levels/*.json goal comments). Draw a normal-proportioned flag
    // near the top of the pole regardless of the hit rect's full height.
    const g = level.goal;
    const poleX = g.x - camX;
    ctx.fillStyle = "#f4f4f4";
    ctx.fillRect(poleX, g.y, 6, g.h);
    ctx.fillStyle = "#2ee6d6";
    const flagH = 36;
    ctx.beginPath();
    ctx.moveTo(poleX + 6, g.y);
    ctx.lineTo(poleX + g.w, g.y + flagH * 0.5);
    ctx.lineTo(poleX + 6, g.y + flagH);
    ctx.closePath();
    ctx.fill();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  return { init };
})();

window.addEventListener("DOMContentLoaded", Game.init);