/**
 * Chooses enemy directions at valid decision points. Movement execution stays in
 * EnemySystem; this module only decides which direction should be attempted
 * next.
 */
import { arcadePixelToLogicalCell } from '../../layout/playfieldCoordinates';
import { add, type Vector2i } from '../math/vector2';
import { PlayfieldCollisionResolver } from '../playfield/playfieldCollision';
import {
  MONSTER_DIR,
  MONSTER_DIRECTION_ORDER,
  monsterDirToVector,
  type MonsterDir,
} from './monsterDirection';
import type { MonsterEntity } from './monsterEntity';
import { getEnemyCollisionProfile, isEnemyDecisionCenter } from './enemyMovementTuning';
import type { EnemyNavigationGrid } from './enemyNavigationGrid';

/** Implements one-pixel enemy movement, center decisions and fallback. */
export class EnemyMovementAi {
  private readonly playfieldCollisionResolver: PlayfieldCollisionResolver;

  public constructor(playfieldCollisionResolver: PlayfieldCollisionResolver) {
    this.playfieldCollisionResolver = playfieldCollisionResolver;
  }

  /** Advances one active enemy by one arcade pixel when possible. */
  public updateMonsterOnePixel(monster: MonsterEntity, navigationGrid: EnemyNavigationGrid): void {
    if (!monster.movementActive) {
      return;
    }

    const atDecisionCenter = isEnemyDecisionCenter(monster.arcadePixelPos);
    let chosenDir = monster.direction;

    if (atDecisionCenter) {
      chosenDir = this.chooseDirectionAtDecisionCenter(monster, navigationGrid);
    }

    if (chosenDir === MONSTER_DIR.none) {
      return;
    }

    if (atDecisionCenter && !this.canStep(monster, chosenDir)) {
      return;
    }

    monster.direction = chosenDir;
    monster.arcadePixelPos = add(monster.arcadePixelPos, monsterDirToVector(chosenDir));
  }

  private chooseDirectionAtDecisionCenter(monster: MonsterEntity, navigationGrid: EnemyNavigationGrid): MonsterDir {
    let rejectedMask: MonsterDir = MONSTER_DIR.none;
    const preferred = monster.preferredDirection;

    if (this.canUseDirection(monster, preferred, navigationGrid)) {
      return preferred;
    }

    if (preferred !== MONSTER_DIR.none) {
      rejectedMask = (rejectedMask | preferred) as MonsterDir;
    }

    const current = monster.direction;
    if (current !== MONSTER_DIR.none && (rejectedMask & current) === 0) {
      if (this.canUseDirection(monster, current, navigationGrid)) {
        return current;
      }

      rejectedMask = (rejectedMask | current) as MonsterDir;
    } else if (current !== MONSTER_DIR.none) {
      rejectedMask = (rejectedMask | current) as MonsterDir;
    }

    const fallback = this.findFallbackDirection(monster, navigationGrid, rejectedMask);

    return fallback !== MONSTER_DIR.none ? fallback : current;
  }

  private findFallbackDirection(
    monster: MonsterEntity,
    navigationGrid: EnemyNavigationGrid,
    alreadyRejected: MonsterDir,
  ): MonsterDir {
    let scanRejected: MonsterDir = alreadyRejected;

    for (const candidate of MONSTER_DIRECTION_ORDER) {
      if ((scanRejected & candidate) !== 0) {
        continue;
      }

      if (this.canUseDirection(monster, candidate, navigationGrid)) {
        return candidate;
      }

      scanRejected = (scanRejected | candidate) as MonsterDir;
    }

    return MONSTER_DIR.none;
  }

  private canUseDirection(monster: MonsterEntity, dir: MonsterDir, navigationGrid: EnemyNavigationGrid): boolean {
    if (dir === MONSTER_DIR.none) {
      return false;
    }

    const cell = arcadePixelToLogicalCell(monster.arcadePixelPos);
    if (!navigationGrid.isDirectionAllowed(cell, dir)) {
      return false;
    }

    return this.canStep(monster, dir);
  }

  private canStep(monster: MonsterEntity, dir: MonsterDir): boolean {
    const step = this.playfieldCollisionResolver.evaluateArcadePixelStep(
      monster.arcadePixelPos,
      monsterDirToVector(dir),
      getEnemyCollisionProfile(dir),
    );

    return step.allowed;
  }
}

export function enemyPlayerCollisionActive(playerArcadePixelPos: Vector2i, monster: MonsterEntity): boolean {
  return Math.abs(playerArcadePixelPos.x - monster.arcadePixelPos.x) < 9 &&
    Math.abs(playerArcadePixelPos.y - monster.arcadePixelPos.y) < 9;
}
