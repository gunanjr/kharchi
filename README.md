# Kharchi (working name)

Personal expense tracker **+** a full Splitwise-style group splitter, in one React Native (Expo SDK 58, TypeScript) app. **No backend, no accounts, no API keys.** Everything lives in a local SQLite database; sync is designed in but switched off.

Headline features: automatic capture of bank/UPI SMS (on-device) with a "What was this for?" notification you can answer inline, 3-second Quick Add (tile / widget / shortcut), unlimited groups with five split types and minimum-transfer debt simplification, insights + an offline AI assistant.

Rename the product in one place: `src/config/app.json` (then `npx expo prebuild --clean`).

## Run it: two modes

### Mode A: Expo Go (instant, on your phone)
```bash
npm install
npx expo start        # scan the QR with Expo Go
```
Works: tracker, groups/splits, charts, assistant, parser, UI, backup/CSV. Native-only features are feature-detected and degrade gracefully (the app never crashes without them): use **Settings → Developer → Simulate incoming bank SMS** (70 sample messages, same pipeline as the real receiver), or **Settings → Bank & UPI messages → Paste a copied SMS**. Developer → Demo data fills 3 months of spending and two groups.

### Mode B: Development build (all native features, Android)
Custom native code cannot run in Expo Go. Pick one:
```bash
# USB debugging; needs Android Studio (SDK) + a JDK; ANDROID_HOME set
npm run android:dev            # = npx expo run:android

# or in the cloud, no Android Studio
npx eas-cli login && npx eas-cli init
npm run build:dev-apk          # = eas build --platform android --profile development
npx expo start --dev-client
```
`eas.json` has `development`, `preview` (APK), `production` (AAB) plus `*-lite` variants.

### App variants (Google Play policy)
`APP_VARIANT=full` (default): SMS permission + receiver + notification listener + experimental detector.
`APP_VARIANT=lite`: none of those in the manifest (verified); capture via Share-to-app, paste, manual, quick add, CSV, Account Aggregator (mock). Example: `APP_VARIANT=lite npx expo prebuild --clean`. Read `docs/PLAY_POLICY.md`.

`android/` is generated (git-ignored). Native code lives in `modules/kharchi-native` (Kotlin, Expo Modules API) and is wired by `plugins/withKharchiNative.js`, so `npx expo prebuild` always reproduces it. Never hand-edit `android/`.

## Scripts
`npm start` · `npm run android:dev` · `npm run build:dev-apk` · `npm run typecheck` · `npm run lint` · `npm test`

## Architecture
```
src/app/            Expo Router screens (tabs, modals, settings, group, friend, ...)
src/db/             Db interface, expo-sqlite adapter, migrations, backup/wipe (+ node:sqlite adapter for tests)
src/domain/         money (integer minor units!), types
src/features/
  parser/           pure-TS SMS/notification parser, dedupe, merchant learning, 70 synthetic samples
  pending/          ingest pipeline (parse -> filter -> dedupe -> pending) + confirm/skip/not-mine
  native/           feature-detected bridge to the Kotlin module, queue drain, headless task, share-in
  tracker/          transactions, accounts, categories, budgets, recurring, CSV
  groups/           split engine, balances, debt simplification (exact), settle-up, activity, recurring shared
  insights/ ai/     analytics + offline rules assistant (AiProvider interface, remote stub)
  sync/ aggregator/ SyncEngine/RemoteRepository (no-op) and AccountAggregator (mock) interfaces
modules/kharchi-native/  Kotlin: SmsReceiver, notification actions, listener, QS tile, widget, double-tap
docs/               DECISIONS, PROGRESS, PLAY_POLICY, RELEASE_CHECKLIST, supabase-draft.sql
store/              Play listing copy (en/hi)
```

## Privacy
Parsing is on-device. The Kotlin receiver drops non-financial messages instantly (never stored or logged); financial ones sit in an app-private queue only until the TypeScript parser has run, then the text is deleted. The DB keeps parsed fields + a hash. "Delete all my data" is in Settings → Export & backup.

## Quick-add and the back-tap gesture
Android has **no public API** for back-tap. Order of delivery: (1) Quick Settings tile, (2) launcher shortcut + widget, (3) in-app guide to bind Pixel Quick Tap / Samsung RegiStar / OEM gestures to the shortcut, (4) experimental accelerometer detector (full only, off by default, battery warning).

## Testing
`npm test`: 138 tests incl. 70 parser samples, split/simplify property tests (balances sum to zero, transfers settle everyone, never more than greedy), repositories against real SQLite, assistant, insights, seeds.
