import { createTestDb } from '@/db/testDb';
import { seedDefaults, addTransaction, setBudget , listCategories } from '@/features/tracker/repo';
import { LocalRulesProvider, detectIntent, findCategory } from '../local';
import { parsePeriod } from '../period';
import { createGroup, ensureSelf, addPerson, addGroupExpense } from '@/features/groups/repo';
import { DAY } from '@/lib/date';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

const NOW = new Date(2026, 9, 18, 15).getTime();

test('period parsing', () => {
  const p = (s: string) => parsePeriod(s, NOW);
  expect(new Date(p('last month').from).getMonth()).toBe(8);
  expect(p('this month').label).toBe('this month');
  expect(new Date(p('in September').from).getMonth()).toBe(8);
  expect(new Date(p('in march').from).getFullYear()).toBe(2026);
  expect(new Date(p('in december').from).getFullYear()).toBe(2025);
  expect(p('last 7 days').label).toBe('the last 7 days');
  expect(Math.round((p('last 7 days').to - p('last 7 days').from) / DAY)).toBe(7);
  expect(p('last seven days').label).toBe('the last 7 days');
  expect(p('yesterday').label).toBe('yesterday');
  expect(p('hello').explicit).toBe(false);
  expect(new Date(p('September 2025').from).getFullYear()).toBe(2025);
});

test('intents', () => {
  expect(detectIntent('who do I owe?')).toBe('owe');
  expect(detectIntent('predict this month')).toBe('predict');
  expect(detectIntent('how much can I save')).toBe('save');
  expect(detectIntent('biggest expense this week')).toBe('biggest');
  expect(detectIntent('how many transactions')).toBe('count');
  expect(detectIntent('average per day')).toBe('average');
  expect(detectIntent('where did my money go')).toBe('by_category');
  expect(detectIntent('top merchants')).toBe('by_merchant');
  expect(detectIntent('how much did I spend')).toBe('total');
});

async function seeded() {
  const db = await createTestDb();
  await seedDefaults(db);
  const d = (day: number, m = 9) => new Date(2026, m, day, 12).getTime();
  const add = (amount: number, cat: string, merchant: string, at: number) => addTransaction(db, { type: 'expense', amount, category_id: cat, merchant, occurred_at: at });
  await add(45000, 'cat_food', 'Swiggy', d(2));
  await add(30000, 'cat_food', 'Swiggy', d(9));
  await add(250000, 'cat_shopping', 'Amazon', d(5));
  await add(120000, 'cat_food', 'Zomato', d(4, 8));
  await addTransaction(db, { type: 'income', amount: 8000000, category_id: 'cat_salary', occurred_at: d(1) });
  return db;
}

test('answers: totals, category, merchant, biggest, count, last month', async () => {
  const db = await seeded();
  const ai = new LocalRulesProvider();
  const ask = (q: string) => ai.answer(q, { db, now: NOW });
  expect((await ask('How much did I spend this month?')).text).toContain('₹3,250');
  expect((await ask('how much on food this month')).text).toContain('₹750 on Food & Dining');
  expect((await ask('how much did I spend at swiggy this month?')).text).toContain('₹750');
  const big = await ask('biggest expense this month');
  expect(big.text).toContain('₹2,500');
  expect(big.text).toContain('Amazon');
  expect((await ask('how many transactions this month')).text).toMatch(/^3 transactions/);
  expect((await ask('what did I spend last month')).text).toContain('₹1,200');
  const cat = await ask('where did my money go this month');
  expect(cat.chart?.kind).toBe('donut');
  expect(cat.text).toContain('Shopping');
  expect((await ask('top merchants this month')).chart?.kind).toBe('bars');
  expect((await ask('spending in June')).text).toMatch(/couldn't find any spending/);
  expect((await ask('income this month')).text).toContain('₹80,000');
});

test('predict + save + budget + owe', async () => {
  const db = await seeded();
  await setBudget(db, null, 500000);
  const ai = new LocalRulesProvider();
  const ask = (q: string) => ai.answer(q, { db, now: NOW });
  const p = await ask('predict this month');
  expect(p.chart?.kind).toBe('line');
  expect(p.text).toMatch(/budget/);
  expect((await ask('how much can I save?')).text).toMatch(/earned ₹80,000/);
  expect((await ask('how are my budgets')).text).toMatch(/Overall: ₹3,250 of ₹5,000/);
  expect((await ask('who do I owe')).text).toMatch(/settled up/);
  const me = (await ensureSelf(db)).id;
  const a = await addPerson(db, { name: 'Asha' });
  await createGroup(db, { name: 'G', memberIds: [a] });
  await addGroupExpense(db, { groupId: null, description: 'dinner', amount: 100000, payers: { [a]: 100000 }, split: { type: 'equal', participants: [me, a] } });
  expect((await ask('who do I owe?')).text).toContain('You owe Asha ₹500');
});

test('category finder', async () => {
  const db = await createTestDb();
  await seedDefaults(db);
  const cats = await listCategories(db);
  expect(findCategory('how much on groceries', cats)?.id).toBe('cat_groceries');
  expect(findCategory('cab rides', cats)?.id).toBe('cat_transport');
  expect(findCategory('nothing', cats)).toBeNull();
});
