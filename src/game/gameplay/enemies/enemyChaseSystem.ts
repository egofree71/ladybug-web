/**
 * Pathfinding helper used by enemy AI to chase the player through the logical
 * maze. It deliberately works on the navigation grid rather than Phaser pixels.
 */
import { arcadePixelToLogicalCell } from '../../layout/playfieldCoordinates';
import type { MonsterEntity } from './monsterEntity';
import { MONSTER_DIR } from './monsterDirection';
import type { EnemyNavigationGrid } from './enemyNavigationGrid';

const B8_TICK_DIVIDER = 60;

/**
 * Owns the temporary round-robin chase timers used by enemies.
 *
 * The early-level pattern follows the validated Godot notes: level-dependent
 * first activation, then +0x08 B8 units, with only one slot selected each time.
 */
export class EnemyChaseSystem {
  private readonly levelNumber: number;
  private divider = 0;
  private b8 = 0;
  private roundRobinIndex = 0;
  private activationIndex = 0;

  public constructor(levelNumber: number) {
    this.levelNumber = levelNumber;
  }

  public reset(): void {
    this.divider = 0;
    this.b8 = 0;
    this.roundRobinIndex = 0;
    this.activationIndex = 0;
  }

  public advanceOneTick(monsters: readonly MonsterEntity[]): void {
    this.divider += 1;

    if (this.divider < B8_TICK_DIVIDER) {
      return;
    }

    this.divider = 0;
    this.b8 += 1;

    for (const monster of monsters) {
      if (monster.chaseTimer > 0) {
        monster.chaseTimer -= 1;
      }
    }

    if (!this.shouldActivateAtCurrentB8()) {
      return;
    }

    const selectedIndex = this.roundRobinIndex & 0x03;
    this.roundRobinIndex = (this.roundRobinIndex + 1) & 0x03;

    const selected = monsters[selectedIndex];
    if (!selected?.movementActive || selected.chaseTimer > 0) {
      this.activationIndex += 1;
      return;
    }

    selected.chaseTimer = this.getDurationForActivation(this.activationIndex);
    this.activationIndex += 1;
  }

  public applyBfsOverride(monsters: readonly MonsterEntity[], navigationGrid: EnemyNavigationGrid): void {
    for (const monster of monsters) {
      if (!monster.movementActive || monster.chaseTimer <= 0) {
        continue;
      }

      const cell = arcadePixelToLogicalCell(monster.arcadePixelPos);
      const bfsDir = navigationGrid.getBfsDirection(cell);

      if (bfsDir !== MONSTER_DIR.none) {
        monster.preferredDirection = bfsDir;
      }
    }
  }

  private shouldActivateAtCurrentB8(): boolean {
    const firstActivation = this.levelNumber === 1
      ? 0x15
      : this.levelNumber < 5
        ? 0x0D
        : 0x05;

    return this.b8 >= firstActivation && ((this.b8 - firstActivation) % 0x08) === 0;
  }

  private getDurationForActivation(activationIndex: number): number {
    if (this.levelNumber === 1) {
      return 4 + Math.floor(activationIndex / 2);
    }

    if (this.levelNumber < 5) {
      return 3 + Math.floor((activationIndex + 1) / 2);
    }

    return 3 + Math.floor(activationIndex / 2);
  }
}
