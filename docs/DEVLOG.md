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
