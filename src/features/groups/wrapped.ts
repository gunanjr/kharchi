/**
 * "Group Wrapped": playful, shareable highlights worked out on the phone from a group's own expenses. Pure and
 * deterministic; the card is only shared if the user chooses to.
 */
export interface WrappedExpense { description: string; amount: number; currency: string; rate: number; occurred_at: number; payers: Record<string, number>; shares: Record<string, number> }
export interface WrappedMember { id: string; name: string }

export interface Award { key: 'hero' | 'bill' | 'day' | 'banker' | 'owes'; emoji: string; title: string; who: string; detail: string; amount: number }
export interface Wrapped { total: number; count: number; awards: Award[] }

const first = (n: string) => n.trim().split(/\s+/)[0] || n;
const inGroup = (e: WrappedExpense, group: string, v: number) => (e.currency === group || e.rate === 1 ? v : Math.round(v * e.rate));

export function buildWrapped(expenses: WrappedExpense[], members: WrappedMember[], balances: Record<string, number>, groupCurrency: string, fmtDay: (t: number) => string): Wrapped {
  const nm = new Map(members.map((m) => [m.id, first(m.name)]));
  const name = (id: string) => nm.get(id) ?? 'Someone';
  const paid = new Map<string, number>();
  let total = 0;
  let bill: { e: WrappedExpense; v: number } | null = null;
  const byDay = new Map<string, { t: number; v: number }>();
  for (const e of expenses) {
    const v = inGroup(e, groupCurrency, e.amount);
    total += v;
    if (!bill || v > bill.v) bill = { e, v };
    const d = new Date(e.occurred_at);
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const cur = byDay.get(k) ?? { t: e.occurred_at, v: 0 };
    cur.v += v;
    byDay.set(k, cur);
    for (const [id, a] of Object.entries(e.payers)) paid.set(id, (paid.get(id) ?? 0) + inGroup(e, groupCurrency, a));
  }
  const awards: Award[] = [];
  const topPayer = [...paid.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  if (topPayer && topPayer[1] > 0) awards.push({ key: 'hero', emoji: '💳', title: 'Wallet hero', who: name(topPayer[0]), detail: 'paid the most', amount: topPayer[1] });
  if (bill) awards.push({ key: 'bill', emoji: '🧾', title: 'Biggest bill', who: bill.e.description || 'Expense', detail: fmtDay(bill.e.occurred_at), amount: bill.v });
  const day = [...byDay.values()].sort((a, b) => b.v - a.v || b.t - a.t)[0];
  if (day && byDay.size > 1) awards.push({ key: 'day', emoji: '🔥', title: 'Busiest day', who: fmtDay(day.t), detail: 'most spent in a day', amount: day.v });
  const bal = members.map((m) => [m.id, balances[m.id] ?? 0] as const);
  const banker = [...bal].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  if (banker && banker[1] > 0) awards.push({ key: 'banker', emoji: '🏦', title: 'Everyone’s banker', who: name(banker[0]), detail: 'is owed the most', amount: banker[1] });
  const debtor = [...bal].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0];
  if (debtor && debtor[1] < 0) awards.push({ key: 'owes', emoji: '🫠', title: 'Bruh, pay up', who: name(debtor[0]), detail: 'owes the most', amount: -debtor[1] });
  return { total, count: expenses.length, awards };
}
