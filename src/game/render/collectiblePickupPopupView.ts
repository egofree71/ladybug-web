/**
 * Phaser view for the temporary heart/letter score popup. The tick countdown
 * lives in collectiblePickupPopupState.ts.
 */
import Phaser from 'phaser';
import { COLLECTIBLE_PICKUP_POPUP_LAYOUT } from '../layout/collectibleLayout';
import type { CollectibleCell } from '../gameplay/collectibles/collectibleTypes';
import type { CollectibleScoreCalculation } from '../gameplay/scoring/collectibleScoreService';
import { logicalCellToArcadePixel, arcadePixelToScreenPosition } from '../layout/playfieldCoordinates';
import { createPixelText } from './pixelTextView';

const WHITE_TINT = 0xffffff;
const SHADOW_TINT = 0x000000;
const SHADOW_OFFSET_PX = 2;

/**
 * Temporary view that replaces the player during heart and letter pickup pauses.
 *
 * The popup is intentionally rendered with the same bitmap-glyph system as the
 * HUD so the small score text remains crisp and avoids browser text smoothing.
 */
export class CollectiblePickupPopupView {
  private readonly scene: Phaser.Scene;
  private container?: Phaser.GameObjects.Container;

  public constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Displays the popup at the logical cell where the collectible was consumed. */
  public show(cell: CollectibleCell, scoreCalculation: CollectibleScoreCalculation): void {
    this.clear();

    const position = arcadePixelToScreenPosition(logicalCellToArcadePixel(cell));
    this.container = this.scene.add.container(position.x, position.y).setDepth(COLLECTIBLE_PICKUP_POPUP_LAYOUT.depth);

    this.addPopupLine({
      text: scoreCalculation.baseScore.toString(),
      x: COLLECTIBLE_PICKUP_POPUP_LAYOUT.scoreLineCenterX,
      y: COLLECTIBLE_PICKUP_POPUP_LAYOUT.scoreLineCenterY,
      align: 'center',
    });

    if (scoreCalculation.multiplier > 1) {
      this.addPopupLine({
        text: `x${scoreCalculation.multiplier}`,
        x: COLLECTIBLE_PICKUP_POPUP_LAYOUT.multiplierLineRightX,
        y: COLLECTIBLE_PICKUP_POPUP_LAYOUT.multiplierLineCenterY,
        align: 'right',
      });
    }
  }

  /** Removes the popup if it is currently visible. */
  public clear(): void {
    this.container?.destroy(true);
    this.container = undefined;
  }

  private addPopupLine(options: { readonly text: string; readonly x: number; readonly y: number; readonly align: 'center' | 'right' }): void {
    if (!this.container) {
      return;
    }

    // A tiny shadow reproduces the Godot label settings and keeps the score
    // readable on top of the maze without involving antialiased Phaser.Text.
    this.container.add(createPixelText(this.scene, {
      text: options.text,
      x: options.x + SHADOW_OFFSET_PX,
      y: options.y + SHADOW_OFFSET_PX,
      fontSize: COLLECTIBLE_PICKUP_POPUP_LAYOUT.fontSizePx,
      tint: SHADOW_TINT,
      align: options.align,
      originY: 0.5,
    }));

    this.container.add(createPixelText(this.scene, {
      text: options.text,
      x: options.x,
      y: options.y,
      fontSize: COLLECTIBLE_PICKUP_POPUP_LAYOUT.fontSizePx,
      tint: WHITE_TINT,
      align: options.align,
      originY: 0.5,
    }));
  }
}
