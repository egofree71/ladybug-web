/**
 * Plain runtime model for one enemy slot. The entity stores arcade-pixel state
 * only; Phaser sprites are created by the render layer.
 */
import type { Vector2i } from '../math/vector2';
import { MONSTER_DIR, type MonsterDir } from './monsterDirection';

export const MONSTER_RUNTIME_STATE = {
  emptyOrDead: 'empty-or-dead',
  waitingInLair: 'waiting-in-lair',
  exitingLair: 'exiting-lair',
  inMaze: 'in-maze',
  frozenInMaze: 'frozen-in-maze',
} as const;

export type MonsterRuntimeState = (typeof MONSTER_RUNTIME_STATE)[keyof typeof MONSTER_RUNTIME_STATE];

/**
 * Mutable gameplay state for one enemy slot.
 *
 * The web remake keeps the useful arcade ideas, such as slot id, direction bits,
 * arcade-pixel position, chase timer and active/collision flags, without copying
 * the original five-byte RAM structure literally.
 */
export class MonsterEntity {
  public readonly id: number;
  public arcadePixelPos: Vector2i = { x: 0, y: 0 };
  public direction: MonsterDir = MONSTER_DIR.up;
  public preferredDirection: MonsterDir = MONSTER_DIR.up;
  public chaseTimer = 0;
  public spriteCode = 0;
  public spriteAttribute = 0;
  public runtimeState: MonsterRuntimeState = MONSTER_RUNTIME_STATE.emptyOrDead;
  public collisionActive = false;
  public movementActive = false;
  public visibleInLair = false;

  public constructor(id: number) {
    this.id = id;
  }

  public get isVisible(): boolean {
    return this.movementActive || this.collisionActive || this.visibleInLair;
  }
}
