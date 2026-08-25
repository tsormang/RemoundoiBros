import type {
  EnemyId,
  PickupDefinition,
  PickupId,
  SpecialPickupId,
  XpPickupId,
} from './types';

const gemsBase = '/assets/sprites/pickups/gems';
const specialsBase = '/assets/sprites/pickups/specials';

export const specialPickupIds: SpecialPickupId[] = [
  'special-magnet',
  'special-bomb',
  'special-chest',
  'special-book',
];

export const pickupDefinitions: Record<PickupId, PickupDefinition> = {
  'xp-gem-blue': {
    id: 'xp-gem-blue',
    src: `${gemsBase}/pickup_xp_gem_blue.png`,
    drawSize: 24,
    radius: 11,
    xp: 1,
    gold: 0,
    label: 'XP',
    color: '#5cf2ff',
  },
  'xp-gem-purple-large': {
    id: 'xp-gem-purple-large',
    src: `${gemsBase}/pickup_xp_gem_purple_large.png`,
    drawSize: 32,
    radius: 14,
    xp: 3,
    gold: 0,
    label: 'XP',
    color: '#c45cff',
  },
  'special-magnet': {
    id: 'special-magnet',
    src: `${specialsBase}/pickup_effect_magnet_m.png`,
    drawSize: 40,
    radius: 15,
    xp: 0,
    gold: 0,
    label: 'M',
    color: '#5cf2ff',
  },
  'special-bomb': {
    id: 'special-bomb',
    src: `${specialsBase}/pickup_effect_bomb_b.png`,
    drawSize: 40,
    radius: 15,
    xp: 0,
    gold: 0,
    label: 'B',
    color: '#ff6b4a',
  },
  'special-chest': {
    id: 'special-chest',
    src: `${specialsBase}/pickup_effect_chest_c.png`,
    drawSize: 40,
    radius: 15,
    xp: 0,
    gold: 25,
    label: 'C',
    color: '#f4a261',
  },
  'special-book': {
    id: 'special-book',
    src: `${specialsBase}/pickup_effect_book_k.png`,
    drawSize: 40,
    radius: 15,
    xp: 0,
    gold: 0,
    label: 'K',
    color: '#9b7bff',
  },
};

export function getPickupDefinition(id: PickupId): PickupDefinition {
  return pickupDefinitions[id];
}

export function isXpPickup(id: PickupId): id is XpPickupId {
  return id === 'xp-gem-blue' || id === 'xp-gem-purple-large';
}

export function isSpecialPickup(id: PickupId): id is SpecialPickupId {
  return specialPickupIds.includes(id as SpecialPickupId);
}

export function pickupIdForEnemy(enemyId: EnemyId): XpPickupId {
  return enemyId === 'small-insect' || enemyId === 'small-lago'
    ? 'xp-gem-blue'
    : 'xp-gem-purple-large';
}

export function canRollSpecialDrop(enemyId: EnemyId, level: number): boolean {
  return (
    enemyId === 'large-cockroach' ||
    enemyId === 'large-lago' ||
    enemyId === 'mother-slipper' ||
    enemyId === 'giant-squid' ||
    level % 5 === 0
  );
}

/** Chance = 20% + character level% (e.g. level 8 → 28%). */
export function specialDropChance(level: number): number {
  return Math.min(1, 0.2 + level / 100);
}

export function rollSpecialDrop(level: number): boolean {
  return Math.random() < specialDropChance(level);
}

export function randomSpecialPickupId(): SpecialPickupId {
  return specialPickupIds[Math.floor(Math.random() * specialPickupIds.length)];
}

export function randomAvailableSpecialPickupId(
  existingSpecials: ReadonlySet<SpecialPickupId>,
): SpecialPickupId | null {
  const pool = specialPickupIds.filter((id) => !existingSpecials.has(id));

  if (pool.length === 0) {
    return null;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

export function resolveEnemyDrop(
  enemyId: EnemyId,
  level: number,
  allowSpecial: boolean,
  existingSpecials: ReadonlySet<SpecialPickupId>,
): PickupId | null {
  if (!allowSpecial) {
    return pickupIdForEnemy(enemyId);
  }

  // Stage special enemies always drop a special not already on the map.
  if (enemyId === 'mother-slipper' || enemyId === 'giant-squid') {
    return randomAvailableSpecialPickupId(existingSpecials);
  }

  if (canRollSpecialDrop(enemyId, level) && rollSpecialDrop(level)) {
    const specialId = randomSpecialPickupId();

    // Only one of each special kind may exist on the map.
    if (existingSpecials.has(specialId)) {
      return null;
    }

    return specialId;
  }

  return pickupIdForEnemy(enemyId);
}

export function allPickupSpriteSources(): string[] {
  return Object.values(pickupDefinitions)
    .map((pickup) => pickup.src)
    .filter((src) => src.length > 0);
}
