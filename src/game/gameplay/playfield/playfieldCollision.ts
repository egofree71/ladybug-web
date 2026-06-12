/**
 * Combines static maze walls with the dynamic rotating-gate overlay. Player and
 * enemy movement use this layer instead of reading sprite pixels.
 */
import { arcadePixelToLogicalCell, gatePivotToArcadePixel } from '../../layout/playfieldCoordinates';
import { add, equals, type Vector2i, VEC2, vec2 } from '../math/vector2';
import { MazeGrid, type MazeStepResult } from '../maze/mazeGrid';
import { GateSystem } from '../gates/gateSystem';
import {
  GATE_CONTACT_HALF,
  type GateContactHalf,
} from '../gates/gateTypes';
import type { RotatingGateRuntimeState } from '../gates/rotatingGateRuntimeState';

export interface PlayfieldCollisionProfile {
  readonly staticCollisionLead: Vector2i;
  readonly gateContactLead: Vector2i;
}

export const PLAYFIELD_STEP_KIND = {
  allowed: 'allowed',
  blockedByFixedWall: 'blocked-by-fixed-wall',
  blockedByGate: 'blocked-by-gate',
} as const;

export type PlayfieldStepKind = (typeof PLAYFIELD_STEP_KIND)[keyof typeof PLAYFIELD_STEP_KIND];

export interface PlayfieldStepResult {
  readonly kind: PlayfieldStepKind;
  readonly mazeStep: MazeStepResult;
  readonly gateId?: number;
  readonly contactHalf?: GateContactHalf;
  readonly allowed: boolean;
}

/**
 * Evaluates one arcade-pixel movement step against static maze walls and the
 * dynamic rotating-gate overlay.
 */
export class PlayfieldCollisionResolver {
  private readonly mazeGrid: MazeGrid;
  private readonly gateSystem: GateSystem;

  public constructor(mazeGrid: MazeGrid, gateSystem: GateSystem) {
    this.mazeGrid = mazeGrid;
    this.gateSystem = gateSystem;
  }

  public evaluateArcadePixelStep(
    arcadePixelPos: Vector2i,
    direction: Vector2i,
    collisionProfile: PlayfieldCollisionProfile,
  ): PlayfieldStepResult {
    const mazeStep = this.mazeGrid.evaluateArcadePixelStep(
      arcadePixelPos,
      direction,
      collisionProfile.staticCollisionLead,
      arcadePixelToLogicalCell,
    );

    if (!mazeStep.allowed) {
      return blockedByFixedWall(mazeStep);
    }

    const directGateBlock = this.tryGetBlockingGateIdAtProbe(
      arcadePixelPos,
      direction,
      collisionProfile.gateContactLead,
    );

    if (directGateBlock !== undefined) {
      return blockedByGate(mazeStep, directGateBlock.gateId, directGateBlock.contactHalf);
    }

    const gateContactStep = this.mazeGrid.evaluateArcadePixelStep(
      arcadePixelPos,
      direction,
      collisionProfile.gateContactLead,
      arcadePixelToLogicalCell,
    );

    if (equals(gateContactStep.nextCell, gateContactStep.currentCell)) {
      return allowedStep(mazeStep);
    }

    const boundaryGateBlock = this.tryGetBlockingGateIdForCellBoundaryStep(gateContactStep, direction);
    if (boundaryGateBlock !== undefined) {
      return blockedByGate(mazeStep, boundaryGateBlock.gateId, boundaryGateBlock.contactHalf);
    }

    return allowedStep(mazeStep);
  }

  private tryGetBlockingGateIdAtProbe(
    arcadePixelPos: Vector2i,
    direction: Vector2i,
    collisionLead: Vector2i,
  ): GateBlock | undefined {
    if (equals(direction, VEC2.zero)) {
      return undefined;
    }

    const currentCell = arcadePixelToLogicalCell(arcadePixelPos);
    const probeStart = add(arcadePixelPos, collisionLead);
    const probeEnd = add(add(arcadePixelPos, direction), collisionLead);
    const candidatePivots = [
      currentCell,
      vec2(currentCell.x + 1, currentCell.y),
      vec2(currentCell.x, currentCell.y + 1),
      vec2(currentCell.x + 1, currentCell.y + 1),
    ];

    for (const pivot of candidatePivots) {
      const gate = this.gateSystem.getGateByPivot(pivot);

      if (gate === undefined || !gate.blocksMovement(direction)) {
        continue;
      }

      const contactHalf = tryGetGateBlockAtProbe(gate, probeStart, probeEnd, direction);
      if (contactHalf !== false) {
        return { gateId: gate.id, contactHalf };
      }
    }

    return undefined;
  }

  private tryGetBlockingGateIdForCellBoundaryStep(
    mazeStep: MazeStepResult,
    direction: Vector2i,
  ): GateBlock | undefined {
    if (equals(direction, VEC2.zero) || equals(mazeStep.nextCell, mazeStep.currentCell)) {
      return undefined;
    }

    if (direction.x !== 0) {
      return this.tryGetBlockingGateIdAcrossVerticalBoundary(mazeStep.currentCell, mazeStep.nextCell, direction);
    }

    if (direction.y !== 0) {
      return this.tryGetBlockingGateIdAcrossHorizontalBoundary(mazeStep.currentCell, mazeStep.nextCell, direction);
    }

    return undefined;
  }

  private tryGetBlockingGateIdAcrossVerticalBoundary(
    currentCell: Vector2i,
    nextCell: Vector2i,
    direction: Vector2i,
  ): GateBlock | undefined {
    const boundaryX = Math.max(currentCell.x, nextCell.x);

    return this.tryGetBlockingGateAtPivot(direction, vec2(boundaryX, currentCell.y), GATE_CONTACT_HALF.bottom)
      ?? this.tryGetBlockingGateAtPivot(direction, vec2(boundaryX, currentCell.y + 1), GATE_CONTACT_HALF.top);
  }

  private tryGetBlockingGateIdAcrossHorizontalBoundary(
    currentCell: Vector2i,
    nextCell: Vector2i,
    direction: Vector2i,
  ): GateBlock | undefined {
    const boundaryY = Math.max(currentCell.y, nextCell.y);

    return this.tryGetBlockingGateAtPivot(direction, vec2(currentCell.x, boundaryY), GATE_CONTACT_HALF.right)
      ?? this.tryGetBlockingGateAtPivot(direction, vec2(currentCell.x + 1, boundaryY), GATE_CONTACT_HALF.left);
  }

  private tryGetBlockingGateAtPivot(
    direction: Vector2i,
    pivot: Vector2i,
    contactHalf: GateContactHalf,
  ): GateBlock | undefined {
    const gate = this.gateSystem.getGateByPivot(pivot);

    if (gate !== undefined && gate.blocksMovement(direction)) {
      return { gateId: gate.id, contactHalf };
    }

    return undefined;
  }
}

interface GateBlock {
  readonly gateId: number;
  readonly contactHalf?: GateContactHalf;
}

function tryGetGateBlockAtProbe(
  gate: RotatingGateRuntimeState,
  probeStart: Vector2i,
  probeEnd: Vector2i,
  direction: Vector2i,
): GateContactHalf | undefined | false {
  const pivotArcade = gatePivotToArcadePixel(gate.pivot);

  if (gate.logicalState === 'blocks-vertical') {
    if (direction.y === 0 || !crossesCoordinate(probeStart.y, probeEnd.y, pivotArcade.y)) {
      return false;
    }

    const localX = probeEnd.x - pivotArcade.x;
    if (Math.abs(localX) > 8) {
      return false;
    }

    if (localX < 0) {
      return GATE_CONTACT_HALF.left;
    }

    if (localX > 0) {
      return GATE_CONTACT_HALF.right;
    }

    return undefined;
  }

  if (direction.x === 0 || !crossesCoordinate(probeStart.x, probeEnd.x, pivotArcade.x)) {
    return false;
  }

  const localY = probeEnd.y - pivotArcade.y;
  if (Math.abs(localY) > 8) {
    return false;
  }

  if (localY < 0) {
    return GATE_CONTACT_HALF.top;
  }

  if (localY > 0) {
    return GATE_CONTACT_HALF.bottom;
  }

  return undefined;
}

function crossesCoordinate(start: number, end: number, target: number): boolean {
  return (start <= target && end >= target) || (start >= target && end <= target);
}

function allowedStep(mazeStep: MazeStepResult): PlayfieldStepResult {
  return { kind: PLAYFIELD_STEP_KIND.allowed, mazeStep, allowed: true };
}

function blockedByFixedWall(mazeStep: MazeStepResult): PlayfieldStepResult {
  return { kind: PLAYFIELD_STEP_KIND.blockedByFixedWall, mazeStep, allowed: false };
}

function blockedByGate(
  mazeStep: MazeStepResult,
  gateId: number,
  contactHalf: GateContactHalf | undefined,
): PlayfieldStepResult {
  return { kind: PLAYFIELD_STEP_KIND.blockedByGate, mazeStep, gateId, contactHalf, allowed: false };
}
