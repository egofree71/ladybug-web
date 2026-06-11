import { LEVEL_SCENE_OFFSET } from './screenLayout';

/**
 * Player placement constants copied from the Godot remake.
 *
 * Godot separates two coordinate spaces that matter here:
 * - the rendered maze image starts at the Sprite2D image top-left;
 * - gameplay actors use the Maze node position as their arcade-origin anchor.
 *
 * The player therefore cannot be placed from the collectible grid alone. This
 * file mirrors LevelCoordinateSystem.cs for the initial spawn position while
 * leaving actual movement/collision for a later branch.
 */
export const PLAYER_LAYOUT = {
  startCell: { x: 5, y: 8 },

  cellSizePx: 64,

  // Godot gameplay anchor: (8, 7) arcade pixels at a 4x render scale.
  gameplayAnchorPx: { x: 32, y: 28 },

  // Vertical movement/rendering offset used by PlayerMovementTuning.cs.
  spriteRenderOffsetVerticalPx: { x: 20, y: 32 },

  // Maze Sprite2D position after applying Main.cs LevelScenePosition = (27, -1).
  // This is not the maze image top-left, because the Godot sprite has its own
  // visual offset. Player gameplay coordinates are relative to this origin.
  playfieldOriginPx: {
    x: LEVEL_SCENE_OFFSET.x,
    y: LEVEL_SCENE_OFFSET.y + 40,
  },

  staticFrame: 4,
  depth: 60,
} as const;

export interface PlayerScreenPosition {
  readonly x: number;
  readonly y: number;
}

/** Returns the final player sprite center for the level-start spawn. */
export function getPlayerStartCenter(): PlayerScreenPosition {
  return {
    x:
      PLAYER_LAYOUT.playfieldOriginPx.x +
      PLAYER_LAYOUT.startCell.x * PLAYER_LAYOUT.cellSizePx +
      PLAYER_LAYOUT.gameplayAnchorPx.x +
      PLAYER_LAYOUT.spriteRenderOffsetVerticalPx.x,
    y:
      PLAYER_LAYOUT.playfieldOriginPx.y +
      PLAYER_LAYOUT.startCell.y * PLAYER_LAYOUT.cellSizePx +
      PLAYER_LAYOUT.gameplayAnchorPx.y +
      PLAYER_LAYOUT.spriteRenderOffsetVerticalPx.y,
  };
}
