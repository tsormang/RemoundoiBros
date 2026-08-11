import type {
  PassiveId,
  PassiveLevels,
  Upgrade,
  WeaponId,
  WeaponInstance,
} from './types';

const weaponsBase = '/assets/sprites/weapons';

export type WeaponSprites = {
  icon: string;
  projectile?: string[];
  trail?: string[];
  hit?: string[];
  pool?: string[];
  poolNest?: string[];
  poolNestCenter?: string;
  slowIndicator?: string;
  orbitItems?: string[];
  orbitHit?: string;
  orbitEvolved?: string;
  explosion?: string[];
  puff?: string;
  storm?: string[];
  bounceSpark?: string;
  splitMarble?: string;
  evolvedProjectile?: string;
};

export type WeaponDefinition = {
  id: WeaponId;
  title: string;
  description: string;
  evolutionPassiveId: PassiveId;
  evolutionTitle: string;
  sprites: WeaponSprites;
};

export type StarThrowStats = {
  damage: number;
  cooldown: number;
  speed: number;
  amount: number;
  pierce: number;
  radius: number;
  ttl: number;
  spreadRadians: number;
  splitChance: number;
};

export type WebPoolStats = {
  impactDamage: number;
  cooldown: number;
  speed: number;
  poolChance: number;
  poolRadius: number;
  poolDuration: number;
  slowStrength: number;
  tickDamage: number;
  pullStrength: number;
};

export type OrbitToyStats = {
  damage: number;
  count: number;
  orbitRadius: number;
  rotationSpeed: number;
  hitDelay: number;
  drawSize: number;
};

export type PillowPopStats = {
  explosionDamage: number;
  cooldown: number;
  blastRadius: number;
  targetingRange: number;
  lingeringDuration: number;
  lingeringTickDamage: number;
};

export type MarbleBounceStats = {
  damage: number;
  cooldown: number;
  speed: number;
  amount: number;
  bounces: number;
  radius: number;
  ttl: number;
  finalSplit: boolean;
  splitDamageMultiplier: number;
};

export type WeaponStats =
  | { kind: 'star-throw'; stats: StarThrowStats }
  | { kind: 'web-pool'; stats: WebPoolStats }
  | { kind: 'orbit-toy'; stats: OrbitToyStats }
  | { kind: 'pillow-pop'; stats: PillowPopStats }
  | { kind: 'marble-bounce'; stats: MarbleBounceStats };

export const MAX_WEAPONS = 5;
export const MAX_WEAPON_LEVEL = 5;
export const MAX_PASSIVE_LEVEL = 3;

export const weaponDefinitions: WeaponDefinition[] = [
  {
    id: 'star-throw',
    title: 'Αστροβολές',
    description: 'Ρίχνει αστέρια που τρυπάνε τους εχθρούς.',
    evolutionPassiveId: 'bright-stars',
    evolutionTitle: 'Αστροβροχή',
    sprites: {
      icon: `${weaponsBase}/star-throw/weapon_star_throw_icon_256.png`,
      projectile: [
        `${weaponsBase}/star-throw/weapon_star_projectile_01.png`,
        `${weaponsBase}/star-throw/weapon_star_projectile_02.png`,
      ],
      trail: [`${weaponsBase}/star-throw/weapon_star_trail_01.png`],
      hit: [
        `${weaponsBase}/star-throw/weapon_star_hit_01.png`,
        `${weaponsBase}/star-throw/weapon_star_hit_02.png`,
      ],
    },
  },
  {
    id: 'web-pool',
    title: 'Ιστός',
    description: 'Ρίχνει ιστό που αργεί και τραυματίζει εχθρούς.',
    evolutionPassiveId: 'sticky-socks',
    evolutionTitle: 'Φωλιά Ιστού',
    sprites: {
      icon: `${weaponsBase}/web-pool/weapon_web_pool_icon_256.png`,
      projectile: [
        `${weaponsBase}/web-pool/weapon_web_glob_01.png`,
        `${weaponsBase}/web-pool/weapon_web_glob_02.png`,
      ],
      pool: [
        `${weaponsBase}/web-pool/weapon_web_pool_01.png`,
        `${weaponsBase}/web-pool/weapon_web_pool_02.png`,
        `${weaponsBase}/web-pool/weapon_web_pool_03.png`,
      ],
      poolNest: [`${weaponsBase}/web-pool/weapon_web_nest_pool_01.png`],
      poolNestCenter: `${weaponsBase}/web-pool/weapon_web_nest_center_01.png`,
      slowIndicator: `${weaponsBase}/web-pool/status_slow_web_01.png`,
    },
  },
  {
    id: 'orbit-toy',
    title: 'Περιστρεφόμενο Παιχνίδι',
    description: 'Παιχνίδια που γυρίζουν γύρω σου και χτυπούν εχθρούς.',
    evolutionPassiveId: 'bigger-toys',
    evolutionTitle: 'Καρουζέλ Παιχνιδιών',
    sprites: {
      icon: `${weaponsBase}/orbit-toy/weapon_orbit_toy_icon_256.png`,
      orbitItems: [
        `${weaponsBase}/orbit-toy/weapon_orbit_block_01.png`,
        `${weaponsBase}/orbit-toy/weapon_orbit_plush_01.png`,
      ],
      orbitHit: `${weaponsBase}/orbit-toy/weapon_orbit_hit_01.png`,
      orbitEvolved: `${weaponsBase}/orbit-toy/weapon_toy_carousel_star_01.png`,
    },
  },
  {
    id: 'pillow-pop',
    title: 'Μαξιλάρι Pop',
    description: 'Ρίχνει μαξιλάρι σε πυκνές ομάδες εχθρών.',
    evolutionPassiveId: 'cozy-blanket',
    evolutionTitle: 'Καταιγίδα Μαξιλαριών',
    sprites: {
      icon: `${weaponsBase}/pillow-pop/weapon_pillow_pop_icon_256.png`,
      projectile: [`${weaponsBase}/pillow-pop/weapon_pillow_projectile_01.png`],
      explosion: [
        `${weaponsBase}/pillow-pop/weapon_pillow_pop_01.png`,
        `${weaponsBase}/pillow-pop/weapon_pillow_pop_02.png`,
        `${weaponsBase}/pillow-pop/weapon_pillow_pop_03.png`,
      ],
      puff: `${weaponsBase}/pillow-pop/weapon_pillow_puff_loop_01.png`,
      storm: [
        `${weaponsBase}/pillow-pop/weapon_pillow_storm_01.png`,
        `${weaponsBase}/pillow-pop/weapon_pillow_storm_02.png`,
      ],
    },
  },
  {
    id: 'marble-bounce',
    title: 'Μπίλια Αναπήδησης',
    description: 'Γρήγορη μπίλια που αναπηδά σε εχθρούς και εμπόδια.',
    evolutionPassiveId: 'quick-hands',
    evolutionTitle: 'Σούπερ Μπίλια',
    sprites: {
      icon: `${weaponsBase}/marble-bounce/weapon_marble_bounce_icon_256.png`,
      projectile: [
        `${weaponsBase}/marble-bounce/weapon_marble_01.png`,
        `${weaponsBase}/marble-bounce/weapon_marble_02.png`,
      ],
      bounceSpark: `${weaponsBase}/marble-bounce/weapon_marble_bounce_spark_01.png`,
      splitMarble: `${weaponsBase}/marble-bounce/weapon_super_marble_small_01.png`,
      evolvedProjectile: `${weaponsBase}/marble-bounce/weapon_super_marble_01.png`,
    },
  },
];

export const passiveDefinitions: Record<
  PassiveId,
  { title: string; description: string; maxLevel: number }
> = {
  'bright-stars': {
    title: 'Φωτεινά Αστέρια',
    description: '+10% ζημιά όπλων ανά επίπεδο.',
    maxLevel: MAX_PASSIVE_LEVEL,
  },
  'sticky-socks': {
    title: 'Κολλώδη Καλτσάκια',
    description: '+15% διάρκεια κατάστασης και +5% επιβράδυνση.',
    maxLevel: MAX_PASSIVE_LEVEL,
  },
  'bigger-toys': {
    title: 'Μεγαλύτερα Παιχνίδια',
    description: '+12% ακτίνα/περιοχή ανά επίπεδο.',
    maxLevel: MAX_PASSIVE_LEVEL,
  },
  'cozy-blanket': {
    title: 'Ζεστή Κουβέρτα',
    description: '+12% διάρκεια υπολειπόμενων εφέ.',
    maxLevel: MAX_PASSIVE_LEVEL,
  },
  'quick-hands': {
    title: 'Γρήγορα Χέρια',
    description: '-8% cooldown όπλων ανά επίπεδο.',
    maxLevel: MAX_PASSIVE_LEVEL,
  },
  speed: {
    title: 'Γρήγορα Παπούτσια',
    description: 'Κινείσαι 12% πιο γρήγορα.',
    maxLevel: Number.POSITIVE_INFINITY,
  },
  maxHp: {
    title: 'Σνακ Ήρωα',
    description: 'Κερδίζεις 18 μέγιστη ζωή και θεραπεύεσαι.',
    maxLevel: Number.POSITIVE_INFINITY,
  },
};

export function getWeaponDefinition(id: WeaponId): WeaponDefinition {
  return weaponDefinitions.find((weapon) => weapon.id === id) ?? weaponDefinitions[0];
}

export function createWeaponInstance(id: WeaponId): WeaponInstance {
  return { id, level: 1, cooldownTimer: 0, evolved: false };
}

function cooldownMultiplier(passives: PassiveLevels): number {
  const level = passives['quick-hands'] ?? 0;
  return Math.max(0.4, 1 - level * 0.08);
}

function damageMultiplier(passives: PassiveLevels): number {
  const level = passives['bright-stars'] ?? 0;
  return 1 + level * 0.1;
}

function areaMultiplier(passives: PassiveLevels): number {
  const level = passives['bigger-toys'] ?? 0;
  return 1 + level * 0.12;
}

function statusDurationMultiplier(passives: PassiveLevels): number {
  const level = passives['sticky-socks'] ?? 0;
  return 1 + level * 0.15;
}

function lingeringMultiplier(passives: PassiveLevels): number {
  const level = passives['cozy-blanket'] ?? 0;
  return 1 + level * 0.12;
}

function slowBonus(passives: PassiveLevels): number {
  const level = passives['sticky-socks'] ?? 0;
  return level * 0.05;
}

export function getStarThrowStats(
  level: number,
  passives: PassiveLevels,
  evolved: boolean,
): StarThrowStats {
  let damage = 18;
  let pierce = 2;
  let amount = 1;
  let cooldown = 0.65;
  let speed = 560;
  let spreadRadians = 0;

  if (level >= 2) {
    damage += 4;
    pierce += 1;
  }
  if (level >= 3) {
    amount += 1;
    spreadRadians = 0.22;
  }
  if (level >= 4) {
    cooldown *= 0.85;
    speed *= 1.1;
  }
  if (level >= 5) {
    damage += 6;
    pierce += 2;
  }

  if (evolved) {
    amount = 2;
    pierce += 3;
    spreadRadians = 0.28;
  }

  return {
    damage: damage * damageMultiplier(passives),
    cooldown: cooldown * cooldownMultiplier(passives),
    speed,
    amount,
    pierce,
    radius: 6,
    ttl: 1.35,
    spreadRadians,
    splitChance: evolved ? 0.15 : 0,
  };
}

export function getWebPoolStats(
  level: number,
  passives: PassiveLevels,
  evolved: boolean,
): WebPoolStats {
  let impactDamage = 12;
  let cooldown = 1.2;
  let poolChance = 0.35;
  let poolRadius = 54;
  let poolDuration = 4;
  let slowStrength = 0.35;

  if (level >= 2) {
    poolChance += 0.15;
  }
  if (level >= 3) {
    poolRadius *= 1.2;
    poolDuration += 1;
  }
  if (level >= 4) {
    cooldown *= 0.85;
    slowStrength = 0.45;
  }
  if (level >= 5) {
    poolChance = 1;
  }

  if (evolved) {
    poolChance = 1;
    poolDuration *= 1.5;
  }

  return {
    impactDamage: impactDamage * damageMultiplier(passives),
    cooldown: cooldown * cooldownMultiplier(passives),
    speed: 460,
    poolChance,
    poolRadius: poolRadius * areaMultiplier(passives),
    poolDuration: poolDuration * statusDurationMultiplier(passives),
    slowStrength: Math.min(0.75, slowStrength + slowBonus(passives)),
    tickDamage: 3 * damageMultiplier(passives),
    pullStrength: evolved ? 85 : 0,
  };
}

export function getOrbitToyStats(
  level: number,
  passives: PassiveLevels,
  evolved: boolean,
): OrbitToyStats {
  let damage = 10;
  let count = 1;
  let orbitRadius = 72;
  let hitDelay = 0.6;
  let drawSize = 28;

  if (level >= 2) {
    count += 1;
  }
  if (level >= 3) {
    orbitRadius *= 1.2;
  }
  if (level >= 4) {
    hitDelay = 0.45;
  }
  if (level >= 5) {
    count += 1;
    damage *= 1.25;
  }

  if (evolved) {
    count = 3;
    orbitRadius *= 1.35;
    drawSize = 38;
  }

  return {
    damage: damage * damageMultiplier(passives),
    count,
    orbitRadius: orbitRadius * areaMultiplier(passives),
    rotationSpeed: evolved ? 220 : 180,
    hitDelay,
    drawSize: drawSize * Math.sqrt(areaMultiplier(passives)),
  };
}

export function getPillowPopStats(
  level: number,
  passives: PassiveLevels,
  evolved: boolean,
): PillowPopStats {
  let explosionDamage = 24;
  let cooldown = 2.4;
  let blastRadius = 70;
  let lingeringDuration = 0;

  if (level >= 2) {
    blastRadius *= 1.2;
  }
  if (level >= 3) {
    explosionDamage += 10;
  }
  if (level >= 4) {
    cooldown *= 0.8;
  }
  if (level >= 5) {
    lingeringDuration = 1;
  }

  if (evolved) {
    lingeringDuration = 2;
  }

  return {
    explosionDamage: explosionDamage * damageMultiplier(passives),
    cooldown: cooldown * cooldownMultiplier(passives),
    blastRadius: blastRadius * areaMultiplier(passives),
    targetingRange: 520,
    lingeringDuration: lingeringDuration * lingeringMultiplier(passives),
    lingeringTickDamage: 6 * damageMultiplier(passives),
  };
}

export function getMarbleBounceStats(
  level: number,
  passives: PassiveLevels,
  evolved: boolean,
): MarbleBounceStats {
  let damage = 14;
  let cooldown = 1;
  let speed = 620;
  let amount = 1;
  let bounces = 3;
  let finalSplit = false;

  if (level >= 2) {
    bounces += 2;
  }
  if (level >= 3) {
    damage += 6;
    speed *= 1.1;
  }
  if (level >= 4) {
    amount += 1;
  }
  if (level >= 5) {
    cooldown *= 0.85;
    finalSplit = true;
  }

  if (evolved) {
    finalSplit = true;
    bounces += 1;
  }

  return {
    damage: damage * damageMultiplier(passives),
    cooldown: cooldown * cooldownMultiplier(passives),
    speed,
    amount,
    bounces,
    radius: evolved ? 6 : 5,
    ttl: 2.2,
    finalSplit,
    splitDamageMultiplier: 0.55,
  };
}

export function getWeaponStats(
  weapon: WeaponInstance,
  passives: PassiveLevels,
): WeaponStats {
  const { id, level, evolved } = weapon;

  switch (id) {
    case 'star-throw':
      return {
        kind: 'star-throw',
        stats: getStarThrowStats(level, passives, evolved),
      };
    case 'web-pool':
      return {
        kind: 'web-pool',
        stats: getWebPoolStats(level, passives, evolved),
      };
    case 'orbit-toy':
      return {
        kind: 'orbit-toy',
        stats: getOrbitToyStats(level, passives, evolved),
      };
    case 'pillow-pop':
      return {
        kind: 'pillow-pop',
        stats: getPillowPopStats(level, passives, evolved),
      };
    case 'marble-bounce':
      return {
        kind: 'marble-bounce',
        stats: getMarbleBounceStats(level, passives, evolved),
      };
  }
}

export function canEvolve(
  weapon: WeaponInstance,
  passives: PassiveLevels,
): boolean {
  if (weapon.evolved || weapon.level < MAX_WEAPON_LEVEL) {
    return false;
  }

  const definition = getWeaponDefinition(weapon.id);
  return (passives[definition.evolutionPassiveId] ?? 0) >= MAX_PASSIVE_LEVEL;
}

export function allWeaponSpriteSources(): string[] {
  const sources = new Set<string>();

  for (const weapon of weaponDefinitions) {
    const sprites = weapon.sprites;
    sources.add(sprites.icon);

    for (const list of [
      sprites.projectile,
      sprites.trail,
      sprites.hit,
      sprites.pool,
      sprites.poolNest,
      sprites.explosion,
      sprites.storm,
      sprites.orbitItems,
    ]) {
      list?.forEach((src) => sources.add(src));
    }

    for (const src of [
      sprites.poolNestCenter,
      sprites.slowIndicator,
      sprites.orbitHit,
      sprites.orbitEvolved,
      sprites.puff,
      sprites.bounceSpark,
      sprites.splitMarble,
      sprites.evolvedProjectile,
    ]) {
      if (src) {
        sources.add(src);
      }
    }
  }

  return [...sources];
}

export function drawAttackUpgradeChoices(
  weapons: WeaponInstance[],
  passives: PassiveLevels,
): Upgrade[] {
  const pool: Upgrade[] = [];
  const ownedIds = new Set(weapons.map((weapon) => weapon.id));

  for (const weapon of weapons) {
    if (weapon.level < MAX_WEAPON_LEVEL) {
      const definition = getWeaponDefinition(weapon.id);
      pool.push({
        id: `level:${weapon.id}`,
        kind: 'weapon-level',
        weaponId: weapon.id,
        title: `${definition.title} Lv.${weapon.level + 1}`,
        description: definition.description,
        iconSrc: definition.sprites.icon,
      });
    }
  }

  if (weapons.length < MAX_WEAPONS) {
    for (const definition of weaponDefinitions) {
      if (!ownedIds.has(definition.id)) {
        pool.push({
          id: `new:${definition.id}`,
          kind: 'weapon-new',
          weaponId: definition.id,
          title: definition.title,
          description: `Νέα επίθεση: ${definition.description}`,
          iconSrc: definition.sprites.icon,
        });
      }
    }
  }

  const evolutionPassives: PassiveId[] = [
    'bright-stars',
    'sticky-socks',
    'bigger-toys',
    'cozy-blanket',
    'quick-hands',
  ];

  for (const passiveId of evolutionPassives) {
    const current = passives[passiveId] ?? 0;
    const definition = passiveDefinitions[passiveId];

    if (current < definition.maxLevel) {
      pool.push({
        id: `passive:${passiveId}`,
        kind: 'passive',
        passiveId,
        title: definition.title,
        description: definition.description,
        iconSrc: undefined,
      });
    }
  }

  for (const passiveId of ['speed', 'maxHp'] as const) {
    pool.push({
      id: `passive:${passiveId}`,
      kind: 'passive',
      passiveId,
      title: passiveDefinitions[passiveId].title,
      description: passiveDefinitions[passiveId].description,
      iconSrc: undefined,
    });
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const chosen: Upgrade[] = [];
  const usedWeaponIds = new Set<WeaponId>();

  for (const upgrade of shuffled) {
    if (chosen.length >= 3) {
      break;
    }

    if (upgrade.weaponId && usedWeaponIds.has(upgrade.weaponId)) {
      continue;
    }

    chosen.push(upgrade);

    if (upgrade.weaponId) {
      usedWeaponIds.add(upgrade.weaponId);
    }
  }

  if (chosen.length < 3) {
    for (const upgrade of shuffled) {
      if (chosen.length >= 3) {
        break;
      }

      if (chosen.some((entry) => entry.id === upgrade.id)) {
        continue;
      }

      chosen.push(upgrade);
    }
  }

  return chosen;
}
