import Phaser from 'phaser';
import { ASSET_KEYS, assetUrl } from '../assets';
import { GameplaySoundPlayer } from '../audio/gameplaySoundPlayer';
import { MAZE } from '../layout/screenLayout';
import { CollectibleColorCycle } from '../gameplay/collectibles/collectibleColorCycle';
import { COLLECTIBLE_COLOR, COLLECTIBLE_KIND, type CollectibleCell, type CollectiblePickupResult, type CollectibleSpawnPlan } from '../gameplay/collectibles/collectibleTypes';
import { CollectiblePickupPopupState } from '../gameplay/collectibles/collectiblePickupPopupState';
import { generateSpecialCollectibleSpawnPlan } from '../gameplay/collectibles/collectibleSpawnPlanner';
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
import { createMazeBorderTimer, type MazeBorderTimerView } from '../render/mazeBorderTimerView';
import { createLevelCollectibles, type CollectibleFieldView } from '../render/collectibleView';
import { createRotatingGates, type GateFieldView } from '../render/gateView';
import { getPlayerStartCenter } from '../layout/playerLayout';
import { PlayerView } from '../render/playerView';
import { createEnemies, type EnemyFieldView } from '../render/enemyView';
import { createVegetableBonus, type VegetableBonusFieldView } from '../render/vegetableBonusView';
import { createLevelTransitionView, type LevelTransitionView } from '../render/levelTransitionView';
import { enemyPlayerCollisionActive } from '../gameplay/enemies/enemyMovementAi';
import { MONSTER_DIR, type MonsterDir } from '../gameplay/enemies/monsterDirection';
import {
  installLadyBugDebugConsole,
  type LadyBugDebugCommandResult,
  type LadyBugDebugEnemyStatus,
  type LadyBugDebugLevelCommandResult,
  type LadyBugDebugStatus,
} from '../debug/ladyBugDebugConsole';

interface LevelSetupOptions {
  readonly useHudEntryAnimation: boolean;
  readonly spawnPlan?: CollectibleSpawnPlan;
}

const END_LEVEL_FREEZE_DURATION_TICKS = 120;
const LEVEL_TRANSITION_SCREEN_DURATION_TICKS = 120;

/**
 * First gameplay scene for the Phaser remake.
 *
 * Player movement, collectible colors, pickups, and gate timers are advanced
 * from the fixed-step clock. Phaser's display update cadence only decides when
 * the most recent simulation state is rendered; it does not directly set
 * gameplay speed.
 */
export class GameScene extends Phaser.Scene {
  private currentLevelNumber = 1;
  private readonly arcadeClock = new FixedArcadeClock();
  private readonly collectibleColorCycle = new CollectibleColorCycle();
  private readonly scoreState = new ScoreState();
  private readonly heartMultiplierState = new HeartMultiplierState();
  private readonly wordProgressState = new WordProgressState();
  private readonly pickupPopupState = new CollectiblePickupPopupState();
  private collectibleField?: CollectibleFieldView;
  private gateField?: GateFieldView;
  private borderTimer?: MazeBorderTimerView;
  private enemies?: EnemyFieldView;
  private vegetableBonus?: VegetableBonusFieldView;
  private hud?: HudView;
  private pickupPopupView?: CollectiblePickupPopupView;
  private levelTransitionView?: LevelTransitionView;
  private player?: PlayerView;
  private mazeGrid?: MazeGrid;
  private playerInput?: PlayerInputState;
  private playerMovement?: PlayerMovementMotor;
  private soundPlayer?: GameplaySoundPlayer;
  private isWaitingForAudioUnlockBeforeEntry = false;
  private livesRemaining = 3;
  private isPlayerDeathSequenceActive = false;
  private isLevelAdvancePending = false;
  private isEndLevelFreezeActive = false;
  private endLevelFreezeTicksRemaining = 0;
  private isLevelTransitionScreenActive = false;
  private levelTransitionTicksRemaining = 0;
  private queuedNextLevelNumber = 0;
  private queuedNextLevelSpawnPlan?: CollectibleSpawnPlan;
  private uninstallDebugConsole?: () => void;

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

    this.load.spritesheet(ASSET_KEYS.vegetables, assetUrl('assets/sprites/props/vegetables.png'), {
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

    this.load.spritesheet(ASSET_KEYS.enemyLevel1, assetUrl('assets/sprites/enemies/enemy_level1.png'), {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.spritesheet(ASSET_KEYS.enemyLevel2, assetUrl('assets/sprites/enemies/enemy_level2.png'), {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.spritesheet(ASSET_KEYS.enemyLevel3, assetUrl('assets/sprites/enemies/enemy_level3.png'), {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.spritesheet(ASSET_KEYS.enemyLevel4, assetUrl('assets/sprites/enemies/enemy_level4.png'), {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.spritesheet(ASSET_KEYS.enemyLevel5, assetUrl('assets/sprites/enemies/enemy_level5.png'), {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.spritesheet(ASSET_KEYS.enemyLevel6, assetUrl('assets/sprites/enemies/enemy_level6.png'), {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.spritesheet(ASSET_KEYS.enemyLevel7, assetUrl('assets/sprites/enemies/enemy_level7.png'), {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.spritesheet(ASSET_KEYS.enemyLevel8, assetUrl('assets/sprites/enemies/enemy_level8.png'), {
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

    this.load.audio(ASSET_KEYS.enterMazeSound, assetUrl('assets/audio/enter_maze.wav'));
    this.load.audio(ASSET_KEYS.flowerPickupSound, assetUrl('assets/audio/flower_pickup.wav'));
    this.load.audio(ASSET_KEYS.collectiblePickupSound, assetUrl('assets/audio/collectible_pickup.wav'));
    this.load.audio(ASSET_KEYS.gateRotatedSound, assetUrl('assets/audio/gate_rotated.wav'));
    this.load.audio(ASSET_KEYS.deathSequenceSound, assetUrl('assets/audio/death_sequence.wav'));
    this.load.audio(ASSET_KEYS.enemyDeathSound, assetUrl('assets/audio/death_enemy.wav'));
    this.load.audio(ASSET_KEYS.enemyExitWarningSound, assetUrl('assets/audio/enemy_exit.wav'));
    this.load.audio(ASSET_KEYS.timerStepSound, assetUrl('assets/audio/timer.wav'));
    this.load.audio(ASSET_KEYS.vegetablePickupSound, assetUrl('assets/audio/vegetable_pickup.wav'));
    this.load.audio(ASSET_KEYS.endLevelSound, assetUrl('assets/audio/end_level.wav'));
  }

  public create(): void {
    this.cameras.main.setRoundPixels(true);
    this.arcadeClock.reset();
    this.currentLevelNumber = 1;
    this.collectibleColorCycle.resetToBlue();
    this.scoreState.reset();
    this.heartMultiplierState.reset();
    this.wordProgressState.reset();
    this.pickupPopupState.clear();
    this.livesRemaining = 3;
    this.isPlayerDeathSequenceActive = false;
    this.isLevelAdvancePending = false;
    this.isEndLevelFreezeActive = false;
    this.endLevelFreezeTicksRemaining = 0;
    this.isLevelTransitionScreenActive = false;
    this.levelTransitionTicksRemaining = 0;
    this.queuedNextLevelNumber = 0;
    this.queuedNextLevelSpawnPlan = undefined;
    this.isWaitingForAudioUnlockBeforeEntry = false;
    this.soundPlayer = new GameplaySoundPlayer(this);
    this.mazeGrid = MazeGrid.fromDataFile(this.cache.json.get(ASSET_KEYS.mazeLayout));

    this.add
      .image(MAZE.imageX, MAZE.imageY, ASSET_KEYS.mazeBackground)
      .setOrigin(0, 0)
      .setDepth(0);

    this.borderTimer = createMazeBorderTimer(this, this.currentLevelNumber);
    this.pickupPopupView = new CollectiblePickupPopupView(this);
    this.levelTransitionView = createLevelTransitionView(this);
    this.player = new PlayerView(this);
    this.playerInput = new PlayerInputState(this);
    this.hud = createHud(this);
    this.hud.setLives(this.livesRemaining);
    this.syncHudFromGameState();
    this.setupCurrentLevel({ useHudEntryAnimation: true });
    this.installDebugConsole();
  }

  private setupCurrentLevel(options: LevelSetupOptions): void {
    if (!this.mazeGrid) {
      return;
    }

    this.destroyLevelRuntimeViews();
    this.arcadeClock.reset();
    this.collectibleColorCycle.resetToBlue();
    this.heartMultiplierState.reset();
    this.pickupPopupState.clear();
    this.pickupPopupView?.clear();
    this.isPlayerDeathSequenceActive = false;
    this.isLevelAdvancePending = false;
    this.isEndLevelFreezeActive = false;
    this.endLevelFreezeTicksRemaining = 0;
    this.isLevelTransitionScreenActive = false;
    this.levelTransitionTicksRemaining = 0;
    this.levelTransitionView?.hide();

    this.borderTimer?.configureForLevel(this.currentLevelNumber);
    this.soundPlayer?.resetTimerStepCadence(this.currentLevelNumber);

    this.collectibleField = createLevelCollectibles(
      this,
      this.currentLevelNumber,
      this.collectibleColorCycle.currentColor,
      options.spawnPlan,
    );
    this.gateField = createRotatingGates(this);
    this.enemies = createEnemies(this, this.mazeGrid, this.gateField.gateSystem, this.currentLevelNumber);
    this.vegetableBonus = createVegetableBonus(this, this.currentLevelNumber);
    this.playerMovement = new PlayerMovementMotor(
      this.mazeGrid,
      this.gateField.gateSystem,
      PLAYER_LAYOUT.startCell,
    );

    this.syncHudFromGameState();

    if (options.useHudEntryAnimation) {
      this.startPlayerEntryAnimation();
      return;
    }

    this.placePlayerDirectlyAtLevelStart();
  }

  private destroyLevelRuntimeViews(): void {
    this.collectibleField?.destroy();
    this.collectibleField = undefined;
    this.gateField?.destroy();
    this.gateField = undefined;
    this.enemies?.destroy();
    this.enemies = undefined;
    this.vegetableBonus?.destroy();
    this.vegetableBonus = undefined;
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

    if (this.isEndLevelFreezeActive) {
      this.advanceEndLevelFreezeOneTick();
      return;
    }

    if (this.isLevelTransitionScreenActive) {
      this.advanceLevelTransitionScreenOneTick();
      return;
    }

    this.gateField?.gateSystem.advanceOneTick();
    this.advanceBorderTimerOneTick();
    this.soundPlayer?.advanceTimerSoundOneTick(this.currentLevelNumber);
    this.advanceVegetableBonusOneTick();
    this.advanceEnemiesOneTick();
    this.advancePlayerOneTick();

    if (this.isEndLevelFreezeActive || this.isLevelTransitionScreenActive) {
      return;
    }

    this.tryConsumeVegetableBonus();
    this.checkPlayerEnemyCollisions();

    if (this.collectibleColorCycle.advanceOneTick()) {
      this.collectibleField?.applyColorCycle(this.collectibleColorCycle.currentColor);
    }

    this.gateField?.syncFromRuntimeState();
  }

  private advanceBorderTimerOneTick(): void {
    const stepResult = this.borderTimer?.advanceOneSimulationTick();

    if (!stepResult) {
      return;
    }

    if (stepResult.shouldPlayEnemyExitWarning && this.enemies?.hasReleaseCandidate) {
      this.soundPlayer?.playEnemyExitWarning();
    }

    if (stepResult.shouldReleaseEnemy) {
      this.handleBorderTimerReleaseOpportunity();
    }
  }

  private handleBorderTimerReleaseOpportunity(): boolean {
    return this.enemies?.tryReleaseNextEnemy() ?? false;
  }

  private advanceVegetableBonusOneTick(): void {
    if (!this.enemies) {
      return;
    }

    this.vegetableBonus?.advanceOneSimulationTick(this.enemies.enemySystem);
    this.enemies.syncFromRuntimeState();
  }

  private advanceEnemiesOneTick(): void {
    if (!this.playerMovement || !this.collectibleField) {
      return;
    }

    this.enemies?.advanceOneSimulationTick({
      playerArcadePixelPos: this.playerMovement.arcadePosition,
      playerCurrentDirection: this.playerMovement.currentDirection,
      tryConsumeSkullAt: (cell) => this.collectibleField?.tryConsumeSkullAt(cell) ?? false,
      onEnemyKilledBySkull: () => this.soundPlayer?.playEnemyDeathFromSkull(),
    });
  }

  private advancePlayerOneTick(): void {
    if (this.playerMovement === undefined || this.playerInput === undefined) {
      return;
    }

    const stepResult = this.playerMovement.step(this.playerInput.readPressedDirection());
    this.player?.applyMovementStep(stepResult);

    this.playGateSoundsForAcceptedPushes();

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

    this.tryAdvanceToNextLevelIfBoardCleared();
  }

  private tryConsumeVegetableBonus(): void {
    if (!this.playerMovement || !this.enemies || !this.vegetableBonus || this.isPlayerDeathSequenceActive) {
      return;
    }

    const result = this.vegetableBonus.tryConsumeAtPlayerArcadePosition(
      this.playerMovement.arcadePosition,
      this.enemies.enemySystem,
    );

    if (!result.consumed) {
      return;
    }

    this.soundPlayer?.playVegetablePickup();
    this.scoreState.addPoints(result.scoreDelta);
    this.hud?.setScore(this.scoreState.score);
    this.enemies.syncFromRuntimeState();
  }

  private playGateSoundsForAcceptedPushes(): void {
    const pushedGateCount = this.gateField?.gateSystem.consumePushedGateCount() ?? 0;

    for (let i = 0; i < pushedGateCount; i++) {
      this.soundPlayer?.playGateRotated();
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

    this.soundPlayer?.playForCollectible(pickup.kind);

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


  private tryAdvanceToNextLevelIfBoardCleared(): void {
    if (this.isPlayerDeathSequenceActive || !this.collectibleField?.isLevelCleared) {
      return;
    }

    this.isLevelAdvancePending = true;

    if (!this.pickupPopupState.isActive) {
      this.advanceToNextLevel();
    }
  }

  private advanceToNextLevel(): void {
    this.startLevelTransitionScreen(this.currentLevelNumber + 1);
  }

  private startLevelTransitionScreen(nextLevelNumber: number): void {
    if (this.isEndLevelFreezeActive || this.isLevelTransitionScreenActive) {
      return;
    }

    this.isLevelAdvancePending = false;
    this.queuedNextLevelNumber = Math.max(1, Math.floor(nextLevelNumber));
    this.queuedNextLevelSpawnPlan = generateSpecialCollectibleSpawnPlan(this.queuedNextLevelNumber);
    this.endLevelFreezeTicksRemaining = END_LEVEL_FREEZE_DURATION_TICKS;
    this.isEndLevelFreezeActive = true;
    this.arcadeClock.reset();
    this.pickupPopupState.clear();
    this.pickupPopupView?.clear();
    this.player?.show();
    this.soundPlayer?.playEndLevel();
  }

  private advanceEndLevelFreezeOneTick(): void {
    this.endLevelFreezeTicksRemaining -= 1;

    if (this.endLevelFreezeTicksRemaining > 0) {
      return;
    }

    this.isEndLevelFreezeActive = false;
    this.endLevelFreezeTicksRemaining = 0;
    this.showLevelTransitionScreen();
  }

  private showLevelTransitionScreen(): void {
    if (this.isLevelTransitionScreenActive) {
      return;
    }

    if (this.queuedNextLevelNumber <= 0) {
      this.queuedNextLevelNumber = this.currentLevelNumber + 1;
    }

    if (!this.queuedNextLevelSpawnPlan) {
      this.queuedNextLevelSpawnPlan = generateSpecialCollectibleSpawnPlan(this.queuedNextLevelNumber);
    }

    this.isLevelTransitionScreenActive = true;
    this.levelTransitionTicksRemaining = LEVEL_TRANSITION_SCREEN_DURATION_TICKS;
    this.heartMultiplierState.reset();
    this.hud?.setMultiplierStep(this.heartMultiplierState.step);
    this.player?.hide();
    this.levelTransitionView?.showForUpcomingLevel(this.queuedNextLevelNumber, this.queuedNextLevelSpawnPlan);
  }

  private advanceLevelTransitionScreenOneTick(): void {
    this.levelTransitionTicksRemaining -= 1;

    if (this.levelTransitionTicksRemaining > 0) {
      return;
    }

    this.completeLevelTransition();
  }

  private completeLevelTransition(): void {
    const nextLevelNumber = this.queuedNextLevelNumber > 0
      ? this.queuedNextLevelNumber
      : this.currentLevelNumber + 1;
    const spawnPlan = this.queuedNextLevelSpawnPlan ?? generateSpecialCollectibleSpawnPlan(nextLevelNumber);

    this.levelTransitionView?.hide();
    this.isLevelTransitionScreenActive = false;
    this.levelTransitionTicksRemaining = 0;
    this.currentLevelNumber = nextLevelNumber;
    this.queuedNextLevelNumber = 0;
    this.queuedNextLevelSpawnPlan = undefined;
    this.setupCurrentLevel({ useHudEntryAnimation: false, spawnPlan });
  }


  private checkPlayerEnemyCollisions(): void {
    if (!this.playerMovement || !this.enemies || this.isPlayerDeathSequenceActive || this.pickupPopupState.isActive) {
      return;
    }

    const playerArcadePixelPos = this.playerMovement.arcadePosition;

    for (const monster of this.enemies.enemySystem.collisionActiveMonsters) {
      if (enemyPlayerCollisionActive(playerArcadePixelPos, monster)) {
        this.startPlayerDeathFromEnemy();
        return;
      }
    }
  }



  private startPlayerDeathFromEnemy(): void {
    if (this.isPlayerDeathSequenceActive) {
      return;
    }

    this.pickupPopupState.clear();
    this.pickupPopupView?.clear();
    this.enemies?.hideAllViewsForPlayerDeathSequence();
    this.vegetableBonus?.resetRuntimeState(this.enemies?.enemySystem);

    this.livesRemaining = Math.max(0, this.livesRemaining - 1);
    this.hud?.setCurrentLifeInMaze(false);
    this.hud?.setLives(this.livesRemaining);

    this.soundPlayer?.playDeathSequenceStart();

    this.isPlayerDeathSequenceActive = true;
    this.player?.startDeathSequence();
  }

  private startPlayerDeathFromSkull(): void {
    if (this.isPlayerDeathSequenceActive) {
      return;
    }

    this.pickupPopupState.clear();
    this.pickupPopupView?.clear();
    this.collectibleField?.clearSkulls();
    this.vegetableBonus?.resetRuntimeState(this.enemies?.enemySystem);

    this.livesRemaining = Math.max(0, this.livesRemaining - 1);
    this.hud?.setCurrentLifeInMaze(false);
    this.hud?.setLives(this.livesRemaining);

    this.soundPlayer?.playDeathSequenceStart();

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
      this.enemies?.hideAllViewsForPlayerDeathSequence();
      this.player?.hideAfterDeathSequence();
      return;
    }

    this.enemies?.resetAfterPlayerDeath();
    this.vegetableBonus?.resetRuntimeState(this.enemies?.enemySystem);
    this.playerMovement?.resetToStartCell();
    this.borderTimer?.resetTimer();
    this.soundPlayer?.resetTimerStepCadence(this.currentLevelNumber);
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

    if (this.isLevelAdvancePending) {
      this.advanceToNextLevel();
      return;
    }

    this.player?.show();
  }


  private installDebugConsole(): void {
    this.uninstallDebugConsole?.();

    this.uninstallDebugConsole = installLadyBugDebugConsole({
      status: () => this.createDebugStatus(),
      releaseNextEnemy: () => this.debugReleaseNextEnemy(),
      releaseAllEnemies: () => this.debugReleaseAllEnemies(),
      nextLevel: () => this.debugAdvanceToNextLevel(),
      runtime: () => ({
        scene: this,
        currentLevelNumber: this.currentLevelNumber,
        borderTimer: this.borderTimer?.timer,
        enemies: this.enemies?.enemySystem,
        vegetableBonus: this.vegetableBonus,
        playerMovement: this.playerMovement,
        collectibleField: this.collectibleField,
        gateSystem: this.gateField?.gateSystem,
      }),
    });

    this.events.once('shutdown', () => {
      this.uninstallDebugConsole?.();
      this.uninstallDebugConsole = undefined;
    });
  }

  private debugReleaseNextEnemy(): LadyBugDebugCommandResult {
    const statusBeforeRelease = this.createDebugStatus();

    if (this.isEndLevelFreezeActive || this.isLevelTransitionScreenActive) {
      return this.createDebugCommandResult(false, 'Cannot release enemies during the level transition flow.', false, statusBeforeRelease);
    }

    if (!this.borderTimer || !this.enemies) {
      return this.createDebugCommandResult(false, 'The game scene is not ready yet.', false);
    }

    if (!this.enemies.hasReleaseCandidate) {
      return this.createDebugCommandResult(false, 'No enemy is waiting for release.', false, statusBeforeRelease);
    }

    if (!this.advanceBorderTimerUntilReleaseOpportunityForDebug()) {
      return this.createDebugCommandResult(false, 'Could not force the border timer to the next release opportunity.', false);
    }

    const released = this.handleBorderTimerReleaseOpportunity();
    this.enemies.syncFromRuntimeState();
    this.vegetableBonus?.advanceOneSimulationTick(this.enemies.enemySystem);
    this.vegetableBonus?.syncFromRuntimeState();
    this.enemies.syncFromRuntimeState();

    return this.createDebugCommandResult(
      released,
      released ? 'Released the next waiting enemy.' : 'The border timer completed, but no enemy was released.',
      released,
    );
  }

  private debugReleaseAllEnemies(): LadyBugDebugCommandResult {
    if (!this.enemies) {
      return this.createDebugCommandResult(false, 'The enemy system is not ready yet.', false);
    }

    let releasedEnemyCount = 0;

    for (let safety = 0; safety < 4 && this.enemies.hasReleaseCandidate; safety++) {
      const result = this.debugReleaseNextEnemy();

      if (!result.ok || !result.releasedEnemy) {
        break;
      }

      releasedEnemyCount += 1;
    }

    return this.createDebugCommandResult(
      releasedEnemyCount > 0,
      releasedEnemyCount > 0
        ? `Released ${releasedEnemyCount} ${releasedEnemyCount > 1 ? 'enemies' : 'enemy'}.`
        : 'No enemy was released.',
      releasedEnemyCount > 0,
      undefined,
      releasedEnemyCount,
    );
  }

  private debugAdvanceToNextLevel(): LadyBugDebugLevelCommandResult {
    const previousLevelNumber = this.currentLevelNumber;

    if (this.isPlayerDeathSequenceActive) {
      return this.createDebugLevelCommandResult(
        false,
        'Cannot skip level while the player death sequence is active.',
        previousLevelNumber,
      );
    }

    if (this.hud?.isLifeEntryAnimationActive) {
      return this.createDebugLevelCommandResult(
        false,
        'Cannot skip level while the HUD entry animation is active.',
        previousLevelNumber,
      );
    }

    if (this.isEndLevelFreezeActive || this.isLevelTransitionScreenActive) {
      return this.createDebugLevelCommandResult(
        false,
        'A level transition is already active.',
        previousLevelNumber,
      );
    }

    this.pickupPopupState.clear();
    this.pickupPopupView?.clear();
    this.startLevelTransitionScreen(this.currentLevelNumber + 1);

    return this.createDebugLevelCommandResult(
      true,
      `Started transition from level ${previousLevelNumber} to level ${this.currentLevelNumber + 1}.`,
      previousLevelNumber,
    );
  }

  private advanceBorderTimerUntilReleaseOpportunityForDebug(): boolean {
    if (!this.borderTimer) {
      return false;
    }

    const timer = this.borderTimer.timer;
    const maxTicksToNextRelease = Math.max(1, timer.tileCount * timer.ticksPerTile * 2 + timer.ticksPerTile + 1);

    for (let tick = 0; tick < maxTicksToNextRelease; tick++) {
      const stepResult = this.borderTimer.advanceOneSimulationTick();

      if (stepResult.shouldReleaseEnemy) {
        return true;
      }
    }

    return false;
  }

  private createDebugCommandResult(
    ok: boolean,
    message: string,
    releasedEnemy: boolean,
    status = this.createDebugStatus(),
    releasedEnemyCount?: number,
  ): LadyBugDebugCommandResult {
    return {
      ok,
      message,
      releasedEnemy,
      releasedEnemyCount,
      status,
    };
  }

  private createDebugLevelCommandResult(
    ok: boolean,
    message: string,
    previousLevelNumber: number,
  ): LadyBugDebugLevelCommandResult {
    return {
      ok,
      message,
      previousLevelNumber,
      levelNumber: this.currentLevelNumber,
      status: this.createDebugStatus(),
    };
  }

  private createDebugStatus(): LadyBugDebugStatus {
    const enemySystem = this.enemies?.enemySystem;

    return {
      levelNumber: this.currentLevelNumber,
      livesRemaining: this.livesRemaining,
      score: this.scoreState.score,
      waitingForAudioUnlock: this.isWaitingForAudioUnlockBeforeEntry,
      playerEntryActive: this.hud?.isLifeEntryAnimationActive ?? false,
      playerDeathActive: this.isPlayerDeathSequenceActive,
      pickupPopupActive: this.pickupPopupState.isActive,
      endLevelFreezeActive: this.isEndLevelFreezeActive,
      levelTransitionActive: this.isLevelTransitionScreenActive,
      queuedLevelNumber: this.queuedNextLevelNumber > 0 ? this.queuedNextLevelNumber : undefined,
      hasEnemyReleaseCandidate: this.enemies?.hasReleaseCandidate ?? false,
      allEnemiesInMaze: enemySystem?.areAllEnemiesInMaze ?? false,
      enemies: enemySystem?.monsters.map((monster): LadyBugDebugEnemyStatus => ({
        id: monster.id,
        runtimeState: monster.runtimeState,
        direction: monsterDirectionName(monster.direction),
        movementActive: monster.movementActive,
        collisionActive: monster.collisionActive,
        visibleInLair: monster.visibleInLair,
        arcadePixelPos: { ...monster.arcadePixelPos },
      })) ?? [],
    };
  }

  private syncHudFromGameState(): void {
    this.hud?.setScore(this.scoreState.score);
    this.hud?.setMultiplierStep(this.heartMultiplierState.step);
    this.hud?.setWordProgress(this.wordProgressState);
  }

  private placePlayerDirectlyAtLevelStart(): void {
    this.isWaitingForAudioUnlockBeforeEntry = false;
    this.hud?.setCurrentLifeInMaze(true);
    this.playerMovement?.resetToStartCell();
    this.player?.showAtStart();
  }

  private startPlayerEntryAnimation(): void {
    this.player?.hide();

    // The entry sequence must never wait on browser audio unlock. Some browsers
    // keep the sound manager locked until a later user gesture, which used to
    // freeze the whole board before the HUD life started travelling. If audio is
    // still locked, GameplaySoundPlayer simply skips the jingle instead of
    // letting it play late and out of sync.
    this.isWaitingForAudioUnlockBeforeEntry = false;

    const start = getPlayerStartCenter();
    const animationStarted = this.hud?.startLifeEntryAnimation(
      new Phaser.Math.Vector2(start.x, start.y),
      () => this.player?.showAtStart(),
    );

    if (animationStarted) {
      this.soundPlayer?.playEnterMaze();
    }

    if (!animationStarted) {
      this.player?.showAtStart();
    }
  }
}


function monsterDirectionName(direction: MonsterDir): string {
  switch (direction) {
    case MONSTER_DIR.left:
      return 'left';
    case MONSTER_DIR.up:
      return 'up';
    case MONSTER_DIR.right:
      return 'right';
    case MONSTER_DIR.down:
      return 'down';
    default:
      return 'none';
  }
}
