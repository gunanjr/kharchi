import { KEYWORD_CATEGORY } from '@/features/tracker/defaults';
import { DAY, startOfDay } from '@/lib/date';
import { MAX_MINOR } from '@/domain/money';

/**
 * Deterministic parser for spoken or typed expense sentences ("spent 180 on lunch yesterday"). No network, no model.
 * It only reports what it can actually read: a missing amount stays null and the review screen asks for it. Several
 * amounts in one sentence become several separate drafts, never one merged transaction.
 */
export interface VoiceDraft {
  type: 'expense' | 'income';
  /** Minor units (paise), or null when no amount could be read. */
  amount: number | null;
  description: string;
  /** Category key from KEYWORD_CATEGORY ("food"), or null. The screen may override it with a learned merchant rule. */
  categoryKey: string | null;
  occurredAt: number;
  paymentMethod: 'upi' | 'card' | 'cash' | null;
  /** False when no spend/receive word was heard and expense was assumed. */
  directionCertain: boolean;
}

const INCOME = /\b(received|receive|got|earned|earn|credited|salary|refund(?:ed)?|income|bonus|cashback)\b/;
const EXPENSE = /\b(spent|spend|paid|pay|bought|buy|gave|give|purchased|cost|ordered|charged)\b/;
const TIME_UNIT = /^(day|days|week|weeks|hour|hours|minute|minutes|month|months|am|pm|st|nd|rd|th)\b/;
const MULT: Record<string, number> = { k: 1e3, thousand: 1e3, hundred: 100, lakh: 1e5, lakhs: 1e5, lac: 1e5 };
const FILLER = /\b(rupees?|rs\.?|inr|bucks|please|today|yesterday|last night|this morning|and|then|also)\b|₹/g;

function amountsIn(s: string): { value: number; index: number; end: number }[] {
  const out: { value: number; index: number; end: number }[] = [];
  const re = /(?:₹|rs\.?\s*|inr\s*)?(\d+(?:\.\d{1,2})?)\s*(k|thousand|hundred|lakhs?|lac)?\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const after = s.slice(m.index + m[0].length).trim();
    if (!m[2] && TIME_UNIT.test(after)) continue; // "2 days ago", "5 pm"
    const value = Number(m[1]) * (m[2] ? MULT[m[2]] : 1);
    if (value > 0 && Number.isFinite(value)) out.push({ value, index: m.index, end: m.index + m[0].length });
  }
  return out;
}

function dateOf(s: string, now: number): number {
  const day = startOfDay(now);
  const ago = s.match(/\b(\d{1,2})\s+days?\s+ago\b/);
  if (/\bday before yesterday\b/.test(s)) return day - 2 * DAY + 12 * 3600_000;
  if (/\byesterday\b|\blast night\b/.test(s)) return day - DAY + 12 * 3600_000;
  if (ago && Number(ago[1]) <= 60) return day - Number(ago[1]) * DAY + 12 * 3600_000;
  return now;
}

function describe(s: string, amt: { index: number; end: number }): string {
  // prefer what follows "on / for / at / to / from"; otherwise whatever is left after removing the amount
  const after = s.slice(amt.end);
  const prep = after.match(/\b(?:on|for|at|to|from|in)\s+(.+)$/) ?? s.slice(0, amt.index).match(/\b(?:at|from|to)\s+(.+)$/);
  let d = (prep ? prep[1] : after).replace(/\bday before yesterday\b|\b\d{1,2}\s+days?\s+ago\b/g, ' ').replace(FILLER, ' ');
  d = d.replace(/\b(my|the|a|an|some|via|using|with|by)\b/g, ' ').replace(/\b(upi|gpay|google pay|phonepe|paytm|cash|credit card|debit card|card)\b/g, ' ');
  d = d.replace(/[^\p{L}\p{N} &'-]+/gu, ' ').replace(/\s+/g, ' ').trim();
  return d ? d[0].toUpperCase() + d.slice(1) : '';
}

export function parseVoice(input: string, now = Date.now()): VoiceDraft[] {
  const text = input.toLowerCase().replace(/(\d),(\d{3})/g, '$1$2').replace(/\s+/g, ' ').trim();
  if (!text) return [];
  // split into clauses; clauses with no amount are glued to the previous one ("... on lunch and tea" stays together)
  const raw = text.split(/\s*(?:[;,]|\band\b|\bthen\b|\balso\b|\bplus\b)\s*/).filter(Boolean);
  const clauses: string[] = [];
  for (const c of raw) {
    if (clauses.length && !amountsIn(c).length) clauses[clauses.length - 1] += ` and ${c}`;
    else clauses.push(c);
  }
  // a leading amount-less clause ("lunch and 60 on tea") has nothing to attach to: keep as its own draft
  const whole = amountsIn(text);
  const parts = whole.length > 1 ? clauses : [text];
  const when = dateOf(text, now);
  const method = /\b(upi|gpay|google pay|phonepe|paytm)\b/.test(text) ? 'upi' : /\b(credit card|debit card|card)\b/.test(text) ? 'card' : /\bcash\b/.test(text) ? 'cash' : null;
  const incomeAll = INCOME.test(text);
  return parts.map((p) => {
    const a = amountsIn(p)[0];
    const income = INCOME.test(p) || (incomeAll && !EXPENSE.test(p));
    const description = a ? describe(p, a) : describe(p, { index: 0, end: 0 });
    const hay = `${description} ${p}`;
    const cat = KEYWORD_CATEGORY.find(([re]) => re.test(hay));
    return {
      type: income ? 'income' : 'expense',
      amount: a && Math.round(a.value * 100) <= MAX_MINOR ? Math.round(a.value * 100) : null,
      description,
      categoryKey: cat ? (income && cat[1] === 'salary' ? 'salary' : cat[1]) : income && /\bfreelanc/.test(hay) ? 'freelance' : null,
      occurredAt: dateOf(p, now) !== now ? dateOf(p, now) : when,
      paymentMethod: method,
      directionCertain: INCOME.test(p) || EXPENSE.test(p) || incomeAll || EXPENSE.test(text),
    } satisfies VoiceDraft;
  });
}
