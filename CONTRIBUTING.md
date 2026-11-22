# Contributing

Thanks for taking a look at *Hoshi no Hanabira: Isekai Bloom*. This guide covers how the project is
built, tested and shipped.

## Requirements

- Node.js 18+ or Bun 1.1+
- A modern browser (Chromium, Firefox or Safari)

## Setup

```bash
git clone https://github.com/Ayirus1999/hoshi-no-hanabira.git
cd hoshi-no-hanabira
npm install
npm run dev      # http://localhost:5173
```

## Checks before you push

```bash
npm run typecheck   # strict TypeScript, no emit
npm test            # Vitest suites in tests/
npm run build       # type check + production bundle
```

All three should pass. Do not merge a branch with a failing check.

## Branching

- `main` holds release-ready milestones only.
- `develop` is the integration branch; feature branches start from it.
- Use `feature/<short-name>`, `fix/<short-name>` or `docs/<short-name>` for work branches.
- Branch for meaningful, independently reviewable work (a system, a heroine, a screen), not for
  every typo.

## Commits

Conventional Commits, describing what actually changed:

```text
feat(combat): add automatic ability activation
fix(ai): keep the heroine from oscillating between targets
docs: record the phase 1 combat model
test(clock): cover pause and 2x simulation
```

Keep commits honest: no empty commits, no fabricated timestamps, no "final" commits that bundle days
of unrelated work.

## Pull requests

1. Branch from `develop`.
2. Implement and test the change.
3. Push the branch and open a pull request **into `develop`**.
4. Fill in the pull-request template: what changed, why, how it was tested, known limitations.
5. Merge only once the checks pass and the change has been reviewed.

Small documentation fixes may go straight to `develop`.

When a milestone is stable, open a release pull request from `develop` into `main` and update
`CHANGELOG.md` and the status block in `README.md` at the same time.

## Code guidelines

- Keep simulation logic free of rendering and DOM code; systems take a `dt` and mutate world state.
- All gameplay timers must use the simulation clock, never `performance.now()` directly.
- Prefer data (`src/data/`) over hard-coded per-character logic.
- Keep functions small and named for what they do; no dead code or commented-out experiments.
- Do not add runtime dependencies without a clear reason.

## Assets

Original or properly licensed assets only. Record anything new in `docs/ASSET_CREDITS.md`, and never
commit copyrighted anime artwork, logos, music or fonts.

## Secrets

Never commit tokens, keys or personal configuration. `.env` files, build output and local editor
state are ignored by `.gitignore`; keep it that way.
