import type { Db } from '@/db/types';
import { addAccount, addTransaction, listAccounts, setBudget, updateAccount } from '@/features/tracker/repo';
import { addRecurring } from '@/features/tracker/recurring';
import { addComment, addGroupExpense, addPerson, createGroup, ensureSelf, listExpenses, listPeople, recordSettlement } from '@/features/groups/repo';
import { addGoal, contribute } from '@/features/goals/repo';
import { ingest } from '@/features/pending/service';
import { SAMPLES } from '@/features/parser/samples';
import { seedDemoData } from './seed';
import { seedGroupDemo } from './seedGroups';
import { DAY } from '@/lib/date';

/**
 * One call that fills EVERY part of the app so nothing looks empty: three months of spending with tags and notes, six
 * accounts, budgets, recurring items due soon, savings goals (one finished), three groups using every split type with
 * settlements and comments, friends, and a few bank messages waiting on Home. Idempotent only on an empty database:
 * the callers check first.
 */
export async function seedEverything(db: Db, now = Date.now()): Promise<void> {
  await seedDemoData(db, now);
  await seedGroupDemo(db, now);

  const accounts = await listAccounts(db);
  const bank = accounts.find((a) => a.type === 'bank')?.id ?? null;
  for (const a of accounts) if (a.type === 'upi') await updateAccount(db, a.id, { opening_balance: 6000000 });
  for (const a of accounts) if (a.type === 'cash') await updateAccount(db, a.id, { opening_balance: 800000 });
  const card = await addAccount(db, { name: 'HDFC Regalia', type: 'card', last4: '4821', opening_balance: 0, icon: '💳' });
  await addAccount(db, { name: 'Paytm Wallet', type: 'wallet', opening_balance: 350000, icon: '👛' });
  await addAccount(db, { name: 'Savings (SBI)', type: 'bank', last4: '9034', opening_balance: 18500000, icon: '🏦' });
  await addTransaction(db, { type: 'transfer', amount: 1500000, account_id: bank, to_account_id: card, merchant: 'Card bill payment', occurred_at: now - 3 * DAY, source: 'manual' });

  // recurring items landing inside the 10-day "Coming up" window
  const r = (name: string, amount: number, cat: string, days: number, f: 'weekly' | 'monthly' | 'yearly' = 'monthly') =>
    addRecurring(db, { type: 'expense', amount, category_id: cat, merchant: name }, f, now + days * DAY);
  await r('Mutual fund SIP', 500000, 'cat_other', 2);
  await r('Spotify', 119900, 'cat_subscriptions', 4);
  await r('Electricity (BESCOM)', 165000, 'cat_bills', 6);
  await r('Cult.fit membership', 350000, 'cat_health', 8);
  await r('Domain renewal', 129900, 'cat_subscriptions', 9, 'yearly');
  await setBudget(db, 'cat_entertainment', 200000, 80);
  await setBudget(db, 'cat_bills', 500000, 80);

  // savings goals: in progress, nearly there, and one finished
  const goal = async (name: string, icon: string, color: string, target: number, saved: number[], deadlineDays: number | null) => {
    const id = await addGoal(db, { name, icon, color, target, deadline: deadlineDays === null ? null : now + deadlineDays * DAY });
    for (let i = 0; i < saved.length; i++) await contribute(db, id, saved[i], i === 0 ? 'Started' : null, now - (saved.length - i) * 18 * DAY);
  };
  await goal('Emergency fund', 'shield', '#4C9A7C', 30000000, [8000000, 5000000, 3000000, 2500000], 240);
  await goal('Goa trip', 'airplane', '#E1702B', 5000000, [1500000, 1000000, 700000], 55);
  await goal('New phone', 'phone', '#4A4A92', 8000000, [3000000, 3000000, 2000000], null);
  await goal('Wedding gift', 'gift', '#9A3556', 2500000, [400000], 90);

  // more groups using the split types the first seeder skipped, plus comments
  const me = (await ensureSelf(db)).id;
  const people = await listPeople(db);
  const id = (n: string) => people.find((p) => p.name === n)!.id;
  const [ravi, meera, kabir] = ['Ravi', 'Meera', 'Kabir'].map(id);
  const office = await createGroup(db, { name: 'Office lunch club', icon: '💼', kind: 'work', memberIds: [ravi, kabir, meera] });
  const four = [me, ravi, kabir, meera];
  const a = await addGroupExpense(db, { groupId: office, description: 'Biryani Friday', amount: 320000, payers: { [kabir]: 320000 }, split: { type: 'exact', amounts: { [me]: 90000, [ravi]: 80000, [kabir]: 70000, [meera]: 80000 } }, categoryId: 'cat_food', occurredAt: now - 9 * DAY });
  await addGroupExpense(db, { groupId: office, description: 'Team cake', amount: 120000, payers: { [me]: 120000 }, split: { type: 'percent', percents: { [me]: 25, [ravi]: 25, [kabir]: 25, [meera]: 25 } }, categoryId: 'cat_food', occurredAt: now - 7 * DAY });
  const b = await addGroupExpense(db, { groupId: office, description: 'Pizza with extras', amount: 280000, payers: { [ravi]: 280000 }, split: { type: 'adjustment', participants: four, adjustments: { [meera]: 20000, [me]: -10000 } }, categoryId: 'cat_food', occurredAt: now - 5 * DAY });
  await addGroupExpense(db, { groupId: office, description: 'Coffee run', amount: 96000, payers: { [meera]: 96000 }, split: { type: 'equal', participants: four }, categoryId: 'cat_food', occurredAt: now - 1 * DAY });
  await recordSettlement(db, { groupId: office, from: me, to: kabir, amount: 20000, method: 'cash' });
  await addComment(db, a, kabir, 'I paid on the corporate card, will claim it back.');
  await addComment(db, a, me, 'Thanks Kabir, settling the difference tonight.');
  await addComment(db, b, ravi, 'Meera had the extra topping.');
  const goaExpenses = (await listExpenses(db, null)).find((e) => e.description === 'Movie night');
  if (goaExpenses) await addComment(db, goaExpenses.id, meera, 'Next one is on me.');
  await addPerson(db, { name: 'Dev', upi_id: 'dev@oksbi' });

  // bank messages waiting for a category on Home
  for (const s of SAMPLES.filter((x) => 'amount' in x.expect && x.expect.direction === 'debit').slice(0, 3)) {
    await ingest(db, { origin: 'simulated', body: s.body, sender: s.sender, allowlist: [] });
  }
}
