import {
  applyRunToPlayerStats,
  createEmptyPlayerStats,
  ensureAllHeroStats,
} from '../game/playerStats';
import type { HeroId, PlayerStats, RunSummary } from '../game/types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const RUNS_STORAGE_KEY = 'remoundoi-bros:runs';
const STATS_STORAGE_KEY = 'remoundoi-bros:player-stats';

type PlayerStatsRow = {
  hero_id: string;
  hero_name: string;
  runs: number;
  total_kills: number;
  total_gold: number;
  total_elapsed_seconds: number;
  best_level: number;
  best_kills: number;
  best_gold: number;
  best_elapsed_seconds: number;
  updated_at: string;
};

export async function saveRunSummary(summary: RunSummary): Promise<void> {
  saveLocalRunSummary(summary);
  const nextStats = await updatePlayerStats(summary);

  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseClient();
  const [{ error: runError }, { error: statsError }] = await Promise.all([
    supabase.from('run_summaries').insert({
      hero_id: summary.heroId,
      hero_name: summary.heroName,
      elapsed_seconds: summary.elapsedSeconds,
      kills: summary.kills,
      gold: summary.gold,
      level: summary.level,
      created_at: summary.createdAt,
    }),
    supabase.from('player_stats').upsert(toPlayerStatsRow(nextStats)),
  ]);

  if (runError) {
    console.warn('Could not save run summary to Supabase:', runError.message);
  }

  if (statsError) {
    console.warn('Could not save player stats to Supabase:', statsError.message);
  }
}

export async function loadPlayerStats(): Promise<PlayerStats[]> {
  if (isSupabaseConfigured()) {
    try {
      const remote = await fetchRemotePlayerStats();
      if (remote) {
        saveLocalPlayerStatsList(remote);
        return ensureAllHeroStats(remote);
      }
    } catch (error) {
      console.warn('Could not load player stats from Supabase:', error);
    }
  }

  return ensureAllHeroStats(getLocalPlayerStats());
}

export async function resetAllPlayerStats(): Promise<void> {
  const emptyStats = ensureAllHeroStats([]);
  const updatedAt = new Date().toISOString();
  const resetStats = emptyStats.map((entry) => ({ ...entry, updatedAt }));

  saveLocalPlayerStatsList(resetStats);
  localStorage.removeItem(RUNS_STORAGE_KEY);

  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseClient();
  const [{ error: statsError }, { error: runsError }] = await Promise.all([
    supabase.from('player_stats').upsert(resetStats.map(toPlayerStatsRow)),
    supabase.from('run_summaries').delete().neq('hero_id', ''),
  ]);

  if (statsError) {
    console.warn('Could not reset player stats in Supabase:', statsError.message);
  }

  if (runsError) {
    console.warn('Could not clear run summaries in Supabase:', runsError.message);
  }
}

export function getLocalRunSummaries(): RunSummary[] {
  return readJson<RunSummary[]>(RUNS_STORAGE_KEY, []);
}

async function updatePlayerStats(summary: RunSummary): Promise<PlayerStats> {
  const current = await resolveCurrentPlayerStats(summary.heroId, summary.createdAt);
  const next = applyRunToPlayerStats(current, summary);
  saveLocalPlayerStatsEntry(next);
  return next;
}

async function resolveCurrentPlayerStats(
  heroId: HeroId,
  fallbackUpdatedAt: string,
): Promise<PlayerStats> {
  if (isSupabaseConfigured()) {
    try {
      const remote = await fetchRemotePlayerStatsForHero(heroId);
      if (remote) {
        return remote;
      }
    } catch (error) {
      console.warn('Could not read player stats from Supabase:', error);
    }
  }

  return (
    getLocalPlayerStats().find((entry) => entry.heroId === heroId) ??
    createEmptyPlayerStats(heroId, fallbackUpdatedAt)
  );
}

function saveLocalPlayerStatsEntry(stats: PlayerStats): void {
  const all = getLocalPlayerStats();
  const index = all.findIndex((entry) => entry.heroId === stats.heroId);

  if (index >= 0) {
    all[index] = stats;
  } else {
    all.push(stats);
  }

  saveLocalPlayerStatsList(all);
}

function getLocalPlayerStats(): PlayerStats[] {
  return readJson<PlayerStats[]>(STATS_STORAGE_KEY, []);
}

function saveLocalPlayerStatsList(stats: PlayerStats[]): void {
  localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
}

function saveLocalRunSummary(summary: RunSummary): void {
  const runs = [summary, ...getLocalRunSummaries()].slice(0, 10);
  localStorage.setItem(RUNS_STORAGE_KEY, JSON.stringify(runs));
}

async function fetchRemotePlayerStats(): Promise<PlayerStats[] | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('player_stats').select('*');

  if (error) {
    console.warn('Could not load player stats from Supabase:', error.message);
    return null;
  }

  return (data as PlayerStatsRow[] | null)?.map(fromPlayerStatsRow) ?? [];
}

async function fetchRemotePlayerStatsForHero(
  heroId: HeroId,
): Promise<PlayerStats | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('hero_id', heroId)
    .maybeSingle();

  if (error) {
    console.warn('Could not load player stats from Supabase:', error.message);
    return null;
  }

  return data ? fromPlayerStatsRow(data as PlayerStatsRow) : null;
}

function toPlayerStatsRow(stats: PlayerStats): PlayerStatsRow {
  return {
    hero_id: stats.heroId,
    hero_name: stats.heroName,
    runs: stats.runs,
    total_kills: stats.totalKills,
    total_gold: stats.totalGold,
    total_elapsed_seconds: stats.totalElapsedSeconds,
    best_level: stats.bestLevel,
    best_kills: stats.bestKills,
    best_gold: stats.bestGold,
    best_elapsed_seconds: stats.bestElapsedSeconds,
    updated_at: stats.updatedAt,
  };
}

function fromPlayerStatsRow(row: PlayerStatsRow): PlayerStats {
  return {
    heroId: row.hero_id as HeroId,
    heroName: row.hero_name,
    runs: row.runs,
    totalKills: row.total_kills,
    totalGold: row.total_gold,
    totalElapsedSeconds: row.total_elapsed_seconds,
    bestLevel: row.best_level,
    bestKills: row.best_kills,
    bestGold: row.best_gold,
    bestElapsedSeconds: row.best_elapsed_seconds,
    updatedAt: row.updated_at,
  };
}

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
