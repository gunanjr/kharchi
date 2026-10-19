# Bill scanning: research, design and limits

**What it does:** at a supermarket or restaurant you snap the bill (from the *Scan bill* home-screen widget, the long-press shortcut, or inside the app). The app reads the items **on your phone**, and later, when everyone is together, you tap who had what. Tax, service charge, round-off and discounts are shared in proportion. The result is a normal itemised group expense; your share also lands in your personal tracker, and the photo is attached to the expense.

## Research summary: choices and why

### 1. Reading the photo (OCR)
| Option | Verdict |
|---|---|
| **Google ML Kit Text Recognition, bundled Latin model** | **Chosen.** Runs fully on the device, works with the internet permission removed, no Play-Services model download, good accuracy on printed receipts, returns every line with its position (needed to rebuild the receipt's columns). ~4-5 MB per CPU architecture |
| ML Kit "unbundled" model | Rejected: downloads a model over the network at runtime |
| Cloud OCR / AI vision (Google Vision, Claude, GPT) | Rejected for v1: would upload financial photos and require an internet permission and a backend. Best accuracy on crumpled bills, so a possible **opt-in** later |
| Tesseract | Rejected: slower and clearly less accurate on thermal-paper receipts and phone photos |
| Apple Vision | iOS only; the product targets Android |

### 2. Taking the photo
The app opens the phone's **own camera app** with a standard image-capture intent and a private file target. The app therefore **never touches the camera and declares no CAMERA permission.** Choosing from the gallery uses Android's system photo picker (no storage permission; the app only receives the one photo you pick). Photos are stored in the app's private folder, auto-rotated and shrunk to ≤2400 px.

### 3. Turning text into items (pure TypeScript, unit-tested)
Receipts are tables, but OCR returns fragments, so:
1. **Rebuild rows from boxes**: fragments whose vertical centres are within ~55% of the text height join one row (tolerates camera tilt); left-to-right order. (`src/features/bills/rows.ts`)
2. **Parse each row from the right**: the last number with two decimals is the line amount; numbers before it are rate / quantity / HSN (4-8 digit codes are dropped); `qty × rate ≈ amount` is checked to tell them apart; leading restaurant quantities ("2 Butter Naan 40.00 80.00") and "2 x" forms are handled; weight lines ("0.850 KG 40.00 34.00") too. Two-line items (name, then numbers on the next row) are merged. (`parse.ts`)
3. **Skip non-items**: totals, GST/CGST/SGST/cess, discounts, payment lines, GSTIN/phone/invoice/table/cashier rows, "total items/qty".
4. **Find the payable total** with priority *Net amount / Amount payable / Grand total* > *Total*; ignore *Sub total*, savings, tax and round-off lines.
5. **Tax / discount / round-off = total − sum(items)**, never summed from the printed GST lines, because many Indian bills print GST as an *included* breakdown and adding it would double count.
6. OCR slips are repaired inside number tokens (`5O.00` → `50.00`, `85,00` → `85.00`). Whole-rupee-only bills are accepted when the bill has no decimals. Warnings (no items, total unreliable, items missing/exceed total) tell the user to check.
**Tested** on 5 synthetic receipt styles (DMart-style supermarket, restaurant with GST + service charge, café with discount, handwritten-style kirana, two-line items), plus OCR-slip and box-grouping tests.

### 4. Assigning items: "tags"
Chosen model (fast, no hidden gestures): under every item a row of **person chips** (members of the chosen group) plus **Everyone**. Tap one = that person's item; tap several = shared **equally**; at the top, *Split the rest equally* assigns everything left. Live "each person pays" preview and a counter ("3 left") so nothing is forgotten; Save stays disabled until every item has an owner. Names and prices are editable and items can be added or removed, so OCR errors are easy to fix. *Considered and left out:* uneven shares per item (use two items instead), drag-and-drop (bad on small screens), voice assignment.

### 5. Money rules
Integer paise; the bill total is what was paid; `extra = total − items`; positive extra (tax, service charge, round-off) is allocated in proportion to each person's item subtotal; **negative extra (discount)** reduces each person proportionally (new in the split engine, with tests); largest-remainder rounding guarantees shares always sum **exactly** to the total (property-tested on 200 random bills).

## Flow
`Widget / shortcut / in-app` → **Scan a bill** panel (drops from the top) → *Take photo* or *Gallery* → saved as a **waiting bill** (Home card "1 bill waiting to be split", More → Saved bills) → open it later → on-device OCR (a few seconds) → review, pick group and payer, assign items → **Split** → group expense (with receipt photo) + your share in the tracker.

## Privacy
Photos and OCR stay on the phone. Only the parsed fields (store, total, items, date) are stored; the raw OCR text is never saved. The store build has no internet permission, so nothing can be uploaded. The ML Kit library's own log-uploader components are removed from the manifest; `npm run audit:manifest` fails the build if they or any other telemetry reappear.

## Limits (honest)
- Quality depends on the photo: flat, well lit, whole bill in frame. Crumpled or very faded thermal paper may need manual fixes.
- Latin script only (English/transliterated Hindi). Devanagari receipts would need the extra ML Kit model.
- Very unusual layouts (multi-column menus, handwritten bills) may need edits. Always check the total line before pressing Split.
- Scanning needs the installed app. In Expo Go the buttons are disabled; use *Try a sample supermarket bill* or *Paste bill text* to try the assignment flow.
- Verified on an Android 16 emulator with a synthetic receipt; real-world accuracy on printed bills should be checked on your phone.
