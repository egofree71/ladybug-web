/**
 * Tick-based player death animation state ported from Godot. The render layer
 * consumes these semantic frames to draw the red shrink and ghost sequence.
 */
import { add, type Vector2i, VEC2, vec2 } from '../math/vector2';

export const PLAYER_DEATH_VISUAL_SHEET = {
  none: 'none',
  red: 'red',
  ghost: 'ghost',
} as const;

export type PlayerDeathVisualSheet = (typeof PLAYER_DEATH_VISUAL_SHEET)[keyof typeof PLAYER_DEATH_VISUAL_SHEET];

interface DeathFrame {
  readonly sheet: PlayerDeathVisualSheet;
  readonly frame: number;
  readonly ticks: number;
}

type DeathPhase = 'inactive' | 'redFrames' | 'ghostFrames' | 'ghostPath' | 'complete';
type GhostMoveSegment = 'rightUp' | 'leftUp';

const RED_FRAMES: readonly DeathFrame[] = [
  { sheet: PLAYER_DEATH_VISUAL_SHEET.red, frame: 0, ticks: 30 },
  { sheet: PLAYER_DEATH_VISUAL_SHEET.red, frame: 1, ticks: 5 },
  { sheet: PLAYER_DEATH_VISUAL_SHEET.red, frame: 2, ticks: 5 },
  { sheet: PLAYER_DEATH_VISUAL_SHEET.red, frame: 3, ticks: 5 },
  { sheet: PLAYER_DEATH_VISUAL_SHEET.red, frame: 4, ticks: 5 },
  { sheet: PLAYER_DEATH_VISUAL_SHEET.red, frame: 5, ticks: 5 },
  { sheet: PLAYER_DEATH_VISUAL_SHEET.red, frame: 6, ticks: 5 },
];

const GHOST_FRAMES: readonly DeathFrame[] = [
  { sheet: PLAYER_DEATH_VISUAL_SHEET.ghost, frame: 0, ticks: 5 },
  { sheet: PLAYER_DEATH_VISUAL_SHEET.ghost, frame: 1, ticks: 5 },
  { sheet: PLAYER_DEATH_VISUAL_SHEET.ghost, frame: 2, ticks: 5 },
  { sheet: PLAYER_DEATH_VISUAL_SHEET.ghost, frame: 3, ticks: 5 },
  { sheet: PLAYER_DEATH_VISUAL_SHEET.ghost, frame: 4, ticks: 5 },
  { sheet: PLAYER_DEATH_VISUAL_SHEET.ghost, frame: 5, ticks: 5 },
  { sheet: PLAYER_DEATH_VISUAL_SHEET.ghost, frame: 6, ticks: 30 },
];

const GHOST_PATH: readonly GhostMoveSegment[] = [
  'rightUp',
  'leftUp',
  'leftUp',
  'rightUp',
  'rightUp',
  'leftUp',
  'leftUp',
  'rightUp',
];

const GHOST_PATH_SEGMENT_TICKS = 15;

/**
 * Tick-based state machine for the player death sequence.
 *
 * It mirrors the Godot remake: red shrinking frames, ghost appearance frames,
 * then a fixed zigzag upward path. It only stores semantic frame and offset
 * data; PlayerView owns the Phaser sprites that display those values.
 */
export class PlayerDeathSequenceState {
  public isActive = false;
  public isComplete = false;
  public currentSheet: PlayerDeathVisualSheet = PLAYER_DEATH_VISUAL_SHEET.none;
  public currentFrame = 0;
  public currentVisualOffsetArcade: Vector2i = VEC2.zero;

  private phase: DeathPhase = 'inactive';
  private frameIndex = 0;
  private ticksRemainingInFrame = 0;
  private ghostSegmentIndex = 0;
  private ghostSegmentTick = 0;

  /** Starts the sequence from the first red frame. */
  public start(): void {
    this.reset();
    this.phase = 'redFrames';
    this.isActive = true;
    this.frameIndex = 0;
    this.applyFrame(RED_FRAMES[this.frameIndex]);
  }

  /** Advances one fixed simulation tick and returns true when just completed. */
  public advanceOneTick(): boolean {
    if (!this.isActive) {
      return false;
    }

    if (this.phase === 'redFrames') {
      return this.advanceFrameSequence(RED_FRAMES, 'ghostFrames');
    }

    if (this.phase === 'ghostFrames') {
      return this.advanceFrameSequence(GHOST_FRAMES, 'ghostPath');
    }

    if (this.phase === 'ghostPath') {
      return this.advanceGhostPathOneTick();
    }

    return false;
  }

  /** Clears all death sequence state. */
  public reset(): void {
    this.phase = 'inactive';
    this.isActive = false;
    this.isComplete = false;
    this.frameIndex = 0;
    this.ticksRemainingInFrame = 0;
    this.ghostSegmentIndex = 0;
    this.ghostSegmentTick = 0;
    this.currentSheet = PLAYER_DEATH_VISUAL_SHEET.none;
    this.currentFrame = 0;
    this.currentVisualOffsetArcade = VEC2.zero;
  }

  private advanceFrameSequence(frames: readonly DeathFrame[], nextPhase: DeathPhase): boolean {
    this.ticksRemainingInFrame -= 1;

    if (this.ticksRemainingInFrame > 0) {
      return false;
    }

    this.frameIndex += 1;

    if (this.frameIndex < frames.length) {
      this.applyFrame(frames[this.frameIndex]);
      return false;
    }

    if (nextPhase === 'ghostFrames') {
      this.phase = 'ghostFrames';
      this.frameIndex = 0;
      this.applyFrame(GHOST_FRAMES[this.frameIndex]);
      return false;
    }

    this.startGhostPath();
    return false;
  }

  private applyFrame(frame: DeathFrame): void {
    this.currentSheet = frame.sheet;
    this.currentFrame = frame.frame;
    this.ticksRemainingInFrame = frame.ticks;
  }

  private startGhostPath(): void {
    this.phase = 'ghostPath';
    this.ghostSegmentIndex = 0;
    this.ghostSegmentTick = 0;
    this.currentSheet = PLAYER_DEATH_VISUAL_SHEET.ghost;
    this.currentFrame = 6;
  }

  private advanceGhostPathOneTick(): boolean {
    if (this.ghostSegmentIndex >= GHOST_PATH.length) {
      this.complete();
      return true;
    }

    this.currentVisualOffsetArcade = add(
      this.currentVisualOffsetArcade,
      getGhostPathDelta(GHOST_PATH[this.ghostSegmentIndex], this.ghostSegmentTick),
    );

    this.ghostSegmentTick += 1;

    if (this.ghostSegmentTick >= GHOST_PATH_SEGMENT_TICKS) {
      this.ghostSegmentTick = 0;
      this.ghostSegmentIndex += 1;
    }

    if (this.ghostSegmentIndex < GHOST_PATH.length) {
      return false;
    }

    this.complete();
    return true;
  }

  private complete(): void {
    this.phase = 'complete';
    this.isActive = false;
    this.isComplete = true;
    this.currentSheet = PLAYER_DEATH_VISUAL_SHEET.ghost;
    this.currentFrame = 6;
  }
}

function getGhostPathDelta(segment: GhostMoveSegment, tickWithinSegment: number): Vector2i {
  const horizontalStep = segment === 'rightUp' ? 1 : -1;

  if (tickWithinSegment < 2) {
    return vec2(horizontalStep, 0);
  }

  if (tickWithinSegment < 6) {
    return vec2(horizontalStep, -1);
  }

  if (tickWithinSegment < 10) {
    return VEC2.up;
  }

  return VEC2.zero;
}
