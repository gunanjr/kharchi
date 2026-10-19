// Fails if a STORE (privacy-first) APK/AAB-derived APK contains anything we promised not to ship.
// Usage: node scripts/audit-manifest.mjs [path/to/app-release.apk] [--full]   (needs the Android SDK build-tools: aapt)
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const args = process.argv.slice(2);
const apk = args.find((a) => !a.startsWith('--')) ?? 'android/app/build/outputs/apk/release/app-release.apk';
const allowSms = args.includes('--full');
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
  'android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE', 'android.permission.READ_SMS', 'android.permission.SEND_SMS',
  'android.permission.RECEIVE_MMS', 'android.permission.RECEIVE_WAP_PUSH', 'android.permission.READ_CONTACTS', 'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO', 'android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_SPECIAL_USE', 'com.google.android.c2dm.permission.RECEIVE',
  ...(allowSms ? [] : ['android.permission.RECEIVE_SMS']),
];
const forbiddenComponents = [
  'NotificationCaptureService', 'DoubleTapService', 'BIND_NOTIFICATION_LISTENER_SERVICE',
  ...(allowSms ? [] : ['SmsReceiver', 'DrainTaskService', 'ActionReceiver', 'BROADCAST_SMS']),
];
const problems = [];
for (const p of perms) if (forbiddenPerms.includes(p)) problems.push(`forbidden permission: ${p}`);
for (const c of forbiddenComponents) if (tree.includes(c)) problems.push(`forbidden component/attribute in manifest: ${c}`);
if (/firebase|com\.google\.android\.gms\.measurement|crashlytics/i.test(tree)) problems.push('analytics/Firebase component present in manifest');
if (target < 36) problems.push(`targetSdkVersion is ${target}, Google Play requires 36+`);

console.log(`APK: ${apk}\ntargetSdkVersion: ${target}\nPermissions (${perms.length}):`);
for (const p of perms) console.log(`  - ${p}`);
if (problems.length) { console.error('\nAUDIT FAILED:'); problems.forEach((p) => console.error(`  x ${p}`)); process.exit(1); }
console.log(`\nAUDIT PASSED (${allowSms ? 'full/SMS profile' : 'store profile'})`);
