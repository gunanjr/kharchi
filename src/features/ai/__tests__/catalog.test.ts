import { createTestDb } from '@/db/testDb';
import { seedDefaults, listCategories } from '@/features/tracker/repo';
import { seedEverything } from '@/features/dev/seedAll';
import { LocalRulesProvider } from '../local';
import { buildCatalog } from '../catalog';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));

const NOW = new Date(2026, 9, 19, 15).getTime();

test('every offered question gets a real answer on a populated app', async () => {
  const db = await createTestDb();
  await seedDefaults(db);
  await seedEverything(db, NOW);
  const cats = await listCategories(db);
  const groups = buildCatalog(cats, ['cat_food', 'cat_groceries', 'cat_transport', 'cat_rent'], NOW);
  const ai = new LocalRulesProvider();
  let n = 0;
  for (const g of groups) for (const it of g.items) {
    const a = await ai.answer(it.question, { db, now: NOW });
    expect(a.text.length).toBeGreaterThan(10);
    expect(a.text).not.toMatch(/couldn't find|I don.t understand/i);
    n++;
  }
  expect(n).toBeGreaterThanOrEqual(15);
});

test('on an empty app every question still answers politely and nothing throws', async () => {
  const db = await createTestDb();
  await seedDefaults(db);
  const groups = buildCatalog(await listCategories(db), [], NOW);
  const ai = new LocalRulesProvider();
  for (const g of groups) for (const it of g.items) {
    const a = await ai.answer(it.question, { db, now: NOW });
    expect(typeof a.text).toBe('string');
    expect(a.text.length).toBeGreaterThan(5);
  }
});

test('catalog uses the user’s own top categories and no duplicate ids', () => {
  const cats = [{ id: 'cat_food', name: 'Food & Dining', kind: 'expense' }, { id: 'cat_x', name: 'Pets', kind: 'expense' }] as any;
  const groups = buildCatalog(cats, ['cat_x', 'cat_food', 'missing'], NOW);
  const all = groups.flatMap((g) => g.items);
  expect(all.some((i) => i.label === 'How much on Pets this month?')).toBe(true);
  expect(new Set(all.map((i) => i.id)).size).toBe(all.length);
});
