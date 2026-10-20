import type { Db } from '@/db/types';
import { addAccount, addTransaction, listAccounts, setBudget, updateAccount } from '@/features/tracker/repo';
import { addRecurring } from '@/features/tracker/recurring';
import { addGroupExpense, addPerson, createGroup, ensureSelf, listPeople, recordSettlement } from '@/features/groups/repo';
import { addGoal, contribute } from '@/features/goals/repo';
import { ingest } from '@/features/pending/service';
import { SAMPLES } from '@/features/parser/samples';
import { seedDemoData } from './seed';
import { seedGroupDemo } from './seedGroups';
import { DAY } from '@/lib/date';
import { useSettings } from '@/store/settings';

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
  await goal('Goa trip', 'airplane', '#FF8106', 5000000, [1500000, 1000000, 700000], 55);
  await goal('New phone', 'phone', '#4A4A92', 8000000, [3000000, 3000000, 2000000], null);
  await goal('Wedding gift', 'gift', '#9A3556', 2500000, [400000], 90);

  // more groups using the split types the first seeder skipped, plus comments
  const me = (await ensureSelf(db)).id;
  const people = await listPeople(db);
  const id = (n: string) => people.find((p) => p.name === n)!.id;
  const [ravi, meera, kabir] = ['Ravi', 'Meera', 'Kabir'].map(id);
  const office = await createGroup(db, { name: 'Office lunch club', icon: '💼', kind: 'work', memberIds: [ravi, kabir, meera] });
  const four = [me, ravi, kabir, meera];
  await addGroupExpense(db, { groupId: office, description: 'Biryani Friday', amount: 320000, payers: { [kabir]: 320000 }, split: { type: 'exact', amounts: { [me]: 90000, [ravi]: 80000, [kabir]: 70000, [meera]: 80000 } }, categoryId: 'cat_food', occurredAt: now - 9 * DAY });
  await addGroupExpense(db, { groupId: office, description: 'Team cake', amount: 120000, payers: { [me]: 120000 }, split: { type: 'percent', percents: { [me]: 25, [ravi]: 25, [kabir]: 25, [meera]: 25 } }, categoryId: 'cat_food', occurredAt: now - 7 * DAY });
  await addGroupExpense(db, { groupId: office, description: 'Pizza with extras', amount: 280000, payers: { [ravi]: 280000 }, split: { type: 'adjustment', participants: four, adjustments: { [meera]: 20000, [me]: -10000 } }, categoryId: 'cat_food', occurredAt: now - 5 * DAY });
  await addGroupExpense(db, { groupId: office, description: 'Coffee run', amount: 96000, payers: { [meera]: 96000 }, split: { type: 'equal', participants: four }, categoryId: 'cat_food', occurredAt: now - 1 * DAY });
  await recordSettlement(db, { groupId: office, from: me, to: kabir, amount: 20000, method: 'cash' });
  await addPerson(db, { name: 'Dev', upi_id: 'dev@oksbi' });

  // bank messages waiting for a category on Home
  for (const s of SAMPLES.filter((x) => 'amount' in x.expect && x.expect.direction === 'debit').slice(0, 3)) {
    await ingest(db, { origin: 'simulated', body: s.body, sender: s.sender, allowlist: [] });
  }

  await seedProDemo(db, now, bank);
}

/**
 * Sample data for every Pro feature so each screen has something to show: spaces with their own entries, due dates,
 * warranties, work spends to claim, tax-tagged payments, private entries and saved settle-up lines.
 */
async function seedProDemo(db: Db, now: number, bank: string | null) {
  const set = useSettings.getState().set;
  const tx = (o: Parameters<typeof addTransaction>[1]) => addTransaction(db, { source: 'manual', account_id: bank, ...o });

  // Spaces: a side hustle with income and costs, and a trip with a budget
  const side = 'space_side_demo', trip = 'space_trip_demo';
  await set(db, 'spaces', [
    { id: side, name: 'Design work', kind: 'side', emoji: '💼', taxPct: 20 },
    { id: trip, name: 'Goa 2026', kind: 'trip', emoji: '✈️', budget: 4000000 },
  ]);
  for (const [amt, d, who] of [[4200000, 3, 'Client: Lumen Studio'], [1800000, 12, 'Client: Nova Cafe'], [2500000, 26, 'Client: Lumen Studio']] as [number, number, string][]) {
    await tx({ type: 'income', amount: amt, category_id: 'cat_freelance', merchant: who, occurred_at: now - d * DAY, space_id: side });
  }
  for (const [amt, d, m] of [[159900, 4, 'Figma'], [99900, 9, 'Canva'], [450000, 15, 'Coworking day pass'], [120000, 20, 'Stock photos']] as [number, number, string][]) {
    await tx({ type: 'expense', amount: amt, category_id: 'cat_other', merchant: m, occurred_at: now - d * DAY, space_id: side });
  }
  for (const [amt, d, m, c] of [[1250000, 6, 'Villa booking', 'cat_travel'], [480000, 5, 'IndiGo', 'cat_travel'], [210000, 4, 'Beach shack dinner', 'cat_food'], [90000, 3, 'Scooter rental', 'cat_transport'], [150000, 2, 'Cafe', 'cat_food']] as [number, number, string, string][]) {
    await tx({ type: 'expense', amount: amt, category_id: c, merchant: m, occurred_at: now - d * DAY, space_id: trip });
  }

  // Work spends to claim (two already claimed), with the tag the Reimbursements screen reads
  for (const [amt, d, m, c, tags] of [
    [42000, 2, 'Uber', 'cat_transport', ['work']], [68000, 5, 'Client lunch', 'cat_food', ['work']], [35000, 8, 'Ola', 'cat_transport', ['work']],
    [129900, 12, 'Printer ink', 'cat_shopping', ['work', 'claimed']], [56000, 14, 'Team coffee', 'cat_food', ['work', 'claimed']],
  ] as [number, number, string, string, string[]][]) {
    await tx({ type: 'expense', amount: amt, category_id: c, merchant: m, note: 'Office', tags, occurred_at: now - d * DAY, space_id: '' });
  }

  // Tax-time payments in this financial year
  for (const [amt, d, m, tags] of [
    [5000000, 40, 'ELSS SIP', ['elss']], [2500000, 70, 'Health insurance', ['health-insurance']], [3600000, 120, 'LIC premium', ['lic']],
    [500000, 30, 'Donation', ['donation']], [1000000, 60, 'NPS', ['nps']],
  ] as [number, number, string, string[]][]) {
    await tx({ type: 'expense', amount: amt, category_id: 'cat_other', merchant: m, tags, occurred_at: now - d * DAY, space_id: '' });
  }

  // Private entries
  await tx({ type: 'expense', amount: 450000, category_id: 'cat_shopping', merchant: 'Surprise gift', tags: ['private'], occurred_at: now - 1 * DAY, space_id: '' });
  await tx({ type: 'expense', amount: 220000, category_id: 'cat_other', merchant: 'Therapy session', tags: ['private'], occurred_at: now - 6 * DAY, space_id: '' });

  // Due dates: one overdue, one soon, one paid this month, one later
  const d = new Date(now);
  const mk = (t: number) => { const x = new Date(t); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; };
  const dayIn = (offset: number) => Math.min(28, Math.max(1, new Date(now + offset * DAY).getDate()));
  await set(db, 'dueItems', [
    { id: 'due_card', name: 'HDFC Regalia card', kind: 'card', amount: 1845000, day: dayIn(2), remindBefore: 1, paid: [] },
    { id: 'due_rent', name: 'Rent', kind: 'rent', amount: 2200000, day: 5, remindBefore: 3, paid: d.getDate() > 5 ? [mk(now)] : [] },
    { id: 'due_emi', name: 'Phone EMI', kind: 'emi', amount: 349900, day: dayIn(-2), remindBefore: 1, paid: [] },
    { id: 'due_power', name: 'Electricity', kind: 'bill', amount: null, day: 22, remindBefore: 0, paid: [] },
  ]);

  // Warranties: one ending soon, one covered, one expired
  await set(db, 'warranties', [
    { id: 'w_phone', item: 'Phone', store: 'Croma', boughtAt: now - 345 * DAY, months: 12, amount: 7999900, receipt: null },
    { id: 'w_laptop', item: 'Laptop', store: 'Online store', boughtAt: now - 200 * DAY, months: 24, amount: 8499900, receipt: null },
    { id: 'w_mixer', item: 'Mixer grinder', store: 'Local shop', boughtAt: now - 500 * DAY, months: 12, amount: 450000, receipt: null },
  ]);

  // Bump Pro: two saved lines and a card theme
  await set(db, 'savedLines', ['{name}, {amount} for {for}. Pay up before I write a song about it 🎤', '{name}! {amount}. {days} days. Bruh me 🙏']);
  await set(db, 'bumpTheme', 'sunset');
  await set(db, 'bumpSticker', '🍕');
}
