/**
 * collision.js — AABB collision tests and sweep-style resolution.
 *
 * Strategy: move on the X axis, resolve X collisions; then move on the Y
 * axis, resolve Y collisions. Resolving one axis at a time (rather than
 * both simultaneously) avoids the classic "corner catch" bug and keeps
 * the math simple enough to reason about and keep bug-free.
 */
const Collision = (() => {
  function aabbOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  /**
   * Resolve horizontal movement of `entity` (a rect with vx) against a list
   * of solid rects. Mutates entity.x and zeroes entity.vx on impact.
   */
  function resolveHorizontal(entity, solids, dx) {
    entity.x += dx;
    for (const solid of solids) {
      if (!aabbOverlap(entity, solid)) continue;
      if (dx > 0) {
        entity.x = solid.x - entity.w;
      } else if (dx < 0) {
        entity.x = solid.x + solid.w;
      }
      entity.vx = 0;
    }
  }

  /**
   * Resolve vertical movement of `entity` against solids (full solids) and
   * one-way platforms (only collide when falling onto their top edge).
   * Returns true if the entity ended the frame standing on something.
   */
  function resolveVertical(entity, solids, oneWays, dy) {
    const prevBottom = entity.y + entity.h;
    entity.y += dy;
    let grounded = false;

    for (const solid of solids) {
      if (!aabbOverlap(entity, solid)) continue;
      if (dy > 0) {
        entity.y = solid.y - entity.h;
        grounded = true;
      } else if (dy < 0) {
        entity.y = solid.y + solid.h;
      }
      entity.vy = 0;
    }

    if (dy >= 0) {
      for (const plat of oneWays) {
        if (!aabbOverlap(entity, plat)) continue;
        // Only land if the entity's previous bottom was at/above the
        // platform's top — i.e. falling onto it, not rising through it
        // or already inside it from the side.
        if (prevBottom <= plat.y + 1) {
          entity.y = plat.y - entity.h;
          entity.vy = 0;
          grounded = true;
        }
      }
    }

    return grounded;
  }

  return { aabbOverlap, resolveHorizontal, resolveVertical };
})();