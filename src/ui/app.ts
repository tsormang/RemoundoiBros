import { Game } from '../game/Game';
import { heroes } from '../game/heroes';
import type {
  GameSnapshot,
  HeroDefinition,
  InputState,
  PlayerStats,
} from '../game/types';
import { KeyboardInput } from '../input/keyboardInput';
import { TouchInput } from '../input/touchInput';
import { loadPlayerStats, saveRunSummary } from '../infra/runRepository';
import { formatTime } from './format';

type HudElements = {
  root: HTMLElement;
  avatar: HTMLElement;
  name: HTMLElement;
  hp: HTMLElement;
  hpFill: HTMLElement;
  level: HTMLElement;
  kills: HTMLElement;
  gold: HTMLElement;
  time: HTMLElement;
  xpFill: HTMLElement;
};

type ScreenOrientationMode = 'portrait' | 'landscape';

const ORIENTATION_STORAGE_KEY = 'remoundoi-orientation';

export function createGameApp(root: HTMLElement): void {
  let selectedHero = heroes[0];
  let preferredOrientation = loadPreferredOrientation();
  let game: Game | null = null;
  let animationFrame = 0;
  let lastTime = performance.now();
  let runSaved = false;

  root.innerHTML = renderShell();

  const shell = root.querySelector<HTMLElement>('.game-shell');
  const canvas = root.querySelector<HTMLCanvasElement>('[data-game-canvas]');
  const stage = root.querySelector<HTMLElement>('[data-stage]');
  const overlay = root.querySelector<HTMLElement>('[data-overlay]');
  const touchNub = root.querySelector<HTMLElement>('[data-touch-nub]');
  const hud = getHudElements(root);

  if (!shell || !canvas || !stage || !overlay || !touchNub) {
    throw new Error('Game UI failed to mount.');
  }

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas 2D context is unavailable.');
  }

  const keyboard = new KeyboardInput();
  const touch = new TouchInput(stage, touchNub);

  const applyLayout = (): void => {
    const playing = game !== null;
    const rotated = playing && needsForcedRotation(preferredOrientation);
    shell.classList.toggle('is-rotated', rotated);
    touch.setRotation(rotated ? 90 : 0);
  };

  const resize = (): void => {
    applyLayout();
    const fallback = getPlaySize(preferredOrientation, game !== null);
    const width = Math.max(1, stage.clientWidth || fallback.width);
    const height = Math.max(1, stage.clientHeight || fallback.height);
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(width * scale));
    canvas.height = Math.max(1, Math.floor(height * scale));
    context.setTransform(scale, 0, 0, scale, 0, 0);
    game?.resize(width, height);
  };

  const setHudVisible = (visible: boolean): void => {
    hud.root.hidden = !visible;
  };

  const syncHudHero = (hero: HeroDefinition): void => {
    hud.name.textContent = hero.name;
    hud.avatar.style.background = hero.portraitSrc || hero.portraitSrcSm ? 'transparent' : hero.color;
    hud.avatar.innerHTML = renderAvatarContent(hero, 'sm');
  };

  const startGame = (): void => {
    const size = getPlaySize(preferredOrientation, true);
    game = new Game({
      width: size.width,
      height: size.height,
      hero: selectedHero,
    });
    runSaved = false;
    lastTime = performance.now();
    syncHudHero(selectedHero);
    setHudVisible(true);
    overlay.hidden = true;
    resize();
    void tryLockOrientation(preferredOrientation);
  };

  const returnToMenu = (): void => {
    game = null;
    setHudVisible(false);
    void tryUnlockOrientation();
    showOverlay(null);
    resize();
  };

  const bindHeroSelect = (container: HTMLElement): void => {
    const heroButtons = [
      ...container.querySelectorAll<HTMLButtonElement>('[data-hero]'),
    ];

    for (const button of heroButtons) {
      button.addEventListener('click', () => {
        selectedHero =
          heroes.find((hero) => hero.id === button.dataset.hero) ?? heroes[0];
        updateHeroButtons(heroButtons, selectedHero);
      });
    }
  };

  const bindOrientationSelect = (container: HTMLElement): void => {
    const buttons = [
      ...container.querySelectorAll<HTMLButtonElement>('[data-orientation]'),
    ];

    for (const button of buttons) {
      button.addEventListener('click', () => {
        const next = parseOrientation(button.dataset.orientation);
        if (!next) {
          return;
        }

        preferredOrientation = next;
        savePreferredOrientation(preferredOrientation);
        updateOrientationButtons(buttons, preferredOrientation);
      });
    }
  };

  const showOverlay = (snapshot: GameSnapshot | null): void => {
    overlay.hidden = false;

    if (!snapshot) {
      overlay.innerHTML = renderStartScreen(selectedHero, preferredOrientation);
      bindHeroSelect(overlay);
      bindOrientationSelect(overlay);
      overlay
        .querySelector<HTMLButtonElement>('[data-start]')
        ?.addEventListener('click', startGame);
      overlay
        .querySelector<HTMLButtonElement>('[data-stats]')
        ?.addEventListener('click', () => {
          void showStatsScreen();
        });
      return;
    }

    if (snapshot.pausedForUpgrade) {
      overlay.innerHTML = `
        <section class="dialog" aria-modal="true">
          <h2>Επίπεδο ${snapshot.level}</h2>
          <p>Διάλεξε μία αναβάθμιση για τον ${snapshot.hero.name}.</p>
          <div class="upgrade-list">
            ${snapshot.pendingUpgrades
              .map(
                (upgrade) => `
                  <button class="upgrade-button" type="button" data-upgrade="${upgrade.id}">
                    <strong>${upgrade.title}</strong>
                    <span>${upgrade.description}</span>
                  </button>
                `,
              )
              .join('')}
          </div>
        </section>
      `;

      for (const button of overlay.querySelectorAll<HTMLButtonElement>(
        '[data-upgrade]',
      )) {
        button.addEventListener('click', () => {
          game?.chooseUpgrade(button.dataset.upgrade ?? '');
          overlay.hidden = true;
        });
      }
      return;
    }

    overlay.innerHTML = `
      <section class="dialog" aria-modal="true">
        <h2>Τέλος παρτίδας</h2>
        <p>Ο ${snapshot.hero.name} άντεξε ${formatTime(snapshot.elapsed)}, έφτασε στο επίπεδο ${
          snapshot.level
        }, εξουδετέρωσε ${snapshot.kills} εχθρούς και κέρδισε ${snapshot.gold} χρυσό.</p>
        <div class="dialog-actions">
          <button class="primary-button" type="button" data-start>Ξανά</button>
          <button class="secondary-button" type="button" data-menu>Αλλαγή ήρωα</button>
        </div>
      </section>
    `;
    overlay
      .querySelector<HTMLButtonElement>('[data-start]')
      ?.addEventListener('click', startGame);
    overlay
      .querySelector<HTMLButtonElement>('[data-menu]')
      ?.addEventListener('click', returnToMenu);
  };

  const showStatsScreen = async (): Promise<void> => {
    overlay.hidden = false;
    overlay.innerHTML = `
      <section class="dialog dialog--start" aria-modal="true">
        <header class="start-screen__brand">
          <h2>Στατιστικά παίκτη</h2>
          <p>Συνολικά για κάθε αδελφό.</p>
        </header>
        <p class="stats-loading">Φόρτωση στατιστικών…</p>
      </section>
    `;

    const stats = await loadPlayerStats();
    overlay.innerHTML = renderStatsScreen(stats);
    overlay
      .querySelector<HTMLButtonElement>('[data-back]')
      ?.addEventListener('click', () => {
        showOverlay(null);
      });
  };

  const tick = (time: number): void => {
    const deltaSeconds = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    context.clearRect(0, 0, width, height);

    if (game) {
      const input = mergeInputs(keyboard.getState(), touch.getState());
      game.update(deltaSeconds, input);
      game.draw(context);
      const snapshot = game.getSnapshot();
      updateHud(hud, snapshot);

      if (snapshot.pausedForUpgrade && overlay.hidden) {
        showOverlay(snapshot);
      }

      if (snapshot.gameOver && !runSaved) {
        runSaved = true;
        void saveRunSummary(game.getRunSummary());
        showOverlay(snapshot);
      }
    }

    animationFrame = requestAnimationFrame(tick);
  };

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  window.visualViewport?.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('scroll', resize);
  resize();
  setHudVisible(false);
  showOverlay(null);
  animationFrame = requestAnimationFrame(tick);

  window.addEventListener('beforeunload', () => {
    keyboard.destroy();
    touch.destroy();
    cancelAnimationFrame(animationFrame);
    window.removeEventListener('resize', resize);
    window.removeEventListener('orientationchange', resize);
    window.visualViewport?.removeEventListener('resize', resize);
    window.visualViewport?.removeEventListener('scroll', resize);
  });
}

function renderShell(): string {
  return `
    <div class="game-shell">
      <section class="stage-wrap" data-stage>
        <canvas class="game-canvas" data-game-canvas aria-label="Πεδίο μάχης Remoundoi Bros"></canvas>
        <div class="hud" data-hud hidden aria-live="polite">
          <div class="hud__profile">
            <div class="hud__avatar" data-hud-avatar></div>
            <div class="hud__info">
              <div class="hud__name" data-hud-name></div>
              <div class="hud__hp" aria-label="Υγεία">
                <div class="hp-bar">
                  <div class="hp-bar__fill" data-hp-fill></div>
                </div>
                <span class="hud__hp-value" data-hp>0/0</span>
              </div>
              <div class="hud__meta">
                <span class="hud__chip"><span class="hud__chip-label">Επ.</span><span data-level>1</span></span>
                <span class="hud__chip"><span class="hud__chip-label">Χρυσός</span><span data-gold>0</span></span>
                <span class="hud__chip"><span class="hud__chip-label">Εχθροί</span><span data-kills>0</span></span>
                <span class="hud__chip"><span class="hud__chip-label">Χρόνος</span><span data-time>0:00</span></span>
              </div>
            </div>
          </div>
          <div class="xp-bar" aria-label="Πρόοδος εμπειρίας">
            <div class="xp-bar__fill" data-xp-fill></div>
          </div>
        </div>
        <div class="touch-stick" aria-hidden="true">
          <div class="touch-stick__nub" data-touch-nub></div>
        </div>
        <div class="overlay" data-overlay></div>
      </section>
    </div>
  `;
}

function renderStartScreen(
  selectedHero: HeroDefinition,
  orientation: ScreenOrientationMode,
): string {
  return `
    <section class="start-screen dialog dialog--start" aria-modal="true">
      <header class="start-screen__brand">
        <h1>Remoundoi Bros</h1>
        <p>Διάλεξε έναν αδελφό και επιβίωσε στην αρένα.</p>
      </header>
      <div class="start-screen__heroes" aria-label="Επιλογή ήρωα">
        ${heroes.map((hero) => renderHeroCard(hero, hero.id === selectedHero.id)).join('')}
      </div>
      <div class="start-screen__orientation" aria-label="Προσανατολισμός οθόνης">
        <p class="start-screen__orientation-label">Προσανατολισμός παιχνιδιού</p>
        <div class="orientation-toggle" role="group">
          <button
            class="orientation-button"
            type="button"
            data-orientation="portrait"
            aria-pressed="${orientation === 'portrait'}"
          >
            <span class="orientation-button__icon orientation-button__icon--portrait" aria-hidden="true"></span>
            <span class="orientation-button__label">Κατακόρυφα</span>
          </button>
          <button
            class="orientation-button"
            type="button"
            data-orientation="landscape"
            aria-pressed="${orientation === 'landscape'}"
          >
            <span class="orientation-button__icon" aria-hidden="true"></span>
            <span class="orientation-button__label">Οριζόντια</span>
          </button>
        </div>
      </div>
      <p class="start-screen__hint">Κινήσου με WASD, βέλη ή άγγιγμα. Οι επιθέσεις στοχεύουν αυτόματα.</p>
      <div class="dialog-actions">
        <button class="primary-button" type="button" data-start>Έναρξη</button>
        <button class="secondary-button" type="button" data-stats>Στατιστικά</button>
      </div>
    </section>
  `;
}

function renderStatsScreen(stats: PlayerStats[]): string {
  return `
    <section class="dialog dialog--start stats-screen" aria-modal="true">
      <header class="start-screen__brand">
        <h2>Στατιστικά παίκτη</h2>
        <p>Συνολικά αποθηκευμένα ανά αδελφό.</p>
      </header>
      <div class="stats-list" aria-label="Στατιστικά καριέρας">
        ${stats.map((entry) => renderPlayerStatsCard(entry)).join('')}
      </div>
      <div class="dialog-actions">
        <button class="secondary-button" type="button" data-back>Πίσω</button>
      </div>
    </section>
  `;
}

function renderPlayerStatsCard(stats: PlayerStats): string {
  const hero = heroes.find((entry) => entry.id === stats.heroId);
  const accent = hero?.color ?? 'var(--gold)';
  const displayName = hero?.name ?? stats.heroName;
  const runsLabel = stats.runs === 1 ? 'παρτίδα' : 'παρτίδες';

  return `
    <article class="stats-card">
      <header class="stats-card__header">
        <span class="stats-card__avatar"${hero?.portraitSrc || hero?.portraitSrcSm ? '' : ` style="background:${accent}"`}>
          ${hero ? renderAvatarContent(hero, 'sm') : displayName.slice(0, 1)}
        </span>
        <div>
          <h3 class="stats-card__name">${displayName}</h3>
          <p class="stats-card__runs">${stats.runs} ${runsLabel}</p>
        </div>
      </header>
      <dl class="stats-grid">
        <div><dt>Συνολικός χρυσός</dt><dd>${stats.totalGold}</dd></div>
        <div><dt>Συνολικοί εχθροί</dt><dd>${stats.totalKills}</dd></div>
        <div><dt>Καλύτερο επίπεδο</dt><dd>${stats.bestLevel}</dd></div>
        <div><dt>Περισσότερος χρυσός</dt><dd>${stats.bestGold}</dd></div>
        <div><dt>Περισσότεροι εχθροί</dt><dd>${stats.bestKills}</dd></div>
        <div><dt>Καλύτερος χρόνος</dt><dd>${formatTime(stats.bestElapsedSeconds)}</dd></div>
      </dl>
    </article>
  `;
}

function renderHeroCard(hero: HeroDefinition, selected: boolean): string {
  const hasPortrait = Boolean(hero.portraitSrc || hero.portraitSrcSm);

  return `
    <button class="hero-card" type="button" data-hero="${hero.id}" aria-pressed="${selected}">
      <span class="hero-card__avatar"${hasPortrait ? '' : ` style="background:${hero.color}"`}>${renderAvatarContent(hero, 'lg')}</span>
      <span class="hero-card__body">
        <span class="hero-card__name">${hero.name}</span>
        <span class="hero-card__tagline">${hero.tagline}</span>
        <span class="hero-card__weapon">${hero.weaponName}</span>
        <span class="hero-card__stats">
          <span><strong>Ζωή</strong> ${hero.maxHp}</span>
          <span><strong>Ταχύτητα</strong> ${hero.speed}</span>
          <span><strong>Ζημιά</strong> ${hero.projectileDamage}</span>
        </span>
      </span>
      <span class="hero-card__ready">${selected ? 'Επιλεγμένος' : ''}</span>
    </button>
  `;
}

function renderAvatarContent(
  hero: HeroDefinition,
  size: 'lg' | 'sm' = 'lg',
): string {
  const src =
    size === 'sm'
      ? (hero.portraitSrcSm ?? hero.portraitSrc)
      : (hero.portraitSrc ?? hero.portraitSrcSm);

  if (src) {
    return `<img class="hero-portrait" src="${src}" alt="" draggable="false" />`;
  }

  return hero.initials;
}

function getHudElements(root: HTMLElement): HudElements {
  const hudRoot = root.querySelector<HTMLElement>('[data-hud]');
  const avatar = root.querySelector<HTMLElement>('[data-hud-avatar]');
  const name = root.querySelector<HTMLElement>('[data-hud-name]');
  const hp = root.querySelector<HTMLElement>('[data-hp]');
  const hpFill = root.querySelector<HTMLElement>('[data-hp-fill]');
  const level = root.querySelector<HTMLElement>('[data-level]');
  const kills = root.querySelector<HTMLElement>('[data-kills]');
  const gold = root.querySelector<HTMLElement>('[data-gold]');
  const time = root.querySelector<HTMLElement>('[data-time]');
  const xpFill = root.querySelector<HTMLElement>('[data-xp-fill]');

  if (
    !hudRoot ||
    !avatar ||
    !name ||
    !hp ||
    !hpFill ||
    !level ||
    !kills ||
    !gold ||
    !time ||
    !xpFill
  ) {
    throw new Error('HUD failed to mount.');
  }

  return {
    root: hudRoot,
    avatar,
    name,
    hp,
    hpFill,
    level,
    kills,
    gold,
    time,
    xpFill,
  };
}

function updateHud(hud: HudElements, snapshot: GameSnapshot): void {
  const hp = Math.max(0, Math.ceil(snapshot.hp));
  const hpRatio = snapshot.maxHp > 0 ? (snapshot.hp / snapshot.maxHp) * 100 : 0;

  hud.hp.textContent = `${hp}/${snapshot.maxHp}`;
  hud.hpFill.style.width = `${Math.max(0, Math.min(100, hpRatio))}%`;
  hud.level.textContent = snapshot.level.toString();
  hud.kills.textContent = snapshot.kills.toString();
  hud.gold.textContent = snapshot.gold.toString();
  hud.time.textContent = formatTime(snapshot.elapsed);
  hud.xpFill.style.width = `${(snapshot.xp / snapshot.xpToNext) * 100}%`;
}

function updateHeroButtons(
  buttons: HTMLButtonElement[],
  selectedHero: HeroDefinition,
): void {
  for (const button of buttons) {
    const selected = button.dataset.hero === selectedHero.id;
    button.setAttribute('aria-pressed', String(selected));
    const ready = button.querySelector<HTMLElement>('.hero-card__ready');

    if (ready) {
      ready.textContent = selected ? 'Επιλεγμένος' : '';
    }
  }
}

function updateOrientationButtons(
  buttons: HTMLButtonElement[],
  orientation: ScreenOrientationMode,
): void {
  for (const button of buttons) {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.orientation === orientation),
    );
  }
}

function mergeInputs(keyboard: InputState, touch: InputState): InputState {
  if (touch.move.x !== 0 || touch.move.y !== 0) {
    return touch;
  }

  return keyboard;
}

function getViewportSize(): { width: number; height: number } {
  const viewport = window.visualViewport;
  return {
    width: Math.max(1, viewport?.width ?? window.innerWidth),
    height: Math.max(1, viewport?.height ?? window.innerHeight),
  };
}

function isDevicePortrait(): boolean {
  const { width, height } = getViewportSize();
  return height >= width;
}

function needsForcedRotation(preferred: ScreenOrientationMode): boolean {
  const devicePortrait = isDevicePortrait();
  return preferred === 'landscape' ? devicePortrait : !devicePortrait;
}

function getPlaySize(
  preferred: ScreenOrientationMode,
  playing: boolean,
): { width: number; height: number } {
  const viewport = getViewportSize();

  if (playing && needsForcedRotation(preferred)) {
    return { width: viewport.height, height: viewport.width };
  }

  return viewport;
}

function parseOrientation(value: string | undefined): ScreenOrientationMode | null {
  if (value === 'portrait' || value === 'landscape') {
    return value;
  }

  return null;
}

function loadPreferredOrientation(): ScreenOrientationMode {
  try {
    return parseOrientation(localStorage.getItem(ORIENTATION_STORAGE_KEY) ?? undefined) ??
      (isDevicePortrait() ? 'portrait' : 'landscape');
  } catch {
    return isDevicePortrait() ? 'portrait' : 'landscape';
  }
}

function savePreferredOrientation(orientation: ScreenOrientationMode): void {
  try {
    localStorage.setItem(ORIENTATION_STORAGE_KEY, orientation);
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

async function tryLockOrientation(orientation: ScreenOrientationMode): Promise<void> {
  const screenOrientation = window.screen.orientation as
    | ScreenOrientation
    | undefined;

  if (!screenOrientation || typeof screenOrientation.lock !== 'function') {
    return;
  }

  try {
    await screenOrientation.lock(orientation);
  } catch {
    // Locking often requires fullscreen / installed PWA; CSS rotation is the fallback.
  }
}

async function tryUnlockOrientation(): Promise<void> {
  const screenOrientation = window.screen.orientation as
    | ScreenOrientation
    | undefined;

  if (!screenOrientation || typeof screenOrientation.unlock !== 'function') {
    return;
  }

  try {
    screenOrientation.unlock();
  } catch {
    // Ignore unlock failures.
  }
}
