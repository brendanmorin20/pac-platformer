/**
 * physics.js — constants and pure helper functions for gravity, velocity
 * integration and friction. No DOM/canvas access here; keeps the math
 * independently testable and reusable.
 */
const Physics = (() => {
  const MOVE_ACCEL = 2400;       // px/s^2 while a direction key is held
  const MAX_SPEED_X = 320;       // px/s horizontal cap
  const FRICTION = 2600;         // px/s^2 deceleration when no input
  const JUMP_VELOCITY = -680;    // px/s (negative = up)
  const TERMINAL_VELOCITY = 1400; // px/s max fall speed
  const COYOTE_TIME = 0.12;      // seconds player can still jump after leaving a ledge
  const JUMP_BUFFER = 0.12;      // seconds a jump press is remembered before landing

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Integrate horizontal velocity given input direction (-1, 0, 1) and dt.
   */
  function integrateHorizontal(vx, direction, dt) {
    if (direction !== 0) {
      vx += direction * MOVE_ACCEL * dt;
      vx = clamp(vx, -MAX_SPEED_X, MAX_SPEED_X);
    } else if (vx > 0) {
      vx = Math.max(0, vx - FRICTION * dt);
    } else if (vx < 0) {
      vx = Math.min(0, vx + FRICTION * dt);
    }
    return vx;
  }

  /**
   * Integrate vertical velocity under gravity, capped at terminal velocity.
   */
  function integrateVertical(vy, gravity, dt) {
    vy += gravity * dt;
    return clamp(vy, -Infinity, TERMINAL_VELOCITY);
  }

  return {
    MOVE_ACCEL,
    MAX_SPEED_X,
    FRICTION,
    JUMP_VELOCITY,
    TERMINAL_VELOCITY,
    COYOTE_TIME,
    JUMP_BUFFER,
    clamp,
    integrateHorizontal,
    integrateVertical,
  };
})();