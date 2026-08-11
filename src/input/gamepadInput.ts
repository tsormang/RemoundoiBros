import type { InputState } from '../game/types';

export type GamepadStatus = 'unsupported' | 'disconnected' | 'connected';

const STICK_DEADZONE = 0.2;
const DPAD_UP = 12;
const DPAD_DOWN = 13;
const DPAD_LEFT = 14;
const DPAD_RIGHT = 15;

export class GamepadInput {
  private padIndex: number | null = null;

  constructor() {
    window.addEventListener('gamepadconnected', this.handleConnected);
    window.addEventListener('gamepaddisconnected', this.handleDisconnected);
    this.refreshFromApi();
  }

  /**
   * Call from a user gesture. Some browsers (notably Safari/iPadOS) only
   * expose pads after a press; getGamepads() inside that gesture wakes them.
   */
  enable(): GamepadStatus {
    this.refreshFromApi();
    return this.getStatus();
  }

  getStatus(): GamepadStatus {
    if (!supportsGamepadApi()) {
      return 'unsupported';
    }

    this.refreshFromApi();
    return this.padIndex !== null ? 'connected' : 'disconnected';
  }

  getState(): InputState {
    const pad = this.getActivePad();
    if (!pad) {
      return { move: { x: 0, y: 0 } };
    }

    const stickX = applyDeadzone(pad.axes[0] ?? 0);
    const stickY = applyDeadzone(pad.axes[1] ?? 0);

    const dpadX =
      Number(isPressed(pad, DPAD_RIGHT)) - Number(isPressed(pad, DPAD_LEFT));
    const dpadY =
      Number(isPressed(pad, DPAD_DOWN)) - Number(isPressed(pad, DPAD_UP));

    // Prefer stick when active; otherwise fall back to D-pad.
    if (stickX !== 0 || stickY !== 0) {
      return { move: { x: stickX, y: stickY } };
    }

    return { move: { x: dpadX, y: dpadY } };
  }

  destroy(): void {
    window.removeEventListener('gamepadconnected', this.handleConnected);
    window.removeEventListener('gamepaddisconnected', this.handleDisconnected);
    this.padIndex = null;
  }

  private getActivePad(): Gamepad | null {
    if (!supportsGamepadApi()) {
      return null;
    }

    const pads = navigator.getGamepads();

    if (this.padIndex !== null) {
      const preferred = pads[this.padIndex];
      if (preferred?.connected) {
        return preferred;
      }
      this.padIndex = null;
    }

    for (const pad of pads) {
      if (pad?.connected) {
        this.padIndex = pad.index;
        return pad;
      }
    }

    return null;
  }

  private refreshFromApi(): void {
    if (!supportsGamepadApi()) {
      this.padIndex = null;
      return;
    }

    const pads = navigator.getGamepads();
    if (this.padIndex !== null) {
      const preferred = pads[this.padIndex];
      if (preferred?.connected) {
        return;
      }
      this.padIndex = null;
    }

    for (const pad of pads) {
      if (pad?.connected) {
        this.padIndex = pad.index;
        return;
      }
    }
  }

  private readonly handleConnected = (event: GamepadEvent): void => {
    if (this.padIndex === null) {
      this.padIndex = event.gamepad.index;
    }
  };

  private readonly handleDisconnected = (event: GamepadEvent): void => {
    if (this.padIndex === event.gamepad.index) {
      this.padIndex = null;
      this.refreshFromApi();
    }
  };
}

function supportsGamepadApi(): boolean {
  return typeof navigator !== 'undefined' && 'getGamepads' in navigator;
}

function applyDeadzone(value: number): number {
  return Math.abs(value) < STICK_DEADZONE ? 0 : value;
}

function isPressed(pad: Gamepad, buttonIndex: number): boolean {
  return Boolean(pad.buttons[buttonIndex]?.pressed);
}
