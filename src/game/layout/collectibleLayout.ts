import { MAZE } from './screenLayout';

/**
 * Logical collectible cell inside the 11x11 Lady Bug board.
 *
 * The Godot remake uses this logical grid to place flowers first, then later
 * replaces selected cells with hearts, letters, and skulls. This web branch only
 * renders the base flowers, but it keeps the same cell model so the later
 * collectible gameplay code can build on it instead of replacing it.
 */
export interface CollectibleCell {
  readonly x: number;
  readonly y: number;
}

/** Serialized shape of public/assets/data/collectibles_layout.json. */
export interface CollectibleLayoutData {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly (readonly number[])[];
}

/**
 * Visual placement constants copied from the Godot collectible scene.
 *
 * Collectibles occupy one 64x64 rendered cell, which corresponds to one 16x16
 * arcade cell scaled by 4 in the Godot remake. In Godot, the collectible node is
 * placed at the gameplay anchor and the sprite has an offset. The final visible
 * top-left corner resolves to the maze image top-left plus one 64px cell step.
 */
export const COLLECTIBLE_LAYOUT = {
  cellSizePx: 64,
  frameWidth: 64,
  frameHeight: 64,
  flowerFrame: 1,
  depth: 15,
} as const;

/**
 * Converts the serialized 0/1 flower mask into logical cells.
 *
 * Invalid rows are treated defensively and simply ignored outside the declared
 * width/height. The source file is expected to be stable, but this keeps the
 * preview scene from crashing on a malformed local edit.
 */
export function collectFlowerCells(layout: CollectibleLayoutData): CollectibleCell[] {
  const flowerCells: CollectibleCell[] = [];

  for (let y = 0; y < layout.height; y++) {
    const row = layout.cells[y] ?? [];

    for (let x = 0; x < layout.width; x++) {
      if (row[x] === 1) {
        flowerCells.push({ x, y });
      }
    }
  }

  return flowerCells;
}

export interface CollectibleDrawPosition {
  readonly x: number;
  readonly y: number;
}

/** Returns the Phaser top-left draw position for one collectible cell. */
export function getCollectibleTopLeft(cell: CollectibleCell): CollectibleDrawPosition {
  return {
    x: MAZE.imageX + cell.x * COLLECTIBLE_LAYOUT.cellSizePx,
    y: MAZE.imageY + cell.y * COLLECTIBLE_LAYOUT.cellSizePx,
  };
}
