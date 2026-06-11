import { arcadePixelToLogicalCell } from '../../layout/playfieldCoordinates';
import type { GateSystem } from '../gates/gateSystem';
import type { Vector2i } from '../math/vector2';
import type { MazeGrid } from '../maze/mazeGrid';
import { PlayfieldCollisionResolver } from '../playfield/playfieldCollision';
import { EnemyBasePreferenceSystem } from './enemyBasePreferenceSystem';
import { EnemyChaseSystem } from './enemyChaseSystem';
import { getEnemyLevelDefinition } from './enemyLevelCatalog';
import { EnemyMovementAi } from './enemyMovementAi';
import { ENEMY_MOVEMENT_TUNING, isEnemyDecisionCenter } from './enemyMovementTuning';
import { EnemyNavigationGrid } from './enemyNavigationGrid';
import { MONSTER_DIR } from './monsterDirection';
import { MONSTER_RUNTIME_STATE, MonsterEntity } from './monsterEntity';

export interface EnemySystemTickOptions {
  readonly playerArcadePixelPos: Vector2i;
  readonly playerCurrentDirection: Vector2i;
  readonly tryConsumeSkullAt: (cell: Vector2i) => boolean;
  readonly onEnemyKilledBySkull?: () => void;
}

/**
 * Coordinates the four arcade-like enemy slots for the active board.
 *
 * Rendering lives in `enemyView.ts`; this class owns only gameplay state:
 * lair/waiting flags, release, one-pixel AI movement, BFS chase pressure and
 * enemy/skull reset behavior.
 */
export class EnemySystem {
  private readonly mazeGrid: MazeGrid;
  private readonly gateSystem: GateSystem;
  private readonly levelNumber: number;
  private readonly navigationGrid: EnemyNavigationGrid;
  private readonly movementAi: EnemyMovementAi;
  private readonly basePreferenceSystem: EnemyBasePreferenceSystem;
  private readonly chaseSystem: EnemyChaseSystem;
  private readonly monstersValue: MonsterEntity[] = [];

  public constructor(
    mazeGrid: MazeGrid,
    gateSystem: GateSystem,
    levelNumber: number,
  ) {
    this.mazeGrid = mazeGrid;
    this.gateSystem = gateSystem;
    this.levelNumber = levelNumber;
    this.navigationGrid = new EnemyNavigationGrid(mazeGrid.width, mazeGrid.height);
    this.movementAi = new EnemyMovementAi(new PlayfieldCollisionResolver(mazeGrid, gateSystem));
    this.basePreferenceSystem = new EnemyBasePreferenceSystem(levelNumber);
    this.chaseSystem = new EnemyChaseSystem(levelNumber);

    this.createSlots();
    this.updateWaitingLairVisibility();
  }

  public get monsters(): readonly MonsterEntity[] {
    return this.monstersValue;
  }

  public get collisionActiveMonsters(): readonly MonsterEntity[] {
    return this.monstersValue.filter((monster) => monster.collisionActive);
  }

  public get hasReleaseCandidate(): boolean {
    return this.findReleaseCandidate() !== undefined;
  }

  public advanceOneSimulationTick(options: EnemySystemTickOptions): void {
    this.navigationGrid.rebuildAllowedDirections(this.mazeGrid, this.gateSystem);
    this.navigationGrid.buildBfsGuidanceFromPlayer(arcadePixelToLogicalCell(options.playerArcadePixelPos));

    this.basePreferenceSystem.prepareBasePreferredDirections(
      this.monstersValue,
      options.playerCurrentDirection,
    );

    this.chaseSystem.advanceOneTick(this.monstersValue);
    this.chaseSystem.applyBfsOverride(this.monstersValue, this.navigationGrid);

    for (const monster of this.monstersValue) {
      if (!monster.movementActive) {
        continue;
      }

      this.movementAi.updateMonsterOnePixel(monster, this.navigationGrid);
      this.tryHandleSkullCollision(monster, options.tryConsumeSkullAt, options.onEnemyKilledBySkull);
    }

    this.updateWaitingLairVisibility();
  }

  public resetAfterPlayerDeath(): void {
    this.basePreferenceSystem.reset();
    this.chaseSystem.reset();

    for (const monster of this.monstersValue) {
      prepareMonsterInLair(monster);
    }

    this.updateWaitingLairVisibility();
  }

  public tryReleaseNextEnemy(): boolean {
    const candidate = this.findReleaseCandidate();

    if (candidate === undefined) {
      return false;
    }

    releaseMonsterFromLair(candidate);
    this.updateWaitingLairVisibility();
    return true;
  }

  private createSlots(): void {
    for (let i = 0; i < ENEMY_MOVEMENT_TUNING.maxEnemyCount; i++) {
      const definition = getEnemyLevelDefinition(this.levelNumber, i);
      const monster = new MonsterEntity(i);

      monster.spriteCode = definition.spriteInfo.spriteCode;
      monster.spriteAttribute = definition.spriteInfo.attr;
      prepareMonsterInLair(monster);

      this.monstersValue.push(monster);
    }
  }

  private findReleaseCandidate(): MonsterEntity | undefined {
    let candidate: MonsterEntity | undefined;

    for (const monster of this.monstersValue) {
      if (monster.movementActive || monster.collisionActive) {
        continue;
      }

      if (monster.visibleInLair) {
        return monster;
      }

      candidate ??= monster;
    }

    return candidate;
  }

  private updateWaitingLairVisibility(): void {
    let selectedWaitingEnemy = false;

    for (const monster of this.monstersValue) {
      monster.visibleInLair = false;

      if (
        selectedWaitingEnemy ||
        monster.movementActive ||
        monster.collisionActive ||
        monster.runtimeState !== MONSTER_RUNTIME_STATE.waitingInLair
      ) {
        continue;
      }

      monster.visibleInLair = true;
      selectedWaitingEnemy = true;
    }
  }

  private tryHandleSkullCollision(
    monster: MonsterEntity,
    tryConsumeSkullAt: (cell: Vector2i) => boolean,
    onEnemyKilledBySkull?: () => void,
  ): void {
    if (!isEnemyDecisionCenter(monster.arcadePixelPos)) {
      return;
    }

    const cell = arcadePixelToLogicalCell(monster.arcadePixelPos);
    if (!tryConsumeSkullAt(cell)) {
      return;
    }

    onEnemyKilledBySkull?.();
    prepareMonsterInLair(monster);
    this.updateWaitingLairVisibility();
  }
}

function prepareMonsterInLair(monster: MonsterEntity): void {
  monster.arcadePixelPos = ENEMY_MOVEMENT_TUNING.lairArcadePixelPos;
  monster.direction = MONSTER_DIR.up;
  monster.preferredDirection = MONSTER_DIR.up;
  monster.chaseTimer = 0;
  monster.runtimeState = MONSTER_RUNTIME_STATE.waitingInLair;
  monster.movementActive = false;
  monster.collisionActive = false;
  monster.visibleInLair = false;
}

function releaseMonsterFromLair(monster: MonsterEntity): void {
  monster.arcadePixelPos = ENEMY_MOVEMENT_TUNING.lairArcadePixelPos;
  monster.direction = MONSTER_DIR.up;
  monster.preferredDirection = MONSTER_DIR.up;
  monster.runtimeState = MONSTER_RUNTIME_STATE.inMaze;
  monster.movementActive = true;
  monster.collisionActive = true;
  monster.visibleInLair = false;
}
