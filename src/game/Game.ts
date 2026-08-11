import { getAnimationFrame } from '../render/animation';
import { loadImage, preloadImages } from '../render/assets';
import { drawSprite } from '../render/spriteRenderer';
import { kidsRoomFloor } from './backgrounds';
import {
  allBlockerSpriteSources,
  blockerIds,
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
import type {
  Blocker,
  Enemy,
  ExplosionEffect,
  GameSnapshot,
  HeroDefinition,
  HitSpark,
  InputState,
  LingeringPuff,
  OrbitToy,
  PassiveLevels,
  Pickup,
  Projectile,
  Upgrade,
  Vec2,
  WeaponInstance,
  WebPoolEffect,
} from './types';
import { drawAttackUpgradeChoices } from './upgrades';
import {
  allWeaponSpriteSources,
  canEvolve,
  createWeaponInstance,
  getWeaponDefinition,
  getWeaponStats,
  MAX_WEAPON_LEVEL,
  type MarbleBounceStats,
  type PillowPopStats,
  type StarThrowStats,
  type WebPoolStats,
} from './weapons';

type GameConfig = {
  width: number;
  height: number;
  hero: HeroDefinition;
  difficulty?: DifficultyId;
};

const PLAYER_RADIUS = 18;
const ARENA_PADDING = 28;
const DAMAGE_TICK_SECONDS = 0.42;
const HURT_FLASH_SECONDS = 0.28;
const ENEMY_HIT_FLASH_SECONDS = 0.18;
const BLOCKER_SPAWN_PADDING = 72;
const BLOCKER_PLAYER_CLEARANCE = 120;
const BLOCKER_OVERLAP_PADDING = 18;
const GEM_PULL_DISTANCE = 118;
const GEM_PULL_SPEED = 5.6;
const MAGNET_DURATION_SECONDS = 3;
const MAGNET_PULL_SPEED = 22;
const BOMB_RADIUS = 320;
const BOMB_FLASH_SECONDS = 0.45;
const MOTHER_SLIPPER_MIN_ELAPSED = 40;
const MOTHER_SLIPPER_FULL_ELAPSED = 150;
const MOTHER_SLIPPER_CHANCE_MIN = 0.08;
const MOTHER_SLIPPER_CHANCE_MAX = 0.22;
const LATE_HARD_ELAPSED = 240;
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
  private projectiles: Projectile[] = [];
  private webPools: WebPoolEffect[] = [];
  private orbitToys: OrbitToy[] = [];
  private explosions: ExplosionEffect[] = [];
  private lingeringPuffs: LingeringPuff[] = [];
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
    this.preloadSprites();
    this.resize(config.width, config.height);
    this.reset();
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
    this.projectiles = [];
    this.webPools = [];
    this.orbitToys = [];
    this.explosions = [];
    this.lingeringPuffs = [];
    this.hitSparks = [];
    this.weapons = [createWeaponInstance(this.hero.startingWeaponId)];
    this.passives = {};
    this.pickups = [];
    this.pendingUpgrades = [];
    this.elapsed = 0;
    this.spawnTimer = 1;
    this.damageTimer = 0;
    this.hurtTimer = 0;
    this.magnetTimer = 0;
    this.bombFlashTimer = 0;
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
    if (!this.running || this.gameOver || this.pendingUpgrades.length > 0) {
      return;
    }

    this.elapsed += deltaSeconds;
    this.hurtTimer = Math.max(0, this.hurtTimer - deltaSeconds);
    this.magnetTimer = Math.max(0, this.magnetTimer - deltaSeconds);
    this.bombFlashTimer = Math.max(0, this.bombFlashTimer - deltaSeconds);
    this.updatePlayer(deltaSeconds, input);
    this.spawnTimer -= deltaSeconds;
    this.damageTimer -= deltaSeconds;

    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      const midPressure = clamp(this.elapsed / 180, 0, 1);
      const earlyEase = clamp(1 - this.elapsed / 45, 0, 1);
      const lateHard = clamp((this.elapsed - LATE_HARD_ELAPSED) / 90, 0, 1);
      this.spawnTimer =
        (randomRange(0.55, 1.2) *
          (1 - midPressure * 0.35) *
          (1 + earlyEase * 0.95) *
          (1 - lateHard * 0.6)) /
        this.difficulty.spawnRate;
    }

    this.updateEnemies(deltaSeconds);
    this.updateWeapons(deltaSeconds);
    this.updateProjectiles(deltaSeconds);
    this.updateWebPools(deltaSeconds);
    this.updateOrbitToys(deltaSeconds);
    this.updateExplosions(deltaSeconds);
    this.updateLingeringPuffs(deltaSeconds);
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
    this.drawPickups(ctx);
    this.drawProjectiles(ctx);
    this.drawExplosions(ctx);
    this.drawOrbitToys(ctx);
    this.drawHitSparks(ctx);
    this.drawEnemies(ctx);
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
      running: this.running,
      pausedForUpgrade: this.pendingUpgrades.length > 0,
      gameOver: this.gameOver,
      pendingUpgrades: this.pendingUpgrades,
      weapons: this.weapons.map((weapon) => ({ ...weapon })),
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
      }
    }
  }

  private fireStarThrow(
    weapon: WeaponInstance,
    stats: StarThrowStats,
  ): boolean {
    if (this.enemies.length === 0) {
      return false;
    }

    const target = this.findClosestEnemy();
    if (!target) {
      return false;
    }

    const baseDirection = normalize({
      x: target.position.x - this.player.position.x,
      y: target.position.y - this.player.position.y,
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
    if (this.enemies.length === 0) {
      return false;
    }

    const target = this.findClosestEnemy();
    if (!target) {
      return false;
    }

    const direction = normalize({
      x: target.position.x - this.player.position.x,
      y: target.position.y - this.player.position.y,
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
      radius: 10,
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
    if (this.enemies.length === 0) {
      return false;
    }

    const target = this.findClosestEnemy();
    if (!target) {
      return false;
    }

    const direction = normalize({
      x: target.position.x - this.player.position.x,
      y: target.position.y - this.player.position.y,
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
        if (projectile.kind === 'pillow-pop') {
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
    }

    this.lingeringPuffs = this.lingeringPuffs.filter((puff) => puff.ttl > 0);
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
    );
  }

  private spawnEnemy(): void {
    const side = Math.floor(Math.random() * 4);
    const position = this.spawnPositionForSide(side);
    const lateHard = clamp((this.elapsed - LATE_HARD_ELAPSED) / 90, 0, 1);
    const pressure = 1 + this.elapsed / 150 + lateHard * 1.25;
    const hasMother = this.enemies.some(
      (enemy) => enemy.kind === 'mother-slipper',
    );
    const motherProgress = clamp(
      (this.elapsed - MOTHER_SLIPPER_MIN_ELAPSED) /
        (MOTHER_SLIPPER_FULL_ELAPSED - MOTHER_SLIPPER_MIN_ELAPSED),
      0,
      1,
    );
    const motherChance =
      this.elapsed >= MOTHER_SLIPPER_MIN_ELAPSED && !hasMother
        ? MOTHER_SLIPPER_CHANCE_MIN +
          motherProgress * (MOTHER_SLIPPER_CHANCE_MAX - MOTHER_SLIPPER_CHANCE_MIN)
        : 0;
    const rollMother = Math.random() < motherChance;
    const isHeavy =
      Math.random() < clamp(this.elapsed / 220, 0, 0.35) + lateHard * 0.25;
    const kind = rollMother
      ? 'mother-slipper'
      : isHeavy
        ? 'large-cockroach'
        : 'small-insect';
    const definition = getEnemyDefinition(kind);

    this.enemies.push({
      id: this.nextEntityId++,
      kind: definition.id,
      position,
      radius: definition.radius,
      hp: definition.baseHp * pressure * this.difficulty.enemyHp,
      speed:
        (randomRange(definition.minSpeed, definition.maxSpeed) +
          this.elapsed * 0.05 +
          lateHard * 42) *
        this.difficulty.enemySpeed,
      damage:
        definition.damage * (1 + lateHard * 0.4) * this.difficulty.enemyDamage,
      color: definition.color,
      animTime: Math.random(),
      facingRight: position.x < this.player.position.x,
      hitTimer: 0,
      behavior: 'chase',
      phaseTimer: kind === 'mother-slipper' ? randomRange(0.6, 1.4) : 0,
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
    const tile = loadImage(kidsRoomFloor.tileSrc);

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

    ctx.fillStyle = kidsRoomFloor.fallbackColor;
    ctx.fillRect(0, 0, this.world.width, this.world.height);
  }

  private drawBlockers(ctx: CanvasRenderingContext2D): void {
    for (const blocker of this.blockers) {
      const definition = getBlockerDefinition(blocker.kind);
      drawSprite(ctx, definition.src, {
        x: blocker.position.x,
        y: blocker.position.y,
        size: definition.drawSize,
      });
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
      kidsRoomFloor.tileSrc,
      ...allBlockerSpriteSources(),
      ...allEnemySpriteSources(),
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
    const available = [...blockerIds];
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
        const drew = drawSprite(ctx, spriteSrc, {
          x: projectile.position.x,
          y: projectile.position.y,
          size: PROJECTILE_DRAW_SIZE,
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
      const spriteSrc =
        puff.evolved && definition.sprites.storm?.[0]
          ? definition.sprites.storm[0]
          : definition.sprites.puff;

      if (!spriteSrc) {
        continue;
      }

      drawSprite(ctx, spriteSrc, {
        x: puff.position.x,
        y: puff.position.y,
        size: PUFF_DRAW_SIZE * (puff.radius / 60),
        alpha: clamp(puff.ttl / 2, 0.25, 0.75),
      });
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
