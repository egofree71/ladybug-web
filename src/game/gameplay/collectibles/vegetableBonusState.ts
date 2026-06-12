/**
 * Runtime state for the central vegetable bonus. It tracks visibility, pickup,
 * and the temporary enemy freeze without owning Phaser sprites.
 */
import { arcadePixelToLogicalCell } from '../../layout/playfieldCoordinates';
import type { EnemySystem } from '../enemies/enemySystem';
import type { Vector2i } from '../math/vector2';
import { getVegetableBonusFrame, getVegetableBonusScore } from './vegetableBonusCatalog';

export interface VegetableBonusPickupResult {
  readonly consumed: boolean;
  readonly scoreDelta: number;
}

export interface VegetableBonusSnapshot {
  readonly visible: boolean;
  readonly frame: number;
}

const LAIR_LOGICAL_CELL: Vector2i = { x: 5, y: 5 };
const FREEZE_DURATION_TICKS = 300;

/**
 * Runtime state for the central vegetable bonus.
 *
 * The vegetable appears when all four enemies are in the maze. Consuming it
 * gives an immediate fixed score and freezes enemy movement for a short duration;
 * enemy collision stays active, so touching a frozen enemy remains fatal.
 */
export class VegetableBonusState {
  private readonly levelNumber: number;
  private visible = false;
  private frame = 0;
  private freezeTicksRemaining = 0;
  private wasAllEnemiesInMaze = false;
  private consumedDuringCurrentAllEnemiesOutCycle = false;

  public constructor(levelNumber: number) {
    this.levelNumber = Math.max(1, Math.floor(levelNumber));
    this.frame = getVegetableBonusFrame(this.levelNumber);
  }

  public get snapshot(): VegetableBonusSnapshot {
    return {
      visible: this.visible,
      frame: this.frame,
    };
  }

  public advanceOneSimulationTick(enemySystem: EnemySystem): void {
    this.updateSpawnState(enemySystem.areAllEnemiesInMaze);
    this.advanceFreezeState(enemySystem);
  }

  public tryConsumeAtPlayerArcadePosition(playerArcadePixelPos: Vector2i, enemySystem: EnemySystem): VegetableBonusPickupResult {
    if (!this.visible) {
      return { consumed: false, scoreDelta: 0 };
    }

    const playerCell = arcadePixelToLogicalCell(playerArcadePixelPos);
    if (playerCell.x !== LAIR_LOGICAL_CELL.x || playerCell.y !== LAIR_LOGICAL_CELL.y) {
      return { consumed: false, scoreDelta: 0 };
    }

    this.visible = false;
    this.consumedDuringCurrentAllEnemiesOutCycle = true;
    this.freezeTicksRemaining = FREEZE_DURATION_TICKS;
    enemySystem.freezeActiveEnemyMovement();

    return {
      consumed: true,
      scoreDelta: getVegetableBonusScore(this.levelNumber),
    };
  }

  public resetRuntimeState(enemySystem?: EnemySystem): void {
    enemySystem?.restoreFrozenEnemyMovement();
    this.visible = false;
    this.freezeTicksRemaining = 0;
    this.wasAllEnemiesInMaze = false;
    this.consumedDuringCurrentAllEnemiesOutCycle = false;
  }

  private updateSpawnState(allEnemiesInMaze: boolean): void {
    if (!allEnemiesInMaze) {
      this.visible = false;
      this.wasAllEnemiesInMaze = false;
      this.consumedDuringCurrentAllEnemiesOutCycle = false;
      return;
    }

    if (!this.wasAllEnemiesInMaze) {
      this.wasAllEnemiesInMaze = true;
      this.consumedDuringCurrentAllEnemiesOutCycle = false;
    }

    this.visible = !this.consumedDuringCurrentAllEnemiesOutCycle;
    this.frame = getVegetableBonusFrame(this.levelNumber);
  }

  private advanceFreezeState(enemySystem: EnemySystem): void {
    if (this.freezeTicksRemaining > 0) {
      enemySystem.freezeActiveEnemyMovement();
      this.freezeTicksRemaining -= 1;
      return;
    }

    enemySystem.restoreFrozenEnemyMovement();
  }
}
