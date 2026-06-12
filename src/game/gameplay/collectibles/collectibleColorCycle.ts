/**
 * Tick-based global color cycle for hearts and letters. It stays separate from
 * the border timer because collectible colors and enemy release cadence are
 * independent arcade systems.
 */
import {
  COLLECTIBLE_COLOR,
  type CollectibleColor,
} from './collectibleTypes';

/**
 * Global color cycle used by heart and letter collectibles.
 *
 * This mirrors the current Godot implementation: the cycle is advanced from the
 * fixed gameplay tick, uses its own counter, and is intentionally separate from
 * the maze-border / enemy-release timer. The visible color and the future pickup
 * behavior should always read from this same state.
 */
export class CollectibleColorCycle {
  private static readonly totalTicks = 0x0258; // 600
  private static readonly redEnd = 0x001f; // 31 ticks
  private static readonly yellowEnd = 0x00b4; // 31 + 149 ticks

  // The Godot remake starts the level inside the blue range rather than at the
  // raw arcade counter value 0, so the visible order is blue -> red -> yellow.
  private tick = CollectibleColorCycle.yellowEnd;

  public get currentColor(): CollectibleColor {
    return CollectibleColorCycle.classifyTick(this.tick);
  }

  /** Starts the cycle in the blue phase, matching the Godot level reset. */
  public resetToBlue(): void {
    this.tick = CollectibleColorCycle.yellowEnd;
  }

  /**
   * Advances the color cycle by one fixed gameplay tick.
   *
   * @returns true only when the visible/gameplay color has changed.
   */
  public advanceOneTick(): boolean {
    const previousColor = this.currentColor;
    this.tick = (this.tick + 1) % CollectibleColorCycle.totalTicks;
    return this.currentColor !== previousColor;
  }

  private static classifyTick(tick: number): CollectibleColor {
    const normalizedTick = ((tick % CollectibleColorCycle.totalTicks) + CollectibleColorCycle.totalTicks) %
      CollectibleColorCycle.totalTicks;

    if (normalizedTick < CollectibleColorCycle.redEnd) {
      return COLLECTIBLE_COLOR.red;
    }

    if (normalizedTick < CollectibleColorCycle.yellowEnd) {
      return COLLECTIBLE_COLOR.yellow;
    }

    return COLLECTIBLE_COLOR.blue;
  }
}
