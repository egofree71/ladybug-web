/**
 * Small integer-vector helpers used by the gameplay simulation.
 *
 * Phaser positions are floating-point screen pixels, but the Lady Bug movement
 * motor mirrors the Godot remake: gameplay decisions are made in integer arcade
 * pixels. Keeping those helpers tiny avoids pulling Phaser math objects into the
 * deterministic movement code.
 */
export interface Vector2i {
  readonly x: number;
  readonly y: number;
}

export const VEC2: {
  readonly zero: Vector2i;
  readonly left: Vector2i;
  readonly right: Vector2i;
  readonly up: Vector2i;
  readonly down: Vector2i;
} = {
  zero: { x: 0, y: 0 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

export function vec2(x: number, y: number): Vector2i {
  return { x, y };
}

export function add(a: Vector2i, b: Vector2i): Vector2i {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function equals(a: Vector2i, b: Vector2i): boolean {
  return a.x === b.x && a.y === b.y;
}

export function isZero(v: Vector2i): boolean {
  return v.x === 0 && v.y === 0;
}

export function isHorizontal(v: Vector2i): boolean {
  return v.x !== 0 && v.y === 0;
}

export function isVertical(v: Vector2i): boolean {
  return v.y !== 0 && v.x === 0;
}

export function isSameAxis(a: Vector2i, b: Vector2i): boolean {
  return (isHorizontal(a) && isHorizontal(b)) || (isVertical(a) && isVertical(b));
}

export function keyOf(v: Vector2i): string {
  return `${v.x},${v.y}`;
}

export function clone(v: Vector2i): Vector2i {
  return { x: v.x, y: v.y };
}
