/**
 * Cross-platform debug APK build. Requires JDK 21 and the Android SDK (SDK 36).
 * `npm run cap:sync` must run first so android/app/src/main/assets/public is current.
 */
import { spawnSync } from 'node:child_process';

const windows = process.platform === 'win32';
const command = windows ? '.\\gradlew.bat' : './gradlew';
const result = spawnSync(command, ['assembleDebug'], {
  cwd: 'android',
  stdio: 'inherit',
  shell: windows,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
