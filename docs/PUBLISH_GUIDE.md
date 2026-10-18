# Publish to the Google Play Store: step by step (no experience needed)

Read it once top to bottom, then do the steps in order. Each step says **where** to click or type. Anything in `code style` is typed in the **Terminal** (in VS Code: menu *Terminal → New Terminal*) while you are inside the project folder `~/Desktop/app`.

## Please read first: three honest facts
1. **Google decides whether SMS reading is allowed.** Apps that read SMS must fill a *Permissions Declaration Form* and Google reviews it. It can be approved or rejected, and it can take days. This project ships **two builds** so you are never stuck: the **Full** build (reads bank SMS) and the **Lite** build (no SMS permission; users share/paste the bank message instead). If Full is rejected you upload Lite and you are still live.
2. **"Double-tap the back of the phone" cannot be done by any app.** Android gives apps no way to detect it. What the app does instead: Quick Settings tile, home-screen widget, long-press shortcut, and a guide that connects your phone's *own* back-tap setting (Pixel Quick Tap, Samsung Good Lock) to the app's Add expense shortcut. The experimental motion detector exists only in your own test builds, **not** in the Play Store build (Google dislikes always-on sensors).
3. The notification-reading feature (GPay/PhonePe notifications) is also **left out of the Play build** for policy safety. It is included in the test APK (`preview`) you install yourself.

## What you need (checklist)
| Thing | Cost | Notes |
|---|---|---|
| Google account (Gmail) | free | The one you will use for Play |
| Google Play Developer account | **US$25 once** | needs a credit/debit card, your government ID, a phone number, ~1-3 days for identity check |
| Expo account | free | https://expo.dev/signup |
| GitHub account | free | only to host the privacy policy page |
| An email address for users to contact | free | goes in the privacy policy and store listing |
| An Android phone with USB debugging, or a second phone | free | to record the SMS demo video and take screenshots |
| **12 testers** (friends/family with Gmail) | free | **only if** your Play account is a *personal* account made after Nov 2023: Google requires 12 testers for 14 days before "Production" |
| Time | | about 1 day of work + waiting for Google |

---
## PART A: Decide the name and the app ID (do this FIRST, it cannot be changed later)
The app ID (package name) is permanent once you upload to Play.
1. Pick the real app name. Search it on the Play Store and on https://ipindiaservices.gov.in/tmrpublicsearch (trademark search). If taken, pick another.
2. In VS Code open `src/config/app.json`. Change:
   - `"appName"`: the name people see (e.g. `"Kharchi"`)
   - `"androidPackage"`: your own unique ID, **lowercase, like a reversed web address**. Example: `com.yourname.kharchi`. Use your own name, not `app.kharchi.tracker` unless you want it.
   - Do the same for `"iosBundleId"` (just make it equal).
3. Save. In the Terminal run: `npx expo prebuild --clean` (it regenerates the Android folder; it is safe).

## PART B: Privacy policy web page (Google requires a link)
1. Open `docs/privacy-policy.html`. Replace `REPLACE_DATE` with today's date and `REPLACE_EMAIL` with your email. Save.
2. Go to https://github.com → sign in → **+** (top right) → **New repository**. Name it `kharchi-privacy`. Choose **Public**. Click **Create repository**.
3. On the new repo page click **uploading an existing file**. Drag in your edited `privacy-policy.html` and **rename it `index.html`** (rename the file on your computer before dragging). Click **Commit changes**.
4. In the repo: **Settings → Pages**. Under *Branch* choose `main` and folder `/ (root)`, click **Save**. Wait 1-2 minutes.
5. Your link is `https://YOUR-GITHUB-USERNAME.github.io/kharchi-privacy/`. Open it in a browser to check it works. **Copy it**; you need it later.

## PART C: Connect Expo (builds the app in the cloud, free)
1. Make an Expo account at https://expo.dev/signup.
2. Terminal: `npx eas-cli login` → type your Expo email and password.
3. Terminal: `npx eas-cli init` → say **Yes** to create the project. It prints a **project ID**.
4. Create a file named `.env` in the project folder (same place as `package.json`) containing exactly one line (use your ID): `EAS_PROJECT_ID=paste-the-id-here`
5. Also run: `npx eas-cli env:create --name EAS_PROJECT_ID --value paste-the-id-here --environment production --visibility plaintext` (so cloud builds see it).

## PART D: Build the Play Store file (.aab)
1. Terminal: `npx eas-cli build --platform android --profile production`
2. First time it asks *"Generate a new Android Keystore?"* → press **Y**. This is your app's **signing key**. EAS stores it safely. (Later run `npx eas-cli credentials`, choose Android → "Download credentials" and keep a backup in a safe place. If it is lost you can still recover through Play App Signing, but back it up anyway.)
3. Wait about 10-20 minutes. When it finishes it shows a link to an `.aab` file. Click it and **download** it. This is **Build FULL**.
4. Also make the fallback now so you have it ready: `npx eas-cli build --platform android --profile production-lite` and download that `.aab` too. This is **Build LITE**.
5. (Optional, for testing on your own phone first) `npx eas-cli build --platform android --profile preview` gives an `.apk` you can install directly with every experimental feature.

## PART E: Create the Play Console account
1. Go to https://play.google.com/console/signup and sign in with your Google account.
2. Choose **Personal** (just you) or **Organization** (you have a registered company). Personal is fine.
3. Pay the **US$25**. Fill in your name, address, phone. Verify your phone and email.
4. Upload your **government ID** when asked and wait for approval (1-3 days). You cannot publish until it is approved.

## PART F: Create the app and the store page
1. Play Console → **Create app**. App name = your name. Default language *English (India)*. App or game = **App**. Free or paid = **Free**. Tick the two declarations. **Create app**.
2. Left menu **Grow → Store presence → Main store listing**. Copy-paste the texts from `store/listing-en.md` (short description, full description).
3. Upload the images:
   - App icon: `store/play-icon-512.png`
   - Feature graphic: `store/feature-graphic-1024x500.png`
   - **Phone screenshots (at least 2, 4-8 is better)**: see "How to take screenshots" below.
4. Click **Save**.

### How to take screenshots
Open the app on your phone, go to **More → Developer → Generate 3 months of spending** and **Generate demo groups** (so screens look full). Take screenshots (power + volume-down) of: Home, Insights, a Group, the Assistant, Quick add, dark mode. Send them to your computer (email/WhatsApp to self) and upload.

## PART G: "App content" forms (Play Console → left menu → Policy and programs → App content)
Do each item; they are all just forms.
1. **Privacy policy** → paste your GitHub Pages link from Part B.
2. **Ads** → *No, my app does not contain ads*.
3. **App access** → *All functionality is available without special access*.
4. **Content rating** → start the questionnaire. Category *Utility / Productivity*. Answer **No** to violence, sexual content, drugs, gambling, etc. Result should be "Everyone".
5. **Target audience** → choose **18 and over** only.
6. **News app** → No. **COVID** → No. **Government app** → No.
7. **Data safety** → *Does your app collect or share user data?* Choose **No** (the app keeps everything on the phone and never sends it anywhere). *Is all data encrypted in transit / can users request deletion* → the questions disappear if you chose No. Click through and **Submit**.
   - If Google's form asks about SMS specifically, say: processed on device only, not collected, not shared.
8. **Financial features** → select that the app is a **personal finance / expense tracker** and does **not** offer loans, banking, payments or investments.
9. **Health, Advertising ID, Government** → No / not applicable. **Advertising ID**: *No*.

## PART H: The SMS permission form (only for the FULL build)
Play Console → **Policy and programs → App content → Sensitive app permissions → SMS or Call Log permissions → Start declaration**.
1. Say the app is **not** the default SMS handler.
2. Pick the use-case that best matches. If you see **"Core functionality"** options or an option about **receiving transaction alerts / financial** use, choose it. If no option fits your case honestly, **skip the Full build and publish Lite** (Part K).
3. Description (copy from `docs/PLAY_POLICY.md` section 3, "Draft: Permissions Declaration Form answers").
4. **Demo video** (required, 1-2 minutes). How to record it simply:
   a. Install the **preview** build on your phone (Part D step 5), or the Play internal-test build.
   b. Turn on screen recording (swipe down → *Screen record*).
   c. Follow the 7 steps in `docs/PLAY_POLICY.md` section 3: show the disclosure screen, the Allow dialog, then have a friend send you a test SMS like `Rs.450.00 debited from a/c XX1234 to VPA swiggy@ybl` (or use the second phone) and also an OTP message, show the notification asking "What was this for?", reply, and open the app.
   d. Upload the video to YouTube as **Unlisted** and paste the link.
5. Submit. Google replies by email. Typical wait: up to a few days.

## PART I: Upload and test
1. Left menu **Testing → Internal testing → Create new release**.
2. Upload the **FULL** `.aab` (drag it in). Release name auto-fills. **Next → Save → Go to review → Start rollout to Internal testing**.
3. **Testers** tab → create a list → add your own Gmail → copy the *opt-in link* → open it on your phone → install from Play. Test everything.
4. **If your account needs the 12-testers rule:** Testing → **Closed testing** → create a track → add 12 Gmail addresses → upload the same `.aab` → ask them to opt in and keep the app installed for **14 days**. The Console shows a counter.

## PART J: Go to Production
1. When the checklist under **Dashboard** shows everything done (and 14 days passed if required): **Production → Create new release** → upload the `.aab` → add release notes ("First release") → **Review → Start rollout to Production**.
2. Google reviews (hours to ~7 days). You get an email when it is live.

## PART K: If Google rejects the SMS permission (Plan B, already prepared)
1. Do NOT argue forever; ship Lite. Upload the **LITE** `.aab` (Part D step 4) to the same release instead. Lite has no SMS permission, so no declaration is needed.
2. Remove the "reads SMS automatically" claim from the store text; use this line: *"Paste or share a bank message into the app and it becomes an expense in 2 seconds."*
3. You may later try again with a clearer video/explanation, or offer the Full build as a direct APK download on your own website (users will see a Play Protect warning and can tap *Install anyway*).

## PART L: Releasing updates later
1. In `app.config.ts` change `version` (e.g. `'1.0.1'`). The build number goes up automatically.
2. `npx eas-cli build --platform android --profile production`, download the `.aab`, then Play Console → Production → **Create new release** → upload → rollout.

## Things that commonly go wrong
- *"Package name already exists"* → choose a different `androidPackage` (Part A) and rebuild.
- *Build fails in EAS* → copy the red error text and send it to me/search it; most are a missing `EAS_PROJECT_ID`.
- *Rejected: "Prominent disclosure"* → show the disclosure screen clearly in the video; it is in `src/app/disclosure/[kind].tsx`.
- *Rejected: SMS permission* → Part K.
- *Forgot to back up the keystore* → run `npx eas-cli credentials` and download it.

## Before you press "Release" (one-minute check)
`npx tsc --noEmit && npm run lint && npm test` all green; install the **preview** APK and test: add expense, simulate/receive SMS, reply from the notification, quick-add tile, dark mode, backup/restore.
