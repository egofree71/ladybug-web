/**
 * Small mutable score holder for the current player.
 *
 * Keeping this outside the Phaser scene makes the HUD a view of semantic game
 * state rather than the place where scoring rules are calculated.
 */
export class ScoreState {
  private value = 0;

  public get score(): number {
    return this.value;
  }

  public reset(): void {
    this.value = 0;
  }

  public addPoints(points: number): void {
    this.value += Math.max(0, Math.floor(points));
  }
}
