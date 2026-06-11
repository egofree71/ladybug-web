/**
 * Shared screen layout constants for the static Phaser playfield shell.
 *
 * The values below are taken from the Godot version instead of from a cropped
 * browser screenshot. Godot renders the level scene inside an 800x880 viewport
 * and shifts the Level node by (27, -1) from Main.cs. The HUD is a CanvasLayer,
 * so it keeps screen-space anchors from Level.tscn and is not shifted with the
 * maze itself.
 */
export const SCREEN = {
  width: 800,
  height: 880,
} as const;

/** Scene-space offset applied by Main.cs when it instantiates Level.tscn. */
export const LEVEL_SCENE_OFFSET = {
  x: 27,
  y: -1,
} as const;

/**
 * Maze placement after applying the Level node offset.
 *
 * In Level.tscn the Maze Sprite2D is authored at position (0, 40) with an
 * offset of (16, 24), so its rendered top-left corner becomes (16, 64) inside
 * the Level. Main.cs then places the whole Level at (27, -1), producing the
 * final web/playfield origin used here: (43, 63).
 */
export const MAZE = {
  imageX: LEVEL_SCENE_OFFSET.x + 16,
  imageY: LEVEL_SCENE_OFFSET.y + 64,
  imageWidth: 712,
  imageHeight: 712,
  outerWallX: LEVEL_SCENE_OFFSET.x + 16,
  outerWallY: LEVEL_SCENE_OFFSET.y + 64,
  outerWallWidth: 704,
  outerWallHeight: 704,
} as const;

export const BORDER_TIMER = {
  tileSize: 32,

  // Godot's MazeBorderTimer.tscn uses extra offsets only on the right and bottom
  // edges. The tile artwork itself has transparent margins, which is what creates
  // the visible 4 px gap between the colored bricks and the purple maze wall.
  rightExtraGap: 8,

  // The bottom horizontal tiles look correct one pixel above the Godot-authored
  // bottom offset in Phaser's native-pixel rendering.
  bottomExtraGap: 7,

  // Keep only the bottom corner tiles one pixel above the vertical tile grid so
  // their visible brick band aligns with the bottom horizontal edge.
  bottomCornerYOffset: -1,
  leftVerticalInset: 0,
} as const;

export const HUD = {
  // These are the screen-space anchors from Level.tscn. They intentionally do
  // not include LEVEL_SCENE_OFFSET because the Godot HUD is rendered by a
  // CanvasLayer, not inside the shifted Level coordinate space.
  topY: 15,
  leftX: 22,
  centerX: SCREEN.width / 2,
  rightX: SCREEN.width - 22,

  bottomLivesCenterY: SCREEN.height - 42,
  bottomScoreCenterY: SCREEN.height - 40,
  scoreX: SCREEN.width - 20,
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
  scoreSizePx: 28,
} as const;
