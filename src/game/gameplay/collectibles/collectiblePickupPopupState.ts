import type { CollectibleCell } from './collectibleTypes';

export interface CollectiblePickupPopupStartOptions {
  readonly cell: CollectibleCell;
  readonly baseScore: number;
  readonly multiplier: number;
  readonly scoreDelta: number;
}

/**
 * Tracks the short score / multiplier popup shown after heart and letter pickups.
 *
 * While this state is active, the scene freezes normal board simulation and only
 * advances this countdown. The 30-tick duration mirrors the Godot remake and is
 * counted in fixed simulation ticks, not browser-rendered frames.
 */
export class CollectiblePickupPopupState {
  public static readonly durationTicks = 0x1e;

  public isActive = false;
  public cell: CollectibleCell = { x: 0, y: 0 };
  public baseScore = 0;
  public multiplier = 1;
  public scoreDelta = 0;
  public ticksRemaining = 0;

  /** Starts or replaces the current popup countdown. */
  public start(options: CollectiblePickupPopupStartOptions): void {
    this.cell = { ...options.cell };
    this.baseScore = Math.max(0, Math.floor(options.baseScore));
    this.multiplier = Math.max(1, Math.floor(options.multiplier));
    this.scoreDelta = Math.max(0, Math.floor(options.scoreDelta));
    this.ticksRemaining = CollectiblePickupPopupState.durationTicks;
    this.isActive = true;
  }

  /** Advances one fixed simulation tick and returns true when the popup just finished. */
  public advanceOneTick(): boolean {
    if (!this.isActive) {
      return false;
    }

    this.ticksRemaining -= 1;

    if (this.ticksRemaining > 0) {
      return false;
    }

    this.clear();
    return true;
  }

  /** Clears the popup countdown immediately. */
  public clear(): void {
    this.isActive = false;
    this.cell = { x: 0, y: 0 };
    this.baseScore = 0;
    this.multiplier = 1;
    this.scoreDelta = 0;
    this.ticksRemaining = 0;
  }
}
