import { Game, getRunAssetSources } from '../game/Game';
import { BOSS_FIGHT_OPTIONS, parseBossId } from '../game/bosses';
import { loadDeveloperMode, saveDeveloperMode } from '../game/developer';
import {
  DIFFICULTY_OPTIONS,
  loadPreferredDifficulty,
  parseDifficulty,
  savePreferredDifficulty,
  type DifficultyId,
} from '../game/difficulty';
import { heroes } from '../game/heroes';
import {
  DEFAULT_STAGE_ID,
  getStageById,
  RUN_DURATION_OPTIONS,
  stages,
  type StageDefinition,
} from '../game/stages';
import type {
  BossId,
  GameSnapshot,
  HeroDefinition,
  InputState,
  PlayerStats,
  RunDurationMinutes,
  StageId,
  WeaponId,
} from '../game/types';
import { getStartPickerWeapons, isWeaponUnlocked } from '../game/unlocks';
import { getWeaponDefinition } from '../game/weapons';
import {
  GamepadInput,
  type GamepadStatus,
} from '../input/gamepadInput';
import { KeyboardInput } from '../input/keyboardInput';
import { TouchInput } from '../input/touchInput';
import {
  loadPlayerStats,
  resetAllPlayerStats,
  saveRunSummary,
} from '../infra/runRepository';
import { preloadImagesWithProgress } from '../render/assets';
import { formatTime } from './format';
import { mountLoadingScreen } from './loadingScreen';
import { mountSplashScreen, type SplashHandle } from './splashScreen';

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
type ViewZoomMode = 'close' | 'normal' | 'far';

const ORIENTATION_STORAGE_KEY = 'remoundoi-orientation';
const ZOOM_STORAGE_KEY = 'remoundoi-zoom';
const ADMIN_UNLOCK_CLICKS = 8;
const VIEW_ZOOM_SCALE: Record<ViewZoomMode, number> = {
  close: 1.25,
  normal: 1,
  far: 0.75,
};

type LoadoutSelection = {
  stageId: StageId;
  durationMinutes: RunDurationMinutes;
  startingWeaponId: WeaponId;
  skipToBoss: BossId | null;
};

export function createGameApp(root: HTMLElement): void {
  let selectedHero = heroes[0];
  let loadout: LoadoutSelection = {
    stageId: DEFAULT_STAGE_ID,
    durationMinutes: 6,
    startingWeaponId: selectedHero.startingWeaponId,
    skipToBoss: null,
  };
  let preferredOrientation = loadPreferredOrientation();
  let preferredZoom = loadPreferredZoom();
  let preferredDifficulty = loadPreferredDifficulty();
  let developerMode = loadDeveloperMode();
  let game: Game | null = null;
  let animationFrame = 0;
  let lastTime = performance.now();
  let runSaved = false;
  let splash: SplashHandle | null = null;
  let pausedForSettings = false;
  let adminUnlockClicks = 0;
  let settingsGamepadSync: (() => void) | null = null;
  let isStartingGame = false;

  root.innerHTML = renderShell();

  const shell = root.querySelector<HTMLElement>('.game-shell');
  const canvas = root.querySelector<HTMLCanvasElement>('[data-game-canvas]');
  const stage = root.querySelector<HTMLElement>('[data-stage]');
  const overlay = root.querySelector<HTMLElement>('[data-overlay]');
  const touchStick = root.querySelector<HTMLElement>('[data-touch-stick]');
  const touchNub = root.querySelector<HTMLElement>('[data-touch-nub]');
  const orientationControl = root.querySelector<HTMLElement>(
    '[data-orientation-control]',
  );
  const settingsButton = root.querySelector<HTMLButtonElement>(
    '[data-settings-menu]',
  );
  const hud = getHudElements(root);

  if (
    !shell ||
    !canvas ||
    !stage ||
    !overlay ||
    !touchStick ||
    !touchNub ||
    !orientationControl ||
    !settingsButton
  ) {
    throw new Error('Game UI failed to mount.');
  }

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas 2D context is unavailable.');
  }

  const keyboard = new KeyboardInput();
  const touch = new TouchInput(stage, touchStick, touchNub);
  const gamepad = new GamepadInput();

  const syncOrientationControl = (): void => {
    updateOrientationButtons(
      [
        ...orientationControl.querySelectorAll<HTMLButtonElement>(
          '[data-orientation]',
        ),
      ],
      preferredOrientation,
    );
  };

  const setPreferredOrientation = (next: ScreenOrientationMode): void => {
    if (next === preferredOrientation) {
      return;
    }

    preferredOrientation = next;
    savePreferredOrientation(preferredOrientation);
    syncOrientationControl();
    syncSettingsOptionButtons();
    resize();
  };

  const setPreferredZoom = (next: ViewZoomMode): void => {
    if (next === preferredZoom) {
      return;
    }

    preferredZoom = next;
    savePreferredZoom(preferredZoom);
    syncSettingsOptionButtons();
    resize();
  };

  const applyLayout = (): void => {
    const rotated = needsForcedRotation(preferredOrientation);
    shell.classList.toggle('is-rotated', rotated);
    touch.setRotation(rotated ? 90 : 0);
  };

  const resize = (): void => {
    applyLayout();
    const fallback = getPlaySize(preferredOrientation);
    const width = Math.max(1, stage.clientWidth || fallback.width);
    const height = Math.max(1, stage.clientHeight || fallback.height);
    const dpr = window.devicePixelRatio || 1;
    const viewScale = VIEW_ZOOM_SCALE[preferredZoom];
    const worldWidth = width / viewScale;
    const worldHeight = height / viewScale;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    context.setTransform(dpr * viewScale, 0, 0, dpr * viewScale, 0, 0);
    game?.resize(worldWidth, worldHeight);
  };

  const setHudVisible = (visible: boolean): void => {
    hud.root.hidden = !visible;
  };

  const setPlayingChrome = (playing: boolean): void => {
    orientationControl.hidden = playing;
  };

  const syncHudHero = (hero: HeroDefinition): void => {
    hud.name.textContent = hero.name;
    hud.avatar.style.background = hero.portraitSrc || hero.portraitSrcSm ? 'transparent' : hero.color;
    hud.avatar.innerHTML = renderAvatarContent(hero, 'sm');
  };

  const clearSettingsGamepadSync = (): void => {
    if (!settingsGamepadSync) {
      return;
    }

    window.removeEventListener('gamepadconnected', settingsGamepadSync);
    window.removeEventListener('gamepaddisconnected', settingsGamepadSync);
    settingsGamepadSync = null;
  };

  const startGame = async (): Promise<void> => {
    if (isStartingGame) {
      return;
    }

    isStartingGame = true;
    const size = getPlaySize(preferredOrientation);
    const viewScale = VIEW_ZOOM_SCALE[preferredZoom];
    clearSettingsGamepadSync();
    pausedForSettings = false;
    adminUnlockClicks = 0;
    const startingWeaponId =
      developerMode ||
      isWeaponUnlocked(selectedHero.id, loadout.startingWeaponId)
        ? loadout.startingWeaponId
        : selectedHero.startingWeaponId;
    const gameConfig = {
      width: size.width / viewScale,
      height: size.height / viewScale,
      hero: selectedHero,
      difficulty: preferredDifficulty,
      stageId: loadout.stageId,
      durationSeconds: loadout.durationMinutes * 60,
      startingWeaponId,
      developerMode,
      skipToBoss: developerMode ? (loadout.skipToBoss ?? undefined) : undefined,
    };
    const stageDefinition = getStageById(loadout.stageId);
    overlay.hidden = false;
    overlay.classList.remove('overlay--splash');
    const loadingScreen = mountLoadingScreen(overlay, stageDefinition);

    try {
      await preloadImagesWithProgress(
        getRunAssetSources(gameConfig),
        (loaded, total) => {
          loadingScreen.setProgress(loaded, total);
        },
        [stageDefinition.backgroundImageSrc],
      );

      game = new Game(gameConfig);
      runSaved = false;
      lastTime = performance.now();
      syncHudHero(selectedHero);
      setHudVisible(true);
      setPlayingChrome(true);
      loadingScreen.destroy();
      overlay.hidden = true;
      resize();
    } finally {
      isStartingGame = false;
    }
  };

  const showLoadoutScreen = (): void => {
    loadout = {
      ...loadout,
      startingWeaponId: selectedHero.startingWeaponId,
      skipToBoss: null,
    };
    overlay.hidden = false;
    overlay.innerHTML = renderLoadoutScreen(
      selectedHero,
      loadout,
      developerMode,
    );
    bindLoadoutScreen(overlay);
  };

  const returnToMenu = (): void => {
    clearSettingsGamepadSync();
    pausedForSettings = false;
    game = null;
    loadout = { ...loadout, skipToBoss: null };
    setHudVisible(false);
    setPlayingChrome(false);
    void tryUnlockOrientation();
    showOverlay(null);
    resize();
  };

  const syncSettingsOptionButtons = (): void => {
    if (!pausedForSettings || overlay.hidden) {
      return;
    }

    updateOrientationButtons(
      [...overlay.querySelectorAll<HTMLButtonElement>('[data-orientation]')],
      preferredOrientation,
    );
    updateZoomButtons(
      [...overlay.querySelectorAll<HTMLButtonElement>('[data-zoom]')],
      preferredZoom,
    );
  };

  const closeSettingsMenu = (): void => {
    if (!pausedForSettings) {
      return;
    }

    clearSettingsGamepadSync();
    pausedForSettings = false;
    overlay.hidden = true;
    lastTime = performance.now();
  };

  const showSettingsMenu = (): void => {
    if (!game || pausedForSettings || !overlay.hidden) {
      return;
    }

    const snapshot = game.getSnapshot();
    if (snapshot.gameOver || snapshot.victory || snapshot.pausedForUpgrade) {
      return;
    }

    pausedForSettings = true;
    overlay.hidden = false;
    overlay.innerHTML = renderSettingsMenu(
      preferredOrientation,
      preferredZoom,
      gamepad.getStatus(),
    );

    overlay
      .querySelector<HTMLButtonElement>('[data-settings-resume]')
      ?.addEventListener('click', closeSettingsMenu);
    overlay
      .querySelector<HTMLButtonElement>('[data-settings-restart]')
      ?.addEventListener('click', () => {
        void startGame();
      });
    overlay
      .querySelector<HTMLButtonElement>('[data-settings-leave]')
      ?.addEventListener('click', returnToMenu);

    overlay
      .querySelector<HTMLButtonElement>('[data-settings-gamepad]')
      ?.addEventListener('click', () => {
        const status = gamepad.enable();
        updateGamepadSettingsUi(overlay, status);
      });

    settingsGamepadSync = () => {
      updateGamepadSettingsUi(overlay, gamepad.getStatus());
    };
    window.addEventListener('gamepadconnected', settingsGamepadSync);
    window.addEventListener('gamepaddisconnected', settingsGamepadSync);

    overlay
      .querySelector<HTMLElement>('[data-settings-orientation]')
      ?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const button = target.closest<HTMLButtonElement>('[data-orientation]');
        const next = parseOrientation(button?.dataset.orientation);
        if (!next) {
          return;
        }

        setPreferredOrientation(next);
      });

    overlay
      .querySelector<HTMLElement>('[data-settings-zoom]')
      ?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const button = target.closest<HTMLButtonElement>('[data-zoom]');
        const next = parseZoom(button?.dataset.zoom);
        if (!next) {
          return;
        }

        setPreferredZoom(next);
      });
  };

  const bindHeroSelect = (container: HTMLElement): void => {
    const heroButtons = [
      ...container.querySelectorAll<HTMLButtonElement>('[data-hero]'),
    ];

    for (const button of heroButtons) {
      button.addEventListener('click', () => {
        selectedHero =
          heroes.find((hero) => hero.id === button.dataset.hero) ?? heroes[0];
        loadout = {
          ...loadout,
          startingWeaponId: selectedHero.startingWeaponId,
        };
        updateHeroButtons(heroButtons, selectedHero);
      });
    }
  };

  const bindAdminUnlock = (container: HTMLElement): void => {
    container
      .querySelector<HTMLButtonElement>('[data-admin-unlock]')
      ?.addEventListener('click', () => {
        adminUnlockClicks += 1;
        if (adminUnlockClicks < ADMIN_UNLOCK_CLICKS) {
          return;
        }

        adminUnlockClicks = 0;
        showAdminMenu();
      });
  };

  const setPreferredDifficulty = (next: DifficultyId): void => {
    if (next === preferredDifficulty) {
      return;
    }

    preferredDifficulty = next;
    savePreferredDifficulty(preferredDifficulty);
    updateDifficultyButtons(
      [...overlay.querySelectorAll<HTMLButtonElement>('[data-difficulty]')],
      preferredDifficulty,
    );
  };

  const setDeveloperMode = (next: boolean): void => {
    if (next === developerMode) {
      return;
    }

    developerMode = next;
    saveDeveloperMode(developerMode);
    if (!developerMode) {
      loadout = { ...loadout, skipToBoss: null };
    }
    showAdminMenu();
  };

  const startBossFight = (bossId: BossId): void => {
    loadout = { ...loadout, skipToBoss: bossId };
    void startGame();
  };

  const showAdminMenu = (): void => {
    overlay.hidden = false;
    overlay.innerHTML = renderAdminMenu(preferredDifficulty, developerMode);
    bindAdminMenu();
  };

  const bindAdminMenu = (): void => {
    overlay
      .querySelector<HTMLElement>('[data-admin-difficulty]')
      ?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const button = target.closest<HTMLButtonElement>('[data-difficulty]');
        const next = parseDifficulty(button?.dataset.difficulty);
        if (!next) {
          return;
        }

        setPreferredDifficulty(next);
      });

    overlay
      .querySelector<HTMLElement>('[data-admin-developer]')
      ?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const button = target.closest<HTMLButtonElement>('[data-developer]');
        if (!button) {
          return;
        }

        setDeveloperMode(button.dataset.developer === 'on');
      });

    overlay
      .querySelector<HTMLElement>('[data-admin-boss-fights]')
      ?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const button = target.closest<HTMLButtonElement>('[data-admin-boss]');
        const next = parseBossId(button?.dataset.adminBoss);
        if (!next) {
          return;
        }

        startBossFight(next);
      });

    overlay
      .querySelector<HTMLButtonElement>('[data-admin-reset-stats]')
      ?.addEventListener('click', () => {
        void (async () => {
          const button = overlay.querySelector<HTMLButtonElement>(
            '[data-admin-reset-stats]',
          );
          const status = overlay.querySelector<HTMLElement>(
            '[data-admin-reset-status]',
          );

          if (button) {
            button.disabled = true;
          }

          if (status) {
            status.textContent = 'Μηδενισμός…';
          }

          try {
            await resetAllPlayerStats();
            if (status) {
              status.textContent = 'Τα στατιστικά μηδενίστηκαν.';
            }
          } catch (error) {
            console.warn('Could not reset player stats:', error);
            if (status) {
              status.textContent = 'Αποτυχία μηδενισμού.';
            }
          } finally {
            if (button) {
              button.disabled = false;
            }
          }
        })();
      });

    overlay
      .querySelector<HTMLButtonElement>('[data-admin-back]')
      ?.addEventListener('click', () => {
        showOverlay(null);
      });
  };

  const showOverlay = (snapshot: GameSnapshot | null): void => {
    overlay.hidden = false;

    if (!snapshot) {
      adminUnlockClicks = 0;
      overlay.innerHTML = renderStartScreen(selectedHero);
      bindHeroSelect(overlay);
      bindAdminUnlock(overlay);
      overlay
        .querySelector<HTMLButtonElement>('[data-start]')
        ?.addEventListener('click', showLoadoutScreen);
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
                    ${
                      upgrade.iconSrc
                        ? `<img class="upgrade-button__icon" src="${upgrade.iconSrc}" alt="" width="48" height="48" />`
                        : ''
                    }
                    <span class="upgrade-button__body">
                      <strong>${upgrade.title}</strong>
                      <span>${upgrade.description}</span>
                    </span>
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

    if (snapshot.victory) {
      const unlockNote =
        snapshot.developerMode || snapshot.skipRunSave
          ? ''
          : snapshot.newlyUnlockedWeaponId
            ? `<p class="victory-unlock">Ξεκλείδωσες: <strong>${getWeaponDefinition(snapshot.newlyUnlockedWeaponId).title}</strong></p>`
            : `<p class="victory-unlock">Έχεις ξεκλειδώσει όλες τις νέες επιθέσεις!</p>`;

      overlay.innerHTML = `
        <section class="dialog dialog--victory" aria-modal="true">
          <h2>Νίκη!</h2>
          <p>Ο ${snapshot.hero.name} νίκησε ${snapshot.bossName ?? 'τον boss'}!</p>
          <p>Επίπεδο ${snapshot.level}, ${snapshot.kills} εξουδετερώσεις, ${snapshot.gold} χρυσός.</p>
          ${unlockNote}
          <div class="dialog-actions">
            <button class="primary-button" type="button" data-start>Ξανά</button>
            <button class="secondary-button" type="button" data-menu>Αλλαγή ήρωα</button>
          </div>
        </section>
      `;
      overlay
        .querySelector<HTMLButtonElement>('[data-start]')
        ?.addEventListener('click', () => {
        void startGame();
      });
      overlay
        .querySelector<HTMLButtonElement>('[data-menu]')
        ?.addEventListener('click', returnToMenu);
      return;
    }

    overlay.innerHTML = `
      <section class="dialog" aria-modal="true">
        <h2>Τέλος παρτίδας</h2>
        <p>Ο ${snapshot.hero.name} άντεξε ${formatTime(snapshot.elapsed)}, έφτασε στο επίπεδο ${
          snapshot.level
        }, εξουδετέρωσε ${snapshot.kills} εχθρούς και κέρδισε ${snapshot.gold} χρυσό.</p>
        <div class="dialog-actions">
          <button class="primary-button" type="button" data-retry>Ξανά</button>
          <button class="secondary-button" type="button" data-menu>Αλλαγή ήρωα</button>
        </div>
      </section>
    `;
    overlay
      .querySelector<HTMLButtonElement>('[data-retry]')
      ?.addEventListener('click', () => {
        void startGame();
      });
    overlay
      .querySelector<HTMLButtonElement>('[data-menu]')
      ?.addEventListener('click', returnToMenu);
  };

  const bindLoadoutScreen = (container: HTMLElement): void => {
    container
      .querySelector<HTMLButtonElement>('[data-loadout-back]')
      ?.addEventListener('click', () => {
        showOverlay(null);
      });

    container
      .querySelector<HTMLButtonElement>('[data-loadout-start]')
      ?.addEventListener('click', () => {
        void startGame();
      });

    for (const button of container.querySelectorAll<HTMLButtonElement>(
      '[data-stage]',
    )) {
      button.addEventListener('click', () => {
        const stageId = button.dataset.stage as StageId | undefined;
        if (!stageId) {
          return;
        }
        loadout = { ...loadout, stageId };
        updateLoadoutButtons(container, loadout);
      });
    }

    for (const button of container.querySelectorAll<HTMLButtonElement>(
      '[data-duration]',
    )) {
      button.addEventListener('click', () => {
        const minutes = Number(button.dataset.duration) as RunDurationMinutes;
        if (![2, 4, 6, 8].includes(minutes)) {
          return;
        }
        loadout = { ...loadout, durationMinutes: minutes };
        updateLoadoutButtons(container, loadout);
      });
    }

    for (const button of container.querySelectorAll<HTMLButtonElement>(
      '[data-weapon]',
    )) {
      button.addEventListener('click', () => {
        if (button.disabled) {
          return;
        }
        const weaponId = button.dataset.weapon as WeaponId | undefined;
        if (!weaponId) {
          return;
        }
        loadout = { ...loadout, startingWeaponId: weaponId };
        updateLoadoutButtons(container, loadout);
      });
    }

    for (const button of container.querySelectorAll<HTMLButtonElement>(
      '[data-boss]',
    )) {
      button.addEventListener('click', () => {
        loadout = {
          ...loadout,
          skipToBoss: parseBossId(button.dataset.boss),
        };
        updateLoadoutButtons(container, loadout);
      });
    }
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
    const viewScale = VIEW_ZOOM_SCALE[preferredZoom];
    context.clearRect(0, 0, width / viewScale, height / viewScale);

    if (game) {
      if (!pausedForSettings) {
        const input = mergeInputs(
          keyboard.getState(),
          touch.getState(),
          gamepad.getState(),
        );
        game.update(deltaSeconds, input);
      }

      game.draw(context);
      const snapshot = game.getSnapshot();
      updateHud(hud, snapshot);

      if (pausedForSettings) {
        animationFrame = requestAnimationFrame(tick);
        return;
      }

      if (snapshot.pausedForUpgrade && overlay.hidden) {
        showOverlay(snapshot);
      }

      if (snapshot.gameOver && !runSaved) {
        runSaved = true;
        if (!snapshot.skipRunSave) {
          void saveRunSummary(game.getRunSummary());
        }
        showOverlay(snapshot);
      }

      if (snapshot.victory && !runSaved) {
        runSaved = true;
        if (!snapshot.skipRunSave) {
          void saveRunSummary(game.getRunSummary());
        }
        showOverlay(snapshot);
      }
    }

    animationFrame = requestAnimationFrame(tick);
  };

  const showSplash = (): void => {
    overlay.hidden = false;
    splash?.destroy();
    splash = mountSplashScreen(overlay, () => {
      splash = null;
      showOverlay(null);
    });
  };

  let orientationSyncTimer = 0;

  const onDeviceOrientationChange = (): void => {
    // Viewport size often updates after the orientation event; keep the user's choice.
    window.clearTimeout(orientationSyncTimer);
    orientationSyncTimer = window.setTimeout(() => {
      resize();
    }, 120);
  };

  const screenOrientation = window.screen.orientation;

  orientationControl.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>('[data-orientation]');
    const next = parseOrientation(button?.dataset.orientation);
    if (!next) {
      return;
    }

    setPreferredOrientation(next);
  });

  settingsButton.addEventListener('click', showSettingsMenu);

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', onDeviceOrientationChange);
  screenOrientation?.addEventListener('change', onDeviceOrientationChange);
  window.visualViewport?.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('scroll', resize);
  syncOrientationControl();
  setPlayingChrome(false);
  resize();
  setHudVisible(false);
  showSplash();
  animationFrame = requestAnimationFrame(tick);

  window.addEventListener('beforeunload', () => {
    splash?.destroy();
    keyboard.destroy();
    touch.destroy();
    gamepad.destroy();
    cancelAnimationFrame(animationFrame);
    window.clearTimeout(orientationSyncTimer);
    window.removeEventListener('resize', resize);
    window.removeEventListener('orientationchange', onDeviceOrientationChange);
    screenOrientation?.removeEventListener('change', onDeviceOrientationChange);
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
          <div class="hud__layout">
            <div class="hud__left">
              <div class="hud__avatar" data-hud-avatar></div>
              <div class="hud__meta">
                <span class="hud__chip"><span class="hud__chip-label">Επ.</span><span data-level>1</span></span>
                <span class="hud__chip"><span class="hud__chip-label">Χρυσός</span><span data-gold>0</span></span>
                <span class="hud__chip"><span class="hud__chip-label">Εχθροί</span><span data-kills>0</span></span>
                <span class="hud__chip"><span class="hud__chip-label">Χρόνος</span><span data-time>0:00</span></span>
              </div>
            </div>
            <div class="hud__right">
              <div class="hud__heading">
                <div class="hud__name" data-hud-name></div>
                <button
                  class="hud__settings"
                  type="button"
                  data-settings-menu
                  aria-label="Ρυθμίσεις"
                  title="Ρυθμίσεις"
                >
                  <svg
                    class="hud__settings-icon"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      fill="currentColor"
                      d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54c.05.24.26.42.5.42h3.8c.24 0 .45-.18.5-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
                    />
                  </svg>
                </button>
              </div>
              <div class="hud__bars">
                <div class="hud__hp" aria-label="Υγεία">
                  <div class="hp-bar">
                    <div class="hp-bar__fill" data-hp-fill></div>
                  </div>
                  <span class="hud__hp-value" data-hp>0/0</span>
                </div>
                <div class="xp-bar" aria-label="Πρόοδος εμπειρίας">
                  <div class="xp-bar__fill" data-xp-fill></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="touch-stick" data-touch-stick aria-hidden="true">
          <div class="touch-stick__nub" data-touch-nub></div>
        </div>
        <div class="overlay" data-overlay></div>
        <div
          class="orientation-control"
          data-orientation-control
          role="group"
          aria-label="Προσανατολισμός οθόνης"
        >
          <button
            class="orientation-control__button"
            type="button"
            data-orientation="portrait"
            aria-label="Κατακόρυφα"
            title="Κατακόρυφα"
          >
            <span class="orientation-control__icon orientation-control__icon--portrait" aria-hidden="true"></span>
          </button>
          <button
            class="orientation-control__button"
            type="button"
            data-orientation="landscape"
            aria-label="Οριζόντια"
            title="Οριζόντια"
          >
            <span class="orientation-control__icon" aria-hidden="true"></span>
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderLoadoutScreen(
  hero: HeroDefinition,
  selection: LoadoutSelection,
  developerMode: boolean,
): string {
  const weapons = getStartPickerWeapons(hero.id, { unlockAll: developerMode });

  return `
    <section class="dialog dialog--start loadout-screen" aria-modal="true">
      <header class="start-screen__brand">
        <h2>Ρυθμίσεις παρτίδας</h2>
        <p>Διάλεξε σκηνή, χρόνο και αρχική επίθεση για τον ${hero.name}.</p>
        ${
          developerMode
            ? '<p class="loadout-dev-note">Developer mode: όλες οι επιθέσεις είναι ξεκλείδωτες.</p>'
            : ''
        }
      </header>

      <div class="loadout-section">
        <h3 class="loadout-section__title">Σκηνή</h3>
        <div class="loadout-stage-grid" aria-label="Επιλογή σκηνής">
          ${stages
            .map((stage) => renderStageCard(stage, stage.id === selection.stageId))
            .join('')}
        </div>
      </div>

      <div class="loadout-section">
        <h3 class="loadout-section__title">Χρόνος</h3>
        <div class="loadout-option-row" aria-label="Διάρκεια παρτίδας">
          ${RUN_DURATION_OPTIONS.map(
            (option) => `
              <button
                class="loadout-chip"
                type="button"
                data-duration="${option.minutes}"
                aria-pressed="${selection.durationMinutes === option.minutes}"
              >
                ${option.label}
              </button>
            `,
          ).join('')}
        </div>
      </div>

      <div class="loadout-section">
        <h3 class="loadout-section__title">Αρχική επίθεση</h3>
        <div class="loadout-weapon-grid" aria-label="Αρχική επίθεση">
          ${weapons
            .map((entry) =>
              renderWeaponPickerCard(
                entry.weaponId,
                entry.title,
                entry.iconSrc,
                entry.unlocked,
                entry.weaponId === selection.startingWeaponId,
              ),
            )
            .join('')}
        </div>
      </div>

      ${
        developerMode
          ? `
      <div class="loadout-section">
        <h3 class="loadout-section__title">Boss test</h3>
        <div class="loadout-option-row" aria-label="Boss test">
          <button
            class="loadout-chip"
            type="button"
            data-boss="none"
            aria-pressed="${selection.skipToBoss === null}"
          >
            Κανονική παρτίδα
          </button>
          ${BOSS_FIGHT_OPTIONS.map(
            (option) => `
              <button
                class="loadout-chip"
                type="button"
                data-boss="${option.id}"
                aria-pressed="${selection.skipToBoss === option.id}"
              >
                ${option.label}
              </button>
            `,
          ).join('')}
        </div>
      </div>
          `
          : ''
      }

      <div class="dialog-actions">
        <button class="secondary-button" type="button" data-loadout-back>Πίσω</button>
        <button class="primary-button" type="button" data-loadout-start>
          ${selection.skipToBoss ? 'Έναρξη boss' : 'Έναρξη'}
        </button>
      </div>
    </section>
  `;
}

function renderStageCard(stage: StageDefinition, selected: boolean): string {
  return `
    <button
      class="loadout-stage-card"
      type="button"
      data-stage="${stage.id}"
      aria-pressed="${selected}"
      style="--stage-fallback:${stage.thumbnailFallbackColor}"
    >
      <span class="loadout-stage-card__thumb">
        <img src="${stage.thumbnailSrc}" alt="" draggable="false" />
      </span>
      <span class="loadout-stage-card__body">
        <strong>${stage.title}</strong>
        <span>${stage.description}</span>
      </span>
    </button>
  `;
}

function renderWeaponPickerCard(
  weaponId: WeaponId,
  title: string,
  iconSrc: string,
  unlocked: boolean,
  selected: boolean,
): string {
  return `
    <button
      class="loadout-weapon-card${unlocked ? '' : ' loadout-weapon-card--locked'}"
      type="button"
      data-weapon="${weaponId}"
      aria-pressed="${selected}"
      ${unlocked ? '' : 'disabled'}
    >
      <img class="loadout-weapon-card__icon" src="${iconSrc}" alt="" width="48" height="48" />
      <span class="loadout-weapon-card__title">${title}</span>
      ${unlocked ? '' : '<span class="loadout-weapon-card__lock" aria-hidden="true">🔒</span>'}
    </button>
  `;
}

function updateLoadoutButtons(
  container: HTMLElement,
  selection: LoadoutSelection,
): void {
  for (const button of container.querySelectorAll<HTMLButtonElement>(
    '[data-stage]',
  )) {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.stage === selection.stageId),
    );
  }

  for (const button of container.querySelectorAll<HTMLButtonElement>(
    '[data-duration]',
  )) {
    button.setAttribute(
      'aria-pressed',
      String(Number(button.dataset.duration) === selection.durationMinutes),
    );
  }

  for (const button of container.querySelectorAll<HTMLButtonElement>(
    '[data-weapon]',
  )) {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.weapon === selection.startingWeaponId),
    );
  }

  const startButton = container.querySelector<HTMLButtonElement>(
    '[data-loadout-start]',
  );
  if (startButton) {
    startButton.textContent = selection.skipToBoss ? 'Έναρξη boss' : 'Έναρξη';
  }

  for (const button of container.querySelectorAll<HTMLButtonElement>(
    '[data-boss]',
  )) {
    const selected =
      button.dataset.boss === 'none'
        ? selection.skipToBoss === null
        : button.dataset.boss === selection.skipToBoss;
    button.setAttribute('aria-pressed', String(selected));
  }
}

function renderStartScreen(selectedHero: HeroDefinition): string {
  return `
    <section class="start-screen dialog dialog--start" aria-modal="true">
      <header class="start-screen__brand">
        <h1 class="start-screen__title">
          <button
            class="start-screen__admin-star"
            type="button"
            data-admin-unlock
            aria-label=" "
            tabindex="-1"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M12 2.6 14.7 9h6.6l-5.3 4 2 6.4L12 15.8 5.9 19.4l2-6.4-5.3-4h6.6L12 2.6Z"
              />
            </svg>
          </button>
          <span>Remoundoi Bros</span>
        </h1>
        <p>Διάλεξε έναν αδελφό και επιβίωσε στην αρένα.</p>
      </header>
      <div class="start-screen__heroes" aria-label="Επιλογή ήρωα">
        ${heroes.map((hero) => renderHeroCard(hero, hero.id === selectedHero.id)).join('')}
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
  const championIds = getChampionHeroIds(stats);

  return `
    <section class="dialog dialog--start stats-screen" aria-modal="true">
      <header class="start-screen__brand">
        <h2>Στατιστικά παίκτη</h2>
        <p>Συνολικά αποθηκευμένα ανά αδελφό.</p>
      </header>
      <div class="stats-list" aria-label="Στατιστικά καριέρας">
        ${stats
          .map((entry) =>
            renderPlayerStatsCard(entry, championIds.has(entry.heroId)),
          )
          .join('')}
      </div>
      <div class="dialog-actions">
        <button class="secondary-button" type="button" data-back>Πίσω</button>
      </div>
    </section>
  `;
}

function renderSettingsMenu(
  orientation: ScreenOrientationMode,
  zoom: ViewZoomMode,
  gamepadStatus: GamepadStatus,
): string {
  const gamepad = describeGamepadStatus(gamepadStatus);

  return `
    <section class="dialog dialog--settings" aria-modal="true" aria-label="Ρυθμίσεις">
      <header class="settings-menu__header">
        <h2>Ρυθμίσεις</h2>
        <p>Το παιχνίδι είναι σε παύση.</p>
      </header>

      <div class="settings-menu__section">
        <h3 class="settings-menu__label">Προσανατολισμός</h3>
        <div
          class="settings-segment"
          data-settings-orientation
          role="group"
          aria-label="Προσανατολισμός οθόνης"
        >
          <button
            class="settings-segment__button"
            type="button"
            data-orientation="portrait"
            aria-pressed="${orientation === 'portrait'}"
          >
            Κατακόρυφα
          </button>
          <button
            class="settings-segment__button"
            type="button"
            data-orientation="landscape"
            aria-pressed="${orientation === 'landscape'}"
          >
            Οριζόντια
          </button>
        </div>
      </div>

      <div class="settings-menu__section">
        <h3 class="settings-menu__label">Προβολή</h3>
        <div
          class="settings-segment"
          data-settings-zoom
          role="group"
          aria-label="Απόσταση κάμερας"
        >
          <button
            class="settings-segment__button"
            type="button"
            data-zoom="close"
            aria-pressed="${zoom === 'close'}"
          >
            Κοντά
          </button>
          <button
            class="settings-segment__button"
            type="button"
            data-zoom="normal"
            aria-pressed="${zoom === 'normal'}"
          >
            Κανονικό
          </button>
          <button
            class="settings-segment__button"
            type="button"
            data-zoom="far"
            aria-pressed="${zoom === 'far'}"
          >
            Μακριά
          </button>
        </div>
      </div>

      <div class="settings-menu__section">
        <h3 class="settings-menu__label">Χειριστήριο</h3>
        <button
          class="settings-gamepad ${gamepad.connected ? 'is-connected' : ''}"
          type="button"
          data-settings-gamepad
          ${gamepad.disabled ? 'disabled' : ''}
          aria-pressed="${gamepad.connected}"
        >
          <span class="settings-gamepad__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                fill="currentColor"
                d="M7.5 7.5h9A4.5 4.5 0 0 1 21 12v1.5A4.5 4.5 0 0 1 16.5 18h-9A4.5 4.5 0 0 1 3 13.5V12A4.5 4.5 0 0 1 7.5 7.5Zm1.25 2.25a.75.75 0 0 0-.75.75v1.25H6.75a.75.75 0 0 0 0 1.5H8v1.25a.75.75 0 0 0 1.5 0V13.25h1.25a.75.75 0 0 0 0-1.5H9.5V10.5a.75.75 0 0 0-.75-.75Zm7.5 1.1a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm2.75 2.4a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z"
              />
            </svg>
          </span>
          <span class="settings-gamepad__copy">
            <span class="settings-gamepad__title" data-gamepad-title>${gamepad.title}</span>
            <span class="settings-gamepad__status" data-gamepad-status>${gamepad.status}</span>
          </span>
        </button>
      </div>

      <div class="dialog-actions">
        <button class="primary-button" type="button" data-settings-resume>Συνέχεια</button>
        <button class="secondary-button" type="button" data-settings-restart>Επανεκκίνηση</button>
        <button class="secondary-button" type="button" data-settings-leave>Έξοδος</button>
      </div>
    </section>
  `;
}

function describeGamepadStatus(status: GamepadStatus): {
  title: string;
  status: string;
  connected: boolean;
  disabled: boolean;
} {
  switch (status) {
    case 'connected':
      return {
        title: 'Χειριστήριο ενεργό',
        status: 'Έτοιμο για κίνηση με stick ή D-pad.',
        connected: true,
        disabled: false,
      };
    case 'unsupported':
      return {
        title: 'Μη διαθέσιμο',
        status: 'Αυτός ο φυλλομετρητής δεν υποστηρίζει χειριστήρια.',
        connected: false,
        disabled: true,
      };
    case 'disconnected':
    default:
      return {
        title: 'Ενεργοποίηση χειριστηρίου',
        status: 'Σύνδεσε το pad και πάτα εδώ (ή πάτα κουμπί στο pad).',
        connected: false,
        disabled: false,
      };
  }
}

function updateGamepadSettingsUi(
  overlay: HTMLElement,
  status: GamepadStatus,
): void {
  const button = overlay.querySelector<HTMLButtonElement>(
    '[data-settings-gamepad]',
  );
  const title = overlay.querySelector<HTMLElement>('[data-gamepad-title]');
  const statusEl = overlay.querySelector<HTMLElement>('[data-gamepad-status]');
  if (!button || !title || !statusEl) {
    return;
  }

  const next = describeGamepadStatus(status);
  title.textContent = next.title;
  statusEl.textContent = next.status;
  button.disabled = next.disabled;
  button.setAttribute('aria-pressed', String(next.connected));
  button.classList.toggle('is-connected', next.connected);
}

function renderAdminMenu(
  difficulty: DifficultyId,
  developerMode: boolean,
): string {
  return `
    <section class="dialog dialog--settings" aria-modal="true" aria-label="Admin">
      <header class="settings-menu__header">
        <h2>Admin</h2>
        <p>Κρυφές ρυθμίσεις ανάπτυξης.</p>
      </header>

      <div class="settings-menu__section">
        <h3 class="settings-menu__label">Difficulty</h3>
        <div
          class="settings-segment settings-segment--wrap"
          data-admin-difficulty
          role="group"
          aria-label="Difficulty"
        >
          ${DIFFICULTY_OPTIONS.map(
            (option) => `
              <button
                class="settings-segment__button"
                type="button"
                data-difficulty="${option.id}"
                aria-pressed="${difficulty === option.id}"
              >
                ${option.label}
              </button>
            `,
          ).join('')}
        </div>
      </div>

      <div class="settings-menu__section">
        <h3 class="settings-menu__label">Developer mode</h3>
        <div
          class="settings-segment"
          data-admin-developer
          role="group"
          aria-label="Developer mode"
        >
          <button
            class="settings-segment__button"
            type="button"
            data-developer="off"
            aria-pressed="${!developerMode}"
          >
            Off
          </button>
          <button
            class="settings-segment__button"
            type="button"
            data-developer="on"
            aria-pressed="${developerMode}"
          >
            On
          </button>
        </div>
        <p class="settings-menu__hint">
          ${
            developerMode
              ? 'Όλες οι επιθέσεις είναι ξεκλείδωτες.'
              : 'Ξεκλείδωσε όλες τις επιθέσεις και δοκίμασε bosses.'
          }
        </p>
      </div>

      ${
        developerMode
          ? `
      <div class="settings-menu__section">
        <h3 class="settings-menu__label">Boss fight</h3>
        <div class="settings-menu__boss-actions" data-admin-boss-fights>
          ${BOSS_FIGHT_OPTIONS.map(
            (option) => `
              <button
                class="secondary-button"
                type="button"
                data-admin-boss="${option.id}"
              >
                Fight ${option.label}
              </button>
            `,
          ).join('')}
        </div>
        <p class="settings-menu__hint">Ξεκινά απευθείας τη μάχη με τον επιλεγμένο ήρωα.</p>
      </div>
          `
          : ''
      }

      <div class="settings-menu__section">
        <h3 class="settings-menu__label">Stats</h3>
        <button class="secondary-button" type="button" data-admin-reset-stats>
          Reset all stats
        </button>
        <p class="settings-menu__status" data-admin-reset-status></p>
      </div>

      <div class="dialog-actions">
        <button class="secondary-button" type="button" data-admin-back>Πίσω</button>
      </div>
    </section>
  `;
}

function renderPlayerStatsCard(
  stats: PlayerStats,
  isChampion = false,
): string {
  const hero = heroes.find((entry) => entry.id === stats.heroId);
  const accent = hero?.color ?? 'var(--gold)';
  const displayName = hero?.name ?? stats.heroName;
  const runsLabel = stats.runs === 1 ? 'παρτίδα' : 'παρτίδες';

  return `
    <article class="stats-card${isChampion ? ' stats-card--champion' : ''}">
      <header class="stats-card__header">
        <span class="stats-card__avatar"${hero?.portraitSrc || hero?.portraitSrcSm ? '' : ` style="background:${accent}"`}>
          ${hero ? renderAvatarContent(hero, 'sm') : displayName.slice(0, 1)}
        </span>
        <div class="stats-card__identity">
          <h3 class="stats-card__name">
            <span>${displayName}</span>
            ${
              isChampion
                ? `<span class="stats-card__medal" title="Καλύτερα στατιστικά" aria-label="Καλύτερα στατιστικά">${renderGoldMedalIcon()}</span>`
                : ''
            }
          </h3>
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

function renderGoldMedalIcon(): string {
  return `
    <svg class="stats-card__medal-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#c9841a" d="M7.2 2.5h3.1l1.7 4.8H8.9L7.2 2.5Zm6.5 0h3.1l-1.7 4.8h-3.1L13.7 2.5Z"/>
      <circle cx="12" cy="15.2" r="6.2" fill="#f4c95d"/>
      <circle cx="12" cy="15.2" r="4.6" fill="#ffe29a"/>
      <path fill="#c9841a" d="M12 11.4 13.2 14l2.8.3-2.1 1.9.6 2.8L12 17.6l-2.5 1.4.6-2.8-2.1-1.9 2.8-.3L12 11.4Z"/>
    </svg>
  `;
}

function getChampionHeroIds(stats: PlayerStats[]): Set<string> {
  let bestScore = 0;
  const champions = new Set<string>();

  for (const entry of stats) {
    const score = scorePlayerStats(entry);
    if (score <= 0) {
      continue;
    }

    if (score > bestScore) {
      bestScore = score;
      champions.clear();
      champions.add(entry.heroId);
      continue;
    }

    if (score === bestScore) {
      champions.add(entry.heroId);
    }
  }

  return champions;
}

function scorePlayerStats(stats: PlayerStats): number {
  if (stats.runs <= 0) {
    return 0;
  }

  return (
    stats.bestElapsedSeconds * 12 +
    stats.bestLevel * 40 +
    stats.bestKills * 3 +
    stats.bestGold * 2 +
    stats.totalKills * 2 +
    stats.totalGold +
    stats.totalElapsedSeconds
  );
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
  hud.time.textContent = snapshot.bossPhase
    ? (snapshot.bossName ?? 'BOSS')
    : formatTime(snapshot.remainingSeconds);
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

function updateZoomButtons(
  buttons: HTMLButtonElement[],
  zoom: ViewZoomMode,
): void {
  for (const button of buttons) {
    button.setAttribute('aria-pressed', String(button.dataset.zoom === zoom));
  }
}

function updateDifficultyButtons(
  buttons: HTMLButtonElement[],
  difficulty: DifficultyId,
): void {
  for (const button of buttons) {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.difficulty === difficulty),
    );
  }
}

function mergeInputs(
  keyboard: InputState,
  touch: InputState,
  gamepad: InputState,
): InputState {
  if (touch.move.x !== 0 || touch.move.y !== 0) {
    return touch;
  }

  if (gamepad.move.x !== 0 || gamepad.move.y !== 0) {
    return gamepad;
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

function getPlaySize(preferred: ScreenOrientationMode): {
  width: number;
  height: number;
} {
  const viewport = getViewportSize();

  if (needsForcedRotation(preferred)) {
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

function parseZoom(value: string | undefined): ViewZoomMode | null {
  if (value === 'close' || value === 'normal' || value === 'far') {
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

function loadPreferredZoom(): ViewZoomMode {
  try {
    return parseZoom(localStorage.getItem(ZOOM_STORAGE_KEY) ?? undefined) ?? 'normal';
  } catch {
    return 'normal';
  }
}

function savePreferredZoom(zoom: ViewZoomMode): void {
  try {
    localStorage.setItem(ZOOM_STORAGE_KEY, zoom);
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
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
