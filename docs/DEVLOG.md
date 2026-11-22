# Development log

Chronological record of the build. Each entry describes what was actually implemented, the
decisions taken, problems hit, and how they were verified. Entries before 2026-11-22 “encounter
roguelite rebuild” describe the superseded stage-runner prototype.

---

## 2026-11-22 — Encounter roguelite rebuild and Android shell

**Implemented**

- Rebuilt the run from a continuous wave/stage runner into a **ten-encounter adventure**: six group
  fights, events at 3 and 8, a solo mini-boss at 5 and a solo final boss at 10, with a heal between
  encounters.
- Group encounters now spawn 3–8 fully independent enemies with separate hp, defence, timers,
  freeze/slow, shields, death state and rewards.
- Boss encounters are hard-sliced to one entity in `World.spawnEncounter`; boss summons were removed
  and replaceable/add behaviour is a verified no-op. Boss patterns: sweep, volley, slam, beam,
  meteor, drain; phase two at 50% health.
- Six original heroines (Yuzuki, Akari, Shiori, Miyu, Rin, Airi) with stats, ranges, weapons,
  five-ability kits and distinct palettes/hair/outfits.
- Five data-driven worlds with their own palettes, motifs, enemy pools, scaling, mini-boss, final
  boss and coin price.
- 48 upgrades across offense, defence, magic, special and heroine pools; five rarities;
  depth-weighted offers; stack caps; six pair evolutions; guaranteed evolution offer when ready.
- Astral Coins, five permanent upgrade families, heroine/world unlocks, achievements, lifetime stats,
  settings and a versioned localStorage save.
- New procedural heroine rig with clip events: idle breathing/blink/hair/skirt, basics with
  anticipation/lunge/impact/recovery, casts, areas, buffs, heals, shields, hurt, ultimate, victory
  and defeat. Damage/projectiles/areas/heals resolve from clip events at simulated timestamps.
- Boss silhouettes for Thorn Queen, Crystal Dragon, Fallen Guardian, Shadow Empress, Corrupted
  Celestial and four mini-bosses; normal-enemy archetypes, telegraph rings, hit flash, death fade.
- Portrait camera with compressed far lane, larger sprites, shared x-mapping for projectiles/effects
  and a full-width encounter HUD row. Safe-area CSS and 44 px touch targets.
- Capacitor 8 Android shell, portrait-locked activity, custom app icon/splash, cross-platform APK
  build script and the debug APK.
- Documentation set rewritten: README, design, architecture, animation guidelines, platform
  compatibility, roadmap, changelog, contributing and asset credits.

**Problems and fixes**

- **Boss DPS collapse:** every enemy hit used to interrupt Yuzuki's attack, so a boss with frequent
  chip damage silently cancelled most of her damage. Committed basics/casts now keep their timing;
  flinch plays only between actions. Ultimate actions were already locked.
- **Boss health wall:** stage health/damage scaling was being applied on top of boss stats. Bosses now
  use their own multipliers (×0.42 HP, ×0.88 damage) and ignore encounter scaling.
- **Wrong clear count:** events did not increment `encountersCleared`, so a victory could read 8/10.
  Events now count; the Android run verified 10/10.
- **Portrait spacing:** uniformly shrinking the 1280×720 arena made characters tiny and enemies
  overlap. The portrait camera preserves near-field scale and compresses only the far lane, with one
  mapper for characters, projectiles, impacts and effects.
- **Encounter chip disappeared:** the portrait HUD grid hid it; it now wraps to a full-width row.
- **Shield damage accounting:** absorbed damage is included in damage taken.
- **Old art pipeline:** the generated JPG heroine/key art and chroma-keyed sprite were removed because
  they conflicted with the animated rig; the repo now contains no character bitmaps except the app
  icon.
- **Save robustness:** loading merges defaults, filters unknown unlocks and survives malformed JSON
  or unavailable storage.

**Verification**

- `npm run typecheck` — pass; `npm test` — **54/54 pass**; `npm run build` — pass.
- Headless balance sweep with auto-first-card picks: five of six heroines cleared Blossom Meadow;
  Akari was defeated at 8/10 encounters. This is a naive-player baseline, not final balance.
- Browser: complete Blossom Meadow victory, nine upgrades chosen, 2× toggle, results and save
  persistence across reload.
- Android: debug APK installed on a 1080×2400 **Android 16 / API 36 emulator**. Real `adb` taps
  navigated title → world → heroine → battle, toggled 1×/2×, paused/resumed, chose upgrades, and
  reached both boss encounters. Full result: **10/10 encounters, 28 enemies, 2 guardians, 19,351
  damage dealt, 2,190 taken, 2:25, 1,410 coins, 3 achievements**. Force-stop/relaunch restored the
  save; Home/reopen preserved the session.
- Android visual caveat: a headless ANGLE emulator omitted every canvas layer from screenshots (a
  synthetic canvas was also invisible). Restarting windowed with host GPU produced correct frames.
  The Android screenshots in the repo come from the windowed run. This is documented in
  `PLATFORM_COMPATIBILITY.md` so it is not mistaken for a game defect.
- First Android launch logged three non-fatal Capacitor SystemBars “safe area CSS” injection errors
  before the document root existed; the app rendered and the errors did not recur after the final
  install. The WebView is already inset by the system bars.

**Remaining**

- Physical Android testing (small/mid-range phones), real notches/gestures/audio focus.
- iOS build: blocked by Windows, no Xcode/signing/provisioning.
- Performance, memory, thermal and battery profiling; define measured device tiers.
- Production-quality painted art and bespoke per-heroine animation.
- Cross-browser testing beyond the bundled Chromium.

---

# Earlier prototype history (superseded)

These entries describe the Original stage-runner prototype that was replaced by the encounter rebuild above. They are kept as an honest record of the project chronology.

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
  clearing and HUD updates; captured a prototype screenshot (removed in the encounter rebuild).

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
