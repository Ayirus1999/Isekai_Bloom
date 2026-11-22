# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow semantic versioning once
the project reaches a stable release.

## [Unreleased]

### Planned

- Three-choice upgrade system with rarity, stacking and evolutions.
- Akari, Shiori, Miyu, Rin and Airi as playable heroines.

## [0.1.0] - 2026-11-22

### Added

- Playable Phase 1 prototype: Yuzuki Hoshino, the Blossom Meadow and a ten-stage run.
- Autonomous combat: target acquisition with hysteresis, approach, basic attacks, and five
  ability kits fired by cooldown and trigger condition.
- Twelve enemy archetypes including four elites, a mini-boss and the Thorn Queen with summons,
  telegraphed volleys, charges and a second phase.
- Centralised 1× / 2× simulation speed and pause, driving movement, cooldowns, projectiles,
  damage-over-time, spawn timers and stage progression.
- Combat HUD with health, stage, wave progress, boss bar and speed toggle.
- Results screen with stages cleared, enemies defeated, bosses felled, damage and duration.
- Canvas renderer: parallax meadow, chroma-keyed heroine sprite, procedural enemies, slashes,
  rings, sparks and floating damage numbers.
- Runtime-synthesised sound board with a mute toggle.

### Changed

- Menu, roster and HUD now drive the live simulation instead of the static shell.

- Project foundation: Vite + TypeScript tooling, strict configuration and Vitest setup.
- Interface shell and stylesheet for the title screen, heroine roster, combat HUD, pause menu and
  results panel.
- Original generated art for Yuzuki Hoshino, the Blossom Meadow and the Thorn Queen.
- Documentation set: README, design document, roadmap, development log, asset credits and this
  changelog.

[Unreleased]: https://github.com/Ayirus1999/hoshi-no-hanabira/commits/develop
