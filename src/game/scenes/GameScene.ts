import Phaser from 'phaser';
import { ASSET_KEYS, assetUrl } from '../assets';
import { MAZE } from '../layout/screenLayout';
import { createHud } from '../render/hudView';
import { createMazeBorderTimer } from '../render/mazeBorderTimerView';
import { createBaseFlowerCollectibles } from '../render/collectibleView';
import { createRotatingGates } from '../render/gateView';

/**
 * First playable-screen shell for the Phaser remake.
 *
 * This scene intentionally renders only the static playfield structure: maze,
 * border timer, rotating gates, and HUD. Player movement, collectibles, scoring,
 * enemies, and real timer behavior are left for focused follow-up branches.
 */
export class GameScene extends Phaser.Scene {
  public constructor() {
    super('GameScene');
  }

  public preload(): void {
    this.load.image(ASSET_KEYS.mazeBackground, assetUrl('assets/images/maze_background.png'));

    this.load.spritesheet(ASSET_KEYS.borderTimerTiles, assetUrl('assets/sprites/props/maze_border_timer_tiles.png'), {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.spritesheet(ASSET_KEYS.rotatingGate, assetUrl('assets/sprites/props/rotating_gate.png'), {
      frameWidth: 128,
      frameHeight: 128,
    });

    this.load.spritesheet(ASSET_KEYS.collectibles, assetUrl('assets/sprites/props/collectibles.png'), {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.json(ASSET_KEYS.collectibleLayout, assetUrl('assets/data/collectibles_layout.json'));

    this.load.spritesheet(ASSET_KEYS.ladybug, assetUrl('assets/sprites/player/ladybug_spritesheet.png'), {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.spritesheet(ASSET_KEYS.hudArcadeFont26, assetUrl('assets/fonts/hud_arcade_font_26.png'), {
      frameWidth: 26,
      frameHeight: 28,
    });

    this.load.spritesheet(ASSET_KEYS.hudArcadeFont28, assetUrl('assets/fonts/hud_arcade_font_28.png'), {
      frameWidth: 28,
      frameHeight: 28,
    });
  }

  public create(): void {
    this.cameras.main.setRoundPixels(true);

    this.add
      .image(MAZE.imageX, MAZE.imageY, ASSET_KEYS.mazeBackground)
      .setOrigin(0, 0)
      .setDepth(0);

    createMazeBorderTimer(this);
    createBaseFlowerCollectibles(this);
    createRotatingGates(this);
    createHud(this);
  }
}
