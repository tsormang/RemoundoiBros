export type Vec2 = {
  x: number;
  y: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HeroId = 'hero-one' | 'hero-two';

export type HeroSprites = {
  idle: string[];
  run: string[];
  hurt: string[];
  drawSize: number;
  runFrameDuration: number;
};

export type EnemyId =
  | 'small-insect'
  | 'large-cockroach'
  | 'mother-slipper';

export type EnemyBehavior = 'chase' | 'tell' | 'charge' | 'recover';

export type EnemySprites = {
  walk: string[];
  hit: string[];
  tell?: string[];
  drawSize: number;
  walkFrameDuration: number;
};

export type EnemyDefinition = {
  id: EnemyId;
  radius: number;
  baseHp: number;
  minSpeed: number;
  maxSpeed: number;
  damage: number;
  gold: number;
  color: string;
  sprites: EnemySprites;
  tellDuration?: number;
  chargeDuration?: number;
  chargeSpeedMultiplier?: number;
  recoverDuration?: number;
  engageDistance?: number;
};

export type BlockerId =
  | 'toy-blocks-pile'
  | 'toy-chest-open'
  | 'cushion-stack'
  | 'toy-truck'
  | 'stacking-rings-pile'
  | 'block-fort-wall';

export type BlockerDefinition = {
  id: BlockerId;
  src: string;
  drawSize: number;
  collision: Rect;
};

export type Blocker = {
  id: number;
  kind: BlockerId;
  position: Vec2;
};

export type HeroDefinition = {
  id: HeroId;
  name: string;
  initials: string;
  tagline: string;
  portraitSrc?: string;
  sprites?: HeroSprites;
  color: string;
  accent: string;
  weaponName: string;
  maxHp: number;
  speed: number;
  projectileDamage: number;
  projectileCooldown: number;
  projectileSpeed: number;
};

export type Enemy = {
  id: number;
  kind: EnemyId;
  position: Vec2;
  radius: number;
  hp: number;
  speed: number;
  damage: number;
  color: string;
  animTime: number;
  facingRight: boolean;
  hitTimer: number;
  behavior: EnemyBehavior;
  phaseTimer: number;
  chargeDirection: Vec2;
};

export type Projectile = {
  id: number;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  damage: number;
  ttl: number;
};

export type XpPickupId = 'xp-gem-blue' | 'xp-gem-purple-large';

export type SpecialPickupId =
  | 'special-magnet'
  | 'special-bomb'
  | 'special-chest'
  | 'special-book';

export type PickupId = XpPickupId | SpecialPickupId;

export type PickupDefinition = {
  id: PickupId;
  src: string;
  drawSize: number;
  radius: number;
  xp: number;
  gold: number;
  label: string;
  color: string;
};

export type Pickup = {
  id: number;
  kind: PickupId;
  position: Vec2;
  radius: number;
  xp: number;
};

export type UpgradeId = 'speed' | 'damage' | 'cooldown' | 'maxHp';

export type Upgrade = {
  id: UpgradeId;
  title: string;
  description: string;
};

export type InputState = {
  move: Vec2;
};

export type GameSnapshot = {
  hero: HeroDefinition;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNext: number;
  kills: number;
  gold: number;
  elapsed: number;
  running: boolean;
  pausedForUpgrade: boolean;
  gameOver: boolean;
  pendingUpgrades: Upgrade[];
};

export type RunSummary = {
  heroId: HeroId;
  heroName: string;
  elapsedSeconds: number;
  kills: number;
  gold: number;
  level: number;
  createdAt: string;
};

export type PlayerStats = {
  heroId: HeroId;
  heroName: string;
  runs: number;
  totalKills: number;
  totalGold: number;
  totalElapsedSeconds: number;
  bestLevel: number;
  bestKills: number;
  bestGold: number;
  bestElapsedSeconds: number;
  updatedAt: string;
};
