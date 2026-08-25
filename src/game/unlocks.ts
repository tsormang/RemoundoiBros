import { getHeroById } from './heroes';
import type { HeroId, WeaponId } from './types';
import {
  getWeaponDefinition,
  UNLOCKABLE_WEAPON_IDS,
  weaponDefinitions,
} from './weapons';

const UNLOCKS_STORAGE_KEY = 'remoundoi-bros:unlocks';

export type HeroUnlocks = {
  heroId: HeroId;
  unlockedWeaponIds: WeaponId[];
};

type UnlockStore = Partial<Record<HeroId, WeaponId[]>>;

export function getDefaultUnlockedWeapons(heroId: HeroId): WeaponId[] {
  const hero = getHeroById(heroId);
  return [hero.startingWeaponId];
}

export function loadHeroUnlocks(heroId: HeroId): WeaponId[] {
  const store = readUnlockStore();
  const stored = store[heroId] ?? [];
  const defaults = getDefaultUnlockedWeapons(heroId);
  return [...new Set([...defaults, ...stored])];
}

export function isWeaponUnlocked(heroId: HeroId, weaponId: WeaponId): boolean {
  return loadHeroUnlocks(heroId).includes(weaponId);
}

export function getLockedUnlockableWeapons(heroId: HeroId): WeaponId[] {
  const unlocked = new Set(loadHeroUnlocks(heroId));
  return UNLOCKABLE_WEAPON_IDS.filter((id) => !unlocked.has(id));
}

export function unlockWeaponForHero(
  heroId: HeroId,
  weaponId: WeaponId,
): WeaponId[] {
  const store = readUnlockStore();
  const current = new Set(loadHeroUnlocks(heroId));
  current.add(weaponId);
  const next = [...current];
  store[heroId] = next.filter((id) => UNLOCKABLE_WEAPON_IDS.includes(id));
  saveUnlockStore(store);
  return next;
}

export function unlockRandomWeaponForHero(heroId: HeroId): WeaponId | null {
  const locked = getLockedUnlockableWeapons(heroId);
  if (locked.length === 0) {
    return null;
  }

  const pick = locked[Math.floor(Math.random() * locked.length)];
  unlockWeaponForHero(heroId, pick);
  return pick;
}

export function getStartPickerWeapons(
  heroId: HeroId,
  options?: { unlockAll?: boolean },
): Array<{
  weaponId: WeaponId;
  unlocked: boolean;
  title: string;
  iconSrc: string;
}> {
  const hero = getHeroById(heroId);
  const unlockAll = Boolean(options?.unlockAll);
  const unlockedSet = unlockAll
    ? new Set(weaponDefinitions.map((weapon) => weapon.id))
    : new Set(loadHeroUnlocks(heroId));
  const pickerIds: WeaponId[] = unlockAll
    ? [
        hero.startingWeaponId,
        ...weaponDefinitions
          .map((weapon) => weapon.id)
          .filter((id) => id !== hero.startingWeaponId),
      ]
    : [hero.startingWeaponId, ...UNLOCKABLE_WEAPON_IDS];

  return pickerIds.map((weaponId) => {
    const definition = getWeaponDefinition(weaponId);
    return {
      weaponId,
      unlocked: unlockedSet.has(weaponId),
      title: definition.title,
      iconSrc: definition.sprites.icon,
    };
  });
}

function readUnlockStore(): UnlockStore {
  const raw = localStorage.getItem(UNLOCKS_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as UnlockStore;
  } catch {
    return {};
  }
}

function saveUnlockStore(store: UnlockStore): void {
  localStorage.setItem(UNLOCKS_STORAGE_KEY, JSON.stringify(store));
}
