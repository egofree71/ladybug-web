/**
 * Logical clockwise timer used by the maze border that announces future enemy release.
 *
 * This class owns no Phaser objects. It only tracks which timer-indexed border
 * tiles should be green and emits a release opportunity whenever one complete
 * visible lap finishes. The cadence mirrors the Godot remake's arcade-inspired
 * countdown / reload model: level 1 uses 9 simulation ticks per tile, levels 2-4
 * use 6, and level 5 onward uses 3.
 */
export class EnemyReleaseBorderTimer {
  private static readonly arcadeEnemyExitWarningStepsBeforeRelease = 11;
  private static readonly level1EnemyExitWarningStepsBeforeRelease = 10;
  private static readonly level5PlusEnemyExitWarningStepsBeforeRelease = 26;

  private tileCountValue: number;
  private ticksPerTileValue: number;
  private progressValue = 0;
  private ticksRemainingValue = 1;

  public phase: EnemyReleaseBorderTimerPhase = ENEMY_RELEASE_BORDER_TIMER_PHASE.fillingGreen;

  public constructor(tileCount: number, ticksPerTile: number) {
    this.tileCountValue = Math.max(0, Math.floor(tileCount));
    this.ticksPerTileValue = Math.max(1, Math.floor(ticksPerTile));
    this.reset();
  }

  public get tileCount(): number {
    return this.tileCountValue;
  }

  public set tileCount(value: number) {
    this.tileCountValue = Math.max(0, Math.floor(value));
    this.progressValue = clamp(this.progressValue, 0, this.tileCountValue);
  }

  /** Number of border tiles already processed in the current fill or clear phase. */
  public get progress(): number {
    return this.progressValue;
  }

  /** Countdown reload period, in fixed arcade simulation ticks. */
  public get ticksPerTile(): number {
    return this.ticksPerTileValue;
  }

  public set ticksPerTile(value: number) {
    this.ticksPerTileValue = Math.max(1, Math.floor(value));

    if (this.ticksRemainingValue <= 0 || this.ticksRemainingValue > this.ticksPerTileValue) {
      this.ticksRemainingValue = this.ticksPerTileValue;
    }
  }

  /** Remaining countdown ticks before the next tile changes color. */
  public get ticksRemaining(): number {
    return this.ticksRemainingValue;
  }

  /** Returns the border-step period for the visible level number. */
  public static getTicksPerTileForLevel(levelNumber: number): number {
    if (levelNumber <= 1) {
      return 9;
    }

    if (levelNumber <= 4) {
      return 6;
    }

    return 3;
  }

  /** Resets the border to the initial all-white state. */
  public reset(): void {
    this.phase = ENEMY_RELEASE_BORDER_TIMER_PHASE.fillingGreen;
    this.progressValue = 0;
    this.ticksRemainingValue = this.ticksPerTileValue;
  }

  /** Advances the timer by one fixed arcade simulation tick. */
  public advanceOneTick(): EnemyReleaseBorderTimerStepResult {
    if (this.tileCountValue <= 0) {
      return this.currentStepResult(false, false, false);
    }

    this.ticksRemainingValue -= 1;

    if (this.ticksRemainingValue > 0) {
      return this.currentStepResult(false, false, false);
    }

    this.ticksRemainingValue = this.ticksPerTileValue;
    return this.advanceOneBorderTile();
  }

  /** Returns whether the tile at the given clockwise timer index is currently green. */
  public isTileGreen(tileIndex: number): boolean {
    if (tileIndex < 0 || tileIndex >= this.tileCountValue) {
      return false;
    }

    if (this.phase === ENEMY_RELEASE_BORDER_TIMER_PHASE.fillingGreen) {
      return tileIndex < this.progressValue;
    }

    return tileIndex >= this.progressValue;
  }

  private advanceOneBorderTile(): EnemyReleaseBorderTimerStepResult {
    this.progressValue += 1;

    if (this.progressValue < this.tileCountValue) {
      return this.currentStepResult(true, false, this.shouldPlayEnemyExitWarningAtCurrentProgress());
    }

    if (this.phase === ENEMY_RELEASE_BORDER_TIMER_PHASE.fillingGreen) {
      this.phase = ENEMY_RELEASE_BORDER_TIMER_PHASE.clearingWhite;
      this.progressValue = 0;
      return this.currentStepResult(true, true, false);
    }

    this.phase = ENEMY_RELEASE_BORDER_TIMER_PHASE.fillingGreen;
    this.progressValue = 0;
    return this.currentStepResult(true, true, false);
  }

  private currentStepResult(
    visualChanged: boolean,
    shouldReleaseEnemy: boolean,
    shouldPlayEnemyExitWarning: boolean,
  ): EnemyReleaseBorderTimerStepResult {
    return {
      phase: this.phase,
      progress: this.progressValue,
      tileCount: this.tileCountValue,
      ticksPerTile: this.ticksPerTileValue,
      ticksRemaining: this.ticksRemainingValue,
      visualChanged,
      shouldReleaseEnemy,
      shouldPlayEnemyExitWarning,
    };
  }

  private shouldPlayEnemyExitWarningAtCurrentProgress(): boolean {
    const warningStepsBeforeRelease = this.getEnemyExitWarningStepsBeforeRelease();

    return this.tileCountValue > warningStepsBeforeRelease &&
      this.progressValue === this.tileCountValue - warningStepsBeforeRelease;
  }

  private getEnemyExitWarningStepsBeforeRelease(): number {
    if (this.ticksPerTileValue >= 9) {
      return EnemyReleaseBorderTimer.level1EnemyExitWarningStepsBeforeRelease;
    }

    if (this.ticksPerTileValue <= 3) {
      return EnemyReleaseBorderTimer.level5PlusEnemyExitWarningStepsBeforeRelease;
    }

    return EnemyReleaseBorderTimer.arcadeEnemyExitWarningStepsBeforeRelease;
  }
}

export const ENEMY_RELEASE_BORDER_TIMER_PHASE = {
  fillingGreen: 'fillingGreen',
  clearingWhite: 'clearingWhite',
} as const;

export type EnemyReleaseBorderTimerPhase =
  (typeof ENEMY_RELEASE_BORDER_TIMER_PHASE)[keyof typeof ENEMY_RELEASE_BORDER_TIMER_PHASE];

export interface EnemyReleaseBorderTimerStepResult {
  readonly phase: EnemyReleaseBorderTimerPhase;
  readonly progress: number;
  readonly tileCount: number;
  readonly ticksPerTile: number;
  readonly ticksRemaining: number;
  readonly visualChanged: boolean;
  readonly shouldReleaseEnemy: boolean;
  readonly shouldPlayEnemyExitWarning: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
