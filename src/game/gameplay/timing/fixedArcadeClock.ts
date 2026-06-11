/**
 * Fixed-step timing helper for arcade-style gameplay systems.
 *
 * Phaser's update callback runs whenever the browser renders a frame. That
 * cadence can vary by monitor, device, power mode, browser throttling, and tab
 * visibility. Gameplay systems should therefore advance from elapsed time, not
 * from the number of rendered frames.
 *
 * The step duration below is a simulation duration chosen to match the Godot
 * remake. It is deliberately expressed in milliseconds so it cannot be confused
 * with the screen refresh rate.
 */
export const FIXED_SIMULATION_STEP_MS = 16.6349549971;

// Avoid processing a huge catch-up burst after a suspended tab resumes.
const MAX_FRAME_DELTA_MS = 250;

export type FixedTickCallback = () => void;

/**
 * Accumulates variable browser-frame time and dispatches fixed simulation steps.
 */
export class FixedArcadeClock {
  private accumulatorMs = 0;

  /** Clears any partial elapsed time that has not yet produced a fixed step. */
  public reset(): void {
    this.accumulatorMs = 0;
  }

  /**
   * Advances the clock by one browser frame delta.
   *
   * The callback may run multiple times during a slow browser frame, or not at
   * all during a very fast browser frame. Gameplay code therefore advances
   * according to elapsed time, not according to the display refresh cadence.
   */
  public runFrame(deltaMs: number, tickCallback: FixedTickCallback): number {
    const safeDeltaMs = Math.max(0, Math.min(deltaMs, MAX_FRAME_DELTA_MS));
    this.accumulatorMs += safeDeltaMs;

    let stepCount = 0;

    while (this.accumulatorMs >= FIXED_SIMULATION_STEP_MS) {
      this.accumulatorMs -= FIXED_SIMULATION_STEP_MS;
      tickCallback();
      stepCount++;
    }

    return stepCount;
  }
}
