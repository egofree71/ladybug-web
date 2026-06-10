import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import { BORDER_TIMER, COLORS, MAZE } from '../layout/screenLayout';

enum BorderTimerTileRole {
  TopLeftCorner,
  TopRightCorner,
  BottomLeftCorner,
  BottomRightCorner,
  TopHorizontal,
  BottomHorizontal,
  LeftVertical,
  RightVertical,
}

interface BorderTimerTilePlacement {
  readonly x: number;
  readonly y: number;
  readonly role: BorderTimerTileRole;
}

function frameForRole(role: BorderTimerTileRole): number {
  switch (role) {
    case BorderTimerTileRole.TopLeftCorner:
      return 0;
    case BorderTimerTileRole.TopRightCorner:
      return 1;
    case BorderTimerTileRole.BottomLeftCorner:
      return 2;
    case BorderTimerTileRole.BottomRightCorner:
      return 3;
    case BorderTimerTileRole.LeftVertical:
    case BorderTimerTileRole.RightVertical:
      return 4;
    case BorderTimerTileRole.TopHorizontal:
    case BorderTimerTileRole.BottomHorizontal:
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

  placements.push({ role: BorderTimerTileRole.TopLeftCorner, x: left - tileSize, y: top - tileSize });

  for (let x = 0; x < columns; x++) {
    placements.push({ role: BorderTimerTileRole.TopHorizontal, x: left + x * tileSize, y: top - tileSize });
  }

  placements.push({ role: BorderTimerTileRole.TopRightCorner, x: right, y: top - tileSize });

  for (let y = 0; y < rows; y++) {
    placements.push({ role: BorderTimerTileRole.RightVertical, x: right + BORDER_TIMER.rightExtraGap, y: top + y * tileSize });
  }

  placements.push({
    role: BorderTimerTileRole.BottomRightCorner,
    x: right,
    y: bottom + BORDER_TIMER.bottomCornerYOffset,
  });

  for (let x = columns - 1; x >= 0; x--) {
    placements.push({ role: BorderTimerTileRole.BottomHorizontal, x: left + x * tileSize, y: bottom + BORDER_TIMER.bottomExtraGap });
  }

  placements.push({
    role: BorderTimerTileRole.BottomLeftCorner,
    x: left - tileSize,
    y: bottom + BORDER_TIMER.bottomCornerYOffset,
  });

  for (let y = rows - 1; y >= 0; y--) {
    placements.push({
      role: BorderTimerTileRole.LeftVertical,
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

    if (placement.role === BorderTimerTileRole.RightVertical) {
      sprite.setFlipX(true);
    }

    if (placement.role === BorderTimerTileRole.BottomHorizontal) {
      sprite.setFlipY(true);
    }
  });
}
