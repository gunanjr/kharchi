# Kharchi (working name)

Personal expense tracker **+** a full Splitwise-style group splitter, in one React Native (Expo SDK 58, TypeScript) app. **No backend, no accounts, no API keys.** Everything lives in a local SQLite database; sync is designed in but switched off.

Headline features: paste/share a bank message and confirm what it was for (the optional Full edition can read bank SMS automatically), 3-second Quick Add and **Scan bill** (home-screen widgets and shortcuts), unlimited groups with six split types and minimum-transfer debt simplification, insights + an offline AI assistant. The Play Store edition is **privacy-first: no account, no ads, no analytics, no internet permission.**

Rename the product in one place: `src/config/app.json` (then `npx expo prebuild --clean`).

**Publishing to Google Play:** follow `docs/PUBLISH_GUIDE.md`.

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

### Build editions
| Edition | How | Contents |
|---|---|---|
| **Privacy-First (default, Play Store)** | `APP_VARIANT=lite STORE_BUILD=1` (EAS profile `production`) | No SMS, no listener, no sensors, **no INTERNET permission**, target SDK 36. Paste/share bank messages, manual, quick add, CSV |
| Full (sideload / appeal) | `APP_VARIANT=full` (`production-full`) | + `RECEIVE_SMS` receiver with notification replies. Needs Google's SMS declaration for Play |
| Dev / power testing | `APP_VARIANT=full EXPERIMENTAL=1` (`development`, `preview-full`) | + notification listener |

Verify a build: `npm run audit:manifest` (fails if a forbidden permission/component is present). See `docs/PLAY_POLICY.md`.

`android/` is generated (git-ignored). Native code lives in `modules/kharchi-native` (Kotlin, Expo Modules API) and is wired by `plugins/withKharchiNative.js`, so `npx expo prebuild` always reproduces it. Never hand-edit `android/`.

## Scripts
`npm start` · `npm run android:dev` (full + experimental, USB) · `npm run android:store` (store edition, release) · `npm run build:store-aab` · `npm run build:store-test-apk` · `npm run build:dev-apk` · `npm run audit:manifest` · `npm run check` (tsc + lint + tests)

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
modules/kharchi-native/  Kotlin: SmsReceiver, notification actions, listener, widgets, bill camera + on-device OCR, reminders
docs/               DECISIONS, PROGRESS, PLAY_POLICY, RELEASE_CHECKLIST, supabase-draft.sql
store/              Play listing copy (en/hi)
```

## Privacy
The store edition has no INTERNET permission (data cannot leave the phone), no SMS permission, no analytics SDKs, and `allowBackup=false`. Parsing is on-device and the pasted text is not kept; the DB keeps parsed fields + a hash. In the optional Full edition, the Kotlin receiver drops non-financial messages instantly and financial ones sit in an app-private queue only until parsed. "Delete all my data" is in Settings → Export & backup.

## Widgets, quick add and bill scanning
- **Quick add widget** and long-press shortcut: a panel drops from the top (amount, what for, Save).
- **Scan bill widget** and shortcut: snap a bill now, split it item by item later. Reads the bill on the phone with ML Kit (offline). Design and research: `docs/BILL_SCANNING.md`.
- There is no Quick Settings tile and no back-tap/double-tap feature (removed by request; Android has no public back-tap API).

## Testing
`npm test`: 140 tests incl. 70 parser samples, split/simplify property tests (balances sum to zero, transfers settle everyone, never more than greedy), repositories against real SQLite, assistant, insights, seeds.
