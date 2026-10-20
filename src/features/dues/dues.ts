/**
 * Due dates (Pro): monthly bills the user wants to pay on time (credit card, rent, EMI, electricity, anything).
 * Pure date logic with tests: short months (a "31st" bill is due on the last day), paid-this-month tracking, overdue,
 * and the date to remind on.
 */
export type DueKind = 'card' | 'rent' | 'emi' | 'bill' | 'other';
export interface DueItem {
  id: string;
  name: string;
  kind: DueKind;
  /** paise; optional because card bills change every month */
  amount: number | null;
  /** day of the month it is due, 1 to 31 */
  day: number;
  /** remind this many days before (0 = on the day) */
  remindBefore: 0 | 1 | 3;
  /** months already paid, as 'YYYY-MM' */
  paid: string[];
  /** the due date a reminder is already set for (avoids duplicates) */
  remindedFor?: number;
}

const DAY = 86_400_000;
export const monthKey = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** The due date in a given month (clamped to the month's last day), at midday local time. */
export function dueIn(item: Pick<DueItem, 'day'>, year: number, month: number): number {
  const day = Math.min(Math.max(1, Math.round(item.day)), daysIn(year, month));
  return new Date(year, month, day, 12).getTime();
}

export type DueStatus = 'paid' | 'overdue' | 'today' | 'soon' | 'later';
export interface DueView extends DueItem { due: number; status: DueStatus; inDays: number; month: string }

const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

/**
 * What the user should see now for one bill: this month's due date while it is unpaid (even when overdue), otherwise
 * next month's.
 */
export function viewOf(item: DueItem, now: number): DueView {
  const d = new Date(now);
  const thisDue = dueIn(item, d.getFullYear(), d.getMonth());
  const thisMonth = monthKey(thisDue);
  let due = thisDue;
  if (item.paid.includes(thisMonth)) due = dueIn(item, d.getFullYear(), d.getMonth() + 1);
  const month = monthKey(due);
  const inDays = Math.round((startOfDay(due) - startOfDay(now)) / DAY);
  const status: DueStatus = item.paid.includes(month) ? 'paid' : inDays < 0 ? 'overdue' : inDays === 0 ? 'today' : inDays <= 3 ? 'soon' : 'later';
  return { ...item, due, status, inDays, month };
}

const ORDER: Record<DueStatus, number> = { overdue: 0, today: 1, soon: 2, later: 3, paid: 4 };
export function viewAll(items: DueItem[], now: number): DueView[] {
  return items.map((i) => viewOf(i, now)).sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.due - b.due);
}

/** This month at a glance: what is due in total (known amounts) and how much of it is paid. */
export function monthSummary(items: DueItem[], now: number) {
  const d = new Date(now);
  const key = monthKey(now);
  let due = 0, paid = 0, count = 0, paidCount = 0;
  for (const i of items) {
    count++;
    const isPaid = i.paid.includes(key);
    if (isPaid) paidCount++;
    if (i.amount) { due += i.amount; if (isPaid) paid += i.amount; }
  }
  return { month: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), due, paid, count, paidCount };
}

/** Mark this month's (or the shown month's) bill paid, or undo it. Keeps only the last 24 months of history. */
export function togglePaid(item: DueItem, month: string): DueItem {
  const has = item.paid.includes(month);
  const paid = has ? item.paid.filter((m) => m !== month) : [...item.paid, month].sort().slice(-24);
  return { ...item, paid };
}

/** When to remind for the shown due date: 10 am, `remindBefore` days earlier. Null if that moment has passed. */
export function reminderAt(v: DueView, now: number): number | null {
  if (v.status === 'paid') return null;
  const d = new Date(v.due - v.remindBefore * DAY);
  d.setHours(10, 0, 0, 0);
  return d.getTime() > now ? d.getTime() : null;
}

/** Days of a month that have a bill due, for the calendar strip. */
export function calendarMonth(items: DueItem[], year: number, month: number): { day: number; count: number }[] {
  const n = daysIn(year, month);
  const counts = new Array(n).fill(0);
  for (const i of items) counts[new Date(dueIn(i, year, month)).getDate() - 1]++;
  return counts.map((count, k) => ({ day: k + 1, count }));
}

export function validateDue(input: { name: string; day: number; amountText?: string }): string | null {
  if (!input.name.trim()) return 'Give it a name, like “HDFC card” or “Rent”.';
  if (input.name.trim().length > 40) return 'Keep the name under 40 characters.';
  if (!Number.isInteger(input.day) || input.day < 1 || input.day > 31) return 'Pick a due day from 1 to 31.';
  return null;
}
