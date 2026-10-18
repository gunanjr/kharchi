import type { Db } from '@/db/types';
import type { Transaction } from '@/domain/types';
import { listTransactions } from '@/features/tracker/repo';
import { startOfMonth, endOfMonth } from '@/lib/date';
import * as A from './analytics';

/** Everything the Insights screen needs, from one query of the last 7 months. */
export async function loadInsights(db: Db, now = Date.now()) {
  const all = await listTransactions(db, { from: startOfMonth(now, -6), to: now + 1 });
  const cur = all.filter((t) => t.occurred_at >= startOfMonth(now));
  const prevAll = all.filter((t) => t.occurred_at >= startOfMonth(now, -1) && t.occurred_at <= endOfMonth(now, -1));
  const samePointPrev = prevAll.filter((t) => t.occurred_at <= startOfMonth(now, -1) + (now - startOfMonth(now)));
  const sum = (l: Transaction[], ty: Transaction['type']) => l.filter((t) => t.type === ty).reduce((a, t) => a + t.amount, 0);
  const expense = sum(cur, 'expense');
  const income = sum(cur, 'income');
  return {
    all, cur, expense, income,
    prevExpenseSamePoint: sum(samePointPrev, 'expense'),
    byCat: A.byCategory(cur),
    prevByCat: A.byCategory(prevAll),
    merchants: A.topMerchants(cur, 5),
    trend: A.monthlyTrend(all, now, 6),
    heat: A.dailyTotals(all, now - 89 * 86_400_000, 90),
    forecast: A.forecastMonth(all, now),
    subs: A.detectSubscriptions(all),
    anomalies: A.detectAnomalies(all, startOfMonth(now)),
  };
}
