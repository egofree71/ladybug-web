import { LEVEL_SCENE_OFFSET } from './screenLayout';

/**
 * Authored rotating gate positions copied from the Godot Level.tscn scene.
 *
 * Godot stores each gate as a Node2D position under the shifted Level scene. The
 * AnimatedSprite2D child then adds its own local visual offset of (20, 28). The
 * Phaser shell draws the sprite directly at its visual center, so both offsets
 * are applied here once for the static rendering pass.
 */
export type GateOrientation = 'horizontal' | 'vertical';

export interface GateDefinition {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly orientation: GateOrientation;
}

const GATE_SPRITE_OFFSET = {
  x: 20,
  y: 28,
} as const;

function gate(id: number, x: number, y: number, orientation: GateOrientation = 'horizontal'): GateDefinition {
  return {
    id,
    x: x + LEVEL_SCENE_OFFSET.x + GATE_SPRITE_OFFSET.x,
    y: y + LEVEL_SCENE_OFFSET.y + GATE_SPRITE_OFFSET.y,
    orientation,
  };
}

export const GATE_DEFINITIONS: readonly GateDefinition[] = [
  gate(0, 128, 104),
  gate(1, 576, 104),
  gate(2, 256, 168),
  gate(3, 448, 168),
  gate(4, 64, 232, 'vertical'),
  gate(5, 192, 232),
  gate(6, 512, 232),
  gate(7, 640, 232, 'vertical'),
  gate(8, 256, 296),
  gate(9, 448, 296),
  gate(10, 192, 424, 'vertical'),
  gate(11, 512, 424, 'vertical'),
  gate(12, 128, 488, 'vertical'),
  gate(13, 256, 488, 'vertical'),
  gate(14, 448, 488, 'vertical'),
  gate(15, 576, 488, 'vertical'),
  gate(16, 256, 616),
  gate(17, 448, 616),
  gate(18, 128, 680),
  gate(19, 576, 680),
] as const;
