import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import { COLLECTIBLE_KIND, type CollectibleKind } from '../gameplay/collectibles/collectibleTypes';

const NORMAL_EFFECT_VOLUME = 0.8;
const JINGLE_VOLUME = 0.85;
const DEATH_VOLUME = 0.85;
const ENEMY_DEATH_VOLUME = 0.85;
const ENEMY_EXIT_WARNING_VOLUME = 0.85;
const VEGETABLE_PICKUP_VOLUME = 0.85;

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

  /** Short effect used when the central vegetable bonus is consumed. */
  public playVegetablePickup(): void {
    this.playStackable(ASSET_KEYS.vegetablePickupSound, VEGETABLE_PICKUP_VOLUME);
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
