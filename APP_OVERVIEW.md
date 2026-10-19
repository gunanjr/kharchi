# Kharchi: complete app overview

*(Kharchi is a placeholder name. It is defined once in `src/config/app.json`.)*

> **Current production position (19 Oct 2026): the Privacy-First edition.** The Play Store build has no SMS permission, no internet permission, no account, no ads, no analytics and no third-party data SDK. Bank messages are pasted or shared in and confirmed by the user. The automatic-SMS "Full" edition still exists in the code as an optional build. See `PROGRESS_PRIVACY_FIRST.md` for exactly what changed and `docs/PLAY_POLICY.md` for the policy position.

Written for: you, the owner of the project, as a single reference for what exists, how it works, what is verified, and what is left.

---

## 1. What it is

One Android/iOS app (React Native, Expo SDK 57, TypeScript) that is:

1. A **personal expense tracker** with automatic capture of bank/UPI transactions from SMS.
2. A **Splitwise-style group splitter** with no paywall: unlimited groups, friends and expenses.
3. An **insights + offline AI assistant** over your own spending.

It runs **entirely on the phone** with a local SQLite database. There is no backend, no account, no API key. Sync is designed in but switched off.

Target users: salaried people in India (INR default, multi-currency supported). English and Hindi scaffolding.

### Three differentiators
| | |
|---|---|
| **Automatic capture** | A bank/UPI SMS becomes a notification "Spent ₹450 at Swiggy. What was this for?" with inline reply. |
| **Quick add** | Add an expense in about 3 seconds from a Quick Settings tile, widget or launcher shortcut. |
| **Assistant** | Ask "How much on food last month?", "Who do I owe?", "Predict this month". Runs offline. |

---

## 2. Status at a glance

| Area | Status |
|---|---|
| Typecheck / lint | clean / 0 errors |
| Tests | **140 passing** in 13 suites (70 SMS samples, property tests for splitting and debt simplification, repositories on real SQLite) |
| Expo Go on iPhone (SDK 57) | bundles and serves; confirmed by the server, not yet seen on your iPhone by me |
| Android release build (R8) | compiles; ran standalone on an emulator (API 36) |
| Native SMS to notification to app flow | **verified on the emulator** with real SMS sent via adb |
| Everything else native (tile, widget, shortcut, double-tap, headless save) | code complete, **not verified on a device** |
| Play Store | prepared (icons, listing, privacy policy, guide). Not submitted. SMS approval is up to Google. |

---

## 3. Features in detail

### 3.1 Personal tracker
- Transactions: expense / income / transfer; amount, category, merchant, note, date, account, payment method, tags (stored), receipt URI (stored).
- Accounts: cash, bank, UPI, card, wallet, with balances (opening balance + income, expense, transfers).
- Categories: 12 expense + 6 income built-in, plus custom ones with icon and colour.
- Budgets: overall monthly and per category, alert threshold, progress bars, projected month-end.
- Recurring transactions: weekly / monthly / yearly; catches up all missed occurrences after the app was closed.
- Search and filter; delete with **Undo**; edit; CSV export/import (also generic bank-statement CSVs); full JSON backup/restore; **Delete all my data**.
- Biometric / screen-lock app lock; haptics; dark mode; Hindi + English.
- Money is stored as **integer paise**, never floats.

### 3.2 Automatic capture (the headline feature)
Pipeline shared by every source:

```
SMS (Kotlin receiver, works when app is closed)
  -> on-device prefilter (bank sender ID + amount + debit/credit verb, no OTP/promo/failed)
  -> native queue + notification (Reply / category chip / Not mine)
App opens (or headless task)
  -> TypeScript parser -> dedupe -> pending transaction
  -> "Needs your input" card on Home -> one tap saves -> merchant learning
```

- **Parser** (`src/features/parser`): extracts amount, direction, currency, account last-4, merchant or VPA, UPI ref, timestamp, balance, instrument (UPI/card/ATM/account), bank. Rejects OTP, promo, balance-only, failed/declined, reversed, and credit-card bill payment confirmations. Tested on 70 synthetic samples across HDFC, SBI, ICICI, Axis, Kotak, PNB, BoB, Yes, IDFC, IndusInd, Federal, AU, Canara, Union, Paytm, cards, UPI.
- **Dedupe**: same UPI ref, or same amount+direction within 10 minutes with matching/unknown account. One payment seen by SMS and a GPay notification becomes one entry.
- **Merchant learning**: remembers your category per merchant; after 2 consistent confirmations offers "always categorise X as Y".
- **Other sources**: Share-to-app (select SMS, Share), paste a copied SMS, UPI/bank app notifications (opt-in, experimental builds only), a mock Account Aggregator, CSV import.
- **Sender allow-list** setting to read only chosen sender IDs.
- **Simulator** (Settings, Developer): 70 sample messages through the exact same pipeline, so Expo Go users can try everything.

### 3.3 Quick add
Android has no public back-tap API, so delivery is, in order:
1. **Quick Settings tile** "Add expense" opens a translucent top drop-down panel (amount, what-for with smart category suggestion, Save).
2. **Launcher long-press shortcut** and a **home-screen widget** to the same panel.
3. **In-app guide** and a second launcher entry "Add expense" so Pixel Quick Tap / Samsung RegiStar / OEM gestures can open the panel (the real double-tap-back experience).
4. **Experimental accelerometer detector** (foreground service, sensitivity slider, rate limit, battery warning). Test builds only.
Also an optional permanent "Add expense" notification-shade action.

### 3.4 Groups and splitting
- People are local contacts with UUIDs (ready to map to real accounts later); each has an optional UPI ID.
- Split types: **equal, exact, percentages, shares, adjustment, itemised (with proportional tax/tip)**; multiple payers; multi-currency with a stored rate.
- Splits are computed with largest-remainder rounding, so shares **always sum exactly** to the total.
- **Debt simplification**: exact minimum-transfer algorithm (bitmask DP over zero-sum subgroups, up to 16 people, greedy beyond), toggle per group; plus a pairwise "who owes whom" view.
- Settle up: record cash/UPI payment, or open the user's UPI app with a pre-filled `upi://pay` link.
- Per-friend balances across all groups, per-group balances, activity feed with edit history (before/after), group charts, local reminder notifications.
- Recurring shared expenses; share a group summary as **text or image**.
- **Your share of each group expense appears automatically in your personal tracker** (INR groups).
- Invite link/QR screens exist with an "available after backend is connected" state.

### 3.5 Insights
Category donut, daily heatmap, monthly income vs expense, top merchants, vs-last-month, spend pace and month-end forecast, **subscription detection** (steady amount, weekly/monthly/yearly rhythm), **anomaly flags** (robust median/MAD), savings tips, budget progress.

### 3.6 Offline AI assistant
- Rule-based natural-language engine over SQLite: periods ("this month", "last month", "September", "last 7 days", "yesterday", "last quarter"...), metrics (total, by category, by merchant, count, average, biggest, compare, income), plus "how much can I save", "who do I owe", "predict this month", subscriptions, budgets.
- Answers in friendly text with the numbers and a mini chart, suggested-question chips, follow-ups, and saved conversation history.
- `AiProvider` interface with `LocalRulesProvider` (default) and a `RemoteClaudeProvider` **stub** (calls a future server with aggregates only and explicit consent; never an embedded API key).

### 3.7 Design and UX
- Palette "Saffron & Ink": warm paper, ink text, terracotta primary, deep teal accent; first-class dark mode (amber on near-black).
- Fonts: **Fraunces** (headings and big money numerals) + **DM Sans** (text); tabular figures for money.
- Count-up totals, staggered list entrances, spring bottom sheets, skeleton loaders, illustrated empty states, 3-screen onboarding, haptics.
- Accessibility: 48dp targets, screen-reader labels, AA contrast, honours reduce-motion and font scaling.
- Spec: `.interface-design/system.md` and `src/theme/tokens.ts`.

---

## 4. Screens
Tabs: **Home, Activity, Groups, Insights, More**.
Other routes: Add (modal), Quick add (drop-down), Transaction detail, Budgets, Assistant, Group detail, Group expense form, Friend, Invite, Onboarding, SMS/notification **disclosure**, and Settings: Accounts, Categories, Recurring, Bank & UPI messages (capture), Quick add, Export & backup, Privacy, Developer.

---

## 5. Architecture

```
src/app/              Expo Router screens
src/components/       UI kit (Text, Card, Button, Sheet, Toast, charts, Skeleton, EmptyState...)
src/db/               Db interface; expo-sqlite adapter; migrations; backup/wipe; node:sqlite adapter for tests
src/domain/           money (integer minor units), shared types
src/features/
  parser/             SMS + notification parser, dedupe, merchant learning, 70 samples
  pending/            ingest pipeline, confirm/skip/not-mine, PendingStack UI
  native/             feature-detected bridge to Kotlin, queue drain, headless task, share-in
  tracker/            transactions, accounts, categories, budgets, recurring, CSV
  groups/             split engine, balances, simplification, repo, settle-up, UPI links, UI
  insights/ ai/       analytics and the local assistant
  sync/ aggregator/   SyncEngine / RemoteRepository (no-op), AccountAggregator (mock)
  dev/                demo-data seeders
src/i18n/ src/theme/ src/store/ src/config/
modules/kharchi-native/   Kotlin local Expo module (about 800 lines)
plugins/withKharchiNative.js   config plugin (variants, manifest, shortcut, QuickAddActivity)
docs/ store/ scripts/
```

**Key decisions** (full list in `docs/DECISIONS.md`)
- No ORM: a thin repository layer over a small `Db` interface, so the same SQL runs on expo-sqlite in the app and on Node's built-in `node:sqlite` in Jest (real-database tests, no native mocks).
- State: Zustand + a tiny `useQuery` hook that re-runs on a global data-version bump.
- Charts are hand-rolled with `react-native-svg` (works in Expo Go).
- Every table carries `id (uuid), created_at, updated_at, deleted_at, dirty` for future sync; deletes are soft.
- Only `RECEIVE_SMS` is requested (not `READ_SMS`): least privilege.

### Database (SQLite, 2 migrations)
`settings, accounts, categories, transactions, budgets, recurring, pending_transactions, merchant_rules, ai_messages, people, groups_, group_members, group_expenses, expense_payers, expense_shares, settlements, activity, comments`.

### Native module (Kotlin, Expo Modules API)
| Component | Purpose |
|---|---|
| `SmsReceiver` | Receives SMS with the app closed; joins multipart; prefilter; queue + notification |
| `Prefilter` / `Dedupe` | Cheap on-device financial check and native duplicate guard |
| `Queue` | App-private queue; raw text exists only until JS acks it |
| `Notifier` / `ActionReceiver` | "What was this for?" with inline reply, category chip, Not mine |
| `DrainTaskService` | Best-effort headless JS task to save a reply without opening the app |
| `NotificationCaptureService` | Opt-in UPI/bank app notification source (experimental builds) |
| `QuickAddTileService`, `QuickAddWidgetProvider`, `BootReceiver` | Tile, widget, restore after reboot |
| `DoubleTapService` | Experimental accelerometer detector (experimental builds) |
| `SharedInbox` | Text shared into the app |
| `KharchiNativeModule` | JS bridge; absent in Expo Go, and the app feature-detects it |

---

## 6. Privacy and security
- **Store edition:** no INTERNET permission (data cannot leave the phone), no SMS permission, no analytics/crash SDK, `allowBackup=false`, no FCM/push, no camera/contacts/location/storage permissions. Verified by `scripts/audit-manifest.mjs` on the real release APK.
- All parsing is on-device. Non-financial messages are dropped immediately: **never stored, never logged**.
- The raw message is deleted once parsed; the database keeps parsed fields and an FNV hash.
- Nothing is uploaded. Android auto-backup is disabled so financial data does not copy to Drive.
- Prominent in-app disclosure before the permission dialog; the app stays fully usable if SMS is denied.
- Optional app lock; "Delete all my data" wipes every table.
- No secrets in the repo (`.env.example` only).

---

## 7. Build editions and how to run

| Edition | Flags | Contents |
|---|---|---|
| **Privacy-First (default, Play Store)** | `APP_VARIANT=lite STORE_BUILD=1` (EAS `production`, `preview`) | No SMS, no listener, no sensors, **no INTERNET**. Paste/share a bank message, manual, quick add, CSV. Permissions: notifications (optional), biometrics (optional), vibrate, boot (re-arm reminders). Target SDK 36 |
| Full (sideload / appeal) | `APP_VARIANT=full` (EAS `production-full`) | + `RECEIVE_SMS` receiver, inline-reply notifications. Needs Google's SMS declaration to be on Play |
| Dev / power testing | `APP_VARIANT=full EXPERIMENTAL=1` (EAS `development`, `preview-full`) | + notification listener + double-tap detector |

**Expo Go** (iPhone/Android, instant): `npm install && npx expo start --go` (SDK 57 matches the App Store Expo Go). Native features degrade gracefully.
**Local Android:** `npm run android:dev` (full + experimental, USB) or `npm run android:store` (store edition, release).
**Store build:** `npm run build:store-aab`; test APK of the same thing: `npm run build:store-test-apk`.
**Prove it is clean:** `npm run audit:manifest` fails the build if any forbidden permission/component is present.
`npm run check` = typecheck + lint + tests. `android/` is generated by `npx expo prebuild`; never hand-edit it.

## 8. Testing
140 tests, including:
- 70 parser samples (valid, OTP, promo, balance, failed, reversed, card payment, personal chat).
- Split engine: every split type always sums to the total (300 randomised cases).
- Debt simplification: random group histories always sum to zero, transfers settle everyone, never worse than greedy, at most n-1.
- Repositories and the full pending pipeline against real SQLite (dedupe, learning, SMS + notification merging).
- Assistant, insights (subscriptions, anomalies, forecast), CSV, backup/restore, recurring catch-up, seed data.

---

## 9. Release and Play Store
- Production flags: real icons and splash, version 1.0.0, `allowBackup=false`, privacy-first edition, target SDK 36.
- `docs/BUSINESS_PLAN.md`: free launch, Plus plan, costs, break-even; `src/features/entitlements` is the inert hook (no paywall in v1.0).
- `docs/PUBLISH_GUIDE.md`: beginner step-by-step (names, privacy policy page, Expo/EAS, Play account, forms, SMS declaration, testing tracks, production, fallback).
- `docs/PLAY_POLICY.md`: policy summary, declaration answers, demo-video script, Data Safety answers, privacy policy text, lite fallback.
- `docs/privacy-policy.html`, `store/` listing copy (en/hi), icon 512, feature graphic.
- **Outside-the-code requirements:** Play Developer account ($25 + ID check), Expo account, GitHub Pages for the policy, screenshots, SMS demo video, and (for new personal accounts) 12 testers for 14 days.

**Honest limits**
1. SMS reading is not in the Play build. It would need Google's approval and is an optional later edition.
2. True back-tap is impossible for apps; the tile/widget/shortcut plus the phone's own gesture is the delivered solution.
3. Notification reading and the motion detector are left out of the Play build.

---

## 10. Stubbed or unverified

**Stubbed**
- Sync engine (no-op), remote AI provider, Account Aggregator (mock data), invite links/QR.

**Not verified on a real device** (code complete)
- Notification chips and inline reply end to end, tile/widget/shortcut and the translucent panel, double-tap detector, biometric lock, headless save after reply (Android may block background service starts; falls back to saving when the app opens), group-summary image share.

**Gaps**
- Receipt photo and tags have storage but no picker UI.
- Hindi covers core strings only.
- Minor: bottom tab labels may touch the gesture bar on some phones.
- The Impeccable design critique pass has not been run.
- Android release build of the store edition was verified on SDK 57 (emulator, API 36). Reminder alarms, tile/widget/shortcut and the quick-add panel are code-complete but not exercised on a device.

---

## 11. Repository
GitHub: https://github.com/gunanjr/kharchi (branch `main`). About 6,700 lines of TypeScript in `src`, about 800 lines of Kotlin, 22 test files.

Key docs: `PROGRESS_PRIVACY_FIRST.md`, `docs/BUSINESS_PLAN.md`, `README.md`, `docs/PUBLISH_GUIDE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/PLAY_POLICY.md`, `docs/RELEASE_CHECKLIST.md`, `docs/supabase-draft.sql` (future backend schema with row-level security).
