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
import { allEnemySpriteSources, getEnemyDefinition } from './enemies';
import {
  allPickupSpriteSources,
  getPickupDefinition,
  isSpecialPickup,
  isXpPickup,
  resolveEnemyDrop,
} from './pickups';
import { drawUpgradeChoices } from './upgrades';
import {
  circleIntersectsRect,
  clamp,
  distanceSquared,
  normalize,
  randomInt,
  randomRange,
  rectsOverlap,
} from './math';
import type {
  Blocker,
  Enemy,
  GameSnapshot,
  HeroDefinition,
  InputState,
  Pickup,
  Projectile,
  RunSummary,
  Upgrade,
  Vec2,
} from './types';

type GameConfig = {
  width: number;
  height: number;
  hero: HeroDefinition;
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

export class Game {
  private readonly hero: HeroDefinition;
  private readonly world = { width: 0, height: 0 };
  private readonly player = {
    position: { x: 0, y: 0 },
    radius: PLAYER_RADIUS,
    hp: 1,
    maxHp: 1,
    speed: 1,
    damage: 1,
    cooldown: 1,
    projectileSpeed: 1,
    facingRight: true,
    moving: false,
    animTime: 0,
  };

  private blockers: Blocker[] = [];
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private pickups: Pickup[] = [];
  private pendingUpgrades: Upgrade[] = [];
  private nextEntityId = 1;
  private elapsed = 0;
  private spawnTimer = 0;
  private fireTimer = 0;
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
    this.player.damage = this.hero.projectileDamage;
    this.player.cooldown = this.hero.projectileCooldown;
    this.player.projectileSpeed = this.hero.projectileSpeed;
    this.player.facingRight = true;
    this.player.moving = false;
    this.player.animTime = 0;
    this.blockers = [];
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.pendingUpgrades = [];
    this.elapsed = 0;
    this.spawnTimer = 1;
    this.fireTimer = 0;
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
    this.fireTimer -= deltaSeconds;
    this.damageTimer -= deltaSeconds;

    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      const midPressure = clamp(this.elapsed / 180, 0, 1);
      // Slower spawns in the first ~45s, then ramp; after 4 min it gets much denser.
      const earlyEase = clamp(1 - this.elapsed / 45, 0, 1);
      const lateHard = clamp((this.elapsed - LATE_HARD_ELAPSED) / 90, 0, 1);
      this.spawnTimer =
        randomRange(0.55, 1.2) *
        (1 - midPressure * 0.35) *
        (1 + earlyEase * 0.95) *
        (1 - lateHard * 0.6);
    }

    this.updateEnemies(deltaSeconds);
    this.autoFire();
    this.updateProjectiles(deltaSeconds);
    this.collectPickups();

    if (this.player.hp <= 0) {
      this.gameOver = true;
      this.running = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx);
    this.drawBlockers(ctx);
    this.drawPickups(ctx);
    this.drawProjectiles(ctx);
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

    this.applyUpgrade(selected.id);
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
    };
  }

  getRunSummary(): RunSummary {
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

      const toPlayer = normalize({
        x: this.player.position.x - enemy.position.x,
        y: this.player.position.y - enemy.position.y,
      });

      if (enemy.kind === 'mother-slipper') {
        this.updateMotherSlipper(enemy, deltaSeconds, toPlayer);
      } else {
        const next = {
          x: enemy.position.x + toPlayer.x * enemy.speed * deltaSeconds,
          y: enemy.position.y + toPlayer.y * enemy.speed * deltaSeconds,
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
  ): void {
    const definition = getEnemyDefinition('mother-slipper');
    const tellDuration = definition.tellDuration ?? 0.45;
    const chargeDuration = definition.chargeDuration ?? 0.72;
    const recoverDuration = definition.recoverDuration ?? 0.85;
    const engageDistance = definition.engageDistance ?? 260;
    const chargeMultiplier = definition.chargeSpeedMultiplier ?? 3.1;

    if (enemy.behavior === 'chase') {
      const next = {
        x: enemy.position.x + toPlayer.x * enemy.speed * deltaSeconds,
        y: enemy.position.y + toPlayer.y * enemy.speed * deltaSeconds,
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
      const chargeSpeed = enemy.speed * chargeMultiplier;
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

    // recover: slow shuffle toward player before the next scold.
    const next = {
      x: enemy.position.x + toPlayer.x * enemy.speed * 0.45 * deltaSeconds,
      y: enemy.position.y + toPlayer.y * enemy.speed * 0.45 * deltaSeconds,
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

  private autoFire(): void {
    if (this.fireTimer > 0 || this.enemies.length === 0) {
      return;
    }

    const target = this.findClosestEnemy();

    if (!target) {
      return;
    }

    const direction = normalize({
      x: target.position.x - this.player.position.x,
      y: target.position.y - this.player.position.y,
    });

    this.projectiles.push({
      id: this.nextEntityId++,
      position: { ...this.player.position },
      velocity: {
        x: direction.x * this.player.projectileSpeed,
        y: direction.y * this.player.projectileSpeed,
      },
      radius: 7,
      damage: this.player.damage,
      ttl: 1.4,
    });
    this.fireTimer = this.player.cooldown;
  }

  private updateProjectiles(deltaSeconds: number): void {
    for (const projectile of this.projectiles) {
      projectile.position.x += projectile.velocity.x * deltaSeconds;
      projectile.position.y += projectile.velocity.y * deltaSeconds;
      projectile.ttl -= deltaSeconds;

      if (
        projectile.ttl > 0 &&
        this.collidesWithBlockers(projectile.position, projectile.radius)
      ) {
        projectile.ttl = 0;
      }
    }

    for (const projectile of this.projectiles) {
      for (const enemy of this.enemies) {
        const hitDistance = projectile.radius + enemy.radius;

        if (
          projectile.ttl > 0 &&
          enemy.hp > 0 &&
          distanceSquared(projectile.position, enemy.position) <=
            hitDistance * hitDistance
        ) {
          enemy.hp -= projectile.damage;
          enemy.hitTimer = ENEMY_HIT_FLASH_SECONDS;
          projectile.ttl = 0;
        }
      }
    }

    const defeated = this.enemies.filter((enemy) => enemy.hp <= 0);

    for (const enemy of defeated) {
      this.defeatEnemy(enemy, true);
    }

    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
    this.projectiles = this.projectiles.filter(
      (projectile) => projectile.ttl > 0,
    );
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
      // Bomb kills always drop gems only — no special chain reactions.
      this.defeatEnemy(enemy, false);
    }

    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
  }

  private applyUpgrade(upgradeId: Upgrade['id']): void {
    if (upgradeId === 'speed') {
      this.player.speed *= 1.12;
    }

    if (upgradeId === 'damage') {
      this.player.damage *= 1.2;
    }

    if (upgradeId === 'cooldown') {
      this.player.cooldown *= 0.86;
    }

    if (upgradeId === 'maxHp') {
      this.player.maxHp += 18;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 32);
    }
  }

  private processLevelUps(): void {
    if (this.xp < this.xpToNext || this.pendingUpgrades.length > 0) {
      return;
    }

    this.xp -= this.xpToNext;
    this.level += 1;
    this.xpToNext = Math.ceil(this.xpToNext * 1.35 + 2);
    this.pendingUpgrades = drawUpgradeChoices();
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
      hp: definition.baseHp * pressure,
      speed:
        randomRange(definition.minSpeed, definition.maxSpeed) +
        this.elapsed * 0.05 +
        lateHard * 42,
      damage: definition.damage * (1 + lateHard * 0.4),
      color: definition.color,
      animTime: Math.random(),
      facingRight: position.x < this.player.position.x,
      hitTimer: 0,
      behavior: 'chase',
      phaseTimer: kind === 'mother-slipper' ? randomRange(0.6, 1.4) : 0,
      chargeDirection: { x: 0, y: 0 },
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

        // Soften the pastel floor so heroes, enemies, and pickups stay readable.
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
    ctx.fillStyle = this.hero.accent;

    for (const projectile of this.projectiles) {
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
