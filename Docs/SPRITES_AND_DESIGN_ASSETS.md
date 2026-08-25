# Remoundoi Bros: Sprites and Design Assets

This document lists the visual assets needed for the first playable versions of Remoundoi Bros. The game is a simple top-down survival arena inspired by Vampire Survivors, with two kid heroes, automatic attacks, enemies, pickups, upgrades, and short survival runs.

## Art Direction

The first art pass should feel playful, bright, readable, and kid-friendly. Prioritize clear silhouettes over detail, because the game will often have many moving objects on screen.

Recommended style:

- Top-down or three-quarter top-down sprites.
- Chunky, readable shapes.
- Bright hero colors with simple accents.
- Enemies should look silly or spooky-lite, not scary.
- Attacks and pickups should be easy to recognize at small sizes.
- Backgrounds should be lower contrast than characters and projectiles.

Avoid:

- Very detailed pixel art that becomes muddy when scaled.
- Dark enemies on dark backgrounds.
- Tiny facial details that only read at large size.
- Realistic horror or violent effects.

## Technical Guidelines

Recommended sprite format:

- `PNG` with transparency.
- Individual image files for the first version.
- Sprite sheets later, once animations are stable.

Recommended base sizes:

- Heroes: `64x64`
- Small enemies: `48x48`
- Large enemies: `64x64` or `80x80`
- Projectiles: `24x24` to `32x32`
- Pickups: `24x24`
- UI icons: `32x32` or `64x64`
- Background tiles or props: `128x128` or larger

Canvas rendering can scale these up or down, so consistency matters more than exact size.

Naming convention:

```txt
hero_big_bro_idle_01.png
hero_big_bro_run_01.png
hero_little_bro_idle_01.png
enemy_blob_walk_01.png
weapon_star_projectile.png
pickup_xp_gem_blue.png
ui_icon_health.png
```

Suggested folders:

```txt
public/assets/sprites/heroes/
public/assets/sprites/enemies/
public/assets/sprites/weapons/
public/assets/sprites/pickups/
public/assets/sprites/effects/
public/assets/ui/
public/assets/backgrounds/
```

## MVP Asset List

These are the minimum assets needed to replace the current placeholder circles.

### Hero 1: Big Bro

Required:

- Idle sprite.
- Run or walk animation, 4 frames minimum.
- Hit flash or hurt pose.
- Small portrait for hero select.
- Optional silhouette/shadow.

Design notes:

- Should feel sturdy, brave, and protective.
- Current placeholder color: mint green.
- Current weapon: Star Popper.

### Hero 2: Little Bro

Required:

- Idle sprite.
- Run or walk animation, 4 frames minimum.
- Hit flash or hurt pose.
- Small portrait for hero select.
- Optional silhouette/shadow.

Design notes:

- Should feel quick, energetic, and mischievous.
- Current placeholder color: blue.
- Current weapon: Moon Beam.

## Enemy Sprites

Start with three enemy types.

### Small Enemy

Required:

- Walk animation, 4 frames.
- Hit state or flash mask.
- Defeat pop effect can be shared.

Design notes:

- Fast, weak, common.
- Should read clearly as a basic swarm enemy.

### Heavy Enemy

Required:

- Walk animation, 4 frames.
- Hit state or flash mask.
- Defeat pop effect can be shared.

Design notes:

- Bigger, slower, tougher.
- Needs a distinct shape from the small enemy.

### Special Enemy

Required later:

- Walk animation, 4 frames.
- Simple tell or glow before special behavior.

Design notes:

- Could be a charger, splitter, ranged enemy, or shielded enemy.
- Not needed for the first playable version.

## Weapons and Attack Effects

Each hero should have one signature weapon first.

### Star Popper

Required:

- Projectile sprite.
- Small impact effect, 3 to 5 frames.
- Optional muzzle sparkle or launch effect.

Design notes:

- Bright, star-shaped, playful.
- Should be readable while moving quickly.

### Moon Beam

Required:

- Projectile sprite or short beam sprite.
- Small impact effect, 3 to 5 frames.
- Optional launch flash.

Design notes:

- Cooler color palette than Star Popper.
- Can be round, crescent-shaped, or comet-like.

### Shared Effects

Required:

- Enemy hit flash.
- Enemy defeat pop.
- XP collection sparkle.
- Level-up burst.

## Pickups

Required:

- XP gem, blue or cyan.
- Health pickup.
- Magnet or vacuum pickup, optional.
- Coin/token pickup, optional.

Design notes:

- XP gems should be highly readable because they drive the level-up loop.
- Pickups should glow more than background props.

## Upgrade UI Assets

Required:

- Speed upgrade icon.
- Damage upgrade icon.
- Fire-rate upgrade icon.
- Health upgrade icon.

Optional:

- Rarity frames.
- Hero-specific upgrade icons.
- Locked/unlocked state icons.

## Environment Assets

The first arena can be simple and mostly procedural.

Required:

- Arena ground texture or tile.
- Subtle grid/tile variation.
- Boundary decoration.
- 3 to 5 small background props.

Possible props:

- Rocks.
- Toys.
- Stars.
- Crates.
- Bushes.
- Small fantasy ruins.

Design notes:

- Props should not be confused with pickups or enemies.
- Keep contrast low enough that gameplay remains readable.

## UI and Branding

Required:

- Game logo or title treatment.
- Hero select portraits.
- Health icon.
- XP icon.
- Kills icon.
- Timer icon.
- Level-up panel style.
- Button states: normal, hover, active, disabled.

Optional:

- App icon.
- Loading screen image.
- Social preview image.
- Victory/defeat badges.

## Animation Priorities

Build animations in this order:

1. Hero run animations.
2. Enemy walk animations.
3. Projectile and impact effects.
4. XP collection effect.
5. Level-up effect.
6. Hero idle animations.
7. UI flourishes.

The first game version can feel good with only movement, attacks, and impact effects animated.

## Sprite Implementation Notes

The current prototype renders placeholder shapes in `src/game/Game.ts`. When sprites are added, rendering should probably move toward a small asset loader and sprite renderer rather than adding image code directly into the game logic.

Suggested future files:

```txt
src/render/assets.ts
src/render/spriteRenderer.ts
src/render/animation.ts
src/game/data/heroDefinitions.ts
src/game/data/enemyDefinitions.ts
src/game/data/weaponDefinitions.ts
```

Keep gameplay data separate from image filenames where possible, so the art can change without rewriting combat logic.

## First Asset Batch

For the first art handoff, request only this:

- Big Bro idle sprite.
- Big Bro 4-frame run animation.
- Little Bro idle sprite.
- Little Bro 4-frame run animation.
- One small enemy 4-frame walk animation.
- One heavy enemy 4-frame walk animation.
- Star Popper projectile.
- Moon Beam projectile.
- XP gem.
- Health pickup.
- One ground texture.
- Four upgrade icons.

That is enough to make the prototype feel like a real game without producing a huge asset list too early.

## Stage, Boss, and New Weapon Placeholders

The following paths are wired in code with solid-color PNG placeholders. Replace each file in place when final art is ready.

Zagka beach already uses sliced art from `Sprites/zagka beach assets.png` (floor mosaic, stage thumb, and blockers). Re-extract with `node scripts/extract-zagka-beach.mjs` after `npm install sharp`.

Beach pufferfish (Lago) and the Grandpa / Sissy bosses are sliced from `Sprites/Lago_small.png`, `Sprites/Lago_large.png`, `Sprites/Grandpa.png`, and `Sprites/Sissi.png`. Re-extract with `node scripts/extract-character-sheets.mjs`.

### Stage select and backgrounds

```txt
public/assets/ui/stages/stage_koroni_kids_room_thumb.png
public/assets/ui/stages/stage_zagka_beach_thumb.png
public/assets/backgrounds/background_zagka_beach_floor_tile.png
```

### Beach blockers

```txt
public/assets/sprites/props/beach_blockers/prop_beach_seaweed_green.png
public/assets/sprites/props/beach_blockers/prop_beach_seaweed_teal.png
public/assets/sprites/props/beach_blockers/prop_beach_seaweed_purple.png
public/assets/sprites/props/beach_blockers/prop_beach_tire.png
public/assets/sprites/props/beach_blockers/prop_beach_rocks.png
```

### Bosses

Sliced from `Sprites/Grandpa.png` and `Sprites/Sissi.png`:

```txt
public/assets/sprites/enemies/boss_grandpa/boss_grandpa_walk_01.png
public/assets/sprites/enemies/boss_grandpa/boss_grandpa_walk_02.png
public/assets/sprites/enemies/boss_grandpa/boss_grandpa_walk_03.png
public/assets/sprites/enemies/boss_grandpa/boss_grandpa_walk_04.png
public/assets/sprites/enemies/boss_grandpa/boss_grandpa_hit_01.png
public/assets/sprites/enemies/boss_grandpa/boss_grandpa_tell_01.png
public/assets/sprites/enemies/boss_grandpa/boss_grandpa_attack_pan_01.png
public/assets/sprites/enemies/boss_grandpa/boss_grandpa_attack_scooter_01.png
public/assets/sprites/enemies/boss_grandpa/boss_grandpa_scooter_01.png
public/assets/sprites/enemies/boss_grandpa/boss_grandpa_scooter_02.png
public/assets/sprites/enemies/boss_grandpa/boss_grandpa_scooter_spark_01.png
public/assets/sprites/enemies/boss_sissy/boss_sissy_walk_01.png
public/assets/sprites/enemies/boss_sissy/boss_sissy_walk_02.png
public/assets/sprites/enemies/boss_sissy/boss_sissy_hit_01.png
public/assets/sprites/enemies/boss_sissy/boss_sissy_tell_01.png
public/assets/sprites/enemies/boss_sissy/boss_sissy_attack_01.png
```

### Beach enemies (Lago)

Sliced from `Sprites/Lago_small.png` and `Sprites/Lago_large.png`. Used on Zagka beach.

```txt
public/assets/sprites/enemies/small_lago/
public/assets/sprites/enemies/large_lago/
```

### New weapons (icon + primary effect sprite)

```txt
public/assets/sprites/weapons/watergun/
public/assets/sprites/weapons/hot-wheels/
public/assets/sprites/weapons/bad-food/
public/assets/sprites/weapons/insomnia/
public/assets/sprites/weapons/presents/
public/assets/sprites/weapons/knife/
public/assets/sprites/weapons/slippers/
public/assets/sprites/weapons/machinegun/
```

Regenerate placeholders with:

```bash
node scripts/generate-placeholders.mjs
```
