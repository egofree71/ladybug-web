import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import { COLORS, FONT, HUD } from '../layout/screenLayout';

function hudTextStyle(fontSizePx: number): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: `${FONT.family}, ${FONT.fallbackFamily}`,
    fontSize: `${fontSizePx}px`,
    color: COLORS.grey,
  };
}

/**
 * Draws the non-interactive HUD shell: SPECIAL, EXTRA, multiplier labels,
 * reserve lives, and score.
 *
 * The current score and word/multiplier colors are placeholders. The scoring and
 * collectible branches will later replace this with dynamic HUD state.
 */
export function createHud(scene: Phaser.Scene): void {
  scene.add
    .text(HUD.leftX, HUD.topY, 'SPECIAL', hudTextStyle(FONT.topSizePx))
    .setDepth(100);

  scene.add
    .text(HUD.centerX, HUD.topY, 'EXTRA', hudTextStyle(FONT.topSizePx))
    .setOrigin(0.5, 0)
    .setDepth(100);

  scene.add
    .text(HUD.rightX, HUD.topY, 'x2 x3 x5', hudTextStyle(FONT.topSizePx))
    .setOrigin(1, 0)
    .setDepth(100);

  // The Godot HUD displays reserve lives only while the current ladybug is in
  // the maze. With three lives total, that means two visible spare icons.
  for (let i = 0; i < 2; i++) {
    scene.add
      .sprite(HUD.livesX + i * HUD.lifeIconSpacing, HUD.bottomLivesCenterY, ASSET_KEYS.ladybug, 1)
      .setOrigin(0, 0.5)
      .setDepth(100);
  }

  scene.add
    .text(HUD.scoreX, HUD.bottomScoreCenterY, '0', hudTextStyle(FONT.scoreSizePx))
    .setOrigin(1, 0.5)
    .setDepth(100);
}
