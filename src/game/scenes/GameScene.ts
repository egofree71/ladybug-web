import Phaser from 'phaser';
import { ASSET_KEYS, assetUrl } from '../assets';
import { MAZE } from '../layout/screenLayout';
import { CollectibleColorCycle } from '../gameplay/collectibles/collectibleColorCycle';
import { FixedArcadeClock } from '../gameplay/timing/fixedArcadeClock';
import { createHud } from '../render/hudView';
import { createMazeBorderTimer } from '../render/mazeBorderTimerView';
import { createLevelOneCollectibles, type CollectibleFieldView } from '../render/collectibleView';
import { createRotatingGates } from '../render/gateView';

/**
 * First playable-screen shell for the Phaser remake.
 *
 * The scene now owns a small fixed-step gameplay loop so visual timers can be
 * validated before player movement and enemies are added. The collectible color
 * cycle is advanced from that fixed loop and remains separate from the maze
 * border / enemy-release timer that will be implemented in a later branch.
 */
export class GameScene extends Phaser.Scene {
  private readonly arcadeClock = new FixedArcadeClock();
  private readonly collectibleColorCycle = new CollectibleColorCycle();
  private collectibleField?: CollectibleFieldView;

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
    this.arcadeClock.reset();
    this.collectibleColorCycle.resetToBlue();

    this.add
      .image(MAZE.imageX, MAZE.imageY, ASSET_KEYS.mazeBackground)
      .setOrigin(0, 0)
      .setDepth(0);

    createMazeBorderTimer(this);
    this.collectibleField = createLevelOneCollectibles(this, this.collectibleColorCycle.currentColor);
    createRotatingGates(this);
    createHud(this);
  }

  public override update(_time: number, delta: number): void {
    this.arcadeClock.runFrame(delta, () => this.runOneSimulationTick());
  }

  private runOneSimulationTick(): void {
    if (this.collectibleColorCycle.advanceOneTick()) {
      this.collectibleField?.applyColorCycle(this.collectibleColorCycle.currentColor);
    }
  }
}
