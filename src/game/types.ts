export type WeaponId =
  | 'star-throw'
  | 'web-pool'
  | 'orbit-toy'
  | 'pillow-pop'
  | 'marble-bounce'
  | 'watergun'
  | 'hot-wheels'
  | 'bad-food'
  | 'insomnia'
  | 'presents'
  | 'knife'
  | 'slippers'
  | 'machinegun';

export type PassiveId =
  | 'bright-stars'
  | 'sticky-socks'
  | 'bigger-toys'
  | 'cozy-blanket'
  | 'quick-hands'
  | 'speed'
  | 'maxHp';

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

export type StageId = 'koroni-kids-room' | 'zagka-beach';

export type BossId = 'grandpa' | 'sissy';

export type BossBehavior = 'chase' | 'tell' | 'attack' | 'recover';

export type EnemyId =
  | 'small-insect'
  | 'large-cockroach'
  | 'mother-slipper'
  | 'small-lago'
  | 'large-lago';

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
  | 'block-fort-wall'
  | 'beach-seaweed-green'
  | 'beach-seaweed-teal'
  | 'beach-seaweed-purple'
  | 'beach-tire'
  | 'beach-rocks';

export type BlockerDefinition = {
  id: BlockerId;
  src: string;
  drawSize: number;
  collision: Rect;
  fallbackColor?: string;
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
  portraitSrcSm?: string;
  sprites?: HeroSprites;
  color: string;
  accent: string;
  weaponName: string;
  startingWeaponId: WeaponId;
  maxHp: number;
  speed: number;
};

export type WeaponInstance = {
  id: WeaponId;
  level: number;
  cooldownTimer: number;
  evolved: boolean;
  burstShotsRemaining?: number;
  reloading?: boolean;
};

export type PassiveLevels = Partial<Record<PassiveId, number>>;

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
  slowTimer: number;
  slowMultiplier: number;
};

export type Boss = {
  id: number;
  kind: BossId;
  position: Vec2;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  color: string;
  animTime: number;
  facingRight: boolean;
  hitTimer: number;
  behavior: BossBehavior;
  phaseTimer: number;
  attackIndex: number;
  attackDirection: Vec2;
};

export type BossProjectileKind = 'hot-pan' | 'scooter' | 'mouse';

export type BossProjectile = {
  id: number;
  kind: BossProjectileKind;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  damage: number;
  ttl: number;
  animTime: number;
};

export type SonicWave = {
  id: number;
  position: Vec2;
  direction: Vec2;
  width: number;
  length: number;
  traveled: number;
  maxTravel: number;
  damage: number;
  ttl: number;
  animTime: number;
};

export type ProjectileKind =
  | 'star-throw'
  | 'web-pool'
  | 'pillow-pop'
  | 'marble-bounce'
  | 'watergun'
  | 'hot-wheels'
  | 'presents'
  | 'slippers'
  | 'machinegun';

export type Projectile = {
  id: number;
  kind: ProjectileKind;
  weaponId: WeaponId;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  damage: number;
  ttl: number;
  pierceRemaining: number;
  bouncesRemaining: number;
  hitEnemyIds: Set<number>;
  animTime: number;
  evolved: boolean;
  poolChance: number;
  poolRadius: number;
  poolDuration: number;
  slowStrength: number;
  tickDamage: number;
  pullStrength: number;
  finalSplit: boolean;
  splitDamageMultiplier: number;
};

export type WebPoolEffect = {
  id: number;
  weaponId: WeaponId;
  position: Vec2;
  radius: number;
  ttl: number;
  tickTimer: number;
  tickDamage: number;
  slowStrength: number;
  pullStrength: number;
  evolved: boolean;
  animTime: number;
};

export type OrbitToy = {
  id: number;
  weaponId: WeaponId;
  angle: number;
  orbitRadius: number;
  rotationSpeed: number;
  damage: number;
  hitDelay: number;
  drawSize: number;
  evolved: boolean;
  hitTimers: Map<number, number>;
  spriteIndex: number;
};

export type ExplosionEffect = {
  id: number;
  weaponId: WeaponId;
  position: Vec2;
  radius: number;
  damage: number;
  ttl: number;
  maxTtl: number;
  evolved: boolean;
  lingeringDuration: number;
  lingeringTickDamage: number;
};

export type LingeringPuff = {
  id: number;
  weaponId: WeaponId;
  position: Vec2;
  radius: number;
  ttl: number;
  tickTimer: number;
  tickDamage: number;
  evolved: boolean;
  animTime: number;
};

export type ConeEffect = {
  id: number;
  weaponId: WeaponId;
  origin: Vec2;
  direction: Vec2;
  range: number;
  halfAngle: number;
  damage: number;
  ttl: number;
  maxTtl: number;
  animTime: number;
};

export type TrailSegment = {
  id: number;
  weaponId: WeaponId;
  position: Vec2;
  radius: number;
  damage: number;
  ttl: number;
  tickTimer: number;
  animTime: number;
};

export type MeleeSlash = {
  id: number;
  weaponId: WeaponId;
  origin: Vec2;
  direction: Vec2;
  range: number;
  arcRadians: number;
  damage: number;
  ttl: number;
  maxTtl: number;
  hitEnemyIds: Set<number>;
  animTime: number;
};

export type HitSpark = {
  id: number;
  position: Vec2;
  ttl: number;
  maxTtl: number;
  spriteSrc: string;
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

export type UpgradeKind = 'weapon-new' | 'weapon-level' | 'passive';

export type Upgrade = {
  id: string;
  kind: UpgradeKind;
  weaponId?: WeaponId;
  passiveId?: PassiveId;
  title: string;
  description: string;
  iconSrc?: string;
};

export type InputState = {
  move: Vec2;
};

export type RunDurationMinutes = 3 | 6 | 9 | 12;

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
  remainingSeconds: number;
  durationSeconds: number;
  bossPhase: boolean;
  bossName: string | null;
  victory: boolean;
  running: boolean;
  pausedForUpgrade: boolean;
  gameOver: boolean;
  pendingUpgrades: Upgrade[];
  weapons: WeaponInstance[];
  newlyUnlockedWeaponId: WeaponId | null;
  developerMode: boolean;
  skipRunSave: boolean;
};

export type RunSummary = {
  heroId: HeroId;
  heroName: string;
  elapsedSeconds: number;
  kills: number;
  gold: number;
  level: number;
  victory: boolean;
  stageId: StageId;
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
