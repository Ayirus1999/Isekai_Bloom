# Roadmap

Status labels: **Not Started** · **In Progress** · **Completed** · **Blocked**

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Repository, tooling, art pipeline, interface shell | Completed |
| 1 | Core prototype: autonomous combat, enemies, stages, boss, speed control | In Progress |
| 2 | Three-choice upgrade system with rarity, stacking and evolutions | Not Started |
| 3 | Remaining five heroines with unique kits | Not Started |
| 4 | Additional worlds, enemies, elites and bosses | Not Started |
| 5 | Astral Coins, permanent progression, unlocks, save system | Not Started |
| 6 | Animation, audio, UI and balance polish | Not Started |

---

## Phase 1 — Core prototype

**Objective:** a genuinely playable run that could be handed to a stranger.

**Scope**

- Main menu and heroine roster (Yuzuki selectable).
- One environment, the Blossom Meadow.
- Automatic movement, target selection, basic attacks and abilities.
- Enemy spawning, damage, death and wave progression across ten stages.
- Elite enemies and the Thorn Queen boss with summons, ground telegraphs and a second phase.
- Centralised simulation clock with 1× / 2× and pause, driving every gameplay timer.
- Combat HUD, stage banners, boss health bar, run results.

**Acceptance criteria**

- [ ] The game launches to the main menu and starts a stage.
- [ ] Yuzuki selects targets, closes to attack range and attacks without input.
- [ ] Abilities fire automatically on cooldown and condition.
- [ ] Enemies take damage, die, and waves advance to the next stage.
- [ ] The boss spawns, uses its mechanics and can be defeated.
- [ ] 1× / 2× changes the whole simulation rate, not just animation.
- [ ] Pause freezes combat; the interface stays responsive.
- [ ] A run can end in victory or defeat, with accurate results.
- [ ] `npm run build` and `npm test` pass, and the browser console stays clean.

---

## Phase 2 — Upgrade system

Three upgrade cards after eligible stages, drawn from offensive, defensive, magical, special and
heroine-specific pools, with Common → Legendary rarity, stacking, combat pause during selection and
pair-based evolutions (e.g. Celestial Edge + Astral Resonance → Celestial Excalibur).

**Acceptance criteria**

- Cards show name, rarity, effect description and numeric value.
- Selection visibly changes performance in the next fight.
- Combat is fully frozen while the choice is open and resumes on pick.
- Evolutions trigger from the documented pairs and are announced in the HUD.

---

## Phase 3 — Character expansion

Akari Amamiya, Shiori Tsukishiro, Miyu Sakuraba, Rin Kisaragi and Airi Mizuhara, each with distinct
basic attacks, ability kits, stats and art.

**Acceptance criteria**

- Every heroine is selectable and plays differently.
- Roster cards show portrait, role, element, weapon and unlock state.
- Each kit has at least one behaviour the others cannot reproduce.

---

## Phase 4 — Worlds and enemies

Moonlit Forest, Crystal Kingdom, Ember Highlands and Celestial Ruins, each with themed backdrops,
enemy line-ups, elites and a world boss.

**Acceptance criteria**

- World selection exists and gates progress correctly.
- Stage definitions are data-driven per world.
- New enemies introduce new behaviours rather than only higher numbers.

---

## Phase 5 — Permanent progression

Astral Coins, meta upgrades, heroine unlocks, achievements and a versioned save system.

**Acceptance criteria**

- Coins are awarded from cleared stages and bosses.
- Meta upgrades persist across reloads and measurably affect a new run.
- Corrupt or partial saves fall back safely instead of bricking the game.

---

## Phase 6 — Polish

Animation refinement, additional effects, sound design, transitions, balance and performance.

**Acceptance criteria**

- A full run holds 60 fps on integrated graphics.
- No console errors or broken states across a complete run.
- The README carries genuine screenshots and current instructions.
