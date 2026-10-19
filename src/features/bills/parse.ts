import { titleCase, extractTimestamp } from '@/features/parser/sms';
import type { BillItem, ParsedBill } from './types';

/* ------------------------------------------------------------------ helpers */

const UNIT = /^(?:kg|kgs|g|gm|gms|ltr|ltrs|l|ml|pc|pcs|nos|no|unit|units|pkt|x|@)$/i;
const NUM = /^(?:rs\.?|₹)?-?\d[\d,]*(?:[.,]\d+)?$/i;

/** Fix common OCR slips inside tokens that are clearly numbers: O->0, l/I->1, "265,00" -> "265.00". */
function fixNumberToken(t: string): string {
  let s = t.replace(/^(?:rs\.?|₹)/i, '');
  if (/^-?[\dOolI][\dOolI,.]*$/.test(s) && /\d/.test(s)) s = s.replace(/[Oo]/g, '0').replace(/[lI]/g, '1');
  // decimal comma: "265,00" (2 digits after the comma and no thousands grouping before) -> "265.00"
  if (/^-?\d+,\d{2}$/.test(s)) s = s.replace(',', '.');
  return s;
}

function isNumberToken(t: string): boolean {
  return NUM.test(fixNumberToken(t));
}

function toMinor(s: string): number | null {
  const clean = fixNumberToken(s).replace(/,/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(clean)) return null;
  const neg = clean.startsWith('-');
  const [w, f = ''] = clean.replace('-', '').split('.');
  const v = Number(w) * 100 + Number(f.slice(0, 2).padEnd(2, '0'));
  return Number.isSafeInteger(v) ? (neg ? -v : v) : null;
}

const hasDecimals = (t: string) => /[.,]\d{2}$/.test(fixNumberToken(t));

/* -------------------------------------------------------------- row classes */

const TOTAL_WORDS =
  /\b(sub\s*-?\s*total|total|grand|net\s*(?:amt|amount|payable)|amount\s*(?:payable|due)|payable|round(?:ing)?\s*off|cgst|sgst|igst|utgst|gst|vat|cess|tax(?:es)?|discount|disc|saving|saved|coupon|service\s*charge|packing|delivery|tip|cash|card|upi|paytm|gpay|phonepe|change|tendered|balance|received|paid|payment|mode|mrp\s*total|you\s*save)\b/i;
const NOISE_ROW =
  /\b(gstin|gst\s*no|fssai|cin|phone|ph|tel|mob|mobile|invoice|inv\.?|bill\s*(?:no|number|#)|cashier|customer|thank|visit|welcome|address|www\.|\.com|hsn|sac|description|particulars|qty\s*rate|item\s*(?:name|description)|sl\.?\s*no|terms|exchange|return|store|branch|counter|table|steward|pos\b|order\s*(?:no|id)|token|kot|date|time)\b/i;
const COUNT_ROW = /\b(total\s*(?:qty|items?|quantity)|items?\s*(?:count|sold|purchased)|no\.?\s*of\s*items|qty\s*total)\b/i;

/** Priority for choosing the payable total (higher wins). */
function totalPriority(row: string): number {
  if (COUNT_ROW.test(row) || /\bsub\s*-?\s*total\b/i.test(row)) return 0;
  if (/\b(saving|saved|you\s*save|discount|disc|mrp\s*total|tax|gst|cgst|sgst|igst|cess|round)\b/i.test(row)) return 0;
  if (/\b(net\s*(amt|amount|payable)|amount\s*(payable|due)|grand\s*total|bill\s*(amt|amount)|total\s*payable)\b/i.test(row)) return 3;
  if (/\btotal\b/i.test(row)) return 2;
  if (/\bpayable\b/i.test(row)) return 2;
  return 0;
}

/* ------------------------------------------------------------- item parsing */

interface RowItem {
  name: string;
  amount: number;
  qty: number | null;
  rate: number | null;
}

function cleanName(raw: string): string {
  let s = raw
    .replace(/^\s*\d{1,3}[.)]\s+/, '') // serial "1." / "01)"
    .replace(/\b\d{6,8}\b/g, ' ') // HSN-like codes
    .replace(/[|_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.\-*:,]+|[\s.\-*:,]+$/g, '')
    .trim();
  s = s.replace(/\bM\.?R\.?P\.?\b.*$/i, '').trim();
  if (s.length > 40) s = s.slice(0, 40).trim();
  return s === s.toUpperCase() ? titleCase(s) : s;
}

/** Parse one printed row as an item, or null if it is not one. `allowInt` accepts whole-rupee prices. */
export function parseItemRow(row: string, allowInt = false): RowItem | null {
  const tokens = row.trim().split(/\s+/);
  if (tokens.length < 2) return null;
  // collect the numeric tail (right to left), tolerating unit words and x/@ connectors
  let i = tokens.length;
  const tail: string[] = [];
  while (i > 0 && (isNumberToken(tokens[i - 1]) || UNIT.test(tokens[i - 1]))) {
    tail.unshift(tokens[--i]);
    if (tail.length > 7) break;
  }
  const head = tokens.slice(0, i);
  const nums = tail.filter(isNumberToken);
  if (!nums.length) return null;
  const amountTok = nums[nums.length - 1];
  if (!hasDecimals(amountTok) && !allowInt) return null;
  const amount = toMinor(amountTok);
  if (amount === null || amount <= 0 || amount > 10_000_000_00) return null;

  // numbers before the amount: hsn / qty / rate in some order
  const before = nums.slice(0, -1);
  let qty: number | null = null;
  let rate: number | null = null;
  const rest: string[] = [];
  for (const t of before) {
    const v = fixNumberToken(t);
    if (/^\d{4,8}$/.test(v)) continue; // HSN
    rest.push(t);
  }
  const qtyOf = (t: string) => {
    const n = Number(fixNumberToken(t).replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 && n < 1000 ? n : null;
  };
  if (rest.length >= 2) {
    const q = qtyOf(rest[rest.length - 2]);
    const r = toMinor(rest[rest.length - 1]);
    if (q !== null && r !== null && Math.abs(q * r - amount) <= Math.max(2, amount * 0.02)) {
      qty = q;
      rate = r;
    } else {
      const r2 = toMinor(rest[rest.length - 2]);
      const q2 = qtyOf(rest[rest.length - 1]);
      if (r2 !== null && q2 !== null && Math.abs(q2 * r2 - amount) <= Math.max(2, amount * 0.02)) { qty = q2; rate = r2; }
    }
  } else if (rest.length === 1) {
    const t = rest[0];
    if (hasDecimals(t)) {
      const r = toMinor(t);
      if (r !== null) {
        rate = r;
        if (r > 0 && Math.abs(amount % r) <= 2) qty = Math.round(amount / r);
        else if (r > 0) qty = Math.round((amount / r) * 1000) / 1000;
      }
    } else qty = qtyOf(t);
  }

  // leading quantity in restaurant style: "2 Butter Naan 40.00 80.00" / "2 x Dosa 60.00"
  let nameTokens = head.filter((t) => !UNIT.test(t) || t.length > 2);
  const lead = nameTokens[0] && /^\d{1,2}$/.test(nameTokens[0]) ? Number(nameTokens[0]) : null;
  if (lead !== null && nameTokens.length > 1) {
    if (rate !== null && qty === null && Math.abs(lead * rate - amount) <= Math.max(2, amount * 0.02)) qty = lead;
    if (rate === null && rest.length === 0) qty = null; // "1 Coke 40.00": serial number, ignore
    nameTokens = nameTokens.slice(1);
    if (nameTokens[0] && /^[xX@]$/.test(nameTokens[0])) nameTokens = nameTokens.slice(1);
  }
  const name = cleanName(nameTokens.join(' '));
  if (!/[A-Za-zऀ-ॿ]{2,}/.test(name)) return null;
  return { name, amount, qty, rate };
}

/* -------------------------------------------------------------- the parser */

let uid = 0;
const nextId = () => `bi${Date.now().toString(36)}${(uid++).toString(36)}`;

export function parseBillRows(rowsIn: string[], now = Date.now()): ParsedBill {
  const rows = rowsIn.map((r) => r.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const warnings: string[] = [];

  // store name: first plausible heading row
  let store: string | null = null;
  for (const r of rows.slice(0, 6)) {
    if (/[A-Za-z]{3,}/.test(r) && !NOISE_ROW.test(r) && !TOTAL_WORDS.test(r) && !/\d{5,}/.test(r) && !parseItemRow(r)) {
      store = cleanName(r.replace(/\b(pvt|ltd|limited|private)\b\.?/gi, '').trim());
      if (store.length >= 3) break;
      store = null;
    }
  }

  // date
  let date: number | null = null;
  for (const r of rows) {
    if (/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[- ]?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[- ,]*\d{2,4}\b/i.test(r)) {
      const t = extractTimestamp(r, 0);
      if (t > 0) { date = t; break; }
    }
  }

  const decimalRows = rows.filter((r) => { const last = r.split(' ').pop() ?? ''; return isNumberToken(last) && hasDecimals(last); }).length;
  const allowInt = decimalRows < 2; // handwritten / simple bills with whole-rupee prices

  // total (net payable)
  let total: number | null = null;
  let best = 0;
  rows.forEach((r) => {
    const p = totalPriority(r);
    if (p === 0) return;
    const nums = r.split(' ').filter((t) => isNumberToken(t) && (hasDecimals(t) || allowInt)).map(toMinor).filter((n): n is number => n !== null && n > 0);
    if (!nums.length) return;
    if (p >= best) { best = p; total = nums[nums.length - 1]; }
  });

  // items
  const items: BillItem[] = [];
  let pendingName: string | null = null;
  for (let k = 0; k < rows.length; k++) {
    const r = rows[k];
    const skip = TOTAL_WORDS.test(r) || NOISE_ROW.test(r) || COUNT_ROW.test(r);
    if (skip) { pendingName = null; continue; }
    const it = parseItemRow(r, allowInt);
    if (it) {
      items.push({ id: nextId(), name: it.name, amount: it.amount, qty: it.qty, rate: it.rate });
      pendingName = null;
      continue;
    }
    // two-line item: name on this row, numbers on the next
    if (/^[A-Za-zऀ-ॿ][^\d]{2,}$/.test(r) || (/[A-Za-z]{3,}/.test(r) && !/\d[.,]\d{2}\b/.test(r))) { pendingName = r; continue; }
    if (pendingName) {
      const merged = parseItemRow(`${pendingName} ${r}`, allowInt);
      if (merged) items.push({ id: nextId(), name: merged.name, amount: merged.amount, qty: merged.qty, rate: merged.rate });
      pendingName = null;
    }
  }

  // sanity
  const sum = items.reduce((a, x) => a + x.amount, 0);
  if (!items.length) warnings.push('no_items');
  if (total === null && items.length) warnings.push('no_total');
  if (total !== null && items.length && sum > total * 1.25) warnings.push('items_exceed_total');
  if (total !== null && items.length && total > sum * 1.6) warnings.push('items_missing');
  if (total !== null && total < sum * 0.5) { warnings.push('total_unreliable'); }

  void now;
  return { store, date, items, total, warnings };
}
