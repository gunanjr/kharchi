# Business plan: production architecture, pricing and unit economics

All figures are **planning assumptions**, not quotes or forecasts. Replace with real numbers as you measure them.

## 1. Product and architecture (what is built)
Local-first React Native (Expo) app: SQLite on the device, deterministic calculations, an offline rule-based assistant. **No financial-data backend, no cloud database, no cloud AI, no analytics, no accounts, no bank integrations.** Distribution: Google Play. Recurring infrastructure cost for the financial product: **₹0**.
Not built (do not claim): cloud sync, multi-device, remote AI, Account Aggregator, billing.

## 2. Offer
| Tier | Price (hypothesis) | Contents |
|---|---|---|
| **Free** (v1.0, shipping) | ₹0 | Manual tracking, quick add, paste/share import, unlimited group splitting, budgets, standard insights, offline assistant, CSV import/export, backup |
| **Plus Annual** (later) | ₹499/year | Only features that are implemented, tested and clearly better than free: e.g. longer history comparisons, advanced reports, richer exports |
| **Plus Monthly** (later) | ₹79/month | Same as Plus Annual |
Rules: group splitting stays free. Do not promise cloud sync or remote AI until they exist. **No paywall in v1.0**: `src/features/entitlements` is the (inert) hook where Plus gating will attach.

## 3. Costs (monthly, founder-operated)
| Expense | Lean launch | Early growth |
|---|---|---|
| Hosting/backend | ₹0 (static privacy page on GitHub Pages) | ₹0–₹2,000 |
| Crash monitoring | ₹0 (use Play Console vitals) | ₹500–₹2,000 |
| Support tools | ₹0–₹500 | ₹500–₹1,500 |
| Creative tools | ₹0–₹2,000 | ₹2,000–₹5,000 |
| Paid ads | ₹0–₹10,000 | ₹10,000–₹50,000 |
| Misc testing/ops | ₹1,000–₹3,000 | ₹2,000–₹5,000 |
| **Total** | **₹1,000–₹15,500** | **₹15,000–₹65,500** |
One-off: Google Play developer fee US$25. Excludes taxes, legal/accounting, salaries.

## 4. Revenue and break-even (illustrative 15% store fee)
Net per annual subscriber ≈ ₹499 × 0.85 = **₹424.15/year ≈ ₹35.35/month**.
| Active annual subscribers | Gross annual sales | After 15% fee |
|---|---|---|
| 100 | ₹49,900 | ₹42,415 |
| 500 | ₹2,49,500 | ₹2,12,075 |
| 1,000 | ₹4,99,000 | ₹4,24,150 |
| 5,000 | ₹24,95,000 | ₹21,20,750 |
Break-even subscribers (even-spread approximation): ₹5,000/month ≈ 142; ₹10,000 ≈ 283; ₹30,000 ≈ 849. Add acquisition spend on top. Google's real fee depends on the programme; verify before relying on 15%. Annual cash arrives at purchase time, not monthly; taxes and refunds are extra.

## 5. Growth discipline
First 30-60 days: organic content + at most ₹5,000-₹10,000 paid test after launch. Measure first-use completion, day-7 and day-30 retention, paid conversion (once Plus exists). Scale spend only when revenue per acquired user exceeds acquisition cost. Use Play Console aggregate metrics instead of an analytics SDK.

## 6. Subscription implementation plan (when ready)
1. Define 2-3 real Plus features and implement them behind `Entitlements`.
2. Integrate Google Play Billing (adds `BILLING` + `INTERNET` permission and a Data safety/privacy-policy update).
3. Validate purchase tokens with Google's Play Developer API from a minimal server or managed service that sees **only purchase tokens**, never transaction data. Local-only entitlement state is not secure (reinstall/restore).
4. Handle restore purchases, grace period, cancellation, refunds. Test with Play's licence-tester accounts and test tracks.
5. Update Data safety (purchase history) and the privacy policy **before** release.
If you cannot test billing properly, ship free and add Plus later.

## 7. Compliance reminders
Google Play: developer verification, Data safety, privacy policy, target API 36+ (as of 19 Oct 2026), account-type testing rules (12 testers / 14 days for new personal accounts). Business: GST/income-tax and consumer-law obligations apply to your operations once you earn revenue; consult an accountant. Do not publish as a personal account while misrepresenting a company, or the reverse.
