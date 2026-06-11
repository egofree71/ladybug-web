import { MAZE } from './screenLayout';
import type { CollectibleCell } from '../gameplay/collectibles/collectibleTypes';

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
 * arcade cell scaled by 4 in the Godot remake. The sprite frames already include
 * the scene offsets from Collectible.tscn, so the web renderer can draw each
 * frame directly at the logical cell top-left.
 */
export const COLLECTIBLE_LAYOUT = {
  cellSizePx: 64,
  frameWidth: 64,
  frameHeight: 64,
  depth: 15,
} as const;


/** Score / multiplier popup placement tuned as a compact sprite-like overlay. */
export const COLLECTIBLE_PICKUP_POPUP_LAYOUT = {
  fontSizePx: 16,
  depth: 100,

  // The popup container is placed at LogicalCellToScenePosition(cell). The base
  // score stays centered in the upper part of the collectible cell.
  scoreLineCenterX: 18,
  scoreLineCenterY: 17,

  // The multiplier is intentionally anchored farther right and lower than the
  // score, matching the arcade-style layout where it sits in the bottom-right
  // corner of the temporary popup area.
  multiplierLineRightX: 42,
  multiplierLineCenterY: 43,
} as const;

/** Sprite frame mapping from the Godot Collectible.cs view. */
export const COLLECTIBLE_FRAMES = {
  skull: 0,
  flower: 1,
  heartRing: 2,
  heartCenter: 3,
  letters: {
    E: 4,
    X: 5,
    T: 6,
    R: 7,
    A: 8,
    S: 9,
    P: 10,
    C: 11,
    I: 12,
    L: 13,
  },
} as const;

/** Arcade-like colors used by hearts and letters in the Godot remake. */
export const COLLECTIBLE_TINTS = {
  red: 0xff5100,
  yellow: 0xffff00,
  blue: 0x00aeff,
  white: 0xffffff,
  none: 0xffffff,
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
