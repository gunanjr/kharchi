# Publish to the Google Play Store: step by step (no experience needed)

Do the steps in order. Each says **where** to click or type. Anything in `code style` is typed in the **Terminal** (in VS Code: menu *Terminal → New Terminal*) while you are inside the project folder `~/Desktop/app`.

## What you are publishing
The **Privacy-First edition**: no SMS permission, no internet permission, no account, no ads, no tracking. Users paste or share a bank message (or type) and confirm. Because it asks for almost nothing, you **skip Google's difficult SMS approval**. (The old automatic-SMS edition still exists as `production-full`, but do not use it for the first release. See `docs/PLAY_POLICY.md`.)

Two honest facts:
1. Quick add and **Scan bill** are home-screen widgets (and long-press shortcuts). There is no Quick Settings tile and no back-tap feature.
2. Google can still ask questions during review. You always owe Google: developer verification, Data safety form, privacy policy page, store listing, and a build for Android 16 (API 36), which this project already uses.

## What you need (checklist)
| Thing | Cost | Notes |
|---|---|---|
| Google account (Gmail) | free | the one you will use for Play |
| Google Play Developer account | **US$25 once** | card, government ID, phone number; identity check 1-3 days |
| Expo account | free | https://expo.dev/signup (builds the app in the cloud) |
| GitHub account | free | you already have `gunanjr`; hosts the privacy policy page |
| An email for users | free | currently `bollugunwanth@gmail.com` is in the privacy policy; change it if you want another |
| An Android phone | free | for screenshots and testing |
| **12 testers** (friends/family with Gmail) | free | **only if** your Play account is a *personal* account created after 13 Nov 2023: they must stay opted in for 14 days before you can go to Production |
| Time | | about half a day + waiting for Google |

You do **not** need: a website, a Google Cloud account, a backend, a database server, or an SMS declaration.

---
## PART A: Decide the name and the app ID (FIRST, cannot change later)
The app ID is permanent once uploaded to Play.
1. Pick the real app name. Search it in the Play Store and on https://tmrsearch.ipindia.gov.in/tmrpublicsearch/ (Indian trademark search). If taken, pick another.
2. In VS Code open `src/config/app.json` and set:
   - `appName`: the name people see.
   - `androidPackage` and `iosBundleId`: your own unique ID in lowercase, like a reversed web address, e.g. `com.gunanjr.kharchi`. Both the same.
   - `supportEmail`: the email users can contact.
   - `privacyPolicyUrl`: leave as is if your GitHub username is `gunanjr` and the repo is `kharchi` (Part B).
3. Save. In the Terminal run `npx expo prebuild --clean` (regenerates Android files; safe).

## PART B: Privacy policy page (Google requires a public link)
The page already exists in the project (`docs/index.html`). You only turn on hosting:
1. Open https://github.com/gunanjr/kharchi (push the latest code first; ask me and I'll push).
2. Click **Settings** (top bar of the repo) → **Pages** (left menu).
3. Under *Build and deployment → Source* choose **Deploy from a branch**. Under *Branch* choose `main` and the folder **/docs**. Click **Save**.
4. Wait 1-2 minutes. Open `https://gunanjr.github.io/kharchi/` in a browser. You should see the privacy policy. If it says 404, wait a bit and refresh.
5. If you changed your support email in Part A, also edit it near the bottom of `docs/index.html` and `docs/privacy-policy.html`, commit and push.
This link goes into Play Console (Part G) and is also reachable inside the app (More → Privacy → Read the full privacy policy).

## PART C: Connect Expo (builds the app in the cloud, free)
1. Make an Expo account at https://expo.dev/signup.
2. Terminal: `npx eas-cli login` → type your Expo email and password.
3. Terminal: `npx eas-cli init` → answer **Yes** to create the project. It prints a **project ID**.
4. Create a file named `.env` in the project folder (next to `package.json`) with one line: `EAS_PROJECT_ID=paste-the-id-here`
5. Run: `npx eas-cli env:create --name EAS_PROJECT_ID --value paste-the-id-here --environment production --visibility plaintext`

## PART D: Build the Play Store file (.aab) and prove it is clean
1. Terminal: `npm run build:store-aab` (this is `eas build --platform android --profile production`).
2. First time it asks *"Generate a new Android Keystore?"* → press **Y**. This is your app's signing key; EAS stores it. Later run `npx eas-cli credentials`, choose Android, and download a backup copy to a safe place.
3. Wait 10-20 minutes. When done it prints a link to the `.aab` file. Download it.
4. **Test on your own phone first (recommended):** `npm run build:store-test-apk` builds an `.apk` with the exact same permissions. Open the link on your phone, install it, and try: add expense, paste a bank message, a group split, backup/restore, dark mode.
5. **Optional audit (needs Android Studio installed):** `npm run android:store` builds the same thing locally; then `npm run audit:manifest` prints the permission list and **fails** if anything forbidden slipped in. Expected permissions: notifications (optional), biometrics (optional), vibrate, start-up reminders. Target SDK must say 36.

## PART E: Create the Play Console account
1. Go to https://play.google.com/console/signup and sign in with your Google account.
2. Choose **Personal** (just you) or **Organization** (a registered company; needs a D-U-N-S number and website verification). Personal is fine for this app.
3. Pay the **US$25**. Fill in your name, address and phone; verify email and phone.
4. Upload your **government ID** when asked, then wait for approval (1-3 days). You cannot publish until verified.

## PART F: Create the app and the store page
1. Play Console → **Create app**. Name = your app name. Language *English (India)*. App. **Free**. Tick the two declarations → **Create app**.
2. Left menu **Grow → Store presence → Main store listing**: paste the texts from `store/listing-en.md` (short and full description).
3. Upload images: icon `store/play-icon-512.png`; feature graphic `store/feature-graphic-1024x500.png`; **phone screenshots (at least 2, ideally 6-8)**.
4. **Save.**

### How to take screenshots
Install the test APK (Part D step 4). Open **More → Developer** and tap "Generate 3 months of spending" and "Generate demo groups". Screenshot (power + volume-down) these: Home, Insights, a Group, the Assistant, Quick add, dark mode. Send them to your computer (email or WhatsApp to yourself), upload.
Before you go live, use **More → Export & backup → Delete all my data** on your own phone if you don't want the demo data.

## PART G: "App content" forms (Policy and programs → App content)
All are just forms; answers are also in `docs/PLAY_POLICY.md`.
1. **Privacy policy** → paste `https://gunanjr.github.io/kharchi/`.
2. **Ads** → No.
3. **App access** → all functionality available without special access.
4. **Content rating** → questionnaire; category Utility/Productivity; answer **No** to everything sensitive. Result: Everyone.
5. **Target audience** → **18 and over**.
6. **News app / COVID / Government** → No.
7. **Data safety** → *Does your app collect or share any of the required user data types?* → **No**. Continue and **Submit**. (Reason: everything stays on the phone, the app has no internet permission and no third-party SDKs.)
8. **Financial features** → choose *Personal finance / expense tracking*; the app does **not** offer loans, banking, payments or investments.
9. **Advertising ID** → No.
**There is no SMS permission form for this edition.**

## PART H: Upload, test, and go live
1. Left menu **Testing → Internal testing → Create new release** → drag in the `.aab` → **Next → Save → Review → Start rollout**.
2. **Testers** tab → create a list → add your Gmail → copy the opt-in link → open it on your phone → install from Play → test.
3. **If you need the 12-testers rule** (Part E, personal account): **Testing → Closed testing** → create track → add 12 Gmail addresses → upload the same `.aab` → ask them to opt in and keep it installed **14 days** (Console shows a counter). Then press **Apply for production**.
4. When allowed: **Production → Create new release** → upload `.aab` → release notes ("First release") → **Review → Start rollout to Production**.
5. Google reviews (hours to a few days) and emails you.

## PART I: Updates later
1. Change `version` in `app.config.ts` (e.g. `'1.0.1'`); the build number goes up automatically.
2. `npm run build:store-aab`, download the `.aab`, Play Console → Production → Create new release → upload → rollout.

## PART J: Later options (not for v1.0)
- Paid "Plus": see `docs/BUSINESS_PLAN.md`. Needs Play Billing and a privacy/Data safety update first.
- Automatic SMS reading: see the appendix of `docs/PLAY_POLICY.md` (`production-full`). Only after launch, only if users ask.

## Things that commonly go wrong
- *"Package name already exists"* → choose a different `androidPackage` (Part A), run `npx expo prebuild --clean`, rebuild.
- *EAS build fails* → copy the red error text; most are a missing `EAS_PROJECT_ID` (Part C step 4-5).
- *Privacy policy link rejected / 404* → Part B step 4: wait or re-check Pages source is `main` + `/docs`.
- *Reviewer says the app needs login* → App access: "all functionality available without login". The demo-data tools in More → Developer let a reviewer see every screen.
- *Lost the keystore* → `npx eas-cli credentials` to download a backup; Play App Signing can also help recover.

## One-minute check before you press "Release"
`npm run check` (typecheck + lint + tests) is green; the store test APK installs and works; `npm run audit:manifest` passed (if you built locally); privacy page opens; Data safety submitted.
