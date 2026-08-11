const ASSET_BASE = '/assets/ui/start_screen_parallax';

/** Back → front. Factors match `parallax_manifest.json`. */
const PARALLAX_LAYERS = [
  { file: 'layer_4_sky_background.png', factor: 0.1, name: 'sky' },
  { file: 'layer_3_buildings.png', factor: 0.35, name: 'buildings' },
  { file: 'layer_2_playground.png', factor: 0.65, name: 'playground' },
  { file: 'layer_1_characters.png', factor: 1.0, name: 'characters' },
] as const;

const MAX_OFFSET_PX = 36;
const SMOOTHING = 0.12;
const ORIENTATION_SCALE = 1.35;
/** Slightly larger than fit so moving layers don't reveal empty edges. */
const LAYER_SCALE = 1.12;

type DeviceOrientationPermission = {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
};

export type SplashHandle = {
  destroy: () => void;
};

export function mountSplashScreen(
  container: HTMLElement,
  onContinue: () => void,
): SplashHandle {
  container.innerHTML = renderSplashMarkup();
  container.classList.add('overlay--splash');

  const root = container.querySelector<HTMLElement>('[data-splash]');
  const layers = [
    ...container.querySelectorAll<HTMLElement>('[data-parallax-layer]'),
  ];

  if (!root) {
    throw new Error('Splash screen failed to mount.');
  }

  let destroyed = false;
  let rafId = 0;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let usingOrientation = false;
  let continued = false;
  let orientationRequested = false;

  const setTargetFromNormalized = (nx: number, ny: number): void => {
    targetX = clamp(nx, -1, 1);
    targetY = clamp(ny, -1, 1);
  };

  const applyLayers = (): void => {
    for (const layer of layers) {
      const factor = Number(layer.dataset.parallaxFactor) || 0;
      const x = currentX * MAX_OFFSET_PX * factor;
      const y = currentY * MAX_OFFSET_PX * factor;
      layer.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${LAYER_SCALE})`;
    }
  };

  const tick = (): void => {
    if (destroyed) {
      return;
    }

    currentX += (targetX - currentX) * SMOOTHING;
    currentY += (targetY - currentY) * SMOOTHING;
    applyLayers();
    rafId = requestAnimationFrame(tick);
  };

  const onPointerMove = (event: PointerEvent): void => {
    // Prefer tilt when available; still allow mouse parallax on desktop.
    if (usingOrientation && event.pointerType !== 'mouse') {
      return;
    }

    const rect = root.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    setTargetFromNormalized(nx, ny);
  };

  const onDeviceOrientation = (event: DeviceOrientationEvent): void => {
    if (event.gamma == null || event.beta == null) {
      return;
    }

    usingOrientation = true;
    // gamma: left/right (-90..90), beta: front/back (~-180..180)
    const nx = clamp(event.gamma / 30, -1, 1) * ORIENTATION_SCALE;
    const ny = clamp((event.beta - 45) / 30, -1, 1) * ORIENTATION_SCALE;
    setTargetFromNormalized(nx, ny);
  };

  const enableOrientation = async (): Promise<void> => {
    if (orientationRequested) {
      return;
    }

    orientationRequested = true;
    const Orientation = DeviceOrientationEvent as unknown as DeviceOrientationPermission;

    if (typeof Orientation.requestPermission === 'function') {
      try {
        const result = await Orientation.requestPermission();
        if (result !== 'granted') {
          return;
        }
      } catch {
        return;
      }
    }

    window.addEventListener('deviceorientation', onDeviceOrientation);
  };

  const continueToSelect = (): void => {
    if (continued || destroyed) {
      return;
    }

    continued = true;
    destroy();
    onContinue();
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      continueToSelect();
    }
  };

  const onPointerDown = (): void => {
    // iOS requires a user gesture for motion permission; request without blocking continue.
    void enableOrientation();
  };

  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('click', continueToSelect);
  window.addEventListener('keydown', onKeyDown);

  if (
    typeof (DeviceOrientationEvent as unknown as DeviceOrientationPermission)
      .requestPermission !== 'function'
  ) {
    void enableOrientation();
  }

  rafId = requestAnimationFrame(tick);
  root.focus({ preventScroll: true });

  const destroy = (): void => {
    if (destroyed) {
      return;
    }

    destroyed = true;
    cancelAnimationFrame(rafId);
    root.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerdown', onPointerDown);
    root.removeEventListener('click', continueToSelect);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('deviceorientation', onDeviceOrientation);
    container.classList.remove('overlay--splash');
  };

  return { destroy };
}

function renderSplashMarkup(): string {
  const layersHtml = PARALLAX_LAYERS.map(
    (layer) => `
      <div
        class="splash__layer"
        data-parallax-layer
        data-parallax-factor="${layer.factor}"
        data-layer="${layer.name}"
        style="background-image: url('${ASSET_BASE}/${layer.file}')"
        aria-hidden="true"
      ></div>
    `,
  ).join('');

  return `
    <section
      class="splash"
      data-splash
      role="dialog"
      aria-modal="true"
      aria-label="Remoundoi Bros"
      tabindex="0"
    >
      <div class="splash__scene" aria-hidden="true">
        ${layersHtml}
      </div>
      <div class="splash__ui" aria-hidden="true">
        <h1 class="splash__title">
          <span class="splash__title-line splash__title-line--remoundoi">Remoundoi</span>
          <span class="splash__title-line splash__title-line--bros">Bros</span>
        </h1>
        <p class="splash__prompt">Click to start</p>
      </div>
      <p class="splash__sr-hint">Πάτα ή κάνε κλικ για να συνεχίσεις στην επιλογή ήρωα.</p>
    </section>
  `;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
