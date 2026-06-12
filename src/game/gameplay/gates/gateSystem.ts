/**
 * Runtime model for the rotating gates. It tracks logical blocking axes and
 * accepted pushes, while gateView.ts only reflects that state visually.
 */
import { keyOf, type Vector2i } from '../math/vector2';
import type { GateContactHalf, GateRuntimeDefinition } from './gateTypes';
import { RotatingGateRuntimeState } from './rotatingGateRuntimeState';

/** Runtime collection and lookup service for the 20 rotating gates. */
export class GateSystem {
  private readonly gatesById = new Map<number, RotatingGateRuntimeState>();
  private readonly gatesByPivot = new Map<string, RotatingGateRuntimeState>();

  public readonly gates: readonly RotatingGateRuntimeState[];

  private pushedGateCountSinceLastConsume = 0;

  public constructor(definitions: readonly GateRuntimeDefinition[]) {
    const gates: RotatingGateRuntimeState[] = [];

    for (const definition of definitions) {
      const gate = new RotatingGateRuntimeState(definition.id, definition.pivot, definition.orientation);
      const pivotKey = keyOf(definition.pivot);

      if (this.gatesById.has(gate.id)) {
        throw new Error(`Duplicate rotating gate id: ${gate.id}`);
      }

      if (this.gatesByPivot.has(pivotKey)) {
        throw new Error(`Duplicate rotating gate pivot: ${pivotKey}`);
      }

      gates.push(gate);
      this.gatesById.set(gate.id, gate);
      this.gatesByPivot.set(pivotKey, gate);
    }

    this.gates = gates;
  }

  public getGateById(id: number): RotatingGateRuntimeState | undefined {
    return this.gatesById.get(id);
  }

  public getGateByPivot(pivot: Vector2i): RotatingGateRuntimeState | undefined {
    return this.gatesByPivot.get(keyOf(pivot));
  }

  public tryPush(gateId: number, moveDir: Vector2i, contactHalf: GateContactHalf): boolean {
    const pushed = this.gatesById.get(gateId)?.tryBeginPush(moveDir, contactHalf) ?? false;

    if (pushed) {
      this.pushedGateCountSinceLastConsume += 1;
    }

    return pushed;
  }

  /** Returns and clears the number of gates pushed since the previous query. */
  public consumePushedGateCount(): number {
    const count = this.pushedGateCountSinceLastConsume;
    this.pushedGateCountSinceLastConsume = 0;
    return count;
  }

  public advanceOneTick(): void {
    for (const gate of this.gates) {
      gate.advanceOneTick();
    }
  }
}
