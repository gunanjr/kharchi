/** Warranty vault (Pro): what was bought, when the warranty ends, and reminders before it does. Pure and tested. */
export interface Warranty {
  id: string;
  item: string;
  store: string;
  boughtAt: number;
  months: number;
  amount: number | null;
  /** private copy of the bill photo, if any */
  receipt: string | null;
  /** the end date reminders are already set for */
  remindedFor?: number;
}

const DAY = 86_400_000;
/** End date: the same day N months later (clamped to month end), at the end of that day. */
export function endsAt(w: Pick<Warranty, 'boughtAt' | 'months'>): number {
  const d = new Date(w.boughtAt);
  const target = new Date(d.getFullYear(), d.getMonth() + w.months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), last));
  target.setHours(23, 59, 59, 0);
  return target.getTime();
}

export type WarrantyStatus = 'active' | 'ending' | 'expired';
export function status(w: Warranty, now: number): { status: WarrantyStatus; daysLeft: number; end: number } {
  const end = endsAt(w);
  const daysLeft = Math.ceil((end - now) / DAY);
  return { end, daysLeft, status: daysLeft < 0 ? 'expired' : daysLeft <= 30 ? 'ending' : 'active' };
}

/** Reminder moments: 30 days and 7 days before the end, at 10 am, only those still in the future. */
export function reminderTimes(w: Warranty, now: number): number[] {
  const end = endsAt(w);
  return [30, 7].map((n) => { const d = new Date(end - n * DAY); d.setHours(10, 0, 0, 0); return d.getTime(); }).filter((t) => t > now);
}

export function sortWarranties(list: Warranty[], now: number): Warranty[] {
  const rank: Record<WarrantyStatus, number> = { ending: 0, active: 1, expired: 2 };
  return [...list].sort((a, b) => { const x = status(a, now), y = status(b, now); return rank[x.status] - rank[y.status] || x.end - y.end; });
}

export function validateWarranty(i: { item: string; months: number; boughtAt: number }, now: number): string | null {
  if (!i.item.trim()) return 'What did you buy? For example “Phone” or “Fridge”.';
  if (i.item.trim().length > 50) return 'Keep the name under 50 characters.';
  if (!Number.isInteger(i.months) || i.months < 1 || i.months > 120) return 'Warranty length must be 1 to 120 months.';
  if (i.boughtAt > now + DAY) return 'The purchase date cannot be in the future.';
  if (i.boughtAt < new Date(2000, 0, 1).getTime()) return 'That purchase date looks too old.';
  return null;
}
