# Publish BruhMe on Google Play: step by step

Read each step fully, then do it. **Terminal** means the Terminal window in VS Code (menu *Terminal → New Terminal*); every command is typed there, inside the project folder, then Enter. Words in **bold** are buttons or menu names you click. Google sometimes renames menu items, so if a name differs slightly, look for the closest one.

**Time:** about one afternoon of work, then waiting for Google (a few days). If your Play account is a *personal* account made after November 2023, Google also forces a **14-day test with 12 testers** before the public launch (Step 11).

---

## What is already done for you
- The app is final: 441 automatic tests pass, typecheck and lint are clean.
- The exact Play Store build was compiled and **run on an Android 16 phone emulator**: onboarding, Home, Insights, groups, bill scanning (camera, gallery, reading, splitting), Settings, Pro screens and the purchase flow all opened with no crash.
- A **real crash was found and fixed** in this round: on Android 14 and newer the app closed instantly because a screenshot-blocking library asked for a permission we do not have. That library is gone; the same feature now lives in our own code and needs no permission. Verified: with "Hide from screenshots" on, screenshots come out black.
- A built-in check (`npm run audit:manifest`) proved the final app asks only for: internet (Google Play purchases and your Vault backup folder), notifications (optional), biometrics (optional), vibration, restart (restores reminders), billing. Target Android version 36 (Google's requirement). No SMS, camera, contacts, location or storage permission.
- The **privacy policy page is live**: https://gunanjr.github.io/kharchi/
- Icon, feature graphic and listing text are ready in the `store` folder.

## What only you can do (nobody else can)
Accounts, money, ID checks, Play Console forms, screenshots, the test with friends, and pressing the final buttons. This guide walks through each one.

## Before you start: things to decide (5 minutes)
1. **App name and package id are permanent** after the first upload. Currently: name **BruhMe**, id **com.bruhme.app**. If you want to change them, do it **now** in the file `src/config/app.json` and tell me; do not upload first.
2. **Support email** shown to the public: currently `bollugunwanth@gmail.com`. Change it in `src/config/app.json` and in `docs/index.html` if you want another.
3. **Merchant logos inside the app** (Swiggy, Zomato and similar icons shown next to entries) are other companies' trademarks. Google can ask about this. The safe option is to show plain letter tiles instead (a one-line change I can make). **Recommended: tell me "use letter tiles" before you upload.** The store text and screenshots must never show those logos.

---

## STEP 1: Install the tools (once)
1. Open the project in VS Code, open the Terminal.
2. Check Node: type `node -v` and Enter. It must start with `v22`. If not, install Node 22 from https://nodejs.org (the LTS 22 version) and reopen VS Code.
3. Type `npm install` and Enter. Wait until it finishes.

## STEP 2: Create the free Expo account (builds the app in the cloud)
1. Go to https://expo.dev/signup and make an account (remember the username and password).
2. In the Terminal: `npx eas-cli login` → type your Expo email/username and password.
3. `npx eas-cli init` → choose your account and **Yes** to create the project. It ends with a red "project:init command failed" message about the config file. **That is normal and harmless**: the project was still created. (Done once already: project `@raiden1234/kharchi`, id `7e69bcca-2b23-4f9c-943c-b92bd786d51d`, and the id is already written into `app.config.ts`, so nothing more to do.)
4. Skip any `EAS_PROJECT_ID` cloud-variable step: the id is built into the app config. (It is not a secret.)

## STEP 3: Create the app in Google Play Console
1. Go to https://play.google.com/console and sign in with your Play developer account. (No account yet? Follow Step 3A first.)
2. Click **Create app**. Fill in:
   - **App name:** BruhMe
   - **Default language:** English (India) or English (United States)
   - **App or game:** App
   - **Free or paid:** Free (the optional Pro purchases are inside the app)
   - Tick the two declarations (policies and US export laws). Click **Create app**.

### Step 3A: only if you have no developer account yet
Go to https://play.google.com/console/signup, choose **Personal** (just you) or **Organization** (a registered company; needs a D-U-N-S number and a website). Pay US$25 once, verify your phone and email, upload your government ID, and wait for approval (1 to 3 days). You cannot continue until it says verified. Note which type you chose: personal accounts made after Nov 2023 need the 12-tester test in Step 11.

## STEP 4: First build (a "trial" build) so Play unlocks the Pro products
Google only lets you create in-app products after you upload an app that supports billing. The app also needs a licence key that Google shows **after** that. So we build twice. First time with a stand-in key:

1. In the Terminal:
   `npx eas-cli env:create --name PLAY_LICENSE_KEY --value placeholder --environment production --visibility plaintext`
2. Build: `npm run build:store-aab`
3. First time only, it asks: **"Generate a new Android Keystore?"** → press **Y** and Enter. This is your app's signing key, stored safely by Expo.
4. Wait 10 to 25 minutes. When done it prints a link to a file ending in `.aab`. Click it and **download** the file.
5. **Back up your keystore now:** `npx eas-cli credentials` → choose **Android** → **production** → **Download existing keystore** (or similar). Save the files and the passwords somewhere safe (a password manager, plus a copy on a USB stick). Losing it can lock you out of updates.

## STEP 5: Upload that build to "Internal testing"
1. In Play Console, left menu: **Test and release → Testing → Internal testing**.
2. Click **Create new release**. If it asks about **Play App Signing**, accept (**Continue**). It is Google's safe key storage.
3. Drag the downloaded `.aab` into the box. Name the release "1.0 test". Click **Next**, then **Save and publish** (internal testing needs no review).
4. Tab **Testers** → **Create email list** → add your own Gmail → save → copy the **opt-in link**. Open it on your Android phone, accept, and install BruhMe from Play. (Pro purchases will say they cannot complete yet; that is expected until Step 7 and 8.)

## STEP 6: Get Google's licence key
1. Play Console: **Monetize with Play → Monetization setup** (or **Monetize → Setup**). If it asks you to set up a **merchant (payments) profile**, do it: your business or personal name, address, bank account for payouts, tax details. Google verifies them.
2. On that page find **Licensing** and the long **base64-encoded RSA public key** (a very long line of letters and numbers). **Copy all of it** carefully.

## STEP 7: Create the three Pro products (names must be exact)
In Play Console go to **Monetize with Play → Products**.

**A. Monthly subscription** → **Subscriptions → Create subscription**
- Product ID: `bruhme_pro_monthly`  · Name: BruhMe Pro Monthly
- Add a **base plan**: ID `monthly`, **Auto-renewing**, billing period **1 month**, price **₹129** (India; you can let Google convert for other countries). **Activate**.

**B. Yearly subscription** → **Create subscription**
- Product ID: `bruhme_pro_yearly`  · Name: BruhMe Pro Yearly
- Base plan ID `yearly`, **Auto-renewing**, billing period **1 year**, price **₹999**. **Activate**.
- Add **two offers** on this base plan:
  1. Offer ID `trial` · eligibility **New customer acquisition** · phase **Free trial 7 days** · **Tag: `trial`** (the tag field is important). **Activate**.
  2. Offer ID `friend` · eligibility **Developer determined** · phase **Single payment, discounted: ₹699 for the first year** (30% off) · **Tag: `friend`**. **Activate**.

**C. Lifetime** → **One-time products → Create** (it may be called "In-app products")
- Product ID: `bruhme_pro_lifetimee` (as created in Play; the app uses this exact spelling) · Name: BruhMe Pro Lifetime · price **₹2,999** · **Activate**.

Also switch on in subscription settings, if offered: **grace period** and **account hold** (recovers failed payments automatically).

## STEP 8: Real build with the real key
1. Replace the stand-in key (paste your real key between the quotes, no spaces or line breaks):
   `npx eas-cli env:update --name PLAY_LICENSE_KEY --value "PASTE-THE-LONG-KEY" --environment production --visibility plaintext`
   (If the command says the variable is missing or asks which one, choose `PLAY_LICENSE_KEY` and `production`.)
2. Build again: `npm run build:store-aab` → download the new `.aab`. (The build number goes up by itself.)
3. In **Internal testing → Create new release**, upload the new `.aab` and publish it. Update the app on your phone from Play.
4. **Test purchases for free:** Play Console → **Settings → License testing** → add your Gmail. Now purchases on that phone are free test purchases. On the phone open **Pro → Start 7-day free trial** → complete it → Pro unlocks. Test **Restore purchases** and cancel in Play Store → Subscriptions.
   **Do not go further until a test purchase unlocks Pro.** If it fails, the usual cause is a typo in the product IDs or the key.

## STEP 9: Store listing
Play Console → **Grow users → Store presence → Main store listing**.
1. **App name:** `BruhMe: Spend & Split` · **Short description** and **Full description**: copy from the file `store/listing-en.md`.
2. **App icon:** upload `store/play-icon-512.png`. **Feature graphic:** `store/feature-graphic-1024x500.png`.
3. **Phone screenshots** (at least 2, best 6 to 8): on your phone, open BruhMe, on the last welcome screen tap **Try sample data**, then take screenshots (power + volume down): Home, Add, Insights, a group, the pay card, scanning a bill, onboarding. Do not capture any screen with company logos. Afterwards: **Settings → Export & backup → Delete everything** to clear the sample data.
4. **Save.**

## STEP 10: "App content" forms (Policy and programs → App content)
Do every item; answers:
1. **Privacy policy:** `https://gunanjr.github.io/kharchi/`
2. **App access:** All functionality is available without special access (no login).
3. **Ads:** No.
4. **Content rating:** start the questionnaire, category *Utility / Finance*, answer **No** to violence, sexual content, drugs, gambling, user-generated content etc. Expected result: Everyone / 3+.
5. **Target audience:** **18 and over** only.
6. **Data safety** (the most important form): 
   - *Does your app collect or share any of the required user data types?* The expected honest answer is **No**: records stay on the phone, BruhMe has no server, analytics or ads, and bank messages and bill photos are read on the phone only. Google Play handles payments; your Vault backup goes to a folder the user chooses, not to you.
   - If Google's questions ask about **purchase history** or **files**, read each carefully and answer for what *you* receive: nothing.
   - **This is a legal-style declaration. Re-read it against the app before you submit, and ask someone you trust if unsure.** Mistakes can get the app removed.
   - *Is data encrypted / can users request deletion:* the app has **Settings → Export & backup → Delete everything**.
7. **Financial features:** choose that the app is for **personal finance tracking / expense splitting**; it does **not** provide loans, banking, payments processing, investments or crypto.
8. **Government apps, News, Health, COVID, Advertising ID:** No / not applicable. (Advertising ID: **No**.)
9. **Account deletion URL:** not needed (there are no accounts).

## STEP 11: Closed test (only if Google requires it) then Production
1. Play Console shows on the **Dashboard** a checklist: "Run a closed test" if your account needs it.
2. **Test and release → Testing → Closed testing → Create track.** Add **12 or more testers' Gmail addresses** (friends and family; they need Android phones). Upload the same `.aab`, publish.
3. Send them the opt-in link. They must **install and keep the app installed for 14 days**. The Console shows a counter.
4. After 14 days press **Apply for production** and answer Google's short questions (how you tested, what you changed).
5. When allowed: **Production → Create new release** → upload the **latest** `.aab` → release notes "First release" → **Next → Save → Start rollout to Production**.
6. Google reviews (usually hours to 7 days) and emails you.

If your account does **not** need the closed test, skip to point 5.

## STEP 12: After launch
- **Updates later:** raise `version` in `app.config.ts` (for example `1.0.1`), run `npm run build:store-aab`, upload the new file in **Production → Create new release**.
- **Reviews:** answer them in **Quality → Ratings and reviews**.
- **If Google rejects something:** read the email, fix what it names, and resubmit. Most rejections are about the Data safety form, the policy page, screenshots with logos, or missing store text.

---

## If something goes wrong
| Problem | What to do |
|---|---|
| Build fails with "PLAY_LICENSE_KEY is required" | Step 4.1 / Step 8.1: the cloud variable is missing. Run the `env:create` command again. |
| Build fails with "project not configured" or asks which project | Make sure `npx eas-cli whoami` shows `raiden1234`, and that `app.config.ts` contains the project id from Step 2.3. |
| "Package name already exists" in Play | Someone else uses `com.bruhme.app`. Tell me; I change it and rebuild. |
| Pro purchase says "could not complete" | Product IDs or the licence key are wrong, or the phone's Gmail is not a licence tester or internal tester (Step 8.4). |
| Privacy link shows 404 | https://github.com/gunanjr/kharchi → Settings → Pages → Branch `main`, folder `/docs`. |
| Lost the keystore password | `npx eas-cli credentials`. Play App Signing can also help recover. Keep backups (Step 4.5). |
| "App crashed" in tests | Send me the phone model and what you tapped. |

## Honest limits
- I could not do the account steps, payments, the Play forms or the tester period. They are yours.
- I tested on an emulator, not on your phone. Please also test on a real phone in Step 8.4: real printed bills, the widgets, reminders, app lock, and a free test purchase.
- Bill scanning accuracy depends on the photo. Always check the total before saving a split.
- Google makes the final decision on every submission; a review can ask for changes.
