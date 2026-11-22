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
