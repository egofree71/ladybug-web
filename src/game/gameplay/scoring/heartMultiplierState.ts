/**
 * Tracks the score multiplier unlocked by collecting blue hearts.
 *
 * The heart that unlocks a new step is scored with the multiplier that was
 * active before collection. The new multiplier applies to later collectibles,
 * matching the current Godot remake behavior.
 */
export class HeartMultiplierState {
  private static readonly maxStep = 3;

  private multiplierStep = 0;

  public get step(): number {
    return this.multiplierStep;
  }

  public get currentMultiplier(): number {
    if (this.multiplierStep <= 0) {
      return 1;
    }

    if (this.multiplierStep === 1) {
      return 2;
    }

    if (this.multiplierStep === 2) {
      return 3;
    }

    return 5;
  }

  public reset(): void {
    this.multiplierStep = 0;
  }

  public advanceOneStep(): boolean {
    if (this.multiplierStep >= HeartMultiplierState.maxStep) {
      return false;
    }

    this.multiplierStep++;
    return true;
  }
}
