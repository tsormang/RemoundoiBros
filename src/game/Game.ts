import { getAnimationFrame } from '../render/animation';
import { loadImage, preloadImages } from '../render/assets';
import { drawSprite } from '../render/spriteRenderer';
import {
  allBossSpriteSources,
  createBossEntity,
  getBossDefinition,
  pickRandomBoss,
} from './bosses';
import {
  allBlockerSpriteSources,
  getBlockerDefinition,
  getBlockerWorldRect,
} from './blockers';
import {
  getDifficultyModifiers,
  type DifficultyId,
  type DifficultyModifiers,
} from './difficulty';
import { allEnemySpriteSources, getEnemyDefinition } from './enemies';
import {
  allPickupSpriteSources,
  getPickupDefinition,
  isSpecialPickup,
  isXpPickup,
  resolveEnemyDrop,
} from './pickups';
import {
  circleIntersectsRect,
  clamp,
  distanceSquared,
  findDensestClusterCenter,
  normalize,
  randomInt,
  randomRange,
  rectsOverlap,
  reflectVector,
  rotateVector,
} from './math';
import { allStageSpriteSources, getStageById, type StageDefinition } from './stages';
import type {
  Blocker,
  Boss,
  BossId,
  BossProjectile,
  ConeEffect,
  Enemy,
  ExplosionEffect,
  GameSnapshot,
  HeroDefinition,
  HitSpark,
  InputState,
  LingeringPuff,
  MeleeSlash,
  OrbitToy,
  PassiveLevels,
  Pickup,
  Projectile,
  SonicWave,
  StageId,
  TrailSegment,
  Upgrade,
  Vec2,
  WeaponId,
  WeaponInstance,
  WebPoolEffect,
} from './types';
import { loadHeroUnlocks, unlockRandomWeaponForHero } from './unlocks';
import { drawAttackUpgradeChoices } from './upgrades';
import {
  allWeaponSpriteSources,
  canEvolve,
  createWeaponInstance,
  getWeaponDefinition,
  getWeaponStats,
  MAX_WEAPON_LEVEL,
  type BadFoodStats,
  type HotWheelsStats,
  type InsomniaStats,
  type KnifeDirection,
  type KnifeStats,
  type MachinegunStats,
  type MarbleBounceStats,
  type PillowPopStats,
  type PresentsStats,
  type SlippersStats,
  type StarThrowStats,
  type WatergunStats,
  type WebPoolStats,
  weaponDefinitions,
} from './weapons';

type GameConfig = {
  width: number;
  height: number;
  hero: HeroDefinition;
  difficulty?: DifficultyId;
  stageId?: StageId;
  durationSeconds?: number;
  startingWeaponId?: WeaponId;
  developerMode?: boolean;
  skipToBoss?: BossId;
};

const PLAYER_RADIUS = 18;
const ARENA_PADDING = 28;
const DAMAGE_TICK_SECONDS = 0.42;
const HURT_FLASH_SECONDS = 0.28;
const ENEMY_HIT_FLASH_SECONDS = 0.18;
const BLOCKER_SPAWN_PADDING = 72;
const BLOCKER_PLAYER_CLEARANCE = 120;
const BLOCKER_OVERLAP_PADDING = 18;
const BOSS_GRANDPA_SPRITE_BASE = '/assets/sprites/enemies/boss_grandpa';
const BOSS_GRANDPA_PAN_FRAMES = [
  `${BOSS_GRANDPA_SPRITE_BASE}/boss_grandpa_pan_01.png`,
  `${BOSS_GRANDPA_SPRITE_BASE}/boss_grandpa_pan_02.png`,
];
const BOSS_GRANDPA_PAN_BURST_FRAMES = [
  `${BOSS_GRANDPA_SPRITE_BASE}/boss_grandpa_pan_burst_01.png`,
  `${BOSS_GRANDPA_SPRITE_BASE}/boss_grandpa_pan_burst_02.png`,
  `${BOSS_GRANDPA_SPRITE_BASE}/boss_grandpa_pan_burst_03.png`,
];
const BOSS_GRANDPA_PAN_SPLAT_SRC = `${BOSS_GRANDPA_SPRITE_BASE}/boss_grandpa_pan_splat_01.png`;
const BOSS_GRANDPA_SCOOTER_FRAMES = [
  `${BOSS_GRANDPA_SPRITE_BASE}/boss_grandpa_scooter_01.png`,
  `${BOSS_GRANDPA_SPRITE_BASE}/boss_grandpa_scooter_02.png`,
];
const BOSS_GRANDPA_SCOOTER_SPARK_SRC = `${BOSS_GRANDPA_SPRITE_BASE}/boss_grandpa_scooter_spark_01.png`;
const GEM_PULL_DISTANCE = 118;
const GEM_PULL_SPEED = 5.6;
const MAGNET_DURATION_SECONDS = 3;
const MAGNET_PULL_SPEED = 22;
const BOMB_RADIUS = 320;
const BOMB_FLASH_SECONDS = 0.45;
const MOTHER_SLIPPER_MIN_ELAPSED = 40;
const MOTHER_SLIPPER_CHANCE_MIN = 0.08;
const MOTHER_SLIPPER_CHANCE_MAX = 0.22;
const WEB_POOL_TICK_INTERVAL = 0.5;
const LINGERING_TICK_INTERVAL = 0.45;
const PROJECTILE_DRAW_SIZE = 32;
const POOL_DRAW_SIZE = 128;
const EXPLOSION_DRAW_SIZE = 96;
const PUFF_DRAW_SIZE = 88;
const HIT_SPARK_SECONDS = 0.22;

export class Game {
  private readonly hero: HeroDefinition;
  private readonly difficulty: DifficultyModifiers;
  private readonly stage: StageDefinition;
  private readonly durationSeconds: number;
  private readonly startingWeaponId: WeaponId;
  private readonly unlockedWeaponIds: Set<WeaponId>;
  private readonly developerMode: boolean;
  private readonly skipToBoss: BossId | null;
  private readonly world = { width: 0, height: 0 };
  private readonly player = {
    position: { x: 0, y: 0 },
    radius: PLAYER_RADIUS,
    hp: 1,
    maxHp: 1,
    speed: 1,
    facingRight: true,
    moving: false,
    animTime: 0,
  };

  private blockers: Blocker[] = [];
  private enemies: Enemy[] = [];
  private boss: Boss | null = null;
  private bossProjectiles: BossProjectile[] = [];
  private bossPanBursts: Array<{ id: number; position: Vec2; ttl: number; maxTtl: number; animTime: number }> = [];
  private sonicWaves: SonicWave[] = [];
  private projectiles: Projectile[] = [];
  private webPools: WebPoolEffect[] = [];
  private orbitToys: OrbitToy[] = [];
  private explosions: ExplosionEffect[] = [];
  private lingeringPuffs: LingeringPuff[] = [];
  private coneEffects: ConeEffect[] = [];
  private trailSegments: TrailSegment[] = [];
  private meleeSlashes: MeleeSlash[] = [];
  private hitSparks: HitSpark[] = [];
  private weapons: WeaponInstance[] = [];
  private passives: PassiveLevels = {};
  private pickups: Pickup[] = [];
  private pendingUpgrades: Upgrade[] = [];
  private nextEntityId = 1;
  private elapsed = 0;
  private spawnTimer = 0;
  private damageTimer = 0;
  private hurtTimer = 0;
  private magnetTimer = 0;
  private bombFlashTimer = 0;
  private bombFlashPosition: Vec2 = { x: 0, y: 0 };
  private insomniaDropTimer = 0;
  private bossPhase = false;
  private victory = false;
  private newlyUnlockedWeaponId: WeaponId | null = null;
  private xp = 0;
  private xpToNext = 5;
  private level = 1;
  private kills = 0;
  private gold = 0;
  private running = true;
  private gameOver = false;

  constructor(config: GameConfig) {
    this.hero = config.hero;
    this.difficulty = getDifficultyModifiers(config.difficulty ?? 'normal');
    this.stage = getStageById(config.stageId ?? 'koroni-kids-room');
    this.durationSeconds = config.durationSeconds ?? 180;
    this.startingWeaponId =
      config.startingWeaponId ?? this.hero.startingWeaponId;
    this.developerMode = Boolean(config.developerMode);
    this.skipToBoss = config.skipToBoss ?? null;
    this.unlockedWeaponIds = new Set(
      this.developerMode
        ? weaponDefinitions.map((weapon) => weapon.id)
        : loadHeroUnlocks(this.hero.id),
    );
    this.preloadSprites();
    this.resize(config.width, config.height);
    this.reset();
    if (this.skipToBoss) {
      this.enterBossPhase(this.skipToBoss);
    }
  }

  resize(width: number, height: number): void {
    this.world.width = width;
    this.world.height = height;
    this.player.position.x = clamp(
      this.player.position.x || width / 2,
      ARENA_PADDING,
      width - ARENA_PADDING,
    );
    this.player.position.y = clamp(
      this.player.position.y || height / 2,
      ARENA_PADDING,
      height - ARENA_PADDING,
    );
  }

  reset(): void {
    this.player.position = {
      x: this.world.width / 2,
      y: this.world.height / 2,
    };
    this.player.maxHp = this.hero.maxHp;
    this.player.hp = this.hero.maxHp;
    this.player.speed = this.hero.speed;
    this.player.facingRight = true;
    this.player.moving = false;
    this.player.animTime = 0;
    this.blockers = [];
    this.enemies = [];
    this.boss = null;
    this.bossProjectiles = [];
    this.bossPanBursts = [];
    this.sonicWaves = [];
    this.projectiles = [];
    this.webPools = [];
    this.orbitToys = [];
    this.explosions = [];
    this.lingeringPuffs = [];
    this.coneEffects = [];
    this.trailSegments = [];
    this.meleeSlashes = [];
    this.hitSparks = [];
    this.weapons = [createWeaponInstance(this.startingWeaponId)];
    this.passives = {};
    this.pickups = [];
    this.pendingUpgrades = [];
    this.elapsed = 0;
    this.spawnTimer = 1;
    this.damageTimer = 0;
    this.hurtTimer = 0;
    this.magnetTimer = 0;
    this.bombFlashTimer = 0;
    this.insomniaDropTimer = 0;
    this.bossPhase = false;
    this.victory = false;
    this.newlyUnlockedWeaponId = null;
    this.xp = 0;
    this.xpToNext = 5;
    this.level = 1;
    this.kills = 0;
    this.gold = 0;
    this.running = true;
    this.gameOver = false;
    this.syncOrbitToys();
    this.spawnBlockers();
  }

  update(deltaSeconds: number, input: InputState): void {
    if (!this.running || this.gameOver || this.victory || this.pendingUpgrades.length > 0) {
      return;
    }

    this.elapsed += deltaSeconds;
    this.hurtTimer = Math.max(0, this.hurtTimer - deltaSeconds);
    this.magnetTimer = Math.max(0, this.magnetTimer - deltaSeconds);
    this.bombFlashTimer = Math.max(0, this.bombFlashTimer - deltaSeconds);
    this.updatePlayer(deltaSeconds, input);

    if (!this.bossPhase && this.elapsed >= this.durationSeconds) {
      this.enterBossPhase();
    }

    if (!this.bossPhase) {
      this.spawnTimer -= deltaSeconds;
      this.damageTimer -= deltaSeconds;

      if (this.spawnTimer <= 0) {
        this.spawnEnemy();
        const progress = clamp(this.elapsed / this.durationSeconds, 0, 1);
        const earlyEase = clamp(1 - this.elapsed / 45, 0, 1);
        this.spawnTimer =
          (randomRange(0.55, 1.2) *
            (1 - progress * 0.35) *
            (1 + earlyEase * 0.95) *
            (1 - progress * 0.35)) /
          this.difficulty.spawnRate;
      }

      this.updateEnemies(deltaSeconds);
    } else {
      this.damageTimer -= deltaSeconds;
      this.updateBoss(deltaSeconds);
      this.updateBossProjectiles(deltaSeconds);
      this.updateBossPanBursts(deltaSeconds);
      this.updateSonicWaves(deltaSeconds);
    }

    this.updateWeapons(deltaSeconds);
    this.updateProjectiles(deltaSeconds);
    this.updateWebPools(deltaSeconds);
    this.updateOrbitToys(deltaSeconds);
    this.updateExplosions(deltaSeconds);
    this.updateLingeringPuffs(deltaSeconds);
    this.updateConeEffects(deltaSeconds);
    this.updateTrailSegments(deltaSeconds);
    this.updateMeleeSlashes(deltaSeconds);
    this.updateHitSparks(deltaSeconds);
    this.cullDefeatedEnemies();
    this.collectPickups();

    if (this.player.hp <= 0) {
      this.gameOver = true;
      this.running = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx);
    this.drawBlockers(ctx);
    this.drawWebPools(ctx);
    this.drawLingeringPuffs(ctx);
    this.drawTrailSegments(ctx);
    this.drawConeEffects(ctx);
    this.drawPickups(ctx);
    this.drawProjectiles(ctx);
    this.drawBossProjectiles(ctx);
    this.drawBossPanBursts(ctx);
    this.drawSonicWaves(ctx);
    this.drawExplosions(ctx);
    this.drawOrbitToys(ctx);
    this.drawMeleeSlashes(ctx);
    this.drawHitSparks(ctx);
    this.drawEnemies(ctx);
    this.drawBoss(ctx);
    this.drawPlayer(ctx);
    this.drawBombFlash(ctx);
  }

  chooseUpgrade(upgradeId: string): void {
    const selected = this.pendingUpgrades.find(
      (upgrade) => upgrade.id === upgradeId,
    );

    if (!selected) {
      return;
    }

    this.applyUpgrade(selected);
    this.pendingUpgrades = [];
    this.processLevelUps();
  }

  getSnapshot(): GameSnapshot {
    const remainingSeconds = Math.max(
      0,
      this.durationSeconds - this.elapsed,
    );

    return {
      hero: this.hero,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
      kills: this.kills,
      gold: this.gold,
      elapsed: this.elapsed,
      remainingSeconds,
      durationSeconds: this.durationSeconds,
      bossPhase: this.bossPhase,
      bossName: this.boss ? getBossDefinition(this.boss.kind).name : null,
      victory: this.victory,
      running: this.running,
      pausedForUpgrade: this.pendingUpgrades.length > 0,
      gameOver: this.gameOver,
      pendingUpgrades: this.pendingUpgrades,
      weapons: this.weapons.map((weapon) => ({ ...weapon })),
      newlyUnlockedWeaponId: this.newlyUnlockedWeaponId,
      developerMode: this.developerMode,
      skipRunSave: this.skipToBoss !== null,
    };
  }

  getRunSummary() {
    return {
      heroId: this.hero.id,
      heroName: this.hero.name,
      elapsedSeconds: Math.floor(this.elapsed),
      kills: this.kills,
      gold: this.gold,
      level: this.level,
      victory: this.victory,
      stageId: this.stage.id,
      createdAt: new Date().toISOString(),
    };
  }

  private updatePlayer(deltaSeconds: number, input: InputState): void {
    const move = normalize(input.move);
    this.player.moving = move.x !== 0 || move.y !== 0;

    if (this.player.moving) {
      this.player.animTime += deltaSeconds;

      if (Math.abs(move.x) > 0.01) {
        this.player.facingRight = move.x > 0;
      }
    } else {
      this.player.animTime = 0;
    }

    const nextX = clamp(
      this.player.position.x + move.x * this.player.speed * deltaSeconds,
      ARENA_PADDING,
      this.world.width - ARENA_PADDING,
    );
    const nextY = clamp(
      this.player.position.y + move.y * this.player.speed * deltaSeconds,
      ARENA_PADDING,
      this.world.height - ARENA_PADDING,
    );

    this.player.position = this.moveWithBlockers(
      this.player.position,
      { x: nextX, y: nextY },
      this.player.radius,
    );
  }

  private updateEnemies(deltaSeconds: number): void {
    for (const enemy of this.enemies) {
      enemy.animTime += deltaSeconds;
      enemy.hitTimer = Math.max(0, enemy.hitTimer - deltaSeconds);
      enemy.phaseTimer = Math.max(0, enemy.phaseTimer - deltaSeconds);
      enemy.slowTimer = Math.max(0, enemy.slowTimer - deltaSeconds);

      if (enemy.slowTimer <= 0) {
        enemy.slowMultiplier = 1;
      }

      const speedScale = enemy.slowMultiplier;
      const toPlayer = normalize({
        x: this.player.position.x - enemy.position.x,
        y: this.player.position.y - enemy.position.y,
      });

      if (enemy.kind === 'mother-slipper') {
        this.updateMotherSlipper(enemy, deltaSeconds, toPlayer, speedScale);
      } else {
        const next = {
          x: enemy.position.x + toPlayer.x * enemy.speed * speedScale * deltaSeconds,
          y: enemy.position.y + toPlayer.y * enemy.speed * speedScale * deltaSeconds,
        };
        enemy.position = this.moveWithBlockers(
          enemy.position,
          next,
          enemy.radius,
        );

        if (Math.abs(toPlayer.x) > 0.01) {
          enemy.facingRight = toPlayer.x > 0;
        }
      }

      const touchDistance = enemy.radius + this.player.radius;

      if (
        distanceSquared(enemy.position, this.player.position) <=
          touchDistance * touchDistance &&
        this.damageTimer <= 0
      ) {
        this.player.hp -= enemy.damage;
        this.damageTimer = DAMAGE_TICK_SECONDS;
        this.hurtTimer = HURT_FLASH_SECONDS;
      }
    }
  }

  private updateMotherSlipper(
    enemy: Enemy,
    deltaSeconds: number,
    toPlayer: Vec2,
    speedScale: number,
  ): void {
    const definition = getEnemyDefinition('mother-slipper');
    const tellDuration = definition.tellDuration ?? 0.45;
    const chargeDuration = definition.chargeDuration ?? 0.72;
    const recoverDuration = definition.recoverDuration ?? 0.85;
    const engageDistance = definition.engageDistance ?? 260;
    const chargeMultiplier = definition.chargeSpeedMultiplier ?? 3.1;

    if (enemy.behavior === 'chase') {
      const next = {
        x: enemy.position.x + toPlayer.x * enemy.speed * speedScale * deltaSeconds,
        y: enemy.position.y + toPlayer.y * enemy.speed * speedScale * deltaSeconds,
      };
      enemy.position = this.moveWithBlockers(
        enemy.position,
        next,
        enemy.radius,
      );

      if (Math.abs(toPlayer.x) > 0.01) {
        enemy.facingRight = toPlayer.x > 0;
      }

      if (
        enemy.phaseTimer <= 0 &&
        distanceSquared(enemy.position, this.player.position) <=
          engageDistance * engageDistance
      ) {
        enemy.behavior = 'tell';
        enemy.phaseTimer = tellDuration;
        enemy.chargeDirection = { ...toPlayer };
        if (Math.abs(toPlayer.x) > 0.01) {
          enemy.facingRight = toPlayer.x > 0;
        }
      }

      return;
    }

    if (enemy.behavior === 'tell') {
      if (Math.abs(toPlayer.x) > 0.01) {
        enemy.facingRight = toPlayer.x > 0;
        enemy.chargeDirection = { ...toPlayer };
      }

      if (enemy.phaseTimer <= 0) {
        enemy.behavior = 'charge';
        enemy.phaseTimer = chargeDuration;
      }

      return;
    }

    if (enemy.behavior === 'charge') {
      const chargeSpeed = enemy.speed * chargeMultiplier * speedScale;
      const next = {
        x:
          enemy.position.x +
          enemy.chargeDirection.x * chargeSpeed * deltaSeconds,
        y:
          enemy.position.y +
          enemy.chargeDirection.y * chargeSpeed * deltaSeconds,
      };
      enemy.position = this.moveWithBlockers(
        enemy.position,
        next,
        enemy.radius,
      );

      if (Math.abs(enemy.chargeDirection.x) > 0.01) {
        enemy.facingRight = enemy.chargeDirection.x > 0;
      }

      if (enemy.phaseTimer <= 0) {
        enemy.behavior = 'recover';
        enemy.phaseTimer = recoverDuration;
      }

      return;
    }

    const next = {
      x: enemy.position.x + toPlayer.x * enemy.speed * 0.45 * speedScale * deltaSeconds,
      y: enemy.position.y + toPlayer.y * enemy.speed * 0.45 * speedScale * deltaSeconds,
    };
    enemy.position = this.moveWithBlockers(enemy.position, next, enemy.radius);

    if (Math.abs(toPlayer.x) > 0.01) {
      enemy.facingRight = toPlayer.x > 0;
    }

    if (enemy.phaseTimer <= 0) {
      enemy.behavior = 'chase';
      enemy.phaseTimer = randomRange(0.35, 0.9);
    }
  }

  private updateWeapons(deltaSeconds: number): void {
    for (const weapon of this.weapons) {
      weapon.cooldownTimer = Math.max(0, weapon.cooldownTimer - deltaSeconds);

      if (weapon.cooldownTimer > 0) {
        continue;
      }

      const stats = getWeaponStats(weapon, this.passives);

      switch (stats.kind) {
        case 'star-throw':
          if (this.fireStarThrow(weapon, stats.stats)) {
            weapon.cooldownTimer = stats.stats.cooldown;
          }
          break;
        case 'web-pool':
          if (this.fireWebPool(weapon, stats.stats)) {
            weapon.cooldownTimer = stats.stats.cooldown;
          }
          break;
        case 'orbit-toy':
          this.syncOrbitToys();
          break;
        case 'pillow-pop':
          if (this.firePillowPop(weapon, stats.stats)) {
            weapon.cooldownTimer = stats.stats.cooldown;
          }
          break;
        case 'marble-bounce':
          if (this.fireMarbleBounce(weapon, stats.stats)) {
            weapon.cooldownTimer = stats.stats.cooldown;
          }
          break;
        case 'watergun':
          if (this.fireWatergun(weapon, stats.stats)) {
            weapon.cooldownTimer = stats.stats.cooldown;
          }
          break;
        case 'hot-wheels':
          if (this.fireHotWheels(weapon, stats.stats)) {
            weapon.cooldownTimer = stats.stats.cooldown;
          }
          break;
        case 'bad-food':
          if (this.fireBadFood(weapon, stats.stats)) {
            weapon.cooldownTimer = stats.stats.cooldown;
          }
          break;
        case 'insomnia':
          this.fireInsomnia(weapon, stats.stats, deltaSeconds);
          break;
        case 'presents':
          if (this.firePresents(weapon, stats.stats)) {
            weapon.cooldownTimer = stats.stats.cooldown;
          }
          break;
        case 'knife':
          if (this.fireKnife(weapon, stats.stats)) {
            weapon.cooldownTimer = stats.stats.cooldown;
          }
          break;
        case 'slippers':
          if (this.fireSlippers(weapon, stats.stats)) {
            weapon.cooldownTimer = stats.stats.cooldown;
          }
          break;
        case 'machinegun':
          this.fireMachinegun(weapon, stats.stats, deltaSeconds);
          break;
      }
    }
  }

  private fireStarThrow(
    weapon: WeaponInstance,
    stats: StarThrowStats,
  ): boolean {
    if (!this.hasCombatTargets()) {
      return false;
    }

    const baseDirection =
      this.findAimDirection() ??
      normalize({
        x: this.player.facingRight ? 1 : -1,
        y: 0,
      });

    const amount = stats.amount;
    const offsets =
      amount <= 1
        ? [0]
        : amount === 2
          ? [-stats.spreadRadians / 2, stats.spreadRadians / 2]
          : Array.from({ length: amount }, (_, index) => {
              const step = stats.spreadRadians / (amount - 1);
              return -stats.spreadRadians / 2 + step * index;
            });

    for (const offset of offsets) {
      const direction = rotateVector(baseDirection, offset);
      this.spawnProjectile({
        kind: 'star-throw',
        weaponId: weapon.id,
        position: { ...this.player.position },
        velocity: {
          x: direction.x * stats.speed,
          y: direction.y * stats.speed,
        },
        radius: stats.radius,
        damage: stats.damage,
        ttl: stats.ttl,
        pierceRemaining: stats.pierce,
        bouncesRemaining: 0,
        evolved: weapon.evolved,
      });
    }

    return true;
  }

  private fireWebPool(weapon: WeaponInstance, stats: WebPoolStats): boolean {
    if (!this.hasCombatTargets()) {
      return false;
    }

    const direction =
      this.findAimDirection() ??
      normalize({
        x: this.player.facingRight ? 1 : -1,
        y: 0,
      });

    this.spawnProjectile({
      kind: 'web-pool',
      weaponId: weapon.id,
      position: { ...this.player.position },
      velocity: {
        x: direction.x * stats.speed,
        y: direction.y * stats.speed,
      },
      radius: 8,
      damage: stats.impactDamage,
      ttl: 1.6,
      pierceRemaining: 0,
      bouncesRemaining: 0,
      evolved: weapon.evolved,
      poolChance: stats.poolChance,
      poolRadius: stats.poolRadius,
      poolDuration: stats.poolDuration,
      slowStrength: stats.slowStrength,
      tickDamage: stats.tickDamage,
      pullStrength: stats.pullStrength,
    });

    return true;
  }

  private firePillowPop(weapon: WeaponInstance, stats: PillowPopStats): boolean {
    const positions = this.enemies
      .filter(
        (enemy) =>
          distanceSquared(enemy.position, this.player.position) <=
          stats.targetingRange * stats.targetingRange,
      )
      .map((enemy) => enemy.position);

    const target = findDensestClusterCenter(positions, stats.blastRadius);

    if (!target) {
      return false;
    }

    const direction = normalize({
      x: target.x - this.player.position.x,
      y: target.y - this.player.position.y,
    });

    this.spawnProjectile({
      kind: 'pillow-pop',
      weaponId: weapon.id,
      position: { ...this.player.position },
      velocity: {
        x: direction.x * 420,
        y: direction.y * 420,
      },
      radius: stats.projectileRadius,
      damage: stats.explosionDamage,
      ttl: 0.85,
      pierceRemaining: 0,
      bouncesRemaining: 0,
      evolved: weapon.evolved,
      poolRadius: stats.blastRadius,
      poolDuration: stats.lingeringDuration,
      tickDamage: stats.lingeringTickDamage,
    });

    return true;
  }

  private fireMarbleBounce(
    weapon: WeaponInstance,
    stats: MarbleBounceStats,
  ): boolean {
    if (!this.hasCombatTargets()) {
      return false;
    }

    const direction =
      this.findAimDirection() ??
      normalize({
        x: this.player.facingRight ? 1 : -1,
        y: 0,
      });

    for (let index = 0; index < stats.amount; index += 1) {
      const spread = stats.amount > 1 ? (index - 0.5) * 0.18 : 0;
      const shotDirection = rotateVector(direction, spread);

      this.spawnProjectile({
        kind: 'marble-bounce',
        weaponId: weapon.id,
        position: { ...this.player.position },
        velocity: {
          x: shotDirection.x * stats.speed,
          y: shotDirection.y * stats.speed,
        },
        radius: stats.radius,
        damage: stats.damage,
        ttl: stats.ttl,
        pierceRemaining: 0,
        bouncesRemaining: stats.bounces,
        evolved: weapon.evolved,
        finalSplit: stats.finalSplit,
        splitDamageMultiplier: stats.splitDamageMultiplier,
      });
    }

    return true;
  }

  private hasCombatTargets(): boolean {
    return this.enemies.length > 0 || this.boss !== null;
  }

  private findAimDirection(): Vec2 | null {
    if (this.boss && this.boss.hp > 0) {
      return normalize({
        x: this.boss.position.x - this.player.position.x,
        y: this.boss.position.y - this.player.position.y,
      });
    }

    const target = this.findClosestEnemy();
    if (!target) {
      return null;
    }

    return normalize({
      x: target.position.x - this.player.position.x,
      y: target.position.y - this.player.position.y,
    });
  }

  private snapToAxis(direction: Vec2): Vec2 {
    if (Math.abs(direction.x) >= Math.abs(direction.y)) {
      return { x: direction.x >= 0 ? 1 : -1, y: 0 };
    }

    return { x: 0, y: direction.y >= 0 ? 1 : -1 };
  }

  private fireWatergun(weapon: WeaponInstance, stats: WatergunStats): boolean {
    const direction = this.findAimDirection();
    if (!direction) {
      return false;
    }

    this.coneEffects.push({
      id: this.nextEntityId++,
      weaponId: weapon.id,
      origin: { ...this.player.position },
      direction,
      range: stats.range,
      halfAngle: stats.halfAngle,
      damage: stats.damage,
      ttl: stats.duration,
      maxTtl: stats.duration,
      animTime: 0,
    });
    return true;
  }

  private fireHotWheels(weapon: WeaponInstance, stats: HotWheelsStats): boolean {
    const direction = this.findAimDirection();
    if (!direction) {
      return false;
    }

    const axisDirection = this.snapToAxis(direction);
    const lateral = { x: -axisDirection.y, y: axisDirection.x };

    for (let index = 0; index < stats.amount; index += 1) {
      const laneOffset =
        stats.amount > 1 ? (index - (stats.amount - 1) / 2) * (stats.radius * 2.4) : 0;
      this.spawnProjectile({
        kind: 'hot-wheels',
        weaponId: weapon.id,
        position: {
          x: this.player.position.x + lateral.x * laneOffset,
          y: this.player.position.y + lateral.y * laneOffset,
        },
        velocity: {
          x: axisDirection.x * stats.speed,
          y: axisDirection.y * stats.speed,
        },
        radius: stats.radius,
        damage: stats.damage,
        ttl: stats.ttl,
        pierceRemaining: stats.pierce,
        bouncesRemaining: 0,
        evolved: false,
      });
    }
    return true;
  }

  private fireBadFood(weapon: WeaponInstance, stats: BadFoodStats): boolean {
    this.lingeringPuffs.push({
      id: this.nextEntityId++,
      weaponId: weapon.id,
      position: { ...this.player.position },
      radius: stats.radius,
      ttl: stats.duration,
      tickTimer: 0,
      tickDamage: stats.tickDamage,
      evolved: false,
      animTime: 0,
    });
    return true;
  }

  private fireInsomnia(
    weapon: WeaponInstance,
    stats: InsomniaStats,
    deltaSeconds: number,
  ): void {
    if (!this.player.moving) {
      this.insomniaDropTimer = 0;
      return;
    }

    this.insomniaDropTimer -= deltaSeconds;
    if (this.insomniaDropTimer > 0) {
      return;
    }

    this.insomniaDropTimer = stats.dropInterval;
    this.trailSegments.push({
      id: this.nextEntityId++,
      weaponId: weapon.id,
      position: { ...this.player.position },
      radius: stats.radius,
      damage: stats.damage,
      ttl: stats.duration,
      tickTimer: 0,
      animTime: 0,
    });
  }

  private firePresents(weapon: WeaponInstance, stats: PresentsStats): boolean {
    const direction = this.findAimDirection();
    if (!direction) {
      return false;
    }

    this.spawnProjectile({
      kind: 'presents',
      weaponId: weapon.id,
      position: { ...this.player.position },
      velocity: {
        x: direction.x * stats.speed,
        y: direction.y * stats.speed,
      },
      radius: stats.projectileRadius,
      damage: stats.damage,
      ttl: stats.fuseSeconds,
      pierceRemaining: 0,
      bouncesRemaining: 0,
      evolved: false,
      poolRadius: stats.blastRadius,
    });
    return true;
  }

  private resolveKnifeDirection(direction: KnifeDirection): Vec2 {
    const facing = this.player.facingRight ? 1 : -1;

    switch (direction) {
      case 'front':
        return normalize({ x: facing, y: 0 });
      case 'up':
        return { x: 0, y: -1 };
      case 'down':
        return { x: 0, y: 1 };
      case 'back':
      default:
        return normalize({ x: -facing, y: 0 });
    }
  }

  private fireKnife(weapon: WeaponInstance, stats: KnifeStats): boolean {
    for (const knifeDirection of stats.directions) {
      const direction = this.resolveKnifeDirection(knifeDirection);
      this.meleeSlashes.push({
        id: this.nextEntityId++,
        weaponId: weapon.id,
        origin: { ...this.player.position },
        direction,
        range: stats.range,
        arcRadians: stats.arcRadians,
        damage: stats.damage,
        ttl: stats.duration,
        maxTtl: stats.duration,
        hitEnemyIds: new Set<number>(),
        animTime: 0,
      });
    }
    return true;
  }

  private fireSlippers(weapon: WeaponInstance, stats: SlippersStats): boolean {
    const direction = this.findAimDirection();
    if (!direction) {
      return false;
    }

    for (let index = 0; index < stats.amount; index += 1) {
      const spread = stats.amount > 1 ? (index - 0.5) * 0.15 : 0;
      const shotDirection = rotateVector(direction, spread);
      this.spawnProjectile({
        kind: 'slippers',
        weaponId: weapon.id,
        position: { ...this.player.position },
        velocity: {
          x: shotDirection.x * stats.speed,
          y: shotDirection.y * stats.speed,
        },
        radius: stats.radius,
        damage: stats.damage,
        ttl: stats.ttl,
        pierceRemaining: 0,
        bouncesRemaining: 0,
        evolved: false,
      });
    }
    return true;
  }

  private fireMachinegun(
    weapon: WeaponInstance,
    stats: MachinegunStats,
    deltaSeconds: number,
  ): void {
    if (weapon.reloading) {
      weapon.cooldownTimer = Math.max(0, weapon.cooldownTimer - deltaSeconds);
      if (weapon.cooldownTimer <= 0) {
        weapon.reloading = false;
        weapon.burstShotsRemaining = stats.shotsPerBurst;
      }
      return;
    }

    if (weapon.burstShotsRemaining === undefined) {
      weapon.burstShotsRemaining = stats.shotsPerBurst;
    }

    weapon.cooldownTimer = Math.max(0, weapon.cooldownTimer - deltaSeconds);
    if (weapon.cooldownTimer > 0) {
      return;
    }

    const direction = this.findAimDirection();
    if (!direction) {
      return;
    }

    this.spawnProjectile({
      kind: 'machinegun',
      weaponId: weapon.id,
      position: { ...this.player.position },
      velocity: {
        x: direction.x * stats.speed,
        y: direction.y * stats.speed,
      },
      radius: stats.radius,
      damage: stats.damage,
      ttl: stats.ttl,
      pierceRemaining: 0,
      bouncesRemaining: 0,
      evolved: false,
    });
    this.spawnMuzzleFlash(weapon.id, direction);

    weapon.burstShotsRemaining = (weapon.burstShotsRemaining ?? 0) - 1;
    weapon.cooldownTimer = stats.fireInterval;

    if (weapon.burstShotsRemaining <= 0) {
      weapon.reloading = true;
      weapon.cooldownTimer = stats.reloadCooldown;
      weapon.burstShotsRemaining = undefined;
    }
  }

  private spawnProjectile(
    config: Pick<
      Projectile,
      | 'kind'
      | 'weaponId'
      | 'position'
      | 'velocity'
      | 'radius'
      | 'damage'
      | 'ttl'
      | 'pierceRemaining'
      | 'bouncesRemaining'
      | 'evolved'
    > &
      Partial<
        Pick<
          Projectile,
          | 'poolChance'
          | 'poolRadius'
          | 'poolDuration'
          | 'slowStrength'
          | 'tickDamage'
          | 'pullStrength'
          | 'finalSplit'
          | 'splitDamageMultiplier'
        >
      >,
  ): void {
    this.projectiles.push({
      id: this.nextEntityId++,
      hitEnemyIds: new Set<number>(),
      animTime: 0,
      poolChance: 0,
      poolRadius: 0,
      poolDuration: 0,
      slowStrength: 0,
      tickDamage: 0,
      pullStrength: 0,
      finalSplit: false,
      splitDamageMultiplier: 0.5,
      ...config,
    });
  }

  private updateProjectiles(deltaSeconds: number): void {
    for (const projectile of this.projectiles) {
      projectile.position.x += projectile.velocity.x * deltaSeconds;
      projectile.position.y += projectile.velocity.y * deltaSeconds;
      projectile.ttl -= deltaSeconds;
      projectile.animTime += deltaSeconds;

      if (projectile.ttl <= 0) {
        if (projectile.kind === 'pillow-pop' || projectile.kind === 'presents') {
          this.spawnExplosion(
            projectile.weaponId,
            projectile.position,
            projectile.damage,
            projectile.poolRadius,
            projectile.evolved,
            projectile.poolDuration,
            projectile.tickDamage,
          );
        }
        continue;
      }

      if (this.collidesWithBlockers(projectile.position, projectile.radius)) {
        if (projectile.kind === 'marble-bounce' && projectile.bouncesRemaining > 0) {
          this.bounceProjectileOffBlockers(projectile);
        } else {
          projectile.ttl = 0;
        }
      }
    }

    for (const projectile of this.projectiles) {
      if (projectile.ttl <= 0) {
        continue;
      }

      for (const enemy of this.enemies) {
        if (enemy.hp <= 0 || projectile.hitEnemyIds.has(enemy.id)) {
          continue;
        }

        const hitDistance = projectile.radius + enemy.radius;

        if (
          distanceSquared(projectile.position, enemy.position) >
          hitDistance * hitDistance
        ) {
          continue;
        }

        this.applyDamage(enemy, projectile.damage);
        projectile.hitEnemyIds.add(enemy.id);
        this.spawnHitSpark(projectile.weaponId, enemy.position);

        if (projectile.kind === 'web-pool') {
          if (Math.random() < projectile.poolChance) {
            this.spawnWebPool(
              projectile.weaponId,
              enemy.position,
              projectile.poolRadius,
              projectile.poolDuration,
              projectile.tickDamage,
              projectile.slowStrength,
              projectile.pullStrength,
              projectile.evolved,
            );
          }
          projectile.ttl = 0;
          continue;
        }

        if (projectile.kind === 'pillow-pop') {
          this.spawnExplosion(
            projectile.weaponId,
            enemy.position,
            projectile.damage,
            projectile.poolRadius,
            projectile.evolved,
            projectile.poolDuration,
            projectile.tickDamage,
          );
          projectile.ttl = 0;
          continue;
        }

        if (projectile.kind === 'marble-bounce') {
          if (projectile.bouncesRemaining > 0) {
            projectile.bouncesRemaining -= 1;

            if (
              projectile.bouncesRemaining === 0 &&
              projectile.finalSplit
            ) {
              this.splitMarble(projectile);
            }

            const nextTarget = this.findNearestEnemy(
              enemy.position,
              projectile.hitEnemyIds,
            );

            if (nextTarget) {
              const direction = normalize({
                x: nextTarget.position.x - projectile.position.x,
                y: nextTarget.position.y - projectile.position.y,
              });
              const speed = Math.hypot(
                projectile.velocity.x,
                projectile.velocity.y,
              );
              projectile.velocity = {
                x: direction.x * speed,
                y: direction.y * speed,
              };
            } else {
              projectile.velocity = reflectVector(
                projectile.velocity,
                normalize({
                  x: this.player.position.x - enemy.position.x,
                  y: this.player.position.y - enemy.position.y,
                }),
              );
            }
          } else {
            projectile.ttl = 0;
          }
          continue;
        }

        if (projectile.pierceRemaining > 0) {
          projectile.pierceRemaining -= 1;

          if (
            projectile.kind === 'star-throw' &&
            projectile.evolved &&
            Math.random() < 0.15
          ) {
            const direction = normalize(projectile.velocity);
            this.spawnProjectile({
              kind: 'star-throw',
              weaponId: projectile.weaponId,
              position: { ...projectile.position },
              velocity: rotateVector(
                {
                  x: direction.x * Math.hypot(projectile.velocity.x, projectile.velocity.y),
                  y: direction.y * Math.hypot(projectile.velocity.x, projectile.velocity.y),
                },
                randomRange(-0.5, 0.5),
              ),
              radius: projectile.radius,
              damage: projectile.damage * 0.6,
              ttl: projectile.ttl,
              pierceRemaining: 1,
              bouncesRemaining: 0,
              evolved: true,
            });
          }
        } else {
          projectile.ttl = 0;
        }
      }

      if (
        this.boss &&
        this.boss.hp > 0 &&
        !projectile.hitEnemyIds.has(-1)
      ) {
        const bossHitDistance = projectile.radius + this.boss.radius;
        if (
          distanceSquared(projectile.position, this.boss.position) <=
          bossHitDistance * bossHitDistance
        ) {
          this.applyBossDamage(projectile.damage);
          projectile.hitEnemyIds.add(-1);
          this.spawnHitSpark(projectile.weaponId, this.boss.position);

          if (projectile.kind === 'presents') {
            this.spawnExplosion(
              projectile.weaponId,
              this.boss.position,
              projectile.damage,
              projectile.poolRadius,
              false,
              0,
              0,
            );
            projectile.ttl = 0;
          } else if (
            projectile.kind === 'hot-wheels' ||
            projectile.kind === 'star-throw'
          ) {
            if (projectile.pierceRemaining > 0) {
              projectile.pierceRemaining -= 1;
            } else {
              projectile.ttl = 0;
            }
          } else {
            projectile.ttl = 0;
          }
        }
      }
    }

    this.projectiles = this.projectiles.filter(
      (projectile) => projectile.ttl > 0,
    );
  }

  private bounceProjectileOffBlockers(projectile: Projectile): void {
    projectile.bouncesRemaining -= 1;
    projectile.velocity = {
      x: -projectile.velocity.x,
      y: -projectile.velocity.y,
    };

    if (projectile.bouncesRemaining === 0 && projectile.finalSplit) {
      this.splitMarble(projectile);
    }
  }

  private splitMarble(projectile: Projectile): void {
    const speed = Math.hypot(projectile.velocity.x, projectile.velocity.y);
    const baseAngle = Math.atan2(projectile.velocity.y, projectile.velocity.x);

    for (const offset of [-0.45, 0.45]) {
      const angle = baseAngle + offset;
      this.spawnProjectile({
        kind: 'marble-bounce',
        weaponId: projectile.weaponId,
        position: { ...projectile.position },
        velocity: {
          x: Math.cos(angle) * speed * 0.85,
          y: Math.sin(angle) * speed * 0.85,
        },
        radius: projectile.radius * 0.75,
        damage: projectile.damage * projectile.splitDamageMultiplier,
        ttl: projectile.ttl,
        pierceRemaining: 0,
        bouncesRemaining: 1,
        evolved: projectile.evolved,
      });
    }
  }

  private spawnWebPool(
    weaponId: WeaponInstance['id'],
    position: Vec2,
    radius: number,
    duration: number,
    tickDamage: number,
    slowStrength: number,
    pullStrength: number,
    evolved: boolean,
  ): void {
    this.webPools.push({
      id: this.nextEntityId++,
      weaponId,
      position: { ...position },
      radius,
      ttl: duration,
      tickTimer: 0,
      tickDamage,
      slowStrength,
      pullStrength,
      evolved,
      animTime: 0,
    });
  }

  private updateWebPools(deltaSeconds: number): void {
    for (const pool of this.webPools) {
      pool.ttl -= deltaSeconds;
      pool.animTime += deltaSeconds;
      pool.tickTimer += deltaSeconds;

      for (const enemy of this.enemies) {
        if (enemy.hp <= 0) {
          continue;
        }

        const distance = distanceSquared(enemy.position, pool.position);
        const limit = pool.radius + enemy.radius;

        if (distance > limit * limit) {
          continue;
        }

        enemy.slowTimer = Math.max(enemy.slowTimer, 0.35);
        enemy.slowMultiplier = Math.min(
          enemy.slowMultiplier,
          1 - pool.slowStrength,
        );

        if (pool.pullStrength > 0) {
          const direction = normalize({
            x: pool.position.x - enemy.position.x,
            y: pool.position.y - enemy.position.y,
          });
          enemy.position.x += direction.x * pool.pullStrength * deltaSeconds;
          enemy.position.y += direction.y * pool.pullStrength * deltaSeconds;
        }
      }

      if (pool.tickTimer >= WEB_POOL_TICK_INTERVAL) {
        pool.tickTimer = 0;

        for (const enemy of this.enemies) {
          if (enemy.hp <= 0) {
            continue;
          }

          const limit = pool.radius + enemy.radius;
          if (
            distanceSquared(enemy.position, pool.position) <= limit * limit
          ) {
            this.applyDamage(enemy, pool.tickDamage);
          }
        }

        this.damageBossInRadius(pool.position, pool.radius, pool.tickDamage);
      }
    }

    this.webPools = this.webPools.filter((pool) => pool.ttl > 0);
  }

  private syncOrbitToys(): void {
    const weapon = this.weapons.find((entry) => entry.id === 'orbit-toy');

    if (!weapon) {
      this.orbitToys = [];
      return;
    }

    const stats = getWeaponStats(weapon, this.passives);

    if (stats.kind !== 'orbit-toy') {
      return;
    }

    while (this.orbitToys.length < stats.stats.count) {
      const index = this.orbitToys.length;
      this.orbitToys.push({
        id: this.nextEntityId++,
        weaponId: weapon.id,
        angle: (Math.PI * 2 * index) / stats.stats.count,
        orbitRadius: stats.stats.orbitRadius,
        rotationSpeed: stats.stats.rotationSpeed,
        damage: stats.stats.damage,
        hitDelay: stats.stats.hitDelay,
        drawSize: stats.stats.drawSize,
        evolved: weapon.evolved,
        hitTimers: new Map<number, number>(),
        spriteIndex: index,
      });
    }

    while (this.orbitToys.length > stats.stats.count) {
      this.orbitToys.pop();
    }

    for (const toy of this.orbitToys) {
      toy.orbitRadius = stats.stats.orbitRadius;
      toy.rotationSpeed = stats.stats.rotationSpeed;
      toy.damage = stats.stats.damage;
      toy.hitDelay = stats.stats.hitDelay;
      toy.drawSize = stats.stats.drawSize;
      toy.evolved = weapon.evolved;
    }
  }

  private updateOrbitToys(deltaSeconds: number): void {
    this.syncOrbitToys();

    for (const toy of this.orbitToys) {
      toy.angle += (toy.rotationSpeed * Math.PI) / 180 * deltaSeconds;

      const position = {
        x: this.player.position.x + Math.cos(toy.angle) * toy.orbitRadius,
        y: this.player.position.y + Math.sin(toy.angle) * toy.orbitRadius,
      };

      for (const [enemyId, timer] of toy.hitTimers) {
        const nextTimer = timer - deltaSeconds;
        if (nextTimer <= 0) {
          toy.hitTimers.delete(enemyId);
        } else {
          toy.hitTimers.set(enemyId, nextTimer);
        }
      }

      for (const enemy of this.enemies) {
        if (enemy.hp <= 0 || toy.hitTimers.has(enemy.id)) {
          continue;
        }

        const hitDistance = enemy.radius + toy.drawSize * 0.35;

        if (
          distanceSquared(position, enemy.position) >
          hitDistance * hitDistance
        ) {
          continue;
        }

        this.applyDamage(enemy, toy.damage);
        toy.hitTimers.set(enemy.id, toy.hitDelay);
        this.spawnHitSpark(toy.weaponId, enemy.position);
      }

      if (this.boss && this.boss.hp > 0 && !toy.hitTimers.has(-1)) {
        const hitDistance = this.boss.radius + toy.drawSize * 0.35;
        if (
          distanceSquared(position, this.boss.position) <=
          hitDistance * hitDistance
        ) {
          this.applyBossDamage(toy.damage);
          toy.hitTimers.set(-1, toy.hitDelay);
          this.spawnHitSpark(toy.weaponId, this.boss.position);
        }
      }
    }
  }

  private spawnExplosion(
    weaponId: WeaponInstance['id'],
    position: Vec2,
    damage: number,
    radius: number,
    evolved: boolean,
    lingeringDuration: number,
    lingeringTickDamage: number,
  ): void {
    this.explosions.push({
      id: this.nextEntityId++,
      weaponId,
      position: { ...position },
      radius,
      damage,
      ttl: 0.28,
      maxTtl: 0.28,
      evolved,
      lingeringDuration,
      lingeringTickDamage,
    });

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) {
        continue;
      }

      const limit = radius + enemy.radius;
      if (distanceSquared(enemy.position, position) <= limit * limit) {
        this.applyDamage(enemy, damage);
      }
    }

    this.damageBossInRadius(position, radius, damage);

    if (lingeringDuration > 0) {
      this.lingeringPuffs.push({
        id: this.nextEntityId++,
        weaponId,
        position: { ...position },
        radius: radius * 0.85,
        ttl: lingeringDuration,
        tickTimer: 0,
        tickDamage: lingeringTickDamage,
        evolved,
        animTime: 0,
      });
    }
  }

  private updateExplosions(deltaSeconds: number): void {
    for (const explosion of this.explosions) {
      explosion.ttl -= deltaSeconds;
    }

    this.explosions = this.explosions.filter(
      (explosion) => explosion.ttl > 0,
    );
  }

  private updateLingeringPuffs(deltaSeconds: number): void {
    for (const puff of this.lingeringPuffs) {
      puff.ttl -= deltaSeconds;
      puff.animTime += deltaSeconds;
      puff.tickTimer += deltaSeconds;

      if (puff.tickTimer < LINGERING_TICK_INTERVAL) {
        continue;
      }

      puff.tickTimer = 0;

      for (const enemy of this.enemies) {
        if (enemy.hp <= 0) {
          continue;
        }

        const limit = puff.radius + enemy.radius;
        if (distanceSquared(enemy.position, puff.position) <= limit * limit) {
          this.applyDamage(enemy, puff.tickDamage);
        }
      }

      this.damageBossInRadius(puff.position, puff.radius, puff.tickDamage);
    }

    this.lingeringPuffs = this.lingeringPuffs.filter((puff) => puff.ttl > 0);
  }

  private updateConeEffects(deltaSeconds: number): void {
    for (const cone of this.coneEffects) {
      cone.ttl -= deltaSeconds;
      cone.animTime += deltaSeconds;

      for (const enemy of this.enemies) {
        if (enemy.hp <= 0) {
          continue;
        }

        if (this.isInCone(cone, enemy.position, enemy.radius)) {
          this.applyDamage(enemy, cone.damage);
        }
      }

      if (this.boss && this.boss.hp > 0) {
        if (this.isInCone(cone, this.boss.position, this.boss.radius)) {
          this.applyBossDamage(cone.damage);
        }
      }
    }

    this.coneEffects = this.coneEffects.filter((cone) => cone.ttl > 0);
  }

  private isInCone(
    cone: ConeEffect,
    target: Vec2,
    targetRadius: number,
  ): boolean {
    const toTarget = {
      x: target.x - cone.origin.x,
      y: target.y - cone.origin.y,
    };
    const distance = Math.hypot(toTarget.x, toTarget.y);
    if (distance > cone.range + targetRadius) {
      return false;
    }

    const direction = normalize(toTarget);
    const dot =
      direction.x * cone.direction.x + direction.y * cone.direction.y;
    return dot >= Math.cos(cone.halfAngle);
  }

  private updateTrailSegments(deltaSeconds: number): void {
    for (const segment of this.trailSegments) {
      segment.ttl -= deltaSeconds;
      segment.animTime += deltaSeconds;

      for (const enemy of this.enemies) {
        if (enemy.hp <= 0) {
          continue;
        }

        const limit = segment.radius + enemy.radius;
        if (
          distanceSquared(enemy.position, segment.position) <= limit * limit
        ) {
          this.applyDamage(enemy, segment.damage);
        }
      }

      this.damageBossInRadius(
        segment.position,
        segment.radius,
        segment.damage,
      );
    }

    this.trailSegments = this.trailSegments.filter(
      (segment) => segment.ttl > 0,
    );
  }

  private updateMeleeSlashes(deltaSeconds: number): void {
    for (const slash of this.meleeSlashes) {
      slash.ttl -= deltaSeconds;
      slash.animTime += deltaSeconds;

      const hitPoint = {
        x: slash.origin.x + slash.direction.x * slash.range * 0.65,
        y: slash.origin.y + slash.direction.y * slash.range * 0.65,
      };

      for (const enemy of this.enemies) {
        if (enemy.hp <= 0 || slash.hitEnemyIds.has(enemy.id)) {
          continue;
        }

        const limit = slash.range * 0.5 + enemy.radius;
        if (distanceSquared(hitPoint, enemy.position) <= limit * limit) {
          this.applyDamage(enemy, slash.damage);
          slash.hitEnemyIds.add(enemy.id);
          this.spawnHitSpark(slash.weaponId, enemy.position);
        }
      }

      if (this.boss && this.boss.hp > 0 && !slash.hitEnemyIds.has(-1)) {
        const limit = slash.range * 0.5 + this.boss.radius;
        if (distanceSquared(hitPoint, this.boss.position) <= limit * limit) {
          this.applyBossDamage(slash.damage);
          slash.hitEnemyIds.add(-1);
          this.spawnHitSpark(slash.weaponId, this.boss.position);
        }
      }
    }

    this.meleeSlashes = this.meleeSlashes.filter((slash) => slash.ttl > 0);
  }

  private damageBossInRadius(
    center: Vec2,
    radius: number,
    damage: number,
  ): void {
    if (!this.boss || this.boss.hp <= 0) {
      return;
    }

    const limit = radius + this.boss.radius;
    if (distanceSquared(center, this.boss.position) <= limit * limit) {
      this.applyBossDamage(damage);
    }
  }

  private spawnHitSpark(weaponId: WeaponInstance['id'], position: Vec2): void {
    const sprites = getWeaponDefinition(weaponId).sprites;
    const spriteSrc =
      sprites.hit?.[0] ??
      sprites.orbitHit ??
      sprites.bounceSpark ??
      sprites.projectile?.[0];

    if (!spriteSrc) {
      return;
    }

    this.hitSparks.push({
      id: this.nextEntityId++,
      position: { ...position },
      ttl: HIT_SPARK_SECONDS,
      maxTtl: HIT_SPARK_SECONDS,
      spriteSrc,
    });
  }

  private spawnMuzzleFlash(weaponId: WeaponInstance['id'], direction: Vec2): void {
    const frames = getWeaponDefinition(weaponId).sprites.muzzle;
    if (!frames || frames.length === 0) {
      return;
    }

    this.hitSparks.push({
      id: this.nextEntityId++,
      position: {
        x: this.player.position.x + direction.x * 22,
        y: this.player.position.y + direction.y * 22,
      },
      ttl: 0.08,
      maxTtl: 0.08,
      spriteSrc: frames[Math.floor(this.elapsed * 20) % frames.length],
    });
  }

  private updateHitSparks(deltaSeconds: number): void {
    for (const spark of this.hitSparks) {
      spark.ttl -= deltaSeconds;
    }

    this.hitSparks = this.hitSparks.filter((spark) => spark.ttl > 0);
  }

  private applyDamage(enemy: Enemy, amount: number): void {
    if (enemy.hp <= 0) {
      return;
    }

    enemy.hp -= amount;
    enemy.hitTimer = ENEMY_HIT_FLASH_SECONDS;
  }

  private applyBossDamage(amount: number): void {
    if (!this.boss || this.boss.hp <= 0) {
      return;
    }

    this.boss.hp -= amount;
    this.boss.hitTimer = ENEMY_HIT_FLASH_SECONDS;

    if (this.boss.hp <= 0) {
      this.defeatBoss();
    }
  }

  private cullDefeatedEnemies(): void {
    const defeated = this.enemies.filter((enemy) => enemy.hp <= 0);

    for (const enemy of defeated) {
      this.defeatEnemy(enemy, true);
    }

    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
  }

  private defeatEnemy(enemy: Enemy, allowSpecial: boolean): void {
    this.kills += 1;
    this.gold += getEnemyDefinition(enemy.kind).gold;
    const existingSpecials = new Set(
      this.pickups
        .map((pickup) => pickup.kind)
        .filter(isSpecialPickup),
    );
    const pickupId = resolveEnemyDrop(
      enemy.kind,
      this.level,
      allowSpecial,
      existingSpecials,
    );

    if (!pickupId) {
      return;
    }

    const pickup = getPickupDefinition(pickupId);
    this.pickups.push({
      id: this.nextEntityId++,
      kind: pickup.id,
      position: { ...enemy.position },
      radius: pickup.radius,
      xp: pickup.xp,
    });
  }

  private collectPickups(): void {
    const collected: Pickup[] = [];
    const magnetActive = this.magnetTimer > 0;
    const pullDistance = magnetActive
      ? Number.POSITIVE_INFINITY
      : GEM_PULL_DISTANCE;
    const pullSpeed = magnetActive ? MAGNET_PULL_SPEED : GEM_PULL_SPEED;

    for (const pickup of this.pickups) {
      const collectDistance = this.player.radius + pickup.radius;
      const distanceToPlayer = Math.sqrt(
        distanceSquared(this.player.position, pickup.position),
      );

      if (distanceToPlayer <= collectDistance) {
        collected.push(pickup);
        continue;
      }

      const canPull = isXpPickup(pickup.kind);
      if (canPull && distanceToPlayer <= pullDistance) {
        const direction = normalize({
          x: this.player.position.x - pickup.position.x,
          y: this.player.position.y - pickup.position.y,
        });
        pickup.position.x += direction.x * pullSpeed;
        pickup.position.y += direction.y * pullSpeed;
      }
    }

    if (collected.length === 0) {
      return;
    }

    const collectedIds = new Set(collected.map((pickup) => pickup.id));
    this.pickups = this.pickups.filter(
      (pickup) => !collectedIds.has(pickup.id),
    );

    for (const pickup of collected) {
      if (isXpPickup(pickup.kind)) {
        this.xp += pickup.xp;
        continue;
      }

      if (isSpecialPickup(pickup.kind)) {
        this.applySpecialPickup(pickup.kind);
      }
    }

    this.processLevelUps();
  }

  private applySpecialPickup(kind: Pickup['kind']): void {
    if (kind === 'special-magnet') {
      this.magnetTimer = MAGNET_DURATION_SECONDS;
      return;
    }

    if (kind === 'special-bomb') {
      this.detonateBomb(this.player.position);
      return;
    }

    if (kind === 'special-chest') {
      this.gold += getPickupDefinition(kind).gold;
      return;
    }

    if (kind === 'special-book') {
      this.xp += this.xpToNext;
    }
  }

  private detonateBomb(center: Vec2): void {
    this.bombFlashPosition = { ...center };
    this.bombFlashTimer = BOMB_FLASH_SECONDS;
    const radiusSquared = BOMB_RADIUS * BOMB_RADIUS;
    const defeated: Enemy[] = [];

    for (const enemy of this.enemies) {
      if (distanceSquared(enemy.position, center) <= radiusSquared) {
        enemy.hp = 0;
        defeated.push(enemy);
      }
    }

    for (const enemy of defeated) {
      this.defeatEnemy(enemy, false);
    }

    if (this.boss && this.boss.hp > 0) {
      if (distanceSquared(this.boss.position, center) <= radiusSquared) {
        this.applyBossDamage(this.boss.maxHp * 0.15);
      }
    }

    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
  }

  private applyUpgrade(upgrade: Upgrade): void {
    if (upgrade.kind === 'weapon-new' && upgrade.weaponId) {
      this.weapons.push(createWeaponInstance(upgrade.weaponId));
      this.syncOrbitToys();
      return;
    }

    if (upgrade.kind === 'weapon-level' && upgrade.weaponId) {
      const weapon = this.weapons.find((entry) => entry.id === upgrade.weaponId);

      if (weapon && weapon.level < MAX_WEAPON_LEVEL) {
        weapon.level += 1;

        if (canEvolve(weapon, this.passives)) {
          weapon.evolved = true;
        }
      }

      this.syncOrbitToys();
      return;
    }

    if (upgrade.kind === 'passive' && upgrade.passiveId) {
      const passiveId = upgrade.passiveId;

      if (passiveId === 'speed') {
        this.player.speed *= 1.12;
        return;
      }

      if (passiveId === 'maxHp') {
        this.player.maxHp += 18;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 32);
        return;
      }

      const current = this.passives[passiveId] ?? 0;
      const maxLevel = 3;
      if (current < maxLevel) {
        this.passives[passiveId] = current + 1;
      }

      for (const weapon of this.weapons) {
        if (canEvolve(weapon, this.passives)) {
          weapon.evolved = true;
        }
      }

      this.syncOrbitToys();
    }
  }

  private processLevelUps(): void {
    if (this.xp < this.xpToNext || this.pendingUpgrades.length > 0) {
      return;
    }

    this.xp -= this.xpToNext;
    this.level += 1;
    this.xpToNext = Math.ceil(this.xpToNext * 1.35 + 2);
    this.pendingUpgrades = drawAttackUpgradeChoices(
      this.weapons,
      this.passives,
      this.unlockedWeaponIds,
    );
  }

  private getRunProgress(): number {
    return clamp(this.elapsed / this.durationSeconds, 0, 1);
  }

  private enterBossPhase(bossKind: BossId = pickRandomBoss()): void {
    this.bossPhase = true;
    this.enemies = [];
    this.pickups = [];
    const side = Math.floor(Math.random() * 4);
    const position = this.spawnPositionForSide(side);
    this.boss = createBossEntity(
      this.nextEntityId++,
      bossKind,
      position,
      this.durationSeconds,
      this.difficulty,
    );
  }

  private updateBoss(deltaSeconds: number): void {
    const boss = this.boss;
    if (!boss || boss.hp <= 0) {
      return;
    }

    const definition = getBossDefinition(boss.kind);
    boss.animTime += deltaSeconds;
    boss.hitTimer = Math.max(0, boss.hitTimer - deltaSeconds);
    boss.phaseTimer = Math.max(0, boss.phaseTimer - deltaSeconds);

    const toPlayer = normalize({
      x: this.player.position.x - boss.position.x,
      y: this.player.position.y - boss.position.y,
    });

    if (boss.behavior === 'chase') {
      const next = {
        x: boss.position.x + toPlayer.x * boss.speed * deltaSeconds,
        y: boss.position.y + toPlayer.y * boss.speed * deltaSeconds,
      };
      boss.position = this.moveWithBlockers(boss.position, next, boss.radius);

      if (Math.abs(toPlayer.x) > 0.01) {
        boss.facingRight = toPlayer.x > 0;
      }

      if (boss.phaseTimer <= 0) {
        boss.behavior = 'tell';
        boss.phaseTimer = definition.tellDuration;
        boss.attackDirection = { ...toPlayer };
        boss.attackIndex = boss.attackIndex === 0 ? 1 : 0;
      }
      return;
    }

    if (boss.behavior === 'tell') {
      if (Math.abs(toPlayer.x) > 0.01) {
        boss.attackDirection = { ...toPlayer };
        boss.facingRight = toPlayer.x > 0;
      }

      if (boss.phaseTimer <= 0) {
        boss.behavior = 'attack';
        boss.phaseTimer = definition.attackDuration;
        this.executeBossAttack(boss);
      }
      return;
    }

    if (boss.behavior === 'attack') {
      if (boss.phaseTimer <= 0) {
        boss.behavior = 'recover';
        boss.phaseTimer = definition.recoverDuration;
      }
      return;
    }

    const next = {
      x: boss.position.x + toPlayer.x * boss.speed * 0.35 * deltaSeconds,
      y: boss.position.y + toPlayer.y * boss.speed * 0.35 * deltaSeconds,
    };
    boss.position = this.moveWithBlockers(boss.position, next, boss.radius);

    if (boss.phaseTimer <= 0) {
      boss.behavior = 'chase';
      boss.phaseTimer = definition.attackCooldown;
    }

    const touchDistance = boss.radius + this.player.radius;
    if (
      distanceSquared(boss.position, this.player.position) <=
        touchDistance * touchDistance &&
      this.damageTimer <= 0
    ) {
      this.player.hp -= boss.damage;
      this.damageTimer = DAMAGE_TICK_SECONDS;
      this.hurtTimer = HURT_FLASH_SECONDS;
    }
  }

  private executeBossAttack(boss: Boss): void {
    const direction = normalize(boss.attackDirection);

    if (boss.kind === 'grandpa') {
      if (boss.attackIndex === 0) {
        this.bossProjectiles.push({
          id: this.nextEntityId++,
          kind: 'hot-pan',
          position: { ...boss.position },
          velocity: {
            x: direction.x * 280,
            y: direction.y * 280,
          },
          radius: 18,
          damage: boss.damage * 1.4,
          ttl: 2.4,
          animTime: 0,
        });
      } else {
        this.bossProjectiles.push({
          id: this.nextEntityId++,
          kind: 'scooter',
          position: { ...boss.position },
          velocity: {
            x: direction.x * 420,
            y: direction.y * 420,
          },
          radius: 16,
          damage: boss.damage * 1.1,
          ttl: 3.5,
          animTime: 0,
        });
      }
      return;
    }

    if (boss.attackIndex === 0) {
      this.sonicWaves.push({
        id: this.nextEntityId++,
        position: { ...boss.position },
        direction: { ...direction },
        width: 120,
        length: 48,
        traveled: 0,
        maxTravel: Math.max(this.world.width, this.world.height) + 200,
        damage: boss.damage * 1.2,
        ttl: 2.5,
        animTime: 0,
      });
      return;
    }

    const mouseCount = 8;
    for (let index = 0; index < mouseCount; index += 1) {
      const angle = (Math.PI * 2 * index) / mouseCount;
      const mouseDirection = { x: Math.cos(angle), y: Math.sin(angle) };
      this.bossProjectiles.push({
        id: this.nextEntityId++,
        kind: 'mouse',
        position: { ...boss.position },
        velocity: {
          x: mouseDirection.x * 240,
          y: mouseDirection.y * 240,
        },
        radius: 10,
        damage: boss.damage * 0.55,
        ttl: 2.2,
        animTime: 0,
      });
    }
  }

  private updateBossProjectiles(deltaSeconds: number): void {
    for (const projectile of this.bossProjectiles) {
      projectile.position.x += projectile.velocity.x * deltaSeconds;
      projectile.position.y += projectile.velocity.y * deltaSeconds;
      projectile.ttl -= deltaSeconds;
      projectile.animTime += deltaSeconds;

      if (projectile.ttl <= 0) {
        if (projectile.kind === 'hot-pan') {
          this.spawnBossPanBurst(projectile.position);
          this.damagePlayerAt(projectile.position, projectile.radius + 40, projectile.damage);
        }
        continue;
      }

      if (projectile.kind === 'hot-pan') {
        const limit = projectile.radius + this.player.radius;
        if (
          distanceSquared(projectile.position, this.player.position) <=
          limit * limit
        ) {
          this.spawnBossPanBurst(projectile.position);
          this.damagePlayerAt(projectile.position, projectile.radius + 40, projectile.damage);
          projectile.ttl = 0;
        }
        continue;
      }

      const limit = projectile.radius + this.player.radius;
      if (
        distanceSquared(projectile.position, this.player.position) <=
        limit * limit
      ) {
        this.player.hp -= projectile.damage;
        this.hurtTimer = HURT_FLASH_SECONDS;
        if (projectile.kind !== 'scooter') {
          projectile.ttl = 0;
        }
      }
    }

    this.bossProjectiles = this.bossProjectiles.filter(
      (projectile) => projectile.ttl > 0,
    );
  }

  private spawnBossPanBurst(position: Vec2): void {
    this.bossPanBursts.push({
      id: this.nextEntityId++,
      position: { ...position },
      ttl: 0.42,
      maxTtl: 0.42,
      animTime: 0,
    });
  }

  private updateBossPanBursts(deltaSeconds: number): void {
    for (const burst of this.bossPanBursts) {
      burst.ttl -= deltaSeconds;
      burst.animTime += deltaSeconds;
    }

    this.bossPanBursts = this.bossPanBursts.filter((burst) => burst.ttl > 0);
  }

  private updateSonicWaves(deltaSeconds: number): void {
    for (const wave of this.sonicWaves) {
      const speed = 340;
      wave.traveled += speed * deltaSeconds;
      wave.position.x += wave.direction.x * speed * deltaSeconds;
      wave.position.y += wave.direction.y * speed * deltaSeconds;
      wave.ttl -= deltaSeconds;
      wave.animTime += deltaSeconds;

      const halfWidth = wave.width / 2;
      const toPlayer = {
        x: this.player.position.x - wave.position.x,
        y: this.player.position.y - wave.position.y,
      };
      const along =
        toPlayer.x * wave.direction.x + toPlayer.y * wave.direction.y;
      const perp = Math.abs(
        toPlayer.x * -wave.direction.y + toPlayer.y * wave.direction.x,
      );

      if (
        along >= -wave.length / 2 &&
        along <= wave.length / 2 &&
        perp <= halfWidth + this.player.radius &&
        this.damageTimer <= 0
      ) {
        this.player.hp -= wave.damage;
        this.damageTimer = DAMAGE_TICK_SECONDS;
        this.hurtTimer = HURT_FLASH_SECONDS;
      }
    }

    this.sonicWaves = this.sonicWaves.filter((wave) => wave.ttl > 0);
  }

  private damagePlayerAt(
    position: Vec2,
    radius: number,
    damage: number,
  ): void {
    const limit = radius + this.player.radius;
    if (
      distanceSquared(position, this.player.position) <= limit * limit &&
      this.damageTimer <= 0
    ) {
      this.player.hp -= damage;
      this.damageTimer = DAMAGE_TICK_SECONDS;
      this.hurtTimer = HURT_FLASH_SECONDS;
    }
  }

  private defeatBoss(): void {
    if (!this.boss) {
      return;
    }

    this.kills += 1;
    this.gold += 25;
    this.boss = null;
    this.bossProjectiles = [];
    this.bossPanBursts = [];
    this.sonicWaves = [];
    this.victory = true;
    this.running = false;
    if (this.developerMode) {
      return;
    }

    this.newlyUnlockedWeaponId = unlockRandomWeaponForHero(this.hero.id);
    if (this.newlyUnlockedWeaponId) {
      this.unlockedWeaponIds.add(this.newlyUnlockedWeaponId);
    }
  }

  private spawnEnemy(): void {
    if (this.bossPhase) {
      return;
    }

    const side = Math.floor(Math.random() * 4);
    const position = this.spawnPositionForSide(side);
    const progress = this.getRunProgress();
    const pressure = 1 + progress * 2.5;
    const specialKind = this.stage.specialEnemyId;
    const hasSpecial = specialKind
      ? this.enemies.some((enemy) => enemy.kind === specialKind)
      : true;
    const motherProgress = clamp(
      (this.elapsed - MOTHER_SLIPPER_MIN_ELAPSED) /
        (this.durationSeconds * 0.5 - MOTHER_SLIPPER_MIN_ELAPSED),
      0,
      1,
    );
    const motherChance =
      specialKind &&
      this.elapsed >= MOTHER_SLIPPER_MIN_ELAPSED &&
      !hasSpecial
        ? MOTHER_SLIPPER_CHANCE_MIN +
          motherProgress * (MOTHER_SLIPPER_CHANCE_MAX - MOTHER_SLIPPER_CHANCE_MIN)
        : 0;
    const rollSpecial = Math.random() < motherChance;
    const isHeavy = Math.random() < clamp(progress * 0.5, 0, 0.45);
    const kind = rollSpecial && specialKind
      ? specialKind
      : isHeavy
        ? this.stage.heavyEnemyId
        : this.stage.smallEnemyId;
    const definition = getEnemyDefinition(kind);

    this.enemies.push({
      id: this.nextEntityId++,
      kind: definition.id,
      position,
      radius: definition.radius,
      hp: definition.baseHp * pressure * this.difficulty.enemyHp,
      speed:
        (randomRange(definition.minSpeed, definition.maxSpeed) +
          progress * 80) *
        this.difficulty.enemySpeed,
      damage:
        definition.damage * (1 + progress * 0.4) * this.difficulty.enemyDamage,
      color: definition.color,
      animTime: Math.random(),
      facingRight: position.x < this.player.position.x,
      hitTimer: 0,
      behavior: 'chase',
      phaseTimer: kind === specialKind ? randomRange(0.6, 1.4) : 0,
      chargeDirection: { x: 0, y: 0 },
      slowTimer: 0,
      slowMultiplier: 1,
    });
  }

  private spawnPositionForSide(side: number): Vec2 {
    if (side === 0) {
      return { x: randomRange(0, this.world.width), y: -32 };
    }

    if (side === 1) {
      return { x: this.world.width + 32, y: randomRange(0, this.world.height) };
    }

    if (side === 2) {
      return { x: randomRange(0, this.world.width), y: this.world.height + 32 };
    }

    return { x: -32, y: randomRange(0, this.world.height) };
  }

  private findClosestEnemy(): Enemy | null {
    let closest: Enemy | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const enemy of this.enemies) {
      const distance = distanceSquared(enemy.position, this.player.position);

      if (distance < closestDistance) {
        closest = enemy;
        closestDistance = distance;
      }
    }

    return closest;
  }

  private findNearestEnemy(
    from: Vec2,
    exclude: Set<number>,
  ): Enemy | null {
    let closest: Enemy | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0 || exclude.has(enemy.id)) {
        continue;
      }

      const distance = distanceSquared(enemy.position, from);

      if (distance < closestDistance) {
        closest = enemy;
        closestDistance = distance;
      }
    }

    return closest;
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const tile = loadImage(this.stage.floorTileSrc);

    if (tile.complete && tile.naturalWidth > 0) {
      const pattern = ctx.createPattern(tile, 'repeat');

      if (pattern) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, this.world.width, this.world.height);
        ctx.restore();

        ctx.fillStyle = 'rgba(24, 20, 16, 0.22)';
        ctx.fillRect(0, 0, this.world.width, this.world.height);
        return;
      }
    }

    ctx.fillStyle = this.stage.floorFallbackColor;
    ctx.fillRect(0, 0, this.world.width, this.world.height);
  }

  private drawBlockers(ctx: CanvasRenderingContext2D): void {
    for (const blocker of this.blockers) {
      const definition = getBlockerDefinition(blocker.kind);
      const drew = drawSprite(ctx, definition.src, {
        x: blocker.position.x,
        y: blocker.position.y,
        size: definition.drawSize,
      });

      if (!drew) {
        ctx.fillStyle = definition.fallbackColor ?? '#888';
        ctx.fillRect(
          blocker.position.x - definition.drawSize / 2,
          blocker.position.y - definition.drawSize / 2,
          definition.drawSize,
          definition.drawSize,
        );
      }
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D): void {
    const sprites = this.hero.sprites;
    const spriteSrc = sprites ? this.getPlayerSpriteSrc(sprites) : null;
    const drewSprite =
      spriteSrc !== null &&
      drawSprite(ctx, spriteSrc, {
        x: this.player.position.x,
        y: this.player.position.y,
        size: sprites?.drawSize ?? 64,
        flipX: !this.player.facingRight,
      });

    if (drewSprite) {
      return;
    }

    ctx.save();
    ctx.translate(this.player.position.x, this.player.position.y);
    ctx.fillStyle = this.hero.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.hero.accent;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#101318';
    ctx.font = '800 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.hero.initials, 0, 1);
    ctx.restore();
  }

  private getPlayerSpriteSrc(
    sprites: NonNullable<HeroDefinition['sprites']>,
  ): string {
    if (this.hurtTimer > 0 && sprites.hurt.length > 0) {
      return sprites.hurt[0];
    }

    if (this.player.moving && sprites.run.length > 0) {
      return getAnimationFrame(
        {
          frames: sprites.run,
          frameDuration: sprites.runFrameDuration,
        },
        this.player.animTime,
      );
    }

    return sprites.idle[0] ?? sprites.run[0] ?? '';
  }

  private preloadSprites(): void {
    const heroSprites = this.hero.sprites;
    const sources = [
      ...allStageSpriteSources(),
      ...allBlockerSpriteSources(),
      ...allEnemySpriteSources(),
      ...allBossSpriteSources(),
      ...BOSS_GRANDPA_PAN_FRAMES,
      ...BOSS_GRANDPA_PAN_BURST_FRAMES,
      BOSS_GRANDPA_PAN_SPLAT_SRC,
      ...BOSS_GRANDPA_SCOOTER_FRAMES,
      BOSS_GRANDPA_SCOOTER_SPARK_SRC,
      ...allPickupSpriteSources(),
      ...allWeaponSpriteSources(),
    ];

    if (heroSprites) {
      sources.push(
        ...heroSprites.idle,
        ...heroSprites.run,
        ...heroSprites.hurt,
      );
    }

    void preloadImages(sources);
  }

  private spawnBlockers(): void {
    if (this.world.width <= 0 || this.world.height <= 0) {
      return;
    }

    const count = randomInt(2, 4);
    const available = [...this.stage.blockerIds];
    const spawnCenter = { ...this.player.position };

    for (let placed = 0; placed < count && available.length > 0; placed += 1) {
      const kindIndex = Math.floor(Math.random() * available.length);
      const kind = available.splice(kindIndex, 1)[0];
      const definition = getBlockerDefinition(kind);
      let placedBlocker: Blocker | null = null;

      for (let attempt = 0; attempt < 40; attempt += 1) {
        const position = {
          x: randomRange(
            BLOCKER_SPAWN_PADDING,
            this.world.width - BLOCKER_SPAWN_PADDING,
          ),
          y: randomRange(
            BLOCKER_SPAWN_PADDING,
            this.world.height - BLOCKER_SPAWN_PADDING,
          ),
        };

        if (
          distanceSquared(position, spawnCenter) <
          BLOCKER_PLAYER_CLEARANCE * BLOCKER_PLAYER_CLEARANCE
        ) {
          continue;
        }

        const candidateRect = getBlockerWorldRect(position, definition);
        const overlaps = this.blockers.some((blocker) =>
          rectsOverlap(
            candidateRect,
            getBlockerWorldRect(
              blocker.position,
              getBlockerDefinition(blocker.kind),
            ),
            BLOCKER_OVERLAP_PADDING,
          ),
        );

        if (overlaps) {
          continue;
        }

        placedBlocker = {
          id: this.nextEntityId++,
          kind,
          position,
        };
        break;
      }

      if (placedBlocker) {
        this.blockers.push(placedBlocker);
      }
    }
  }

  private moveWithBlockers(
    current: Vec2,
    next: Vec2,
    radius: number,
  ): Vec2 {
    const resolved = { ...current };

    if (!this.collidesWithBlockers({ x: next.x, y: current.y }, radius)) {
      resolved.x = next.x;
    }

    if (!this.collidesWithBlockers({ x: resolved.x, y: next.y }, radius)) {
      resolved.y = next.y;
    }

    return resolved;
  }

  private collidesWithBlockers(center: Vec2, radius: number): boolean {
    return this.blockers.some((blocker) =>
      circleIntersectsRect(
        center,
        radius,
        getBlockerWorldRect(
          blocker.position,
          getBlockerDefinition(blocker.kind),
        ),
      ),
    );
  }

  private drawEnemies(ctx: CanvasRenderingContext2D): void {
    for (const enemy of this.enemies) {
      const definition = getEnemyDefinition(enemy.kind);
      const spriteSrc = this.getEnemySpriteSrc(enemy, definition.sprites);
      const drewSprite = drawSprite(ctx, spriteSrc, {
        x: enemy.position.x,
        y: enemy.position.y,
        size: definition.sprites.drawSize,
        flipX: !enemy.facingRight,
        smooth: true,
      });

      if (drewSprite && enemy.slowTimer > 0) {
        const slowSrc = getWeaponDefinition('web-pool').sprites.slowIndicator;
        if (slowSrc) {
          drawSprite(ctx, slowSrc, {
            x: enemy.position.x,
            y: enemy.position.y - definition.sprites.drawSize * 0.45,
            size: 24,
            alpha: 0.85,
          });
        }
      }

      if (drewSprite) {
        continue;
      }

      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.position.x, enemy.position.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 19, 24, 0.74)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  private getEnemySpriteSrc(
    enemy: Enemy,
    sprites: ReturnType<typeof getEnemyDefinition>['sprites'],
  ): string {
    if (enemy.hitTimer > 0 && sprites.hit.length > 0) {
      return sprites.hit[0];
    }

    if (
      enemy.behavior === 'tell' &&
      sprites.tell &&
      sprites.tell.length > 0
    ) {
      return sprites.tell[0];
    }

    return getAnimationFrame(
      {
        frames: sprites.walk,
        frameDuration: sprites.walkFrameDuration,
      },
      enemy.animTime,
    );
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const projectile of this.projectiles) {
      const definition = getWeaponDefinition(projectile.weaponId);
      const frames =
        projectile.evolved && definition.sprites.evolvedProjectile
          ? [definition.sprites.evolvedProjectile]
          : definition.sprites.projectile;

      if (frames && frames.length > 0) {
        const spriteSrc = getAnimationFrame(
          { frames, frameDuration: 0.12 },
          projectile.animTime,
        );
        const directional =
          projectile.kind === 'hot-wheels' ||
          projectile.kind === 'machinegun' ||
          projectile.kind === 'slippers';
        const drew = drawSprite(ctx, spriteSrc, {
          x: projectile.position.x,
          y: projectile.position.y,
          size: PROJECTILE_DRAW_SIZE * (projectile.radius / 6),
          rotation: directional
            ? Math.atan2(projectile.velocity.y, projectile.velocity.x)
            : 0,
        });

        if (drew) {
          continue;
        }
      }

      ctx.fillStyle = this.hero.accent;
      ctx.beginPath();
      ctx.arc(
        projectile.position.x,
        projectile.position.y,
        projectile.radius,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  private drawWebPools(ctx: CanvasRenderingContext2D): void {
    for (const pool of this.webPools) {
      const definition = getWeaponDefinition(pool.weaponId);
      const frames =
        pool.evolved && definition.sprites.poolNest
          ? definition.sprites.poolNest
          : definition.sprites.pool;

      if (!frames || frames.length === 0) {
        continue;
      }

      const spriteSrc = getAnimationFrame(
        { frames, frameDuration: 0.18 },
        pool.animTime,
      );
      drawSprite(ctx, spriteSrc, {
        x: pool.position.x,
        y: pool.position.y,
        size: POOL_DRAW_SIZE * (pool.radius / 54),
        alpha: clamp(pool.ttl / 4, 0.35, 1),
      });

      if (pool.evolved && definition.sprites.poolNestCenter) {
        drawSprite(ctx, definition.sprites.poolNestCenter, {
          x: pool.position.x,
          y: pool.position.y,
          size: 48,
          alpha: 0.9,
        });
      }
    }
  }

  private drawOrbitToys(ctx: CanvasRenderingContext2D): void {
    for (const toy of this.orbitToys) {
      const definition = getWeaponDefinition(toy.weaponId);
      const position = {
        x: this.player.position.x + Math.cos(toy.angle) * toy.orbitRadius,
        y: this.player.position.y + Math.sin(toy.angle) * toy.orbitRadius,
      };
      const spriteSrc =
        toy.evolved && definition.sprites.orbitEvolved
          ? definition.sprites.orbitEvolved
          : definition.sprites.orbitItems?.[
              toy.spriteIndex % (definition.sprites.orbitItems?.length ?? 1)
            ];

      if (!spriteSrc) {
        continue;
      }

      drawSprite(ctx, spriteSrc, {
        x: position.x,
        y: position.y,
        size: toy.drawSize,
      });
    }
  }

  private drawExplosions(ctx: CanvasRenderingContext2D): void {
    for (const explosion of this.explosions) {
      const definition = getWeaponDefinition(explosion.weaponId);
      const frames =
        explosion.evolved && definition.sprites.storm
          ? definition.sprites.storm
          : definition.sprites.explosion;

      if (!frames || frames.length === 0) {
        continue;
      }

      const progress = 1 - explosion.ttl / explosion.maxTtl;
      const spriteSrc = getAnimationFrame(
        { frames, frameDuration: explosion.maxTtl / frames.length },
        progress * explosion.maxTtl,
      );

      drawSprite(ctx, spriteSrc, {
        x: explosion.position.x,
        y: explosion.position.y,
        size: EXPLOSION_DRAW_SIZE * (explosion.radius / 70),
        alpha: clamp(explosion.ttl / explosion.maxTtl, 0.2, 1),
      });
    }
  }

  private drawLingeringPuffs(ctx: CanvasRenderingContext2D): void {
    for (const puff of this.lingeringPuffs) {
      const definition = getWeaponDefinition(puff.weaponId);
      const puffFrames =
        puff.evolved && definition.sprites.storm
          ? definition.sprites.storm
          : definition.sprites.puff;
      const spriteSrc = puffFrames
        ? getAnimationFrame(
            { frames: puffFrames, frameDuration: 0.16 },
            puff.animTime,
          )
        : '';

      if (!spriteSrc) {
        continue;
      }

      const size = PUFF_DRAW_SIZE * (puff.radius / 60);
      drawSprite(ctx, spriteSrc, {
        x: puff.position.x,
        y: puff.position.y,
        size,
        alpha: clamp(puff.ttl / 2, 0.25, 0.75),
      });

      if (definition.sprites.puffAccent) {
        drawSprite(ctx, definition.sprites.puffAccent, {
          x: puff.position.x,
          y: puff.position.y,
          size: size * 0.45,
          alpha: clamp(puff.ttl / 2, 0.4, 0.9),
        });
      }
    }
  }

  private drawHitSparks(ctx: CanvasRenderingContext2D): void {
    for (const spark of this.hitSparks) {
      drawSprite(ctx, spark.spriteSrc, {
        x: spark.position.x,
        y: spark.position.y,
        size: 36,
        alpha: clamp(spark.ttl / spark.maxTtl, 0.15, 1),
      });
    }
  }

  private drawPickups(ctx: CanvasRenderingContext2D): void {
    for (const pickup of this.pickups) {
      const definition = getPickupDefinition(pickup.kind);
      const drewSprite = drawSprite(ctx, definition.src, {
        x: pickup.position.x,
        y: pickup.position.y,
        size: definition.drawSize,
      });

      if (drewSprite) {
        continue;
      }

      this.drawPickupFallback(ctx, pickup, definition);
    }
  }

  private drawPickupFallback(
    ctx: CanvasRenderingContext2D,
    pickup: Pickup,
    definition: ReturnType<typeof getPickupDefinition>,
  ): void {
    ctx.save();
    ctx.translate(pickup.position.x, pickup.position.y);

    if (isSpecialPickup(pickup.kind)) {
      const pulse = 1 + Math.sin(this.elapsed * 6) * 0.06;
      const size = pickup.radius * 1.35 * pulse;

      ctx.fillStyle = 'rgba(16, 19, 24, 0.28)';
      ctx.beginPath();
      ctx.arc(1, 3, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = definition.color;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#101318';
      ctx.font = '800 14px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(definition.label, 0, 1);
      ctx.restore();
      return;
    }

    ctx.fillStyle = definition.color;
    ctx.beginPath();
    ctx.rect(-pickup.radius, -pickup.radius, pickup.radius * 2, pickup.radius * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBoss(ctx: CanvasRenderingContext2D): void {
    const boss = this.boss;
    if (!boss || boss.hp <= 0) {
      return;
    }

    const definition = getBossDefinition(boss.kind);
    const attackPose =
      definition.attackSrc && definition.attackSrc.length > 0
        ? definition.attackSrc[boss.attackIndex % definition.attackSrc.length]
        : null;
    const spriteSrc =
      boss.hitTimer > 0
        ? definition.hitSrc[0]
        : boss.behavior === 'tell' && definition.tellSrc
          ? definition.tellSrc[0]
          : boss.behavior === 'attack' && attackPose
            ? attackPose
            : getAnimationFrame(
                {
                  frames: definition.walkSrc,
                  frameDuration: definition.walkFrameDuration,
                },
                boss.animTime,
              );

    const drew = drawSprite(ctx, spriteSrc, {
      x: boss.position.x,
      y: boss.position.y,
      size: definition.drawSize,
      flipX: !boss.facingRight,
      smooth: true,
    });

    if (!drew) {
      ctx.fillStyle = boss.color;
      ctx.beginPath();
      ctx.arc(boss.position.x, boss.position.y, boss.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#101318';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    const barWidth = definition.drawSize * 0.9;
    const barHeight = 8;
    const hpRatio = boss.maxHp > 0 ? boss.hp / boss.maxHp : 0;
    const barX = boss.position.x - barWidth / 2;
    const barY = boss.position.y - definition.drawSize * 0.65;

    ctx.fillStyle = 'rgba(16, 19, 24, 0.72)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
  }

  private drawBossProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const projectile of this.bossProjectiles) {
      if (projectile.kind === 'hot-pan') {
        const angle = Math.atan2(projectile.velocity.y, projectile.velocity.x);
        const frame = getAnimationFrame(
          { frames: BOSS_GRANDPA_PAN_FRAMES, frameDuration: 0.09 },
          projectile.animTime,
        );

        drawSprite(ctx, frame, {
          x: projectile.position.x,
          y: projectile.position.y,
          size: 54,
          rotation: angle,
          smooth: true,
        });
        continue;
      }

      if (projectile.kind === 'scooter') {
        const angle = Math.atan2(projectile.velocity.y, projectile.velocity.x);
        const direction = normalize(projectile.velocity);
        const frame = getAnimationFrame(
          { frames: BOSS_GRANDPA_SCOOTER_FRAMES, frameDuration: 0.08 },
          projectile.animTime,
        );

        drawSprite(ctx, BOSS_GRANDPA_SCOOTER_SPARK_SRC, {
          x: projectile.position.x - direction.x * 26,
          y: projectile.position.y - direction.y * 26,
          size: 42,
          rotation: angle,
          alpha: 0.55 + Math.sin(projectile.animTime * 28) * 0.18,
          smooth: true,
        });
        drawSprite(ctx, frame, {
          x: projectile.position.x,
          y: projectile.position.y,
          size: 64,
          rotation: angle,
          smooth: true,
        });
        continue;
      }

      const color = '#6b6b6b';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(
        projectile.position.x,
        projectile.position.y,
        projectile.radius,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  private drawBossPanBursts(ctx: CanvasRenderingContext2D): void {
    for (const burst of this.bossPanBursts) {
      const progress = 1 - burst.ttl / burst.maxTtl;
      const burstFrame = getAnimationFrame(
        { frames: BOSS_GRANDPA_PAN_BURST_FRAMES, frameDuration: burst.maxTtl / BOSS_GRANDPA_PAN_BURST_FRAMES.length },
        burst.animTime,
      );

      drawSprite(ctx, BOSS_GRANDPA_PAN_SPLAT_SRC, {
        x: burst.position.x,
        y: burst.position.y + 10,
        size: 64,
        alpha: clamp(burst.ttl / burst.maxTtl, 0, 0.6),
        smooth: true,
      });
      drawSprite(ctx, burstFrame, {
        x: burst.position.x,
        y: burst.position.y,
        size: 126 + progress * 18,
        rotation: progress * 0.35,
        alpha: clamp(0.25 + burst.ttl / burst.maxTtl, 0, 1),
        smooth: true,
      });
    }
  }

  private drawSonicWaves(ctx: CanvasRenderingContext2D): void {
    for (const wave of this.sonicWaves) {
      ctx.save();
      ctx.translate(wave.position.x, wave.position.y);
      const angle = Math.atan2(wave.direction.y, wave.direction.x);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(255, 100, 200, 0.35)';
      ctx.fillRect(-wave.length / 2, -wave.width / 2, wave.length, wave.width);
      ctx.restore();
    }
  }

  private drawConeEffects(ctx: CanvasRenderingContext2D): void {
    for (const cone of this.coneEffects) {
      const alpha = cone.ttl / cone.maxTtl;
      const frames = getWeaponDefinition(cone.weaponId).sprites.projectile;
      const spriteSrc = frames
        ? getAnimationFrame({ frames, frameDuration: 0.07 }, cone.animTime)
        : '';
      const drew = spriteSrc
        ? drawSprite(ctx, spriteSrc, {
            x: cone.origin.x,
            y: cone.origin.y,
            width: cone.range,
            height: Math.max(56, cone.range * Math.sin(cone.halfAngle) * 2.2),
            rotation: Math.atan2(cone.direction.y, cone.direction.x),
            anchorX: 0,
            anchorY: 0.5,
            alpha: clamp(0.35 + 0.65 * alpha, 0.2, 1),
            smooth: true,
          })
        : false;

      if (drew) {
        continue;
      }

      ctx.save();
      ctx.translate(cone.origin.x, cone.origin.y);
      const angle = Math.atan2(cone.direction.y, cone.direction.x);
      ctx.rotate(angle);
      ctx.fillStyle = `rgba(80, 180, 255, ${0.35 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, cone.range, -cone.halfAngle, cone.halfAngle);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private drawTrailSegments(ctx: CanvasRenderingContext2D): void {
    for (const segment of this.trailSegments) {
      const alpha = clamp(segment.ttl / 1.2, 0.2, 0.85);
      const definition = getWeaponDefinition(segment.weaponId);
      const frames = definition.sprites.trail;
      const spriteSrc = frames
        ? getAnimationFrame({ frames, frameDuration: 0.18 }, segment.animTime)
        : '';
      const size = Math.max(segment.radius * 2.4, 36);
      const drew = spriteSrc
        ? drawSprite(ctx, spriteSrc, {
            x: segment.position.x,
            y: segment.position.y,
            size,
            alpha,
            smooth: true,
          })
        : false;

      if (drew) {
        if (definition.sprites.puffAccent) {
          drawSprite(ctx, definition.sprites.puffAccent, {
            x: segment.position.x,
            y: segment.position.y - size * 0.28,
            size: size * 0.4,
            alpha: alpha * 0.9,
          });
        }
        continue;
      }

      ctx.fillStyle = `rgba(40, 20, 60, ${0.55 * alpha})`;
      ctx.beginPath();
      ctx.arc(
        segment.position.x,
        segment.position.y,
        segment.radius,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  private drawMeleeSlashes(ctx: CanvasRenderingContext2D): void {
    for (const slash of this.meleeSlashes) {
      const alpha = slash.ttl / slash.maxTtl;
      const frames =
        getWeaponDefinition(slash.weaponId).sprites.slash ??
        getWeaponDefinition(slash.weaponId).sprites.hit;
      const spriteSrc = frames
        ? getAnimationFrame(
            { frames, frameDuration: slash.maxTtl / Math.max(frames.length, 1) },
            slash.animTime,
          )
        : '';
      const mid = {
        x: slash.origin.x + slash.direction.x * slash.range * 0.55,
        y: slash.origin.y + slash.direction.y * slash.range * 0.55,
      };
      const drew = spriteSrc
        ? drawSprite(ctx, spriteSrc, {
            x: mid.x,
            y: mid.y,
            size: slash.range * 1.35,
            rotation: Math.atan2(slash.direction.y, slash.direction.x),
            alpha: clamp(0.35 + 0.65 * alpha, 0.2, 1),
            smooth: true,
          })
        : false;

      if (drew) {
        continue;
      }

      const end = {
        x: slash.origin.x + slash.direction.x * slash.range,
        y: slash.origin.y + slash.direction.y * slash.range,
      };
      ctx.strokeStyle = `rgba(220, 220, 240, ${0.85 * alpha})`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(slash.origin.x, slash.origin.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  }

  private drawBombFlash(ctx: CanvasRenderingContext2D): void {
    if (this.bombFlashTimer <= 0) {
      return;
    }

    const progress = 1 - this.bombFlashTimer / BOMB_FLASH_SECONDS;
    const radius = BOMB_RADIUS * (0.35 + progress * 0.75);
    const alpha = 0.45 * (1 - progress);

    ctx.save();
    ctx.fillStyle = `rgba(255, 120, 64, ${alpha})`;
    ctx.beginPath();
    ctx.arc(
      this.bombFlashPosition.x,
      this.bombFlashPosition.y,
      radius,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 220, 140, ${alpha + 0.2})`;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  }
}
