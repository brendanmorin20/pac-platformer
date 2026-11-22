/**
 * interface.js — keyboard input handling, HUD drawing, and DOM overlay
 * (menus/screens) management. Keeps all "chrome" concerns out of game.js.
 */
const Input = (() => {
  const state = { left: false, right: false, jumpPressed: false, pausePressed: false, restartPressed: false };

  const KEY_MAP = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
  };

  function bind() {
    window.addEventListener("keydown", (e) => {
      if (KEY_MAP[e.code]) {
        state[KEY_MAP[e.code]] = true;
        e.preventDefault();
      }
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        state.jumpPressed = true;
        e.preventDefault();
      }
      if (e.code === "KeyP" || e.code === "Escape") {
        state.pausePressed = true;
        e.preventDefault();
      }
      if (e.code === "KeyR") {
        state.restartPressed = true;
        e.preventDefault();
      }
      if (e.code === "Enter") {
        state.enterPressed = true;
      }
    });

    window.addEventListener("keyup", (e) => {
      if (KEY_MAP[e.code]) {
        state[KEY_MAP[e.code]] = false;
        e.preventDefault();
      }
    });
  }

  // Edge-triggered flags (jumpPressed etc.) must be consumed once per frame
  // by the game loop so a single key press doesn't register multiple times.
  function consume(flag) {
    const value = state[flag];
    state[flag] = false;
    return value;
  }

  return { state, bind, consume };
})();

const HUD = (() => {
  function draw(ctx, viewWidth, player, level, levelNumber, totalLevels, score) {
    ctx.save();
    ctx.font = "bold 18px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = "#eafffb";
    ctx.textBaseline = "top";

    // Score + level
    ctx.fillText(`Score: ${score}`, 16, 14);
    ctx.fillText(`Level ${levelNumber}/${totalLevels}: ${level.name}`, 16, 38);

    // Coins
    const coinText = `Coins: ${level.collectedCoinCount()}/${level.totalCoins()}` +
      (level.coinsRequired > 0 ? ` (need ${level.coinsRequired})` : "");
    ctx.fillText(coinText, 16, 62);

    // Lives (drawn as small circles, matching the player's silhouette)
    for (let i = 0; i < player.lives; i++) {
      ctx.fillStyle = "#2ee6d6";
      ctx.beginPath();
      ctx.arc(viewWidth - 24 - i * 28, 24, 10, 0.3, Math.PI * 2 - 0.3);
      ctx.lineTo(viewWidth - 24 - i * 28, 24);
      ctx.closePath();
      ctx.fill();
    }

    // Progress bar
    const barX = 16;
    const barY = 86;
    const barW = Math.min(300, viewWidth - 32);
    const barH = 10;
    const pct = Physics.clamp(level.furthestX / level.width, 0, 1);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "#2ee6d6";
    ctx.fillRect(barX, barY, barW * pct, barH);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.restore();
  }

  return { draw };
})();

/**
 * Overlay — manages the DOM-based screens (title, pause, level complete,
 * game over, victory). Keeping these as real DOM elements (rather than
 * canvas-drawn) makes them trivially accessible and easy to style.
 */
const Overlay = (() => {
  let root;

  function init() {
    root = document.getElementById("overlay-root");
  }

  function clear() {
    root.innerHTML = "";
    root.classList.remove("visible");
  }

  function show(html) {
    root.innerHTML = html;
    root.classList.add("visible");
  }

  function on(selector, handler) {
    const el = root.querySelector(selector);
    if (el) el.addEventListener("click", handler);
  }

  return { init, clear, show, on, get root() { return root; } };
})();