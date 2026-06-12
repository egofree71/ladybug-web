/**
 * Integer arcade-pixel player movement motor. It owns rail snapping, turn
 * windows, assisted turns, gate pushes and committed segment reporting.
 */
import {
  arcadePixelToLogicalCell,
  logicalCellToArcadePixel,
} from '../../layout/playfieldCoordinates';
import { GateSystem } from '../gates/gateSystem';
import { add, clone, equals, isHorizontal, isSameAxis, isVertical, isZero, type Vector2i, VEC2 } from '../math/vector2';
import { MazeGrid } from '../maze/mazeGrid';
import {
  PLAYFIELD_STEP_KIND,
  PlayfieldCollisionResolver,
  type PlayfieldStepResult,
} from '../playfield/playfieldCollision';
import { getPlayerCollisionProfile, PLAYER_MOVEMENT_TUNING } from './playerMovementTuning';
import { choosePlayerTurnWindow, hasTurnLaneTarget } from './playerTurnWindowResolver';
import { PlayerTurnWindowMaps } from './playerTurnWindowMaps';
import { PLAYER_TURN_ASSIST_FLAGS, PLAYER_TURN_PATH } from './playerTurnTypes';

export interface PlayerMovementSegment {
  readonly startArcadePixelPos: Vector2i;
  readonly endArcadePixelPos: Vector2i;
  readonly direction: Vector2i;
}

export interface PlayerMovementStepResult {
  readonly moved: boolean;
  readonly directionChanged: boolean;
  readonly previousArcadePixelPos: Vector2i;
  readonly currentArcadePixelPos: Vector2i;
  readonly snappedArcadePixelPos?: Vector2i;
  readonly movementSegments: readonly PlayerMovementSegment[];
  readonly previousDirection: Vector2i;
  readonly currentDirection: Vector2i;
  readonly offsetDirection: Vector2i;
  readonly facingDirection: Vector2i;
}

/**
 * Pixel-by-pixel player movement motor ported from the Godot remake.
 *
 * This class is intentionally renderer-agnostic. It stores only integer arcade
 * pixels, direction latches, assisted-turn state and collision decisions. Phaser
 * sprites are updated later from the returned movement state.
 */
export class PlayerMovementMotor {
  private readonly playfieldCollisionResolver: PlayfieldCollisionResolver;
  private readonly turnWindowMaps: PlayerTurnWindowMaps;
  private readonly movementSegmentsThisTick: PlayerMovementSegment[] = [];

  private arcadePixelPos = VEC2.zero;
  private currentDir = VEC2.zero;
  private offsetDir = VEC2.up;
  private facingDir = VEC2.up;
  private latchedRequestedDir = VEC2.zero;
  private turnLaneTarget = VEC2.zero;
  private turnAssistFlags: number = PLAYER_TURN_ASSIST_FLAGS.none;
  private assistedTurnActive = false;
  private deferredSameAxisAssistDir = VEC2.zero;

  private readonly gateSystem: GateSystem;
  private readonly startCell: Vector2i;

  public constructor(mazeGrid: MazeGrid, gateSystem: GateSystem, startCell: Vector2i) {
    this.gateSystem = gateSystem;
    this.startCell = startCell;
    this.playfieldCollisionResolver = new PlayfieldCollisionResolver(mazeGrid, gateSystem);
    this.turnWindowMaps = PlayerTurnWindowMaps.fromMazeGrid(mazeGrid);
    this.resetToStartCell();
  }

  public get arcadePosition(): Vector2i {
    return this.arcadePixelPos;
  }

  public get currentDirection(): Vector2i {
    return this.currentDir;
  }

  public get offsetDirection(): Vector2i {
    return this.offsetDir;
  }

  public resetToStartCell(): void {
    this.arcadePixelPos = logicalCellToArcadePixel(this.startCell);
    this.currentDir = VEC2.zero;
    this.offsetDir = VEC2.up;
    this.facingDir = VEC2.up;
    this.latchedRequestedDir = VEC2.zero;
    this.turnLaneTarget = clone(this.arcadePixelPos);
    this.turnAssistFlags = PLAYER_TURN_ASSIST_FLAGS.none;
    this.assistedTurnActive = false;
    this.deferredSameAxisAssistDir = VEC2.zero;
    this.movementSegmentsThisTick.length = 0;
  }

  public step(wantedDir: Vector2i): PlayerMovementStepResult {
    const previousPixelPos = clone(this.arcadePixelPos);
    const previousDirection = clone(this.currentDir);
    let snappedArcadePixelPos: Vector2i | undefined;

    this.movementSegmentsThisTick.length = 0;

    if (isZero(wantedDir)) {
      return this.finishStep(previousPixelPos, previousDirection, snappedArcadePixelPos);
    }

    // Facing is an input intent, not only a successful movement result.
    // Keep offsetDir for the sprite render offset used by the gameplay anchor:
    // Godot turns the AnimatedSprite toward blocked input, but it does not use
    // the requested direction to shift the sprite position unless movement
    // actually commits.
    this.facingDir = wantedDir;

    if (isZero(this.currentDir)) {
      const originalPixelPos = clone(this.arcadePixelPos);

      if (!this.trySnapToRailForDirection(wantedDir)) {
        return this.finishStep(previousPixelPos, previousDirection, snappedArcadePixelPos);
      }

      if (!equals(this.arcadePixelPos, originalPixelPos)) {
        snappedArcadePixelPos = clone(this.arcadePixelPos);
      }

      this.advanceStraightStep(wantedDir);
      return this.finishStep(previousPixelPos, previousDirection, snappedArcadePixelPos);
    }

    this.advanceWithArcadeTurnRules(wantedDir);
    return this.finishStep(previousPixelPos, previousDirection, snappedArcadePixelPos);
  }

  private advanceWithArcadeTurnRules(requested: Vector2i): void {
    if (equals(requested, this.currentDir)) {
      if (this.assistedTurnActive && this.orthogonalAxisNotAligned(requested)) {
        this.advanceAssistedTurnStep(requested, false);
      } else {
        this.advanceStraightStep(requested);
      }

      return;
    }

    if (this.assistedTurnActive) {
      this.continueAssistedTurn(requested);
      return;
    }

    this.turnAssistFlags = PLAYER_TURN_ASSIST_FLAGS.none;

    const decision = choosePlayerTurnWindow(
      this.turnWindowMaps,
      this.arcadePixelPos,
      requested,
      this.currentDir,
      this.turnLaneTarget,
    );

    if (hasTurnLaneTarget(decision.laneTarget)) {
      this.turnLaneTarget = decision.laneTarget;
    }

    this.turnAssistFlags = decision.assistFlags;

    if (decision.path === PLAYER_TURN_PATH.normal) {
      this.advanceViaRequestLatch(requested);
    } else if (decision.path === PLAYER_TURN_PATH.assisted) {
      this.continueAssistedTurn(requested);
    } else {
      this.advanceCloseRangeAssistThenNormal(requested);
    }
  }

  private advanceViaRequestLatch(requested: Vector2i): void {
    this.assistedTurnActive = false;
    this.deferredSameAxisAssistDir = VEC2.zero;

    if (!equals(this.latchedRequestedDir, requested)) {
      this.latchedRequestedDir = requested;
      return;
    }

    const requestContinuesCurrentAxis =
      (isHorizontal(requested) && isHorizontal(this.currentDir)) ||
      (isVertical(requested) && isVertical(this.currentDir));

    if (!requestContinuesCurrentAxis) {
      this.applyStoredTurnAlignmentCorrection();
      return;
    }

    this.advanceStraightStep(requested);
  }

  private applyStoredTurnAlignmentCorrection(): void {
    if (this.turnAssistFlags === PLAYER_TURN_ASSIST_FLAGS.none) {
      return;
    }

    if (!this.canMoveInRequestedDirectionFromTurnLane(this.latchedRequestedDir)) {
      return;
    }

    if ((this.turnAssistFlags & PLAYER_TURN_ASSIST_FLAGS.correctY) !== 0) {
      const correction = this.stepTowardY(this.turnLaneTarget.y);

      if (!isZero(correction)) {
        this.tryAdvanceOnePixel(correction, false, false);
      }

      return;
    }

    if ((this.turnAssistFlags & PLAYER_TURN_ASSIST_FLAGS.correctX) !== 0) {
      const correction = this.stepTowardX(this.turnLaneTarget.x);

      if (!isZero(correction)) {
        this.tryAdvanceOnePixel(correction, false, false);
      }
    }
  }

  private advanceCloseRangeAssistThenNormal(requested: Vector2i): void {
    if (isVertical(requested)) {
      const distanceToLane = Math.abs(this.turnLaneTarget.x - this.arcadePixelPos.x);

      if (distanceToLane > 4) {
        this.advanceViaRequestLatch(requested);
      } else if (distanceToLane > 0) {
        this.assistedTurnActive = true;
        this.advanceAssistedTurnStep(requested, true);
      } else {
        this.advanceViaRequestLatch(requested);
      }

      return;
    }

    if (isHorizontal(requested)) {
      const distanceToLane = Math.abs(this.turnLaneTarget.y - this.arcadePixelPos.y);

      if (distanceToLane > 4) {
        this.advanceViaRequestLatch(requested);
      } else if (distanceToLane > 0) {
        this.assistedTurnActive = true;
        this.advanceAssistedTurnStep(requested, true);
      } else {
        this.advanceViaRequestLatch(requested);
      }
    }
  }

  private continueAssistedTurn(requested: Vector2i): void {
    this.assistedTurnActive = true;

    if (!equals(this.latchedRequestedDir, requested)) {
      const sameAxisReversalDuringAssistedTurn =
        isSameAxis(requested, this.currentDir) &&
        this.orthogonalAxisNotAligned(requested);

      if (sameAxisReversalDuringAssistedTurn && !equals(this.deferredSameAxisAssistDir, requested)) {
        this.latchedRequestedDir = requested;
        this.deferredSameAxisAssistDir = requested;
        return;
      }

      this.advanceViaRequestLatch(requested);
      return;
    }

    this.deferredSameAxisAssistDir = VEC2.zero;

    if (equals(this.arcadePixelPos, this.turnLaneTarget)) {
      this.advanceStraightStep(requested);
      return;
    }

    if (isVertical(requested) && this.arcadePixelPos.x !== this.turnLaneTarget.x) {
      this.advanceAssistedTurnStep(requested, false);
      return;
    }

    if (isHorizontal(requested) && this.arcadePixelPos.y !== this.turnLaneTarget.y) {
      this.advanceAssistedTurnStep(requested, false);
      return;
    }

    this.finishRemainingLaneCorrection();
  }

  private finishRemainingLaneCorrection(): void {
    if (this.arcadePixelPos.x !== this.turnLaneTarget.x) {
      const correction = this.stepTowardX(this.turnLaneTarget.x);

      if (!isZero(correction)) {
        this.tryAdvanceOnePixel(correction, false, false);
      }

      return;
    }

    if (this.arcadePixelPos.y !== this.turnLaneTarget.y) {
      const correction = this.stepTowardY(this.turnLaneTarget.y);

      if (!isZero(correction)) {
        this.tryAdvanceOnePixel(correction, false, false);
      }
    }
  }

  private advanceAssistedTurnStep(requested: Vector2i, clearAssistFlags: boolean): void {
    if (!this.canMoveInRequestedDirectionFromTurnLane(requested)) {
      return;
    }

    const correction = this.getCorrectionTowardTurnLane(requested);

    if (!isZero(correction) && !this.tryAdvanceOnePixel(correction, false, false)) {
      return;
    }

    if (this.tryAdvanceOnePixel(requested, true, true)) {
      this.latchedRequestedDir = requested;
      this.offsetDir = requested;
    }

    if (clearAssistFlags) {
      this.turnAssistFlags = PLAYER_TURN_ASSIST_FLAGS.none;
    }
  }

  private advanceStraightStep(requested: Vector2i): void {
    if (this.tryAdvanceOnePixel(requested, true)) {
      this.latchedRequestedDir = requested;
      this.offsetDir = requested;
    }
  }

  private getCorrectionTowardTurnLane(requested: Vector2i): Vector2i {
    if (isVertical(requested)) {
      return this.stepTowardX(this.turnLaneTarget.x);
    }

    if (isHorizontal(requested)) {
      return this.stepTowardY(this.turnLaneTarget.y);
    }

    return VEC2.zero;
  }

  private resolveGatePushIfNeeded(step: PlayfieldStepResult, direction: Vector2i): PlayfieldStepResult {
    if (
      step.kind === PLAYFIELD_STEP_KIND.blockedByGate &&
      step.gateId !== undefined &&
      step.contactHalf !== undefined &&
      this.gateSystem.tryPush(step.gateId, direction, step.contactHalf)
    ) {
      return this.evaluateOnePixelStep(direction);
    }

    return step;
  }

  private tryAdvanceOnePixel(direction: Vector2i, updateCurrentDirection: boolean, allowGatePush = true): boolean {
    if (isZero(direction)) {
      return false;
    }

    let step = this.evaluateOnePixelStep(direction);

    if (allowGatePush) {
      step = this.resolveGatePushIfNeeded(step, direction);
    }

    if (!step.allowed) {
      return false;
    }

    const segmentStart = clone(this.arcadePixelPos);
    this.arcadePixelPos = add(this.arcadePixelPos, direction);
    this.movementSegmentsThisTick.push({
      startArcadePixelPos: segmentStart,
      endArcadePixelPos: clone(this.arcadePixelPos),
      direction,
    });

    if (updateCurrentDirection) {
      this.currentDir = direction;
    }

    return true;
  }

  private canMoveInRequestedDirectionFromTurnLane(requested: Vector2i): boolean {
    if (isZero(requested)) {
      return false;
    }

    const testPos = this.getTurnLaneProbePosition(requested);
    const step = this.evaluateOnePixelStepAt(testPos, requested);

    if (step.allowed) {
      return true;
    }

    return this.isPushableGateBlock(step, requested);
  }

  private isPushableGateBlock(step: PlayfieldStepResult, requested: Vector2i): boolean {
    if (step.kind !== PLAYFIELD_STEP_KIND.blockedByGate || step.gateId === undefined || step.contactHalf === undefined) {
      return false;
    }

    return this.gateSystem.getGateById(step.gateId)?.canBePushedBy(requested) ?? false;
  }

  private getTurnLaneProbePosition(requested: Vector2i): Vector2i {
    if (isVertical(requested)) {
      return { x: this.turnLaneTarget.x, y: this.arcadePixelPos.y };
    }

    if (isHorizontal(requested)) {
      return { x: this.arcadePixelPos.x, y: this.turnLaneTarget.y };
    }

    return this.arcadePixelPos;
  }

  private trySnapToRailForDirection(direction: Vector2i): boolean {
    if (!this.canSnapToRailForDirection(direction)) {
      return false;
    }

    const currentCell = arcadePixelToLogicalCell(this.arcadePixelPos);
    const anchor = logicalCellToArcadePixel(currentCell);

    if (direction.x !== 0) {
      this.arcadePixelPos = { x: this.arcadePixelPos.x, y: anchor.y };
      return true;
    }

    if (direction.y !== 0) {
      this.arcadePixelPos = { x: anchor.x, y: this.arcadePixelPos.y };
      return true;
    }

    return false;
  }

  private canSnapToRailForDirection(direction: Vector2i): boolean {
    if (isZero(direction)) {
      return false;
    }

    const currentCell = arcadePixelToLogicalCell(this.arcadePixelPos);
    const anchor = logicalCellToArcadePixel(currentCell);

    if (direction.x !== 0) {
      return Math.abs(this.arcadePixelPos.y - anchor.y) <= PLAYER_MOVEMENT_TUNING.horizontalRailSnapTolerance;
    }

    if (direction.y !== 0) {
      return Math.abs(this.arcadePixelPos.x - anchor.x) <= PLAYER_MOVEMENT_TUNING.verticalRailSnapTolerance;
    }

    return false;
  }

  private evaluateOnePixelStep(direction: Vector2i): PlayfieldStepResult {
    return this.evaluateOnePixelStepAt(this.arcadePixelPos, direction);
  }

  private evaluateOnePixelStepAt(arcadePixelPos: Vector2i, direction: Vector2i): PlayfieldStepResult {
    if (isZero(direction)) {
      return {
        kind: PLAYFIELD_STEP_KIND.blockedByFixedWall,
        mazeStep: { allowed: false, currentCell: VEC2.zero, nextCell: VEC2.zero },
        allowed: false,
      };
    }

    return this.playfieldCollisionResolver.evaluateArcadePixelStep(
      arcadePixelPos,
      direction,
      getPlayerCollisionProfile(direction),
    );
  }

  private finishStep(
    previousPixelPos: Vector2i,
    previousDirection: Vector2i,
    snappedArcadePixelPos: Vector2i | undefined,
  ): PlayerMovementStepResult {
    return {
      moved: !equals(this.arcadePixelPos, previousPixelPos),
      directionChanged: !equals(this.currentDir, previousDirection),
      previousArcadePixelPos: previousPixelPos,
      currentArcadePixelPos: clone(this.arcadePixelPos),
      snappedArcadePixelPos,
      movementSegments: this.movementSegmentsThisTick.map((segment) => ({ ...segment })),
      previousDirection,
      currentDirection: clone(this.currentDir),
      offsetDirection: clone(this.offsetDir),
      facingDirection: clone(this.facingDir),
    };
  }

  private orthogonalAxisNotAligned(requested: Vector2i): boolean {
    if (isVertical(requested)) {
      return this.arcadePixelPos.x !== this.turnLaneTarget.x;
    }

    if (isHorizontal(requested)) {
      return this.arcadePixelPos.y !== this.turnLaneTarget.y;
    }

    return false;
  }

  private stepTowardX(targetX: number): Vector2i {
    if (this.arcadePixelPos.x < targetX) {
      return VEC2.right;
    }

    if (this.arcadePixelPos.x > targetX) {
      return VEC2.left;
    }

    return VEC2.zero;
  }

  private stepTowardY(targetY: number): Vector2i {
    if (this.arcadePixelPos.y < targetY) {
      return VEC2.down;
    }

    if (this.arcadePixelPos.y > targetY) {
      return VEC2.up;
    }

    return VEC2.zero;
  }
}
