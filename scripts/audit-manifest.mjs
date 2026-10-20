// Fails if a STORE (privacy-first) APK/AAB-derived APK contains anything we promised not to ship.
// Usage: node scripts/audit-manifest.mjs [path/to/app-release.apk]   (needs the Android SDK build-tools: aapt)
// One edition only (no SMS edition). INTERNET and BILLING are expected: amendment A1 (Google Play Billing, Vault).
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const args = process.argv.slice(2);
const apk = args.find((a) => !a.startsWith('--')) ?? 'android/app/build/outputs/apk/release/app-release.apk';
const sdk = process.env.ANDROID_HOME ?? join(homedir(), 'Library/Android/sdk');
const bt = join(sdk, 'build-tools');
const ver = existsSync(bt) ? readdirSync(bt).sort().reverse()[0] : null;
if (!ver) { console.error('Android build-tools not found (set ANDROID_HOME)'); process.exit(2); }
const aapt = join(bt, ver, 'aapt');
if (!existsSync(apk)) { console.error(`APK not found: ${apk}`); process.exit(2); }

const run = (...a) => execFileSync(aapt, [...a], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const perms = [...run('dump', 'permissions', apk).matchAll(/uses-permission(?:-sdk-23)?: name='([^']+)'/g)].map((m) => m[1]);
const tree = run('dump', 'xmltree', apk, 'AndroidManifest.xml');
const badging = run('dump', 'badging', apk);
const target = Number(badging.match(/targetSdkVersion:'(\d+)'/)?.[1] ?? 0);

const forbiddenPerms = [
  'android.permission.ACCESS_NETWORK_STATE', 'android.permission.READ_SMS', 'android.permission.SEND_SMS', 'android.permission.RECEIVE_SMS',
  'android.permission.RECEIVE_MMS', 'android.permission.RECEIVE_WAP_PUSH', 'android.permission.READ_CONTACTS', 'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO', 'android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_SPECIAL_USE', 'com.google.android.c2dm.permission.RECEIVE',
  'android.permission.READ_MEDIA_IMAGES', 'android.permission.READ_MEDIA_VIDEO', 'android.permission.DETECT_SCREEN_CAPTURE',
];
const forbiddenComponents = [
  'NotificationCaptureService', 'DoubleTapService', 'BIND_NOTIFICATION_LISTENER_SERVICE',
  'SmsReceiver', 'DrainTaskService', 'ActionReceiver', 'BROADCAST_SMS',
  // ML Kit's log-upload plumbing must stay stripped now that INTERNET is present
  'TransportBackendDiscovery', 'JobInfoSchedulerService', 'AlarmManagerSchedulerBroadcastReceiver',
];
const problems = [];
for (const p of perms) if (forbiddenPerms.includes(p)) problems.push(`forbidden permission: ${p}`);
for (const c of forbiddenComponents) if (tree.includes(c)) problems.push(`forbidden component/attribute in manifest: ${c}`);
// (ML Kit names its internal registrars 'com.google.firebase.components:...'; that is not the Firebase SDK.)
if (/com\.google\.firebase\.(messaging|analytics|crashlytics|iid|installations)|crashlytics|gms\.measurement|datatransport/i.test(tree)) problems.push('analytics / telemetry / push component present in manifest');
if (target < 36) problems.push(`targetSdkVersion is ${target}, Google Play requires 36+`);
if (!perms.includes('com.android.vending.BILLING')) problems.push('BILLING permission missing: Pro purchases would not work');

console.log(`APK: ${apk}\ntargetSdkVersion: ${target}\nPermissions (${perms.length}):`);
for (const p of perms) console.log(`  - ${p}`);
if (problems.length) { console.error('\nAUDIT FAILED:'); problems.forEach((p) => console.error(`  x ${p}`)); process.exit(1); }
console.log('\nAUDIT PASSED (store profile)');
