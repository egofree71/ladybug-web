import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
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
 * Renders the maze border timer ring as white and green tiles.
 *
 * For this first branch the amount of green progress is fixed. The tile order and
 * top-middle start index already match the Godot implementation, so the later
 * enemy-release timer can drive the same visual layer instead of replacing it.
 */
export function createMazeBorderTimer(scene: Phaser.Scene): void {
  const placements = buildBorderTimerTilePlacements();
  const columns = Math.round(MAZE.outerWallWidth / BORDER_TIMER.tileSize);
  const cycleStartSpriteIndex = 1 + Math.floor(columns / 2);

  placements.forEach((placement, spriteIndex) => {
    const timerIndex = positiveModulo(spriteIndex - cycleStartSpriteIndex, placements.length);
    const isGreen = timerIndex < BORDER_TIMER.previewGreenTileCount;

    const sprite = scene.add
      .sprite(placement.x, placement.y, ASSET_KEYS.borderTimerTiles, frameForRole(placement.role))
      .setOrigin(0, 0)
      .setDepth(10)
      .setTint(isGreen ? COLORS.green : COLORS.white);

    if (placement.role === BORDER_TIMER_TILE_ROLE.rightVertical) {
      sprite.setFlipX(true);
    }

    if (placement.role === BORDER_TIMER_TILE_ROLE.bottomHorizontal) {
      sprite.setFlipY(true);
    }
  });
}
