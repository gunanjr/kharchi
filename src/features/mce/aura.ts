import type { Transaction } from '@/domain/types';

/**
 * Main Character Energy (Pro, with a small free glimpse): your money habits as an "aura".
 * - Aura points are earned each day for good habits, never taken away for spending (no shame, no penalties).
 * - Your rank comes from the last 30 days: NPC era to Final boss.
 * - Your era is the month's story ("Saving Arc", "Café Era"...), always affectionate.
 * - Prompts are dating-app style lines built from your own numbers ("My toxic trait: ...").
 * Pure and tested; fixed rules; amounts can be hidden on every share card.
 */
type Tx = Pick<Transaction, 'type' | 'amount' | 'merchant' | 'category_id' | 'occurred_at'> & { excluded?: number | null; tags?: string | null };
const DAY = 86_400_000;
const sod = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const SKIP = new Set(['cat_rent', 'cat_bills', 'cat_subscriptions', 'cat_health', 'cat_education']);

export interface AuraDay { day: number; points: number; reasons: string[] }

/**
 * Points for each of the last `days` days:
 * +10 logged something · +15 a logged day with no spending · +10 spent under your usual daily amount on a logged day ·
 * +20 settled a debt · +5 streak bonus when the day continues a streak of 3+ days. Rent, bills and similar are ignored.
 */
export function auraDays(txs: Tx[], settlements: number[], now: number, days = 30): AuraDay[] {
  const today = sod(now);
  const from = today - (days - 1) * DAY;
  const baseFrom = from - 60 * DAY;
  const exp = txs.filter((t) => t.type === 'expense' && !t.excluded && !SKIP.has(t.category_id ?? ''));
  const logged = new Set(txs.map((t) => sod(t.occurred_at)));
  const spend = new Map<number, number>();
  for (const t of exp) spend.set(sod(t.occurred_at), (spend.get(sod(t.occurred_at)) ?? 0) + t.amount);
  // the usual daily amount: median of spending days in the 60 days before the window
  const baseline = [...spend.entries()].filter(([d]) => d >= baseFrom && d < from).map(([, v]) => v).sort((a, b) => a - b);
  const usual = baseline.length >= 10 ? baseline[Math.floor(baseline.length / 2)] : 0;
  const settled = new Set(settlements.map(sod));
  const out: AuraDay[] = [];
  let run = 0;
  for (let d = baseFrom; d <= today; d += DAY) {
    const day = sod(d + 12 * 3600_000);
    const isLogged = logged.has(day);
    run = isLogged ? run + 1 : 0;
    if (day < from) continue;
    let points = 0;
    const reasons: string[] = [];
    if (isLogged) { points += 10; reasons.push('Logged your day'); }
    if (isLogged && !spend.has(day)) { points += 15; reasons.push('No-spend day'); }
    if (isLogged && usual > 0 && spend.has(day) && spend.get(day)! < usual) { points += 10; reasons.push('Under your usual'); }
    if (settled.has(day)) { points += 20; reasons.push('Settled up'); }
    if (run >= 3) { points += 5; reasons.push(`${run}-day streak`); }
    out.push({ day, points, reasons });
  }
  return out;
}

export interface Rank { key: string; title: string; emoji: string; min: number; next: number | null }
export const RANKS: Rank[] = [
  { key: 'npc', title: 'NPC era', emoji: '🫥', min: 0, next: 20 },
  { key: 'side', title: 'Side character', emoji: '🙂', min: 20, next: 40 },
  { key: 'support', title: 'Supporting role', emoji: '😎', min: 40, next: 60 },
  { key: 'main', title: 'Main character', emoji: '🌟', min: 60, next: 80 },
  { key: 'armor', title: 'Plot armor', emoji: '🛡️', min: 80, next: 95 },
  { key: 'boss', title: 'Final boss', emoji: '👑', min: 95, next: null },
];

/** Aura score 0 to 100 from the last 30 days (max possible is 60 a day; 35 a day on average is a perfect score). */
export function auraScore(days: AuraDay[]): { score: number; rank: Rank; toNext: number | null; today: AuraDay | null; total: number } {
  const total = days.reduce((a, d) => a + d.points, 0);
  const score = Math.min(100, Math.round((total / (35 * Math.max(1, days.length))) * 100));
  const rank = [...RANKS].reverse().find((r) => score >= r.min) ?? RANKS[0];
  return { score, rank, toNext: rank.next === null ? null : rank.next - score, today: days[days.length - 1] ?? null, total };
}

/* ---------- era ---------- */
export interface Era { key: string; title: string; emoji: string; line: string }
const FOOD = new Set(['cat_food']);
const TRAVEL = new Set(['cat_travel', 'cat_transport']);
const FUN = new Set(['cat_entertainment', 'cat_shopping']);

/** This month's era, from the month's own pattern. Always kind; needs 15 counted spends. */
export function eraFor(txs: Tx[], year: number, month: number): Era | null {
  const from = new Date(year, month, 1).getTime(), to = new Date(year, month + 1, 1).getTime();
  const pf = new Date(year, month - 1, 1).getTime();
  const cur = txs.filter((t) => t.type === 'expense' && !t.excluded && !SKIP.has(t.category_id ?? '') && t.occurred_at >= from && t.occurred_at < to);
  if (cur.length < 15) return null;
  const prev = txs.filter((t) => t.type === 'expense' && !t.excluded && !SKIP.has(t.category_id ?? '') && t.occurred_at >= pf && t.occurred_at < from).reduce((a, t) => a + t.amount, 0);
  const total = cur.reduce((a, t) => a + t.amount, 0) || 1;
  const share = (set: Set<string>) => cur.filter((t) => set.has(t.category_id ?? '')).reduce((a, t) => a + t.amount, 0) / total;
  const weekend = cur.filter((t) => [0, 6].includes(new Date(t.occurred_at).getDay())).reduce((a, t) => a + t.amount, 0) / total;
  if (prev > 0 && total <= prev * 0.8) return { key: 'saving', title: 'Saving Arc', emoji: '📈', line: `${Math.round((1 - total / prev) * 100)}% less than last month. Character development.` };
  if (share(TRAVEL) >= 0.35) return { key: 'travel', title: 'Main Character Travel Arc', emoji: '✈️', line: 'Out there living the plot.' };
  if (share(FOOD) >= 0.4) return { key: 'cafe', title: 'Café Era', emoji: '☕', line: 'Every plan starts with “let’s grab a coffee”.' };
  if (prev > 0 && total >= prev * 1.25) return { key: 'treat', title: 'Treat Yourself Era', emoji: '🛍️', line: 'You earned it. Probably.' };
  if (share(FUN) >= 0.4) return { key: 'glow', title: 'Glow-up Era', emoji: '✨', line: 'Investing in the main character.' };
  if (weekend >= 0.5) return { key: 'weekend', title: 'Weekend Era', emoji: '🎉', line: 'Monday to Friday is just the trailer.' };
  return { key: 'soft', title: 'Soft Life Era', emoji: '🌿', line: 'Calm money, no drama.' };
}

/* ---------- prompts ---------- */
export interface PromptLine { q: string; a: string }
/** Dating-app style prompts from the user's own last 30 days. Only facts above clear thresholds; never sensitive categories. */
export function promptsFor(txs: Tx[], settlements: number[], now: number, money: (n: number) => string): PromptLine[] {
  const from = now - 30 * DAY;
  const exp = txs.filter((t) => t.type === 'expense' && !t.excluded && !SKIP.has(t.category_id ?? '') && t.occurred_at >= from);
  const out: PromptLine[] = [];
  const by = new Map<string, { name: string; n: number; v: number }>();
  for (const t of exp) { const n = (t.merchant ?? '').trim(); if (!n) continue; const k = n.toLowerCase(); const x = by.get(k) ?? { name: n, n: 0, v: 0 }; x.n++; x.v += t.amount; by.set(k, x); }
  const top = [...by.values()].sort((a, b) => b.n - a.n)[0];
  if (top && top.n >= 4) out.push({ q: 'My toxic trait', a: `${top.n} visits to ${top.name} in a month. No regrets.` });
  const logged = new Set(txs.filter((t) => t.occurred_at >= from).map((t) => sod(t.occurred_at)));
  const spendDays = new Set(exp.map((t) => sod(t.occurred_at)));
  const noSpend = [...logged].filter((d) => !spendDays.has(d)).length;
  if (noSpend >= 3) out.push({ q: 'Green flag', a: `${noSpend} no-spend days this month 🌱` });
  const wd = new Array(7).fill(0);
  for (const t of exp) wd[new Date(t.occurred_at).getDay()] += t.amount;
  const names = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  const max = Math.max(...wd);
  if (max > 0) out.push({ q: 'My most expensive day', a: `${names[wd.indexOf(max)]}. Don’t ask.` });
  const settledRecent = settlements.filter((t) => t >= from).length;
  if (settledRecent >= 1) out.push({ q: 'I’m weirdly good at', a: `settling up. ${settledRecent} paid back this month 🤝` });
  else if (logged.size >= 20) out.push({ q: 'I’m weirdly good at', a: `logging every spend. ${logged.size} days this month.` });
  const small = exp.filter((t) => t.amount <= 20000).length;
  if (small >= 10) out.push({ q: 'A small thing that makes me happy', a: `${small} little treats under ${money(20000)}.` });
  return out.slice(0, 4);
}
