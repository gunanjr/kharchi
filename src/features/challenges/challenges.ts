import type { Transaction } from '@/domain/types';

/**
 * Challenges (Pro): short, opt-in goals with a clear finish line, checked every day from the user's own entries.
 * Nothing is lost by failing: a challenge simply ends and can be started again. Pure and tested.
 */
type Tx = Pick<Transaction, 'type' | 'amount' | 'occurred_at' | 'category_id'> & { excluded?: number | null };
const DAY = 86_400_000;
const sod = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
// fixed costs never count against a challenge
const FIXED = new Set(['cat_rent', 'cat_bills', 'cat_subscriptions', 'cat_health', 'cat_education']);

export type ChallengeKey = 'nospend7' | 'log30' | 'lowweek' | 'calmweekend';
export interface ChallengeDef { key: ChallengeKey; title: string; pitch: string; days: number; goal: number; unit: string }
export const CHALLENGES: ChallengeDef[] = [
  { key: 'nospend7', title: '7 no-spend days', pitch: 'Seven days with no spending, within two weeks. Log them so they count.', days: 14, goal: 7, unit: 'no-spend days' },
  { key: 'log30', title: '30 days logged', pitch: 'Log something every day for 30 days. The habit everything else builds on.', days: 30, goal: 30, unit: 'days logged' },
  { key: 'lowweek', title: 'A lighter week', pitch: 'Spend 20% less than your usual week, for one week. Bills and rent never count.', days: 7, goal: 7, unit: 'days' },
  { key: 'calmweekend', title: 'Calm weekend', pitch: 'A Saturday and Sunday under your usual weekday spend, both logged.', days: 2, goal: 2, unit: 'days' },
];
export const challengeDef = (k: ChallengeKey) => CHALLENGES.find((c) => c.key === k)!;

export interface ActiveChallenge { id: string; key: ChallengeKey; startedAt: number }
export type ChallengeStatus = 'running' | 'won' | 'missed';
export interface ChallengeView { def: ChallengeDef; progress: number; goal: number; status: ChallengeStatus; dayOf: number; daysLeft: number; line: string; ends: number }

const variable = (t: Tx) => t.type === 'expense' && !t.excluded && !FIXED.has(t.category_id ?? '');

/** Usual weekly spend: median of the 8 full weeks before `from`, 0 without at least 4 weeks of data. */
export function usualWeek(txs: Tx[], from: number): number {
  const weeks: number[] = [];
  for (let w = 1; w <= 8; w++) {
    const a = from - w * 7 * DAY, b = a + 7 * DAY;
    const inWeek = txs.filter((t) => t.occurred_at >= a && t.occurred_at < b);
    if (!inWeek.length) continue;
    weeks.push(inWeek.filter(variable).reduce((s, t) => s + t.amount, 0));
  }
  if (weeks.length < 4) return 0;
  weeks.sort((x, y) => x - y);
  return weeks[Math.floor(weeks.length / 2)];
}

/** Where a challenge stands today. Missed means the finish line can no longer be reached in the time left. */
export function challengeView(c: ActiveChallenge, txs: Tx[], now: number, money: (n: number) => string): ChallengeView {
  const def = challengeDef(c.key);
  // challenges start the morning after they are joined... unless joined before noon, then today counts
  const start = new Date(c.startedAt).getHours() < 12 ? sod(c.startedAt) : sod(c.startedAt) + DAY;
  const ends = start + def.days * DAY;
  const today = sod(now);
  const dayOf = Math.max(0, Math.min(def.days, Math.floor((today - start) / DAY) + 1));
  const daysLeft = Math.max(0, Math.ceil((ends - today) / DAY) - 1);
  const inside = txs.filter((t) => t.occurred_at >= start && t.occurred_at < Math.min(ends, today + DAY));
  const logged = new Set(inside.map((t) => sod(t.occurred_at)));
  const spent = new Set(inside.filter((t) => t.type === 'expense' && !t.excluded).map((t) => sod(t.occurred_at)));
  let progress = 0, status: ChallengeStatus = 'running', line = '';
  if (c.key === 'nospend7') {
    progress = [...logged].filter((d) => !spent.has(d)).length;
    line = `${progress} of ${def.goal} no-spend days`;
    // days that can still become no-spend days: the rest of the window, plus today unless it already has a spend or counts
    const todayOpen = today < ends && !spent.has(today) && !(logged.has(today) && !spent.has(today)) ? 1 : 0;
    if (progress >= def.goal) status = 'won';
    else if (progress + daysLeft + todayOpen < def.goal) status = 'missed';
  } else if (c.key === 'log30') {
    // every day from the start up to yesterday must be logged; today still has time
    let run = 0;
    for (let d = start; d <= today; d += DAY) { const day = sod(d + 12 * 3600_000); if (logged.has(day)) run++; else if (day < today) { status = 'missed'; break; } }
    progress = run;
    line = status === 'missed' ? 'A day was missed. Start again any time.' : `${progress} of ${def.goal} days`;
    if (progress >= def.goal) status = 'won';
  } else if (c.key === 'lowweek') {
    const usual = usualWeek(txs, start);
    const cap = Math.round(usual * 0.8);
    const total = inside.filter(variable).reduce((s, t) => s + t.amount, 0);
    progress = dayOf;
    line = usual ? `${money(total)} of ${money(cap)} this week` : 'Needs a month of history to know your usual week';
    if (usual && total > cap) status = 'missed';
    else if (usual && today >= ends) status = 'won';
    if (!usual) status = 'missed';
  } else {
    // calm weekend: the first Saturday and Sunday on or after the start
    let sat = start; while (new Date(sat).getDay() !== 6) sat += DAY;
    const days = [sat, sat + DAY];
    const usualDay = usualWeek(txs, start) / 7;
    const per = (d: number) => txs.filter((t) => sod(t.occurred_at) === d && variable(t)).reduce((s, t) => s + t.amount, 0);
    const done = days.filter((d) => d < today + DAY && txs.some((t) => sod(t.occurred_at) === d) && per(d) <= usualDay);
    progress = done.length;
    line = usualDay ? `Under ${money(Math.round(usualDay))} each day · ${progress} of 2` : 'Needs a month of history to know your usual day';
    if (!usualDay || days.some((d) => d < today && (!txs.some((t) => sod(t.occurred_at) === d) || per(d) > usualDay))) status = 'missed';
    if (progress >= 2) status = 'won';
    return { def, progress, goal: 2, status, dayOf: Math.min(2, Math.max(0, Math.floor((today - sat) / DAY) + 1)), daysLeft: Math.max(0, Math.ceil((sat + 2 * DAY - today) / DAY) - 1), line, ends: sat + 2 * DAY };
  }
  return { def, progress, goal: def.goal, status, dayOf, daysLeft, line, ends };
}
