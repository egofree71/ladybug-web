/**
 * Central sound facade for non-positional gameplay effects. Scene code calls
 * semantic methods here instead of reaching directly for raw Phaser sound keys.
 */
import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import { COLLECTIBLE_KIND, type CollectibleKind } from '../gameplay/collectibles/collectibleTypes';

const NORMAL_EFFECT_VOLUME = 0.8;
const JINGLE_VOLUME = 0.85;
const DEATH_VOLUME = 0.85;
const ENEMY_DEATH_VOLUME = 0.85;
const ENEMY_EXIT_WARNING_VOLUME = 0.85;
const TIMER_STEP_VOLUME = 0.8;
const VEGETABLE_PICKUP_VOLUME = 0.85;
const END_LEVEL_VOLUME = 0.85;

/**
 * Centralized non-positional sound facade for the current arcade board.
 *
 * The Godot remake uses one runtime helper with dedicated players for every
 * gameplay effect. Phaser can play short effects directly from the scene sound
 * manager, but this class keeps the same semantic split: callers say what
 * gameplay event happened, not which file should be triggered.
 */
export class GameplaySoundPlayer {
  private readonly scene: Phaser.Scene;
  private timerAudioCountdown = 0;

  public constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Returns true while the browser still requires a user gesture before audio can start. */
  public isAudioLocked(): boolean {
    return this.scene.sound.locked;
  }

  /** Runs the callback once the browser audio context is available. */
  public onceUnlocked(callback: () => void): void {
    if (!this.scene.sound.locked) {
      callback();
      return;
    }

    this.scene.sound.once(Phaser.Sound.Events.UNLOCKED, callback);
  }

  /** Plays the pickup effect associated with the consumed collectible kind. */
  public playForCollectible(kind: CollectibleKind): void {
    if (kind === COLLECTIBLE_KIND.flower) {
      this.playFlowerPickup();
      return;
    }

    if (kind === COLLECTIBLE_KIND.heart || kind === COLLECTIBLE_KIND.letter) {
      this.playCollectiblePickup();
    }
  }

  /** Short effect used when a base flower is consumed. */
  public playFlowerPickup(): void {
    this.playStackable(ASSET_KEYS.flowerPickupSound, NORMAL_EFFECT_VOLUME);
  }

  /** Short effect used when a heart or letter is consumed. */
  public playCollectiblePickup(): void {
    this.playStackable(ASSET_KEYS.collectiblePickupSound, NORMAL_EFFECT_VOLUME);
  }

  /** Short effect used when a rotating gate accepts a push. */
  public playGateRotated(): void {
    this.playStackable(ASSET_KEYS.gateRotatedSound, NORMAL_EFFECT_VOLUME);
  }

  /** Restarted jingle used when one HUD life travels into the maze. */
  public playEnterMaze(): void {
    this.restart(ASSET_KEYS.enterMazeSound, JINGLE_VOLUME);
  }

  /** Restarted effect used when the player death sequence starts. */
  public playDeathSequenceStart(): void {
    this.restart(ASSET_KEYS.deathSequenceSound, DEATH_VOLUME);
  }

  /** Short effect used when an enemy is killed by a skull. */
  public playEnemyDeathFromSkull(): void {
    this.playStackable(ASSET_KEYS.enemyDeathSound, ENEMY_DEATH_VOLUME);
  }

  /** Warning effect used shortly before a waiting enemy exits the lair. */
  public playEnemyExitWarning(): void {
    this.restart(ASSET_KEYS.enemyExitWarningSound, ENEMY_EXIT_WARNING_VOLUME);
  }

  /** Resets the audible border-timer cadence, usually when a level or attempt starts. */
  public resetTimerStepCadence(levelNumber: number): void {
    this.timerAudioCountdown = getTimerAudioPeriod(levelNumber);
  }

  /**
   * Advances the independent audible border-timer cadence by one simulation tick.
   *
   * The visual timer still owns the real enemy-release cadence. For level 1 the
   * audible cadence matches the visual one: one timer.wav restart every 9 fixed
   * simulation ticks. Later levels can speed this up without changing callers.
   */
  public advanceTimerSoundOneTick(levelNumber: number): void {
    const period = getTimerAudioPeriod(levelNumber);

    if (this.timerAudioCountdown <= 0) {
      this.timerAudioCountdown = period;
    }

    this.timerAudioCountdown -= 1;

    if (this.timerAudioCountdown !== 0) {
      return;
    }

    this.restart(ASSET_KEYS.timerStepSound, TIMER_STEP_VOLUME);
    this.timerAudioCountdown = period;
  }

  /** Short effect used when the central vegetable bonus is consumed. */
  public playVegetablePickup(): void {
    this.playStackable(ASSET_KEYS.vegetablePickupSound, VEGETABLE_PICKUP_VOLUME);
  }

  /** Restarted jingle used when a cleared board enters the between-level flow. */
  public playEndLevel(): void {
    this.restart(ASSET_KEYS.endLevelSound, END_LEVEL_VOLUME);
  }

  private playStackable(key: string, volume: number): void {
    if (!this.scene.cache.audio.exists(key) || this.scene.sound.locked) {
      return;
    }

    this.scene.sound.play(key, { volume });
  }

  private restart(key: string, volume: number): void {
    if (!this.scene.cache.audio.exists(key)) {
      return;
    }

    if (this.scene.sound.locked) {
      return;
    }

    this.scene.sound.stopByKey(key);
    this.scene.sound.play(key, { volume });
  }
}

/** Returns the audible timer period in fixed simulation ticks. */
function getTimerAudioPeriod(levelNumber: number): number {
  // Visual / logical border cadence from the arcade:
  // level 1:      visible step every 9 simulation ticks
  // levels 2-4:   visible step every 6 simulation ticks
  // level 5+:     visible step every 3 simulation ticks
  //
  // Audible policy copied from the Godot remake:
  // level 1:      match the visual cadence: 9 ticks
  // levels 2-4:   match the visual cadence: 6 ticks
  // level 5+:     use a regular 4-tick sound cadence.
  if (levelNumber <= 1) {
    return 9;
  }

  if (levelNumber < 5) {
    return 6;
  }

  return 4;
}
