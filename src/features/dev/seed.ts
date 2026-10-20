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

type Pay = 'upi' | 'card' | 'cash';
/** [merchant, category key, min rupees, max rupees, weight, how it was paid]. Most merchants have a built-in icon. */
const SPEND: [string, string, number, number, number, Pay][] = [
  ['Swiggy', 'food', 180, 750, 9, 'upi'], ['Zomato', 'food', 220, 850, 6, 'upi'], ['Chai Point', 'food', 60, 220, 3, 'upi'],
  ['Starbucks', 'food', 300, 650, 2, 'card'], ['Third Wave Coffee', 'food', 220, 480, 2, 'upi'], ['Blue Tokai', 'food', 250, 520, 1, 'upi'],
  ['Chaayos', 'food', 120, 320, 2, 'upi'], ['McDonald’s', 'food', 180, 520, 2, 'upi'], ['KFC', 'food', 250, 700, 1.2, 'upi'],
  ['Domino’s', 'food', 300, 900, 1.5, 'upi'], ['Burger King', 'food', 200, 550, 1, 'upi'], ['Haldiram’s', 'food', 150, 600, 1, 'cash'],
  ['EatSure', 'food', 250, 700, 1, 'upi'], ['Theobroma', 'food', 180, 650, 0.6, 'card'], ['Baskin Robbins', 'food', 150, 450, 0.6, 'upi'],
  ['Barbeque Nation', 'food', 1400, 3800, 0.3, 'card'], ['Wow! Momo', 'food', 150, 400, 0.8, 'upi'], ['Costa Coffee', 'food', 250, 550, 0.6, 'card'],
  ['Box8', 'food', 200, 450, 0.8, 'upi'],
  ['BigBasket', 'groceries', 600, 2800, 3, 'upi'], ['Blinkit', 'groceries', 150, 950, 5, 'upi'], ['Zepto', 'groceries', 150, 900, 4, 'upi'],
  ['Swiggy Instamart', 'groceries', 150, 850, 3, 'upi'], ['DMart', 'groceries', 900, 3500, 1, 'card'], ['JioMart', 'groceries', 400, 1800, 0.8, 'upi'],
  ['Licious', 'groceries', 350, 1100, 0.8, 'upi'], ['Country Delight', 'groceries', 300, 900, 1, 'upi'], ['Amul', 'groceries', 60, 300, 1, 'cash'],
  ['Nandini', 'groceries', 40, 200, 0.8, 'cash'],
  ['Uber', 'transport', 120, 620, 5, 'upi'], ['Ola', 'transport', 110, 540, 3, 'upi'], ['Rapido', 'transport', 40, 180, 4, 'upi'],
  ['Namma Yatri', 'transport', 60, 260, 2, 'upi'], ['Indian Oil', 'transport', 500, 2500, 1.2, 'card'], ['HPCL', 'transport', 500, 2200, 0.8, 'card'],
  ['Delhi Metro', 'transport', 200, 500, 1, 'upi'], ['Park+', 'transport', 50, 200, 0.6, 'upi'],
  ['Amazon', 'shopping', 299, 4200, 4, 'card'], ['Flipkart', 'shopping', 299, 3800, 2.5, 'card'], ['Myntra', 'shopping', 600, 3500, 1.5, 'card'],
  ['Ajio', 'shopping', 600, 2800, 0.8, 'card'], ['Nykaa', 'shopping', 400, 2200, 1, 'card'], ['Meesho', 'shopping', 200, 900, 0.6, 'upi'],
  ['Croma', 'shopping', 1500, 9000, 0.3, 'card'], ['IKEA', 'shopping', 800, 6500, 0.3, 'card'], ['Decathlon', 'shopping', 500, 4500, 0.5, 'card'],
  ['Uniqlo', 'shopping', 1500, 4500, 0.4, 'card'], ['Zara', 'shopping', 2000, 6000, 0.3, 'card'], ['H&M', 'shopping', 800, 3500, 0.4, 'card'],
  ['Lenskart', 'shopping', 1200, 4500, 0.15, 'card'], ['Shopsy', 'shopping', 150, 700, 0.4, 'upi'], ['Bewakoof', 'shopping', 400, 1500, 0.3, 'upi'],
  ['Skechers', 'shopping', 2500, 6000, 0.1, 'card'], ['Ferns N Petals', 'shopping', 600, 1800, 0.2, 'card'],
  ['Apollo Pharmacy', 'health', 150, 1400, 1.2, 'upi'], ['Tata 1mg', 'health', 200, 1600, 0.8, 'upi'], ['PharmEasy', 'health', 200, 1500, 0.6, 'upi'],
  ['Practo', 'health', 400, 900, 0.3, 'upi'], ['Healthians', 'health', 600, 2800, 0.15, 'card'],
  ['BookMyShow', 'entertainment', 300, 1200, 1.2, 'card'], ['PVR', 'entertainment', 350, 1400, 0.8, 'card'], ['Steam', 'entertainment', 300, 2500, 0.3, 'card'],
  ['PlayStation', 'entertainment', 500, 4000, 0.2, 'card'], ['Wonderla', 'entertainment', 1200, 3500, 0.1, 'card'], ['District', 'entertainment', 400, 2500, 0.4, 'card'],
  ['MakeMyTrip', 'travel', 2500, 14000, 0.25, 'card'], ['IndiGo', 'travel', 3500, 12000, 0.2, 'card'], ['IRCTC', 'travel', 400, 2800, 0.4, 'upi'],
  ['Airbnb', 'travel', 3000, 15000, 0.12, 'card'], ['OYO', 'travel', 1200, 4500, 0.15, 'upi'], ['redBus', 'travel', 600, 1800, 0.3, 'upi'],
  ['Goibibo', 'travel', 2000, 9000, 0.15, 'card'],
  ['Udemy', 'education', 449, 3200, 0.15, 'card'], ['Coursera', 'education', 2000, 4000, 0.08, 'card'], ['Kindle', 'education', 150, 600, 0.3, 'card'],
  ['Urban Company', 'rent', 350, 2500, 0.6, 'upi'],
];

/** Fixed monthly charges: [amount in paise, category, merchant, day of month]. */
const FIXED: [number, string, string, number][] = [
  [189900, 'cat_subscriptions', 'Netflix', 6], [119900, 'cat_subscriptions', 'Spotify', 8], [64900, 'cat_subscriptions', 'YouTube', 5],
  [199900, 'cat_subscriptions', 'ChatGPT', 9], [7500, 'cat_subscriptions', 'iCloud', 10], [29900, 'cat_subscriptions', 'Disney+ Hotstar', 12],
  [59900, 'cat_bills', 'Jio', 3], [117800, 'cat_bills', 'ACT Fibernet', 7], [249900, 'cat_health', 'cult.fit', 1],
];

const TAGS: Record<string, string[]> = {
  Uber: ['commute'], Ola: ['commute'], Rapido: ['commute'], 'Namma Yatri': ['commute'], 'Delhi Metro': ['commute'],
  Swiggy: ['eating-out'], Zomato: ['eating-out'], EatSure: ['eating-out'],
  Amazon: ['online'], Flipkart: ['online'], Myntra: ['online'], Ajio: ['online'], Nykaa: ['online'],
  BigBasket: ['home'], Blinkit: ['home'], Zepto: ['home'], 'Swiggy Instamart': ['home'],
  MakeMyTrip: ['trip'], IndiGo: ['trip'], Airbnb: ['trip'], OYO: ['trip'],
};
const NOTES = ['Team lunch', 'For the weekend', 'Birthday plan', 'Refill', 'Gift for a friend', 'Late night order'];

/**
 * Populate 12 months of varied, realistic data (about 80 merchants, most with built-in icons, plus fixed bills and
 * subscriptions) so a heavy user's app can be seen. Deterministic: the same data on every phone and every run.
 */
export async function seedDemoData(db: Db, now = Date.now()): Promise<number> {
  const rand = rng(42);
  const accounts = await listAccounts(db);
  const upi = accounts.find((a) => a.type === 'upi')?.id ?? null;
  const bank = accounts.find((a) => a.type === 'bank')?.id ?? null;
  const cash = accounts.find((a) => a.type === 'cash')?.id ?? null;
  const acct = { upi, card: bank, cash };
  const totalW = SPEND.reduce((a, b) => a + b[4], 0);
  let n = 0;
  const add = async (t: Parameters<typeof addTransaction>[1]) => {
    if ((t.occurred_at ?? 0) > now) return;
    await addTransaction(db, t);
    n++;
  };

  await db.transaction(async () => {
    for (let m = 11; m >= 0; m--) {
      const monthStart = startOfMonth(now, -m);
      await add({ type: 'income', amount: 12500000, category_id: 'cat_salary', merchant: 'Acme Corp', note: 'Salary', account_id: bank, occurred_at: monthStart + DAY + 9 * 3600_000, source: 'import' });
      await add({ type: 'expense', amount: 2200000, category_id: 'cat_rent', merchant: 'Rent', account_id: bank, occurred_at: monthStart + 4 * DAY + 10 * 3600_000, source: 'import' });
      for (const [amount, cat, merchant, day] of FIXED) await add({ type: 'expense', amount, category_id: cat, merchant, account_id: bank, occurred_at: monthStart + day * DAY + 8 * 3600_000, source: 'import' });
      await add({ type: 'expense', amount: 145000 + Math.round(rand() * 60000), category_id: 'cat_bills', merchant: 'BESCOM Electricity', account_id: bank, occurred_at: monthStart + 11 * DAY + 11 * 3600_000, source: 'import' });
      await add({ type: 'expense', amount: 80000 + Math.round(rand() * 30000), category_id: 'cat_bills', merchant: 'Mahanagar Gas', account_id: bank, occurred_at: monthStart + 16 * DAY + 11 * 3600_000, source: 'import' });
      await add({ type: 'income', amount: 1200000 + Math.round(rand() * 800000), category_id: 'cat_freelance', merchant: 'Freelance project', note: 'Design work', tags: ['side-income'], account_id: bank, occurred_at: monthStart + 14 * DAY + 15 * 3600_000, source: 'import' });
      await add({ type: 'expense', amount: 500000, category_id: 'cat_other', merchant: 'Zerodha', note: 'Monthly SIP', tags: ['investing'], account_id: bank, occurred_at: monthStart + 2 * DAY + 9 * 3600_000, source: 'import' });
      if (m % 3 === 0) await add({ type: 'expense', amount: 1840000, category_id: 'cat_other', merchant: 'LIC', note: 'Quarterly premium', tags: ['insurance'], account_id: bank, occurred_at: monthStart + 20 * DAY + 10 * 3600_000, source: 'import' });
      if (m % 2 === 0) await add({ type: 'income', amount: 150000 + Math.round(rand() * 400000), category_id: 'cat_refund', merchant: 'Amazon', note: 'Refund', account_id: bank, occurred_at: monthStart + 18 * DAY + 12 * 3600_000, source: 'import' });

      const endDay = m === 0 ? Math.max(1, Math.floor((now - monthStart) / DAY)) : Math.round((startOfMonth(now, -m + 1) - monthStart) / DAY);
      for (let d = 0; d < endDay; d++) {
        const r0 = rand();
        const count = r0 < 0.12 ? 0 : r0 < 0.4 ? 1 : r0 < 0.7 ? 2 : r0 < 0.9 ? 3 : 4;
        for (let k = 0; k < count; k++) {
          let pick = rand() * totalW;
          const [merchant, cat, min, max, , pay] = SPEND.find((x) => (pick -= x[4]) <= 0) ?? SPEND[0];
          const amount = Math.round(min + rand() * (max - min)) * 100;
          const at = startOfDay(monthStart + d * DAY) + (8 + Math.floor(rand() * 14)) * 3600_000 + Math.floor(rand() * 59) * 60_000;
          const tags = [...(TAGS[merchant] ?? []), ...(rand() < 0.08 ? ['work'] : []), ...(rand() < 0.06 ? ['treat'] : [])];
          await add({
            type: 'expense', amount, category_id: `cat_${cat}`, merchant, account_id: acct[pay], payment_method: pay === 'card' ? 'card' : pay === 'cash' ? 'cash' : 'upi',
            occurred_at: at, source: pay === 'upi' ? 'sms' : 'manual', tags, note: rand() < 0.1 ? NOTES[Math.floor(rand() * NOTES.length)] : null,
          });
        }
      }
    }
    // one deliberate outlier in the current month so anomaly detection always has something to find
    await add({ type: 'expense', amount: 1899900, category_id: 'cat_shopping', merchant: 'Amazon', account_id: acct.card, payment_method: 'card', occurred_at: startOfMonth(now) + 3 * DAY + 14 * 3600_000, source: 'manual', tags: ['online'], note: 'Laptop bag and accessories' });
    await setBudget(db, null, 11000000, 85);
    await setBudget(db, 'cat_food', 1000000, 80);
    await setBudget(db, 'cat_groceries', 600000, 80);
    await setBudget(db, 'cat_transport', 350000, 80);
    await setBudget(db, 'cat_shopping', 500000, 80);
    await setBudget(db, 'cat_entertainment', 300000, 80);
    await setBudget(db, 'cat_health', 250000, 80);
    await addRecurring(db, { type: 'expense', amount: 189900, category_id: 'cat_subscriptions', merchant: 'Netflix' }, 'monthly', startOfMonth(now, 1) + 6 * DAY);
    for (const [m, c] of [['Swiggy', 'cat_food'], ['Zomato', 'cat_food'], ['Uber', 'cat_transport'], ['BigBasket', 'cat_groceries'], ['Blinkit', 'cat_groceries'], ['Amazon', 'cat_shopping']]) {
      await learnMerchant(db, m, c);
      await learnMerchant(db, m, c);
    }
  });
  return n;
}
