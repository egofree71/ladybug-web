/**
 * Authoritative rotating-gate placement copied from the Godot level. The same
 * definitions feed both rendering and runtime collision state.
 */
import { LEVEL_SCENE_OFFSET } from './screenLayout';
import type { GateRuntimeDefinition } from '../gameplay/gates/gateTypes';

/**
 * Authored rotating gate positions copied from the Godot Level.tscn scene.
 *
 * Godot stores each gate as a Node2D position under the shifted Level scene. The
 * AnimatedSprite2D child then adds its own local visual offset of (20, 28). The
 * Phaser shell draws the sprite directly at its visual center, so both offsets
 * are applied here once for the static rendering pass.
 */
export type GateOrientation = 'horizontal' | 'vertical';

export interface GateDefinition extends GateRuntimeDefinition {
  readonly x: number;
  readonly y: number;
}

const GATE_SPRITE_OFFSET = {
  x: 20,
  y: 28,
} as const;

function gate(
  id: number,
  x: number,
  y: number,
  pivotX: number,
  pivotY: number,
  orientation: GateOrientation = 'horizontal',
): GateDefinition {
  return {
    id,
    x: x + LEVEL_SCENE_OFFSET.x + GATE_SPRITE_OFFSET.x,
    y: y + LEVEL_SCENE_OFFSET.y + GATE_SPRITE_OFFSET.y,
    pivot: { x: pivotX, y: pivotY },
    orientation,
  };
}

export const GATE_DEFINITIONS: readonly GateDefinition[] = [
  gate(0, 128, 104, 2, 1),
  gate(1, 576, 104, 9, 1),
  gate(2, 256, 168, 4, 2),
  gate(3, 448, 168, 7, 2),
  gate(4, 64, 232, 1, 3, 'vertical'),
  gate(5, 192, 232, 3, 3),
  gate(6, 512, 232, 8, 3),
  gate(7, 640, 232, 10, 3, 'vertical'),
  gate(8, 256, 296, 4, 4),
  gate(9, 448, 296, 7, 4),
  gate(10, 192, 424, 3, 6, 'vertical'),
  gate(11, 512, 424, 8, 6, 'vertical'),
  gate(12, 128, 488, 2, 7, 'vertical'),
  gate(13, 256, 488, 4, 7, 'vertical'),
  gate(14, 448, 488, 7, 7, 'vertical'),
  gate(15, 576, 488, 9, 7, 'vertical'),
  gate(16, 256, 616, 4, 9),
  gate(17, 448, 616, 7, 9),
  gate(18, 128, 680, 2, 10),
  gate(19, 576, 680, 9, 10),
] as const;
