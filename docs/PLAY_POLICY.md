# Google Play: policy position, declarations and answers

> This is engineering guidance, not legal advice. Google makes the final decision on every submission.

## 1. The position: Privacy-First edition (the default production build)
Kharchi ships on Google Play as a **local-first app with the fewest sensitive permissions**:
- **No SMS permission, no SMS receiver, no notification listener, no background sensors.** Therefore **no SMS Permissions Declaration Form** and no "default SMS handler" question.
- **No INTERNET permission** in the store build (`STORE_BUILD=1`): the app cannot transmit data.
- **No bank integration, no Account Aggregator, no backend, no cloud AI, no analytics, no ads, no accounts.**
- Transactions come from: manual entry, Quick Add and Scan bill (widgets / shortcuts); **photo of a bill** taken with the phone's own camera app or chosen with the system photo picker, read on-device, **paste or share of a bank message** (user-initiated, parsed on-device, user confirms), CSV import.

What you still owe Google (cannot be skipped): developer verification, Data safety form, public privacy policy, store listing, content rating, declarations, testing track, and a build targeting API 36+.

## 2. What the production bundle contains (verified by `npm run audit:manifest`)
Permissions in the final APK: `POST_NOTIFICATIONS` (optional, for user-set reminders), `USE_BIOMETRIC` (optional app lock), `VIBRATE`, `RECEIVE_BOOT_COMPLETED` (re-arm user reminders after reboot). That's all.
Explicitly absent: SMS, contacts, location, camera, microphone, storage, internet, network state, overlay, foreground service, push (FCM), install referrer.
Components: launcher activity, quick-panel activity, two home-screen widgets (Quick add, Scan bill), reminder receiver, boot receiver, a private FileProvider (lets the system camera save a bill photo into the app's own folder). Target SDK 36.
`allowBackup=false` so financial data is not auto-copied to Google Drive.
The audit script **fails the build** if a forbidden permission/component appears.

## 2b. Bill scanning and the Data safety form
Reads receipts with **Google ML Kit text recognition (bundled model, on-device)**. No camera/storage permission is declared (system camera app + system photo picker). ML Kit's log-uploader components are removed and the store build has no INTERNET permission, so nothing leaves the device. In Play Console's Data safety form, answer "No data collected/shared"; if Google's SDK declarations flow asks about ML Kit, state it is used for on-device processing only. Re-verify by running `npm run audit:manifest` on the final build and keep the ML Kit version current.

## 3. Data safety form: answers
- *Does your app collect or share any of the required user data types?* **No.**
  Reason: all data stays on the device; Google's guidance treats data processed only on-device and never sent off the device as not collected. The store build has no internet permission and no third-party SDKs.
- *Is all of the user data collected by your app encrypted in transit?* Not applicable (no data collected).
- *Do you provide a way for users to request that their data is deleted?* Not applicable (no data collected); in-app "Delete all my data" exists anyway.
- Re-check this form if you ever add sync, analytics, crash reporting, ads or billing (see section 6).

## 4. Other Play Console declarations
| Item | Answer |
|---|---|
| Privacy policy URL | `https://gunanjr.github.io/kharchi/` (GitHub Pages from `/docs`). Also linked inside the app: Settings → Privacy |
| Ads | No |
| App access | All functionality available without login |
| Target audience | 18+ |
| Content rating | Everyone (answer No to violence, sexual content, gambling, etc.) |
| Financial features | Personal finance / expense tracking & bill splitting. Does **not** provide loans, banking, payments processing or investments |
| Government / news / health / COVID | No |
| Advertising ID | No |
| Target API | 36 (set in `app.config.ts`, audited) |
| Account type | Personal is fine for a local-first app; Organisation needs D-U-N-S and website verification. Never misrepresent the publisher. New personal accounts: closed test with 12+ testers for 14 days before production access |

## 5. Why paste/share does not trigger SMS policy
Google restricts apps that **request** SMS/Call Log permissions. Share and paste use Android's standard share sheet and clipboard: the user hands the app one message they chose, the app holds no SMS permission, and nothing runs in the background. This is the policy-safe route Google's own guidance points to when a permission is not essential.

## 6. If you later add things, redo the privacy work first
| Addition | What changes |
|---|---|
| Google Play Billing (Plus) | Add INTERNET + `BILLING` permission; Data safety: purchase history handled by Google; privacy policy text; validate purchase tokens server-side without sending finance data. See `docs/BUSINESS_PLAN.md` |
| Crash reporting / analytics | New SDK = Data safety "collected" entries, disclosure, scrubbing of amounts/merchants. Defer until needed |
| Cloud sync / remote AI | Full re-declaration; see `docs/supabase-draft.sql`; never sync raw messages |
| Re-enabling SMS (`production-full` profile) | See Appendix |

## Appendix: the optional Full (SMS) edition (not the default)
Built with `eas build --profile production-full` (`APP_VARIANT=full`). Adds `RECEIVE_SMS` + the receiver + notification replies. Google restricts SMS permissions to default SMS/Phone/Assistant handlers unless an exception is approved through the **Permissions Declaration Form**; approval is **not guaranteed** and outcomes for expense apps have been mixed. Sideloaded APKs requesting SMS can trigger a Play Protect warning (user taps "More details → Install anyway"; USB/dev builds unaffected).
Draft declaration text: core purpose is automatic personal expense tracking; bank alert SMS are parsed on-device, non-financial messages discarded instantly, nothing stored or transmitted; prominent disclosure precedes the runtime dialog (`src/app/disclosure/[kind].tsx`). Demo-video outline: show disclosure → Allow dialog → send a bank alert and an OTP from another phone → notification only for the bank alert → reply inline → saved in app → revoke permission and show the app still works.
Only pursue this after the privacy-first edition is live and you have users who ask for it.
