# Remoundoi Bros: Enemy Sprites and Design Assets

Art production guide for every regular (non-boss) enemy. Use this when creating game-ready enemy sprites, hit frames, and special-behavior tells.

Beach Lago pufferfish enemies already have final art sliced from `Sprites/Lago_small.png` and `Sprites/Lago_large.png`. They are listed here as the reference for style, sizes, naming, and how complete an enemy set should look.

Kids-room enemies (insect, cockroach, mother slipper) still use solid-color placeholder PNGs. The game falls back to colored circles if a sprite fails to load.

For boss body sprites and boss attack VFX, see `Docs/ATTACKS_AND_SPRITE_REQUIREMENTS.md`.

Source behavior: `src/game/enemies.ts`, `src/game/stages.ts`, `src/game/pickups.ts`, and `src/game/Game.ts`.

## Art Direction

Playful, bright, readable, kid-friendly. Clear silhouettes over detail. Enemies must stay recognizable at small on-screen sizes, often dozens on screen at once.

- Top-down or three-quarter top-down.
- Chunky shapes, strong color, simple accents.
- Silly or spooky-lite — not scary, not realistic horror.
- Enemies should read as cartoon bugs, beach creatures (fish, squid), or household chaos (slippers, toys), never as gore or predators.
- Distinct body shapes between swarm, heavy, and special roles so players can spot threats instantly.

Avoid:

- Very detailed pixel art that becomes muddy when scaled down.
- Dark enemies on dark floors (kids-room wood and beach sand both need contrast).
- Tiny facial details that only read at large size.
- Confusing an enemy silhouette with XP gems, pickups, or player projectiles.

## Technical Guidelines

Format:

- Transparent `PNG`.
- One file per frame. No sheets in `public/` yet (source sheets live under `Sprites/`).
- Center the subject in the canvas. The renderer draws from the image center.

Recommended source sizes (match the finished Lago pair):

| Asset type | Source size | On-screen draw |
| --- | --- | --- |
| Small swarm enemy body | `128x128` to `192x192` (Lago uses `296`) | `48px` to `62px` |
| Heavy enemy body | `192x192` to `256x256` (Lago uses `424`) | `72px` to `94px` |
| Special enemy body | `256x256` to `320x320` | `112px` |
| Hit flash frame | same canvas as walk frames | replaces walk for `0.18s` |
| Tell / wind-up pose | same canvas as walk frames | shown during tell phase |
| Special attack VFX (tentacle, lash) | `512x64` or `256x128` | scaled to arena edge, ~36–48px thick |

Filenames use `enemy_{role}_{name}_{variant}_{frame}.png`. Put each enemy in its own folder:

```txt
public/assets/sprites/enemies/small_insect/
public/assets/sprites/enemies/large_cockroach/
public/assets/sprites/enemies/mother_slipper/
public/assets/sprites/enemies/small_lago/
public/assets/sprites/enemies/large_lago/
public/assets/sprites/enemies/giant_squid/
```

Special-attack VFX for enemies (e.g. giant squid tentacle) live in the same folder as the enemy body. See `Docs/ATTACKS_AND_SPRITE_REQUIREMENTS.md` for tentacle frame specs.

Walk animations should face **right**. The renderer flips on X when the enemy faces left (`flipX: !enemy.facingRight`).

Animation timing comes from `walkFrameDuration` in `src/game/enemies.ts` (typically `0.10s` for small, `0.11`–`0.12s` for heavy).

## Status Legend

- **Done** — final art is in the game.
- **Placeholder** — a solid-color PNG exists at the path; replace in place.
- **Missing** — no sprite yet; the game draws a colored circle using the enemy's fallback `color`.

---

## Roster Overview

| Greek name | Id | Role | Stage | Art status |
| --- | --- | --- | --- | --- |
| Μικρό Έντομο | `small-insect` | Fast swarm | Δωμάτιο Κωρωνης κωδ | Placeholder |
| Μεγάλη Κατσαρίδα | `large-cockroach` | Slow heavy | Δωμάτιο Κωρωνης κωδ | Placeholder |
| Παντόφλα της Μαμάς | `mother-slipper` | Special charger | Δωμάτιο Κωρωνης κωδ | Placeholder |
| Μικρό Λάγο | `small-lago` | Fast swarm | Παραλία Ζαγκά | Done |
| Μεγάλο Λάγο | `large-lago` | Slow heavy | Παραλία Ζαγκά | Done |
| Γιγαντιαία Σουπιά | `giant-squid` | Special tentacle | Παραλία Ζαγκά | Sprites done; tentacle AI pending |

### Stage assignments

| Stage | Small enemy | Heavy enemy | Special enemy |
| --- | --- | --- | --- |
| `koroni-kids-room` | `small-insect` | `large-cockroach` | `mother-slipper` |
| `zagka-beach` | `small-lago` | `large-lago` | `giant-squid` |

Each stage swaps the entire enemy roster. Each stage has one special enemy with unique attack behavior.

### Enemy roles

**Swarm (small):** high spawn rate, low HP, fast, low contact damage. Drops blue XP gem (`xp-gem-blue`).

**Heavy (large):** bigger hitbox, more HP, slower, higher damage. Drops purple XP gem (`xp-gem-purple-large`). Can also roll a special pickup (magnet, bomb, chest, book) based on player level.

**Special (`mother-slipper`, `giant-squid`):** unique behavior, rare spawn after 40s (chance ramps 8% → 22%), always drops a special pickup not already on the map. Only one special enemy of a given kind can be alive at once.

---

## Beach Enemies (art complete)

Keep these as the quality bar. Replace only if a specific frame needs a revision.

Re-extract from source sheets with:

```bash
node scripts/extract-character-sheets.mjs
```

Source sheets: `Sprites/Lago_small.png`, `Sprites/Lago_large.png`. Extraction report: `Sprites/character_sheets_extract_report.json`.

### 1. Μικρό Λάγο (`small-lago`)

**Where:** Παραλία Ζαγκά (`zagka-beach`). Replaces `small-insect` on the beach stage.

**What happens:** chases the player at high speed. No special behavior — pure swarm filler. Stats scale with run progress and difficulty.

**Level 1 (base):** HP 28, speed 58–118, contact damage 10, radius 14, gold 1.

| Need | File | Source size | Draw | Status |
| --- | --- | --- | --- | --- |
| Walk | `enemy_small_lago_walk_01.png` to `_05.png` | 296 | 62px | Done |
| Hit | `enemy_small_lago_hit_01.png` | 296 | 62px | Done |

**Look:** small teal/cyan cartoon pufferfish or beach blob creature. Rounded, bouncy silhouette. Five walk frames give a lively swim/waddle. Hit frame should read as a quick flinch or puff, not a death animation.

**Folder:** `public/assets/sprites/enemies/small_lago/`

### 2. Μεγάλο Λάγο (`large-lago`)

**Where:** Παραλία Ζαγκά. Replaces `large-cockroach` on the beach stage.

**What happens:** slower, tougher chase enemy. Same AI as cockroach — walks toward the player, no tells. Can roll special pickup drops.

**Level 1 (base):** HP 58, speed 58–84, contact damage 18, radius 19, gold 3.

| Need | File | Source size | Draw | Status |
| --- | --- | --- | --- | --- |
| Walk | `enemy_large_lago_walk_01.png` to `_04.png` | 424 | 94px | Done |
| Hit | `enemy_large_lago_hit_01.png` | 424 | 94px | Done |

**Look:** bigger olive/green pufferfish. Must read clearly larger than small Lago at a glance — wider body, spikier fins or puff. Four walk frames. Distinct from the small variant in both size and color (`#8a9a3a` fallback).

**Folder:** `public/assets/sprites/enemies/large_lago/`

### 3. Γιγαντιαία Σουπιά (`giant-squid`)

**Where:** Παραλία Ζαγκά only. Beach special enemy — mirrors `mother-slipper` spawn rules and rewards.

**What happens:** four-phase behavior (same cadence as mother slipper):

1. **Chase** — swims toward the player at normal speed until within 260px and phase timer expires.
2. **Tell** (0.45s) — stops and shows tell sprite; tentacles twitch so the player reads "lash incoming."
3. **Attack** — fires one prolonged tentacle along a locked **X or Y axis** (whichever aligns closer with the player). The tentacle **extends** from the squid body to the nearest arena edge (~0.55s), **holds** at full length (~0.20s), then **retracts** (~0.45s). The player takes contact damage when overlapping the tentacle hitbox during extend, hold, or retract. Axis is chosen at tell start: horizontal if `|dx| ≥ |dy|`, else vertical; direction points toward the player.
4. **Recover** (0.85s) — slows to 45% speed, then returns to chase.

Always drops a special pickup (magnet / bomb / chest / book) that is not already on the map.

**Level 1 (base):** HP 96, speed 52–64, contact damage 24, radius 30, gold 10. Same stats as `mother-slipper`.

**Required body sprites:**

| Need | File | Size | Draw | Status |
| --- | --- | --- | --- | --- |
| Walk | `enemy_special_giant_squid_walk_01.png` to `_04.png` | 256–320 | 112px | Done |
| Tell | `enemy_special_giant_squid_tell_01.png` | 256–320 | 112px | Done |
| Hit | `enemy_special_giant_squid_hit_01.png` | 256–320 | 112px | Done |
| Attack pose | `enemy_special_giant_squid_attack_01.png` | 256–320 | 112px | Done |

**Required tentacle VFX** (full spec in `Docs/ATTACKS_AND_SPRITE_REQUIREMENTS.md`):

| Need | File | Size | Status |
| --- | --- | --- | --- |
| Tentacle segment, facing right | `enemy_special_giant_squid_tentacle_01.png` to `_03.png` | 512×64 or 256×128 | Done |
| Optional tip splash | `enemy_special_giant_squid_tentacle_tip_01.png` | 96 | Done |

**Look:** big cartoon beach squid — deep purple/indigo body (`#5a4a8a` fallback), lighter suckers, silly eyes. Must read clearly larger than large Lago. **Tell** frame: puffed mantle, raised tentacles, maybe a small ink bubble. **Attack** pose: one tentacle already unfurling from the body. Tentacle art is a stretchy segmented strip with suckers; code scales length to the arena edge and rotates for vertical lashes. Not realistic tentacle horror — bouncy beach-monster energy.

**Folder:** `public/assets/sprites/enemies/giant_squid/`

---

## Kids-Room Enemies (need game-ready art)

These three enemies are wired in code with solid-color placeholder PNGs. Replace each listed file in place. The game already expects the exact filenames below.

Design metadata for Mother Slipper lives in `Sprites/special_mother_slipper/enemy_special_mother_slipper_metadata.json` (collision box, tell timing, walk cycle notes).

### 4. Μικρό Έντομο (`small-insect`)

**Where:** Δωμάτιο Κωρωνης κωδ (`koroni-kids-room`). Default swarm enemy.

**What happens:** fastest common enemy. Spawns often, dies quickly, fills the screen. Pure chase AI.

**Level 1 (base):** HP 28, speed 58–118, contact damage 10, radius 14, gold 1.

**Required sprites:**

| Need | File | Size | Draw | Status |
| --- | --- | --- | --- | --- |
| Walk | `enemy_small_insect_walk_01.png` to `_04.png` | 128–192 | 48px | Placeholder |
| Hit | `enemy_small_insect_hit_01.png` | 128–192 | 48px | Placeholder |

**Look:** tiny cartoon bug or silly insect — purple/magenta accent (`#d45cff` fallback). Big eyes, round body, maybe wiggly legs. Must stay readable at 48px draw size. Four walk frames with a quick scurry cycle. Hit frame: squish, flash, or brief knockback pose.

**Folder:** `public/assets/sprites/enemies/small_insect/`

### 5. Μεγάλη Κατσαρίδα (`large-cockroach`)

**Where:** Δωμάτιο Κωρωνης κωδ. Heavy enemy; spawn rate rises as the run progresses (up to ~45% of spawns late run).

**What happens:** slower chase, more HP and damage. Can roll special pickup drops (magnet, bomb, chest, book).

**Level 1 (base):** HP 58, speed 58–84, contact damage 18, radius 19, gold 3.

**Required sprites:**

| Need | File | Size | Draw | Status |
| --- | --- | --- | --- | --- |
| Walk | `enemy_large_cockroach_walk_01.png` to `_04.png` | 192–256 | 72px | Placeholder |
| Hit | `enemy_large_cockroach_hit_01.png` | 192–256 | 72px | Placeholder |

**Look:** chunky cartoon cockroach — coral/orange accent (`#ff8e72` fallback). Wider and lower silhouette than the insect. Antennae and shell shape should read at 72px. Kid-gross but funny, not realistic. Hit frame: recoil or shell clatter.

**Folder:** `public/assets/sprites/enemies/large_cockroach/`

### 6. Παντόφλα της Μαμάς (`mother-slipper`)

**Where:** Δωμάτιο Κωρωνης κωδ only. Special enemy — rare spawn after 40s elapsed, chance ramps from 8% to 22%. Only one alive at a time.

**What happens:** four-phase behavior:

1. **Chase** — walks toward the player at normal speed until within 260px and phase timer expires.
2. **Tell** (0.45s) — stops and shows tell sprite; player should read "something is coming."
3. **Charge** (0.72s) — dashes in a locked direction at 3.1× speed.
4. **Recover** (0.85s) — slows to 45% speed, then returns to chase.

Always drops a special pickup (magnet / bomb / chest / book) that is not already on the map.

**Level 1 (base):** HP 96, speed 52–64, contact damage 24, radius 30, gold 10.

**Required sprites:**

| Need | File | Size | Draw | Status |
| --- | --- | --- | --- | --- |
| Walk | `enemy_special_mother_slipper_walk_01.png` to `_04.png` | 256–320 | 112px | Placeholder |
| Tell | `enemy_special_mother_slipper_tell_01.png` | 256–320 | 112px | Placeholder |
| Hit | `enemy_special_mother_slipper_hit_01.png` | 256–320 | 112px | Placeholder |

**Optional (not wired yet):**

| Need | Suggested file | Notes |
| --- | --- | --- |
| Charge dash | `enemy_special_mother_slipper_charge_01.png` | Could replace walk during charge phase |
| Recover | `enemy_special_mother_slipper_recover_01.png` | Slumped or dizzy after the dash |

**Look:** giant fuzzy house slipper with a face — peach/tan accent (`#e8a07a` fallback). The **tell** frame is the most important: raised slipper, wiggle, or glowing "you're in trouble" pose (see metadata: "raised-slipper tell as a warning before a short scold/charge burst"). Walk cycle: contact → passing → opposite contact → passing. Family-scolding joke, not violent.

**Folder:** `public/assets/sprites/enemies/mother_slipper/`

**Design reference:** `Sprites/special_mother_slipper/enemy_special_mother_slipper_metadata.json` — collision box `{ x: 19, y: 8, w: 41, h: 68 }` on an 80×80 frame (scale up proportionally for final art).

---

## Shared Enemy VFX

These affect all enemies. Most reuse weapon art today; dedicated enemy VFX are optional polish.

| Effect | How it works today | Dedicated enemy art | Status |
| --- | --- | --- | --- |
| Hit flash | `hit` sprite shown for `0.18s` after damage | Per-enemy hit frame (listed above) | Partial — Lago done, kids-room placeholder |
| Slow indicator | `status_slow_web_01.png` floats above slowed enemies | Reuses web-pool weapon sprite | Done (weapon art) |
| Defeat pop | No VFX — enemy vanishes, XP gem spawns | Optional shared puff | Missing |
| Contact damage | Invisible — player loses HP on overlap | No sprite needed | — |

**Optional shared defeat pop** (not wired in code yet):

| Need | Suggested file | Size | Status |
| --- | --- | --- | --- |
| Defeat puff | `effect_enemy_defeat_01.png` to `_03.png` | 96 | Missing |

**Look:** small cartoon poof, stars, or dust — same playful tone as weapon hit sparks. One shared animation for all enemy types is fine.

---

## Spawning and Scaling Notes

For artists tuning readability across a full run:

- **Spawn mix:** mostly small enemies; heavy chance scales with run progress (0% early → ~45% late). Special enemies (`mother-slipper` on kids-room, `giant-squid` on beach) are a separate roll after 40s.
- **Stat scaling:** HP × `(1 + progress × 2.5)` × difficulty; speed and damage also rise with progress.
- **Difficulty modifiers** (`src/game/difficulty.ts`): `super-easy` through `extra-hard` scale enemy HP, damage, speed, and spawn rate.
- **Drops:** small → blue gem; heavy → purple gem (+ special roll); special enemies → guaranteed special pickup.

---

## Production Order

1. **Small insect walk + hit** — unblocks the default stage visually; highest spawn count.
2. **Large cockroach walk + hit** — second-most visible kids-room enemy.
3. **Mother slipper walk + tell + hit** — kids-room special; tell frame is highest priority.
4. **Giant squid walk + tell + attack + tentacle VFX** — beach special; tentacle strip is the critical readable element.
5. **Optional charge / recover poses** — hook up in `getEnemySpriteSrc` if added.
6. **Optional shared defeat pop** — one 3-frame puff for all enemies.
7. **Polish pass on Lago** — only if a frame needs revision; beach swarm/heavy art is already shippable.

Replace placeholders in place. Do not rename files already wired in `src/game/enemies.ts` unless code is updated to match.

---

## Checklist for a Finished Enemy Sprite Set

An enemy is art-complete when it has:

- Walk loop (`4` frames minimum; `5` is fine — see small Lago) at the source size in the tables above.
- At least one **hit** frame that reads clearly at draw size for `0.18s`.
- A **tell** frame (and **attack** pose if wired) if the enemy has special behavior (`mother-slipper`, `giant-squid`).
- Tentacle / lash VFX if the enemy has a ranged special attack (`giant-squid`).
- Transparent padding and a centered pivot.
- A silhouette distinct from other enemies in the same stage, from XP gems, and from common projectiles.
- Walk art facing **right**; flip is handled in code.
- Colors that stay readable on both the kids-room floor and beach sand (test both if palettes overlap).

---

## Source Sheets and Scripts

| Enemy | Source sheet | Extract command |
| --- | --- | --- |
| Small Lago | `Sprites/Lago_small.png` | `node scripts/extract-character-sheets.mjs` |
| Large Lago | `Sprites/Lago_large.png` | `node scripts/extract-character-sheets.mjs` |
| Small insect | — (hand-draw or new sheet) | — |
| Large cockroach | — (hand-draw or new sheet) | — |
| Mother slipper | `Sprites/special_mother_slipper/` (metadata + source sheet reference) | manual export to `public/assets/sprites/enemies/mother_slipper/` |
| Giant squid | — (hand-draw or new sheet) | manual export to `public/assets/sprites/enemies/giant_squid/` |

After re-extracting Lago frames, verify `drawSize` in `src/game/enemies.ts` still matches the suggested values in `Sprites/character_sheets_extract_report.json` (`62` for small, `94` for large).

Implementation files:

```txt
src/game/enemies.ts
src/render/spriteRenderer.ts
src/render/animation.ts
src/render/assets.ts
```

Keep gameplay stats and sprite paths in `enemies.ts` so art can change without rewriting combat logic.
