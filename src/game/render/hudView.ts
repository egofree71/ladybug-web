import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import { FONT, HUD } from '../layout/screenLayout';
import { createPixelText } from './pixelTextView';

const HUD_GREY_TINT = 0xc8c8c8;

/**
 * Draws the non-interactive HUD shell: SPECIAL, EXTRA, multiplier labels,
 * reserve lives, and score.
 *
 * The text is rendered with a generated bitmap font instead of Phaser Text so
 * the static screen remains sharp in native pixel-perfect mode. The current
 * score and word/multiplier colors are placeholders. The scoring and collectible
 * branches will later replace this with dynamic HUD state.
 */
export function createHud(scene: Phaser.Scene): void {
  createPixelText(scene, {
    text: 'SPECIAL',
    x: HUD.leftX,
    y: HUD.topY,
    fontSize: FONT.topSizePx,
    tint: HUD_GREY_TINT,
    depth: 100,
  });

  createPixelText(scene, {
    text: 'EXTRA',
    x: HUD.centerX,
    y: HUD.topY,
    fontSize: FONT.topSizePx,
    tint: HUD_GREY_TINT,
    align: 'center',
    depth: 100,
  });

  createPixelText(scene, {
    text: 'x2 x3 x5',
    x: HUD.rightX,
    y: HUD.topY,
    fontSize: FONT.topSizePx,
    tint: HUD_GREY_TINT,
    align: 'right',
    depth: 100,
  });

  // The Godot HUD displays reserve lives only while the current ladybug is in
  // the maze. With three lives total, that means two visible spare icons.
  for (let i = 0; i < 2; i++) {
    scene.add
      .sprite(HUD.livesX + i * HUD.lifeIconSpacing, HUD.bottomLivesCenterY, ASSET_KEYS.ladybug, 1)
      .setOrigin(0, 0.5)
      .setDepth(100);
  }

  createPixelText(scene, {
    text: '0',
    x: HUD.scoreX,
    y: HUD.bottomScoreCenterY,
    fontSize: FONT.scoreSizePx,
    tint: HUD_GREY_TINT,
    align: 'right',
    originY: 0.5,
    depth: 100,
  });
}
