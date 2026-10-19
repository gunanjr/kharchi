# Decisions & assumptions

Recorded as I went (build ran unattended). Newest at the bottom.

1. **Expo SDK 58 / RN 0.88 / React 19.3, new architecture** (the `create-expo-app` default at build time). Routes live in `src/app/` (SDK 58 convention, see AGENTS.md).
2. **No Drizzle.** The brief allowed "Drizzle or a thin typed repository layer". I chose a thin repository layer over a small `Db` interface (`src/db/types.ts`). Reason: the same SQL runs on `expo-sqlite` in the app and on Node's built-in `node:sqlite` in Jest, so repositories, the parser pipeline, groups and the assistant are tested against *real SQLite* with no native mocks.
3. **Zustand** for settings/toasts + a tiny `useQuery` hook (`src/db/provider.tsx`) that re-runs on a global data-version bump. TanStack Query would be overkill for a local DB.
4. **Charts:** hand-rolled with `react-native-svg` (donut, bars, heatmap, line). Fewer native dependencies, works in Expo Go, fully themeable. Skia is installed but not required.
5. **Fonts:** Fraunces (display, headings, big money numbers) + DM Sans (text). Tabular figures via `fontVariant: ['tabular-nums']`.
6. **Palette "Saffron & Ink":** warm paper `#F6EEDF`, ink text, terracotta `#B8400E` primary, deep teal accent; dark mode amber `#F29A52` on `#14100B`.
7. **Config name source:** `src/config/app.json` (re-exported by `src/config/app.ts`). Expo's config loader cannot import sibling `.ts` files from `app.config.ts`, so the rename point is JSON.
8. **Money:** integer minor units everywhere; `allocate()` uses largest-remainder so split shares always sum exactly.
9. **Soft deletes + `dirty` flag** on every table for the future sync engine (`id, created_at, updated_at, deleted_at, dirty`).
10. **Parser rejects card-bill payment confirmations** ("payment received on your credit card") as `card_payment` so a card bill is not double counted as income. Not in the brief; judged correct.
11. **Raw SMS handling:** the Kotlin receiver keeps the message body in an app-private queue only until JS has run the full parser and acked it; then the body is deleted. The DB stores parsed fields + FNV hash only. Body is never logged.
12. **Lint:** React-Compiler advisory rules (`react-hooks/set-state-in-effect`, `purity`, `refs`, `immutability`, `use-memo`) are turned off; they flag intentional external-state sync patterns.
13. **Jest preset:** jest-expo on SDK 58 needs `@react-native/jest-preset` installed explicitly.
14. **`.npmrc legacy-peer-deps=true`:** Expo SDK 58 transitive peer ranges conflict under npm's strict resolver.

15. **SDK 57, not 58.** The App Store build of Expo Go supports SDK 57; the project was downgraded so it runs in Expo Go.
16. **Privacy-First edition is the production default** (`APP_VARIANT` now defaults to `lite`). Reason: removes the SMS Permissions Declaration dependency and review risk. The SMS code stays in the repo as the optional `full` edition.
17. **`STORE_BUILD=1` removes INTERNET and ACCESS_NETWORK_STATE.** The app has no network code, so "data cannot leave the phone" becomes a verifiable property, not just a promise. Enforced by `scripts/audit-manifest.mjs`.
18. **Removed `expo-notifications`** (and unused packages: image-picker, print, sms, intent-launcher, keep-awake, task-manager, system-ui, skia, async-storage, zod). Audit of the release APK showed it pulled FCM (`c2dm`), badge-launcher permissions and WAKE_LOCK; the camera permission came from image-picker. Local reminders are now a ~100-line Kotlin `AlarmManager` implementation (`Reminders.kt`, re-armed after reboot, inexact alarms so no exact-alarm permission).
19. **Notification listener + double-tap detector only with `EXPERIMENTAL=1`** (never in Play builds).
20. **No Play Billing / paywall in v1.0.** Billing cannot be properly tested without a live Play account; shipping an untested paywall is worse than shipping free. `src/features/entitlements` is the inert hook; plan in `docs/BUSINESS_PLAN.md`.
21. **Privacy policy hosted from `docs/` via GitHub Pages** (`https://gunanjr.github.io/kharchi/`), also linked in-app. Support email defaults to the address given for GitHub; change in `src/config/app.json`.
22. **Developer tools stay visible in store builds** (More → Developer): they let a Play reviewer exercise every screen without a real bank SMS, and let the owner produce screenshots.
23. **Quick Add window is closed through `QuickAddRegistry` (native), and "opened externally" is signalled by `?src=ext` in the launch URL.** Two ReactActivities share one JS runtime, so process-wide JS flags and `currentActivity` were unreliable (the panel's Save could spin forever and leave an invisible window on top). Every external entry point (tile, widget, shortcut, launcher entry, double-tap fallback) uses the same URL.
24. **Second launcher entry "Add expense"** (`activity-alias` to `QuickAddActivity`). Phone back-tap/gesture settings (Pixel Quick Tap, Samsung RegiStar, OEM double-tap) can only open apps from the launcher list, so this is what makes real back-tap work. The generated activity sets action=VIEW and the panel URL when started with a plain MAIN intent, because React Native only reports a launch URL for VIEW intents.
