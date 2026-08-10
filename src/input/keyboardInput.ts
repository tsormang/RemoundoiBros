import type { InputState } from '../game/types';

export class KeyboardInput {
  private readonly pressed = new Set<string>();

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.reset);
  }

  getState(): InputState {
    const left = this.has('ArrowLeft') || this.has('KeyA');
    const right = this.has('ArrowRight') || this.has('KeyD');
    const up = this.has('ArrowUp') || this.has('KeyW');
    const down = this.has('ArrowDown') || this.has('KeyS');

    return {
      move: {
        x: Number(right) - Number(left),
        y: Number(down) - Number(up),
      },
    };
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.reset);
  }

  private has(code: string): boolean {
    return this.pressed.has(code);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.pressed.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
  };

  private readonly reset = (): void => {
    this.pressed.clear();
  };
}
