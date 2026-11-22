# Platform compatibility

Last updated: 2026-11-22. This file records what was **actually run**, not what the shared codebase
is expected to support. Update it only with real evidence.

## Summary

| Platform | Build | Runtime status | Evidence |
| --- | --- | --- | --- |
| Desktop Chromium | `npm run build` static bundle | **Tested** | Full title → world → heroine → group fights → upgrades → solo mini-boss → solo final boss → victory → results; save persisted across reload |
| Mobile browser viewport (390 × 844) | Same bundle | **Partially tested** | Portrait HUD, group combat, stacked upgrades and results inspected in Chromium emulation; no physical phone browser was used |
| Android | Capacitor 8 debug APK | **Tested on emulator** | Installed and completed a full run on Android 16 / API 36 emulator; menus, speed, pause and the first upgrade used real `adb` taps, while later upgrade offers were auto-picked to finish the run |
| Android physical device | Same APK | **Not tested** | No physical Android device attached |
| iOS / iPadOS | None | **Blocked** | Windows host; no macOS/Xcode, signing certificate, provisioning profile or device |
| Firefox / Safari / Edge | Same web bundle | **Not tested** | No compatibility claim |
| Tablet / large phone / narrow phone | Same web bundle | **Not tested beyond 390×844 and 1080×2400** | Responsive breakpoints exist |
| Performance tiers | — | **Not measured** | No frame-time tracing, thermal or battery data |

## Test environment

### Web

- Freebuff Desktop browser: Chromium `130.0.6723.191`, Electron 33.4.11, Windows.
- Desktop viewport: 1280 × 820 at DPR 1.
- Phone viewport: 390 × 844 CSS px (emulation only).
- Node 26.13.0, npm 9.6.7.
- Production-like static Vite build served locally.

### Android

- Capacitor 8.6.2, Android Gradle Plugin project, Gradle wrapper 8.14.3.
- JDK 21 (`Android Studio jbr`, OpenJDK 21.0.6), Android SDK 36/build-tools 36.0.0.
- AVD: “Medium Phone”, model `sdk_gphone64_x86_64`, **Android 16 / API 36**, x86_64.
- Display: 1080 × 2400 physical, 420 dpi, 412 × 867 CSS px, DPR 2.625.
- Emulator graphics: host GPU (NVIDIA RTX 3060 Ti, OpenGL ES 3.0 translator). Windowed; not headless.
- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk` (about 6.4 MB). The APK is ignored
  by git and is not a release-signed artifact.
- App ID: `com.ayirus.hoshinohanabira`; label “Hoshi no Hanabira”; portrait-locked activity.

## Tests performed

### Web flow

- Title, world select, roster and heroine detail.
- Three-choice upgrade offers; first card selected each time.
- Group encounter, mini-boss, final boss, victory and results.
- 1×/2× toggle and pause/resume.
- Save persisted after a reload (storage key `hoshi-no-hanabira.save`; 1,326 coins in that
  session).
- Browser console showed no runtime errors during the run.

Pointer caveat: the desktop flow was driven through DOM `.click()` calls in the preview harness, not
physical mouse events. Mouse-specific hit-testing was not independently instrumented.

### Android flow

Performed with the debug APK installed via `adb install -r`:

- Launch, title screen, world select, roster and heroine detail.
- **Real touch input** for: Begin Adventure, Enter rift, heroine card, Fight with Yuzuki, speed toggle,
  pause, Resume, and the first upgrade card. Later upgrade offers in the full run were clicked
  programmatically through the WebView so the test could reach both bosses in one sitting; those
  selections were not themselves touch-tested.
- Group encounter with **3 independent slimes**, each with its own health bar; 4-enemy encounter also
  observed.
- **Solo mini-boss** (“The Seal Holds”, The Thorn Guardian): exactly **1 remaining** throughout,
  dedicated boss bar and Phase I label.
- **Solo final boss** (“The Heart of the Rift”, The Thorn Queen): exactly **1 remaining**, boss bar,
  evolved build visible.
- Victory results: 10/10 encounters, 28 enemies, 2 guardians, 19,351 damage dealt, 2,190 taken,
  2:25 simulated time, 1,410 Astral Coins, three achievements.
- Upgrade screen displayed three readable cards with rarity, numeric effect, description and category.
- **Save persistence:** force-stopped and relaunched the app; 1,410 coins and run statistics were
  restored from `localStorage`. Backgrounding with Home and reopening also returned to the same
  screen with the save intact.
- 1× and 2× both ran; the full test run used 2×.
- App reinstall with the custom icon and splash succeeded; no JavaScript console errors after the
  final cold start.

### Emulator-specific rendering note

The first emulator was launched headless (`-no-window -gpu angle_indirect`). CSS, DOM and HUD rendered,
but **all canvas layers were omitted from `adb` and DevTools screenshots**. A synthetic red-circle
canvas was also invisible, while its bitmap data existed and `toDataURL()` returned the drawing. This
was an emulator compositor limitation, not a game error. Restarting a **windowed host-GPU** emulator
produced correct canvas frames, which are the Android screenshots in `docs/screenshots/`.

Do not use the headless ANGLE configuration for visual sign-off. Canvas visibility must be checked in
a windowed emulator or on a physical device.

## Not tested / do not claim

- Physical Android phone or tablet, including notches, cutouts, gesture navigation and real touch
  ergonomics.
- iOS, iPadOS, TestFlight, App Store, provisioning or signing.
- Release APK/AAB signing, Play Store publication or policy compliance.
- Firefox, Safari, Edge, Samsung Internet or older Android WebViews.
- Landscape mode (activity is portrait-locked) and orientation changes.
- Screen sizes from 320 px to tablet width; only 390×844 and 412×867 were inspected.
- Audio/mute, audio focus and interruptions (emulator was started with audio disabled).
- Frame rate, frame-time consistency, memory growth, thermal behaviour or battery drain.
- Extended sessions beyond the single 2:25 completed run.
- Cloud saves, accounts or cross-device transfer (not implemented).
- Accessibility audit, screen-reader navigation or reduced-motion behaviour beyond CSS presence.

## Minimum and recommended requirements

**There is no measured minimum device requirement.** The only evidence is one Android 16 x86_64
emulator with host GPU, and one Chromium desktop browser. The canvas renderer is modest (one
1280×720 arena, procedural vectors, no video), but that is not a performance guarantee.

Until profiling is done:

- **Recommended for evaluation:** a current desktop browser or a current mid-range Android device
  with hardware-accelerated WebView.
- **Not supported claims:** low-end phones, old WebViews, iOS, Firefox/Safari.
- **Target:** 60 FPS on recommended hardware; a lower floor on minimum hardware is not defined.

Required software for development:

- Node.js 18+ (22+ recommended).
- Android: JDK 21 + Android SDK 36; Gradle wrapper is included.
- iOS: macOS + Xcode + signing resources (not available here).

## Build commands

```bash
npm install
npm run build        # static browser bundle in dist/
npm run typecheck
npm test
npm run simulate     # headless balance sweep

# Android
export JAVA_HOME=/path/to/jdk-21
export ANDROID_HOME=/path/to/Android/Sdk
npm run android:apk  # builds web, syncs Capacitor, runs Gradle assembleDebug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.ayirus.hoshinohanabira/.MainActivity
```

## Next platform work

1. Run the same APK on at least two physical Android devices (low/mid tier) and record frame times,
   memory and battery.
2. Test real notches/safe areas, gesture navigation and orientation lock behaviour.
3. Profile group fights and both bosses; define measured minimum/recommended tiers.
4. Test current mobile Safari and Android Chrome against the hosted browser build.
5. On a Mac with signing resources, generate the iOS Capacitor project, archive it and test
   pause/resume, audio focus and saves.
6. Add a production signing/CI path; never commit keystores.
