import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import {
  COLLECTIBLE_LAYOUT,
  collectFlowerCells,
  getCollectibleTopLeft,
  type CollectibleLayoutData,
} from '../layout/collectibleLayout';

/**
 * Draws the initial flower field from the same 11x11 mask as the Godot remake.
 *
 * This is deliberately a static renderer for now. It does not create gameplay
 * state, collision checks, scoring, pickup removal, hearts, letters, or skulls.
 * Those rules will be added in later branches once the web scene has a stable
 * visual baseline.
 */
export function createBaseFlowerCollectibles(scene: Phaser.Scene): void {
  const layout = scene.cache.json.get(ASSET_KEYS.collectibleLayout) as CollectibleLayoutData | undefined;

  if (!layout) {
    console.warn('[LadyBugWeb] Missing collectible layout JSON; base flowers were not rendered.');
    return;
  }

  for (const cell of collectFlowerCells(layout)) {
    const position = getCollectibleTopLeft(cell);

    scene.add
      .sprite(position.x, position.y, ASSET_KEYS.collectibles, COLLECTIBLE_LAYOUT.flowerFrame)
      .setOrigin(0, 0)
      .setDepth(COLLECTIBLE_LAYOUT.depth);
  }
}
