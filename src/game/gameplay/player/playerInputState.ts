import Phaser from 'phaser';
import { type Vector2i, VEC2 } from '../math/vector2';

type DirectionName = 'left' | 'right' | 'up' | 'down';

interface DirectionSlot {
  readonly direction: Vector2i;
  pressed: boolean;
  order: number;
}

const KEY_TO_DIRECTION: Readonly<Record<string, DirectionName | undefined>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
};

/**
 * Keyboard input buffer for the player.
 *
 * The current rule mirrors Godot's PlayerInputState: when several directions are
 * held, the most recently pressed held direction wins. No movement is performed
 * from input events directly; the movement motor reads this state only during
 * fixed simulation ticks.
 */
export class PlayerInputState {
  private sequence = 0;

  private readonly slots: Record<DirectionName, DirectionSlot> = {
    left: { direction: VEC2.left, pressed: false, order: 0 },
    right: { direction: VEC2.right, pressed: false, order: 0 },
    up: { direction: VEC2.up, pressed: false, order: 0 },
    down: { direction: VEC2.down, pressed: false, order: 0 },
  };

  public constructor(scene: Phaser.Scene) {
    scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => this.handleKeyDown(event));
    scene.input.keyboard?.on('keyup', (event: KeyboardEvent) => this.handleKeyUp(event));
  }

  public readPressedDirection(): Vector2i {
    let newestSlot: DirectionSlot | undefined;

    for (const slot of Object.values(this.slots)) {
      if (!slot.pressed) {
        continue;
      }

      if (newestSlot === undefined || slot.order > newestSlot.order) {
        newestSlot = slot;
      }
    }

    return newestSlot?.direction ?? VEC2.zero;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const directionName = KEY_TO_DIRECTION[event.code];
    if (directionName === undefined) {
      return;
    }

    const slot = this.slots[directionName];
    if (!slot.pressed) {
      slot.order = ++this.sequence;
    }

    slot.pressed = true;
    event.preventDefault();
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const directionName = KEY_TO_DIRECTION[event.code];
    if (directionName === undefined) {
      return;
    }

    this.slots[directionName].pressed = false;
    event.preventDefault();
  }
}
