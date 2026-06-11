import Phaser from 'phaser';
import { ASSET_KEYS, assetUrl } from '../assets';
import { MAZE } from '../layout/screenLayout';
import { CollectibleColorCycle } from '../gameplay/collectibles/collectibleColorCycle';
import { FixedArcadeClock } from '../gameplay/timing/fixedArcadeClock';
import { MazeGrid } from '../gameplay/maze/mazeGrid';
import { PlayerInputState } from '../gameplay/player/playerInputState';
import { PlayerMovementMotor } from '../gameplay/player/playerMovementMotor';
import { PLAYER_LAYOUT } from '../layout/playerLayout';
import { createHud, type HudView } from '../render/hudView';
import { createMazeBorderTimer } from '../render/mazeBorderTimerView';
import { createLevelOneCollectibles, type CollectibleFieldView } from '../render/collectibleView';
import { createRotatingGates, type GateFieldView } from '../render/gateView';
import { getPlayerStartCenter } from '../layout/playerLayout';
import { PlayerView } from '../render/playerView';

/**
 * First gameplay scene for the Phaser remake.
 *
 * Player movement, collectible colors, and gate timers are advanced from the
 * fixed-step clock. Phaser's display update cadence only decides when the most
 * recent simulation state is rendered; it does not directly set gameplay speed.
 */
export class GameScene extends Phaser.Scene {
  private readonly arcadeClock = new FixedArcadeClock();
  private readonly collectibleColorCycle = new CollectibleColorCycle();
  private collectibleField?: CollectibleFieldView;
  private gateField?: GateFieldView;
  private hud?: HudView;
  private player?: PlayerView;
  private playerInput?: PlayerInputState;
  private playerMovement?: PlayerMovementMotor;

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
    this.load.json(ASSET_KEYS.mazeLayout, assetUrl('assets/data/maze.json'));

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

    const mazeGrid = MazeGrid.fromDataFile(this.cache.json.get(ASSET_KEYS.mazeLayout));

    this.add
      .image(MAZE.imageX, MAZE.imageY, ASSET_KEYS.mazeBackground)
      .setOrigin(0, 0)
      .setDepth(0);

    createMazeBorderTimer(this);
    this.collectibleField = createLevelOneCollectibles(this, this.collectibleColorCycle.currentColor);
    this.gateField = createRotatingGates(this);

    this.player = new PlayerView(this);
    this.playerInput = new PlayerInputState(this);
    this.playerMovement = new PlayerMovementMotor(
      mazeGrid,
      this.gateField.gateSystem,
      PLAYER_LAYOUT.startCell,
    );
    this.hud = createHud(this);
    this.startPlayerEntryAnimation();
  }

  public override update(_time: number, delta: number): void {
    this.arcadeClock.runFrame(delta, () => this.runOneSimulationTick());
  }

  private runOneSimulationTick(): void {
    if (this.hud?.isLifeEntryAnimationActive) {
      this.hud.advanceLifeEntryAnimationOneTick();
      return;
    }

    this.gateField?.gateSystem.advanceOneTick();

    if (this.collectibleColorCycle.advanceOneTick()) {
      this.collectibleField?.applyColorCycle(this.collectibleColorCycle.currentColor);
    }

    this.advancePlayerOneTick();
    this.gateField?.syncFromRuntimeState();
  }

  private advancePlayerOneTick(): void {
    if (this.playerMovement === undefined || this.playerInput === undefined) {
      return;
    }

    const stepResult = this.playerMovement.step(this.playerInput.readPressedDirection());
    this.player?.applyMovementStep(stepResult);
  }

  private startPlayerEntryAnimation(): void {
    this.player?.hide();

    const start = getPlayerStartCenter();
    const animationStarted = this.hud?.startLifeEntryAnimation(
      new Phaser.Math.Vector2(start.x, start.y),
      () => this.player?.showAtStart(),
    );

    if (!animationStarted) {
      this.player?.showAtStart();
    }
  }
}
