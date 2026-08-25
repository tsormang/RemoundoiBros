import type { StageDefinition } from '../game/stages';

export type LoadingScreenHandle = {
  setProgress: (loaded: number, total: number) => void;
  destroy: () => void;
};

export function mountLoadingScreen(
  container: HTMLElement,
  stage: StageDefinition,
): LoadingScreenHandle {
  container.innerHTML = renderLoadingMarkup(stage);
  container.classList.remove('overlay--splash');

  const progressBar = container.querySelector<HTMLElement>('[data-loading-bar]');
  const progressLabel = container.querySelector<HTMLElement>('[data-loading-label]');

  const setProgress = (loaded: number, total: number): void => {
    const percent = total > 0 ? Math.round((loaded / total) * 100) : 100;

    if (progressBar) {
      progressBar.style.width = `${percent}%`;
    }

    if (progressLabel) {
      progressLabel.textContent =
        total > 0 ? `Φόρτωση... ${loaded}/${total}` : 'Φόρτωση...';
    }
  };

  return {
    setProgress,
    destroy: () => {
      container.classList.remove('overlay--loading');
    },
  };
}

function renderLoadingMarkup(stage: StageDefinition): string {
  return `
    <section class="dialog loading-screen" aria-modal="true" aria-busy="true">
      <div
        class="loading-screen__thumb"
        style="background:${stage.thumbnailFallbackColor}"
      >
        <img src="${stage.thumbnailSrc}" alt="" />
      </div>
      <h2 class="loading-screen__title">${stage.title}</h2>
      <p class="loading-screen__status" data-loading-label>Φόρτωση...</p>
      <div class="loading-screen__progress" aria-hidden="true">
        <div class="loading-screen__progress-bar" data-loading-bar></div>
      </div>
    </section>
  `;
}
