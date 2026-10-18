# Progress

## Morning summary

**Built & verified**
- `npx tsc --noEmit` clean · `npm run lint` 0 errors · `npm test` 138/138 pass · `npx expo export --platform android` bundles.
- Android debug build compiles (`./gradlew :app:assembleDebug`, JDK 23, SDK 36/37).
- **Verified on an Android emulator (API 36):** installed the dev build, sent real SMS via `adb emu sms send`. Bank alert → queued + notification with *Reply / Food / Not mine*; OTP and a message from a personal number were dropped. Opened the app: the TS pipeline drained the queue, Home showed the "Needs your input" card with the Food suggestion, one tap saved it and the hero total counted up to ₹450.
- `APP_VARIANT=lite` manifest verified to contain no SMS permission/receiver/listener/detector.

**What works in Expo Go today:** everything except real SMS/notification capture, tile, widget, shortcut, double-tap (feature-detected; simulate panel + paste instead).
**Needs the dev build:** SMS receiver, inline-reply notification, notification listener, Quick Settings tile, widget, launcher shortcut, share-into-app, experimental detector, headless drain.
**Stubbed:** SyncEngine (no-op), RemoteClaudeProvider, MockAccountAggregator, invite links/QR ("after backend is connected"), group-summary image share is untested on device.
**Not verified on a device** (code complete): tapping notification chips/inline reply end to end, tile/widget/shortcut/QuickAddActivity translucent panel, double-tap detector, biometric lock, headless drain after reply (Android may refuse background service start; falls back to drain-on-open), receipt photo attach (schema column exists, no picker UI yet), tags UI, hi translation is partial (core strings only).
**Known polish items:** bottom tab bar label slightly overlaps the gesture pill on gesture-nav phones (padding fix applied, not re-verified); `PLAY` policy risk for SMS is real (see docs).

**First 3 commands**
1. `cd ~/Desktop/app && npm install && npx expo start` (scan QR; then Settings → Developer → demo data)
2. `npm run android:dev` (phone via USB, USB debugging on) for the full native experience
3. `npm test` then read `docs/RELEASE_CHECKLIST.md`

## Phases
- [x] 1 scaffold · [x] 2 tracker core · [x] 3 parser + pending + simulate + learning
- [x] 4 native module (verified on emulator) · [x] 5 quick add (code; tile/panel unverified on device)
- [x] 6 groups + splitting + simplification (tests) · [x] 7 insights + assistant
- [~] 8 polish: design system, dark mode, skeletons, empty states, a11y labels done; needs on-device visual pass and Impeccable critique
- [x] 9 release prep docs/eas.json/store copy · [x] 10 QA
