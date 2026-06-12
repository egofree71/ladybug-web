/**
 * Phaser view for rotating gates. It reflects GateSystem state and keeps the
 * short diagonal turning frame out of gameplay logic.
 */
import Phaser from 'phaser';
import { ASSET_KEYS } from '../assets';
import { GATE_DEFINITIONS, type GateOrientation } from '../layout/gateLayout';
import { GateSystem } from '../gameplay/gates/gateSystem';
import { GATE_TURNING_VISUAL, GATE_VISUAL_STATE } from '../gameplay/gates/gateTypes';
import type { RotatingGateRuntimeState } from '../gameplay/gates/rotatingGateRuntimeState';

const GATE_FRAME_BY_ORIENTATION: Record<GateOrientation, number> = {
  horizontal: 0,
  vertical: 1,
};

const GATE_FRAME = {
  backslash: 2,
  slash: 3,
} as const;

export interface GateFieldView {
  readonly gateSystem: GateSystem;
  syncFromRuntimeState(): void;
  destroy(): void;
}

/** Renders and synchronizes the rotating-gate sprites with their runtime state. */
export function createRotatingGates(scene: Phaser.Scene): GateFieldView {
  const gateSystem = new GateSystem(GATE_DEFINITIONS);
  const spritesByGateId = new Map<number, Phaser.GameObjects.Sprite>();

  for (const gate of GATE_DEFINITIONS) {
    const sprite = scene.add
      .sprite(gate.x, gate.y, ASSET_KEYS.rotatingGate, GATE_FRAME_BY_ORIENTATION[gate.orientation])
      .setOrigin(0.5, 0.5)
      .setDepth(20);

    spritesByGateId.set(gate.id, sprite);
  }

  return {
    gateSystem,
    syncFromRuntimeState(): void {
      for (const gate of gateSystem.gates) {
        spritesByGateId.get(gate.id)?.setFrame(frameForGateState(gate));
      }
    },

    destroy(): void {
      for (const sprite of spritesByGateId.values()) {
        sprite.destroy();
      }

      spritesByGateId.clear();
    },
  };
}

function frameForGateState(gate: RotatingGateRuntimeState): number {
  if (gate.visualState === GATE_VISUAL_STATE.turning) {
    return gate.turningVisual === GATE_TURNING_VISUAL.slash ? GATE_FRAME.slash : GATE_FRAME.backslash;
  }

  return GATE_FRAME_BY_ORIENTATION[gate.getStableOrientation()];
}
