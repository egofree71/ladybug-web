import { LEVEL_SCENE_OFFSET } from './screenLayout';
import { type Vector2i, vec2 } from '../gameplay/math/vector2';

const CELL_SIZE_ARCADE_PX = 16;
const RENDER_SCALE = 4;
const GAMEPLAY_ANCHOR_ARCADE = vec2(8, 7);
const PLAYFIELD_ORIGIN_SCREEN = vec2(LEVEL_SCENE_OFFSET.x, LEVEL_SCENE_OFFSET.y + 40);

/**
 * Coordinate conversion for the active Lady Bug playfield.
 *
 * This mirrors LevelCoordinateSystem.cs from the Godot remake. Gameplay is
 * represented in 16x16 original arcade cells; rendering is then scaled by four
 * into the Phaser canvas. Player movement code must use this file instead of
 * measuring from the visible maze background, because the Godot maze sprite has
 * a separate image offset while actors use the Maze node as their origin.
 */
export const PLAYFIELD_COORDS = {
  cellSizeArcadePx: CELL_SIZE_ARCADE_PX,
  renderScale: RENDER_SCALE,
  gameplayAnchorArcade: GAMEPLAY_ANCHOR_ARCADE,
  originScreen: PLAYFIELD_ORIGIN_SCREEN,
} as const;

export function logicalCellToArcadePixel(cell: Vector2i): Vector2i {
  return {
    x: cell.x * CELL_SIZE_ARCADE_PX + GAMEPLAY_ANCHOR_ARCADE.x,
    y: cell.y * CELL_SIZE_ARCADE_PX + GAMEPLAY_ANCHOR_ARCADE.y,
  };
}

export function arcadePixelToLogicalCell(arcadePixel: Vector2i): Vector2i {
  const halfCell = CELL_SIZE_ARCADE_PX / 2;

  return {
    x: floorDiv(arcadePixel.x - GAMEPLAY_ANCHOR_ARCADE.x + halfCell, CELL_SIZE_ARCADE_PX),
    y: floorDiv(arcadePixel.y - GAMEPLAY_ANCHOR_ARCADE.y + halfCell, CELL_SIZE_ARCADE_PX),
  };
}

export function gatePivotToArcadePixel(pivot: Vector2i): Vector2i {
  return {
    x: pivot.x * CELL_SIZE_ARCADE_PX,
    y: pivot.y * CELL_SIZE_ARCADE_PX,
  };
}

export function arcadePixelToScreenPosition(arcadePixel: Vector2i): Vector2i {
  return {
    x: PLAYFIELD_ORIGIN_SCREEN.x + arcadePixel.x * RENDER_SCALE,
    y: PLAYFIELD_ORIGIN_SCREEN.y + arcadePixel.y * RENDER_SCALE,
  };
}

export function arcadeDeltaToScreenDelta(arcadeDelta: Vector2i): Vector2i {
  return {
    x: arcadeDelta.x * RENDER_SCALE,
    y: arcadeDelta.y * RENDER_SCALE,
  };
}

function floorDiv(value: number, divisor: number): number {
  return Math.floor(value / divisor);
}
