import type { Boss, BossId, Vec2 } from './types';
import type { DifficultyModifiers } from './difficulty';
import { randomRange } from './math';

const bossesBase = '/assets/sprites/enemies';

export type BossDefinition = {
  id: BossId;
  name: string;
  radius: number;
  baseHp: number;
  speed: number;
  damage: number;
  color: string;
  walkSrc: string[];
  hitSrc: string[];
  tellSrc?: string[];
  attackSrc?: string[];
  drawSize: number;
  walkFrameDuration: number;
  tellDuration: number;
  attackDuration: number;
  recoverDuration: number;
  attackCooldown: number;
};

export const bossDefinitions: Record<BossId, BossDefinition> = {
  grandpa: {
    id: 'grandpa',
    name: 'Παππούς',
    radius: 42,
    baseHp: 2800,
    speed: 38,
    damage: 28,
    color: '#c97b4a',
    walkSrc: [
      `${bossesBase}/boss_grandpa/boss_grandpa_walk_01.png`,
      `${bossesBase}/boss_grandpa/boss_grandpa_walk_02.png`,
      `${bossesBase}/boss_grandpa/boss_grandpa_walk_03.png`,
      `${bossesBase}/boss_grandpa/boss_grandpa_walk_04.png`,
    ],
    hitSrc: [`${bossesBase}/boss_grandpa/boss_grandpa_hit_01.png`],
    tellSrc: [`${bossesBase}/boss_grandpa/boss_grandpa_tell_01.png`],
    // Index matches attackIndex: 0 = hot-pan, 1 = scooter.
    attackSrc: [
      `${bossesBase}/boss_grandpa/boss_grandpa_attack_pan_01.png`,
      `${bossesBase}/boss_grandpa/boss_grandpa_attack_scooter_01.png`,
    ],
    drawSize: 200,
    walkFrameDuration: 0.14,
    tellDuration: 0.55,
    attackDuration: 0.35,
    recoverDuration: 0.9,
    attackCooldown: 2.4,
  },
  sissy: {
    id: 'sissy',
    name: 'Σίσσυ',
    radius: 36,
    baseHp: 2400,
    speed: 44,
    damage: 22,
    color: '#d46bff',
    walkSrc: [
      `${bossesBase}/boss_sissy/boss_sissy_walk_01.png`,
      `${bossesBase}/boss_sissy/boss_sissy_walk_02.png`,
    ],
    hitSrc: [`${bossesBase}/boss_sissy/boss_sissy_hit_01.png`],
    tellSrc: [`${bossesBase}/boss_sissy/boss_sissy_tell_01.png`],
    attackSrc: [`${bossesBase}/boss_sissy/boss_sissy_attack_01.png`],
    drawSize: 216,
    walkFrameDuration: 0.16,
    tellDuration: 0.5,
    attackDuration: 0.4,
    recoverDuration: 0.85,
    attackCooldown: 2.1,
  },
};

export const BOSS_POOL: BossId[] = ['grandpa', 'sissy'];

export const BOSS_FIGHT_OPTIONS: Array<{ id: BossId; label: string }> = [
  { id: 'grandpa', label: bossDefinitions.grandpa.name },
  { id: 'sissy', label: bossDefinitions.sissy.name },
];

export function pickRandomBoss(): BossId {
  return BOSS_POOL[Math.floor(Math.random() * BOSS_POOL.length)];
}

export function parseBossId(value: string | undefined): BossId | null {
  if (value === 'grandpa' || value === 'sissy') {
    return value;
  }

  return null;
}

export function getBossDefinition(id: BossId): BossDefinition {
  return bossDefinitions[id];
}

export function computeBossHp(
  definition: BossDefinition,
  durationSeconds: number,
  difficulty: DifficultyModifiers,
): number {
  const durationScale = 0.75 + durationSeconds / 720;
  return definition.baseHp * durationScale * difficulty.enemyHp;
}

export function createBossEntity(
  id: number,
  kind: BossId,
  position: Vec2,
  durationSeconds: number,
  difficulty: DifficultyModifiers,
): Boss {
  const definition = getBossDefinition(kind);
  const maxHp = computeBossHp(definition, durationSeconds, difficulty);

  return {
    id,
    kind,
    position: { ...position },
    radius: definition.radius,
    hp: maxHp,
    maxHp,
    speed: definition.speed * difficulty.enemySpeed,
    damage: definition.damage * difficulty.enemyDamage,
    color: definition.color,
    animTime: 0,
    facingRight: true,
    hitTimer: 0,
    behavior: 'chase',
    phaseTimer: randomRange(0.8, 1.6),
    attackIndex: 0,
    attackDirection: { x: 1, y: 0 },
  };
}

export function allBossSpriteSources(): string[] {
  return Object.values(bossDefinitions).flatMap((boss) => [
    ...boss.walkSrc,
    ...boss.hitSrc,
    ...(boss.tellSrc ?? []),
    ...(boss.attackSrc ?? []),
  ]);
}
