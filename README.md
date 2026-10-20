# BruhMe

> **[`BRUHME.md`](BRUHME.md) is the single source of truth** for this app: the binding product constitution (section 1), features, design rules, privacy and Play policy, Pro and pricing, decisions, status and the live handoff (section 24). This README is only the landing page. If the two ever disagree, `BRUHME.md` wins.

BruhMe is a personal expense tracker and bill splitter for Android, built with React Native (Expo SDK 57, TypeScript, Expo Router). **No account, no backend, no ads, no analytics.** Records live in a local SQLite database on the phone.

- **Free:** expenses and income, paste or share a bank message to log it, quick add, groups and friends with six split types and debt simplification, settle-up pay cards with a UPI link (any UPI app), Insights, goals, budgets, weekly and monthly Wrapped, a tap-only on-device assistant, CSV and backup.
- **BruhMe Pro** (Google Play Billing, amendment A1): the Pro tab (season theme, challenges, report card, month-end estimate, story maker, Main Character Energy), Vault encrypted backups to a folder the user picks, subscription radar, due dates, spaces, reimbursements, warranties, tax totals, profile and roasts.

## Run it
```bash
npm install
npx expo start                 # open in Expo Go on an Android phone
```
Native features (bill camera, widgets, billing) need a development build: `npm run android:dev` (USB, Android Studio) or `npm run build:dev-apk` (EAS cloud), then `npx expo start --dev-client`.

**Checks** (Node 22 is required for the database tests):
```bash
export PATH=~/.nvm/versions/node/v22.23.3/bin:$PATH
npm run check                  # tsc + lint + jest
```

**Browser preview** (screenshots and quick UI checks only):
```bash
npm i sql.js --no-save --legacy-peer-deps    # again after every npm install
BRUHME_PREVIEW=1 npx expo start --web --port 8101
```

## Release
Store build: `npm run build:store-aab` (EAS `production`), verified by `npm run audit:manifest`. The Play Console steps, products and the closed-test plan are in `BRUHME.md` (sections 15, 24.5a, 24.5b).

## Layout
```
src/app/             screens (Expo Router): (tabs) Home, Activity, Groups, Insights, Pro; (pro) screens opened from Pro; settings/
src/features/        feature logic, mostly pure and tested (tracker, groups, insights, pro, mce, challenges, story, persona, vault, ...)
src/components/      shared UI (ui.tsx, charts, Poster, Medal, ...)
src/db/              SQLite adapter, append-only migrations, backup and restore
src/theme/           tokens and theme providers (including the Pro palette)
modules/kharchi-native/  Kotlin module (bill camera and OCR, widgets, reminders), wired by plugins/withKharchiNative.js
docs/                public privacy policy pages
store/               Play listing copy
```
`android/` is generated (git-ignored); never edit it by hand. Some internal identifiers still say "kharchi" on purpose; `BRUHME.md` section 23 lists them and why.
