import type { Db } from '@/db/types';
import { accountBalance, listAccounts, listBudgets, listTransactions, spendByCategory, totalsBetween } from '@/features/tracker/repo';
import { budgetProgress } from '@/features/tracker/budgets';
import { DAY, daysInMonth, endOfMonth, startOfMonth } from '@/lib/date';
import { detectSubscriptions } from './analytics';
import { healthScore, type Health } from './health';

/** Gathers the four inputs from the local database: the last three full months, this month's budgets, subscriptions and balances. */
export async function loadHealth(db: Db, now = Date.now()): Promise<Health> {
  let income = 0, expense = 0;
  for (let m = 1; m <= 3; m++) {
    const t = await totalsBetween(db, startOfMonth(now, -m), endOfMonth(now, -m));
    income += t.income;
    expense += t.expense;
  }
  const budgets = await listBudgets(db);
  const by = await spendByCategory(db, startOfMonth(now), endOfMonth(now));
  const tot = await totalsBetween(db, startOfMonth(now), endOfMonth(now));
  const day = new Date(now).getDate();
  const budgetPcts = budgets.map((b) => budgetProgress(b, b.category_id ? (by.find((x) => x.category_id === b.category_id)?.total ?? 0) : tot.expense, day, daysInMonth(now)).pct);

  const all = await listTransactions(db, { from: now - 200 * DAY, to: now + 1 });
  const subsMonthly = detectSubscriptions(all.filter((t) => t.category_id === 'cat_subscriptions')).reduce((a, s) => a + Math.round((s.amount * 30) / s.everyDays), 0);

  let balance = 0;
  for (const a of await listAccounts(db)) balance += await accountBalance(db, a.id);

  return healthScore({ income: income / 3, expense: expense / 3, budgetPcts, subsMonthly, balance });
}
