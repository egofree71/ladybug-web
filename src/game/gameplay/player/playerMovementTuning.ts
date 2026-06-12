/**
 * Player movement tuning constants ported from Godot. These values are
 * intentionally centralized because small changes strongly affect arcade feel.
 */
import { type PlayfieldCollisionProfile } from '../playfield/playfieldCollision';
import { type Vector2i, VEC2, equals, vec2 } from '../math/vector2';

const COLLISION_LEAD = {
  left: 8,
  right: 7,
  up: 8,
  down: 7,
} as const;

const GATE_CONTACT_LEAD = 6;

/** Calibration values ported from PlayerMovementTuning.cs. */
export const PLAYER_MOVEMENT_TUNING = {
  horizontalRailSnapTolerance: 1,
  verticalRailSnapTolerance: 1,
  spriteRenderOffsetLeftArcade: vec2(5, 8),
  // Keep the right-facing sprite aligned with the vertical/left offsets.
  // The collision probe still stops at the safe Godot value; this is only visual.
  spriteRenderOffsetRightArcade: vec2(5, 8),
  spriteRenderOffsetVerticalArcade: vec2(5, 8),
} as const;

export function getStaticCollisionLead(direction: Vector2i): Vector2i {
  if (equals(direction, VEC2.left)) {
    return vec2(-COLLISION_LEAD.left, 0);
  }

  if (equals(direction, VEC2.right)) {
    return vec2(COLLISION_LEAD.right, 0);
  }

  if (equals(direction, VEC2.up)) {
    return vec2(0, -COLLISION_LEAD.up);
  }

  if (equals(direction, VEC2.down)) {
    return vec2(0, COLLISION_LEAD.down);
  }

  return VEC2.zero;
}

export function getGateContactLead(direction: Vector2i): Vector2i {
  if (equals(direction, VEC2.left)) {
    return vec2(-GATE_CONTACT_LEAD, 0);
  }

  if (equals(direction, VEC2.right)) {
    return vec2(GATE_CONTACT_LEAD, 0);
  }

  if (equals(direction, VEC2.up)) {
    return vec2(0, -GATE_CONTACT_LEAD);
  }

  if (equals(direction, VEC2.down)) {
    return vec2(0, GATE_CONTACT_LEAD);
  }

  return VEC2.zero;
}

export function getPlayerCollisionProfile(direction: Vector2i): PlayfieldCollisionProfile {
  return {
    staticCollisionLead: getStaticCollisionLead(direction),
    gateContactLead: getGateContactLead(direction),
  };
}

export function getSpriteRenderOffsetArcade(direction: Vector2i): Vector2i {
  if (equals(direction, VEC2.left)) {
    return PLAYER_MOVEMENT_TUNING.spriteRenderOffsetLeftArcade;
  }

  if (equals(direction, VEC2.right)) {
    return PLAYER_MOVEMENT_TUNING.spriteRenderOffsetRightArcade;
  }

  return PLAYER_MOVEMENT_TUNING.spriteRenderOffsetVerticalArcade;
}
