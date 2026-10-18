# Google Play: SMS permissions, policy notes and submission drafts

> **Approval is not guaranteed.** Google restricts SMS permissions heavily and decides case by case. Treat the `lite` variant as the plan that is always shippable, and `full` as a stretch goal. This document is engineering guidance, not legal advice.

## 1. The policy in short
- `READ_SMS`, `RECEIVE_SMS`, `SEND_SMS`, `RECEIVE_MMS`, `RECEIVE_WAP_PUSH` are **restricted permissions** ("SMS and Call Log permissions" policy). They may only be used by an app that is the user's **default SMS, Phone or Assistant handler**, unless the app qualifies for a documented **exception** and Google approves the **Permissions Declaration Form**.
- Apps must also not derive SMS content through alternative APIs (for example by reading the same text from notifications or accessibility services) to get around the restriction.
- Personal and sensitive data must be handled under the User Data policy: prominent in-app disclosure, a privacy policy, minimal collection, secure handling.
- Apps in the expense-tracking space have seen **mixed outcomes**: some approved for a narrow "bank transaction alerts" use case, some rejected and asked to use alternatives.
- Sideloaded APKs that request SMS permissions can trigger a **Play Protect warning** ("app may be harmful / unrecognised developer"). The user can tap "More details → Install anyway". USB installs and development builds are unaffected.

## 2. How this app is built around the policy
| Concern | What the code does |
|---|---|
| Least privilege | Only `RECEIVE_SMS` is declared. `READ_SMS` is **not** requested; the app never reads the inbox. |
| Prominent disclosure | `src/app/disclosure/[kind].tsx` is shown before the runtime dialog and says what is read, ignored, kept, that nothing is uploaded, and how to revoke. |
| On-device only | Kotlin prefilter drops non-financial messages immediately (never stored/logged). Parsing is local. Raw text is deleted after parsing; only parsed fields + a hash remain. |
| Graceful denial | App is fully usable without SMS: manual, quick add, share-to-app, paste, CSV import. |
| Alternative API risk | The **NotificationListener** source is separate, opt-in, limited to a fixed list of UPI/bank apps, and **excluded from the `lite` build**. Consider removing it from any Play submission of `full` if the SMS declaration is questioned. |
| Variants | `APP_VARIANT=full` includes the permission, receiver, listener, detector. `APP_VARIANT=lite` strips all of them from the manifest (verified by the config plugin). |

## 3. Draft: Permissions Declaration Form answers (`full` variant)
**Which permission?** RECEIVE_SMS.
**Core functionality:** The app's core purpose is automatic personal expense tracking. Banks send a transaction alert SMS for each debit/credit; the app detects these alerts on-device, extracts the amount and merchant, and asks the user "What was this for?" so the expense is logged in seconds without manual typing.
**Why is a default-handler exception needed?** Receiving the bank's own alert is the only reliable, real-time source of the transaction. Account Aggregator / bank APIs are not available to individuals at this scale; notification scraping is not an acceptable alternative under policy.
**Which exception applies?** Our submission relies on the "core functionality of the app requires SMS" review path; we do not claim default-handler status. (Check the current exception list in the Play Console form: the available options change. If none fits, do not submit `full` to Play.)
**Data handling:** Messages are processed on the device. Non-financial messages are discarded instantly. Message text is not stored after parsing, not logged and not transmitted. Only the user's confirmed transactions remain on the device.
**Disclosure:** Prominent in-app disclosure precedes the permission dialog (see screenshots).
**Demo video script (≤ 2 min, upload as unlisted YouTube):**
1. (0:00) Fresh install, open app, show onboarding "Private by design".
2. (0:10) Settings → Bank & UPI messages. Show the full-screen disclosure; read it aloud; tap "Agree and continue".
3. (0:30) Show the standard Android "Allow Kharchi to send and view SMS messages?" dialog; tap Allow.
4. (0:40) Close the app. From another phone/emulator (`adb emu sms send HDFCBK "Rs.450.00 debited from a/c **1234 ... to VPA swiggy@ybl"`), send a bank alert and an OTP message.
5. (0:55) Show the notification "Spent ₹450 at Swiggy. What was this for?" only for the bank alert, none for the OTP. Reply "lunch" inline.
6. (1:15) Open the app: the expense is saved. Show Settings → Privacy and "Delete all my data".
7. (1:40) Show revoking the permission in Android Settings and that the app still works (manual add).

## 4. Data Safety form (draft answers)
- **Data collected / shared:** *No data collected*, *no data shared* in the offline build (everything stays on the device). If backend sync is later enabled: declare Financial info (user-initiated transactions), Personal info (name, optional phone) as "collected, encrypted in transit, user can request deletion", **not** SMS content.
- **SMS or MMS:** processed on-device, not collected (processing that never leaves the device is not "collection"; keep this wording consistent with the privacy policy).
- **Security:** data encrypted in transit (when sync exists); users can request deletion (in-app "Delete all my data").
- **Permissions declared:** RECEIVE_SMS, POST_NOTIFICATIONS, USE_BIOMETRIC, BIND_NOTIFICATION_LISTENER_SERVICE (full), FOREGROUND_SERVICE_SPECIAL_USE (full, experimental detector; also needs a Play justification, consider removing from store builds).

## 5. Privacy policy text (host at a public URL, link in Play Console)
> **Kharchi Privacy Policy**
> *Last updated: <date>.*
> Kharchi is an expense tracker and bill-splitting app that works on your device. **We do not run servers that receive your data.**
> **What the app accesses.** With your permission, the app receives bank and UPI transaction text messages and (optionally) notifications from payment apps, solely to create expense entries. Messages that are not bank or UPI transactions, such as OTPs, promotions and personal chats, are discarded immediately and never stored or logged.
> **What is stored.** On your phone only: amount, merchant, account last four digits, date, your category/notes, and a one-way hash of each message to prevent duplicates. The message text is deleted after it is understood.
> **What is shared.** Nothing. Messages and transactions are never uploaded.
> **Optional cloud features.** If a future version offers sync or sharing groups, it will be opt-in, will tell you exactly what is sent, and will never include raw messages.
> **Your choices.** Revoke SMS or notification access in Android Settings at any time; restrict which sender IDs are read; export your data; delete everything with "Delete all my data".
> **Children.** Not directed to children under 13.
> **Contact.** <your email>.

## 6. The `lite` fallback plan (use if the declaration is rejected)
1. Build: `APP_VARIANT=lite eas build --profile production-lite` (AAB).
2. Capture sources that remain: **Share-to-app** (select a bank SMS → Share → app), paste from clipboard, manual entry, Quick Add (tile, shortcut, widget), CSV / bank-statement import, and the regulated **Account Aggregator** path (`AccountAggregator` interface in `src/features/aggregator`, currently mocked).
3. Store listing for lite: do not promise "automatic SMS reading"; promise "paste or share a bank message, done in 2 seconds".
4. Keep distributing `full` as a signed APK from your own site / GitHub releases for power users, with a note about the Play Protect prompt.
