/**
 * Tuning constants for enemy movement and rendering offsets. Keeping them here
 * makes it easier to compare with the Godot values during pixel-perfect
 * refinements.
 */
import type { PlayfieldCollisionProfile } from '../playfield/playfieldCollision';
import { type Vector2i, vec2 } from '../math/vector2';
import { MONSTER_DIR, type MonsterDir } from './monsterDirection';

/** Central arcade-facing constants for the first enemy implementation. */
export const ENEMY_MOVEMENT_TUNING = {
  maxEnemyCount: 4,
  lairArcadePixelPos: vec2(5 * 16 + 8, 5 * 16 + 6),
  decisionCenterXLowNibble: 0x08,
  decisionCenterYLowNibble: 0x06,
  playerCollisionWindow: 9,
  spriteRenderOffsetHorizontalArcade: vec2(5, 9),
  spriteRenderOffsetVerticalArcade: vec2(5, 9),
  collisionLeadLeft: 1,
  collisionLeadRight: 8,
  collisionLeadUp: 7,
  collisionLeadDown: 2,
} as const;

/** Returns whether an arcade-pixel position is an enemy decision center. */
export function isEnemyDecisionCenter(arcadePixelPos: Vector2i): boolean {
  return (arcadePixelPos.x & 0x0F) === ENEMY_MOVEMENT_TUNING.decisionCenterXLowNibble &&
    (arcadePixelPos.y & 0x0F) === ENEMY_MOVEMENT_TUNING.decisionCenterYLowNibble;
}

/** Render-only offset used to align the enemy sprites with the maze corridors. */
export function getEnemySpriteRenderOffsetArcade(dir: MonsterDir): Vector2i {
  if (dir === MONSTER_DIR.left || dir === MONSTER_DIR.right) {
    return ENEMY_MOVEMENT_TUNING.spriteRenderOffsetHorizontalArcade;
  }

  return ENEMY_MOVEMENT_TUNING.spriteRenderOffsetVerticalArcade;
}

/** Simulator-derived forward probe used by enemy local movement validation. */
export function getEnemyCollisionLead(dir: MonsterDir): Vector2i {
  switch (dir) {
    case MONSTER_DIR.left:
      return vec2(-ENEMY_MOVEMENT_TUNING.collisionLeadLeft, 0);
    case MONSTER_DIR.right:
      return vec2(ENEMY_MOVEMENT_TUNING.collisionLeadRight, 0);
    case MONSTER_DIR.up:
      return vec2(0, -ENEMY_MOVEMENT_TUNING.collisionLeadUp);
    case MONSTER_DIR.down:
      return vec2(0, ENEMY_MOVEMENT_TUNING.collisionLeadDown);
    default:
      return vec2(0, 0);
  }
}

/** Enemy validation uses one actor-specific probe for both fixed walls and gates. */
export function getEnemyCollisionProfile(dir: MonsterDir): PlayfieldCollisionProfile {
  const lead = getEnemyCollisionLead(dir);

  return {
    staticCollisionLead: lead,
    gateContactLead: lead,
  };
}
