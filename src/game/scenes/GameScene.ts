import Phaser from 'phaser';
import { ASSET_KEYS, assetUrl } from '../assets';
import { MAZE } from '../layout/screenLayout';
import { CollectibleColorCycle } from '../gameplay/collectibles/collectibleColorCycle';
import { COLLECTIBLE_COLOR, COLLECTIBLE_KIND, type CollectibleCell, type CollectiblePickupResult } from '../gameplay/collectibles/collectibleTypes';
import { CollectiblePickupPopupState } from '../gameplay/collectibles/collectiblePickupPopupState';
import { consumeCollectiblesAlongPlayerStep } from '../gameplay/collectibles/playerCollectiblePickupSystem';
import { calculateCollectibleScore } from '../gameplay/scoring/collectibleScoreService';
import { HeartMultiplierState } from '../gameplay/scoring/heartMultiplierState';
import { ScoreState } from '../gameplay/scoring/scoreState';
import { FixedArcadeClock } from '../gameplay/timing/fixedArcadeClock';
import { WordProgressState } from '../gameplay/words/wordProgressState';
import { MazeGrid } from '../gameplay/maze/mazeGrid';
import { PlayerInputState } from '../gameplay/player/playerInputState';
import { PlayerMovementMotor } from '../gameplay/player/playerMovementMotor';
import { PLAYER_LAYOUT } from '../layout/playerLayout';
import { createHud, type HudView } from '../render/hudView';
import { CollectiblePickupPopupView } from '../render/collectiblePickupPopupView';
import { createMazeBorderTimer } from '../render/mazeBorderTimerView';
import { createLevelOneCollectibles, type CollectibleFieldView } from '../render/collectibleView';
import { createRotatingGates, type GateFieldView } from '../render/gateView';
import { getPlayerStartCenter } from '../layout/playerLayout';
import { PlayerView } from '../render/playerView';

/**
 * First gameplay scene for the Phaser remake.
 *
 * Player movement, collectible colors, pickups, and gate timers are advanced
 * from the fixed-step clock. Phaser's display update cadence only decides when
 * the most recent simulation state is rendered; it does not directly set
 * gameplay speed.
 */
export class GameScene extends Phaser.Scene {
  private readonly arcadeClock = new FixedArcadeClock();
  private readonly collectibleColorCycle = new CollectibleColorCycle();
  private readonly scoreState = new ScoreState();
  private readonly heartMultiplierState = new HeartMultiplierState();
  private readonly wordProgressState = new WordProgressState();
  private readonly pickupPopupState = new CollectiblePickupPopupState();
  private collectibleField?: CollectibleFieldView;
  private gateField?: GateFieldView;
  private hud?: HudView;
  private pickupPopupView?: CollectiblePickupPopupView;
  private player?: PlayerView;
  private playerInput?: PlayerInputState;
  private playerMovement?: PlayerMovementMotor;
  private livesRemaining = 3;
  private isPlayerDeathSequenceActive = false;

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

    this.load.spritesheet(ASSET_KEYS.playerDeathRed, assetUrl('assets/sprites/player/player_dead_red.png'), {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.spritesheet(ASSET_KEYS.playerDeathGhost, assetUrl('assets/sprites/player/player_dead_ghost.png'), {
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

    this.load.spritesheet(ASSET_KEYS.hudArcadeFont16, assetUrl('assets/fonts/hud_arcade_font_16.png'), {
      frameWidth: 16,
      frameHeight: 20,
    });
  }

  public create(): void {
    this.cameras.main.setRoundPixels(true);
    this.arcadeClock.reset();
    this.collectibleColorCycle.resetToBlue();
    this.scoreState.reset();
    this.heartMultiplierState.reset();
    this.wordProgressState.reset();
    this.pickupPopupState.clear();
    this.livesRemaining = 3;
    this.isPlayerDeathSequenceActive = false;

    const mazeGrid = MazeGrid.fromDataFile(this.cache.json.get(ASSET_KEYS.mazeLayout));

    this.add
      .image(MAZE.imageX, MAZE.imageY, ASSET_KEYS.mazeBackground)
      .setOrigin(0, 0)
      .setDepth(0);

    createMazeBorderTimer(this);
    this.collectibleField = createLevelOneCollectibles(this, this.collectibleColorCycle.currentColor);
    this.gateField = createRotatingGates(this);

    this.pickupPopupView = new CollectiblePickupPopupView(this);
    this.player = new PlayerView(this);
    this.playerInput = new PlayerInputState(this);
    this.playerMovement = new PlayerMovementMotor(
      mazeGrid,
      this.gateField.gateSystem,
      PLAYER_LAYOUT.startCell,
    );
    this.hud = createHud(this);
    this.hud.setLives(this.livesRemaining);
    this.syncHudFromGameState();
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

    if (this.isPlayerDeathSequenceActive) {
      this.advancePlayerDeathOneTick();
      return;
    }

    if (this.pickupPopupState.isActive) {
      this.advancePickupPopupOneTick();
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

    if (!this.collectibleField) {
      return;
    }

    const pickups = consumeCollectiblesAlongPlayerStep(stepResult, this.collectibleField);
    for (const pickup of pickups) {
      this.applyCollectiblePickup(pickup);

      if (this.isPlayerDeathSequenceActive) {
        break;
      }
    }
  }

  private applyCollectiblePickup(pickup: CollectiblePickupResult): void {
    if (!pickup.consumed) {
      return;
    }

    if (pickup.kind === COLLECTIBLE_KIND.skull) {
      this.startPlayerDeathFromSkull();
      return;
    }

    const scoreCalculation = calculateCollectibleScore(
      pickup.kind,
      pickup.color,
      this.heartMultiplierState.currentMultiplier,
    );

    if (scoreCalculation.hasScore) {
      this.scoreState.addPoints(scoreCalculation.scoreDelta);
      this.hud?.setScore(this.scoreState.score);
    }

    if (pickup.kind === COLLECTIBLE_KIND.letter) {
      const wordResult = this.wordProgressState.tryApplyLetter(pickup.letter, pickup.color);

      if (wordResult.changed) {
        this.hud?.setWordProgress(this.wordProgressState);
      }
    }

    if (pickup.kind === COLLECTIBLE_KIND.heart && pickup.color === COLLECTIBLE_COLOR.blue) {
      if (this.heartMultiplierState.advanceOneStep()) {
        this.hud?.setMultiplierStep(this.heartMultiplierState.step);
      }
    }

    if (this.shouldShowPickupPopup(pickup) && scoreCalculation.hasScore) {
      this.startPickupPopup(pickup.cell, scoreCalculation);
    }
  }



  private startPlayerDeathFromSkull(): void {
    if (this.isPlayerDeathSequenceActive) {
      return;
    }

    this.pickupPopupState.clear();
    this.pickupPopupView?.clear();
    this.collectibleField?.clearSkulls();

    this.livesRemaining = Math.max(0, this.livesRemaining - 1);
    this.hud?.setCurrentLifeInMaze(false);
    this.hud?.setLives(this.livesRemaining);

    this.isPlayerDeathSequenceActive = true;
    this.player?.startDeathSequence();
  }

  private advancePlayerDeathOneTick(): void {
    const completed = this.player?.advanceDeathSequenceOneTick() ?? true;

    if (!completed) {
      return;
    }

    this.isPlayerDeathSequenceActive = false;
    this.arcadeClock.reset();

    if (this.livesRemaining <= 0) {
      this.player?.hideAfterDeathSequence();
      return;
    }

    this.playerMovement?.resetToStartCell();
    this.startPlayerEntryAnimation();
  }

  private shouldShowPickupPopup(pickup: CollectiblePickupResult): boolean {
    return pickup.kind === COLLECTIBLE_KIND.heart || pickup.kind === COLLECTIBLE_KIND.letter;
  }

  private startPickupPopup(
    cell: CollectibleCell,
    scoreCalculation: ReturnType<typeof calculateCollectibleScore>,
  ): void {
    this.pickupPopupView?.show(cell, scoreCalculation);
    this.pickupPopupState.start({
      cell,
      baseScore: scoreCalculation.baseScore,
      multiplier: scoreCalculation.multiplier,
      scoreDelta: scoreCalculation.scoreDelta,
    });
    this.player?.hide();
  }

  private advancePickupPopupOneTick(): void {
    if (!this.pickupPopupState.advanceOneTick()) {
      return;
    }

    this.pickupPopupView?.clear();
    this.player?.show();
  }

  private syncHudFromGameState(): void {
    this.hud?.setScore(this.scoreState.score);
    this.hud?.setMultiplierStep(this.heartMultiplierState.step);
    this.hud?.setWordProgress(this.wordProgressState);
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
