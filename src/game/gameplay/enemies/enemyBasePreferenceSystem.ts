import type { Vector2i } from '../math/vector2';
import { MONSTER_DIR, type MonsterDir, vectorToMonsterDir } from './monsterDirection';
import type { MonsterEntity } from './monsterEntity';

/**
 * Generates the non-chase preferred directions used by enemy decision logic.
 *
 * This mirrors the Godot remake's arcade-inspired B9-like split: a deterministic
 * player-direction-derived mode while the counter is high, then a deterministic
 * pseudo-random approximation of the Z80 R-register branch.
 */
export class EnemyBasePreferenceSystem {
  private readonly levelNumber: number;
  private b9 = 0;
  private randomState = 0;

  public constructor(levelNumber: number) {
    this.levelNumber = levelNumber;
    this.reset();
  }

  public reset(): void {
    this.b9 = getInitialB9ForLevel(this.levelNumber);
    this.randomState = (0x6D2B79F5 ^ (this.levelNumber * 0x45D9F3B)) >>> 0;
  }

  public prepareBasePreferredDirections(
    monsters: readonly MonsterEntity[],
    playerCurrentDirection: Vector2i,
  ): void {
    if (this.b9 >= getThresholdForLevel(this.levelNumber)) {
      this.prepareFromPlayerCurrentDirection(monsters, playerCurrentDirection);
    } else {
      this.preparePseudoRandomDirections(monsters);
    }

    this.b9 = (this.b9 - 1) & 0xFF;
  }

  private prepareFromPlayerCurrentDirection(
    monsters: readonly MonsterEntity[],
    playerCurrentDirection: Vector2i,
  ): void {
    let direction = vectorToMonsterDir(playerCurrentDirection);

    for (const monster of monsters) {
      direction = rotateRight4(direction);

      if (canReceiveBasePreference(monster)) {
        monster.preferredDirection = direction;
      }
    }
  }

  private preparePseudoRandomDirections(monsters: readonly MonsterEntity[]): void {
    for (const monster of monsters) {
      const direction = this.randomPreferredDirection();

      if (canReceiveBasePreference(monster)) {
        monster.preferredDirection = direction;
      }
    }
  }

  private randomPreferredDirection(): MonsterDir {
    let value = this.nextZ80RLikeValue() & 0x0F;
    value >>= 1;
    value += 1;

    if (value < 3) {
      return MONSTER_DIR.left;
    }

    if (value < 5) {
      return MONSTER_DIR.up;
    }

    if (value < 7) {
      return MONSTER_DIR.right;
    }

    return MONSTER_DIR.down;
  }

  private nextZ80RLikeValue(): number {
    this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
    return (this.randomState >>> 16) & 0xFF;
  }
}

function canReceiveBasePreference(monster: MonsterEntity): boolean {
  return monster.movementActive && monster.chaseTimer <= 0;
}

/** Rotates one enemy direction bit through 01, 08, 04, 02, 01. */
function rotateRight4(dir: MonsterDir): MonsterDir {
  const value = dir;
  let shifted = value >> 1;

  if ((value & 0x01) !== 0) {
    shifted |= 0x08;
  }

  return (shifted & 0x0F) as MonsterDir;
}

function getThresholdForLevel(_levelNumber: number): number {
  return 0x90;
}

function getInitialB9ForLevel(_levelNumber: number): number {
  return 0xB4;
}
