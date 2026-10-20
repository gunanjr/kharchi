import { createTestDb } from '@/db/testDb';
import { loadInsights } from '@/features/insights/load';
import { loadPulse } from '@/features/tracker/pulse';
import { listTransactions, spendByCategory } from '@/features/tracker/repo';
import { buildFrame, frameStart } from '@/features/tracker/frames';
import { startOfMonth, endOfMonth } from '@/lib/date';

/** Guards the heavy screens against a large, long-lived database (about 40,000 entries over three years). */
jest.setTimeout(120000);

async function time<T>(label: string, fn: () => Promise<T>) {
  const t = Date.now();
  const r = await fn();
  const ms = Date.now() - t;
  console.log(`perf ${label}: ${ms} ms`);
  return { r, ms };
}

test('the busy screens stay fast with 40,000 entries', async () => {
  const db = await createTestDb();
  const now = Date.now();
  const cats = (await db.all<{ id: string }>('SELECT id FROM categories LIMIT 8')).map((c) => c.id);
  await db.transaction(async () => {
    for (let i = 0; i < 40000; i++) {
      const t = now - Math.floor((i / 40000) * 3 * 365 * 86400000);
      await db.run(
        `INSERT INTO transactions (id, type, amount, currency, category_id, merchant, occurred_at, source, excluded, created_at, updated_at, dirty) VALUES (?, 'expense', ?, 'INR', ?, ?, ?, 'manual', 0, ?, ?, 1)`,
        [`t${i}`, 5000 + (i % 700) * 100, cats[i % cats.length] ?? null, `Shop ${i % 60}`, t, t, t],
      );
    }
  });
  const a = await time('loadInsights', () => loadInsights(db, now));
  const b = await time('loadPulse', () => loadPulse(db, now));
  const c = await time('listTransactions(400)', () => listTransactions(db, { limit: 400 }));
  const d = await time('spendByCategory(month)', () => spendByCategory(db, startOfMonth(now), endOfMonth(now)));
  const h = await time('home hero (1Y)', async () => buildFrame(await listTransactions(db, { from: frameStart('1Y', now), to: now + 1 }), now, '1Y'));
  expect(h.ms).toBeLessThan(1500);
  expect(a.r.all.length).toBeGreaterThan(10000);
  expect(c.r.length).toBe(400);
  expect(d.r.length).toBeGreaterThan(0);
  expect(a.ms).toBeLessThan(1500);
  expect(b.ms).toBeLessThan(2500);
  expect(c.ms).toBeLessThan(500);
});
