# Progress: Privacy-First production changes (19 Oct 2026)

Goal: launch Kharchi with the fewest sensitive permissions, no bank integration, no financial-data backend and no unnecessary regulatory complexity, as proposed in the two review documents. Status: **done and verified on a release build**, except items listed under "Not done / needs you".

## Result in one table
| | Before | After (store edition) |
|---|---|---|
| Permissions in release APK | 30+ (SMS, internet, camera, overlay, FCM/c2dm, 20 launcher-badge, install-referrer...) | **4**: notifications (optional), biometrics (optional), vibrate, boot (re-arm reminders) |
| SMS permission / receiver / declaration | yes / yes / needed | **none / none / not needed** |
| INTERNET | yes | **removed** (data cannot leave the phone) |
| Push (FCM), badges, camera, contacts, location | present via libraries | **none** |
| Target SDK | not pinned | **36** (Play requirement as of 19 Oct 2026) |
| APK size (arm64) | 58 MB | 45 MB |
| Auto-backup to Google Drive | on | **off** |
| Production build | full SMS edition | **Privacy-First edition** (SMS edition kept as optional) |
| Tests | 138 | **140** |

## What changed (by recommendation)

### 1. Local storage and data access
- Confirmed architecture: SQLite on device, no backend, no accounts, no sync. Nothing transmits.
- Made it **provable**: store builds remove the INTERNET and ACCESS_NETWORK_STATE permissions, so the OS blocks any network use. (`app.config.ts`, `STORE_BUILD=1`)
- `scripts/audit-manifest.mjs` (`npm run audit:manifest`) inspects the real APK and **fails** on forbidden permissions/components, Firebase/analytics, or targetSdk < 36. Passed on the final release APK.
- In-app Privacy screen rewritten to state facts for the running build (e.g. "this build has no permission to use the internet") and to link the policy and support email. (`src/app/settings/privacy.tsx`)

### 2. Privacy-First edition = Lite build as production default
- `APP_VARIANT` now defaults to `lite`; app name no longer has a "Lite" suffix.
- Lite strips: SMS receiver, SMS permission, notification listener, double-tap service, foreground-service permissions, notification-reply receiver, headless drain service (plugin `plugins/withKharchiNative.js`).
- Automatic capture replaced in the UI by **Paste / Share a bank message**: a new "Import from a message" screen with 4 plain steps and a "Paste a copied message" button; Share-to-app intent kept. Parser (70 samples) reused unchanged; user confirms before saving.
- Onboarding, More menu, Developer panel, store listing and privacy policy copy rewritten to match (en + hi).
- Experimental features (notification listener, motion detector) now only exist with `EXPERIMENTAL=1` dev/test builds, never in store builds.

### 3. Permission profile
| Item | Outcome |
|---|---|
| SMS | removed |
| Bank / Account Aggregator | not implemented (interface + mock only, unused by UI) |
| Contacts, location, camera, microphone | blocked/removed |
| Notifications | optional runtime request, only when you set a reminder |
| Biometrics | optional app lock |
| File access | system file picker only (no storage permission) |
| Internet | **removed** in store builds |
- **Removed unused/over-broad packages**: expo-image-picker (was adding CAMERA), expo-print, expo-sms, expo-intent-launcher, expo-keep-awake, expo-task-manager, expo-system-ui, @shopify/react-native-skia, async-storage, zod.
- **Removed `expo-notifications`** (it brought FCM `c2dm`, WAKE_LOCK and ~20 launcher-badge permissions). Replaced by native **local reminders** (`Reminders.kt`: inexact AlarmManager alarms, re-armed after reboot, no exact-alarm permission). `scheduleReminder()` is now `src/features/groups/reminders.ts`.
- Blocked in config: SYSTEM_ALERT_WINDOW (dev-client), install-referrer, storage, camera, mic, contacts, location.

### 4. Legal / Google Play work
- **Avoided:** SMS Permissions Declaration, demo video for SMS, bank/AA onboarding, backend, cloud DB, server AI, sensitive permissions.
- **Done for what remains:** privacy policy rewritten (`docs/index.html`, `docs/privacy-policy.html`; GitHub Pages from `/docs` → `https://gunanjr.github.io/kharchi/`), linked in the app; Data safety answers (collects/shares **nothing**), financial-features declaration answers, content rating, target audience (`docs/PLAY_POLICY.md`); store listing (en/hi) rewritten without SMS claims; icons + feature graphic ready; target SDK 36; EAS profiles reorganised.
- `docs/PUBLISH_GUIDE.md` rewritten for the privacy-first path (no SMS form), beginner steps, 12-tester rule, GitHub Pages hosting.

### 5. The five developer tasks
1. **Audit the Lite build** - done (audit script; passed on the release APK: 4 permissions, no SMS/listener/sensor components, no Firebase).
2. **Verify local-only behaviour** - strengthened: INTERNET permission removed, so traffic is impossible. (No code path performs network calls; verified by grep and by the build working with no network permission.)
3. **Functional without permissions** - release build installed on an Android 16 emulator **with notification permission only**; onboarding, demo data, Insights and Groups render; no crashes (0 FATAL in logcat). Manual entry, CSV, splitting, backup are covered by 140 unit tests on real SQLite.
4. **Minimum store documentation** - done (above).
5. **Build and submit** - production AAB is built by `npm run build:store-aab` (needs your Expo + Play accounts, see the guide). A local release APK of the same configuration was built and audited.

### 6. Pricing, economics and subscriptions
- `docs/BUSINESS_PLAN.md`: free tier, ₹499/yr and ₹79/mo hypotheses, cost table, revenue/break-even maths (net ₹424.15/yr per subscriber; 142 / 283 / 849 subscribers cover ₹5k / ₹10k / ₹30k per month), growth discipline, billing plan, compliance reminders. All figures flagged as assumptions.
- **No paywall in v1.0**, deliberately (billing cannot be properly tested without a live Play account; the review also says "launch free first or prepare a *tested* billing implementation"). `src/features/entitlements` (+2 tests) is the inert hook for Plus; group splitting stays free.
- No Firebase/analytics/crash SDK added. Use Play Console vitals.

### 7. Quality and infrastructure fixes found along the way
- **SDK 57 restored.** A stray `git checkout package.json` had silently reverted the repo to SDK 58 (it would not open in the App Store Expo Go). Re-applied and committed; `expo install --check` clean.
- Tab bar bottom padding now clears the gesture bar (verified on the release build).
- Developer panel wording adapted for the store edition; it stays reachable (More → Developer) so Play reviewers and you can see every screen and make screenshots.
- `package.json` scripts: `android:dev`, `android:store`, `build:store-aab`, `build:store-test-apk`, `audit:manifest`, `check`.
- Docs updated: README, APP_OVERVIEW, DECISIONS (items 15-22), RELEASE_CHECKLIST.

## Verification log
- `tsc --noEmit` clean; ESLint 0 errors; Jest **140/140** (13 suites).
- `expo-doctor`/`expo install --check` clean on SDK 57.
- Release APK (`APP_VARIANT=lite STORE_BUILD=1`, R8 on): built; `audit:manifest` PASSED; targetSdk 36; installed and ran on emulator (API 36).

## Not done / needs you
1. **Fill the real app name and app ID** in `src/config/app.json` before the first upload (permanent). Currently `Kharchi` / `app.kharchi.tracker` placeholders.
2. **Support email** in the policy is `bollugunwanth@gmail.com` (the address you gave for GitHub). Change if you want a different public contact.
3. **Turn on GitHub Pages** (repo Settings → Pages → `main` + `/docs`) and push these changes (commit exists locally; not pushed).
4. **Accounts and forms** only you can do: Expo, Play Developer ($25 + ID), Data safety/content rating/declarations, screenshots, 12-tester closed test if applicable (guide: `docs/PUBLISH_GUIDE.md`).
5. **Billing / Plus** intentionally not built. Do it only after real Plus features exist.
6. **Unexercised on a physical device:** reminder alarm firing, tile/widget/shortcut + translucent quick-add panel, biometric lock. Code complete; please try them on your phone via the test APK (`npm run build:store-test-apk`) before the first upload.
7. Back-tap: still impossible for apps; the guide connects the phone's own gesture to the shortcut.


---
# Follow-up: Quick Settings tile and back-tap fixes (after real-phone testing)

Feedback from testing the APK on an Android phone: everything worked except the Quick Settings tile and the back-tap gesture. Both were reproduced on an Android 16 emulator and fixed.

## What was wrong
| Symptom | Root cause | Fix |
|---|---|---|
| Tile opens the panel only after several seconds of placeholder bars | Cold start of the app's JS in a new window showed a full-screen skeleton | Boot placeholder is now a compact transparent top card, so nothing odd flashes over your screen |
| **Save in the panel spins forever / panel will not close, an invisible window stays on top** | Closing relied on a process-wide JS flag and `currentActivity`, both wrong when two activities share one JS runtime | New native `QuickAddRegistry` closes exactly the quick-add window; panel is told it is external by `?src=ext` in its URL |
| Tapping outside the panel did not close it | Close animation used a worklet callback that never fired | Replaced with a plain timer |
| **Back-tap gesture could not open the panel** | Phone gesture settings (Pixel Quick Tap, Samsung back-tap, OEM double-tap) only list apps from the launcher; there was nothing to pick except the full app | Added a **second launcher entry "Add expense"** that opens only the panel. Bind your gesture to it |
| Alias launch showed the full app instead of the panel | React Native only reports a launch URL for VIEW intents; launcher intents are MAIN | The panel activity now sets action=VIEW + panel URL when started plainly |
| Tile label unclear | Small round tile, no subtitle | Subtitle "Quick add" (Android 10+) |

## Verified on the emulator (release build, store edition)
Tile cold start, tile warm start, launcher-entry cold start, launcher-entry warm start: each opens the panel over the home screen, Save stores the expense and the window closes back to where you were (4/4; ₹300 total shown in the app afterwards). Tapping outside and the Back button close the panel. Opening the normal app is unaffected. Manifest audit still passes (4 permissions, target SDK 36).

## Back-tap: how to use it now
Install the new APK. You will see **two icons**: *Kharchi* and *Add expense*.
- **Pixel:** Settings → System → Gestures → Quick Tap → on → Open app → **Add expense**.
- **Samsung:** Good Lock → RegiStar → Back-tap action → Double tap → Open app → **Add expense**.
- **Other phones:** Settings → Gestures / Shortcuts → double-tap-back → Open app → **Add expense**. If your phone has no such setting, a free third-party app such as "Tap, Tap" can add one (not made by us).
The app itself cannot detect a back-tap (Android has no API for that); your phone's gesture opens the "Add expense" entry, which opens the panel in about a second.


---
# Follow-up 2: bill scanning added, tile and back-tap removed

## Removed (as requested)
- Quick Settings tile (service, manifest entry, icon, settings UI).
- Everything back-tap / double-tap: the accelerometer detector service and its permissions, the "Add expense" second launcher entry, the sensitivity slider, the gesture guides, the setting.
- Kept: the Quick add widget (it uses the quick panel), long-press shortcuts, the optional notification-shade action.

## Added: scan a bill, split it item by item
- **Widget "Scan bill"** (teal, 2×1) and long-press shortcut. Tap → panel drops from the top → *Take photo* / *Gallery* → "Saved ✓ · Split now / Done".
- **Waiting bills:** Home card "N bills waiting to be split", More → Saved bills, Groups tab 📷 button, "Scan bill" button inside every group.
- **On-device OCR** (Google ML Kit, bundled model) + a tested receipt parser (rows from boxes, quantity × rate, HSN, two-line items, totals priority, tax = total − items).
- **Review screen:** group + payer chips, person chips under each item (tap several to share), "Everyone", "Split the rest equally", editable names/prices, add/remove items, live "each person pays", unassigned counter, bill total field, warnings for missing items, photo viewer, "Paste bill text" and a sample bill for Expo Go.
- **Split engine** now supports discounts (negative extras). Group expense gets the photo as its receipt; your share appears in the tracker.
- DB migration 3 (`bills`), `docs/BILL_SCANNING.md` (research, design, limits), privacy policy and store listing updated.
- **Research decision ("tags"):** per-item person chips (explicit, fast, no hidden gestures) rather than drag-and-drop or voice; shared items split equally.

## Privacy / policy impact
- Still **no CAMERA, storage or INTERNET permission**: the system camera app takes the picture; the system photo picker supplies gallery photos.
- ML Kit's telemetry (Google Data Transport) components are removed from the manifest; the audit script now fails if they come back. Data safety answer unchanged (no data collected), plus a note in `docs/PLAY_POLICY.md`.
- Added a FileProvider limited to the app's private `bills/` folder.

## Verification (Android 16 emulator, release build, store edition)
- Widget placed on the home screen via the pin dialog; tapping it opened the panel over the home screen; *Gallery* → system photo picker → synthetic DMart-style bill selected → "Saved ✓" → **Split now** opened the app on the bill screen.
- On-device OCR read the store ("Avenue Supermarts"), all 5 items with exact prices, total ₹929 and derived +₹10.00 tax/charges. Assigning items and pressing Split created the group expense (You paid ₹929, share maths checked by hand) and updated the group balances.
- *Take photo* opened the phone's own camera app, the photo came back, and the screen handled an unreadable image gracefully (warning + manual entry).
- Manifest audit passes (permissions unchanged: 4 + internal), target SDK 36.
- 167+ unit tests (parser, row grouping, assignment, split with discounts, property test on random bills).

## Known limits
Photo quality matters; Latin script only; always check the total. Reminder alarms and the Full (SMS) edition were not re-tested in this round. Real-world accuracy should be checked with a printed bill on your phone.
