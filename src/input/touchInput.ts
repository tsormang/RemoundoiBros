import { normalize } from '../game/math';
import type { InputState, Vec2 } from '../game/types';

export class TouchInput {
  private readonly root: HTMLElement;
  private readonly nub: HTMLElement;
  private activePointerId: number | null = null;
  private origin: Vec2 = { x: 0, y: 0 };
  private move: Vec2 = { x: 0, y: 0 };
  private rotationDegrees = 0;

  constructor(root: HTMLElement, nub: HTMLElement) {
    this.root = root;
    this.nub = nub;
    this.root.addEventListener('pointerdown', this.handlePointerDown);
    this.root.addEventListener('pointermove', this.handlePointerMove);
    this.root.addEventListener('pointerup', this.handlePointerUp);
    this.root.addEventListener('pointercancel', this.handlePointerUp);
  }

  setRotation(degrees: number): void {
    this.rotationDegrees = ((degrees % 360) + 360) % 360;
  }

  getState(): InputState {
    return {
      move: this.move,
    };
  }

  destroy(): void {
    this.root.removeEventListener('pointerdown', this.handlePointerDown);
    this.root.removeEventListener('pointermove', this.handlePointerMove);
    this.root.removeEventListener('pointerup', this.handlePointerUp);
    this.root.removeEventListener('pointercancel', this.handlePointerUp);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    // Mouse clicks must reach overlay buttons; only touch drives the stick.
    if (event.pointerType !== 'touch' || this.activePointerId !== null) {
      return;
    }

    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('button, a, input, textarea, select, [data-overlay]')
    ) {
      return;
    }

    this.activePointerId = event.pointerId;
    this.origin = { x: event.clientX, y: event.clientY };
    this.root.setPointerCapture(event.pointerId);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    const raw = this.toStageDelta({
      x: event.clientX - this.origin.x,
      y: event.clientY - this.origin.y,
    });
    const distance = Math.min(Math.hypot(raw.x, raw.y), 38);
    this.move = normalize(raw);
    this.nub.style.transform = `translate(${this.move.x * distance}px, ${
      this.move.y * distance
    }px)`;
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) {
      return;
    }

    this.activePointerId = null;
    this.move = { x: 0, y: 0 };
    this.nub.style.transform = 'translate(0, 0)';
  };

  private toStageDelta(delta: Vec2): Vec2 {
    // CSS rotate(90deg) maps screen right→stage down and screen down→stage left.
    if (this.rotationDegrees === 90) {
      return { x: delta.y, y: -delta.x };
    }

    if (this.rotationDegrees === 270) {
      return { x: -delta.y, y: delta.x };
    }

    return delta;
  }
}
