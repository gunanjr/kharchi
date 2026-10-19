/**
 * Money health score: a transparent 0 to 100 indicator built from four things, 25 points each. It is arithmetic on the
 * user's own figures, not advice, and the UI says so. Pure function: no I/O.
 */
export interface HealthInput {
  /** Average monthly income and expense over the months considered. */
  income: number;
  expense: number;
  /** Percent used (0 and up) of each budget this month. */
  budgetPcts: number[];
  /** Monthly cost of detected subscriptions. */
  subsMonthly: number;
  /** Sum of all account balances. */
  balance: number;
}

export interface HealthPart { key: 'savings' | 'budgets' | 'subs' | 'cushion'; label: string; points: number; value: string; tip: string }
export interface Health { score: number; parts: HealthPart[]; focus: HealthPart; band: 'Building' | 'Steady' | 'Strong' }

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const pct = (v: number) => `${Math.round(v * 100)}%`;

export function healthScore(i: HealthInput): Health {
  const rate = i.income > 0 ? (i.income - i.expense) / i.income : 0;
  const savings = Math.round(clamp(rate / 0.2) * 25);

  const adhered = i.budgetPcts.length ? i.budgetPcts.filter((p) => p <= 100).length / i.budgetPcts.length : 0.6; // no budgets: neutral-low
  const budgets = Math.round(adhered * 25);

  const load = i.income > 0 ? i.subsMonthly / i.income : 0;
  const subs = Math.round((1 - clamp((load - 0.05) / 0.1)) * 25); // free up to 5% of income, zero at 15%

  const months = i.expense > 0 ? i.balance / i.expense : 0;
  const cushion = Math.round(clamp(months / 3) * 25);

  const parts: HealthPart[] = [
    { key: 'savings', label: 'Savings rate', points: savings, value: i.income > 0 ? pct(Math.max(0, rate)) : 'No income yet', tip: 'Try to keep about a fifth of income. A small automatic set-aside on salary day is the easiest way.' },
    { key: 'budgets', label: 'Budgets kept', points: budgets, value: i.budgetPcts.length ? `${i.budgetPcts.filter((p) => p <= 100).length} of ${i.budgetPcts.length}` : 'None set', tip: i.budgetPcts.length ? 'Look at the budget that is over and check whether the limit or the habit needs to change.' : 'Set a monthly budget so there is a line to measure against.' },
    { key: 'subs', label: 'Subscription load', points: subs, value: i.income > 0 ? pct(load) + ' of income' : 'n/a', tip: 'Cancel one subscription you have not used this month. Insights lists them all.' },
    { key: 'cushion', label: 'Cash cushion', points: cushion, value: `${Math.max(0, months).toFixed(1)} months`, tip: 'Three months of spending in your accounts is a comfortable cushion. A goal can help you get there.' },
  ];
  const score = parts.reduce((a, p) => a + p.points, 0);
  const focus = [...parts].sort((a, b) => a.points - b.points)[0];
  return { score, parts, focus, band: score >= 75 ? 'Strong' : score >= 45 ? 'Steady' : 'Building' };
}
