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
