# Roadmap

Status labels: **Completed** · **Partial** · **Blocked** · **Not started**

Last updated: 2026-11-22.

| Track | Scope | Status |
| --- | --- | --- |
| 1 | Core auto-battle prototype, Yuzuki, group encounters, bosses, results | Completed |
| 2 | Heroine animation rig and synchronized combat events | Completed (stylized prototype quality) |
| 3 | Three-choice upgrade system, rarity, stacking, evolutions | Completed |
| 4 | Six-heroine roster with distinct kits | Completed (shared vector rig) |
| 5 | Ten-encounter adventures, events, mini-boss and final boss | Completed |
| 6 | Five worlds with distinct palettes, enemies and bosses | Completed (data-driven; enemies partly reused) |
| 7 | Astral Coins, meta upgrades, unlocks, achievements, save | Completed |
| 8 | UI/visual/audio/balance polish | Partial |
| 9 | Android and iOS application builds and device validation | Partial (Android emulator verified; iOS blocked) |
| 10 | Measured performance profiles and compatibility matrix | Not started |

---

## Track 1 — Core auto-battle prototype

**Completed.** A run can be launched, played and finished in a desktop browser.

- [x] Fixed side-view arena; heroine anchored left, enemies right.
- [x] Group encounters with independent enemy health and targeting.
- [x] Automatic attacks and abilities, with real damage resolution.
- [x] Solo mini-boss and solo final boss encounters, enforced in `World.spawnEncounter`.
- [x] 1× / 2× simulation speed and pause driven by one clock.
- [x] Victory/defeat results with accurate counters.
- [x] Browser console free of runtime errors during a full run.
- [x] Static production build works from `dist/`.

Evidence: `npm run typecheck`, `npm test` (54 tests), `npm run build`, a headless auto-run of all six
heroines, and one complete browser run to victory at 2×.

## Track 2 — Animation

**Completed as a prototype; partial against the production-art target.**

- [x] One rig with shared proportions used by battle, roster, HUD and title.
- [x] Idle breathing, blink, hair/skirt sway, weapon rest.
- [x] Basic attack with anticipation, lunge, impact, recovery and return.
- [x] Distinct ability clips and magic gestures per kit.
- [x] Hurt, heal/buff, victory, defeat and ultimate poses.
- [x] Clip-event damage synchronization at both simulation speeds.
- [x] Boss procedural bodies and attack lunge/telegraph feedback.
- [ ] Painted production character art and hand-authored frame animation.
- [ ] Fully individual rigs per heroine (currently variant palettes/poses on one rig).

See [ANIMATION_GUIDELINES.md](ANIMATION_GUIDELINES.md).

## Track 3 — Upgrades

**Completed.**

- [x] Exactly three cards per reward.
- [x] Cooldown/timer simulation pauses during selection.
- [x] Five rarities with depth-weighted offers.
- [x] Stack caps and effect application to real combat calculations.
- [x] Heroine-specific cards.
- [x] Six pair evolutions; a ready evolution is guaranteed to be offered.
- [x] Cards show name, rarity, effect number, description and category.

## Track 4 — Heroines

**Completed for gameplay, partial for visual individuality.** All six are implemented and selectable
after coin unlock. Their kits and stats differ; their rig is shared, so silhouettes vary mainly by
hair, palette, outfit and weapon.

- [x] Yuzuki, Akari, Shiori, Miyu, Rin, Airi data and ability kits.
- [x] Different basic-attack types, ranges, speeds and crit profiles.
- [x] Roster cards, detail modal, unlock costs, shared save.
- [ ] Unique skeletal proportions or bespoke animation sets per heroine.
- [ ] Painted key art.

## Track 5 — Adventures

**Completed.** Each world defines ten encounters: six group fights, two events, one mini-boss and one
final boss. Events count as cleared encounters and award coins/upgrades.

## Track 6 — Worlds

**Completed at data level.** Five worlds exist with their own sky/ground palettes, motifs, normal and
elite pools, mini-boss and final boss, health scaling and coin unlock price. Not every world has a
unique final boss (Crystal Kingdom reuses the Crystal Dragon), and some enemy archetypes recur.

## Track 7 — Permanent progression

**Completed.**

- [x] Astral Coins earned from encounters, events and bosses.
- [x] Five permanent upgrade families with levels and escalating costs.
- [x] Heroine unlocks and world unlocks.
- [x] Achievements (first petal, guardian slayer, evolution, rift sealed, etc.).
- [x] Versioned save tolerant of corrupt/absent storage.
- [x] Settings (speed, mute) persisted.
- [ ] Cloud/account sync (explicitly out of scope for the local build).

## Track 8 — Polish

**Partial.**

- [x] Portrait camera with compressed lane, larger characters and readable HUD.
- [x] Mobile encounter row, stacked upgrade cards, safe-area padding, 44 px controls.
- [x] Procedural boss bodies distinct from normal enemies.
- [x] Health bars, boss bar, encounter progress, build chips, results screen.
- [ ] Final character art/animation quality pass.
- [ ] Music and richer audio.
- [ ] More UX polish (focus states, reduced motion was scaffolded but not fully audited).
- [ ] Balance pass based on human playtests rather than auto-picks.

## Track 9 — Android and iOS

**Partial: Android debug build verified on an emulator; iOS blocked.**

- [x] Shared web gameplay core loaded by a Capacitor shell without a second codebase.
- [x] Capacitor 8 Android project checked in, portrait-locked and branded.
- [x] Debug APK builds with JDK 21 / SDK 36 (about 6.4 MB).
- [x] APK installed and launched on an Android 16 / API 36 emulator at 1080 × 2400.
- [x] Full run completed with real touch navigation: 10/10 encounters, both solo bosses, upgrades,
      results, 1,410 coins and three achievements.
- [x] Save survived force-stop/relaunch and Home/resume.
- [x] Custom icon and splash generated from an original emblem.
- [ ] Physical-device test (small and mid-range phones).
- [ ] iOS project, archive and signing route (requires macOS/Xcode).
- [ ] Device tests for notches, gesture navigation, audio focus, thermal behavior and performance.
- [ ] Release-signed APK/AAB and store publication (not requested, not done).

Do not mark iOS or physical Android support until those steps have real evidence. Exact results:
[PLATFORM_COMPATIBILITY.md](PLATFORM_COMPATIBILITY.md).

## Track 10 — Performance

**Not started.** Required before any minimum-device claim:

- Representative low/mid/high Android and iOS hardware.
- Frame-time trace during 8-enemy groups and both bosses.
- Memory growth across repeated runs.
- Thermal/battery observation.
- Documented minimum and recommended tiers in
  [PLATFORM_COMPATIBILITY.md](PLATFORM_COMPATIBILITY.md).

## Known release blockers

1. Production anime art and hand-tuned animation are not present.
2. Android is emulator-only evidence; iOS has no build and no physical-device testing exists.
3. No measured performance profile, thermal data or minimum-device tier.
4. No software license (repository is source-available only).
5. Cross-browser testing is limited to the bundled Chromium used during development.
6. The APK is debug-signed only; no release signing or store submission has been done.
