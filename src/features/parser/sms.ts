import type { ParseResult, ParsedTx, RejectReason } from './types';

/* ------------------------------------------------------------------ helpers */

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };

const BANKS: [RegExp, string][] = [
  [/hdfc/i, 'HDFC'], [/\bsbi|sbiupi|sbicrd|sbipsg|sbinb/i, 'SBI'], [/icici/i, 'ICICI'], [/axis|axisbk/i, 'Axis'],
  [/kotak|kmbl|kkbk/i, 'Kotak'], [/pnb/i, 'PNB'], [/\bbob|barodampay|bankofbaroda|barodabank/i, 'BoB'], [/yesbnk|yes ?bank|yesbk/i, 'Yes'],
  [/idfc/i, 'IDFC'], [/indus/i, 'IndusInd'], [/federal|fedbnk|fedral/i, 'Federal'], [/aubank|au small|ausfb/i, 'AU'],
  [/paytm|ptmbnk|paytmb/i, 'Paytm'], [/canara|cnrb/i, 'Canara'], [/union ?bank|ubi/i, 'Union'],
];

export function bankFromSender(sender?: string | null, body = ''): string | null {
  const probe = `${sender ?? ''} ${body.slice(0, 120)}`;
  for (const [re, name] of BANKS) if (re.test(probe)) return name;
  return null;
}

/** Heuristic: DLT headers look like "AX-HDFCBK" / "VM-SBIINB-S" / "JD-ICICIT". Also accepts bare bank names. */
export function looksLikeFinancialSender(sender?: string | null): boolean {
  if (!sender) return false;
  const s = sender.trim();
  if (/^\+?\d{8,}$/.test(s)) return false; // personal number
  if (/^[A-Z]{2}-[A-Z0-9]{3,9}(-[A-Z])?$/i.test(s)) return true;
  return BANKS.some(([re]) => re.test(s));
}

function toMinor(numStr: string, decimals = 2): number | null {
  const clean = numStr.replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const [w, f = ''] = clean.split('.');
  const frac = f.slice(0, decimals).padEnd(decimals, '0');
  const n = Number(w) * 10 ** decimals + (decimals ? Number(frac) : 0);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

const CUR_RE = '(?:rs\\.?|inr|₹|rupees?|usd|eur|gbp|aed|sgd|jpy|us\\$|\\$|€|£)';
const AMOUNT_RE = new RegExp(`(${CUR_RE})\\s*[:.-]?\\s*(\\d[\\d,]*(?:\\.\\d{1,2})?)(?!\\d)`, 'gi');

function currencyOf(token: string): string {
  const t = token.toLowerCase().replace(/\./g, '');
  if (['rs', 'inr', '₹', 'rupee', 'rupees'].includes(t)) return 'INR';
  if (t === 'us$' || t === '$') return 'USD';
  if (t === '€') return 'EUR';
  if (t === '£') return 'GBP';
  return t.toUpperCase();
}

/* ------------------------------------------------------------- classifiers */

const OTP_RE = /\b(otp|one[- ]?time[- ]?(?:password|pin)|verification code|security code|passcode|do not share|never share)\b/i;
const OTP_LEAD = /(\b\d{4,8}\b\s+is\s+(?:your|the)\s+(?:otp|one)|(?:otp|code|pin)\s+(?:is|for|:)\s*\d{4,8}|use\s+\d{4,8}\s+(?:as|to)|your\s+otp)/i;

const FAILED_RE = /\b(fail(?:ed|ure)?|declin(?:ed|e)|unsuccessful|insufficient (?:funds|balance)|not (?:been )?(?:processed|completed|successful)|could not be (?:processed|completed)|unable to (?:process|complete)|rejected|cancell?ed|was unsuccessful|txn (?:declined|failed))\b/i;
const REVERSED_RE = /\b(revers(?:ed|al)|refund(?:ed)? (?:initiated|in progress|will be)|chargeback|auto[- ]?reversal)\b/i;
const PROMO_RE = /\b(offers?|cashback up to|win\b|apply now|pre-?approved|click|bit\.ly|limited time|reward points|congratulations|t&c|terms apply|download the app|upgrade|avail now|exclusive|use code|flat \d+%|get up to|emi offer|discount)\b|https?:\/\//i;
const BALANCE_ONLY_RE = /\b(avl|avail(?:able)?|a\/c|account)?\s*bal(?:ance)?\b/i;
const CARD_PAYMENT_RE = /\b(payment (?:of|for)?.{0,30}(?:received|credited).{0,40}(?:credit )?card|credit card (?:bill )?payment.{0,30}(?:received|credited)|towards (?:your )?(?:credit )?card (?:outstanding|bill)|card payment.{0,20}received|thank you for (?:the )?payment)/i;

const DEBIT_VERBS = /\b(debited|debit(?:ed)? by|spent|withdrawn|withdrawal|paid|payment of|sent|purchase(?:d)?|deducted|thank you for using|transferred to|trf to|used for|dr\.?)\b/gi;
const CREDIT_VERBS = /\b(credited|received|deposited|deposit of|added to|refund of|cashback of|credit alert|cr\.?)\b/gi;

function firstIndex(re: RegExp, s: string): number {
  re.lastIndex = 0;
  const m = re.exec(s);
  return m ? m.index : -1;
}

/* --------------------------------------------------------------- extractors */

function extractAmount(s: string): { amount: number; currency: string } | null {
  AMOUNT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = AMOUNT_RE.exec(s))) {
    const before = s.slice(Math.max(0, m.index - 28), m.index);
    // skip balances / limits / outstanding amounts
    if (/(bal(?:ance)?|avl|avail(?:able)?|limit|outstanding|minimum|min\.? due|total due|credit limit)[^.]{0,14}$/i.test(before)) continue;
    const currency = currencyOf(m[1]);
    const amount = toMinor(m[2], currency === 'JPY' ? 0 : 2);
    if (amount) return { amount, currency };
  }
  // SBI style: "debited by 450.0" with no currency symbol
  const bare = s.match(/\b(?:debited|credited)\s+(?:by|with|for|of)\s+(\d[\d,]*(?:\.\d{1,2})?)/i);
  if (bare) {
    const amount = toMinor(bare[1]);
    if (amount) return { amount, currency: 'INR' };
  }
  return null;
}

function extractLast4(s: string): string | null {
  const m =
    s.match(/\b(?:a\/?c|acct?|account|card|a c)(?:\s*(?:no\.?|number|ending(?:\s+with|\s+in)?|last\s*4|#))?\s*[:\-]?\s*[x*.\s#]*(\d{3,})\b/i) ||
    s.match(/\b(?:ending|ending with)\s+(\d{4})\b/i);
  return m ? m[1].slice(-4) : null;
}

function extractRef(s: string): string | null {
  const m =
    s.match(/\b(?:upi\s*ref(?:erence)?(?:\s*(?:no\.?|number|id))?|upi\s*txn\s*id|rrn|utr|ref\s*no\.?|refno|ref(?:erence)?\s*(?:number|id)?|txn\s*(?:id|no\.?)|imps\s*ref(?:\s*no\.?)?)\s*[:\-#]?\s*(\d{4,16})\b/i) ||
    s.match(/\bupi[:/-](?:cr|dr|p2m|p2a)?[/-]?(\d{9,14})\b/i) ||
    s.match(/\(upi\s*(\d{9,14})\)/i);
  return m ? m[1] : null;
}

function extractVpa(s: string): string | null {
  const m = s.match(/\b([a-z0-9][\w.\-]{1,}@[a-z][a-z0-9]{1,})\b(?![\w.]*\.[a-z]{2,})/i);
  return m ? m[1].toLowerCase() : null;
}

function extractBalance(s: string): number | null {
  const m = s.match(/(?:avl\.?|avail(?:able)?\.?|clr|closing|total)?\s*bal(?:ance)?\.?\s*(?:is|:|-|=)?\s*(?:rs\.?|inr|₹)?\s*[:.-]?\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
  return m ? toMinor(m[1]) : null;
}

export function extractTimestamp(s: string, fallback: number): number {
  const time = s.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  const applyTime = (d: Date) => {
    if (time) {
      let h = Number(time[1]);
      if (time[4]?.toLowerCase() === 'pm' && h < 12) h += 12;
      if (time[4]?.toLowerCase() === 'am' && h === 12) h = 0;
      d.setHours(h, Number(time[2]), Number(time[3] ?? 0), 0);
    }
    return d.getTime();
  };
  const yr = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));
  let m = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return applyTime(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  m = s.match(/\b(\d{1,2})[-/. ]?(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*[-/. ,]*(\d{2,4})\b/i);
  if (m) return applyTime(new Date(yr(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]), 12));
  m = s.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (m && Number(m[2]) <= 12 && Number(m[1]) <= 31) return applyTime(new Date(yr(m[3]), Number(m[2]) - 1, Number(m[1]), 12));
  if (time) return applyTime(new Date(fallback));
  return fallback;
}

const STOP = String.raw`(?=\s+(?:on|via|using|ref\w*|credited|debited|upi|avl|avail|bal|not you|if you|if not|call|dated|date|at\s+\d|from a\/c|from your|towards|info|for upi|txn|utr|rrn|vpa|is credited|has been|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b|\s*[\(\[]|\s*[|]|\.\s|\.$|,|\s+-\s|;|$)`;

export function titleCase(s: string): string {
  if (s !== s.toUpperCase()) return s;
  return capitalize(s);
}
function capitalize(s: string): string {
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function cleanMerchant(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let s = raw.replace(/\s+/g, ' ').trim();
  s = s.replace(/^(?:vpa|upi|pos|ecom)[\s:/*-]+/i, '').replace(/^(?:a\/c|account)\s+\w+\s*/i, '');
  s = s.replace(/[\s.:,;\-*]+$/g, '').replace(/^[\s.:,;\-*]+/, '');
  s = s.replace(/\b\d{6,}\b/g, '').replace(/\s+/g, ' ').trim();
  if (!s || s.length < 2 || /^\d+$/.test(s)) return null;
  if (/^(your|the|a|an|bank|account|a\/c|self|beneficiary)$/i.test(s)) return null;
  return titleCase(s.slice(0, 40));
}

function merchantFromVpa(vpa: string | null): string | null {
  if (!vpa) return null;
  const local = vpa.split('@')[0];
  if (/^\d{6,}$/.test(local) || local.length < 3) return null;
  return capitalize(local.replace(/[._-]+/g, ' ').replace(/\d+$/g, '').trim()) || null;
}

function extractMerchant(s: string, direction: 'debit' | 'credit', vpa: string | null): string | null {
  const tryRe = (re: RegExp) => {
    const m = s.match(re);
    return m ? cleanMerchant(m[1]) : null;
  };
  // Narration forms: "Info: UPI/P2M/123456789012/SWIGGY" or "Info- UPI-123-SWIGGY ORDER"
  const info = s.match(/\binfo\s*[:\-]\s*([^\n]+?)(?=\s+avl|\s+bal|\.\s|\.$|$)/i);
  if (info) {
    const parts = info[1].split(/[/\-]/).map((p) => p.trim()).filter(Boolean);
    const cand = parts.filter((p) => !/^(upi|imps|neft|dr|cr|p2m|p2a|p2p|pos|ach|ecom)$/i.test(p) && !/^\d{6,}$/.test(p) && !/@/.test(p));
    const c = cleanMerchant(cand[0]);
    if (c) return c;
  }
  const slash = s.match(/\bupi[/-](?:p2m|p2a|p2p|dr|cr)?[/-]?\d{9,14}[/-]([A-Za-z][A-Za-z0-9 &'*.]{1,38}?)(?=\.\s|\.$|\s+(?:avl|bal)|$)/i);
  if (slash) {
    const c = cleanMerchant(slash[1]);
    if (c) return c;
  }
  const toVpaName = tryRe(new RegExp(String.raw`\b(?:to|from|by)\s+vpa\s+[\w.\-]+@[a-z0-9]+\s+([A-Za-z][A-Za-z0-9 &.'*-]{1,38}?)${STOP}`, 'i'));
  if (toVpaName && !/^(on|ref|upi)$/i.test(toVpaName)) return toVpaName;

  if (direction === 'debit') {
    const at = tryRe(new RegExp(String.raw`\b(?:at|@)\s+(?!\d{1,2}:)([A-Za-z0-9][A-Za-z0-9 &.'*_/-]{1,38}?)${STOP}`, 'i'));
    if (at) return at;
    const to = tryRe(new RegExp(String.raw`\b(?:to|towards|for)\s+(?!vpa\b|a\/c\b|account\b|your\b|card\b|self\b|ac\b|upi\b|\d)([A-Za-z0-9][A-Za-z0-9 &.'*_/-]{1,38}?)${STOP}`, 'i'));
    if (to) return to;
  } else {
    const from = tryRe(new RegExp(String.raw`\b(?:from)\s+(?!vpa\b|a\/c\b|account\b|your\b|card\b|self\b|ac\b|\d)([A-Za-z][A-Za-z0-9 &.'*_/-]{1,38}?)${STOP}`, 'i'));
    if (from) return from;
    const by = tryRe(new RegExp(String.raw`\bby\s+(?!vpa\b|a\/c\b|account\b|your\b|card\b|self\b|ac\b|rs\b|inr\b|\d|upi\b|neft\b|imps\b|transfer\b)([A-Za-z][A-Za-z0-9 &.'*_/-]{1,38}?)${STOP}`, 'i'));
    if (by) return by;
  }
  if (direction === 'debit') {
    const tail = s.match(/\bon\s+([A-Z][A-Z0-9&'*-]{2,}(?: [A-Z][A-Z0-9&'*-]+){0,3})(?=\.|\s+Avl|$)/);
    const c = cleanMerchant(tail?.[1]);
    if (c) return c;
  }
  return merchantFromVpa(vpa);
}

/* ------------------------------------------------------------------- parse */

export interface ParseOptions {
  sender?: string | null;
  receivedAt?: number;
}

export function parseSms(body: string, opts: ParseOptions = {}): ParseResult {
  const reject = (reason: RejectReason): ParseResult => ({ ok: false, reason });
  const s = body.replace(/[\u200b-\u200d\ufeff]/g, '').replace(/\s+/g, ' ').trim();
  if (s.length < 15) return reject('not_financial');

  const dIdx = firstIndex(DEBIT_VERBS, s);
  const cIdx = firstIndex(CREDIT_VERBS, s);
  const hasVerb = dIdx >= 0 || cIdx >= 0;

  // OTPs: reject unless a real completed-transaction verb is present as well
  if (OTP_LEAD.test(s) || (OTP_RE.test(s) && !hasVerb)) return reject('otp');
  if (REVERSED_RE.test(s) && !/\bcredited\b/i.test(s)) return reject('reversed');
  if (REVERSED_RE.test(s) && /\b(revers|chargeback)/i.test(s)) return reject('reversed');
  if (FAILED_RE.test(s)) return reject('failed');
  if (!hasVerb) return reject(BALANCE_ONLY_RE.test(s) ? 'balance_only' : PROMO_RE.test(s) ? 'promo' : 'not_financial');
  if (PROMO_RE.test(s) && !/\b(debited|credited|spent|withdrawn|sent|received)\b/i.test(s)) return reject('promo');
  if (CARD_PAYMENT_RE.test(s)) return reject('card_payment');

  const amt = extractAmount(s);
  if (!amt) return reject('not_financial');

  const direction: 'debit' | 'credit' = dIdx >= 0 && (cIdx < 0 || dIdx < cIdx) ? 'debit' : 'credit';
  const vpa = extractVpa(s);
  const merchant = extractMerchant(s, direction, vpa);
  const instrument: ParsedTx['instrument'] = /\bcard\b/i.test(s)
    ? 'card'
    : /\bupi\b|\bvpa\b|@[a-z]+/i.test(s)
      ? 'upi'
      : /\batm\b|cash withdrawal/i.test(s) || /\bwithdrawn\b/i.test(s)
        ? 'atm'
        : 'account';

  return {
    ok: true,
    tx: {
      amount: amt.amount,
      currency: amt.currency,
      direction,
      accountLast4: extractLast4(s),
      merchant,
      vpa,
      upiRef: extractRef(s),
      occurredAt: extractTimestamp(s, opts.receivedAt ?? Date.now()),
      balance: extractBalance(s),
      instrument,
      bank: bankFromSender(opts.sender, s),
    },
  };
}
