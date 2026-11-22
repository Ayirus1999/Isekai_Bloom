# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow semantic versioning once
the project reaches a stable release.

## [0.2.0] - 2026-11-22

Complete rebuild of the run structure from a continuous ten-stage wave runner into a
ten-encounter adventure with roguelite rewards, the full six-heroine roster, five worlds and a
portrait-first interface. Adds the first native Android shell.

### Added

- **Encounter adventures:** ten encounters per world — six group fights, two reward events, one
  solo mini-boss and one solo final boss — with per-encounter health/damage scaling and a 20% heal
  between fights.
- **Group combat:** 3–8 independent enemies per group, each with its own health, damage, defence,
  timers, status effects, targeting and death state. Melee chasers, ranged casters and support
  archetypes.
- **Solo boss encounters:** every mini-boss and final boss is hard-sliced to exactly one enemy.
  Boss patterns include sweeps, volleys, slams, beams, meteors and drains, with a 50% phase shift.
  Summons were removed.
- **Six heroines:** Yuzuki Hoshino, Akari Amamiya, Shiori Tsukishiro, Miyu Sakuraba, Rin Kisaragi
  and Airi Mizuhara, each with stats, range, crit profile and five abilities.
- **Six original boss designs:** Thorn Queen, Crystal Dragon, Fallen Star Guardian, Shadow Empress,
  Corrupted Celestial, plus four mini-boss silhouettes.
- **Five worlds:** Blossom Meadow, Moonlit Forest, Crystal Kingdom, Ember Highlands and Celestial
  Ruins, each with palettes, motifs, enemy pools, bosses and unlock cost.
- **Procedural heroine rig:** shared keyframed skeleton with per-heroine palettes, hair, outfits,
  weapons, stances and clip sets. Idle breathing/blink/hair sway, attacks, casts, area, buff, heal,
  shield, hurt, ultimate, victory and defeat.
- **Animation-event combat:** damage, projectiles, rain, areas, heals, shields and buffs resolve from
  clip events at exact timestamps, driven by simulated time.
- **Roguelite upgrades:** 48 cards, five rarities, depth-weighted offers, stack caps,
  character-exclusive cards, six pair evolutions and a guaranteed evolution slot when ready.
- **Permanent progression:** Astral Coins, five meta-upgrade families, six heroine unlocks, five
  world unlocks, achievements, lifetime stats and settings in a versioned save.
- **Portrait-first presentation:** safe-area padding, 44 px controls, responsive HUD, compressed
  portrait arena camera, stacked upgrade cards, phone results layout.
- **Boss presentation:** dedicated boss bar, telegraph ring, phase label and large procedural body.
- **Balance harness:** `npm run simulate` plays full headless runs for all heroines.
- **Android shell:** Capacitor 8 project with portrait orientation, shared web bundle, debug APK
  build script and JDK 21/SDK 36 build instructions. Debug APK installed and played to a 10/10
  victory on an Android 16 / API 36 emulator with real touch input; save survived force-stop and
  relaunch.
- **Android branding:** original starflower launcher icon, adaptive icon and splash generated from
  `resources/icon-only.png`.

### Changed

- The ten-stage wave runner became an encounter adventure; encounters end when their group is dead.
- Basic and ability damage is now resolved by animation events rather than timer callbacks.
- Committed attacks and casts keep their timing when the heroine is hit; flinch plays between
  actions. Previously a boss could interrupt every attack and erase her damage.
- Bosses no longer receive stage scaling; their authored stats use their own balance multipliers.
- Title, roster, HUD and battle now share one character renderer instead of static portraits.
- The battle camera is fixed and the heroine is anchored left; temporary lunges return to anchor.
- Documentation rewritten around the current build; added animation guidelines and a platform
  compatibility matrix.

### Fixed

- Event encounters now count toward encounters cleared, so a finished run reads 10/10.
- The encounter progress row no longer collapses to zero height on portrait phones.
- Portrait enemies and projectiles share the compressed-x camera, keeping melee spacing and effects
  aligned while showing full groups and bosses.
- Damage taken now includes damage absorbed by shields.
- A corrupted or unavailable save no longer crashes boot.
- Boss adds could previously spawn from a despawned encounter; summoning is now a verified no-op.

### Removed

- Generated JPG key art, the chroma-keyed Yuzuki sprite, the static painted boss and the old
  `assets/` bitmap pipeline.
- The continuous stage/wave runner, boss summons and `spawnAdds` behaviour.
- Stale screenshots from the replaced build.

### Known limitations

- Art and animation are an original procedural prototype, not painted production anime.
- No iOS build (Windows host, no Xcode/signing).
- Android was validated on an emulator only; no physical phone or tablet has run the APK.
- The APK is debug-signed; release signing and store validation are not done.
- Performance, battery and thermal behaviour are not measured.
- Browser testing is limited to the bundled Chromium; Firefox/Safari/Edge are untested.
- No software license.

## [0.1.0] - 2026-11-22

### Added

- Playable Phase 1 prototype: Yuzuki Hoshino, Blossom Meadow and a ten-stage run.
- Autonomous combat with targeting hysteresis, approach, basics and five cooldown/trigger abilities.
- Twelve procedural enemy archetypes, a mini-boss and the Thorn Queen with summons.
- Centralised 1×/2× clock and pause covering movement, cooldowns, projectiles, damage-over-time and
  stage progression.
- Combat HUD, boss bar, results screen, parallax meadow and synthesized sound board.
- Vite + TypeScript + Canvas 2D foundation with strict type checking and Vitest.

[Unreleased]: https://github.com/Ayirus1999/Isekai_Bloom/commits/develop
[0.2.0]: https://github.com/Ayirus1999/Isekai_Bloom/releases/tag/v0.2.0
[0.1.0]: https://github.com/Ayirus1999/Isekai_Bloom/commits/develop
