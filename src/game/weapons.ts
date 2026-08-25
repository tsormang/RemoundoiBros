import type {
  PassiveId,
  PassiveLevels,
  Upgrade,
  WeaponId,
  WeaponInstance,
} from './types';

const weaponsBase = '/assets/sprites/weapons';
const upgradesBase = '/assets/ui/upgrades';

export type WeaponSprites = {
  icon: string;
  projectile?: string[];
  trail?: string[];
  hit?: string[];
  slash?: string[];
  muzzle?: string[];
  pool?: string[];
  poolNest?: string[];
  poolNestCenter?: string;
  slowIndicator?: string;
  orbitItems?: string[];
  orbitHit?: string;
  orbitEvolved?: string;
  explosion?: string[];
  puff?: string[];
  puffAccent?: string;
  storm?: string[];
  bounceSpark?: string;
  splitMarble?: string;
  evolvedProjectile?: string;
};

export type WeaponDefinition = {
  id: WeaponId;
  title: string;
  description: string;
  evolutionPassiveId?: PassiveId;
  evolutionTitle?: string;
  sprites: WeaponSprites;
};

export const UNLOCKABLE_WEAPON_IDS: WeaponId[] = [
  'watergun',
  'hot-wheels',
  'bad-food',
  'insomnia',
  'presents',
  'knife',
  'slippers',
  'machinegun',
];

export const XP_ONLY_WEAPON_IDS: WeaponId[] = [
  'orbit-toy',
  'pillow-pop',
  'marble-bounce',
];

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
  projectileRadius: number;
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

export type WatergunStats = {
  damage: number;
  cooldown: number;
  range: number;
  halfAngle: number;
  duration: number;
};

export type HotWheelsStats = {
  damage: number;
  cooldown: number;
  speed: number;
  amount: number;
  pierce: number;
  radius: number;
  ttl: number;
};

export type BadFoodStats = {
  tickDamage: number;
  cooldown: number;
  radius: number;
  duration: number;
};

export type InsomniaStats = {
  damage: number;
  cooldown: number;
  radius: number;
  duration: number;
  dropInterval: number;
};

export type PresentsStats = {
  damage: number;
  cooldown: number;
  speed: number;
  projectileRadius: number;
  blastRadius: number;
  fuseSeconds: number;
};

export type KnifeDirection = 'back' | 'front' | 'up' | 'down';

export type KnifeStats = {
  damage: number;
  cooldown: number;
  range: number;
  arcRadians: number;
  duration: number;
  directions: KnifeDirection[];
};

export type SlippersStats = {
  damage: number;
  cooldown: number;
  speed: number;
  amount: number;
  radius: number;
  ttl: number;
};

export type MachinegunStats = {
  damage: number;
  burstCooldown: number;
  reloadCooldown: number;
  speed: number;
  shotsPerBurst: number;
  fireInterval: number;
  radius: number;
  ttl: number;
};

export type WeaponStats =
  | { kind: 'star-throw'; stats: StarThrowStats }
  | { kind: 'web-pool'; stats: WebPoolStats }
  | { kind: 'orbit-toy'; stats: OrbitToyStats }
  | { kind: 'pillow-pop'; stats: PillowPopStats }
  | { kind: 'marble-bounce'; stats: MarbleBounceStats }
  | { kind: 'watergun'; stats: WatergunStats }
  | { kind: 'hot-wheels'; stats: HotWheelsStats }
  | { kind: 'bad-food'; stats: BadFoodStats }
  | { kind: 'insomnia'; stats: InsomniaStats }
  | { kind: 'presents'; stats: PresentsStats }
  | { kind: 'knife'; stats: KnifeStats }
  | { kind: 'slippers'; stats: SlippersStats }
  | { kind: 'machinegun'; stats: MachinegunStats };

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
      puff: [`${weaponsBase}/pillow-pop/weapon_pillow_puff_loop_01.png`],
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
  {
    id: 'watergun',
    title: 'Νεροπίστολο',
    description: 'Ψεκάζει κώνο νερού προς τους εχθρούς.',
    sprites: {
      icon: `${weaponsBase}/watergun/weapon_watergun_icon_256.png`,
      projectile: [
        `${weaponsBase}/watergun/weapon_watergun_spray_01.png`,
        `${weaponsBase}/watergun/weapon_watergun_spray_02.png`,
        `${weaponsBase}/watergun/weapon_watergun_spray_03.png`,
      ],
      hit: [
        `${weaponsBase}/watergun/weapon_watergun_hit_01.png`,
        `${weaponsBase}/watergun/weapon_watergun_hit_02.png`,
      ],
    },
  },
  {
    id: 'hot-wheels',
    title: 'Αυτοκινητάκια',
    description: 'Ρίχνει αυτοκινητάκια στους άξονες Χ/Υ που συντρίβουν εχθρούς.',
    sprites: {
      icon: `${weaponsBase}/hot-wheels/weapon_hot_wheels_icon_256.png`,
      projectile: [
        `${weaponsBase}/hot-wheels/weapon_hot_wheels_car_01.png`,
        `${weaponsBase}/hot-wheels/weapon_hot_wheels_car_02.png`,
      ],
      hit: [`${weaponsBase}/hot-wheels/weapon_hot_wheels_hit_01.png`],
    },
  },
  {
    id: 'bad-food',
    title: 'Χαλασμένο φαγητό',
    description: 'Αφήνει τοξικό σύννεφο γύρω από τον ήρωα.',
    sprites: {
      icon: `${weaponsBase}/bad-food/weapon_bad_food_icon_256.png`,
      puff: [
        `${weaponsBase}/bad-food/weapon_bad_food_cloud_01.png`,
        `${weaponsBase}/bad-food/weapon_bad_food_cloud_02.png`,
        `${weaponsBase}/bad-food/weapon_bad_food_cloud_03.png`,
      ],
      puffAccent: `${weaponsBase}/bad-food/weapon_bad_food_bits_01.png`,
    },
  },
  {
    id: 'insomnia',
    title: 'Αϋπνία',
    description: 'Αφήνει σκιά που βλάπτει εχθρούς καθώς κινείσαι.',
    sprites: {
      icon: `${weaponsBase}/insomnia/weapon_insomnia_icon_256.png`,
      trail: [
        `${weaponsBase}/insomnia/weapon_insomnia_shadow_01.png`,
        `${weaponsBase}/insomnia/weapon_insomnia_shadow_02.png`,
      ],
      puffAccent: `${weaponsBase}/insomnia/weapon_insomnia_zzz_01.png`,
    },
  },
  {
    id: 'presents',
    title: 'Δώρα',
    description: 'Ρίχνει κουτιά δώρων που εκρήγνυνται.',
    sprites: {
      icon: `${weaponsBase}/presents/weapon_presents_icon_256.png`,
      projectile: [
        `${weaponsBase}/presents/weapon_presents_box_01.png`,
        `${weaponsBase}/presents/weapon_presents_box_02.png`,
      ],
      explosion: [
        `${weaponsBase}/presents/weapon_presents_blast_01.png`,
        `${weaponsBase}/presents/weapon_presents_blast_02.png`,
        `${weaponsBase}/presents/weapon_presents_blast_03.png`,
      ],
    },
  },
  {
    id: 'knife',
    title: 'Μαχαίρι',
    description: 'Κόβει σε κατευθύνσεις γύρω από τον ήρωα με γρήγορη κίνηση.',
    sprites: {
      icon: `${weaponsBase}/knife/weapon_knife_icon_256.png`,
      slash: [
        `${weaponsBase}/knife/weapon_knife_slash_01.png`,
        `${weaponsBase}/knife/weapon_knife_slash_02.png`,
        `${weaponsBase}/knife/weapon_knife_slash_03.png`,
      ],
      hit: [`${weaponsBase}/knife/weapon_knife_hit_01.png`],
    },
  },
  {
    id: 'slippers',
    title: 'Παντόφλες',
    description: 'Ρίχνει παντόφλες προς τους εχθρούς.',
    sprites: {
      icon: `${weaponsBase}/slippers/weapon_slippers_icon_256.png`,
      projectile: [
        `${weaponsBase}/slippers/weapon_slippers_throw_01.png`,
        `${weaponsBase}/slippers/weapon_slippers_throw_02.png`,
      ],
      hit: [`${weaponsBase}/slippers/weapon_slippers_hit_01.png`],
    },
  },
  {
    id: 'machinegun',
    title: 'Πολυβόλο',
    description: 'Πυροβολεί γρήγορα, ξαναγεμίζει και συνεχίζει.',
    sprites: {
      icon: `${weaponsBase}/machinegun/weapon_machinegun_icon_256.png`,
      projectile: [
        `${weaponsBase}/machinegun/weapon_machinegun_bullet_01.png`,
        `${weaponsBase}/machinegun/weapon_machinegun_bullet_02.png`,
      ],
      muzzle: [
        `${weaponsBase}/machinegun/weapon_machinegun_muzzle_01.png`,
        `${weaponsBase}/machinegun/weapon_machinegun_muzzle_02.png`,
      ],
      hit: [`${weaponsBase}/machinegun/weapon_machinegun_hit_01.png`],
    },
  },
];

export const passiveDefinitions: Record<
  PassiveId,
  { title: string; description: string; maxLevel: number; iconSrc: string }
> = {
  'bright-stars': {
    title: 'Φωτεινά Αστέρια',
    description: '+10% ζημιά όπλων ανά επίπεδο.',
    maxLevel: MAX_PASSIVE_LEVEL,
    iconSrc: `${upgradesBase}/upgrade_bright-stars_icon_256.png`,
  },
  'sticky-socks': {
    title: 'Κολλώδη Καλτσάκια',
    description: '+15% διάρκεια κατάστασης και +5% επιβράδυνση.',
    maxLevel: MAX_PASSIVE_LEVEL,
    iconSrc: `${upgradesBase}/upgrade_sticky-socks_icon_256.png`,
  },
  'bigger-toys': {
    title: 'Μεγαλύτερα Παιχνίδια',
    description: '+12% ακτίνα/περιοχή ανά επίπεδο.',
    maxLevel: MAX_PASSIVE_LEVEL,
    iconSrc: `${upgradesBase}/upgrade_bigger-toys_icon_256.png`,
  },
  'cozy-blanket': {
    title: 'Ζεστή Κουβέρτα',
    description: '+12% διάρκεια υπολειπόμενων εφέ.',
    maxLevel: MAX_PASSIVE_LEVEL,
    iconSrc: `${upgradesBase}/upgrade_cozy-blanket_icon_256.png`,
  },
  'quick-hands': {
    title: 'Γρήγορα Χέρια',
    description: '-8% cooldown όπλων ανά επίπεδο.',
    maxLevel: MAX_PASSIVE_LEVEL,
    iconSrc: `${upgradesBase}/upgrade_quick-hands_icon_256.png`,
  },
  speed: {
    title: 'Γρήγορα Παπούτσια',
    description: 'Κινείσαι 12% πιο γρήγορα.',
    maxLevel: Number.POSITIVE_INFINITY,
    iconSrc: `${upgradesBase}/upgrade_speed_icon_256.png`,
  },
  maxHp: {
    title: 'Σνακ Ήρωα',
    description: 'Κερδίζεις 18 μέγιστη ζωή και θεραπεύεσαι.',
    maxLevel: Number.POSITIVE_INFINITY,
    iconSrc: `${upgradesBase}/upgrade_max-hp_icon_256.png`,
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

const KNIFE_DIRECTION_ORDER: KnifeDirection[] = [
  'back',
  'front',
  'up',
  'down',
];

/** Bonus extras unlock at levels 3 and 5 (every 2 levels from base). */
function extrasEveryTwoLevels(level: number): number {
  return Math.floor(Math.max(0, level - 1) / 2);
}

function sizeScale(level: number, perLevel = 0.28): number {
  return 1 + Math.max(0, level - 1) * perLevel;
}

export function getStarThrowStats(
  level: number,
  passives: PassiveLevels,
  evolved: boolean,
): StarThrowStats {
  const amount = level;
  let damage = scaledByLevel(18, level, 5);
  let pierce = 2 + extrasEveryTwoLevels(level);
  let cooldown = 0.65;
  let speed = 560;
  let spreadRadians = amount <= 1 ? 0 : 0.16 + (amount - 2) * 0.05;

  if (level >= 4) {
    cooldown *= 0.9;
    speed *= 1.08;
  }

  if (evolved) {
    pierce += 3;
    spreadRadians = Math.max(spreadRadians, 0.28);
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
  let impactDamage = scaledByLevel(12, level, 3);
  let cooldown = 1.2;
  let poolChance = Math.min(1, 0.35 + (level - 1) * 0.15);
  const poolRadius = 54 * sizeScale(level, 0.3);
  let poolDuration = 4 + (level - 1) * 0.35;
  let slowStrength = Math.min(0.65, 0.35 + (level - 1) * 0.05);

  if (level >= 4) {
    cooldown *= 0.85;
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
    tickDamage: scaledByLevel(3, level, 1) * damageMultiplier(passives),
    pullStrength: evolved ? 85 : 0,
  };
}

export function getOrbitToyStats(
  level: number,
  passives: PassiveLevels,
  evolved: boolean,
): OrbitToyStats {
  let damage = scaledByLevel(10, level, 3);
  let count = 1 + extrasEveryTwoLevels(level);
  let orbitRadius = 72 * sizeScale(level, 0.22);
  let hitDelay = Math.max(0.35, 0.6 - (level - 1) * 0.04);
  let drawSize = 28 * sizeScale(level, 0.26);

  if (evolved) {
    count = Math.max(count, 3);
    orbitRadius *= 1.35;
    drawSize *= 1.25;
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
  let explosionDamage = scaledByLevel(24, level, 6);
  let cooldown = 2.4;
  const projectileRadius = 10 * sizeScale(level, 0.26);
  const blastRadius = 70 * sizeScale(level, 0.3);
  let lingeringDuration = level >= 5 ? 1 : 0;

  if (level >= 4) {
    cooldown *= 0.8;
  }

  if (evolved) {
    lingeringDuration = 2;
  }

  return {
    explosionDamage: explosionDamage * damageMultiplier(passives),
    cooldown: cooldown * cooldownMultiplier(passives),
    projectileRadius,
    blastRadius: blastRadius * areaMultiplier(passives),
    targetingRange: 520,
    lingeringDuration: lingeringDuration * lingeringMultiplier(passives),
    lingeringTickDamage: scaledByLevel(6, level, 1.5) * damageMultiplier(passives),
  };
}

export function getMarbleBounceStats(
  level: number,
  passives: PassiveLevels,
  evolved: boolean,
): MarbleBounceStats {
  let damage = scaledByLevel(14, level, 4);
  let cooldown = 1;
  let speed = 620 + (level - 1) * 25;
  const amount = 1;
  let bounces = 3 + (level - 1) * 2;
  let finalSplit = level >= 5;
  const radius = (evolved ? 6 : 5) * sizeScale(level, 0.24);

  if (level >= 5) {
    cooldown *= 0.85;
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
    radius,
    ttl: 2.2 + (level - 1) * 0.15,
    finalSplit,
    splitDamageMultiplier: 0.55,
  };
}

function scaledByLevel(
  base: number,
  level: number,
  perLevel: number,
): number {
  return base + Math.max(0, level - 1) * perLevel;
}

export function getWatergunStats(
  level: number,
  passives: PassiveLevels,
): WatergunStats {
  return {
    damage: scaledByLevel(8, level, 2.5) * damageMultiplier(passives),
    cooldown: 0.55 * cooldownMultiplier(passives),
    range: (152 + (level - 1) * 28) * Math.sqrt(areaMultiplier(passives)),
    halfAngle: 0.42 + (level - 1) * 0.09,
    duration: 0.22,
  };
}

export function getHotWheelsStats(
  level: number,
  passives: PassiveLevels,
): HotWheelsStats {
  return {
    damage: scaledByLevel(16, level, 4) * damageMultiplier(passives),
    cooldown: 1.1 * cooldownMultiplier(passives),
    speed: 480 + level * 20,
    amount: 1,
    pierce: 2 + extrasEveryTwoLevels(level),
    radius: 7 * sizeScale(level, 0.3),
    ttl: 1.8,
  };
}

export function getBadFoodStats(
  level: number,
  passives: PassiveLevels,
): BadFoodStats {
  return {
    tickDamage: scaledByLevel(5, level, 2) * damageMultiplier(passives),
    cooldown: 2.2 * cooldownMultiplier(passives),
    radius: 60 * sizeScale(level, 0.32) * areaMultiplier(passives),
    duration: 2.7 + (level - 1) * 0.25,
  };
}

export function getInsomniaStats(
  level: number,
  passives: PassiveLevels,
): InsomniaStats {
  return {
    damage: scaledByLevel(10, level, 2.5) * damageMultiplier(passives),
    cooldown: 0.35,
    radius: (26 + (level - 1) * 3) * areaMultiplier(passives),
    duration: (1.35 + (level - 1) * 0.55) * statusDurationMultiplier(passives),
    dropInterval: Math.max(0.1, 0.2 - (level - 1) * 0.02),
  };
}

export function getPresentsStats(
  level: number,
  passives: PassiveLevels,
): PresentsStats {
  return {
    damage: scaledByLevel(22, level, 5) * damageMultiplier(passives),
    cooldown: 1.6 * cooldownMultiplier(passives),
    speed: 420,
    projectileRadius: 12 * sizeScale(level, 0.28),
    blastRadius: 72 * sizeScale(level, 0.26) * areaMultiplier(passives),
    fuseSeconds: 1.4,
  };
}

export function getKnifeStats(level: number, passives: PassiveLevels): KnifeStats {
  const directionCount = Math.min(
    KNIFE_DIRECTION_ORDER.length,
    1 + extrasEveryTwoLevels(level),
  );

  return {
    damage: scaledByLevel(26, level, 5) * damageMultiplier(passives),
    cooldown: 0.95 * cooldownMultiplier(passives),
    range: 80 * sizeScale(level, 0.24),
    arcRadians: 1.4 + (level - 1) * 0.1,
    duration: 0.18,
    directions: KNIFE_DIRECTION_ORDER.slice(0, directionCount),
  };
}

export function getSlippersStats(
  level: number,
  passives: PassiveLevels,
): SlippersStats {
  return {
    damage: scaledByLevel(14, level, 3.5) * damageMultiplier(passives),
    cooldown: 0.75 * cooldownMultiplier(passives),
    speed: 520,
    amount: 1 + extrasEveryTwoLevels(level),
    radius: 8 * sizeScale(level, 0.28),
    ttl: 1.5,
  };
}

export function getMachinegunStats(
  level: number,
  passives: PassiveLevels,
): MachinegunStats {
  const fireInterval = 0.08;
  const shotsPerBurst = 8 + (level - 1) * 4;

  return {
    damage: scaledByLevel(7, level, 2) * damageMultiplier(passives),
    burstCooldown: fireInterval,
    reloadCooldown: 1.8 * cooldownMultiplier(passives),
    speed: 680,
    shotsPerBurst,
    fireInterval,
    radius: 5,
    ttl: 0.9,
  };
}

export function getWeaponLevelUpDescription(
  weaponId: WeaponId,
  nextLevel: number,
): string {
  switch (weaponId) {
    case 'star-throw':
      return `+1 αστέρι (σύνολο ${nextLevel}) και περισσότερη ζημιά.`;
    case 'web-pool':
      return 'Μεγαλύτεροι ιστοί και περισσότερη ζημιά.';
    case 'orbit-toy':
      return 'Μεγαλύτερα παιχνίδια, μεγαλύτερη ακτίνα και περισσότερη ζημιά.';
    case 'pillow-pop':
      return 'Μεγαλύτερο μαξιλάρι, μεγαλύτερη έκρηξη και περισσότερη ζημιά.';
    case 'marble-bounce':
      return 'Μεγαλύτερη μπίλια, περισσότερες αναπηδήσεις και ζημιά.';
    case 'watergun':
      return 'Μεγαλύτερος κώνος νερού και περισσότερη ζημιά.';
    case 'hot-wheels':
      return 'Μεγαλύτερα αυτοκινητάκια (μόνο σε άξονες Χ/Υ) και περισσότερη ζημιά.';
    case 'bad-food':
      return 'Μεγαλύτερο τοξικό σύννεφο και περισσότερη ζημιά.';
    case 'insomnia':
      return 'Πιο μακριά σκιά, μεγαλύτερη διάρκεια και περισσότερη ζημιά.';
    case 'presents':
      return 'Μεγαλύτερα δώρα και περισσότερη ζημιά.';
    case 'knife':
      return nextLevel % 2 === 1 && nextLevel > 1
        ? 'Έξτρα κατεύθυνση κοψίματος, μεγαλύτερες λεπίδες και περισσότερη ζημιά.'
        : 'Μεγαλύτερες λεπίδες και περισσότερη ζημιά.';
    case 'slippers':
      return nextLevel % 2 === 1 && nextLevel > 1
        ? 'Έξτρα παντόφλα, μεγαλύτερο μέγεθος και περισσότερη ζημιά.'
        : 'Μεγαλύτερες παντόφλες και περισσότερη ζημιά.';
    case 'machinegun':
      return 'Μεγαλύτερη διάρκεια ριπής και περισσότερη ζημιά.';
  }
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
    case 'watergun':
      return { kind: 'watergun', stats: getWatergunStats(level, passives) };
    case 'hot-wheels':
      return { kind: 'hot-wheels', stats: getHotWheelsStats(level, passives) };
    case 'bad-food':
      return { kind: 'bad-food', stats: getBadFoodStats(level, passives) };
    case 'insomnia':
      return { kind: 'insomnia', stats: getInsomniaStats(level, passives) };
    case 'presents':
      return { kind: 'presents', stats: getPresentsStats(level, passives) };
    case 'knife':
      return { kind: 'knife', stats: getKnifeStats(level, passives) };
    case 'slippers':
      return { kind: 'slippers', stats: getSlippersStats(level, passives) };
    case 'machinegun':
      return {
        kind: 'machinegun',
        stats: getMachinegunStats(level, passives),
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
  if (!definition.evolutionPassiveId) {
    return false;
  }

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
      sprites.slash,
      sprites.muzzle,
      sprites.pool,
      sprites.poolNest,
      sprites.explosion,
      sprites.storm,
      sprites.orbitItems,
      sprites.puff,
    ]) {
      list?.forEach((src) => sources.add(src));
    }

    for (const src of [
      sprites.poolNestCenter,
      sprites.slowIndicator,
      sprites.orbitHit,
      sprites.orbitEvolved,
      sprites.puffAccent,
      sprites.bounceSpark,
      sprites.splitMarble,
      sprites.evolvedProjectile,
    ]) {
      if (src) {
        sources.add(src);
      }
    }
  }

  for (const passive of Object.values(passiveDefinitions)) {
    sources.add(passive.iconSrc);
  }

  return [...sources];
}

export function drawAttackUpgradeChoices(
  weapons: WeaponInstance[],
  passives: PassiveLevels,
  unlockedWeaponIds: Set<WeaponId>,
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
        description: getWeaponLevelUpDescription(weapon.id, weapon.level + 1),
        iconSrc: definition.sprites.icon,
      });
    }
  }

  if (weapons.length < MAX_WEAPONS) {
    for (const definition of weaponDefinitions) {
      if (ownedIds.has(definition.id)) {
        continue;
      }

      const isUnlockable = UNLOCKABLE_WEAPON_IDS.includes(definition.id);
      const isXpOnly = XP_ONLY_WEAPON_IDS.includes(definition.id);
      const isUnlocked =
        !isUnlockable || unlockedWeaponIds.has(definition.id);

      if (!isUnlocked && !isXpOnly) {
        continue;
      }

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
        iconSrc: definition.iconSrc,
      });
    }
  }

  for (const passiveId of ['speed', 'maxHp'] as const) {
    const definition = passiveDefinitions[passiveId];
    pool.push({
      id: `passive:${passiveId}`,
      kind: 'passive',
      passiveId,
      title: definition.title,
      description: definition.description,
      iconSrc: definition.iconSrc,
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
