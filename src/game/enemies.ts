import type { EnemyDefinition, EnemyId } from './types';

const smallInsectBase = '/assets/sprites/enemies/small_insect';
const largeCockroachBase = '/assets/sprites/enemies/large_cockroach';
const motherSlipperBase = '/assets/sprites/enemies/mother_slipper';
const smallLagoBase = '/assets/sprites/enemies/small_lago';
const largeLagoBase = '/assets/sprites/enemies/large_lago';

export const enemies: Record<EnemyId, EnemyDefinition> = {
  'small-insect': {
    id: 'small-insect',
    radius: 14,
    baseHp: 28,
    minSpeed: 58,
    maxSpeed: 118,
    damage: 10,
    gold: 1,
    color: '#d45cff',
    sprites: {
      walk: [
        `${smallInsectBase}/enemy_small_insect_walk_01.png`,
        `${smallInsectBase}/enemy_small_insect_walk_02.png`,
        `${smallInsectBase}/enemy_small_insect_walk_03.png`,
        `${smallInsectBase}/enemy_small_insect_walk_04.png`,
      ],
      hit: [`${smallInsectBase}/enemy_small_insect_hit_01.png`],
      drawSize: 48,
      walkFrameDuration: 0.1,
    },
  },
  'large-cockroach': {
    id: 'large-cockroach',
    radius: 19,
    baseHp: 58,
    minSpeed: 58,
    maxSpeed: 84,
    damage: 18,
    gold: 3,
    color: '#ff8e72',
    sprites: {
      walk: [
        `${largeCockroachBase}/enemy_large_cockroach_walk_01.png`,
        `${largeCockroachBase}/enemy_large_cockroach_walk_02.png`,
        `${largeCockroachBase}/enemy_large_cockroach_walk_03.png`,
        `${largeCockroachBase}/enemy_large_cockroach_walk_04.png`,
      ],
      hit: [`${largeCockroachBase}/enemy_large_cockroach_hit_01.png`],
      drawSize: 72,
      walkFrameDuration: 0.12,
    },
  },
  'mother-slipper': {
    id: 'mother-slipper',
    radius: 30,
    baseHp: 96,
    minSpeed: 52,
    maxSpeed: 64,
    damage: 24,
    gold: 10,
    color: '#e8a07a',
    sprites: {
      walk: [
        `${motherSlipperBase}/enemy_special_mother_slipper_walk_01.png`,
        `${motherSlipperBase}/enemy_special_mother_slipper_walk_02.png`,
        `${motherSlipperBase}/enemy_special_mother_slipper_walk_03.png`,
        `${motherSlipperBase}/enemy_special_mother_slipper_walk_04.png`,
      ],
      tell: [`${motherSlipperBase}/enemy_special_mother_slipper_tell_01.png`],
      hit: [`${motherSlipperBase}/enemy_special_mother_slipper_hit_01.png`],
      drawSize: 112,
      walkFrameDuration: 0.11,
    },
    tellDuration: 0.45,
    chargeDuration: 0.72,
    chargeSpeedMultiplier: 3.1,
    recoverDuration: 0.85,
    engageDistance: 260,
  },
  'small-lago': {
    id: 'small-lago',
    radius: 16,
    baseHp: 28,
    minSpeed: 58,
    maxSpeed: 118,
    damage: 10,
    gold: 1,
    color: '#3db8b0',
    sprites: {
      walk: [
        `${smallLagoBase}/enemy_small_lago_walk_01.png`,
        `${smallLagoBase}/enemy_small_lago_walk_02.png`,
        `${smallLagoBase}/enemy_small_lago_walk_03.png`,
        `${smallLagoBase}/enemy_small_lago_walk_04.png`,
        `${smallLagoBase}/enemy_small_lago_walk_05.png`,
      ],
      hit: [`${smallLagoBase}/enemy_small_lago_hit_01.png`],
      drawSize: 62,
      walkFrameDuration: 0.1,
    },
  },
  'large-lago': {
    id: 'large-lago',
    radius: 22,
    baseHp: 58,
    minSpeed: 58,
    maxSpeed: 84,
    damage: 18,
    gold: 3,
    color: '#8a9a3a',
    sprites: {
      walk: [
        `${largeLagoBase}/enemy_large_lago_walk_01.png`,
        `${largeLagoBase}/enemy_large_lago_walk_02.png`,
        `${largeLagoBase}/enemy_large_lago_walk_03.png`,
        `${largeLagoBase}/enemy_large_lago_walk_04.png`,
      ],
      hit: [`${largeLagoBase}/enemy_large_lago_hit_01.png`],
      drawSize: 94,
      walkFrameDuration: 0.12,
    },
  },
};

export function getEnemyDefinition(id: EnemyId): EnemyDefinition {
  return enemies[id];
}

export function allEnemySpriteSources(): string[] {
  return Object.values(enemies).flatMap((enemy) => [
    ...enemy.sprites.walk,
    ...enemy.sprites.hit,
    ...(enemy.sprites.tell ?? []),
  ]);
}
