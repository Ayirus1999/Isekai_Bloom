# Contributing

Thanks for looking at *Hoshi no Hanabira: Isekai Bloom*.

## Requirements

- Node.js 18+ (Node 22+ recommended) or Bun
- A modern browser
- For Android builds: JDK 21, Android SDK 36 and Gradle (the Android project includes a Gradle wrapper)

## Setup

```bash
git clone https://github.com/Ayirus1999/Isekai_Bloom.git
cd Isekai_Bloom
npm install
npm run dev      # http://localhost:5173
```

## Checks before pushing

```bash
npm run typecheck   # strict TypeScript, no emit
npm test            # 54 Vitest tests
npm run build       # typecheck + static production bundle
npm run simulate    # optional: headless full-run balance sweep
```

All required checks must pass. Do not merge with a failing check or hide a failure with a
suppression.

## Branching and pull requests

- `main` holds stable milestones.
- `develop` is the integration branch.
- Create `feature/<short-name>`, `fix/<short-name>` or `docs/<short-name>` from `develop`.
- Open pull requests into `develop` and fill in the template with what changed, why, actual test
  commands/results and known limitations.
- Release pull requests go `develop` → `main` when a milestone is stable.

Do not force-push shared branches, rewrite published history or commit generated build output.

## Commits

Conventional Commits, describing what actually changed:

```text
feat(combat): resolve damage from animation clip events
fix(ui): keep the encounter row visible on narrow phones
test(simulation): enforce a single enemy in boss encounters
docs: record Android emulator validation and iOS blocker
```

## Code rules

- Simulation code stays DOM-free and consumes the simulation delta; never use wall-clock time for
  gameplay.
- Heroine, enemy, world and upgrade definitions belong in `src/data/`.
- Keep rendering and UI dependent on simulation, never the reverse.
- No new runtime dependency without a clear, documented reason.
- Preserve the solo-boss rule: no adds in mini-boss or final-boss encounters.
- If you change combat timing, update or add a deterministic test.

## Assets

Original or properly licensed assets only. The current build is fully procedural; new bitmap art
must be recorded in `docs/ASSET_CREDITS.md` with its source and license. Never commit copyrighted
anime artwork, music, fonts or logos.

## Android

```bash
export JAVA_HOME=/path/to/jdk-21
export ANDROID_HOME=/path/to/Android/Sdk
npm run android:apk
```

This builds the web bundle, syncs it into the Capacitor project and runs the Gradle wrapper on
Windows, macOS or Linux. The APK lands in `android/app/build/outputs/apk/debug/`. A debug build does
not require a signing key. Physical-device and store testing are separate steps and must be reported
honestly; emulator testing alone is not device validation.

## Saves and secrets

- Saves live in browser/WebView localStorage under `hoshi-no-hanabira.save`.
- Never commit tokens, signing keys, keystores or local SDK configuration
  (`android/local.properties` is ignored).
- No API keys or external services are used by the game.
