/**
 * Shared gate type definitions used by layout, runtime state and collision
 * checks.
 */
import type { Vector2i } from '../math/vector2';

/** Stable visual orientation shown by a gate when it is not rotating. */
export const GATE_ORIENTATION = {
  horizontal: 'horizontal',
  vertical: 'vertical',
} as const;

export type GateOrientation = (typeof GATE_ORIENTATION)[keyof typeof GATE_ORIENTATION];

/** Logical blocking axis, named after which movement axis the gate blocks. */
export const GATE_LOGICAL_STATE = {
  blocksHorizontal: 'blocks-horizontal',
  blocksVertical: 'blocks-vertical',
} as const;

export type GateLogicalState = (typeof GATE_LOGICAL_STATE)[keyof typeof GATE_LOGICAL_STATE];

export const GATE_VISUAL_STATE = {
  stable: 'stable',
  turning: 'turning',
} as const;

export type GateVisualState = (typeof GATE_VISUAL_STATE)[keyof typeof GATE_VISUAL_STATE];

export const GATE_TURNING_VISUAL = {
  slash: 'slash',
  backslash: 'backslash',
} as const;

export type GateTurningVisual = (typeof GATE_TURNING_VISUAL)[keyof typeof GATE_TURNING_VISUAL];

export const GATE_CONTACT_HALF = {
  left: 'left',
  right: 'right',
  top: 'top',
  bottom: 'bottom',
} as const;

export type GateContactHalf = (typeof GATE_CONTACT_HALF)[keyof typeof GATE_CONTACT_HALF];

export interface GateRuntimeDefinition {
  readonly id: number;
  readonly pivot: Vector2i;
  readonly orientation: GateOrientation;
}
