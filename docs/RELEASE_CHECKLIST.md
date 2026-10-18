# Release checklist (manual steps for you)

## A. Try it on your phone today
1. **Expo Go (instant):** `npm install && npx expo start`, scan the QR. Everything except real SMS/notification capture, the tile, widget and shortcut.
2. **Dev build over USB (everything native):**
   - Install Android Studio (gives SDK + a JDK 17-21; JDK 23 also worked in testing). Set `ANDROID_HOME`.
   - Phone: Settings → About → tap Build number 7× → Developer options → USB debugging.
   - `npm run android:dev` (= `npx expo run:android`). First build takes several minutes.
3. **Dev build in the cloud (no Android Studio):** `npx eas-cli login`, `npx eas-cli init` (writes the project id into `app.config.ts` via `EAS_PROJECT_ID`), then `npm run build:dev-apk`; install the APK from the link. Run `npx expo start --dev-client`.

## B. Rename the product
Edit `src/config/app.json` (name, slug, scheme, package), then `npx expo prebuild --clean`. Check name availability on Play Store, trademark registers (IPindia / WIPO) and domain before you commit.

## C. Signing & Play Console
1. Pay the $25 one-time Play Console registration; complete identity verification.
2. `eas credentials` lets EAS generate and store the upload keystore (recommended), or supply your own. **Back it up.**
3. Production AAB: `npx eas-cli build --platform android --profile production` (full) or `--profile production-lite`.
4. Create the app in Play Console → fill Store listing (copy in `store/`), Content rating, Target audience (18+), Data safety (see `docs/PLAY_POLICY.md`), Privacy policy URL.
5. New personal accounts must run a **closed test with ≥12 testers for 14 days** before production access (check current Play rules).
6. `full` only: complete the **Permissions Declaration Form** (SMS) with the video script in PLAY_POLICY.md. If rejected, ship `lite`.
7. `npx eas-cli submit --platform android` (needs a Play service-account JSON) or upload the AAB manually.

## D. Before every release
`npx tsc --noEmit && npm run lint && npm test`, then a device pass: onboarding, add expense, simulate SMS, reply from notification (full), tile, backup/restore, dark mode, font scale 200%, TalkBack.

## E. Later: connect a backend (Supabase)
1. Create a Supabase project; run `docs/supabase-draft.sql`; review the RLS policies.
2. Put `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` and EAS secrets.
3. Implement `RemoteRepository` (push/pull by `updated_at` watermark, tombstones via `deleted_at`) and a `SyncEngine` in `src/features/sync/`, select it in `createSyncEngine()`.
4. Turn on invite links/QR (`src/app/invite/[id].tsx`) and update the Data Safety form and privacy policy **before** shipping.
5. Never sync raw SMS text; sync only confirmed transactions the user opted in.
