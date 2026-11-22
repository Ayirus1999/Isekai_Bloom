# Architecture

Vite + TypeScript application. The arena renders to one `<canvas>`; the interface is DOM/CSS. There
are no runtime dependencies. The simulation is DOM-free and runs headlessly in Vitest and
`scripts/simulate.ts`.

## Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Boot | `src/main.ts` | Load save, construct world/renderer/UI, wire callbacks, own the frame loop and keyboard |
| Core | `src/core/` | `SimulationClock`, seeded `Rng` |
| Data | `src/data/` | Heroines, enemies, worlds, upgrades — definitions only |
| Simulation | `src/game/` | World, heroine, enemy AI, animation clips, combat, upgrades, save |
| Rendering | `src/render/` | Heroine rig, enemies/bosses, backdrop, effects, camera |
| Interface | `src/ui/` | Screens, HUD, menus, results |
| Audio | `src/audio/` | Runtime-synthesized sound cues |

Dependencies point one way: `render` and `ui` read `game`; `game` never imports them. `game/save.ts`
is the only module that touches `localStorage`, and it no-ops when storage is absent.

## Frame loop

```text
requestAnimationFrame
  ├─ world.update(realDelta)
  │    ├─ clock.advance(realDelta)     // 0 paused, ×2 at 2×, clamped at 0.1 s
  │    ├─ combat step (if live)
  │    └─ clear/victory/defeat timers
  ├─ renderer.draw(world, realTime, realDelta)
  └─ ui.updateHud(world.getHud())
```

`World.time` advances by simulated delta. Rendering-only wobble, petals and shake use real time so the
screen stays alive while the simulation is paused.

## Simulation clock

`SimulationClock` owns gameplay time and the speed multiplier.

- `advance(realDelta)` returns `min(realDelta, 0.1) × scale`, or `0` while paused.
- `scale` is `1 | 2`; `toggleScale()` flips it; `setScale()` restores a saved preference.
- `pause()`/`resume()` gate the entire simulation.
- No ability or system multiplies its own timers; everything consumes the same delta.

## World and encounter flow

`World` owns the clock, hero, enemies, projectiles, impacts, effects, run status and stats. Run status:

```text
idle → combat → clearing → reward → combat … → victory | defeat
```

Each adventure is a `WorldDef.encounters` array of ten `EncounterDef`s:
`group`, `event`, `miniboss`, `final`. Events immediately award coins and open the upgrade screen.
Boss tiers are scaled once in `spawnEnemy` (`hp ×0.42`, `damage ×0.88`) and never receive encounter
scaling on top.

**Solo boss guarantee:** `spawnEncounter` flattens the encounter's groups, then slices to the first id
when the kind is `miniboss` or `final`. There is no code path that adds minions to a boss encounter;
`World.summonAdds()` is intentionally a no-op. A test asserts exactly one enemy in both boss types.

Simulation order in `step`:

1. heroine timers (cooldowns, buffs, invulnerability, hurt flash);
2. health regeneration from upgrades;
3. advance the heroine's animation clip and resolve crossed events;
4. heroine AI;
5. enemy AI;
6. projectiles;
7. impacts (telegraphed area attacks);
8. effects ageing;
9. death check;
10. encounter clear detection when every enemy is dead.

## Heroine

`Hero` is anchored at `HERO_X = 318` in a 1280×720 reference arena. She never moves in simulation.
`facing` flips; lunges are pose animation only.

- Stats are derived from the heroine definition plus run mods and permanent bonuses.
- `startBasic`/`startAbility` lock an action containing clip id, target and power.
- `advanceAnimation(dt)` returns clip events crossed in that step. `World` resolves them centrally.
- Hit reactions never cancel a committed basic/ability; they play only between actions. This prevents
  boss pressure from silently erasing her damage. Ultimates are also protected by `ultimateLock`.
- Shield absorption is tracked separately; the results "damage taken" counter includes damage that a
  barrier absorbed.

### Heroine AI

`updateHeroAi` selects a target, faces it, tries ready abilities in data order, then uses a basic
attack when within `basic.range + 92 lunge + target.radius`. Abilities are data-driven by `trigger`
(`inRange`, `crowd`, `bossOrHurt`, `hurt`, `always`), `range`, `minEnemies` and `hpBelow`.

`selectTarget` scores proximity, tier and a loyalty bonus so the heroine does not oscillate between
targets. It is pure and unit-tested.

## Animation clips

`src/game/anim.ts` defines a shared `Pose` (bob, lean, crouch, head tilt, six limb angles, hair/skirt
sway, weapon rotation, scale, glow, alpha), interpolation and per-heroine clip sets.

- Clips are keyframed poses plus timed `ClipEvent`s.
- Event types: `impact`, `projectile`, `rain`, `aoe`, `buff`, `heal`, `shield`, `dash`, `sfx`,
  `ultimate`, `footstep`.
- `heroActions.ts` resolves each event into the same combat functions used by AI (strike, area,
  projectile, heal, shield, buff).
- Because the clip advances on simulated delta, 2× changes animation and damage together.

## Enemies and bosses

`Enemy` is one independent instance with hp, damage, timers, freeze/slow, shield, boss phase and
pattern index. `updateEnemies` implements:

- melee chasers (approach to range, wind-up, hit);
- ranged holders (keep distance, fire projectiles);
- bosses (approach, telegraph, then execute a pattern: sweep, volley, slam, beam, meteor, drain;
  phase two at 50% health shortens wind-ups and cooldowns).

All enemies stay clamped in the arena. Bosses have a DOM boss bar and a canvas telegraph ring plus a
wind-up/strike body shift. Deaths fade and sink before the clear timer.

## Upgrades

`src/data/upgrades.ts` defines 48 cards. `rollUpgradeChoices`:

- excludes maxed stacks and other heroines' cards;
- excludes locked evolutions unless both prerequisites are owned;
- weights supply by rarity and encounter depth;
- guarantees one slot to a ready evolution;
- adds one character-flavoured slot with a probability.

`applyUpgrade` mutates `RunMods`; `World.chooseUpgrade` applies it, raises max HP correctly, heals 20%
and starts the next encounter. Combat is paused by the clock while the screen is open.

## Save

`src/game/save.ts` stores one versioned JSON object under `hoshi-no-hanabira.save`:

- coins, unlocked heroines/worlds, permanent upgrade levels, achievements, lifetime stats, settings;
- loading merges defaults, sanitizes unlocks against current data and survives malformed JSON;
- writes are wrapped in `try/catch` so private mode or a full quota cannot break a run.

## Rendering

`Renderer` owns the canvas backing store and device-pixel-ratio resize. World-space drawing uses the
1280×720 logical arena.

### Landscape

Uniform fit: `scale = min(w / 1280, h / 720)`, centered. The heroine is at logical x 318.

### Portrait

Portrait uses a dedicated camera (`Renderer.layout`) instead of shrinking the desktop frame:

- sprites use `scale = min(0.8, width / 640)`, so the heroine is roughly 150–230 px tall instead of
  ~100 px;
- the ground sits at 68% of the viewport height;
- the near 300 logical px in front of the heroine keep true scale, then the far enemy lane is
  compressed into the remaining width. This preserves readable melee spacing while keeping 3–8
  enemies, casters and a solo boss on screen;
- all x positions (combatants, projectiles, impacts, effects) use the same mapping; y and radii use
  the same uniform scale, so effects remain aligned;
- damage-number text gets a 1.5× font boost for phone readability.

The HUD is DOM above the canvas, with safe-area insets. On narrow portrait phones the encounter chip
wraps to its own full-width row rather than disappearing.

### Character rig

`render/hero.ts` draws the heroine from the sampled pose: layered back hair, legs/boots, torso,
skirt/coat, back arm, front sleeve/glove, face, front hair, weapon and effects. The face uses a
three-quarter eye pair (leading eye larger), blinking, mood-dependent brows/mouth, blush and tilt.
The same function paints the title, roster cards, HUD portrait and battle sprite, which guarantees a
consistent design.

Boss bodies are procedural per shape in `render/enemies.ts` (thorn queen, crystal dragon, fallen
guardian, shadow empress, corrupted celestial, plus mini-boss shapes). Normal enemies have smaller
archetype painters, health bars, hit flash, freeze tint, telegraph ring, attack lunge and death fade.

## Interface

`Ui` owns DOM lookup, screen switching and rendering of data-driven lists. `World` emits callbacks
for encounter start, boss spawn/phase, reward and run end. `Ui.updateHud` receives one snapshot per
frame and only writes changed values. Menus use native buttons, so keyboard focus and screen-reader
roles work without custom input code.

## Audio

`src/audio/sfx.ts` synthesizes every cue with oscillators/noise and gain envelopes. The first pointer
interaction unlocks the AudioContext. Muting persists in the save.

## Testing and tooling

- `tests/` — 54 Vitest tests: clock speed/pause, combat math, targeting, hero lifecycle and
  animation events, upgrades, encounter composition (group, solo bosses, event counting), victory.
- `scripts/simulate.ts` — plays complete runs with automatic first-card picks, logs encounter health
  and results, supports `--all`, `--boss` and `--upgrades=N` experiments.
- `npm run build` — strict `tsc --noEmit` then Vite production bundle.

## Deliberate limitations

- The rig is shared across heroines; distinctiveness comes from data (palette, hair/outfit/weapon
  variants) and pose clips, not separate skeletons.
- Simulation positions are platform-independent; portrait compression is renderer-only, so gameplay
  rules do not change between desktop and phone.
- There is no engine, ECS or physics system; the scope does not need one.
