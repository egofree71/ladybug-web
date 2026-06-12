/**
 * Player placement helpers copied from the Godot coordinate system. They bridge
 * HUD entry positions and in-maze arcade-pixel anchors.
 */
import { arcadeDeltaToScreenDelta, arcadePixelToScreenPosition, logicalCellToArcadePixel, PLAYFIELD_COORDS } from './playfieldCoordinates';
import { getSpriteRenderOffsetArcade } from '../gameplay/player/playerMovementTuning';
import { type Vector2i, VEC2 } from '../gameplay/math/vector2';

/**
 * Player placement constants copied from the Godot remake.
 *
 * Movement itself now uses arcade-pixel coordinates, but this file remains the
 * scene-facing layout helper for the rendered sprite and the HUD entry target.
 */
export const PLAYER_LAYOUT = {
  startCell: { x: 5, y: 8 },
  cellSizePx: PLAYFIELD_COORDS.cellSizeArcadePx * PLAYFIELD_COORDS.renderScale,
  startArcadePixelPos: logicalCellToArcadePixel({ x: 5, y: 8 }),
  gameplayAnchorPx: {
    x: PLAYFIELD_COORDS.gameplayAnchorArcade.x * PLAYFIELD_COORDS.renderScale,
    y: PLAYFIELD_COORDS.gameplayAnchorArcade.y * PLAYFIELD_COORDS.renderScale,
  },
  playfieldOriginPx: PLAYFIELD_COORDS.originScreen,
  staticFrame: 4,
  depth: 60,
} as const;

export interface PlayerScreenPosition {
  readonly x: number;
  readonly y: number;
}

/** Returns the final player sprite center for the level-start spawn. */
export function getPlayerStartCenter(): PlayerScreenPosition {
  return getPlayerScreenCenterFromArcadePixel(logicalCellToArcadePixel(PLAYER_LAYOUT.startCell), VEC2.up);
}

/** Converts the player gameplay anchor plus facing-dependent render offset to a sprite center. */
export function getPlayerScreenCenterFromArcadePixel(
  arcadePixelPos: Vector2i,
  offsetDirection: Vector2i,
): PlayerScreenPosition {
  const anchor = arcadePixelToScreenPosition(arcadePixelPos);
  const renderOffset = arcadeDeltaToScreenDelta(getSpriteRenderOffsetArcade(offsetDirection));

  return {
    x: anchor.x + renderOffset.x,
    y: anchor.y + renderOffset.y,
  };
}
