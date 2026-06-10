/**
 * Shared screen layout constants for the first Phaser playfield shell.
 *
 * The arcade reference screenshot is 832x880. The Godot remake maze image is
 * 712x712, but in the web shell we leave one full timer-tile column visible on
 * the left instead of letting it be clipped by the canvas edge. This also gives
 * us clean alignment anchors for SPECIAL, the reserve lives, the score, and the
 * multiplier labels.
 */
export const SCREEN = {
  width: 832,
  height: 880,
} as const;

export const MAZE = {
  // Shift the whole playfield 16 px to the right so the left timer bricks are
  // fully visible. Gate coordinates are shifted by the same amount in
  // gateLayout.ts.
  imageX: 32,
  imageY: 64,
  imageWidth: 712,
  imageHeight: 712,
  outerWallX: 32,
  outerWallY: 64,
  outerWallWidth: 704,
  outerWallHeight: 704,
} as const;

export const BORDER_TIMER = {
  tileSize: 32,
  rightExtraGap: 8,
  bottomExtraGap: 8,

  // Keep the left vertical timer tile fully inside the canvas. The white part
  // of the sprite sits inside the 32x32 frame, so this preserves the small black
  // gap before the purple maze wall while avoiding the previous clipping.
  leftVerticalInset: 0,

  // Temporary visual progress for the static screen branch. The real timer
  // simulation will replace this in a later feature branch.
  previewGreenTileCount: 34,
} as const;

export const HUD = {
  // Align the main HUD labels with the timer frame rather than with the canvas
  // center margins. This matches the arcade composition better than the previous
  // hand-tuned offsets.
  topY: 4,
  leftX: 16,
  centerX: SCREEN.width / 2,
  rightX: SCREEN.width - 16,

  // Reserve lives share the same left anchor as SPECIAL. The vertical placement
  // is restored to the value that looked correct before the extra upward nudge.
  bottomLivesCenterY: SCREEN.height - 42,
  bottomScoreCenterY: SCREEN.height - 40,
  scoreX: SCREEN.width - 16,
  livesX: 16,
  lifeIconSpacing: 64,
} as const;

export const COLORS = {
  white: 0xffffff,
  grey: '#c8c8c8',
  green: 0x51ff51,
} as const;

export const FONT = {
  // The browser-visible font family is registered in main.ts through FontFace.
  // A single custom name avoids quoting issues with canvas text rendering.
  family: 'LadyBugArcade',
  fallbackFamily: 'monospace',
  topSizePx: 26,
  scoreSizePx: 34,
} as const;
