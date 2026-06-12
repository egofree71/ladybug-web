/**
 * Keyboard and gamepad direction state for the player. It keeps last-pressed-
 * wins behavior separate from the movement motor itself.
 */
import Phaser from 'phaser';
import { readGamepadDirectionState, type GamepadDirectionName } from '../../input/gamepadInput';
import { type Vector2i, VEC2 } from '../math/vector2';

type DirectionName = GamepadDirectionName;

interface DirectionSlot {
  readonly direction: Vector2i;
  keyboardPressed: boolean;
  gamepadPressed: boolean;
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
 * Keyboard and gamepad input buffer for the player.
 *
 * The current rule mirrors Godot's PlayerInputState: when several directions are
 * held, the most recently pressed held direction wins. No movement is performed
 * from input events directly; the movement motor reads this state only during
 * fixed simulation ticks.
 */
export class PlayerInputState {
  private sequence = 0;

  private readonly scene: Phaser.Scene;

  private readonly slots: Record<DirectionName, DirectionSlot> = {
    left: { direction: VEC2.left, keyboardPressed: false, gamepadPressed: false, order: 0 },
    right: { direction: VEC2.right, keyboardPressed: false, gamepadPressed: false, order: 0 },
    up: { direction: VEC2.up, keyboardPressed: false, gamepadPressed: false, order: 0 },
    down: { direction: VEC2.down, keyboardPressed: false, gamepadPressed: false, order: 0 },
  };

  public constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => this.handleKeyDown(event));
    scene.input.keyboard?.on('keyup', (event: KeyboardEvent) => this.handleKeyUp(event));
  }

  public readPressedDirection(): Vector2i {
    this.pollGamepadDirections();

    let newestSlot: DirectionSlot | undefined;

    for (const slot of Object.values(this.slots)) {
      if (!isSlotPressed(slot)) {
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
    this.markKeyboardPressed(slot);
    event.preventDefault();
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const directionName = KEY_TO_DIRECTION[event.code];
    if (directionName === undefined) {
      return;
    }

    this.slots[directionName].keyboardPressed = false;
    event.preventDefault();
  }

  private pollGamepadDirections(): void {
    const gamepadState = readGamepadDirectionState(this.scene);

    for (const directionName of Object.keys(this.slots) as DirectionName[]) {
      this.applyGamepadDirectionState(this.slots[directionName], gamepadState[directionName]);
    }
  }

  private markKeyboardPressed(slot: DirectionSlot): void {
    if (!isSlotPressed(slot)) {
      slot.order = ++this.sequence;
    }

    slot.keyboardPressed = true;
  }

  private applyGamepadDirectionState(slot: DirectionSlot, pressed: boolean): void {
    if (!isSlotPressed(slot) && pressed) {
      slot.order = ++this.sequence;
    }

    slot.gamepadPressed = pressed;
  }
}

function isSlotPressed(slot: DirectionSlot): boolean {
  return slot.keyboardPressed || slot.gamepadPressed;
}
