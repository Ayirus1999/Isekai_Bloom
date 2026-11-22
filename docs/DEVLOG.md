# Development log

Chronological record of the build. Each entry describes what was actually implemented, the
decisions taken, problems hit, and how they were verified.

---

## 2026-11-22 — Phase 0: repository foundation

**Implemented**

- Initialised the project as a Vite + TypeScript application with a strict `tsconfig`.
- Established the repository layout (`src/core`, `src/data`, `src/game`, `src/render`,
  `src/audio`, `src/ui`, `assets`, `tests`, `docs`).
- Wrote the interface shell and stylesheet (title screen, roster, combat HUD, pause and results
  panels) so later work has a real presentation layer to grow into.
- Authored the design document, roadmap, contributing guide and this log.
- Generated original key art for Yuzuki Hoshino (portrait + full-body sprite), the Blossom Meadow
  background and the Thorn Queen boss.

**Decisions**

- **Vite + TypeScript + Canvas 2D** instead of a full game engine: the simulation is small,
  deterministic and testable, and rendering a side-view arena does not justify an engine's weight.
- The interface is DOM rather than canvas so menus stay crisp, accessible and unaffected by the
  simulation clock.
- All art is generated specifically for the project, so no third-party character art or licences are
  involved.

**Verification**

- `npm run build` (strict type check + bundle) and `npm test` are wired up and green from the first
  commit.

**Next**

- Phase 1: the core game loop, Yuzuki's autonomous combat, enemies and the Thorn Queen encounter.

---

## 2026-11-22 — Phase 1: core prototype

**Implemented**

- `World` simulation with a fixed step order: heroine timers → heroine AI → enemy AI → projectiles →
  impacts → cleanup → stage runner → effects → defeat check.
- Yuzuki's autonomous state machine (search, approach, attack, cast, reposition) and her five
  abilities, each gated by both cooldown and a situational trigger.
- Threat-weighted targeting with a loyalty bonus so she commits to a target instead of oscillating.
- Twelve enemy archetypes: chasers, kiting casters, four elites, a mini-boss and the Thorn Queen.
- Ten-stage Blossom Meadow script with per-stage health and damage scaling.
- Boss mechanics: summoned adds, telegraphed ground volleys, telegraphed charges, a phase-two
  barrier, and replacements for the Crystal Golem.
- Combat maths (power multiplier, defence curve, criticals), projectiles, telegraphed impacts,
  slash/ring/spark/damage-number effects, screen shake.
- Results screen with stages cleared, enemies defeated, bosses felled, damage and duration.
- Chroma-keyed heroine sprite, painted boss sprite, parallax meadow, procedural enemy art and the
  synthesised sound board.

**Decisions**

- Targeting uses a scoring function rather than "nearest enemy" so elites and bosses earn attention
  and the heroine does not twitch between equidistant targets.
- Abilities decide for themselves via data (`trigger`, `minEnemies`, `hpBelow`) instead of per-hero
  scripting, keeping kits automatic but characterful.
- Every gameplay timer is fed by the one clock delta; presentation smoothing (camera, petals, shake)
  deliberately uses real time.

**Problems encountered**

- TypeScript's `noUnusedLocals` flagged three leftover parameters while wiring the renderer; removed
  rather than suppressed.
- A ranged-enemy stride used a hard-coded `0.016` instead of the simulation delta, which would have
  ignored the 2× multiplier. Replaced with `delta` and covered by the speed test.
- The ground band was drawn as a hard rectangle over the painted meadow; replaced with an alpha
  gradient after looking at the first gameplay capture.
- A stalled interactive `gh auth login` prompt (the PTY never accepted Enter) left the CLI polling
  nothing; restarted the device flow with piped stdin, which completed.

**Tests performed**

- `npm run typecheck`, `npm test` (36 tests) and `npm run build` all pass.
- Headless simulation tests: 2× produces exactly twice the simulated time, pause freezes enemy and
  heroine positions and stage timers, defeat triggers on zero health, victory triggers after the
  last stage.
- Manual browser run: menus, roster detail, a live run through stages 1–3 with abilities, wave
  clearing and HUD updates; captured `docs/screenshots/phase1-battle.png`.

**Remaining**

- Play the full ten-stage run by hand and tune late-stage difficulty and boss pacing.
- Phase 2: upgrade selection.

**Next**

- Three-choice upgrade cards with rarity, stacking and evolutions.

## 2026-11-22 — Phase 1: full-run playtest

**What was played**

- Two complete ten-stage runs in the browser: one at 1× and one at 2×, both through the Crystal
  Golem, the Thorn Queen and the results screen.

**Observed**

- The first attempt died to the Crystal Golem at 30.7% boss health on stage 5; a second attempt,
  after one tuning pass, died on stage 7.
- Cause in code: `World.spawnEnemy` applied the stage `hpScale`/`damageScale` on top of boss stats,
  inflating the golem from 2,600 to 3,640 HP and the Thorn Queen from 4,200 to 9,240.
- `SimulationClock` clamped real frames at 0.05 s, so below 20 fps the simulation advanced at roughly
  half speed; the test browser rendered at 9–11 fps.
- Stage 9 spawned three elite groups on fixed timers, stacking a treant and two fairy knights on top
  of each other. That pile-up, not the stat line, ended two runs at 8 / 10 stages.

**Fixed**

- Bosses spawn unscaled; the Thorn Queen is 2,800 HP / 22 damage, the golem 2,400 / 38.
- `MAX_REAL_STEP` is 0.1 s, so a slow frame no longer slows the game.
- Waves wait for the arena to clear (18 s grace) and a cleared wave heals 20% of maximum health,
  giving recovery between groups instead of only between stages.
- Stage-clear heal 15% → 55%; Yuzuki 1,200 / 34 → 1,350 / 48; late-stage scaling eased; boss summons
  capped at four brood on a 12 s cadence; stage 9 trimmed to one fairy knight and three sprites.

**Verified**

- 2× run: victory, 10 / 10 stages, 87 enemies, 2 bosses, 30,779 damage, 4:26.
- 1× run: victory, 10 / 10 stages, 91 enemies, 2 bosses, 32,433 damage, 4:35.
- Retry from the results screen restarts at stage 1 and resets speed to 1×.
- `npm run typecheck`, `npm test` (37 tests) and `npm run build` pass; the dev inspection handle is
  absent from the production bundle.
- Caveat: this browser throttled rendering to ~10 fps and paused when backgrounded, so wall-clock
  2× speed could not be compared against 1×; the multiplier itself is covered by tests.

**Remaining**

- Upgrades and the remaining heroines (Phase 2 and 3).
