# BruhMe: the one document

> Package id is **`com.bruhme.app`**. The repo, slug, scheme and Kotlin module are still named `kharchi` (section 23). Everything a person sees says **BruhMe** (capital B, capital M), as in the wordmark.

> **Latest founder decisions (20 Oct, night):** the Play account is **personal** and stays personal, so the closed test (12 testers, 14 days) comes first. Because of that, **publish with every Pro feature built and billing working**, not a free-first launch: build all of section 22, connect Google Play billing, then set `PRO_LAUNCHED = true` in `src/features/pro/flags.ts` and list every built feature on the Pro screen. Use the 14-day closed test to test Pro purchases with real testers.

Last updated 20 Oct 2026 (night). This is the single source of truth: the binding product rules, what the app is, how to run and ship it, what was decided and why, what is verified, and what is still open. If code and this file disagree, the code wins: fix this file in the same change.

Sections: 1 Product constitution (binding) · 2 Compliance audit · 3 Brand · 4 What the app is · 5 Run it · 6 Features · 7 Design · 8 Architecture · 9 Data flow, permissions, dependencies · 10 Play and privacy declarations · 11 Monetisation · 12 Robustness, feedback, testing · 13 Bill scanning · 14 Decisions · 15 Publish steps · 16 Incidents and merges · 17 Known limitations · 18 Release checklist · 19 Future versions (locked) · 20 Open items · 21 Paused and parked ideas · 22 BruhMe Pro: monetisation plan (proposed) · 23 Where "kharchi" still appears · **24 Handoff: read this first if you are a new agent**.

---

## 1. Product constitution (binding)

Founder document `LOCAL_FIRST_LAUNCH_CONSTITUTION.md` v1.0, dated 20 Oct 2026, status binding, condensed here. It applies to every person and AI agent working in this repo. **Read this section before any task.**

**Primary rule:** ship the smallest trustworthy local-first expense utility. No Crew, no Social, and no infrastructure prepared for them.

**What Version 1 is:** a standalone personal expense and budgeting utility that works for one person, with no account, offline, with records on the device, and with no personal financial data sent to our servers (we have none). It is not a social finance network, a group coordination app, a shared wallet, a payments product, an adviser, a lender, a bank-data aggregator or an investment platform.

**Allowed (V1):** personal transactions, categories, tags, search, budgets, goals, recurring items, summaries and forecasts labelled as estimates, monthly review, dark mode, accessibility, local app lock, user-requested local reminders; **local** bill-split calculation (equal, exact, percent, shares, adjustment, itemised, multiple payers, mathematical debt simplification, manual settlement records, a UPI deep link the user chooses to open, a summary shared through the OS share sheet); manual entry, pasted or shared bank text parsed deterministically on-device, keyboard dictation (no microphone permission), on-device OCR through the OS camera or picker, CSV import and export, local backup and restore; a tap-only on-device assistant using deterministic rules.

**Prohibited (V1), hard stops:** Crew or any shared space; invitations, friend graphs, profiles, feeds, posts, comments, likes; accounts, sign-in, cross-device sync; any backend, API server or cloud function; analytics, ads, attribution or tracking SDKs; SMS reading, notification listeners, accessibility services, contacts, location, background surveillance; bank linking, payment initiation, aggregation, lending, investments, custody; cloud AI, OCR or transcription of personal data; subscription billing, ad networks, affiliate or lead-generation flows; **placeholder architecture** (empty backend clients, unused API interfaces, future tables, placeholder auth, feature flags or "coming soon" screens for prohibited versions, dormant networking, unused cloud env vars).

**Agent rules:** read this first; inspect the real repo (docs may be stale); if a request conflicts, stop, name the rule, offer a local-only alternative and ask for a written amendment from the founder; do not scaffold, add dependencies or "future-proof"; smallest change, no unrelated refactors; never claim a test passed unless it ran; never invent approvals, company details or legal status; claims about privacy must match the shipped build.

**After every task, report:** (1) what changed, (2) scope check, (3) privacy and permission impact, (4) validation actually run, (5) what is not verified (real device, native, store console, legal), (6) concrete risks.

**Release privacy gate fails if:** an unapproved network call or permission exists; financial data is uploaded; Data safety disagrees with the build; the policy URL is broken or not linked in-app; a feature needs a server; a dependency's data behaviour is unknown; an absolute privacy claim is unverified. Resolve it or remove the feature.

**Name and identity:** the display name is a founder decision. Do **not** rename package ids, bundle ids, domains, slug, scheme or legal and store identities without explicit written approval of the exact name and identifiers.

**Amendment A1 (approved by the founder, 20 Oct 2026):** V1 may sell optional extras (BruhMe Pro) through **Google Play Billing** only, with no BruhMe account and no BruhMe server. Pro may write an **encrypted backup file to a cloud folder the user picks** (Vault). Store builds may include the **INTERNET** permission. Conditions set by the founder: no new risky permissions, no extra legal or acceptance burden, and security for both users and the company. A user's own records, export, backup, restore and deletion are never locked. Everything else in this section still applies (no Crew, no Social, no analytics, no ads, no SMS reading, no account).

**Founder decisions of 20 Oct:** Android and Google Play only (no iOS). Build the full product (free and every Pro feature in section 22) before the first Play release, not in versions. The SMS edition is removed. The app is English only (Hindi removed; international audience). Optional notifications for weekly recaps and due dates are approved (local notifications, no push service, no cost).

**Future versions (Crew, Social):** locked. See section 19.

---

## 2. Compliance audit against the constitution (20 Oct 2026)

| Rule | State in this repo | Action |
|---|---|---|
| No Crew or social features | None. Local split groups only (no sync, no accounts). The invite placeholder screen and the expense **comments** thread were removed today. The old `comments` table and `people.remote_user_id` column remain only because shipped migrations are never edited; nothing reads or writes them | Done |
| No placeholder architecture | Removed today: `features/sync`, `features/aggregator`, `features/ai/remote.ts` (remote AI stub), the invite screen, `docs/supabase-draft.sql`, Supabase env lines | Done |
| No billing or fake paywall | The Plus screen, prices, waitlist, comparison table, locks, entitlements module and Plus settings were **removed today**. Every feature is available to everyone. Prices are not advertised anywhere | Done |
| No network in the privacy build | Store build removes `INTERNET` and `ACCESS_NETWORK_STATE`; no app code makes network calls (grep clean: no fetch, XHR, sockets, SDK clients). Dev tooling only: Expo dev server, browser preview | Verify on a built APK |
| No analytics or ads SDK | None in `package.json`. ML Kit's Data Transport components are stripped from the manifest by the config plugin | Verify with `npm run audit:manifest` on a build |
| No SMS, listener, accessibility, contacts, location | **Resolved 20 Oct:** the SMS edition was removed (one edition only; `production-full`, `preview-full` profiles and the disclosure screens deleted). Previously: the optional **Full edition** (`APP_VARIANT=full`, EAS `production-full`) still contains an SMS receiver, a notification listener and their disclosure screens | **Needs your decision.** Recommendation: remove the Full edition (Kotlin receiver, listener, headless drain, disclosure screens, `production-full` and `development` profiles). I have not done it because it is team-built native Kotlin that cannot be compiled or tested here, and removing it is a one-way change to shared code |
| No cloud AI or OCR | OCR is ML Kit bundled Latin model (on-device). Assistant is a fixed question catalog. Voice is keyboard dictation plus a deterministic parser | OK; verify ML Kit has no network behaviour on a device |
| Parsing never invents values | Voice and message parsers return null for what they cannot read; review screen requires the user to confirm | OK, tested |
| New in the second pass (Wrapped, payback habit, trip mode, Bruh composer with Bump, merchant icons, photo icons) | All local arithmetic or share-sheet text: no network, no new permission, no account, no sync, no contacts. The UPI ID is the user's own, kept on the phone, and only appears in a message they send. Photos reuse the existing no-permission camera and picker. Bump does **not** transfer data between phones (decision 25) | OK; device test open |
| Local split only; UPI link is user-initiated | Settlement is recorded only when the user presses Record payment. Opening a UPI link never marks anything paid. The new "Bruh them" nudge only hands text to the OS share sheet | OK |
| Absolute privacy claims | Fixed today: the Home note and Privacy screen no longer say the makers "cannot see" anything or that data "physically cannot leave"; they say what is true and that exports and shares go where the user sends them | Re-check the store listing and policy page text before release |
| Honest Data safety | Section 10 now says "verify, do not copy" | You must verify against the final build |
| No sensitive logging | Only 3 `console.warn` calls, all passing an error object, none passing transaction content | OK; confirm on a device |
| Backup restore explains overwrite | Restore replaces all current data; confirm the screen says so | Check `settings/data.tsx` copy |
| Delete flow | "Delete all my data" confirms and wipes the app's tables; the Privacy screen now says exported copies are not removed | OK |
| Database not encrypted | True. The app lock is a biometric gate, not encryption. Say so; do not claim encryption | Documented in section 17 |
| Licences | Direct dependencies reviewed in section 9 (all MIT, Apache-2.0 or font OFL). ML Kit and androidx terms need a manual review | Open |
| Name | Display name is now BruhMe; identifiers unchanged (section 3) | Founder to confirm identifiers and clear the trademark |

---

## 3. Brand: BruhMe

**Audience:** wide and all ages (founder, 20 Oct). **Idea.** The app is for the moment after a shared bill when someone covered it: "bro, pay me back", "bro me your half", "just bruh me." BruhMe is the shorthand a friend group already uses. Tone: quick, casual, funny, never mean, never about shaming. It is a utility first; the voice sits on top of clear numbers.

**Identity (assets in `assets/brand/`):**
- **Mark:** a 3D orange "OK" hand with two small burst lines (`mark.png`, transparent). Used for the launcher icon, adaptive icon, splash, favicon and Play icon.
- **Wordmark:** "BruhMe" in a heavy rounded face, "Bruh" in navy, "Me" in an orange gradient (`wordmark.png`; `wordmark-sm.png` and `wordmark-sm-light.png` are the in-app sizes, the light one turns the navy letters off-white for dark mode). Shown in the Home header.
- Originals kept as `mark-original.png` and `wordmark-original.png`. Regenerate every icon with `node scripts/make-icons.mjs` (it works from `mark.png` only).
- **Colours (sampled from the wordmark):** navy `#212934`; orange `#FE8106` (light) to `#FE590C` (deep). In the app: primary orange `#FF8106`, text and hero navy, link orange `#C24700` for readable text, warm-white page `#F6F4F1`.
- **Type:** headings in Nunito ExtraBold (rounded, matches the wordmark); everything else Geist; money stays in Geist for tabular figures. Both are bundled fonts (SIL OFL), no network.
- **Voice:** short, lowercase-friendly in nudges, plain in anything about money, privacy or permissions. Never invent urgency, never imply a payment was made. Examples in the app: "Log it before you forget", "Bruh me my half", the Home footer "Your money, your phone." (three plain facts: no account, no server, you decide), and the **Bruh them** composer (section 6).
- **Store text must not use the name on graphics until it is cleared** (the Play feature graphic currently shows the mark only).

**Name decision still pending with you.** The code now shows "BruhMe" (`src/config/app.json` `appName`, the wordmark, copy). **Not changed, on purpose:** `slug`, `scheme`, `androidPackage`, `iosBundleId`, the SQLite file name, the privacy-policy URL and the Kotlin module names (all still `kharchi`). The Android package id is permanent after the first Play upload, so approve it deliberately. Before committing: search "BruhMe" in the Play Store and app stores, in the India trademark register (tmrsearch.ipindia.gov.in) and WIPO, and check the domain. "Bruh" is a common slang word, so expect crowded results; a distinctive spelling or a descriptor ("BruhMe: Split and Spend") may help.

Earlier name shortlists (rejected or superseded): Kept, Evenly, Pocketful, Sumly, Ledgerly, Inkwell, Cove, Squarely, Farthing, Quits, Cowrie, Quipu, Hisab and others. Avoid Munimji, Tallo, Tally and names starting "Split".

---

## 4. What the app is

One Android/iOS app (React Native, Expo SDK 57, TypeScript): a **personal expense tracker**, a **local bill-split calculator** for the person recording it, and **on-device insights**, with all data in a local SQLite database. No backend, no account, no analytics, no ads. Money is integer paise, never floats.

The store build is the **Privacy-First edition**: no SMS permission, no internet permission, no account. Bank messages are pasted or shared in and the user confirms them.

---

## 5. Run it

```bash
cd ~/Desktop/Fermor/kharchi
npx expo start
```
Then, in **Expo Go**, tap **Scan QR code** and scan the terminal's code. Do not use the phone camera app. The terminal must say **"Using Expo Go"**.

- Plain `npx expo start` opens Expo Go because `expo-dev-client` is under `optionalDependencies` and `.env` has `EXPO_NO_REDIRECT_PAGE=true`. Before that, Expo assumed a development build and the camera opened an old installed copy. To undo: move `expo-dev-client` back to `dependencies` and delete that `.env` line.
- If the phone cannot reach the Mac: `npm i @expo/ngrok --no-save --legacy-peer-deps && npx expo start --tunnel`.
- **Same demo for the whole team.** In a development build (Expo Go), a phone with no data loads the complete demo right after onboarding: 12 months, about 80 merchants with their icons, fixed bills and subscriptions, refunds, quarterly insurance, accounts, budgets, goals, three groups with every split type, friends and waiting bank messages. It is deterministic, so everyone sees the same app. A teammate who already has older data: **More, Developer, Reset to the latest demo** (wipes the phone's data, reloads the current demo). Store builds never load demo data. Photo features and widgets need the installed app; everything else, including merchant icons, works in Expo Go.
- **Databases from before 20 Oct**: migrations were renumbered when the team's bill scanning was merged, which made some dev phones fail with "duplicate column name: excluded". The migration runner now skips already-applied statements and a repair migration (7) recreates any missing table. Tested.
- Native features need a development build (`npm run android:dev`): bill scanning, widgets, shortcuts, reminders, share-into-app. In Expo Go they are feature-detected and degrade gracefully.
- Tests need **Node 22** (`PATH=~/.nvm/versions/node/v22.23.3/bin:$PATH npx jest`). `npm run check` = typecheck + lint + tests. Never edit `android/` or `ios/`.
- Browser preview (a testing aid): `KHARCHI_PREVIEW=1 npx expo start --web --port 8101` (needs `npm i sql.js --no-save`); shims in `preview/` and `metro.config.js`.

| Edition | Flags | Contents |
|---|---|---|
| **Privacy-First (the only supported release)** | `APP_VARIANT=lite STORE_BUILD=1` (EAS `production`) | No SMS, no listener, no INTERNET. Permissions: notifications (optional), biometrics (optional), vibrate, boot (re-arm reminders). Target SDK 36 |
| Full and Dev | `APP_VARIANT=full` (`production-full`, `development`) | Contains SMS and notification-listener code. **Conflicts with the constitution; pending your decision (section 2)** |

Scripts: `start`, `android:dev`, `android:store`, `build:store-aab`, `build:store-test-apk`, `build:dev-apk`, `audit:manifest`, `check`.

---

## 6. Features

**Tracker.** Expense, income, transfer; category, merchant, note, date, account, payment method, **tags**, **receipt** (image or PDF from the system picker), **leave out of my totals**; accounts and balances; categories (custom allowed); budgets; recurring with catch-up; search and filters; delete with Undo; CSV import and export; JSON backup and restore; Delete all my data; **frequent expenses** as one-tap chips.
- *Leave out of my totals:* from the transaction screen or a long-press in Activity. The entry stays listed as "Not counted" and is skipped by every total, budget, chart, forecast, review, health score and assistant answer; balances still include it. Kept through CSV and backup.

**Capture, no sensitive permissions.** Share a bank message to the app or paste it (review screen, dedupe, text never stored); **Say an expense** (keyboard dictation or typing, one draft per amount, never invents a missing value); one shared review step with an honest label of where the suggested category came from, Save with Undo, Discard; Quick add and Scan bill widgets and launcher shortcuts; Scan bill (section 13). No Quick Settings tile, no back-tap.

**Groups and settle-up (rebuilt 20 Oct).** Local split calculator only: six split types, multiple payers, multi-currency with a stored rate, minimum-transfer simplification, manual settlement records, activity history. No accounts, no sync, nothing shared between phones.
- *Groups tab:* a navy summary card (one number, two quiet counters; no green or red on navy), a Groups|Friends switch, group cards with member avatars and a clear owed or owe status, friend cards with a **Bruh them** button.
- *Group screen:* one scrolling page. Compact hero (who pays whom), an action row (Add expense, Scan bill, Settle up, Bruh them), expenses grouped by day with daily totals, balances as bars with a short **payback habit** line, Charts, Activity, share as text or image, confirmed delete.
- *Bruh them composer* (`features/groups/ui/BruhSheet.tsx`, `nudge.ts`): **eight tones** (Polite, Playful, Desi in Hinglish, Minimal, Dramatic, Firm, Formal for a colleague or landlord, Savage which is dry humour and never rude), 3 to 6 lines each, flipped with **left and right arrows** ("Line 2 of 5") so a good earlier line is never lost. The starting tone is suggested from how long the debt has waited. Each line carries the real context (the two biggest things owed for, days waiting). An optional **tap-to-pay link** comes from the user's own UPI ID (saved on this phone, validated; a standard `upi://pay` link the friend chooses to open). Every line is tested for clean wording with and without a name or reason.
- *Who to bruh in a group:* when several people owe you, the composer shows them as chips (name and amount) so you pick one and can switch; each gets their own context and message.
- *UPI ID, explained in the app:* it is the address people pay you on (like yourname@okaxis), found in GPay, PhonePe or Paytm under your profile. It powers the tap-to-pay link and the Bump QR; the money still arrives in your own UPI app.
- *Bump is the main action* in the composer ("Bump: make the pay card"); "Just send the text instead" stays as a small link because a plain reminder on WhatsApp is still the most common need. The card is designed to be shared: a tone headline ("The math isn't mathing 💀", "Bhai, hisaab? 🙏"), the amount large in orange, what it was for and days waiting as chips, the date, and a UPI QR with the BruhMe mark in the middle (highest error correction so the mark never blocks scanning). All copy says "any UPI app", never specific apps.
- *How Bump is meant to be used:* (1) open Bruh them, pick the person and a line; (2) tap **Bump**; a typed UPI ID is saved automatically; (3) after a 1.6 s animation the pay card appears with a HOW TO USE IT box: a friend next to you scans the QR with GPay, PhonePe or Paytm (amount pre-filled, money lands in your own UPI app); a friend far away gets the card through **Send card** (WhatsApp, Nearby Share, AirDrop) and scans it from the picture; **Message** sends the text instead. Without a UPI ID the card has no QR and asks for one.
- *Bump* (strengthened): tap Bump, the phone buzzes and pulses, then shows a **Bump card**: the BruhMe mark, the amount, what it was for and, if the user saved a UPI ID, a **scan-to-pay UPI QR** with the UPI ID under it. The friend next to you scans it with their own UPI app and the amount is filled in; or **Share** sends the card image to a phone nearby through Nearby Share or AirDrop; or **Send text**. The QR is drawn on the phone with `qrcode-generator` (MIT, no dependencies, no network). BruhMe moves no money, learns nothing about the payment and transfers no ledger data between phones.
- *Group Wrapped:* a poppy shareable image of a group's highlights (Wallet hero, Biggest bill, Busiest day, Everyone's banker, "Bruh, pay up"), worked out locally and shared only if the user taps it.
- *Payback habit* (`reliability.ts`): median days a person takes to settle, matched oldest debt first; a badge (pays fast, steady, slow) only after two real paybacks, ignoring amounts under 50; a streak of on-time paybacks; shown to the owner only, never in the shared image.
- *Trip mode* (`trip.ts`, migration 8): optional length and daily budget on a group. Shows day N of M, spent, per day, left today, pace against budget, and a **who pays next** suggestion: the person furthest behind on paying (ties go to whoever paid fewer bills, then a stable order; nobody is named when the group is within 50 of even). Arithmetic only; nothing blocks spending.

**Insights (rebuilt 20 Oct).** A range switch (1M, 3M, 6M, 1Y) drives a headline card (spent, change against the period before, income, kept, no-spend days), **Where it went** (stacked bar plus ranked categories), **Month by month** (slim bars for the last 6 or 12 months on a dotted average line; tap a month for spent, a change pill against the month before, and Income, Kept and vs-average boxes; See all entries), **This month** (spent so far, on-pace total, a pace track with last month marked, and Per day, Days left, vs last month) (spent, heading for, day N of M, last month), **Which days cost you** (tap a bar for that day), **Top places**, **Repeating charges**, **Worth a look**, **Health check** and **Ideas to save**. Everything tappable does something: a category or place opens that list of entries (`/entries`, its own stack screen so Back returns to Insights), a flagged entry opens it, repeating charges open Manage, and a health tile expands to explain itself with one real action (Open budgets, See repeating charges, or Start a savings goal where that is the honest next step). One footnote at the end: estimates from your own entries. Money health is a four-part score and not advice.
**Assistant.** Tap-only: grouped questions built from the user's own categories and months, each tested to answer, on an empty app too; no free-text box. **Monthly review** card with month browsing and share-as-image.

**Merchant icons (added 20 Oct).** About **600** merchants and services are built in with aliases (`features/brands`), India first (food, cafés, quick commerce, fashion, electronics, travel, fuel, streaming, gaming, education, payments, banks, insurance, telecom, utilities, health) and then popular global names. Typing "swigg" in the add screen offers a Swiggy chip with its icon; a saved entry whose merchant matches shows that icon in every list. **318 use the merchant's own site icon**, fetched once at build time by `scripts/fetch-brand-icons.mjs` from the official domain (apple-touch-icon, declared icon or web-app manifest icon), **only from sources of at least 128 px** so nothing is stretched, normalised to 144 px PNG (1.4 MB in total) and **checked by eye on contact sheets**; 30 that were wrong, soft, a "lite" variant or another brand's icon were rejected (listed in `scripts/brand-icons.json`). 20 use a Simple Icons glyph (CC0). The remaining ~270, whose sites would not give a sharp icon, use a brand-colour single-letter monogram. Brand names that are everyday words (Apple, Lime, Target, Max and others) only match when the whole merchant text is the name, so "Lime juice" never shows a scooter logo. The app makes no network call for any of this. Refresh: `node scripts/fetch-brand-icons.mjs` (incremental; `--all` refetches), review the sheets, then `python3 scripts/gen-brand-data.py <unpacked simple-icons>`. On an entry the user can tap the icon to **take a photo or pick one** as that merchant's own icon. Brand names and logos belong to their owners; see section 20. Not used: Flaticon (terms forbid scraping; per-icon attribution) and favicon.run (179 mostly global sites, no licence).

**Add sheet (rebuilt 20 Oct).** The amount is the hero (large, centred, grouped as you type, the ₹ hugging the number); a "what for" field shows the merchant's icon live and suggests brands as you type, or offers "Again?" chips of your frequent spends when empty; category is one row of chips; date, account, tags and photo are four small pills that open one panel at a time; the Save button is always visible and says what it will do ("Save ₹450", or "Enter an amount"). Transfers show From and To accounts directly.

**Amount plus photo.** The add screen has **Camera** and **Gallery**. Camera in the installed app opens the phone's own camera app through the Kotlin module (no CAMERA permission); in Expo Go it uses `expo-image-picker` with Expo Go's own permission. Gallery is the system photo picker (no storage permission). `expo-image-picker` is configured with every permission blocked, so it adds none to builds. A photo with just an amount is a complete entry; details can be filled later from the entry, where the receipt card also offers **Snap**. Same no-permission flow as bill scanning; stored privately; never uploaded.

**Onboarding (fourth version, 20 Oct).** Six pages, no Skip, calm fades, no other companies' brands: (0) **Meet BruhMe**: a tiny group chat on orange (*who paid for dinner? 😅* / *me. split it on BruhMe ✌️* / a BruhMe card *Dinner ₹2,400 · 4 ways · ₹600 each* / *done, paid you ₹600 ✅*); (1) Log it before you forget: + ₹180 and three entry cards with emoji icons; (2) Bruh me my half: emoji crew, the ÷4 split and the pay card; (3) See where it all went: donut with the month total, three category rows, two chat-style insights; (4) **Your money, your phone**: *On your phone: everything* (Entries, Splits, Bill photos, Backups) above a dashed *0 on BruhMe servers, we don't run any, no sign-up*; (5) Get paid faster: scan-to-pay card, *Meera paid you ₹600*, optional UPI ID. Last page: *Let's go* or *Explore with sample data first*. English only. Layout: one fixed block (panel about half the screen tall, then title and text in a fixed-height area) centred vertically, and a fixed-height footer, so the panel, title and buttons sit at exactly the same place on every page; the UPI ID field lives inside the last panel.

**Home.** Spend hero (section 7), bank messages waiting, bills waiting, **Today** (safe to spend per day, 7-day rhythm), accounts, goals, coming-up recurring, budgets, ask bar, recent, and the "Your money, your phone." footer.

**Goals.** Target, optional deadline, contributions and withdrawals, ring progress, suggested monthly set-aside. No limit.

**Settings.** Dark mode, English only, app lock, haptics, accent colour (all free), hide amounts (the eye on Home masks every amount), Help and feedback, Share the app (share sheet), Export and backup, Privacy, Developer tools (kept so reviewers and the owner can see every screen).

---

## 7. Design

Brand navy and orange on a warm-white page, mirrored in `src/theme/tokens.ts` (change both together).

| Role | Light | Dark |
|---|---|---|
| bg / surface | #F6F4F1 / #FFFFFF | #0F1319 / #181D25 |
| text / muted / subtle | #212934 / #5B6573 / #8A93A0 | #F4F5F7 / #A3ABB8 / #778090 |
| ink and hero card | #212934 | ink #F4F5F7, hero #222A36 |
| primary (orange, fills) / link text | #FF8106 / #C24700 | #FF9433 / #FF9433 |
| income / expense | #1B7F57 / #B8402F | #5FD0A0 / #EE8A78 |

- Orange is for fills (add button, bars, dots), never body text. Green means income or "you are owed"; red means owing or over budget; ordinary expenses stay navy.
- One icon language (line icons). Category, account and group emoji stay in the database and are drawn as line icons through `src/components/glyphs.ts`. Icon tiles are a neutral plate with a single-colour glyph.
- Floating tab capsule with a sliding pill; floating add button; toast pill; sheets with a strong ease-out and a plain-timer close; press scale 0.97; everything collapses under reduce-motion. Radius 10/16/24/32/pill, gutter 20, minimum target 48dp.
- **The Home spend hero is the one deliberate port from the Fermor app** (trend maths, reveal, tooltip, gesture and hero layout copied into `src/lib/trend.ts` and `src/components/hero/TrendChart.tsx` with Fermor's 37 tests). Nothing else imitates Fermor; the apps share no runtime code.
- **Sideways strips fit exactly two cards** (Accounts, Goals, Budgets; the waiting bank-message cards fit one): `useCarousel` sizes cards to the screen, snaps card by card and clips at the side gutters so no third card peeks in. Hero cards use white numbers; direction is shown by arrows and words, not green or red on navy.
- **Brand moments:** the hand mark and wordmark lead onboarding and close the More screen; the Home header shows the wordmark.
- Principles: one primary action per screen; say what happened in human words; skeleton, honest empty state and error state on every list; colour is never the only signal; new features must not need a permission, the network, analytics, payment code or an advice claim.

---

## 8. Architecture

```
src/app/            Expo Router screens
src/components/     UI kit (ui, Icon, glyphs, charts, hero/TrendChart, Wordmark, FloatingTabBar, Sheet, Toast, PrivacyNote ...)
src/db/             Db interface, expo-sqlite adapter, migrations, tolerant runner, backup/wipe (+ node:sqlite adapter for tests)
src/domain/         money (integer minor units, isValidMinor), types
src/features/       parser, pending, native, tracker (frames, pulse, frequent, tags, exclude, receipts), groups (nudge, context, wrapped, reliability, trip, overview, BruhSheet, TripSheet), brands (catalogue, matcher, BrandIcon, photo icons),
                    goals, insights (health, review), ai (local engine, catalog), voice, capture, feedback, bills, dev (seeders)
src/lib/            date, trend (ported), curve, haptics
src/theme/          tokens, ThemeProvider, motion
modules/kharchi-native/   Kotlin Expo module: widgets, bill camera and OCR, reminders (+ SMS code for the Full edition)
plugins/withKharchiNative.js   wires the native module and strips forbidden components
docs/               index.html and privacy-policy.html (the public policy page)
store/              Play listing copy and graphics
assets/brand/       logo and wordmark
```
No ORM (thin repository layer over a `Db` interface, so the same SQL runs on expo-sqlite and on Node's `node:sqlite` in Jest). Zustand plus a `useQuery` hook. Hand-rolled SVG charts. Every table carries `id, created_at, updated_at, deleted_at, dirty` and deletes are soft (a leftover of the original design; it makes no network use). **Migrations are append only and never renumbered:** 1 core, 2 groups, 3 bills (team), 4 goals, 5 feedback, 6 `transactions.excluded`, 7 repair (idempotent), 8 trip-mode columns on groups (`trip_start`, `trip_end`, `daily_budget`). All amounts are validated (`isValidMinor`: positive whole paise up to ₹10,000 crore) and dates must be 1970 to about 2100.

---

## 9. Data flow, permissions and dependencies

**Data flow inventory**

| Data | Where it lives | Where it moves | Handled by |
|---|---|---|---|
| Transactions, accounts, categories, budgets, goals, recurring, bills, groups, settlements, feedback drafts | App SQLite file (`kharchi.db`), `allowBackup=false` | Nowhere on its own | expo-sqlite |
| Settings, hide-amounts, accent | Same SQLite (settings table) | Nowhere | Zustand over SQLite |
| Pasted or shared bank text | Held in memory while parsed | Never stored (only a hash and the parsed fields); never uploaded | Pure TypeScript parser |
| Dictated text | Typed into the app by the keyboard | The keyboard vendor may process audio under its own policy; the app never records | OS keyboard |
| Bill photo | App-private folder, shrunk to at most 2400 px | Never uploaded; raw OCR text not saved, only parsed fields | OS camera or picker, ML Kit (bundled model) |
| Receipt file | App-private documents folder | Only if the user taps Share | System file chooser |
| CSV export, JSON backup | A file the user creates | Wherever the user sends it (Drive, email, other apps); copies there are outside the app's control | OS share sheet |
| Review card image, group summary, "Bruh them" text | Created on demand | Only through the OS share sheet at the user's choice | OS share sheet |
| Own UPI ID (optional), merchant photo icons | Settings table and the app-private photo folder | Only inside a settle-up message the user sends (the UPI ID); photos never | Zustand over SQLite, native photo flow |
| Feedback | Saved on the phone first | Only if the user sends the pre-filled email | User's mail app |
| UPI link | Built on demand | Opens the user's chosen payment app; the app never learns the outcome | OS intent |

**Permissions (store build, from config; verify on the built APK):** `POST_NOTIFICATIONS` (optional reminders), `USE_BIOMETRIC` (optional lock), `VIBRATE`, `RECEIVE_BOOT_COMPLETED` (re-arm user reminders). Blocked: record audio, camera, storage, overlay, contacts, location, install referrer; `INTERNET` and `ACCESS_NETWORK_STATE` removed in store builds. No SMS, listener, accessibility or foreground service in the store build. `scripts/audit-manifest.mjs` fails a build on any forbidden permission, component, telemetry string (including ML Kit's datatransport) or target SDK below 36.

**Direct dependencies and licences (read from the installed packages):** all Expo modules, React, React Native, Reanimated, Gesture Handler, Screens, Safe Area, SVG, View Shot, Worklets, Zustand, `@expo/vector-icons`, `react-native-web` and `react-dom` (browser preview only): **MIT**. Fonts `@expo-google-fonts/geist` and `/nunito`: MIT and SIL OFL 1.1 (bundled, no network). Dev only: Jest, ESLint, Prettier, Testing Library: MIT; TypeScript and `sharp` (icon script): Apache-2.0. Native (Gradle): `com.google.mlkit:text-recognition` (**Google ML Kit terms, review them**), `androidx.core` and `kotlinx-coroutines` (Apache-2.0). Unused font packages (Fraunces, DM Sans) were removed. Added 20 Oct: `qrcode-generator` (MIT, no dependencies, offline QR drawing). Build-time only: merchant site icons (bundled images of other companies' marks, see section 20) and Simple Icons glyphs (CC0). Still to do: a transitive-dependency licence scan and attribution notices before release. Brand assets (the hand mark and wordmark) were supplied by the founder: confirm you own the rights to them.

None of these makes network calls in app code. Network behaviour of ML Kit and the keyboard must still be confirmed on a device in airplane mode.

---

## 10. Play and privacy declarations

> Engineering guidance, not legal advice. Google makes the final decision.

**Do not copy "No data collected" from this file.** Complete Data safety from the *final* build: check the merged manifest, run `npm run audit:manifest`, review every SDK (ML Kit especially), and make the policy, the listing and the form agree. The expectation, to be verified, is that the developer receives no user data; on-device processing that is never sent off the device is generally not treated as collection, but Google decides.

**Also owed:** a public, stable privacy policy URL linked in-app (`docs/index.html`, hosted by GitHub Pages at `https://gunanjr.github.io/kharchi/`, which still carries the old name and must be updated for the final name and publisher), accurate listing text, content rating, target audience 18+, app access (no login), financial-features declaration (personal expense tracking and bill-split calculation; no loans, banking, payments, investments), ads No, advertising ID No, target API 36. New personal accounts need a closed test with 12 or more testers for 14 days (verify in Play Console). BruhMe is Android only (Google Play); there is no iOS release planned.

**Why paste and share do not trigger SMS policy:** the app holds no SMS permission and runs nothing in the background; the user hands over one message through the share sheet or clipboard (only when the button is tapped).

**If something is ever added, redo the review first:** billing, crash reporting, analytics, cloud anything, SMS. Each is prohibited in V1 and needs a written amendment.

---

## 11. Monetisation

**None in V1 until the founder amends section 1.** A complete proposal is in section 22, ready to build once approved. No subscriptions, no paywall, no ads, no affiliate flows, no billing SDK, no "Plus" toggle or screen, no prices shown anywhere. Earlier numbers (₹79 a month, ₹499 a year) were hypotheses, are not approved and are not implemented. Do not paywall access to a user's own records, export or deletion.

After the product shows real demand, the founder may consider **paid local-only extras** (themes, richer local reports, more export formats). Any paid digital feature needs a fresh review of Play billing rules, taxes, refunds and disclosures first.

**Measuring without tracking:** store listing views and installs, uninstalls, ratings, voluntary feedback, interviews with consenting users. No analytics SDK.

---

## 12. Robustness, feedback and testing

- **Bad-user suite** (`src/__tests__/chaos.test.ts`): hostile text, absurd amounts and dates, rapid double saves, malformed backups and CSVs, empty databases. It found and fixed seven real problems (unbounded amounts, `1e30` read as 130, impossible dates, CSV export crash on damaged tags, unsafe voice number, absurd goal targets, unstable ordering).
- **Feedback** (More, Help and feedback): Problem, Idea or Praise, optional app version and phone type (never entries), saved on the phone first, then the user's mail app opens pre-filled; a warm acknowledgement; "Your messages" with Sent or Saved and resend; quick answers. The error screen has **Send report** (error name and message only). With no backend the owner sees feedback only when the user sends the email.
- Click-through of every control on 23 screens and the whole Home: 0 crashes (browser preview).

- **Backup restore hardened (20 Oct):** before any data is touched, a picked file is checked: size limit (30 MB), real JSON, BruhMe's own format (`bruhme`, or `kharchi` for older files), not from a newer app version, a checksum that catches files cut short or edited, valid table names and shapes. The user then sees what is inside (date, entries, groups, people) and confirms. The restore is all or nothing inside one transaction; unknown columns from older or newer layouts are dropped, values must be plain text or numbers, broken rows (bad amount, impossible date, objects) are skipped and counted, and if nothing is restorable the current data is kept. Tested with junk text, a PDF, half a file, an edited file, a foreign app's file, a future version, SQL-looking names, an old pre-rename file and a fresh-install round trip (`src/db/__tests__/backup.test.ts`).
- **Speed guard** (`src/__tests__/perf.test.ts`): 40,000 entries over three years. It found Insights taking 5.6 s (a quadratic anomaly check); now 0.2 s. Home pulse and lists take a few ms, the Home hero over one year 0.6 s; each has a limit. Measured on a laptop with real SQLite, so a phone will be slower; not measured on a device.

**Last full run (20 Oct 2026, second pass):** `tsc` clean, lint 0 errors, **330 Jest tests in 37 suites pass**, Android bundle builds. **Verified:** logic and data on real SQLite, screens in a browser preview in light and dark, config review of permissions. **Not verified (cannot be from here):** the Kotlin native code compiling after the merge, bill scanning, widgets, shortcuts, biometrics, reminders, the receipt picker and the new hero on a real phone, `npm run audit:manifest` on a built APK, the new icons and wordmark on a device.

---

## 13. Bill scanning (team feature)

Snap a bill from the Scan bill widget, shortcut or in-app; the app reads items on the phone; later tap who had what. Tax, service charge, round-off and discounts are shared in proportion. The result is a normal itemised split recorded locally; your share lands in your tracker and the photo is attached.
- **OCR:** Google ML Kit text recognition, bundled Latin model (works without internet or Play Services download). Rejected: unbundled model, cloud OCR or AI vision (uploads financial photos), Tesseract.
- **Photo:** the phone's own camera app through a private FileProvider (no CAMERA permission); gallery via the system photo picker; stored privately.
- **Parsing (TypeScript, tested):** rebuild rows from boxes; parse from the right; skip totals and tax lines; find the payable total; **tax, discount and round-off = total minus sum of items** (never the printed GST lines); repair OCR slips; warn the user to check.
- **Assigning:** person chips per item plus Everyone, equal sharing, live preview, Save disabled until every item has an owner, editable names and prices. Integer paise with largest-remainder rounding (property-tested on 200 random bills).
- **Privacy:** only parsed fields are stored; raw OCR text never saved; ML Kit's log-uploader components removed from the manifest.
- **Limits:** quality depends on the photo; Latin script only; unusual layouts need edits; needs the installed app (Expo Go uses the sample bill); verified on an emulator with a synthetic receipt, so real accuracy is unproven.

---

## 14. Decisions log

1. Expo SDK 57 (the App Store Expo Go supports 57). 2. No ORM; thin repository over `Db`, tested on real SQLite. 3. Zustand plus `useQuery`. 4. Hand-rolled SVG charts. 5. Integer minor units; largest-remainder allocation. 6. Soft deletes and a `dirty` flag on every table (legacy; unused for sync). 7. Card-bill confirmations are rejected so a bill payment is not counted as income. 8. Raw message text is held only until parsed; only fields and a hash are stored; bodies are never logged. 9. Lint: React Compiler advisory rules off; `.npmrc legacy-peer-deps=true`. 10. Privacy-First is the production default; `STORE_BUILD=1` removes INTERNET; `expo-notifications` and other packages that pulled push and badge permissions were removed; reminders are a small Kotlin AlarmManager implementation. 11. The Quick add window is closed through a native registry and "opened externally" is signalled by `?src=ext`. 12. The Quick Settings tile, the second launcher entry and all back-tap features were removed (owner request). 13. Bill scanning uses on-device ML Kit; tax and discount are total minus items. 14. Developer tools stay visible in store builds so reviewers can see every screen.
15. Brand (20 Oct): navy and orange from the wordmark, Nunito headings with Geist body, the hand mark as the app icon, the wordmark in the Home header; display name BruhMe with identifiers unchanged pending approval.
16. The Home spend hero is a port of Fermor's hero; nothing else imitates Fermor.
17. Leave-out-of-totals via `transactions.excluded`; balances still include it. 18. Amounts and dates are validated everywhere. 19. Voice uses keyboard dictation and a deterministic parser; no microphone permission.
20. Feedback leaves the phone only through the user's own mail app, after being saved locally.
21. **Constitution (20 Oct):** removed Plus, pricing, waitlist and gating; removed the comments thread, the invite placeholder, the sync, aggregator and remote-AI stubs and the Supabase draft; softened absolute privacy claims.
22. Migration runner tolerates "already exists" and a repair migration 7 heals databases built under the old numbering.
23. `expo-dev-client` is optional and `.env` skips the chooser page so `npx expo start` opens in Expo Go.
24. The "Bruh them" nudge is share-sheet text only: no payment, no status, no network.
25. **Bump never transfers app data.** A phone-to-phone transfer of a group or balance would be device sync and an invitation, both prohibited; NFC does not work between iPhones and Bluetooth discovery needs new permissions. Bump instead shows a scan-to-pay UPI QR (the friend's own UPI app does the rest, the same as the allowed `upi://pay` link) and shares a card image or text through the share sheet. A camera-QR import of a group is **not built** and needs a written amendment.
30. Settings rows carry a plain one-line explanation (for example Haptics: small buzzes when you tap, save or settle).
31. `qrcode-generator` (MIT, zero dependencies) is the only new runtime package in this pass; it draws QR codes offline.
32. Teams share one deterministic demo; Developer has Reset to the latest demo.
34. Default look is light with a white page and brand orange; dark mode and accents stay in More.
35. Sideways strips scroll freely (no snapping), still sized so exactly two cards fit.
36. Every merchant anywhere (lists, Top places, Repeating charges, Worth a look, Coming up, Recurring) goes through one `MerchantTile`: your photo, else the built-in icon, else a letter.
37. Insights Repeating charges are charges spotted in your history; tapping one opens its payments, not the Recurring settings (those are reminders you set up yourself).
33. The assistant's question panel has a fixed height and scrolls, so switching Spent, Where, Ahead or People never moves the layout.
26. Payback habit and trip mode are pure local arithmetic, cautious by design (two paybacks minimum, small amounts ignored, owner-only, a suggestion not a rule).
27. Insights drill-downs use a stack screen (`/entries`), not the Activity tab, so Back returns to where the user was.
28. Merchant icons ship with the app (no network). Pictures are each merchant's own public site icon, fetched once at build time from its official domain (not from icon marketplaces); anything unavailable is a glyph or monogram.
29. Speed: anomaly detection bounded to the 200 prior entries per category; the 40,000-entry guard is part of the test suite.

---

## 15. Publish to Google Play

Commands go in the Terminal in the project folder. **Not ready to submit until the checklist in section 18 is complete.**

**You need:** a Google account; a Play Developer account (US$25 once, ID check 1 to 3 days); an Expo account; the GitHub repo (hosts the policy page); a support email (now `bollugunwanth@gmail.com`); an Android phone; and, for a personal account created after 13 Nov 2023, 12 testers for 14 days. No website, backend or SMS declaration.

**A. Name and app ID (permanent once uploaded).** Decide the name (section 3), clear it, then edit `src/config/app.json`: `appName`, `androidPackage` and `iosBundleId` (identical, e.g. `com.yourname.bruhme`), `supportEmail`, `privacyPolicyUrl`; run `npx expo prebuild --clean`.
**B. Privacy page.** Update `docs/index.html` and `docs/privacy-policy.html` for the final name and publisher; repo Settings, Pages, branch `main`, folder `/docs`.
**C. Expo.** `npx eas-cli login`, `npx eas-cli init`, set `EAS_PROJECT_ID` in `.env` and as an EAS env var.
**D. Build.** `npm run build:store-aab` (accept a new keystore and back it up with `npx eas-cli credentials`). Test the same permissions with `npm run build:store-test-apk`. Run `npm run audit:manifest` on a built APK.
**E. Play Console.** Register, verify identity.
**F. Listing.** Free app; paste `store/listing-en.md` (update the name and tone first); upload the 512 icon and feature graphic from `store/`; phone screenshots (use More, Developer, Load complete demo, then Delete all my data).
**G. App content.** Policy URL, ads No, app access, content rating, target audience 18+, Data safety **from the verified build**, financial features, advertising ID No.
**H. Upload.** Internal test, then closed test (12 testers, 14 days if required), then production.
**I. Updates.** Raise `version` in `app.config.ts`, rebuild, upload.
**Common problems:** package name taken (change it and prebuild); EAS build failure (usually `EAS_PROJECT_ID`); policy link 404 (Pages source); reviewer needs login (App access: none needed; the demo tools show every screen); lost keystore (`npx eas-cli credentials`).

---

## 16. Incidents and merges

- **Demo data deleted on the owner's real Fermor account, then restored** (19 Oct). I ran `seed:demo -- --remove` for the signed-in user; the account already had those rows. I re-seeded the same data and compared all 52 accounts read-only: every one, that one included, has the same 8 accounts, 34 assets, 19 holdings. No seed or remove command will be run on real accounts again without asking. Fermor's `.env` was restored to its original values; the Fermor app is on `main` and clean; the backend is on `feature/demo-seed-data` (its trend endpoint is missing on backend `main`). The old dev token there has expired; make a new one with `npm run dev:token` when running Fermor locally.
- **Migration renumbering broke one dev phone** (20 Oct): fixed by the tolerant runner and migration 7 (section 5).
- **Team merge (19 Oct):** commits `f97f76b` and `c2c2457` (bill scanning, Scan bill widget, tile and back-tap removal) were merged under a full backup; eight conflicts resolved without losing either side; pushed as `90a8cc1`, then `761e89a` and `4c22f33` (documentation). Their emoji in the new screens were replaced with line icons.
- Packages added only for browser testing (`react-native-web`, `react-dom`, `@expo/metro-runtime`) can be removed.

---

## 17. Known limitations

The database is **not encrypted**; the app lock is a biometric gate, not encryption; app-switcher snapshots are not blocked. Exported files and shared messages leave the app's control. Voice depends on the keyboard. OCR accuracy on real bills is unproven. The app is English only. The Kotlin native code was not compiled after the merge. **Nothing from 20 Oct was tested on a physical device** (all checks ran in Jest and the browser preview): the Bump card capture and share, photo capture in Expo Go and in a build, QR scanning by real UPI apps, merchant icons on Android, the new Add sheet with a real keyboard. The SMS edition is removed from config, build profiles and screens; its Kotlin classes (`SmsReceiver.kt`, `NotificationCaptureService.kt`) remain as unused code until a device build can confirm deleting them compiles. `docs/index.html` says BruhMe but its wording has not been reviewed against the final build, and the store listing is still a draft. Speed numbers come from a laptop, not a phone.

---

## 18. Release checklist (state as of 20 Oct 2026)

**Scope:** core use works for one person without an account (done) · no Crew (done) · no Social (done) · no speculative backend or auth scaffolding (done) · no payment custody or bank linking (done) · local split clearly separate from payment (done).
**Privacy and data:** core functions offline (to verify in airplane mode) · no unapproved network calls or telemetry (app code clean; verify SDKs on a build) · no analytics, ads or tracking SDK (clean) · no SMS or listener permission in the store build (clean; Full edition pending) · final manifest verified (open) · storage, export, backup, restore and deletion tested (logic tested; device test open) · no sensitive production logs (clean in code) · every relevant dependency reviewed (direct ones done; ML Kit and transitive open) · privacy policy accurate (needs the name, publisher and wording update) · Data safety matches the build (open).
**Quality:** tests pass (done) · typecheck and lint (done) · production build (bundle built; native build open) · native modules compile and device-tested (open) · migrations and backup tested (done in tests) · calculations have known-value tests (done) · parser and OCR output reviewable before saving (done) · no known critical crash or data-loss issue (none known).
**Store and business:** name and package confirmed (open, yours) · publisher details accurate (open, yours) · policy URL public (open, yours) · forms complete (open, yours) · testing requirement met (open, yours) · licences and notices addressed (open) · listing claims accurate (needs a pass) · no subscription, ads or affiliate flow (done).
**Final approval:** founder reviews the release candidate and approves the actual build (open).

---

## 19. Future versions: locked

Crew and Social engineering stay locked until **all** of these hold: 1,000 monthly active users for three months measured without secretly transmitting financial data; ₹50,000 monthly net revenue for three months or 500 paying customers with repeatable demand (internal gates, not benchmarks); retention evidenced through privacy-respecting research; concrete user demand; budget and time for backend, security, support, incident response and compliance; and a separate written scope document from the founder. Meeting the gates only permits discovery, not implementation. Until then: improve the local utility, fix bugs, accessibility, performance, parsing, backup, privacy and onboarding; interview consenting users; review store metrics; write strategy memos if asked.

---

## 20. Open items

**Decided on 20 Oct:** amendment A1 approved; Android only; build everything before release; Vault uses a recovery code (no passphrase, no unencrypted Vault); SMS edition removed; English only; optional local notifications approved; the founder's team already has a verified Google Play Console developer account.

**Still open (founder):**
1. ~~Package id~~ **Decided 20 Oct: `com.bruhme.app`** (set in `src/config/app.json`; permanent after the first Play upload).
2. ~~Support email~~ **Decided 20 Oct: bollugunwanth@gmail.com for support and the privacy policy.** Revenue goes to whoever owns the Play Console payments profile (the email gives no revenue or control).
3. **Play account type:** if it is a personal account created after Nov 2023, Google requires a closed test with at least 12 testers for 14 days before production; an organisation account does not.
4. ~~Logo rights~~ **Confirmed 20 Oct by the founder:** the hand mark and wordmark are the team's own and final; no changes.
5. **Merchant logos inside the app:** keep (common in finance apps, small risk) or switch to letter tiles (zero risk, one line). Never in onboarding, store screenshots or marketing either way.
6. **Prices, referral offer and free/Pro split:** as in section 22 unless changed.
7. **Git:** permission to commit, and whether to push to `main`.
3a. **Merchant icons are other companies' marks.** Each is the merchant's own public site icon shown beside its name inside the user's own entries. No licence was granted; it is a legal judgement. Zero-risk switch: make `BrandIcon` ignore `img` and `path` so every tile is a monogram. Never use them in onboarding, store graphics or marketing.
3b. **Bump:** shows a scan-to-pay UPI QR and shares a card. A real group transfer between phones still needs a written amendment (decision 25, section 21).

**Only you can do:** Play and Expo accounts, policy page hosting, forms, screenshots, the 12-tester test, and real-phone tests of bill scanning, widgets, shortcuts, biometrics, reminders, the receipt picker and the new brand.
**Still to do in the repo:** update `docs/index.html` and `store/listing-*.md` for the final name and wording; a transitive licence scan and notices (new direct packages: `qrcode-generator` MIT, `expo-image-picker` MIT); a device run of `npm run audit:manifest` (check `expo-image-picker` added no permission) ; delete the unused SMS Kotlin classes once a device build is available.
**Documentation:** this is the only project document. `README.md`, `AGENTS.md` (which now points here), `store/listing-*.md` and `docs/index.html` stay because tools and Play need them.


---

## 21. Paused and parked ideas

Everything below was asked for or proposed and **deliberately not built**, because it breaks the constitution or would add permissions, a server, payments or legal review. Each row says what it would feel like, what stops it, and what it would take, so you can decide which to unpause. "Amendment" means a written change to section 1 by the founder.

| Idea | What it would feel like | Why it is paused | What it would take | Effort and risk |
|---|---|---|---|---|
| **Bump, the full version** (hold phones together and the group or balance appears on the friend's phone) | The signature Gen Z moment: tap, buzz, both phones in the same group | Moving ledger data between phones is cross-device sync and an invitation, both prohibited | Amendment allowing one-time, user-started, offline transfer. Reading a QR inside BruhMe needs a live camera, which means adding the CAMERA permission (now blocked) and updating Data safety. NFC or Bluetooth needs nearby-device or Bluetooth permissions (location on some Android versions); iPhones cannot do NFC phone to phone | Medium build, medium review risk. Shipped today: Bump card with a scan-to-pay UPI QR, share to a phone nearby |
| **Floating voice recorder over other apps** (speak a payment while in another app) | Zero-friction logging anywhere | Needs microphone, draw-over-apps and a microphone foreground service; all prohibited, and a heavy Play review | Amendment plus RECORD_AUDIO, SYSTEM_ALERT_WINDOW, a foreground service declaration and video proof for Play; a privacy policy rewrite | High. Keyboard dictation already covers most of it with no permission |
| **Feedback that lands straight in your inbox, or voice notes to the team** | One tap, no mail app | Needs a server to receive it; voice needs the microphone | Amendment for a minimal feedback endpoint (and INTERNET back in store builds), Data safety "collected: app feedback"; or a mic permission for voice | Medium. Today: saved on the phone, sent through the user's mail app, keyboard mic for speaking |
| **Shared groups that stay in sync** (Splitwise-style, everyone edits) | Real multi-person app, network effects | Crew and Social are locked (section 19 gates) | Accounts, backend, sync, security, support, a new privacy policy and Data safety, moderation | Very high. Locked until the gates are met |
| **Comments, reactions and a feed on expenses** | Social banter inside a group | Social features prohibited | Same as shared groups | High. Removed on 20 Oct |
| **Collect requests or paying inside the app** (send a UPI request, mark paid automatically) | Settle in one tap without leaving | Payment initiation is prohibited; it also brings payment-aggregator rules | Amendment plus a licensed payments partner, KYC, RBI and NPCI rules | Very high. Today a `upi://pay` link in the message opens the friend's own UPI app |
| **Reading bank SMS automatically** (the Full edition) | Expenses appear by themselves | SMS reading and notification listeners are prohibited; Play's SMS policy | Keep it out of Play entirely, or a Play SMS declaration and a narrow use case Google rarely approves for trackers | High. Still in code; recommended for deletion (section 20) |
| **Bank linking or Account Aggregator** | Auto-sync with banks | Bank linking and aggregation prohibited | An AA licence partner, consent flows, a server, security audits | Very high |
| **Ask anything (free-text AI chat)** | Chat with your money | Cloud AI on personal data prohibited; on-device models are large | An on-device model (app size, phone limits) or an amendment for cloud AI with consent | High. Today: tap-only questions answered on the phone |
| **Plus subscription or paywall** | Revenue | Billing prohibited in V1 | Play Billing, tax, refunds and disclosures review; only for local-only extras | Medium. Removed on 20 Oct |
| **Crash reports and usage analytics** | Know what breaks and what people use | Analytics and tracking SDKs prohibited | Amendment, a consented crash reporter, Data safety update | Low to medium. Today: the error screen's Send report goes through mail |
| **Pulling icons from Flaticon and similar marketplaces** | More icons | Their terms forbid scraping and each free icon needs attribution | A paid licence or a hand-picked set with attribution | Low. Merchants' own site icons are used instead |
| **Merchant brand logos at all** | Premium, instant recognition | Not a constitution rule but other companies' trademarks | Your legal call (section 20, 3a); switching to monograms is one line | Low |

**Shipped instead, inside the rules:** Bump card with scan-to-pay UPI QR, the Bruh composer with a UPI link, Group Wrapped, payback habit, trip mode, keyboard dictation, mail-based feedback, the tap-only assistant, bundled merchant icons, photo icons through the existing no-permission camera flow.


---

## 22. BruhMe Pro: monetisation plan (proposed, not built)

> **Status:** plan only; nothing is in the code. Section 1 prohibits billing, prices and paywalls in V1. To build this, the founder adds a written amendment to section 1, for example: *"V1 may sell optional extras through Google Play Billing with no BruhMe account and no BruhMe server. Pro may write an encrypted backup file to a cloud folder the user picks. A user's own records, export, backup, restore and deletion are never locked."*

### 22.1 Accounts, reinstalling and changing phones (no BruhMe login)
- **No sign-up, no password, no BruhMe server.** A purchase belongs to the user's Google Play account. Reinstall, then **Restore purchases** (also checked quietly on launch), and Pro returns on any phone with the same store account.
- **Android only (founder decision, 20 Oct):** BruhMe launches on Google Play only. No App Store build, no Apple In-App Purchase, no cross-store questions. The Vault file format stays platform-neutral so an iPhone version could restore it later if that ever changes.

### 22.1a BruhMe Vault in detail
- **What "the phone's own picker" means:** Android shows its system *Choose a folder* screen. The user sees Google Drive, OneDrive, Dropbox, Downloads or an SD card, whichever apps are on their phone, and picks or creates a folder such as *BruhMe Backups*. Full control stays with the user: BruhMe can write only to that one folder, the user can change it any time in More, and revoking it in Android settings stops it.
- **Linking:** there is no Google sign-in inside BruhMe, no Google Drive API, no OAuth consent screen and no Google verification. The Drive app on the phone does the syncing, exactly as if the user saved a file there. If the user has no cloud app, they can pick a local folder and copy the file themselves.
- **Permissions:** none new. The folder grant is a per-folder permission the user gives through the system screen, not a storage permission.
- **When it saves:** when the app opens or after changes, at most a few times a day (no background service). It keeps the last 7 versions and deletes older ones in that folder.
- **Encryption and the passphrase:** the file is encrypted (AES-256-GCM, key from the passphrase with a slow key-derivation function) so anyone who gets into the user's Drive or finds the file sees nothing. GCM also detects a cut-short or tampered file before anything is restored.
- **Decision (20 Oct): no passphrase to remember.** Vault is always encrypted with a random key kept in the phone's secure keystore. At setup BruhMe shows a **Recovery code** and asks the user to save it (share to notes, a password manager, email to self, or screenshot). The code can be viewed again any time in More while the user still has the phone. A new phone needs the code. There is no unencrypted option for Vault (the free manual backup still exists for people who want a plain file).
- **Earlier idea, superseded:** at setup BruhMe shows a **recovery code** (24 characters) to save in a password manager, screenshot or print; the passphrase *or* the code opens the file. On the phone that made it, the passphrase is kept in the phone's secure keystore so the user is never asked there. Users who prefer convenience can choose **no passphrase** (clearly warned). Without passphrase, code or the old phone, nobody can open the file, including us.
- **Survives uninstalling:** yes. The file lives in the user's Drive or folder, not inside the app, so deleting BruhMe does not delete it. New phone: install, *Restore from Vault* on the welcome screen, pick the file, enter the passphrase or recovery code, see what is inside, confirm.
- **Bad files:** decryption must succeed and pass the GCM check, then the same checks as the hardened restore in section 12 apply (format, version, checksum, shapes, row validation, all or nothing).
- **Dependency:** one audited, MIT-licensed crypto library (`@noble/ciphers` and `@noble/hashes`), pure JavaScript, no network.

### 22.2 What makes Pro worth paying for
Free stays a complete tracker and splitter. Pro is built to be the place people manage *all* their money life, every week.

| Pro feature | What the user gets |
|---|---|
| **Vault** | Automatic encrypted backup to their own cloud, recovery code, one-tap restore on a new phone (22.1a) |
| **Subscription radar** | Every repeating charge found, renewal reminders, yearly cost, price-rise alerts ("Spotify went up ₹20"), a cancel checklist |
| **Due dates** | Credit card, rent, EMI, electricity due dates with reminders and a month calendar |
| **Spaces (separate books, see below)** | Personal, Side hustle, Home, Trip, Event: each with its own money, reports and share cards |
| **Work reimbursements** | Tag work spends with the bill photo, export a PDF or Excel claim |
| **Warranty and receipt vault** | Unlimited receipts with search, warranty end reminders |
| **Tax-time totals** | Yearly totals by tag (insurance, investments, rent, donations), exportable for a CA (totals only, not advice) |
| **Wrapped, every rhythm (see below)** | Weekly recap, Monthly and Yearly Wrapped, Milestone cards |
| **Persona and identity (see below)** | Money persona, badges, streaks, profile card, themes, card styles |
| **Pro Insights** | 6M and 1Y, custom ranges, month vs month, spending calendar, category trends, budget autopilot, "where you could save" in rupees |
| **Bump Pro** | All 8 tones, saved lines, card themes, your photo or sticker on the card, trip Wrapped |
| **Private mode** | Hide chosen entries or a whole Space behind the app lock; stealth home widget |
| **Widgets and icons** | Extra home-screen widgets (owed to you, budget left, streak), app icon variants |

**Wrapped, every rhythm (not over-engineered: one card engine, different time windows).**
- **Weekly recap (free, the habit loop):** every Monday a short card: spent this week vs last, top place, no-spend days, who still owes you. Optional local notification.
- **Monthly Wrapped (Pro):** 5 to 7 story cards: biggest day, top places, category of the month, money kept, your persona, settle-ups.
- **Yearly Wrapped (Pro):** the big December story, shareable as a set.
- **Milestones (Pro, appear when earned):** first 100 entries, 30-day logging streak, settled 10 debts, a no-spend weekend, three months under budget, ₹10,000 less than last month, one year with BruhMe. Each is a one-tap share card.

**Spaces: separate books with depth (Pro).** A switcher at the top of Home; each Space has its own colour, icon, budget, reports and share card.
- **Side hustle:** money in and out per client or project tag, monthly profit and margin, a "set aside for tax" estimate as a percentage the user chooses, unpaid-invoice list (reminders only; nothing is sent), a monthly card: "Side hustle, October: ₹42k earned, 78% margin".
- **Home (couples and flatmates on one phone):** shared home costs with a fair-split ratio (50/50 or by income, e.g. 60/40), "who should top up" each month, shared goals (new sofa, rent deposit), and a monthly Home card to send to your partner. Each person keeps their own phone; the card is how it is shared.
- **Trip and Event:** budget per category or vendor (venue, decor, food), countdown, day-by-day spend, Wrapped at the end. Weddings and festivals included.
- **Personal:** everything today, plus moving entries between Spaces in one tap.

**Persona and identity (Pro).**
- **Money persona:** worked out each month from the user's own patterns by fixed rules (no AI), e.g. *Chai Philosopher*, *Weekend Warrior*, *Quick-commerce Royalty*, *Silent Saver*, *Group Banker*, with a one-line why. Changes as habits change; shareable.
- **Badges and streaks:** logging streak, payback streak, budget streaks, collectible badges for milestones.
- **Profile card:** persona, streaks, badges and your Bruh score (how fast *you* pay friends back), as a share card. Kept on the phone.
- **Roast or toast:** a playful monthly card in the user's chosen tone ("You spent ₹4,280 on Blinkit at 11 pm. Midnight snacker detected."), built from rules, always kind about money.
- **Make it yours:** app themes (including seasonal ones like Diwali and match season), card styles, sticker packs for Bump cards, app icon variants.

**Free forever:** unlimited entries, accounts, categories, groups and splits, settle-up, the Bruh composer with 4 tones, the Bump card with UPI QR, merchant icons, weekly recap, This month and Where it went, 3 budgets and 2 goals, manual backup (hardened), CSV export, restore and delete.

**Pricing (revised 20 Oct, after Google Play's 15% fee):** Pro Monthly **₹129** · Pro Yearly **₹999** (shown as about ₹83 a month, 7-day free trial, pre-selected) · Lifetime **₹2,999**. No launch-only prices or time-limited deals to manage.

**How Pro is shown:** real numbers blurred with a small orange Pro pill and one line of value; locked themes, tones and Spaces visible with a tiny lock and a one-time preview; a Pro card at the top of More; the Pro sheet with plans, what you get, trial terms, Restore purchases and plain renewal and cancel text. No launch pop-ups, no countdowns, no fake discounts.

### 22.2a Keeping Pro paid (anti-bypass design)
Goal: casual tricks never unlock Pro, honest users are never punished, and a user's own data is never held hostage (constitution).
1. **One source of truth:** Pro comes only from Google Play Billing. It is never read from settings, the database, a backup file, a deep link or a hidden developer switch. A single `useEntitlement()` hook gates everything; Developer tools in store builds cannot toggle Pro.
2. **Verify the purchase on the phone:** check the purchase record's signature with the app's Play public key, plus package name, product id, purchase state and acknowledgement. Store the verified result in the phone's secure keystore (`expo-secure-store`), never in SQLite.
3. **Re-check every launch:** query Play for current purchases when online; refunds, chargebacks and lapsed subscriptions revoke Pro. Offline grace of 7 days, measured against the latest time ever seen (so winding the phone clock back does not extend it); then Pro pauses until Play confirms again.
4. **Backups never carry Pro:** backup and Vault files contain no entitlement or keys. Restoring a Pro user's file into a free install gives the data, not the features.
5. **Your data stays yours, features stay Pro:** raw entries, CSV export, manual backup, restore and delete are always free (that is the user's own data, not a loophole). Pro-only *outputs* (PDF statements, reimbursement claims, tax totals, Wrapped story sets, 6M and 1Y analysis, Vault automation) are generated only when entitled. Data created in Pro (for example extra Spaces) stays readable after Pro ends; creating or editing it needs Pro.
6. **Gate in the logic, not only the screen:** Pro computations and exports check the entitlement where they run, so a hidden button or a patched screen alone does not produce the output.
7. **App hardening:** release builds use Hermes bytecode and R8 minification; enable Google Play's automatic integrity protection in Play Console (blocks tampered copies and sideloaded repacks without a BruhMe server).
8. **Honest limit:** without a server, nobody can fully stop a determined pirate on a rooted phone with a patched copy. The design makes that rare and inconvenient; it does not punish real customers with constant checks.
9. **Tests:** restore never unlocks Pro; tampered or unsigned purchase data is rejected; a lapsed or refunded purchase relocks; clock rollback does not extend grace; every gate has a free and a Pro test.

### 22.2b Persona, badges, Bruh score and Roast or toast: fairness rules
These features talk about the user's own money, so they must never feel unfair, shaming or random. All are fixed rules on the user's own entries (no AI), recalculated on the phone, and covered by tests for every rule below.
- **Enough data first:** nothing is shown until there are at least 30 counted expenses across at least 3 weeks in the period. Before that: "Your persona appears after a few more weeks of logging."
- **What counts:** only expenses that count in totals (entries left out of totals are ignored), group expenses count as *your share only*, refunds reduce the matching spend, transfers between your own accounts never count, rent, EMI, insurance and investments are treated as fixed costs and never drive a persona or a roast.
- **Never about:** health and medical, education, donations, income or salary, debts owed by you, gender, religion or any sensitive category. These can appear in totals but never in a persona, badge name or roast line.
- **One-offs do not define you:** a single entry above 3x the user's typical spend for that category is excluded from persona and roast scoring (it still counts in totals).
- **Gaps are not savings:** days with no entries at all are "not logged", not "no spend", unless the user marks a no-spend day; streaks and badges use logged days.
- **Late night** means 11 pm to 4 am in the phone's own time zone; a late-night roast needs at least 5 such entries in the month, never one.
- **Persona stability:** a new persona needs a clear lead (at least 15% ahead of the next one) or two months in a row, so it does not flip every week. Ties pick the kinder persona. Every persona shows a one-line "why" built from the user's own numbers.
- **Persona list:** all names are affectionate (Chai Philosopher, Weekend Warrior, Silent Saver, Group Banker, Planner, Explorer, Homebody, Quick-commerce Royalty and others); there is no negative persona.
- **Badges:** earned only, never taken away, no "bad" badges; each has a clear rule shown on tap ("Settled 10 debts").
- **Streaks:** one free "freeze" per week so a missed day does not wipe a long streak; time zone changes and daylight-saving shifts never break a streak.
- **Bruh score (how fast *you* pay friends back):** needs at least 2 real paybacks; ignores amounts under ₹50; measured oldest debt first; shown only to the user; never shown about other people on any shared card.
- **Roast or toast:** **toast is the default**; roast is opt-in with a tone choice (gentle, playful, savage), always about a habit, never about the person; at most one roast card a month; every roast line has a kinder variant and the user can swap or hide it.
- **Sharing:** every share card has a *hide amounts* switch (on by default for persona and roast cards) and never names friends or merchants unless the user leaves them on.
- **Opt out:** persona, badges and roast can each be turned off in More; turning off deletes their history on the phone.

### 22.2c Referrals and offers: set once, no daily management
Founder rule (20 Oct): nothing that needs someone to create, activate or remove coupons, or manage payments by hand.
- **Friend code (automatic):** every user has a code in More (for example `BRUH-7Q4K`). A newcomer who enters a valid code is shown the *Friend offer*: **30% off the first year** (₹699 instead of ₹999). It is a single developer-determined offer created once in Play Console; the app checks the code's format on the phone and asks Play for that offer. No codes to issue, track or expire.
- **Thank-you for the sharer:** an "OG Bruh" badge and an exclusive sticker pack, unlocked on the phone. No money, nothing to verify.
- **Not doing:** rewards for the sharer that need proof a friend paid (needs a server), lifetime gift codes, manual promo codes, support-issued discounts.
- **Built into Play, switched on once:** free trial, grace period and account hold for failed payments, pause instead of cancel, and Play's automatic win-back offer for lapsed subscribers.

### 22.2d Unit economics and offers (planning numbers, to be validated)
*Assumptions: Google Play service fee 15% on subscriptions (and on the first US$1M a year for enrolled developers); taxes vary and must be checked with a CA; net figures below are after Play's fee only.*

| Plan | Price | Net after Play fee (15%) | Typical life | Value per customer (estimate) |
|---|---|---|---|---|
| Monthly | ₹129 | about ₹110 a month | 6 to 10 months | about ₹660 to ₹1,100 |
| Yearly | ₹999 | about ₹849 a year | 40 to 55% renew | about ₹1,400 to ₹1,900 |
| Lifetime | ₹2,999 | about ₹2,549 once | paid once | ₹2,549, no recurring revenue |
| Yearly via friend code | ₹699 first year | about ₹594, then full price | same renewal as yearly | about ₹1,150 to ₹1,650 |

**What this means:**
- **Lead with Yearly** (pre-selected, 7-day trial). It has the best value per customer and smooths cash flow.
- **Keep Lifetime at about 3x Yearly** (₹2,999) and present it last so it does not eat recurring revenue.
- **Monthly exists as the low-commitment entry**; offer an upgrade to Yearly after 2 months ("you'd save ₹549").
- **Referral is the cheapest growth:** a 30% first-year discount costs about ₹255 of net revenue per new payer, far below what paid ads typically cost per paying user, and referred users tend to stay longer.
- **Reduce churn without dark patterns:** annual default; reminders that show the value the user got ("Vault saved 214 entries; radar found ₹1,800 of yearly subscriptions"); Play's pause option instead of cancelling; grace period and account hold turned on; Play's automatic win-back offer; never block cancelling or hide it.
- **Watch these numbers (from Play Console, no analytics SDK):** trial to paid conversion, month-2 retention, yearly renewal rate, refund rate, share of Pro from friend codes, average revenue per paying user.

### 22.2e Go-to-market plan (founder, 20 Oct)
Launch on Google Play, run Instagram ads to the Play listing, convert installs to Pro inside the app. No website, no account, no sales team.
- **Audience:** everyone who spends and shares costs (students, working people, couples, families, flatmates, travellers), not one age group. The tone is friendly and modern; the copy never assumes the reader is young or that the other person is a friend.
- **Ads to the listing:** send Instagram ad traffic to a Play Store link with campaign parameters (`&referrer=utm_source%3Dinstagram%26utm_campaign%3D…`) and use **custom store listings** per audience; Play Console then shows store visits, installs and buyers per campaign. No Meta SDK or tracking inside the app (constitution).
- **Conversion inside the app:** onboarding, then the free app; Pro shown at real moments of value (a blurred Insights section, the 4th budget, Vault on first backup, Monthly Wrapped on the 1st); Yearly with a 7-day trial pre-selected.
- **The numbers that decide ad spend (from Play Console and Meta Ads Manager):** cost per install, install to trial, trial to paid, refund rate, yearly renewal. Rough guide: if a paying customer costs more than about ₹1,000 in ads, push Yearly harder and improve the listing before spending more; Monthly-only buyers rarely pay back ad costs.
- **Store listing:** screenshots and video must never show other companies' logos; show BruhMe's own visuals (the onboarding style).

### 22.3 What changes legally, in permissions and in paperwork
| Area | What is needed |
|---|---|
| **Constitution** | The founder amendment above, then updates to sections 1, 2, 9, 10 and 11 |
| **Permissions** | `com.android.vending.BILLING` (added by the billing library, not shown to users). INTERNET comes back into store builds (fine; the privacy copy stops claiming the app has no internet and says what is true: no BruhMe account, no BruhMe server, entries are not sent to us). Vault uses the system folder picker, so **no storage permission** |
| **Google Play** | Payments profile and bank account for payouts (Fermor Technologies Pvt Ltd), products and base plans, trial offer, licence testers; follow the Payments policy (digital features must use Play Billing) and the Subscriptions policy (show price, period, trial and how to cancel before purchase; easy cancellation) |
| **Store listing** | "Contains in-app purchases"; screenshots that mark Pro features honestly |
| **Data safety** | Re-declare from the final build. Google processes the payment; BruhMe receives only the purchase token for the entitlement. Vault backups go to the user's chosen cloud, not to us; describe this accurately |
| **Legal pages** | Update the privacy policy (purchases, Vault); add **Terms of Use** with subscription terms, renewals, refunds (Google's refund rules plus ours) and a link from the Pro sheet |
| **India consumer law** | Follow the Consumer Protection (E-Commerce) Rules and the 2023 dark-patterns guidelines: no false urgency, no subscription traps, no hidden renewal, no confirm-shaming; a clear cancel path |
| **Tax** | Confirm with a CA how GST applies to Play sales for Indian users and your payouts, and book the income correctly |
| **Engineering** | Crypto library for Vault (`@noble/ciphers`, `@noble/hashes`, MIT), `expo-iap` (or `react-native-iap`) in a development build (Expo Go cannot test purchases), entitlement cache with grace period and refund revocation, Restore purchases, Vault (encryption, folder picker, automatic refresh when the app opens), the Pro sheet and blur lock, gating in about 10 places, tests that prove no user data is ever locked |
| **Effort** | Billing and gating about 1 to 2 weeks; Vault about 1 week; the bigger Pro features (radar, due dates, reimbursements, warranty, tax totals, Wrapped) about 3 to 5 weeks together; plus Play review |

**Decisions needed:** see the list in the reply of 20 Oct (amendment, split, prices, first release, Vault recovery choices, cross-store policy, business and identity details). Suggested first release: billing and Pro sheet, Vault, Subscription radar, due dates, weekly recap plus Monthly Wrapped, Pro Insights, Bump Pro. Second: Spaces, persona and badges, milestones, reimbursements, warranty, tax totals.

---

## 23. Where "kharchi" still appears, and why

Everything a person sees says BruhMe. "kharchi" remains only in identifiers that are permanent or shared, until the founder approves new ones (section 3):
- `src/config/app.json`: `slug` and `scheme` (`kharchi`) and the privacy-policy URL `https://gunanjr.github.io/kharchi/` (the GitHub repo name). The package id is now **`com.bruhme.app`**.
- The repository name `gunanjr/kharchi` and this folder name; `package.json` `name`.
- The Kotlin module `modules/kharchi-native`, its Expo module name `KharchiNative`, the config plugin `plugins/withKharchiNative.js`, Android resource names (`kharchi_widget`), and the headless task name.
- The SQLite file `kharchi.db` and the backup marker `app: 'kharchi'` (renaming them would lose existing data and old backups).
- The preview switch `KHARCHI_PREVIEW=1` (developer-only).

Renaming these is a one-time change best done together with the new package id, before the first Play upload.


---

## 24. Handoff: read this first if you are a new agent

*Written 20 Oct 2026 at the end of a long session, for whoever continues (another Claude session or a developer). Read section 1 (constitution) and this section before touching anything; the rest of this file is the reference.*

### 24.1 Where things stand
- **Repo:** `gunanjr/kharchi`, local clone `~/Desktop/Fermor/kharchi` (inside the user's `Fermor` folder; the Fermor repo itself is a different product, do not touch it). Expo SDK 57, React Native 0.86, TypeScript, Expo Router (`src/app`), local SQLite, no backend.
- **App name shown to users:** **BruhMe** (capital B, capital M, as in the wordmark). Identifiers still `kharchi` (section 23).
- **Git:** last commit `4c22f33`. **Everything after it is uncommitted** (about 125 changed, added or deleted files: the constitution clean-up, BruhMe brand, Groups and Insights rebuild, Bump, trip mode, Wrapped, merchant icons, Add sheet, onboarding, backup hardening, docs rename to `BRUHME.md`). The user must approve every commit and every push. Commit as `fermormain <fermormain@gmail.com>` (set `GIT_AUTHOR_*` and `GIT_COMMITTER_*` env vars), never the global identity.
- **Last full check (20 Oct):** `npx tsc --noEmit` clean; `npx expo lint` 0 errors; **342 Jest tests in 39 suites pass** (Node 22); `npx expo export --platform android` builds. Nothing device-tested (section 17).
- **The user is roughly 90% happy with the app** and iterates screen by screen with screenshots from their Android phone in Expo Go.

### 24.2 How to run, test and look at screens
- Phone: `npx expo start` (opens Expo Go; `.env` has `EXPO_NO_REDIRECT_PAGE=true`). If the old icon shows, clear Expo Go's cache and run `npx expo start -c`.
- Tests: `PATH=~/.nvm/versions/node/v22.23.3/bin:$PATH npx jest` (Node 22 is required for `node:sqlite`). DB tests need `jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }))`.
- Browser preview for screenshots: `KHARCHI_PREVIEW=1 npx expo start --web --port 8101 --clear` (needs `npm i sql.js --no-save --legacy-peer-deps`, which every `npm install` removes again: reinstall it if the preview shows a blank page or a 500). The preview DB is in memory and re-seeds the full demo on every load; `?onboarding=1&empty=1` shows onboarding; `?theme=dark` for dark.
- Screenshots: `playwright-cli` (`resize 390 844`, `goto`, `snapshot` to find `[ref=…]`, `click`, `fill`, `screenshot --filename=…`); helper scripts in `~/Desktop/Fermor/kharchi-screens` (`shoot2.sh`). Always look at your screenshots before saying something is done.
- Teammates see the same demo: development builds load the deterministic demo after onboarding; existing installs use More, Developer, **Reset to the latest demo**.

### 24.3 Gotchas learned the hard way
- A Python script that reused the variable `p` inside a loop wrote `seed.ts` content into a stray file named `upi`; it has been deleted. Avoid shadowing variables in helper scripts and verify edits with `grep`.
- On macOS `sed -i` needs `sed -i ''`; zsh rejects `grep --include=*.ts` unquoted.
- SVG gradient ids must be unique per screen (shared ids made every onboarding panel orange on web).
- Bundled images need static `require` paths: `src/features/brands/data.ts` is generated, never hand-edited.
- Brand names that are everyday words only match exactly (`COMMON` set in `features/brands/match.ts`).
- `expo-image-picker` is configured with all permissions blocked; installed builds take photos through the Kotlin module (no CAMERA permission), Expo Go through the picker.

### 24.4 The user: preferences and standing rules
- Wants a **premium, Gen Z, "bruh me / bro, pay me back"** feel that is still **professional**: no gimmicks, no filler, no "AI-looking" visuals, no over-texting, no fake urgency. Copy must be accurate (no absolute privacy claims) and neutral ("any UPI app", never naming specific payment apps).
- **Never show other companies' brands** in onboarding, store graphics or marketing.
- Wants the app to feel fast, uncluttered and self-explanatory; complains quickly about broken-looking layouts, unexplained charts, dead taps, wrong Back behaviour and anything that wraps or clips. Every tappable thing must do something sensible.
- Gives feedback mid-task in bursts; handle each point, show screenshots-verified results, and report plainly what changed and what was not verified.
- Stay inside the constitution; when an idea needs permissions, a server, payments or legal work, say so, offer the in-bounds version, and record it in section 21.
- Ask before any commit or push. Do not rename package ids, slug, scheme or domains without written approval.
- Keep **this file** as the single source of truth and update it in the same turn as any change.

### 24.5 Map of what was built on 20 Oct (where to look)
| Area | Files |
|---|---|
| Brand | `assets/brand/*`, `src/components/Wordmark.tsx` (Wordmark, BrandMark), `scripts/make-icons.mjs`, `src/theme/tokens.ts` (white page, orange, Nunito headings) |
| Onboarding (6 pages) | `src/app/onboarding.tsx`, strings `onb.*` in `src/i18n/en.ts` and `hi.ts` |
| Add sheet | `src/features/tracker/ui/AddExpenseForm.tsx`, `src/app/add.tsx`, photos in `src/features/tracker/receipts.ts` |
| Merchant icons | `src/features/brands/` (data.ts generated, match.ts, BrandIcon, MerchantTile, IconPickerSheet, custom.ts), `assets/brands/*.png`, `scripts/fetch-brand-icons.mjs`, `scripts/gen-brand-data.py`, `scripts/brand-list.json`, `scripts/brand-icons.json` |
| Groups | `src/app/(tabs)/groups.tsx`, `src/app/group/[id].tsx`, `src/app/friend/[id].tsx`, `src/features/groups/` (overview, nudge, context, wrapped, reliability, trip, ui/BruhSheet, ui/TripSheet, ui/WrappedCard) |
| Bump and QR | `src/features/groups/ui/BruhSheet.tsx` (composer, person picker, 8 tones, BumpCard), `src/features/groups/nudge.ts`, `src/components/QrCode.tsx` |
| Insights | `src/app/(tabs)/insights.tsx`, `src/features/insights/ui/parts.tsx` (MonthBars, PaceTrack, StatBox, WeekdayBars, RankedRow), `range.ts`, `analytics.ts` (bounded anomalies), `ui/HealthCard.tsx`, drill-down screen `src/app/entries.tsx` |
| Home | `src/app/(tabs)/index.tsx`, `src/features/tracker/ui/PulseWidgets.tsx`, `BudgetStrip.tsx`, `src/features/pending/PendingStack.tsx`, `src/lib/carousel.ts`, `src/components/PrivacyNote.tsx` |
| Assistant | `src/app/assistant.tsx` (fixed-height question panel) |
| Backup | `src/db/backup.ts` (inspect, checksum, all-or-nothing restore), `src/app/settings/data.tsx`, tests `src/db/__tests__/backup.test.ts` |
| Demo data | `src/features/dev/seed.ts` (12 months, ~80 merchants), `seedAll.ts`, `src/app/settings/developer.tsx` (Reset to the latest demo) |
| Speed guard | `src/__tests__/perf.test.ts` |
| Migrations | `src/db/migrations.ts` (append only; latest is 8, trip mode) |

### 24.5a Build progress on section 22 (Pro)
- [x] **Entitlement logic** `src/features/pro/entitlement.ts` with tests: product ids (`bruhme_pro_monthly`, `bruhme_pro_yearly`, `bruhme_pro_lifetime`), purchase checks (product, package, state, token, signature, signed-JSON match), best plan wins, acknowledgement list, 7-day offline grace that clock rollback cannot extend, junk or edited caches refused, `ProFeature` list and `FREE_LIMITS`.
- [x] **Pro store** `src/features/pro/store.ts` (`useIsPro`, `isProNow`; Developer switch exists only in `__DEV__`, on by default so the team sees Pro in Expo Go).
- [x] **Pro screen** `src/app/pro.tsx`: perks, Yearly ₹999 with 7-day trial pre-selected, Monthly ₹129, Lifetime ₹2,999, plain renewal and cancel text, Restore purchases, Privacy link. Pro card at the top of More.
- [x] **Vault** (works end to end, tested): `src/features/vault/crypto.ts` (recovery code: 26 Crockford base32 characters plus a check character, typo detection, forgiving input; HKDF-SHA256 key; AES-256-GCM; self-contained UTF-8 and base64), `service.ts` (folder via Android's own picker, encrypted save, skip when unchanged, at most every 6 hours automatically, keep last 7, recovery code in the secure keystore), `useVaultAuto.ts` (on open and foreground), `ui/CodePrompt.tsx`, `ui/useRestoreFlow.tsx` (one restore flow for plain and Vault files: same phone needs no code, new phone asks for it, preview and confirm, all or nothing, adopts the code). Screen `src/app/settings/vault.tsx` (setup with the code card, Save code and Copy, status, Back up now, Change folder, Show my recovery code behind fingerprint or face, Turn off, Restore). Also on Export & backup and on the welcome screen (*Restore a backup*). Backups never include Vault's own settings. New packages: `@noble/ciphers`, `@noble/hashes` (MIT), `expo-secure-store`.
- [ ] **Billing adapter:** `src/features/pro/billing.ts` detects the native billing module; add `expo-iap`, connect purchase, restore and acknowledgement to `resolveEntitlement`, and store the cache in the secure keystore. Needs the package id and the products created in Play Console.
- [x] **Subscription radar** `src/features/radar/radar.ts` (tested: weekly, monthly, quarterly, yearly; price rises; stopped charges; left-out entries ignored; cancelled charges drop out and are flagged if they charge again) and screen `src/app/radar.tsx` (yearly and monthly totals, renewal date, *Remind me the day before* local notification, *I cancelled it*, tap for payments). Linked from More and Insights (*Open radar*). Helper `src/lib/notify.ts` (`notifyAt`, `morningBefore`) for every local reminder.
- [x] **ProGate** `src/features/pro/ProGate.tsx`: wraps any Pro screen; free users see what it does and *See Pro*.
- [x] **Fix (20 Oct night):** on a friend's page, *Save UPI ID* no longer saves an empty value; it stays disabled until a real, changed ID is typed, and clearing a saved ID is a separate *Remove UPI ID* button.
- [ ] **Next, in order:** due dates with reminders (card, rent, EMI, bills; month calendar) → weekly recap (free) and Monthly/Yearly Wrapped and milestones (share cards, reuse `WrappedCard` style) → Pro Insights (custom range, month vs month, spending calendar, budget autopilot) → Bump Pro (gate the extra 4 tones and add saved lines and card themes) → Spaces → persona, badges, streaks, Bruh score, roast or toast (rules 22.2b) → reimbursements PDF → warranty vault → tax-time totals → private mode → extra widgets and app icons → friend codes (22.2c) → billing (`expo-iap`) → flip `PRO_LAUNCHED` and update the Pro screen perks to list every built feature.
- [ ] The remaining features in the order of 24.6.

### 24.5b Launch readiness (20 Oct, evening)
**Play account type (answer to the founder):** Google's 12-testers-for-14-days rule applies to **personal** developer accounts created after 13 Nov 2023. **Organisation (company) accounts are exempt.** The type is shown in Play Console, Settings, Developer account. A personal account cannot simply be switched; a company account needs the business's D-U-N-S number and Google's verification, which usually takes days, not hours. There is no legitimate way to skip the test on a personal account. Either way, a brand-new app's first review can take from hours to several days. Confirm the account type before planning the public date.

**Ready in the code:** all free features; Vault; Pro screen (lists only built features); package id `com.bruhme.app`; privacy policy rewritten for this build (`docs/index.html`, `docs/privacy-policy.html`); store listing rewritten (`store/listing-en.md`); `expo-doctor` 21/21; 354 tests pass; Android bundle builds.
**Blocking a public launch tonight:**
1. ~~Code not pushed~~ Pushed to `main` on 20 Oct (founder approved).
2. **No signed build yet:** someone logged in to Expo runs `npx eas-cli login`, `npx eas-cli init`, then `npm run build:store-aab` (this machine is not logged in to Expo).
3. **Play account type:** a personal account created after Nov 2023 must run a closed test (12 testers, 14 days) before production; tonight's realistic target is then internal or closed testing.
4. **Pro purchases:** `expo-iap` and the three Play products are not connected; products can only be created after the first upload. ~~Launch free first~~ **Superseded (founder, 20 Oct night): publish with every Pro feature and billing working.** Pro stays hidden in store builds (`PRO_LAUNCHED = false`) only until then; flip it when billing and the three products are live.
5. **Privacy page hosting:** GitHub Pages serves `docs/` only after it is pushed; the policy URL must work before submitting.
6. **Not tested on a real phone:** everything since 19 Oct (section 17).

### 24.6 What to do next
1. **Amendment A1 is approved: build the whole of section 22** (free and Pro) before the first release, in this order: entitlement and Play Billing (`expo-iap`, anti-bypass 22.2a) and the Pro sheet; Vault (recovery-code model); Subscription radar; due dates with local reminders; weekly recap, Monthly and Yearly Wrapped, milestones; Pro Insights; Bump Pro (themes, stickers, saved lines); Spaces; persona, badges, streaks, Bruh score, roast or toast (fairness rules 22.2b); reimbursements; warranty vault; tax-time totals; private mode; widgets and app icons; friend codes (22.2c). Each with tests. Package id must be confirmed before any Play upload.
2. If the user keeps polishing UI: verify every change with preview screenshots; keep the rules in 24.4.
3. When approved: commit in logical chunks (constitution clean-up, brand, features, docs) as fermormain; push only if told.
4. When Pro is approved, follow the anti-bypass design in section 22.2a exactly.
5. Before release: device test everything in section 17, run `npm run audit:manifest` on a built APK, update the privacy page and store listing, licence notices.
