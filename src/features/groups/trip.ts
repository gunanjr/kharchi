/**
 * Trip mode: a group with a start, an end and an optional daily budget. Everything here is arithmetic on the group's
 * own expenses; nothing is sent or enforced. "Who pays next" is a suggestion that evens things out.
 */
export interface TripSpec { start: number; end: number; dailyBudget: number | null }
export interface TripExpense { amount: number; currency: string; rate: number; occurred_at: number }

const DAY = 86400000;
const dayStart = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

export interface TripStatus {
  phase: 'upcoming' | 'on' | 'over';
  dayNo: number;
  totalDays: number;
  daysLeft: number;
  spentToday: number;
  spentTotal: number;
  /** Total budget across the whole trip, or null if no daily budget. */
  budgetTotal: number | null;
  /** What is left of today's budget (negative = over), or null. */
  leftToday: number | null;
  /** Average daily spend so far, over the days that have started. */
  perDay: number;
  pace: 'under' | 'on' | 'over' | null;
}

export function tripStatus(trip: TripSpec, expenses: TripExpense[], groupCurrency: string, now: number): TripStatus {
  const start = dayStart(trip.start);
  const end = Math.max(start, dayStart(trip.end));
  const totalDays = Math.round((end - start) / DAY) + 1;
  const today = dayStart(now);
  const phase = today < start ? 'upcoming' : today > end ? 'over' : 'on';
  const dayNo = phase === 'upcoming' ? 0 : Math.min(totalDays, Math.round((today - start) / DAY) + 1);
  const daysLeft = phase === 'over' ? 0 : phase === 'upcoming' ? totalDays : totalDays - dayNo;
  let spentToday = 0;
  let spentTotal = 0;
  for (const e of expenses) {
    const t = dayStart(e.occurred_at);
    if (t < start || t > end) continue;
    const v = Math.round(e.currency === groupCurrency || e.rate === 1 ? e.amount : e.amount * e.rate);
    spentTotal += v;
    if (t === today) spentToday += v;
  }
  const started = Math.max(1, dayNo || totalDays);
  const perDay = Math.round(spentTotal / (phase === 'over' ? totalDays : started));
  const b = trip.dailyBudget && trip.dailyBudget > 0 ? trip.dailyBudget : null;
  const pace = b === null ? null : perDay > b * 1.05 ? 'over' : perDay < b * 0.85 ? 'under' : 'on';
  return { phase, dayNo, totalDays, daysLeft, spentToday, spentTotal, budgetTotal: b === null ? null : b * totalDays, leftToday: b === null || phase !== 'on' ? null : b - spentToday, perDay, pace };
}

export interface NextPayer { id: string; behind: number }

/**
 * The person who is furthest behind on paying (lowest balance), so the next bill evens things out. Ties go to whoever
 * has paid fewer bills, then to the lowest id so the answer is stable. Nobody is suggested when the group is already
 * even (within `tolerance` minor units).
 */
export function nextPayer(balances: Record<string, number>, timesPaid: Record<string, number>, tolerance = 5000): NextPayer | null {
  const ids = Object.keys(balances);
  if (ids.length < 2) return null;
  const sorted = [...ids].sort((a, b) => balances[a] - balances[b] || (timesPaid[a] ?? 0) - (timesPaid[b] ?? 0) || a.localeCompare(b));
  const top = sorted[0];
  return -balances[top] <= tolerance ? null : { id: top, behind: -balances[top] };
}
