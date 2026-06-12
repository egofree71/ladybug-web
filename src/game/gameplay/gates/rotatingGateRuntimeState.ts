/**
 * Mutable runtime state for the twenty rotating gates, including the short
 * diagonal visual phase after an accepted push.
 */
import { equals, type Vector2i, VEC2 } from '../math/vector2';
import {
  GATE_CONTACT_HALF,
  GATE_LOGICAL_STATE,
  GATE_ORIENTATION,
  GATE_TURNING_VISUAL,
  GATE_VISUAL_STATE,
  type GateContactHalf,
  type GateLogicalState,
  type GateOrientation,
  type GateTurningVisual,
  type GateVisualState,
} from './gateTypes';

const TURNING_TICKS = 2;

/**
 * Mutable gameplay state for one rotating gate.
 *
 * A pushed gate toggles its logical blocking axis immediately, then shows a
 * short diagonal visual for a couple of fixed simulation ticks. This mirrors the
 * current Godot runtime and keeps gate legality independent from Phaser's render
 * frame cadence.
 */
export class RotatingGateRuntimeState {
  public logicalState: GateLogicalState;
  public visualState: GateVisualState = GATE_VISUAL_STATE.stable;
  public turningVisual: GateTurningVisual = GATE_TURNING_VISUAL.slash;
  public isRotating = false;
  public rotationTicksRemaining = 0;

  public readonly id: number;
  public readonly pivot: Vector2i;

  public constructor(id: number, pivot: Vector2i, initialOrientation: GateOrientation) {
    this.id = id;
    this.pivot = pivot;
    this.logicalState = initialOrientation === GATE_ORIENTATION.horizontal
      ? GATE_LOGICAL_STATE.blocksVertical
      : GATE_LOGICAL_STATE.blocksHorizontal;
  }

  public getStableOrientation(): GateOrientation {
    return this.logicalState === GATE_LOGICAL_STATE.blocksHorizontal
      ? GATE_ORIENTATION.vertical
      : GATE_ORIENTATION.horizontal;
  }

  public blocksMovement(moveDir: Vector2i): boolean {
    if (equals(moveDir, VEC2.zero)) {
      return false;
    }

    if (this.logicalState === GATE_LOGICAL_STATE.blocksHorizontal) {
      return moveDir.x !== 0;
    }

    return moveDir.y !== 0;
  }

  public canBePushedBy(moveDir: Vector2i): boolean {
    return !this.isRotating && this.blocksMovement(moveDir);
  }

  public tryBeginPush(moveDir: Vector2i, contactHalf: GateContactHalf): boolean {
    if (!this.canBePushedBy(moveDir)) {
      return false;
    }

    this.turningVisual = computeTurningVisual(this.logicalState, moveDir, contactHalf);
    this.logicalState = toggleLogicalState(this.logicalState);
    this.visualState = GATE_VISUAL_STATE.turning;
    this.isRotating = true;
    this.rotationTicksRemaining = TURNING_TICKS;
    return true;
  }

  public advanceOneTick(): void {
    if (!this.isRotating) {
      return;
    }

    this.rotationTicksRemaining--;

    if (this.rotationTicksRemaining <= 0) {
      this.rotationTicksRemaining = 0;
      this.isRotating = false;
      this.visualState = GATE_VISUAL_STATE.stable;
    }
  }
}

function toggleLogicalState(state: GateLogicalState): GateLogicalState {
  return state === GATE_LOGICAL_STATE.blocksHorizontal
    ? GATE_LOGICAL_STATE.blocksVertical
    : GATE_LOGICAL_STATE.blocksHorizontal;
}

function computeTurningVisual(
  logicalState: GateLogicalState,
  moveDir: Vector2i,
  contactHalf: GateContactHalf,
): GateTurningVisual {
  if (logicalState === GATE_LOGICAL_STATE.blocksVertical) {
    return computeTurningVisualFromHorizontalGate(moveDir, contactHalf);
  }

  return computeTurningVisualFromVerticalGate(moveDir, contactHalf);
}

function computeTurningVisualFromHorizontalGate(moveDir: Vector2i, contactHalf: GateContactHalf): GateTurningVisual {
  if (moveDir.y < 0) {
    return contactHalf === GATE_CONTACT_HALF.right ? GATE_TURNING_VISUAL.slash : GATE_TURNING_VISUAL.backslash;
  }

  if (moveDir.y > 0) {
    return contactHalf === GATE_CONTACT_HALF.right ? GATE_TURNING_VISUAL.backslash : GATE_TURNING_VISUAL.slash;
  }

  return GATE_TURNING_VISUAL.slash;
}

function computeTurningVisualFromVerticalGate(moveDir: Vector2i, contactHalf: GateContactHalf): GateTurningVisual {
  if (moveDir.x > 0) {
    return contactHalf === GATE_CONTACT_HALF.top ? GATE_TURNING_VISUAL.slash : GATE_TURNING_VISUAL.backslash;
  }

  if (moveDir.x < 0) {
    return contactHalf === GATE_CONTACT_HALF.top ? GATE_TURNING_VISUAL.backslash : GATE_TURNING_VISUAL.slash;
  }

  return GATE_TURNING_VISUAL.slash;
}
