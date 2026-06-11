import { equals, type Vector2i, VEC2 } from '../math/vector2';

/**
 * Arcade enemy direction bits.
 *
 * These values intentionally follow the ROM-facing monster encoding and must not
 * be mixed with the player's input flags. They are bit values because the enemy
 * navigation grid stores allowed directions as a compact mask.
 */
export const MONSTER_DIR = {
  none: 0x00,
  left: 0x01,
  up: 0x02,
  right: 0x04,
  down: 0x08,
} as const;

export type MonsterDir = (typeof MONSTER_DIR)[keyof typeof MONSTER_DIR];

export const MONSTER_DIRECTION_ORDER: readonly MonsterDir[] = [
  MONSTER_DIR.left,
  MONSTER_DIR.up,
  MONSTER_DIR.right,
  MONSTER_DIR.down,
];

export function monsterDirToVector(dir: MonsterDir): Vector2i {
  switch (dir) {
    case MONSTER_DIR.left:
      return VEC2.left;
    case MONSTER_DIR.up:
      return VEC2.up;
    case MONSTER_DIR.right:
      return VEC2.right;
    case MONSTER_DIR.down:
      return VEC2.down;
    default:
      return VEC2.zero;
  }
}

export function vectorToMonsterDir(direction: Vector2i): MonsterDir {
  if (equals(direction, VEC2.left)) {
    return MONSTER_DIR.left;
  }

  if (equals(direction, VEC2.up)) {
    return MONSTER_DIR.up;
  }

  if (equals(direction, VEC2.right)) {
    return MONSTER_DIR.right;
  }

  if (equals(direction, VEC2.down)) {
    return MONSTER_DIR.down;
  }

  return MONSTER_DIR.up;
}

export function oppositeMonsterDir(dir: MonsterDir): MonsterDir {
  switch (dir) {
    case MONSTER_DIR.left:
      return MONSTER_DIR.right;
    case MONSTER_DIR.right:
      return MONSTER_DIR.left;
    case MONSTER_DIR.up:
      return MONSTER_DIR.down;
    case MONSTER_DIR.down:
      return MONSTER_DIR.up;
    default:
      return MONSTER_DIR.none;
  }
}
