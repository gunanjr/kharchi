import type { Db } from '@/db/types';
import { addTransaction, listAccounts, setBudget } from '@/features/tracker/repo';
import { DAY, startOfDay, startOfMonth } from '@/lib/date';
import { addRecurring } from '@/features/tracker/recurring';
import { learnMerchant } from '@/features/parser/merchants';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const SPEND: { merchant: string; cat: string; min: number; max: number; weight: number; pay: 'upi' | 'card' | 'cash' }[] = [
  { merchant: 'Swiggy', cat: 'food', min: 180, max: 650, weight: 9, pay: 'upi' },
  { merchant: 'Zomato', cat: 'food', min: 220, max: 800, weight: 5, pay: 'upi' },
  { merchant: 'Chai Point', cat: 'food', min: 60, max: 220, weight: 6, pay: 'upi' },
  { merchant: 'Starbucks', cat: 'food', min: 300, max: 550, weight: 2, pay: 'card' },
  { merchant: 'BigBasket', cat: 'groceries', min: 600, max: 2600, weight: 4, pay: 'upi' },
  { merchant: 'Blinkit', cat: 'groceries', min: 150, max: 900, weight: 6, pay: 'upi' },
  { merchant: 'Uber', cat: 'transport', min: 120, max: 520, weight: 6, pay: 'upi' },
  { merchant: 'Rapido', cat: 'transport', min: 40, max: 160, weight: 4, pay: 'upi' },
  { merchant: 'Metro Card', cat: 'transport', min: 200, max: 500, weight: 1, pay: 'upi' },
  { merchant: 'Amazon', cat: 'shopping', min: 299, max: 4200, weight: 4, pay: 'card' },
  { merchant: 'Myntra', cat: 'shopping', min: 600, max: 3500, weight: 1.5, pay: 'card' },
  { merchant: 'Apollo Pharmacy', cat: 'health', min: 150, max: 1400, weight: 1.5, pay: 'upi' },
  { merchant: 'BookMyShow', cat: 'entertainment', min: 300, max: 900, weight: 1.2, pay: 'card' },
  { merchant: 'Airtel Recharge', cat: 'bills', min: 299, max: 299, weight: 0.4, pay: 'upi' },
];

/** Populate ~3 months of realistic data so charts, budgets and the assistant look great on first run. */
export async function seedDemoData(db: Db, now = Date.now()): Promise<number> {
  const rand = rng(42);
  const accounts = await listAccounts(db);
  const upi = accounts.find((a) => a.type === 'upi')?.id ?? null;
  const bank = accounts.find((a) => a.type === 'bank')?.id ?? null;
  const cash = accounts.find((a) => a.type === 'cash')?.id ?? null;
  const acct = { upi, card: bank, cash };
  const totalW = SPEND.reduce((a, b) => a + b.weight, 0);
  let n = 0;

  await db.transaction(async () => {
    for (let m = 2; m >= 0; m--) {
      const monthStart = startOfMonth(now, -m);
      await addTransaction(db, { type: 'income', amount: 8500000, category_id: 'cat_salary', merchant: 'Acme Corp', note: 'Salary', account_id: bank, occurred_at: monthStart + DAY + 9 * 3600_000, source: 'import' });
      await addTransaction(db, { type: 'expense', amount: 2200000, category_id: 'cat_rent', merchant: 'Rent', account_id: bank, occurred_at: monthStart + 4 * DAY + 10 * 3600_000, source: 'import' });
      await addTransaction(db, { type: 'expense', amount: 189900, category_id: 'cat_subscriptions', merchant: 'Netflix', account_id: bank, occurred_at: monthStart + 6 * DAY + 8 * 3600_000, source: 'import' });
      await addTransaction(db, { type: 'expense', amount: 119900, category_id: 'cat_subscriptions', merchant: 'Spotify', account_id: bank, occurred_at: monthStart + 8 * DAY + 8 * 3600_000, source: 'import' });
      await addTransaction(db, { type: 'expense', amount: 145000 + Math.round(rand() * 60000), category_id: 'cat_bills', merchant: 'BESCOM Electricity', account_id: bank, occurred_at: monthStart + 11 * DAY + 11 * 3600_000, source: 'import' });
      n += 5;
      const endDay = m === 0 ? Math.max(1, Math.floor((now - monthStart) / DAY)) : 28;
      for (let d = 0; d < endDay; d++) {
        const count = rand() < 0.2 ? 0 : rand() < 0.6 ? 1 : rand() < 0.8 ? 2 : 3;
        for (let k = 0; k < count; k++) {
          let pick = rand() * totalW;
          const s = SPEND.find((x) => (pick -= x.weight) <= 0) ?? SPEND[0];
          let amount = Math.round(s.min + rand() * (s.max - s.min)) * 100;
          // one deliberate outlier in the current month so anomaly detection has something to find
          if (m === 0 && d === Math.min(endDay - 1, 5) && k === 0) (amount = 1899900, (s.merchant === 'Amazon' || (s as any).merchant));
          const at = startOfDay(monthStart + d * DAY) + (8 + Math.floor(rand() * 14)) * 3600_000 + Math.floor(rand() * 59) * 60_000;
          if (at > now) continue;
          await addTransaction(db, {
            type: 'expense', amount, category_id: `cat_${s.cat}`, merchant: s.merchant, account_id: acct[s.pay], payment_method: s.pay === 'card' ? 'card' : s.pay === 'cash' ? 'cash' : 'upi',
            occurred_at: at, source: s.pay === 'upi' ? 'sms' : 'manual',
          });
          n++;
        }
      }
    }
    await setBudget(db, null, 5500000, 85);
    await setBudget(db, 'cat_food', 1000000, 80);
    await setBudget(db, 'cat_groceries', 600000, 80);
    await setBudget(db, 'cat_transport', 350000, 80);
    await setBudget(db, 'cat_shopping', 500000, 80);
    await addRecurring(db, { type: 'expense', amount: 189900, category_id: 'cat_subscriptions', merchant: 'Netflix' }, 'monthly', startOfMonth(now, 1) + 6 * DAY);
    for (const [m, c] of [['Swiggy', 'cat_food'], ['Zomato', 'cat_food'], ['Uber', 'cat_transport'], ['BigBasket', 'cat_groceries']]) {
      await learnMerchant(db, m, c);
      await learnMerchant(db, m, c);
    }
  });
  return n;
}
