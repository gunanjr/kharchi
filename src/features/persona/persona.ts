import type { Transaction } from '@/domain/types';

/**
 * Money persona, streaks and Roast or toast (Pro). Fixed rules on the user's own entries, built to never feel unfair
 * (section 22.2b of BRUHME.md):
 * - nothing until there are at least 30 counted expenses across at least 3 weeks;
 * - only expenses that count in totals; rent, bills, EMIs, insurance and investments never drive a persona or a roast;
 * - health, education, donations and income are never mentioned;
 * - one-off big spends (more than 3x the usual for that category) are ignored for scoring;
 * - late night = 11 pm to 4 am on the phone's clock, and needs at least 5 such entries;
 * - personas are all affectionate; ties go to the kinder one; a new persona needs a clear lead over the last one.
 */
type Tx = Pick<Transaction, 'type' | 'amount' | 'merchant' | 'category_id' | 'occurred_at'> & { excluded?: number | null; tags?: string | null };
const DAY = 86_400_000;

const FIXED = new Set(['cat_rent', 'cat_bills', 'cat_subscriptions']);
const SENSITIVE = new Set(['cat_health', 'cat_education']);
const FIXED_TAGS = ['investing', 'insurance', 'emi', 'donation', 'charity'];
const FOOD = new Set(['cat_food']);
const GROCERY = new Set(['cat_groceries']);
const TRANSPORT = new Set(['cat_transport', 'cat_travel']);

export type PersonaKey = 'chai' | 'quick' | 'weekend' | 'explorer' | 'saver' | 'planner' | 'homebody' | 'night';
/** Kindest first: used to break ties. */
const KIND_ORDER: PersonaKey[] = ['saver', 'planner', 'chai', 'homebody', 'explorer', 'weekend', 'quick', 'night'];
export const PERSONAS: Record<PersonaKey, { name: string; emoji: string }> = {
  chai: { name: 'Chai Philosopher', emoji: '☕' },
  quick: { name: 'Quick-commerce Royalty', emoji: '🛵' },
  weekend: { name: 'Weekend Warrior', emoji: '🎉' },
  explorer: { name: 'Explorer', emoji: '🧭' },
  saver: { name: 'Silent Saver', emoji: '🐿️' },
  planner: { name: 'Steady Planner', emoji: '📐' },
  homebody: { name: 'Homebody', emoji: '🏡' },
  night: { name: 'Night Owl', emoji: '🦉' },
};

const tagList = (t: Tx) => { try { const a = t.tags ? JSON.parse(t.tags) : []; return Array.isArray(a) ? a.map(String) : []; } catch { return []; } };
const isLate = (t: number) => { const h = new Date(t).getHours(); return h >= 23 || h < 4; };

/** Expenses that may be used for persona and roast scoring. */
export function scorable(txs: Tx[], from: number, to: number): Tx[] {
  const base = txs.filter((t) => t.type === 'expense' && !t.excluded && t.occurred_at >= from && t.occurred_at < to
    && !FIXED.has(t.category_id ?? '') && !SENSITIVE.has(t.category_id ?? '') && !tagList(t).some((g) => FIXED_TAGS.includes(g.toLowerCase())));
  const byCat = new Map<string, number[]>();
  for (const t of base) { const k = t.category_id ?? ''; const a = byCat.get(k) ?? []; a.push(t.amount); byCat.set(k, a); }
  const med = new Map([...byCat].map(([k, a]) => [k, [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]]));
  return base.filter((t) => { const m = med.get(t.category_id ?? '') ?? 0; return !(m > 0 && t.amount > 3 * m && (byCat.get(t.category_id ?? '')?.length ?? 0) >= 4); });
}

export interface PersonaResult { key: PersonaKey; name: string; emoji: string; why: string; score: number; scores: Partial<Record<PersonaKey, number>> }
export type PersonaOutcome = { status: 'not-enough'; needed: string } | ({ status: 'ok' } & PersonaResult);

/** Each persona's score 0 to 1 for the window. */
export function personaScores(all: Tx[], from: number, to: number, income = 0, prevSpent = 0): { scores: Partial<Record<PersonaKey, number>>; why: Partial<Record<PersonaKey, string>> } {
  const tx = scorable(all, from, to);
  const scores: Partial<Record<PersonaKey, number>> = {};
  const why: Partial<Record<PersonaKey, string>> = {};
  const n = tx.length || 1;
  const total = tx.reduce((a, t) => a + t.amount, 0) || 1;
  const smallFood = tx.filter((t) => FOOD.has(t.category_id ?? '') && t.amount <= 30000);
  scores.chai = Math.min(1, smallFood.length / 20); why.chai = `${smallFood.length} small food and drink spends`;
  const groc = tx.filter((t) => GROCERY.has(t.category_id ?? ''));
  const grocAvg = groc.length ? groc.reduce((a, t) => a + t.amount, 0) / groc.length : 0;
  scores.quick = groc.length >= 8 && grocAvg <= 80000 ? Math.min(1, groc.length / 16) : 0; why.quick = `${groc.length} quick grocery orders`;
  const weekend = tx.filter((t) => [0, 6].includes(new Date(t.occurred_at).getDay())).reduce((a, t) => a + t.amount, 0);
  const wShare = weekend / total;
  scores.weekend = wShare >= 0.45 ? Math.min(1, (wShare - 0.35) / 0.35) : 0; why.weekend = `${Math.round(wShare * 100)}% of spending on weekends`;
  const places = new Set(tx.map((t) => (t.merchant ?? '').trim().toLowerCase()).filter(Boolean));
  scores.explorer = places.size >= 20 ? Math.min(1, places.size / 40) : 0; why.explorer = `${places.size} different places`;
  const spent = tx.reduce((a, t) => a + t.amount, 0);
  const saverByIncome = income > 0 ? 1 - spent / income : 0;
  const saverByTrend = prevSpent > 0 ? (prevSpent - spent) / prevSpent : 0;
  scores.saver = Math.max(saverByIncome >= 0.4 ? Math.min(1, saverByIncome) : 0, saverByTrend >= 0.15 ? Math.min(1, saverByTrend * 2) : 0);
  why.saver = saverByTrend >= 0.15 ? `${Math.round(saverByTrend * 100)}% less than the month before` : `kept ${Math.round(saverByIncome * 100)}% of what came in`;
  const days = new Map<number, number>();
  for (const t of tx) { const d = new Date(t.occurred_at); d.setHours(0, 0, 0, 0); days.set(d.getTime(), (days.get(d.getTime()) ?? 0) + t.amount); }
  const vals = [...days.values()];
  const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
  const cv = vals.length > 1 ? Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length) / (mean || 1) : 9;
  scores.planner = vals.length >= 15 && cv <= 0.7 ? Math.min(1, (0.9 - cv) / 0.6) : 0; why.planner = `steady spending on ${vals.length} days`;
  const homeShare = tx.filter((t) => GROCERY.has(t.category_id ?? '')).reduce((a, t) => a + t.amount, 0) / total;
  const travelShare = tx.filter((t) => TRANSPORT.has(t.category_id ?? '')).reduce((a, t) => a + t.amount, 0) / total;
  scores.homebody = homeShare >= 0.35 && travelShare <= 0.1 ? Math.min(1, homeShare) : 0; why.homebody = `${Math.round(homeShare * 100)}% on groceries and home`;
  const late = tx.filter((t) => isLate(t.occurred_at));
  scores.night = late.length >= 5 && late.length / n >= 0.2 ? Math.min(1, late.length / n) : 0; why.night = `${late.length} spends after 11 pm`;
  return { scores, why };
}

/**
 * The persona for a window (usually the last 30 days). `previous` keeps a persona stable: it changes only when another
 * persona leads by at least 15%.
 */
export function personaFor(all: Tx[], from: number, to: number, opts: { income?: number; prevSpent?: number; previous?: PersonaKey | null } = {}): PersonaOutcome {
  const tx = all.filter((t) => t.type === 'expense' && !t.excluded && t.occurred_at >= from && t.occurred_at < to);
  const weeks = new Set(tx.map((t) => Math.floor(t.occurred_at / (7 * DAY))));
  if (tx.length < 30 || weeks.size < 3) return { status: 'not-enough', needed: tx.length < 30 ? `${30 - tx.length} more spends` : 'a few more weeks of logging' };
  const { scores, why } = personaScores(all, from, to, opts.income ?? 0, opts.prevSpent ?? 0);
  const ranked = KIND_ORDER.map((k) => ({ k, s: scores[k] ?? 0 })).sort((a, b) => b.s - a.s || KIND_ORDER.indexOf(a.k) - KIND_ORDER.indexOf(b.k));
  let pick = ranked[0];
  if (pick.s <= 0) pick = { k: 'planner', s: 0 }; // nobody stands out: a kind, neutral default
  const prev = opts.previous;
  if (prev && prev !== pick.k && (scores[prev] ?? 0) > 0 && pick.s < (scores[prev] ?? 0) * 1.15) pick = { k: prev, s: scores[prev] ?? 0 };
  return { status: 'ok', key: pick.k, ...PERSONAS[pick.k], why: why[pick.k] ?? '', score: pick.s, scores };
}

/* ---------- streaks ---------- */
/**
 * The current logging streak ending today or yesterday, forgiving one missed day in any 7-day stretch (a "freeze").
 */
export function currentStreak(txs: Pick<Tx, 'occurred_at'>[], now: number): { days: number; freezesUsed: number } {
  const set = new Set(txs.map((t) => { const d = new Date(t.occurred_at); d.setHours(0, 0, 0, 0); return d.getTime(); }));
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  let d = today.getTime();
  if (!set.has(d)) d -= DAY; // a streak is still alive if the last entry was yesterday
  if (!set.has(d)) return { days: 0, freezesUsed: 0 };
  let days = 0, freezes = 0;
  const missed: number[] = [];
  for (let i = 0; i < 3650; i++, d -= DAY) {
    if (set.has(d)) { days++; continue; }
    if (missed.some((m) => m - d < 7 * DAY)) break; // a second miss within a week ends it
    if (!set.has(d - DAY)) break; // never bridge two missed days in a row
    missed.push(d);
    freezes++;
  }
  return { days, freezesUsed: freezes };
}

/* ---------- roast or toast ---------- */
export type RoastTone = 'toast' | 'gentle' | 'playful' | 'savage';
export interface RoastFact { kind: 'late' | 'place' | 'weekend' | 'saver' | 'steady' | 'weekday' | 'small' | 'nospend' | 'streak' | 'biggest'; count: number; amount: number; name?: string }

/** The facts a roast or toast may use, only above clear thresholds, never about sensitive categories. */
export function roastFacts(all: Tx[], from: number, to: number, prevSpent = 0): RoastFact[] {
  const tx = scorable(all, from, to);
  const out: RoastFact[] = [];
  const late = tx.filter((t) => isLate(t.occurred_at));
  if (late.length >= 5) out.push({ kind: 'late', count: late.length, amount: late.reduce((a, t) => a + t.amount, 0) });
  const by = new Map<string, { name: string; count: number; amount: number }>();
  for (const t of tx) { const n = (t.merchant ?? '').trim(); if (!n) continue; const k = n.toLowerCase(); const v = by.get(k) ?? { name: n, count: 0, amount: 0 }; v.count++; v.amount += t.amount; by.set(k, v); }
  const top = [...by.values()].sort((a, b) => b.count - a.count || b.amount - a.amount)[0];
  if (top && top.count >= 8) out.push({ kind: 'place', count: top.count, amount: top.amount, name: top.name });
  const total = tx.reduce((a, t) => a + t.amount, 0);
  const weekend = tx.filter((t) => [0, 6].includes(new Date(t.occurred_at).getDay())).reduce((a, t) => a + t.amount, 0);
  if (total > 0 && weekend / total >= 0.5) out.push({ kind: 'weekend', count: Math.round((weekend / total) * 100), amount: weekend });
  if (prevSpent > 0 && total <= prevSpent * 0.85) out.push({ kind: 'saver', count: Math.round((1 - total / prevSpent) * 100), amount: prevSpent - total });
  // priciest weekday, when one day clearly leads
  const wd = new Array(7).fill(0);
  for (const t of tx) wd[new Date(t.occurred_at).getDay()] += t.amount;
  const top7 = Math.max(...wd);
  if (total > 0 && top7 / total >= 0.25) out.push({ kind: 'weekday', name: ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][wd.indexOf(top7)], count: Math.round((top7 / total) * 100), amount: top7 });
  // many small treats (₹200 or less)
  const small = tx.filter((t) => t.amount <= 20000);
  if (small.length >= 10) out.push({ kind: 'small', count: small.length, amount: small.reduce((a, t) => a + t.amount, 0) });
  // logged days with no spending at all
  const sodOf = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const inWin = all.filter((t) => t.occurred_at >= from && t.occurred_at < to);
  const spendDays = new Set(inWin.filter((t) => t.type === 'expense' && !t.excluded).map((t) => sodOf(t.occurred_at)));
  const noSpend = new Set(inWin.map((t) => sodOf(t.occurred_at)).filter((d) => !spendDays.has(d))).size;
  if (noSpend >= 3) out.push({ kind: 'nospend', count: noSpend, amount: 0 });
  // a real logging streak
  const streak = currentStreak(all, to - 1).days;
  if (streak >= 7) out.push({ kind: 'streak', count: streak, amount: 0 });
  // the single biggest everyday spend (fixed costs and sensitive categories never count)
  const big = all.filter((t) => t.type === 'expense' && !t.excluded && t.occurred_at >= from && t.occurred_at < to && !FIXED.has(t.category_id ?? '') && !SENSITIVE.has(t.category_id ?? '') && (t.merchant ?? '').trim())
    .sort((a, b) => b.amount - a.amount)[0];
  if (big && big.amount >= 100000) out.push({ kind: 'biggest', count: 1, amount: big.amount, name: (big.merchant ?? '').trim() });
  if (!out.length && tx.length >= 30) out.push({ kind: 'steady', count: tx.length, amount: total });
  return out;
}

import { LINES } from './roastLines';
export { LINES };

export function roastLine(f: RoastFact, tone: RoastTone, money: (n: number) => string, variant = 0): string {
  const list = LINES[f.kind][tone];
  return list[((variant % list.length) + list.length) % list.length](f, money(f.amount));
}

export const PERSONA_STYLE: Record<PersonaKey, { palette: 'tangerine' | 'bubblegum' | 'grape' | 'ocean' | 'mint' | 'lime' | 'sunshine' | 'midnight'; traits: string[]; tagline: string }> = {
  chai: { palette: 'tangerine', traits: ['small sips', 'daily ritual', 'cafe regular'], tagline: 'Life happens over chai.' },
  quick: { palette: 'bubblegum', traits: ['10-minute delivery', 'snack strategist', 'never runs out'], tagline: 'Why walk when it arrives in ten?' },
  weekend: { palette: 'grape', traits: ['Friday energy', 'plans maker', 'lives loud'], tagline: 'Weekdays are for recovery.' },
  explorer: { palette: 'ocean', traits: ['new places', 'curious', 'never the same twice'], tagline: 'Collects places, not things.' },
  saver: { palette: 'mint', traits: ['quietly rich', 'calm wallet', 'future-proof'], tagline: 'Spends less, smiles more.' },
  planner: { palette: 'lime', traits: ['steady', 'in control', 'zero chaos'], tagline: 'A plan for every rupee.' },
  homebody: { palette: 'sunshine', traits: ['cosy', 'stocked fridge', 'home is the vibe'], tagline: 'Best place in town: home.' },
  night: { palette: 'midnight', traits: ['after-hours', 'midnight snacks', 'night owl'], tagline: 'The night is young. The cart is full.' },
};
