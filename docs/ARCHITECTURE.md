# Architecture

The project is a Vite + TypeScript application. The world renders to a single `<canvas>`; the
interface is plain DOM. There are no runtime dependencies.

## Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Boot | `src/main.ts` | Load art, construct world/renderer/UI, own the frame loop and keyboard shortcuts |
| Core | `src/core/` | `SimulationClock`, seeded `Rng` |
| Data | `src/data/` | Heroines, enemies, stage script — no behaviour, only definitions |
| Simulation | `src/game/` | World state, heroine AI, enemy AI, combat maths, targeting, stages |
| Rendering | `src/render/` | Canvas drawing, sprite keying, effects |
| Interface | `src/ui/` | Screens, HUD, menus, results |
| Audio | `src/audio/` | Runtime-synthesised sound effects |

The dependency direction is one-way: `render` and `ui` read `game`; `game` never imports them.

## Frame loop

```text
requestAnimationFrame
  ├─ world.update(realDelta)          // presentation smoothing + simulation
  │    ├─ clock.advance(realDelta)    // 0 when paused, ×2 at 2x, clamped
  │    └─ step(delta)                 // only when the run is live
  ├─ renderer.draw(world, realTime, realDelta)
  └─ ui.updateHud(world.getHud())
```

`world.update` receives real time; everything that affects gameplay consumes the **simulated**
delta. Camera follow, ambient petals and screen-shake decay use real time, because they are
presentation and must stay smooth while paused.

## Simulation clock

`SimulationClock` (`src/core/clock.ts`) is the only source of gameplay time.

- `advance(realDelta)` returns `min(realDelta, 0.05) × scale`, or `0` when paused.
- `scale` is `1 | 2`; `toggleScale()` flips it.
- `pause()` / `resume()` gate the whole simulation, not just animation.
- `reset()` returns a fresh clock for a new run.

Because every system is fed this single delta, 2× cannot desynchronise movement, cooldowns,
projectiles, damage-over-time, spawn timers and stage progression. There are no per-ability
multipliers anywhere in the codebase.

## World

`World` (`src/game/world.ts`) owns:

- the clock, heroine, enemies, projectiles, telegraphed impacts and visual effects;
- run status (`idle → combat → victory | defeat`) and run statistics;
- camera position and shake;
- callbacks the interface subscribes to: `onStageStart`, `onStageCleared`, `onBossSpawn`,
  `onBossPhase`, `onRunEnd`.

One simulation step runs in a fixed order so systems never see half-updated state:

1. heroine timers (attack/ability cooldowns, buffs, invulnerability),
2. heroine AI,
3. enemy AI,
4. projectiles,
5. impacts,
6. dead-enemy cleanup (grants stage progress and sound),
7. stage runner (wave spawning, clear detection),
8. effect ageing,
9. defeat check.

## Heroine AI

`src/game/heroAi.ts` is a small state machine: `searching → moving → attacking`, with `casting` and
`repositioning` entered by abilities and `defeated` terminal.

Each step it:

1. builds target candidates and asks `selectTarget`;
2. tries abilities in data order, each gated by cooldown **and** trigger;
3. closes to `range × 0.78` (stopping inside range prevents jitter);
4. attacks when the basic-attack cooldown allows.

`hero.targetId` persists between steps and feeds the targeting loyalty bonus.

### Targeting

`src/game/targeting.ts` scores candidates by distance, tier (elite 90, boss 180), injured-health
finish bonus and a 130-point loyalty bonus for the current target. A new enemy must be decisively
closer or a higher tier to steal focus, which removes the classic "oscillate between two targets"
failure. The function is pure, so the behaviour is unit-tested.

### Abilities

`heroActions.ts` maps each ability `kind` to an execution:

| Kind | Behaviour |
| --- | --- |
| `meleeArc` | Damage everything in front within reach |
| `wave` | Spawn a piercing crescent projectile |
| `rain` | Queue delayed impacts on the nearest enemies |
| `dash` | Retreat, grant brief invulnerability, ring effect |
| `buff` | Apply attack/attack-speed bonus for a duration |
| `projectile` | Fire one or more projectiles |
| `aoe` | Damage everything inside a radius |

Triggers: `inRange`, `crowd` (minimum live enemies), `bossOrHurt` (boss present, health below a
threshold, or enough enemies), `hurtAndClose`, `always`. This keeps kits automatic but situational.

## Enemies

`src/game/enemy.ts` holds per-unit state (health, cooldown, freeze, boss timers, phase, shield).
`src/game/enemyAi.ts` implements:

- **chasers** — close to `attackRange`, then attack on cooldown;
- **ranged** — hold a 230–`attackRange` lane and fire projectiles;
- **bosses** — summoned adds, telegraphed ground volleys, telegraphed charges, and a phase-two
  barrier at 50 % health; the Crystal Golem swaps summons for heavier slams.

Enemies are clamped to the arena so knockback, charges and kiting cannot walk them off-screen.

## Combat maths

`src/game/combat.ts`:

```text
raw     = attack × ability power × (critical ? critDamage : 1)
applied = max(1, round(raw × 120 / (120 + defence)))
```

Pure functions with the injected `Rng`, so critical outcomes are reproducible in tests.

## Stages

`src/data/stages.ts` declares ten stages, each with `hpScale`, `damageScale` and timed waves.
`src/game/stageRunner.ts` spawns waves as the simulated clock passes their `at` time, tracks kills,
and flips to `clear` once every wave has spawned and the arena is empty. `World.advanceStage`
applies the between-stage heal and either starts the next stage or ends the run in victory.

## Rendering

`Renderer` fixes a 1280×720 logical space and scales the backing store by device pixel ratio.

- **Background** (`render/background.ts`): painted meadow with parallax, haze, ground gradient and
  deterministic flowers in world space.
- **Heroine** (`render/hero.ts`): runtime chroma-keyed illustration, mirrored by facing, with walk
  bob, attack lean, hurt flash, invulnerability ring and an aura while empowered.
- **Enemies** (`render/enemies.ts`): procedural silhouettes per archetype plus a painted sprite for
  the Thorn Queen, with health bars and elite auras.
- **Effects** (`render/effects.ts`): impacts/telegraphs, projectiles, slashes, rings, sparks and
  floating damage numbers.

## Interface

`src/ui/screens.ts` owns every DOM screen (title, roster, HUD, pause, results) and exposes callbacks
to `main.ts`. The HUD is updated from a single `HudSnapshot` per frame. Interface animations and
timers use real time, so menus stay responsive at 2× and while the simulation is paused.

## Audio

`src/audio/sfx.ts` synthesises every cue with oscillators, filtered noise and gain envelopes; the
first pointer interaction unlocks the audio context. `setMuted` is wired to the pause menu, and the
module is a no-op without a `window` so the simulation can be imported in tests.

## Testing

Vitest runs four suites headlessly: clock behaviour, heroine state, damage maths, targeting and
end-to-end simulation (speed multiplier, pause freeze, defeat/victory). The world is DOM-free, so
these run in Node without a browser.

## Notable decisions

- **Canvas over an engine.** The simulation is a handful of systems and a side-view arena; a
  full engine would add weight without solving anything the project needs yet.
- **Data-driven content.** Heroines, enemies and stages are plain objects. Adding a heroine is data
  plus art, not new control flow.
- **Chroma keying instead of cut-outs.** Character illustrations stay ordinary image files; the
  browser removes the flat backdrop at load time, which keeps the asset pipeline simple.
- **One clock.** Speed and pause are properties of the simulation, not of individual systems.
