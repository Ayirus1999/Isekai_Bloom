# Asset credits

## Visuals

There are **no bitmap character, boss, background or effect assets** in the current build. Every
visual is drawn at runtime by original code:

| Asset | Source |
| --- | --- |
| Heroine rigs, faces, hair, outfits, weapons | `src/render/hero.ts` |
| Enemy and boss bodies | `src/render/enemies.ts` |
| Sky, ground, trees, parallax and motes | `src/render/background.ts` |
| Slashes, rings, sparks, projectiles, damage numbers | `src/render/effects.ts` |
| Camera, portrait compression and composition | `src/render/renderer.ts` |
| Pose clips, anticipation, impact timing | `src/game/anim.ts` |

The designs are original to this project. No existing anime, manga, game, film or stock artwork is
traced, copied or redistributed. References named in the design brief informed broad archetypes
only; no character's face, hairstyle, outfit, accessory or pose is reproduced.

The earlier prototype used generated JPG key art and a chroma-keyed sprite. Those files were removed
when the current procedural rig replaced them and are not part of the current build.

## Launcher icon and splash

`resources/icon-only.png` is an original starflower emblem created for this project on 2026-11-22
with an image-generation tool. It contains no third-party character art, logo or text. Capacitor
Assets generated the Android launcher, adaptive-icon and splash PNGs from it; the generated files live
under `android/app/src/main/res/` and are build assets, not separate artwork.

## Audio

No audio files are bundled. Every cue is synthesized at runtime with the Web Audio API in
`src/audio/sfx.ts`. There is no music track.

## Fonts

The interface uses locally installed system serif/sans stacks. No fonts are bundled, downloaded or
redistributed.

## Software

Runtime dependencies: none beyond the game's own code.

Development dependencies:

- Vite (MIT)
- TypeScript (Apache-2.0)
- Vitest (MIT)
- Capacitor CLI/core/Android (MIT)

Android shell generation uses the standard Capacitor Android project (MIT). Android Gradle Plugin and
AndroidX components are used under their respective licenses when building the APK; their binaries
are not committed.

## Licensing status

No license file has been added. The repository is **source-available, not open source**; the author
retains all rights. Do not reuse the code or art without permission until a license is chosen.

## Generated screenshot evidence

`docs/screenshots/` contains captures from the running build, not redistributed third-party art.
