# Remoundoi Bros: Attacks and Sprite Requirements

Art production guide for every player attack, every boss attack, and special enemy attack VFX. Use this when creating game-ready sprites.

Regular enemy body sprites are in `Docs/SPRITES_AND_DESIGN_ASSETS.md`. This file covers attack VFX that extend beyond the enemy body (e.g. giant squid tentacle).

The original five attacks (Αστροβολές, Ιστός, Περιστρεφόμενο Παιχνίδι, Μαξιλάρι Pop, Μπίλια Αναπήδησης) already have final art. They are listed here as the reference for style, sizes, naming, and how complete a weapon should look.

Unlockable attacks and boss attack VFX still need real sprites. Those currently use solid-color placeholders or colored shapes in code.

Source design: `Docs/remoundoi-bros-attack-system-design.docx`. Game names and behavior come from `src/game/weapons.ts`, `src/game/bosses.ts`, `src/game/enemies.ts`, and `src/game/Game.ts`.

## Art Direction

Playful, bright, readable, kid-friendly. Clear silhouettes over detail. Attacks must stay recognizable at small on-screen sizes, often with many objects visible at once.

- Top-down or three-quarter top-down.
- Chunky shapes, strong color, simple accents.
- No realistic violence, blood, or horror.
- Attacks should read as toys, household objects, or silly family chaos.

## Technical Guidelines

Format:

- Transparent `PNG`.
- One file per frame. No sheets yet.
- Center the subject in the canvas. The renderer draws from the image center.

Recommended source sizes (match the finished core five):

| Asset type | Source size | On-screen draw |
| --- | --- | --- |
| Weapon / attack icon | `256x256` | UI cards, ~48px |
| Bro upgrade icon (passive / stat) | `256x256` | Level-up cards, ~48px |
| Projectile | `64x64` | `32px` |
| Small hit / spark | `96x96` | `36px` |
| Pool, cloud, explosion, puff | `192x192` | `88px` to `128px`, scaled by radius |
| Wide cone / slash / shockwave | `256x128` or `192x192` | rotated toward the shot |
| Boss body | keep current sheet size | Grandpa `200px`, Sissy `216px` |
| Boss projectile | `64x64` to `96x96` | ~`20px` to `40px` |
| Special enemy tentacle / axis lash | `512x64` or `256x128` | scaled to arena edge, ~36–48px thick |

Filenames use `{role}_{name}_{variant}_{frame}.png`. Put player attacks in:

```txt
public/assets/sprites/weapons/{weapon-id}/
```

Put boss body and boss attack VFX in:

```txt
public/assets/sprites/enemies/boss_grandpa/
public/assets/sprites/enemies/boss_sissy/
```

Put special enemy body and attack VFX in:

```txt
public/assets/sprites/enemies/mother_slipper/
public/assets/sprites/enemies/giant_squid/
```

Put bro upgrade icons (speed, health, passives) in:

```txt
public/assets/ui/upgrades/
```

Directional sprites should face **right**. Characters already flip on X. Projectiles, cones, slashes, cars, waves, and pans should also face right so code can rotate them to travel direction.

## Status Legend

- **Done** — final art is in the game.
- **Placeholder** — a solid-color PNG exists at the path; replace in place.
- **Missing** — no sprite yet; the game draws a colored shape.

---

## Roster Overview

| Greek name | Id | Role | Art status |
| --- | --- | --- | --- |
| Αστροβολές | `star-throw` | Piercing projectile | Done |
| Ιστός | `web-pool` | Slow pool | Done |
| Περιστρεφόμενο Παιχνίδι | `orbit-toy` | Orbiting toys | Done |
| Μαξιλάρι Pop | `pillow-pop` | Cluster explosion | Done |
| Μπίλια Αναπήδησης | `marble-bounce` | Ricochet marble | Done |
| Νεροπίστολο | `watergun` | Water cone | Done |
| Αυτοκινητάκια | `hot-wheels` | Piercing cars | Done |
| Χαλασμένο φαγητό | `bad-food` | Toxic cloud | Done |
| Αϋπνία | `insomnia` | Shadow trail | Done |
| Δώρα | `presents` | Timed gift blast | Done |
| Μαχαίρι | `knife` | Rear slash | Done |
| Παντόφλες | `slippers` | Thrown slipper | Done |
| Πολυβόλο | `machinegun` | Burst fire | Done |
| Παππούς — Καυτή κατσαρόλα | `hot-pan` | Thrown pan, then burst | Done |
| Παππούς — Πατίνι | `scooter` | Fast piercing scooter | Done |
| Σίσσυ — Σονικό κύμα | sonic wave | Wide shockwave | Done |
| Σίσσυ — Ποντίκια | `mouse` | Radial mice | Done |
| Γιγαντιαία Σουπιά — Καλαμάρι | `giant-squid` | Axis tentacle to screen edge | VFX done; attack logic pending |

A run can hold up to five player attacks. Each Bro starts with one. Unlockable attacks appear after beating a boss, then can drop on later level-ups. Attack level cap is 5. The original five can evolve at level 5 plus the matching passive at level 3.

---

## Core Five (art complete)

Keep these as the quality bar. Replace only if a specific frame needs a revision.

### 1. Αστροβολές (`star-throw`)

**Who:** starting attack for Αντώνης (Big Bro).

**What happens:** a bright star flies at the nearest enemy and pierces through the line instead of dying on the first hit. At higher levels it fires extra stars with a small spread. Evolution **Αστροβροχή** fires two offset stars with high pierce and a chance to split a smaller star.

**Level 1:** damage 18, cooldown 0.65s, speed 560, amount 1, pierce 2.

| Need | File | Size | Status |
| --- | --- | --- | --- |
| Icon | `weapon_star_throw_icon_256.png` | 256 | Done |
| Projectile | `weapon_star_projectile_01.png`, `_02.png` | 64 | Done |
| Trail | `weapon_star_trail_01.png` | 96x64 | Done |
| Hit sparkle | `weapon_star_hit_01.png`, `_02.png` | 96 | Done |
| Evolved projectile | `weapon_shooting_stars_projectile_01.png` | 64 | Optional, unused |

**Look:** yellow/gold star, readable while moving fast. Hit sparkles should pop, not linger.

### 2. Ιστός (`web-pool`)

**Who:** starting attack for Παναγιώτης (Lil Bro).

**What happens:** a small web glob flies at the nearest enemy. On hit it can leave a sticky pool. Enemies in the pool are slowed and take light tick damage. Evolution **Φωλιά Ιστού** always spawns a pool, lasts longer, and pulls enemies toward the center.

**Level 1:** impact 12, cooldown 1.20s, pool chance 35%, pool radius 54, duration 4s, slow 35%.

| Need | File | Size | Status |
| --- | --- | --- | --- |
| Icon | `weapon_web_pool_icon_256.png` | 256 | Done |
| Glob | `weapon_web_glob_01.png`, `_02.png` | 64 | Done |
| Pool loop | `weapon_web_pool_01.png` to `_03.png` | 192 | Done |
| Slow marker | `status_slow_web_01.png` | 96 | Done |
| Evolved pool | `weapon_web_nest_pool_01.png` | 192 | Done |
| Nest center | `weapon_web_nest_center_01.png` | 128 | Done |

**Look:** pale web / mint silk. Pool sits on the ground and must not hide enemies. Nest center is a denser web knot.

### 3. Περιστρεφόμενο Παιχνίδι (`orbit-toy`)

**Who:** level-up attack for either Bro.

**What happens:** toy blocks or plush charms orbit the hero and damage enemies they touch. Evolution **Καρουζέλ Παιχνιδιών** uses three larger star-shaped toys on a wider ring.

**Level 1:** damage 10, count 1, orbit radius 72, hit delay 0.60s.

| Need | File | Size | Status |
| --- | --- | --- | --- |
| Icon | `weapon_orbit_toy_icon_256.png` | 256 | Done |
| Toy A | `weapon_orbit_block_01.png` | 64 | Done |
| Toy B | `weapon_orbit_plush_01.png` | 64 | Done |
| Contact puff | `weapon_orbit_hit_01.png` | 96 | Done |
| Evolved toy | `weapon_toy_carousel_star_01.png` | 64 | Done |

**Look:** chunky toys with distinct silhouettes. They spin around the hero, so they must read from every angle.

### 4. Μαξιλάρι Pop (`pillow-pop`)

**Who:** level-up attack for either Bro.

**What happens:** a pillow flies toward the densest nearby cluster and bursts. At level 5 it leaves a short dust puff. Evolution **Καταιγίδα Μαξιλαριών** leaves a stronger 2s storm puff.

**Level 1:** explosion 24, cooldown 2.40s, blast radius 70.

| Need | File | Size | Status |
| --- | --- | --- | --- |
| Icon | `weapon_pillow_pop_icon_256.png` | 256 | Done |
| Projectile | `weapon_pillow_projectile_01.png` | 64 | Done |
| Burst | `weapon_pillow_pop_01.png` to `_03.png` | 192 | Done |
| Lingering puff | `weapon_pillow_puff_loop_01.png` | 192 | Done |
| Evolved storm | `weapon_pillow_storm_01.png`, `_02.png` | 192 | Done |

**Look:** soft white/pastel feathers, not a fire explosion. Storm frames should feel busier and slightly larger.

### 5. Μπίλια Αναπήδησης (`marble-bounce`)

**Who:** level-up attack for either Bro.

**What happens:** a fast marble bounces between enemies and off blockers. Evolution **Σούπερ Μπίλια** splits into two smaller marbles on the last bounce.

**Level 1:** damage 14, cooldown 1.00s, speed 620, bounces 3.

| Need | File | Size | Status |
| --- | --- | --- | --- |
| Icon | `weapon_marble_bounce_icon_256.png` | 256 | Done |
| Marble | `weapon_marble_01.png`, `_02.png` | 64 | Done |
| Bounce spark | `weapon_marble_bounce_spark_01.png` | 96 | Done |
| Super marble | `weapon_super_marble_01.png` | 64 | Done |
| Split marble | `weapon_super_marble_small_01.png` | 64 | Done |

**Look:** glossy toy marble, high contrast. Super marble is bigger and brighter. Split marble is a smaller copy.

---

## Unlockable Attacks (need game-ready art)

These eight attacks are in the game with 64x64 color-block placeholders. Replace each listed file in place. Icons must be real `256x256` art, even though the placeholder is currently 64px. Add the extra frames below even if code only wires one file today; extra frames can be hooked up without renaming.

Folder for each: `public/assets/sprites/weapons/{id}/`.

### 6. Νεροπίστολο (`watergun`)

**Unlock:** boss reward, then available on level-up.

**What happens:** a short water cone sprays toward the nearest enemy. It is not a bullet; it is a brief fan in front of the hero. Range grows with level. Duration is about 0.22s, so the spray must read in one or two frames.

**Level 1:** damage 8, cooldown 0.55s, range 152, half-angle ~24°.

**Required sprites:**

| Need | Suggested file | Size | Status |
| --- | --- | --- | --- |
| Icon | `weapon_watergun_icon_256.png` | 256 | Done |
| Spray cone, facing right | `weapon_watergun_spray_01.png`, `_02.png`, `_03.png` | 256x128 | Done |
| Splash hit | `weapon_watergun_hit_01.png`, `_02.png` | 96 | Done |

**Look:** bright cyan water, toy squirt gun droplets, not a military stream. The cone sprite should be densest near the hero and fade toward the tip. Leave transparent padding so rotation stays centered on the hero.

### 7. Αυτοκινητάκια (`hot-wheels`)

**What happens:** toy cars shoot at the nearest enemy and pierce through several targets. From level 3, two cars fire with a small spread.

**Level 1:** damage 16, cooldown 1.10s, speed 500, pierce 2.

**Required sprites:**

| Need | Suggested file | Size | Status |
| --- | --- | --- | --- |
| Icon | `weapon_hot_wheels_icon_256.png` | 256 | Done |
| Car, facing right | `weapon_hot_wheels_car_01.png`, `_02.png` | 64 | Done |
| Impact spark | `weapon_hot_wheels_hit_01.png` | 96 | Done |

**Look:** chunky Hot Wheels-style car, orange/red, big wheels. Frame 2 can be a wheel-spin / slight bounce. Do not use realistic cars. Nose faces right.

### 8. Χαλασμένο φαγητό (`bad-food`)

**What happens:** a toxic cloud drops on the hero and stays there for a few seconds, damaging enemies inside. It is an area around the player, not a projectile.

**Level 1:** tick damage 5, cooldown 2.20s, radius 60, duration 2.7s.

**Required sprites:**

| Need | Suggested file | Size | Status |
| --- | --- | --- | --- |
| Icon | `weapon_bad_food_icon_256.png` | 256 | Done |
| Cloud loop | `weapon_bad_food_cloud_01.png`, `_02.png`, `_03.png` | 192 | Done |
| Optional food bits | `weapon_bad_food_bits_01.png` | 64 | Done |

**Look:** sickly green/olive cartoon stink cloud, maybe a fish bone or spoiled snack silhouette. Soft edges, ~50% opaque, enemies must stay visible through it. Kid-gross, not disgusting.

### 9. Αϋπνία (`insomnia`)

**What happens:** while the hero is moving, dark sleepy patches drop on the path and damage enemies that walk through them. Standing still drops nothing.

**Level 1:** damage 10, patch radius 26, duration 1.35s, drop every 0.20s.

**Required sprites:**

| Need | Suggested file | Size | Status |
| --- | --- | --- | --- |
| Icon | `weapon_insomnia_icon_256.png` | 256 | Done |
| Shadow puddle loop | `weapon_insomnia_shadow_01.png`, `_02.png` | 128 or 192 | Done |
| Optional Zzz particle | `weapon_insomnia_zzz_01.png` | 64 | Done |

**Look:** cool purple-black night shadow, readable on both the kids-room floor and beach sand. Not a solid black blob. A sleepy moon or Zzz in the icon is enough storytelling.

### 10. Δώρα (`presents`)

**What happens:** a gift box flies at the nearest enemy, waits on a fuse (~1.4s), then explodes in a burst. It can also pop early if it hits the boss.

**Level 1:** damage 22, cooldown 1.60s, blast radius 72.

**Required sprites:**

| Need | Suggested file | Size | Status |
| --- | --- | --- | --- |
| Icon | `weapon_presents_icon_256.png` | 256 | Done |
| Gift box | `weapon_presents_box_01.png`, `_02.png` | 64 | Done |
| Blast | `weapon_presents_blast_01.png`, `_02.png`, `_03.png` | 192 | Done |

**Look:** wrapped kid present, bright paper and bow. Frame 2 of the box can shake or sparkle for the fuse. Blast is confetti / ribbons / toy burst, not fire or gore.

### 11. Μαχαίρι (`knife`)

**What happens:** a short melee slash behind the hero (opposite of facing). Fast, close, no projectile. Duration about 0.18s.

**Level 1:** damage 26, cooldown 0.95s, range 80.

**Required sprites:**

| Need | Suggested file | Size | Status |
| --- | --- | --- | --- |
| Icon | `weapon_knife_icon_256.png` | 256 | Done |
| Slash arc, facing right | `weapon_knife_slash_01.png`, `_02.png`, `_03.png` | 192 | Done |
| Optional spark | `weapon_knife_hit_01.png` | 96 | Done |

**Look:** plastic toy knife or kitchen-butter-knife cartoon, silver with a colorful handle. The slash is a white/cyan arc, not a bloody cut. Face the arc to the right; code places it behind the hero.

### 12. Παντόφλες (`slippers`)

**What happens:** house slippers fly at the nearest enemy and disappear on hit. From level 3, two slippers fire with a small spread.

**Level 1:** damage 14, cooldown 0.75s, speed 520.

**Required sprites:**

| Need | Suggested file | Size | Status |
| --- | --- | --- | --- |
| Icon | `weapon_slippers_icon_256.png` | 256 | Done |
| Thrown slipper, facing right | `weapon_slippers_throw_01.png`, `_02.png` | 64 | Done |
| Hit puff | `weapon_slippers_hit_01.png` | 96 | Done |

**Look:** fuzzy indoor slipper, tan/peach, readable side view. Frame 2 can be a slight spin. This is a family-scolding joke, not a weapon of war.

### 13. Πολυβόλο (`machinegun`)

**What happens:** a burst of small bullets at the nearest enemy, then a reload pause. Level 1 fires 10 shots at 0.08s intervals, then reloads for 1.8s.

**Level 1:** damage 7 per bullet, speed 680.

**Required sprites:**

| Need | Suggested file | Size | Status |
| --- | --- | --- | --- |
| Icon | `weapon_machinegun_icon_256.png` | 256 | Done |
| Bullet | `weapon_machinegun_bullet_01.png`, `_02.png` | 64 | Done |
| Muzzle flash | `weapon_machinegun_muzzle_01.png`, `_02.png` | 96 | Done |
| Hit spark | `weapon_machinegun_hit_01.png` | 96 | Done |

**Look:** toy dart / foam-blaster energy, not military ammo. Yellow-white stubby bolt. Keep it friendly. Muzzle flash sits on the hero, small and bright.

---

## Boss Attacks

Boss body walk / hit / tell sprites already exist, sliced from `Sprites/Grandpa.png` and `Sprites/Sissi.png`. The attacks themselves still draw as colored circles or a pink rectangle. Those VFX are the main missing art.

Bosses alternate two attacks. Each attack has a **tell** pose, then the projectile or wave spawns, then a short recover.

### Παππούς (`grandpa`)

Slow, heavy kitchen-chaos grandpa. Body draw size 200px. Existing body sprites are 624x624.

| Body need | File | Status |
| --- | --- | --- |
| Walk | `boss_grandpa_walk_01.png` to `_04.png` | Done |
| Hit | `boss_grandpa_hit_01.png` | Done |
| Tell (generic) | `boss_grandpa_tell_01.png` | Done |
| Attack pose, pan throw | `boss_grandpa_attack_pan_01.png` | Done |
| Attack pose, scooter kick | `boss_grandpa_attack_scooter_01.png` | Done |

#### Attack A — Καυτή κατσαρόλα (`hot-pan`)

Throws a hot pan at the player. Moderate speed (280). On player hit or when the pan expires, it bursts in a small radius (~58px).

| Need | Suggested file | Size | Status |
| --- | --- | --- | --- |
| Pan projectile | `boss_grandpa_pan_01.png`, `_02.png` | 96 | Done |
| Burst / sizzle | `boss_grandpa_pan_burst_01.png` to `_03.png` | 192 | Done |
| Optional grease splat | `boss_grandpa_pan_splat_01.png` | 96 | Done |

**Look:** cartoon frying pan, brown/copper, maybe a fried egg still in it. Frame 2 is a spin. Burst is steam + sparks + pan clatter, not fireball. Keep it funny.

**Tell:** grandpa winds up the pan over his head. **Attack pose:** pan leaves his hand.

#### Attack B — Πατίνι (`scooter`)

Kicks a kid scooter straight at the player. Fast (420), long lifetime (3.5s), **pierces** the player instead of vanishing. More dangerous to stand in a line.

| Need | Suggested file | Size | Status |
| --- | --- | --- | --- |
| Scooter, facing right | `boss_grandpa_scooter_01.png`, `_02.png` | 96 | Done |
| Optional wheel spark | `boss_grandpa_scooter_spark_01.png` | 96 | Done |

**Look:** red kick scooter, chunky, readable wheels. Frame 2 is a wheel-spin. Nose faces right.

**Tell:** grandpa plants a foot on the scooter. **Attack pose:** he shoves it forward.

### Σίσσυ (`sissy`)

Faster, louder, more chaotic. Body draw size 216px. Existing body sprites are 680x680.

| Body need | File | Status |
| --- | --- | --- |
| Walk | `boss_sissy_walk_01.png`, `_02.png` | Done; 4 walk frames would feel better |
| Hit | `boss_sissy_hit_01.png` | Done |
| Tell | `boss_sissy_tell_01.png` | Done |
| Attack pose (scream) | `boss_sissy_attack_01.png` | Done |
| Attack pose (mice toss) | `boss_sissy_attack_mice_01.png` | Done |

#### Attack A — Σονικό κύμα

A wide pink shockwave (about 120px wide, 48px thick) travels from Sissy through the arena at speed 340. It is a moving slab, not a bullet.

| Need | Suggested file | Size | Status |
| --- | --- | --- | --- |
| Wave, facing right | `boss_sissy_wave_01.png`, `_02.png`, `_03.png` | 256x128 | Done |
| Tell glow / inhale | can reuse `boss_sissy_tell_01.png` | — | Done |

**Look:** magenta/hot-pink sound rings or a cartoon scream cone, striped and readable. Not a realistic shockwave. The sprite should be a wide capsule or stacked arcs, centered, facing right.

#### Attack B — Ποντίκια (`mouse`)

Eight mice burst out in a ring and run outward. Small, grey, low damage each, but they fill the screen.

| Need | Suggested file | Size | Status |
| --- | --- | --- | --- |
| Mouse run | `boss_sissy_mouse_01.png` to `_04.png` | 64 | Done |
| Spawn puff | `boss_sissy_mouse_puff_01.png` | 96 | Done |

**Look:** silly cartoon mice, round ears, pink nose, not scary rats. Face right. They will be flipped/rotated around the ring.

---

## Special Enemy Attacks

Stage special enemies use the same spawn cadence as `mother-slipper`: rare roll after 40s elapsed (8% → 22% chance), only one alive at a time, guaranteed special pickup on defeat. Body sprites are listed in `Docs/SPRITES_AND_DESIGN_ASSETS.md`.

### Παντόφλα της Μαμάς (`mother-slipper`) — Ξέσπασμα

**Where:** Δωμάτιο Κωρωνης κωδ only.

**What happens:** after a 0.45s tell, the slipper **charges** in a locked direction at 3.1× speed for 0.72s. Damage uses body contact only — no separate attack VFX sprite. The charge reads through movement + tell pose.

| Need | File | Status |
| --- | --- | --- |
| Tell pose | `enemy_special_mother_slipper_tell_01.png` | Placeholder |
| Optional charge pose | `enemy_special_mother_slipper_charge_01.png` | Missing |

**Look:** raised slipper wind-up. Charge can reuse walk frames with motion blur in code.

### Γιγαντιαία Σουπιά (`giant-squid`) — Καλαμάρι

**Where:** Παραλία Ζαγκά only. Beach counterpart to mother slipper — same base stats, gold, and special-drop reward.

**What happens:** after a 0.45s tell, the squid fires one **prolonged tentacle** along a locked **X or Y axis**:

1. **Extend** (~0.55s) — tentacle grows from the squid body to the nearest arena edge along the chosen axis.
2. **Hold** (~0.20s) — stays fully extended; danger zone is a thick line across the arena.
3. **Retract** (~0.45s) — tentacle pulls back into the body.

Axis locks at tell start: **horizontal** if `|dx| ≥ |dy|`, else **vertical**; direction points toward the player. Contact damage 24 during extend, hold, and retract if the hero overlaps the tentacle hitbox (~40px thick). Body contact damage unchanged.

**Level 1 (base):** HP 96, speed 52–64, contact damage 24, radius 30, gold 10.

**Body sprites** (see also enemy doc):

| Need | File | Size | Draw | Status |
| --- | --- | --- | --- | --- |
| Walk | `enemy_special_giant_squid_walk_01.png` to `_04.png` | 256–320 | 112px | Done |
| Tell | `enemy_special_giant_squid_tell_01.png` | 256–320 | 112px | Done |
| Attack pose | `enemy_special_giant_squid_attack_01.png` | 256–320 | 112px | Done |
| Hit | `enemy_special_giant_squid_hit_01.png` | 256–320 | 112px | Done |

**Tentacle VFX:**

| Need | Suggested file | Size | Status |
| --- | --- | --- | --- |
| Tentacle strip, facing right | `enemy_special_giant_squid_tentacle_01.png`, `_02.png`, `_03.png` | 512×64 or 256×128 | Done |
| Optional tip splash | `enemy_special_giant_squid_tentacle_tip_01.png` | 96 | Done |

**Rendering notes:**

- Draw the tentacle segment **facing right**; code scales length to the distance from squid center to arena edge and rotates 0° / 90° / 180° / 270° for the four axis directions.
- Frame 1 = short stub emerging; frame 2 = mid extension; frame 3 = full stretch with suckers visible. During hold, loop frame 3. Retract plays frames in reverse (or a dedicated retract strip if added later).
- Anchor the tentacle base at the squid body center; stretch toward the edge, not from canvas center.
- The hitbox is a **line slab** along the axis — similar width to Sissy's sonic wave (~40–48px) but much longer (full arena span).

**Look:** chunky cartoon tentacle — purple/violet with lighter suckers, wet shine, not realistic anatomy. Should read clearly on sand at full arena width. **Tell:** puffed mantle + twitching tentacles. **Attack pose:** one arm already unfurling. Tip splash optional: small sand puff or water spray where the tentacle reaches the edge.

**Folder:** `public/assets/sprites/enemies/giant_squid/`

---

## Bro Upgrade Icons (level-up options)

When the hero levels up, the game offers three choices. Attack picks already show a `256x256` weapon icon at ~48px in the upgrade panel. **Passive and stat upgrades do not have icons yet** — the UI shows title and description only. Add the icons below so every level-up card has art.

Source behavior: `src/game/weapons.ts` (`passiveDefinitions`, `drawAttackUpgradeChoices`). All passive ids: `bright-stars`, `sticky-socks`, `bigger-toys`, `cozy-blanket`, `quick-hands`, `speed`, `maxHp`.

Folder:

```txt
public/assets/ui/upgrades/
```

Naming: `upgrade_{passive-id}_icon_256.png` (use hyphens in the id, e.g. `upgrade_bright-stars_icon_256.png`). Same size and style as weapon icons: `256x256` PNG, centered, readable at 48px.

### Roster

| Id | Greek name | Role | Max level | Suggested file | Status |
| --- | --- | --- | --- | --- | --- |
| `speed` | Γρήγορα Παπούτσια | Move faster (+12% speed) | Unlimited | `upgrade_speed_icon_256.png` | Done |
| `maxHp` | Σνακ Ήρωα | Max HP +18 and heal | Unlimited | `upgrade_max-hp_icon_256.png` | Done |
| `bright-stars` | Φωτεινά Αστέρια | +10% weapon damage | 3 | `upgrade_bright-stars_icon_256.png` | Done |
| `sticky-socks` | Κολλώδη Καλτσάκια | Longer status / stronger slow | 3 | `upgrade_sticky-socks_icon_256.png` | Done |
| `bigger-toys` | Μεγαλύτερα Παιχνίδια | +12% area / radius | 3 | `upgrade_bigger-toys_icon_256.png` | Done |
| `cozy-blanket` | Ζεστή Κουβέρτα | Longer lingering effects | 3 | `upgrade_cozy-blanket_icon_256.png` | Done |
| `quick-hands` | Γρήγορα Χέρια | −8% weapon cooldown | 3 | `upgrade_quick-hands_icon_256.png` | Done |

### Stat upgrades (always available)

These can appear on any level-up, alongside attacks and evolution passives.

#### Γρήγορα Παπούτσια (`speed`)

**What it does:** permanent +12% movement speed for the rest of the run. Stacks every time you pick it.

| Need | File | Size | Status |
| --- | --- | --- | --- |
| Icon | `upgrade_speed_icon_256.png` | 256 | Done |

**Look:** bright kid sneakers or running shoes with a small motion streak or wing accent. Sporty and fun, not realistic athletic gear. Should read as “faster feet” at thumbnail size. Avoid confusing with the slipper weapon (`slippers`).

#### Σνακ Ήρωα (`maxHp`)

**What it does:** +18 max HP and full heal on pick. Can be taken many times per run.

| Need | File | Size | Status |
| --- | --- | --- | --- |
| Icon | `upgrade_max-hp_icon_256.png` | 256 | Done |

**Look:** hero snack — juice box, cookie, fruit, or lunch-box treat with a tiny heart or plus sign. Warm, comforting colors (orange, red, gold). Not a med-kit or realistic medicine. Should feel like “energy up,” not “hospital.”

### Evolution passives (cap at level 3)

These boost weapons and unlock evolutions when the matching attack is level 5 and the passive is level 3.

| Id | Greek | Pairs with evolution | Suggested file | Status |
| --- | --- | --- | --- | --- |
| `bright-stars` | Φωτεινά Αστέρια | Αστροβολές → Αστροβροχή | `upgrade_bright-stars_icon_256.png` | Done |
| `sticky-socks` | Κολλώδη Καλτσάκια | Ιστός → Φωλιά Ιστού | `upgrade_sticky-socks_icon_256.png` | Done |
| `bigger-toys` | Μεγαλύτερα Παιχνίδια | Περιστρεφόμενο Παιχνίδι → Καρουζέλ | `upgrade_bigger-toys_icon_256.png` | Done |
| `cozy-blanket` | Ζεστή Κουβέρτα | Μαξιλάρι Pop → Καταιγίδα | `upgrade_cozy-blanket_icon_256.png` | Done |
| `quick-hands` | Γρήγορα Χέρια | Μπίλια → Σούπερ Μπίλια | `upgrade_quick-hands_icon_256.png` | Done |

**Look notes (match the paired weapon theme, but read as a buff — not the weapon itself):**

- **Φωτεινά Αστέρια:** glowing star cluster or sparkles, gold/yellow.
- **Κολλώδη Καλτσάκια:** fuzzy sock with web/sticky drip, mint or pale green.
- **Μεγαλύτερα Παιχνίδια:** oversized toy block or plush, same toy vibe as orbit-toy.
- **Ζεστή Κουβέρτα:** folded blanket or quilt corner, soft pastel, cozy.
- **Γρήγορα Χέρια:** cartoon hands in a quick blur or snap motion, not a knife or gun.

---

## Production Order

1. **Unlockable weapon icons** (`256x256`) — needed for loadout and upgrade cards.
2. **Bro upgrade icons** (`256x256`) — seven level-up options: speed, max HP, and five evolution passives. Upgrade cards for these are text-only today.
3. **Unlockable primary VFX** — one readable gameplay sprite per attack (spray, car, cloud, shadow, box, slash, slipper, bullet).
4. **Hit / extra frames** — 2–3 frame loops and impact sparks.
5. **Boss attack VFX** — pan, scooter, scream wave, mice.
6. **Giant squid tentacle VFX** — stretchable axis lash for Zagka beach special enemy.
7. **Boss attack poses** — grandpa throw/kick, Sissy mice toss, extra Sissy walk frames.
8. **Giant squid body + tell + attack poses** — beach special enemy body set.
9. **Optional polish** — evolved star projectile, water splash, machinegun muzzle, squid tentacle tip splash.

Replace placeholders in place. Do not rename the files already wired in `src/game/weapons.ts` unless the extra-frame names above are being added as new files.

## Checklist for a Finished Attack Sprite Set

A bro upgrade (passive / stat pick) is art-complete when it has:

- A `256x256` icon in `public/assets/ui/upgrades/` that reads at 48px on the level-up card.
- A silhouette distinct from weapon icons and from other passives in the same run.
- Art that matches the buff theme (shoes for speed, snack for HP, etc.), not a duplicate of the paired weapon icon.

A weapon is art-complete when it has:

- A `256x256` icon that reads at 48px in the UI.
- The moving or looping gameplay sprite at the size in the tables above.
- At least one hit or impact frame, unless the attack is a lingering cloud.
- Transparent padding and a centered pivot.
- A silhouette that cannot be confused with XP gems, pickups, or enemies.
- Directional art facing right, if it travels or aims.

A boss attack is art-complete when it has:

- A tell pose on the boss body.
- An attack pose that matches that specific move.
- The projectile, wave, or minion sprite.
- An impact or burst if the move explodes or lands.

A special enemy attack is art-complete when it has:

- A **tell** body frame readable at 112px draw size.
- An **attack** body pose matching the move start.
- The **tentacle / lash VFX** (for `giant-squid`): at least 3 extend frames on a horizontal strip, facing right, scalable to full arena width.
- Transparent padding; tentacle base anchors at the body, tip points right before rotation.
- A silhouette distinct from boss shockwaves, weapon slashes, and beach Lago enemies.
