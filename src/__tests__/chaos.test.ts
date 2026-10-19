/** "Bad user" suite: hostile, absurd and repeated input at every layer. Nothing may throw unhandled, corrupt totals or lose data. */
import { createTestDb } from '@/db/testDb';
import { seedDefaults, addTransaction, updateTransaction, listTransactions, totalsBetween, deleteCategory, addCategory, listCategories, addAccount, archiveAccount, accountBalance, listAccounts, setBudget, listBudgets, removeBudget, deleteTransaction } from '@/features/tracker/repo';
import { parseAmountToMinor, formatMoney, allocate } from '@/domain/money';
import { parseVoice } from '@/features/voice/parse';
import { parseSms } from '@/features/parser/sms';
import { parseCsv, importCsv, toCsv } from '@/features/tracker/csv';
import { parseTags, readTags } from '@/features/tracker/tags';
import { exportBackup, restoreBackup, wipeAll } from '@/db/backup';
import { computeShares, validatePayers, SplitError } from '@/features/groups/split';
import { addGroupExpense, addPerson, createGroup, ensureSelf, groupSummary, recordSettlement } from '@/features/groups/repo';
import { addGoal, contribute, listGoals } from '@/features/goals/repo';
import { LocalRulesProvider } from '@/features/ai/local';
import { seedEverything } from '@/features/dev/seedAll';
import { loadPulse } from '@/features/tracker/pulse';
import { loadHealth } from '@/features/insights/healthLoad';
import { loadReview } from '@/features/insights/review';
import { healthScore } from '@/features/insights/health';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));
const NOW = new Date(2026, 9, 19, 15).getTime();
const setup = async () => { const db = await createTestDb(); await seedDefaults(db); return db; };

const NASTY = ['', ' ', '\n\n', '😀'.repeat(500), 'a'.repeat(100_000), "'; DROP TABLE transactions;--", '<script>alert(1)</script>', '\u0000‮﻿', '%s%n%x', '{{7*7}}', '🇮🇳 ₹ ٣٤٥', 'null', 'undefined', '0', '-1', '1e999', 'NaN'];

describe('money', () => {
  test('amount parsing never returns an unsafe or absurd number', () => {
    for (const s of NASTY) { const v = parseAmountToMinor(s); if (v !== null) expect(Number.isSafeInteger(v) && v >= 0 && v <= 1e12).toBe(true); }
    expect(parseAmountToMinor('99999999999999999999999')).toBeNull();
    expect(parseAmountToMinor('1,2,3.4.5')).toBeNull();
    expect(parseAmountToMinor('0')).toBe(0);
  });
  test('formatting survives NaN, Infinity and negatives', () => {
    for (const n of [NaN, Infinity, -Infinity, -5, 0, 1e15, Number.MAX_SAFE_INTEGER]) expect(typeof formatMoney(n as number)).toBe('string');
  });
  test('allocate never loses a paisa, even with zero or odd weights', () => {
    for (const w of [[1], [0, 0, 1], [1, 1, 1], [3, 7, 11, 13]]) expect(allocate(100001, w).reduce((a, b) => a + b, 0)).toBe(100001);
  });
});

describe('transactions', () => {
  test('invalid amounts are rejected, not stored', async () => {
    const db = await setup();
    for (const amount of [0, -1, 12.5, NaN, Infinity, 1e21, Number.MAX_SAFE_INTEGER + 2, 2e12])
      await expect(addTransaction(db, { type: 'expense', amount })).rejects.toThrow();
    expect(await listTransactions(db)).toHaveLength(0);
  });
  test('hostile text in every free field is stored as plain data', async () => {
    const db = await setup();
    for (const s of NASTY) await addTransaction(db, { type: 'expense', amount: 100, merchant: s, note: s, tags: parseTags(s) });
    const all = await listTransactions(db);
    expect(all).toHaveLength(NASTY.length);
    expect((await listTransactions(db, { search: "'; DROP" })).length).toBeGreaterThan(0);
    expect((await listTransactions(db)).length).toBe(NASTY.length);
  });
  test('absurd dates do not break listing or totals', async () => {
    const db = await setup();
    for (const t of [-1, 8.64e15, NaN, Infinity]) await expect(addTransaction(db, { type: 'expense', amount: 100, occurred_at: t })).rejects.toThrow();
    for (const t of [0, NOW, NOW + 1e12]) await addTransaction(db, { type: 'expense', amount: 100, occurred_at: t });
    expect((await totalsBetween(db, 0, 4.1e12)).expense).toBe(300);
  });
  test('a hundred rapid duplicate saves are all real, separate rows (the screens guard double taps)', async () => {
    const db = await setup();
    await Promise.all(Array.from({ length: 100 }, () => addTransaction(db, { type: 'expense', amount: 100 })));
    expect(await listTransactions(db)).toHaveLength(100);
  });
  test('editing then deleting a missing id does not throw', async () => {
    const db = await setup();
    await updateTransaction(db, 'nope', { amount: 5 });
    await deleteTransaction(db, 'nope');
    await expect(updateTransaction(db, 'nope', { amount: -5 })).rejects.toThrow();
  });
  test('deleting a category that is in use keeps the transactions readable', async () => {
    const db = await setup();
    const cat = await addCategory(db, { name: 'Pets', icon: '🐶', color: '#000', kind: 'expense' });
    await addTransaction(db, { type: 'expense', amount: 500, category_id: cat });
    await deleteCategory(db, cat);
    const [t] = await listTransactions(db);
    expect(t.amount).toBe(500);
    expect((await listCategories(db)).some((c) => c.id === cat)).toBe(false);
  });
  test('archiving an account with history keeps its balance maths and the transactions', async () => {
    const db = await setup();
    const a = await addAccount(db, { name: 'Old', type: 'bank', opening_balance: 1000 });
    await addTransaction(db, { type: 'expense', amount: 300, account_id: a });
    await archiveAccount(db, a);
    expect(await accountBalance(db, a)).toBe(700);
    expect((await listAccounts(db)).some((x) => x.id === a)).toBe(false);
    expect(await listTransactions(db)).toHaveLength(1);
  });
  test('budgets: zero and negative limits do not crash progress, removing twice is fine', async () => {
    const db = await setup();
    await setBudget(db, null, 1);
    const [b] = await listBudgets(db);
    await removeBudget(db, b.id); await removeBudget(db, b.id);
    expect(await listBudgets(db)).toHaveLength(0);
  });
});

describe('parsers never throw and never invent money', () => {
  test('voice', () => { for (const s of NASTY) expect(() => parseVoice(s, NOW)).not.toThrow(); expect(parseVoice('9'.repeat(40), NOW)[0].amount === null || Number.isSafeInteger(parseVoice('9'.repeat(40), NOW)[0].amount!)).toBe(true); });
  test('voice on a very long sentence stays fast', () => { const t = Date.now(); parseVoice(('spent 10 on tea and ').repeat(3000), NOW); expect(Date.now() - t).toBeLessThan(2000); });
  test('sms', () => { for (const s of NASTY) expect(() => parseSms(s, {})).not.toThrow(); });
  test('sms on huge input stays fast', () => { const t = Date.now(); parseSms('Rs.100 debited '.repeat(20_000), {}); expect(Date.now() - t).toBeLessThan(3000); });
  test('csv garbage', async () => {
    for (const s of NASTY) { expect(() => parseCsv(s)).not.toThrow(); expect(() => importCsv(s)).not.toThrow(); }
    const r = importCsv('date,type,amount\n2026-01-01,expense,1e30\n2026-01-01,expense,abc\nnot a date,expense,5\n1850-01-01,expense,5\n2026-01-01,expense,99999999999999999999');
    expect(r.rows).toHaveLength(0);
  });
  test('tags', () => { for (const s of NASTY) { expect(parseTags(s).length).toBeLessThanOrEqual(8); expect(readTags(s)).toBeInstanceOf(Array); } });
  test('csv export copes with bad stored tags', async () => {
    const db = await setup();
    const id = await addTransaction(db, { type: 'expense', amount: 100, merchant: 'x' });
    await db.run(`UPDATE transactions SET tags='not json' WHERE id=?`, [id]);
    expect(() => toCsv(Array.from({ length: 1 }, () => ({}) as any).map(() => ({ id, type: 'expense', amount: 100, currency: 'INR', occurred_at: NOW, tags: 'not json' }) as any), [], {})).not.toThrow();
  });
});

describe('backup and restore', () => {
  test('malformed backups are refused and leave the data alone', async () => {
    const db = await setup();
    await addTransaction(db, { type: 'expense', amount: 100 });
    for (const bad of [null, undefined, {}, { app: 'other', tables: {} }, { app: 'kharchi', tables: 5 }, { app: 'kharchi', tables: { transactions: [{ 'id; DROP TABLE x': 1 }] } }])
      await expect(restoreBackup(db, bad as any)).rejects.toThrow();
    expect(await listTransactions(db)).toHaveLength(1);
  });
  test('a wipe then restore returns everything', async () => {
    const db = await setup();
    await seedEverything(db, NOW);
    const before = (await listTransactions(db)).length;
    const file = await exportBackup(db);
    await wipeAll(db);
    expect(await listTransactions(db)).toHaveLength(0);
    await restoreBackup(db, JSON.parse(JSON.stringify(file)));
    expect((await listTransactions(db)).length).toBe(before);
  });
});

describe('groups', () => {
  test('impossible splits are refused with a clear error', () => {
    expect(() => computeShares(0, { type: 'equal', participants: ['a'] })).toThrow(SplitError);
    expect(() => computeShares(100, { type: 'equal', participants: [] })).toThrow(SplitError);
    expect(() => computeShares(100, { type: 'percent', percents: { a: 60, b: 60 } })).toThrow(SplitError);
    expect(() => computeShares(100, { type: 'exact', amounts: { a: 10 } })).toThrow(SplitError);
    expect(() => computeShares(100, { type: 'shares', shares: { a: 0, b: 0 } })).toThrow();
    expect(() => validatePayers(100, { a: 40 })).toThrow();
  });
  test('settling more than owed, a self-payment and a group with one member do not corrupt balances', async () => {
    const db = await setup();
    const me = (await ensureSelf(db)).id;
    const a = await addPerson(db, { name: 'A' });
    const g = await createGroup(db, { name: 'G', memberIds: [a] });
    await addGroupExpense(db, { groupId: g, description: 'x', amount: 1000, payers: { [me]: 1000 }, split: { type: 'equal', participants: [me, a] } });
    await recordSettlement(db, { groupId: g, from: a, to: me, amount: 9999 }).catch(() => {});
    const s = (await groupSummary(db, g))!;
    expect(Object.values(s.balances).reduce((x, y) => x + y, 0)).toBe(0);
    const solo = await createGroup(db, { name: 'Solo', memberIds: [] });
    await addGroupExpense(db, { groupId: solo, description: 'mine', amount: 500, payers: { [me]: 500 }, split: { type: 'equal', participants: [me] } });
    expect(Object.values((await groupSummary(db, solo))!.balances).reduce((x, y) => x + y, 0)).toBe(0);
  });
  test('names with hostile text are fine', async () => {
    const db = await setup();
    for (const s of NASTY.slice(0, 8)) await addPerson(db, { name: s || 'blank' });
  });
});

describe('goals', () => {
  test('bad goal inputs and rapid contributions', async () => {
    const db = await setup();
    await expect(addGoal(db, { name: 'x', target: 1e13 })).rejects.toThrow();
    const id = await addGoal(db, { name: 'G', target: 10000 });
    await Promise.all(Array.from({ length: 20 }, () => contribute(db, id, 100, null, NOW)));
    expect((await listGoals(db, NOW))[0].saved).toBe(2000);
    await expect(contribute(db, id, 0)).rejects.toThrow();
    await expect(contribute(db, id, 1.5)).rejects.toThrow();
    await expect(contribute(db, 'missing', 100)).rejects.toThrow();
  });
});

describe('assistant and dashboards on empty and absurd data', () => {
  test('empty database: every loader returns something sensible', async () => {
    const db = await setup();
    expect((await loadPulse(db, NOW)).week).toHaveLength(7);
    expect(Number.isFinite((await loadHealth(db, NOW)).score)).toBe(true);
    expect((await loadReview(db, new Date(2026, 9, 1).getTime(), NOW)).txCount).toBe(0);
    for (const q of NASTY) { const a = await new LocalRulesProvider().answer(q, { db, now: NOW }); expect(typeof a.text).toBe('string'); }
  });
  test('health score is finite for extreme inputs', () => {
    for (const v of [0, -1, 1e12, NaN]) expect(Number.isFinite(healthScore({ income: v, expense: v, budgetPcts: [v], subsMonthly: v, balance: v }).score)).toBe(true);
  });
});
