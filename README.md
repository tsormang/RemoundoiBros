# Remoundoi Bros

A small Vite + TypeScript browser game base for a family-friendly survival arena game.

## Run locally

```bash
npm install
npm run dev
```

## Current prototype

- Two selectable heroes.
- Keyboard and touch controls.
- Canvas-rendered placeholder characters, enemies, pickups, and projectiles.
- A compact survival loop with waves, XP gems, level ups, and a game-over summary.
- Supabase-ready save adapter that falls back to local storage until credentials are configured.

## Supabase

Copy `.env.example` to `.env` and fill in:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Apply `supabase/schema.sql` in the Supabase SQL editor so `run_summaries` and `player_stats` exist.

Career stats are stored per hero (Antonis / Panagiotis) in `player_stats`, with localStorage as a fallback when cloud credentials are missing.
