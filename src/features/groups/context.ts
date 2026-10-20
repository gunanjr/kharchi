/** What sits behind a debt, for the settle-up message: the biggest things the friend owes for and how long it has waited. */
export interface CtxExpense { description: string; amount: number; rate: number; currency: string; occurred_at: number; payers: Record<string, number>; shares: Record<string, number> }

export function nudgeContext(expenses: CtxExpense[], debtorId: string, creditorId: string, now: number): { items: string[]; daysOwed: number | null } {
  const rows: { d: string; v: number; t: number }[] = [];
  for (const e of expenses) {
    const total = Object.values(e.payers).reduce((a, b) => a + b, 0);
    const paid = e.payers[creditorId] ?? 0;
    const share = e.shares[debtorId] ?? 0;
    if (total <= 0 || paid <= 0 || share <= 0 || debtorId === creditorId) continue;
    rows.push({ d: e.description.trim(), v: (share * paid) / total, t: e.occurred_at });
  }
  if (!rows.length) return { items: [], daysOwed: null };
  const items = [...rows].sort((a, b) => b.v - a.v).map((r) => r.d).filter(Boolean);
  const oldest = Math.min(...rows.map((r) => r.t));
  return { items: [...new Set(items)].slice(0, 2), daysOwed: Math.max(0, Math.floor((now - oldest) / 86400000)) };
}
