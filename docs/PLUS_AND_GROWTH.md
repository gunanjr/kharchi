# Plus, growth and the "no new review" rule

Written for: the owner. What was added beyond the base app, who benefits, and the boundaries that keep Play review simple.

## The boundary (do not cross without reading `docs/PLAY_POLICY.md` again)
Everything added stays inside the Privacy-First store edition:
- no new Android permission, no network, no SMS, camera, contacts, location, microphone
- no payment code, no account, no analytics or crash SDK, no ads
- nothing stored or processed on a server
- no financial advice: the health score is arithmetic on the user's own entries and says so on screen

Receipts use the system file chooser (no storage permission). Sharing uses the system share sheet. Feedback opens the user's own mail app. Because nothing here needs a new permission or declaration, the existing Data safety answers ("collects nothing, shares nothing") and the financial-features answers remain true.

## Free forever (unchanged promise)
Adding and editing entries, unlimited groups and every split type, budgets, recurring, standard insights, the offline assistant, tags, search, CSV, backup, app lock, dark mode, and two savings goals.

## Kharchi Plus (local switch, no billing yet)
| Feature | Why a user pays for it |
|---|---|
| Unlimited savings goals (free: 2) | People with a trip, a phone and an emergency fund at once hit the limit quickly |
| Money health score | A reason to open Insights every month, with one concrete thing to improve |
| Monthly review card, shareable | The most shareable object in the app; each share is free marketing |
| Receipt vault | Warranty and reimbursement proof next to the transaction |
| Accent colours | Cheap to build, visible every second |

`src/features/entitlements` holds the rules. `Settings, Kharchi Plus` has a preview switch so testers can use every Plus feature. **Billing is intentionally not built** (see `docs/DECISIONS.md` item 20). When it is, implement `Entitlements` with purchase-token validation; no screen changes. A real subscription adds Play Billing review, subscription disclosure and refund policy: plan that as its own release.

## What the owner gets
- **Conversion surfaces already in place:** a Plus banner on More, locked previews on Insights, Goals and Receipts, and one clear Plus screen. Each says what is free so trust stays high.
- **Organic growth without tracking:** the monthly review card carries "Made with Kharchi"; Share Kharchi in More opens the system share sheet with no link to invent.
- **Support without a backend:** Send feedback opens a pre-addressed email to `supportEmail`.
- **Store assets for free:** Developer, Load complete demo fills every screen (spending with tags, six accounts, budgets, goals, three groups using every split type with comments, bank messages waiting). Use it for screenshots and for the Play reviewer.
- **Measuring without analytics:** use Play Console vitals, install and uninstall counts, ratings and the feedback inbox. Adding any analytics SDK would change the Data safety answers and the privacy policy; do not.

## Other changes in this pass
- New look "Ink & Marigold" (`.interface-design/system.md`), floating tab capsule, one icon language.
- Home: safe-to-spend today with a 7-day rhythm, accounts strip, goals, coming-up recurring items.
- Tags (add, edit, filter), comments on shared expenses, goals, monthly review, health score, receipts.
- Fixed: reopening a saved exact, percent, shares, adjustment or itemised shared expense used to show empty boxes.

## Still to do by a human
Name and app id in `src/config/app.json`, Play account and forms, a real-device pass (reminders, the Quick add and Scan bill widgets, bill scanning, biometric lock, file picker on Android), and the decision on when to build billing.

## Low-friction capture (added after the ChatGPT brief was reviewed)
- **Share to Kharchi** now opens a review screen (`/import-review`) instead of leaving the item in the Home queue. Cold start and already-running both work (native `OnNewIntent` plus `OnActivityEntersForeground`, picked up by `useAppBootstrap`). Duplicates are caught by the existing fingerprint; unsupported text shows a message and creates nothing. Message text is never stored (hash only).
- **Say it** (`/voice`): the user dictates with the keyboard's own microphone key or types; a deterministic parser (`features/voice/parse.ts`) turns it into one reviewable draft per amount. Kharchi never asks for the microphone (`RECORD_AUDIO` stays blocked), never records, sends nothing. If the keyboard's dictation uses Google's service, that is the keyboard's behaviour, not Kharchi's; do not describe this feature as "offline".
- **One review step** (`features/capture/DraftEditor.tsx`) for share, paste and voice: big amount, editable description and category, an honest label of where the category suggestion came from (your earlier choices, your always-rule, or "guessed from the words"), Save or Discard, Undo after saving, double-tap protection.
- **Deliberately not done:** native speech recognition (needs Kotlin that cannot be built or verified here, and a possible permission), screenshot OCR (heavy native dependency, high wrong-amount risk), accessibility or notification listeners (policy risk). Revisit OCR only after a store release is live.
- **No manifest change**, no new dependency, no new permission. Data safety and privacy policy answers are unchanged.
