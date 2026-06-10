import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import { GATE_DEFINITIONS, type GateOrientation } from '../layout/gateLayout';

const GATE_FRAME_BY_ORIENTATION: Record<GateOrientation, number> = {
  horizontal: 0,
  vertical: 1,
};

/**
 * Renders the initial stable state of the 20 rotating gates.
 *
 * This is deliberately only a view for now. Later branches can reuse the same
 * definitions and connect them to a real gate state machine and collision rules.
 */
export function createRotatingGates(scene: Phaser.Scene): void {
  for (const gate of GATE_DEFINITIONS) {
    scene.add
      .sprite(gate.x, gate.y, ASSET_KEYS.rotatingGate, GATE_FRAME_BY_ORIENTATION[gate.orientation])
      .setOrigin(0.5, 0.5)
      .setDepth(20);
  }
}
