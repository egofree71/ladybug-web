/**
 * Phaser view for the outer border timer. The timer runtime decides progress;
 * this view only paints white/green tile states in cycle order.
 */
import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import { EnemyReleaseBorderTimer, type EnemyReleaseBorderTimerStepResult } from '../gameplay/enemies/enemyReleaseBorderTimer';
import { BORDER_TIMER, COLORS, MAZE } from '../layout/screenLayout';

const BORDER_TIMER_TILE_ROLE = {
  topLeftCorner: 'topLeftCorner',
  topRightCorner: 'topRightCorner',
  bottomLeftCorner: 'bottomLeftCorner',
  bottomRightCorner: 'bottomRightCorner',
  topHorizontal: 'topHorizontal',
  bottomHorizontal: 'bottomHorizontal',
  leftVertical: 'leftVertical',
  rightVertical: 'rightVertical',
} as const;

type BorderTimerTileRole = (typeof BORDER_TIMER_TILE_ROLE)[keyof typeof BORDER_TIMER_TILE_ROLE];

interface BorderTimerTilePlacement {
  readonly x: number;
  readonly y: number;
  readonly role: BorderTimerTileRole;
}

export interface MazeBorderTimerView {
  readonly timer: EnemyReleaseBorderTimer;
  resetTimer(): void;
  configureForLevel(levelNumber: number): void;
  advanceOneSimulationTick(): EnemyReleaseBorderTimerStepResult;
}

function frameForRole(role: BorderTimerTileRole): number {
  switch (role) {
    case BORDER_TIMER_TILE_ROLE.topLeftCorner:
      return 0;
    case BORDER_TIMER_TILE_ROLE.topRightCorner:
      return 1;
    case BORDER_TIMER_TILE_ROLE.bottomLeftCorner:
      return 2;
    case BORDER_TIMER_TILE_ROLE.bottomRightCorner:
      return 3;
    case BORDER_TIMER_TILE_ROLE.leftVertical:
    case BORDER_TIMER_TILE_ROLE.rightVertical:
      return 4;
    case BORDER_TIMER_TILE_ROLE.topHorizontal:
    case BORDER_TIMER_TILE_ROLE.bottomHorizontal:
      return 5;
  }
}

function positiveModulo(value: number, divisor: number): number {
  const result = value % divisor;
  return result < 0 ? result + divisor : result;
}

function buildBorderTimerTilePlacements(): BorderTimerTilePlacement[] {
  const tileSize = BORDER_TIMER.tileSize;
  const columns = Math.round(MAZE.outerWallWidth / tileSize);
  const rows = Math.round(MAZE.outerWallHeight / tileSize);
  const left = MAZE.outerWallX;
  const top = MAZE.outerWallY;
  const right = left + columns * tileSize;
  const bottom = top + rows * tileSize;
  const placements: BorderTimerTilePlacement[] = [];

  placements.push({ role: BORDER_TIMER_TILE_ROLE.topLeftCorner, x: left - tileSize, y: top - tileSize });

  for (let x = 0; x < columns; x++) {
    placements.push({ role: BORDER_TIMER_TILE_ROLE.topHorizontal, x: left + x * tileSize, y: top - tileSize });
  }

  placements.push({ role: BORDER_TIMER_TILE_ROLE.topRightCorner, x: right, y: top - tileSize });

  for (let y = 0; y < rows; y++) {
    placements.push({ role: BORDER_TIMER_TILE_ROLE.rightVertical, x: right + BORDER_TIMER.rightExtraGap, y: top + y * tileSize });
  }

  placements.push({
    role: BORDER_TIMER_TILE_ROLE.bottomRightCorner,
    x: right,
    y: bottom + BORDER_TIMER.bottomCornerYOffset,
  });

  for (let x = columns - 1; x >= 0; x--) {
    placements.push({ role: BORDER_TIMER_TILE_ROLE.bottomHorizontal, x: left + x * tileSize, y: bottom + BORDER_TIMER.bottomExtraGap });
  }

  placements.push({
    role: BORDER_TIMER_TILE_ROLE.bottomLeftCorner,
    x: left - tileSize,
    y: bottom + BORDER_TIMER.bottomCornerYOffset,
  });

  for (let y = rows - 1; y >= 0; y--) {
    placements.push({
      role: BORDER_TIMER_TILE_ROLE.leftVertical,
      x: left - tileSize + BORDER_TIMER.leftVerticalInset,
      y: top + y * tileSize,
    });
  }

  return placements;
}

/**
 * Renders and advances the maze border timer ring.
 *
 * The view owns only Phaser sprites and visual synchronization. Its runtime state
 * is delegated to EnemyReleaseBorderTimer so future enemy code can consume the
 * same release signal without reading sprite colors.
 */
export function createMazeBorderTimer(scene: Phaser.Scene, levelNumber = 1): MazeBorderTimerView {
  const placements = buildBorderTimerTilePlacements();
  const columns = Math.round(MAZE.outerWallWidth / BORDER_TIMER.tileSize);
  const cycleStartSpriteIndex = 1 + Math.floor(columns / 2);
  const sprites: Phaser.GameObjects.Sprite[] = [];
  const timer = new EnemyReleaseBorderTimer(
    placements.length,
    EnemyReleaseBorderTimer.getTicksPerTileForLevel(levelNumber),
  );

  placements.forEach((placement) => {
    const sprite = scene.add
      .sprite(placement.x, placement.y, ASSET_KEYS.borderTimerTiles, frameForRole(placement.role))
      .setOrigin(0, 0)
      .setDepth(10);

    if (placement.role === BORDER_TIMER_TILE_ROLE.rightVertical) {
      sprite.setFlipX(true);
    }

    if (placement.role === BORDER_TIMER_TILE_ROLE.bottomHorizontal) {
      sprite.setFlipY(true);
    }

    sprites.push(sprite);
  });

  function applyTimerVisualState(): void {
    sprites.forEach((sprite, spriteIndex) => {
      const timerIndex = positiveModulo(spriteIndex - cycleStartSpriteIndex, sprites.length);
      sprite.setTint(timer.isTileGreen(timerIndex) ? COLORS.green : COLORS.white);
    });
  }

  applyTimerVisualState();

  return {
    timer,

    resetTimer(): void {
      timer.reset();
      applyTimerVisualState();
    },

    configureForLevel(nextLevelNumber: number): void {
      timer.ticksPerTile = EnemyReleaseBorderTimer.getTicksPerTileForLevel(Math.max(1, nextLevelNumber));
      timer.reset();
      applyTimerVisualState();
    },

    advanceOneSimulationTick(): EnemyReleaseBorderTimerStepResult {
      const stepResult = timer.advanceOneTick();

      if (stepResult.visualChanged) {
        applyTimerVisualState();
      }

      return stepResult;
    },
  };
}
