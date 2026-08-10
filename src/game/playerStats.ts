import { getHeroById, heroes } from './heroes';
import type { HeroId, PlayerStats, RunSummary } from './types';

export function createEmptyPlayerStats(
  heroId: HeroId,
  updatedAt = new Date().toISOString(),
): PlayerStats {
  const hero = getHeroById(heroId);

  return {
    heroId: hero.id,
    heroName: hero.name,
    runs: 0,
    totalKills: 0,
    totalGold: 0,
    totalElapsedSeconds: 0,
    bestLevel: 0,
    bestKills: 0,
    bestGold: 0,
    bestElapsedSeconds: 0,
    updatedAt,
  };
}

export function applyRunToPlayerStats(
  current: PlayerStats,
  summary: RunSummary,
): PlayerStats {
  return {
    heroId: summary.heroId,
    heroName: summary.heroName,
    runs: current.runs + 1,
    totalKills: current.totalKills + summary.kills,
    totalGold: current.totalGold + summary.gold,
    totalElapsedSeconds: current.totalElapsedSeconds + summary.elapsedSeconds,
    bestLevel: Math.max(current.bestLevel, summary.level),
    bestKills: Math.max(current.bestKills, summary.kills),
    bestGold: Math.max(current.bestGold, summary.gold),
    bestElapsedSeconds: Math.max(
      current.bestElapsedSeconds,
      summary.elapsedSeconds,
    ),
    updatedAt: summary.createdAt,
  };
}

export function ensureAllHeroStats(stats: PlayerStats[]): PlayerStats[] {
  const byHero = new Map(stats.map((entry) => [entry.heroId, entry]));

  return heroes.map(
    (hero) => byHero.get(hero.id) ?? createEmptyPlayerStats(hero.id),
  );
}
