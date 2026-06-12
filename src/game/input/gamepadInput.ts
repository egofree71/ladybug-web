import Phaser from 'phaser';

export type GamepadDirectionName = 'left' | 'right' | 'up' | 'down';

export type GamepadDirectionState = Readonly<Record<GamepadDirectionName, boolean>>;

const EMPTY_DIRECTION_STATE: GamepadDirectionState = {
  left: false,
  right: false,
  up: false,
  down: false,
};

const LEFT_STICK_DEADZONE = 0.45;
const STANDARD_A_BUTTON_INDEX = 0;
const STANDARD_START_BUTTON_INDEX = 9;

/**
 * Small browser-gamepad adapter used by both the title screen and gameplay.
 *
 * Phaser exposes the active browser Gamepad API devices through a Scene plugin.
 * This helper keeps the browser/Phaser details out of the movement motor: the
 * player system still receives only a simple arcade direction intention.
 */
export function getPrimaryGamepad(scene: Phaser.Scene): Phaser.Input.Gamepad.Gamepad | undefined {
  const gamepadPlugin = scene.input.gamepad;

  if (!gamepadPlugin?.enabled) {
    return undefined;
  }

  for (const pad of gamepadPlugin.getAll()) {
    if (pad?.connected) {
      return pad;
    }
  }

  return undefined;
}

/** Returns true once the browser has exposed at least one connected gamepad. */
export function hasConnectedGamepad(scene: Phaser.Scene): boolean {
  return getPrimaryGamepad(scene) !== undefined;
}

/**
 * Reads a digital arcade direction from the first connected gamepad.
 *
 * The D-pad wins over the analog stick because Lady Bug needs crisp cardinal
 * input. The stick remains supported as a convenience, with a deadzone and a
 * dominant-axis rule so diagonal drift does not produce noisy turns.
 */
export function readGamepadDirectionState(scene: Phaser.Scene): GamepadDirectionState {
  const pad = getPrimaryGamepad(scene);

  if (!pad) {
    return EMPTY_DIRECTION_STATE;
  }

  const dpadState = {
    left: pad.left,
    right: pad.right,
    up: pad.up,
    down: pad.down,
  } satisfies GamepadDirectionState;

  if (Object.values(dpadState).some(Boolean)) {
    return dpadState;
  }

  return readLeftStickDirectionState(pad);
}

/** Returns true when the gamepad should start the title screen flow. */
export function isGamepadStartPressed(scene: Phaser.Scene): boolean {
  const pad = getPrimaryGamepad(scene);

  if (!pad) {
    return false;
  }

  return pad.A || pad.isButtonDown(STANDARD_A_BUTTON_INDEX) || pad.isButtonDown(STANDARD_START_BUTTON_INDEX);
}

function readLeftStickDirectionState(pad: Phaser.Input.Gamepad.Gamepad): GamepadDirectionState {
  const x = pad.leftStick?.x ?? 0;
  const y = pad.leftStick?.y ?? 0;
  const absX = Math.abs(x);
  const absY = Math.abs(y);

  if (absX < LEFT_STICK_DEADZONE && absY < LEFT_STICK_DEADZONE) {
    return EMPTY_DIRECTION_STATE;
  }

  if (absX >= absY) {
    return {
      ...EMPTY_DIRECTION_STATE,
      left: x < 0,
      right: x > 0,
    };
  }

  return {
    ...EMPTY_DIRECTION_STATE,
    up: y < 0,
    down: y > 0,
  };
}
