import type { Db } from '@/db/types';
import type { Person, SplitType, Frequency } from '@/domain/types';
import { insertRow, softDelete, updateRow } from '@/db/rows';
import { formatMoney, isValidMinor } from '@/domain/money';
import { computeShares, validatePayers, type SplitInput } from './split';
import { computeBalances, pairwiseDebts, simplifyDebts, type Balances, type ExpenseLike, type SettlementLike, type Transfer } from './balances';
import { addTransaction } from '@/features/tracker/repo';
import { nextDue } from '@/features/tracker/recurring';

const ALIVE = 'deleted_at IS NULL';

export interface Group {
  id: string;
  name: string;
  currency: string;
  icon: string | null;
  kind: string | null;
  simplify: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

/* ---------- people ---------- */
export async function ensureSelf(db: Db): Promise<Person> {
  const me = await db.get<Person>(`SELECT * FROM people WHERE is_self=1 AND ${ALIVE}`);
  if (me) return me;
  const id = await insertRow(db, 'people', { name: 'You', is_self: 1 });
  return (await db.get<Person>(`SELECT * FROM people WHERE id=?`, [id]))!;
}
export const listPeople = (db: Db) => db.all<Person>(`SELECT * FROM people WHERE ${ALIVE} ORDER BY is_self DESC, name`);
export const addPerson = (db: Db, p: { name: string; phone?: string | null; upi_id?: string | null }) =>
  insertRow(db, 'people', { name: p.name.trim(), phone: p.phone ?? null, upi_id: p.upi_id ?? null, is_self: 0 });
export const updatePerson = (db: Db, id: string, patch: Partial<Pick<Person, 'name' | 'phone' | 'upi_id'>>) => updateRow(db, 'people', id, patch);

/* ---------- groups ---------- */
export async function createGroup(db: Db, g: { name: string; currency?: string; icon?: string; kind?: string; memberIds: string[] }): Promise<string> {
  const me = await ensureSelf(db);
  return db.transaction(async () => {
    const id = await insertRow(db, 'groups_', { name: g.name.trim(), currency: g.currency ?? 'INR', icon: g.icon ?? '👥', kind: g.kind ?? null, simplify: 1 });
    for (const pid of new Set([me.id, ...g.memberIds])) await insertRow(db, 'group_members', { group_id: id, person_id: pid });
    await logActivity(db, id, me.id, 'group_created', id, `Created group “${g.name.trim()}”`);
    return id;
  });
}
export const listGroups = (db: Db) => db.all<Group>(`SELECT * FROM groups_ WHERE ${ALIVE} ORDER BY updated_at DESC`);
export const getGroup = (db: Db, id: string) => db.get<Group>(`SELECT * FROM groups_ WHERE id=?`, [id]);
export const setGroupSimplify = (db: Db, id: string, on: boolean) => updateRow(db, 'groups_', id, { simplify: on ? 1 : 0 });
export const deleteGroup = (db: Db, id: string) => softDelete(db, 'groups_', id);

export const groupMembers = (db: Db, groupId: string) =>
  db.all<Person>(`SELECT p.* FROM people p JOIN group_members m ON m.person_id=p.id WHERE m.group_id=? AND m.${ALIVE} AND p.${ALIVE} ORDER BY p.is_self DESC, p.name`, [groupId]);

export async function addMemberToGroup(db: Db, groupId: string, personId: string) {
  const ex = await db.get(`SELECT 1 x FROM group_members WHERE group_id=? AND person_id=? AND ${ALIVE}`, [groupId, personId]);
  if (ex) return;
  await insertRow(db, 'group_members', { group_id: groupId, person_id: personId });
  const p = await db.get<Person>(`SELECT * FROM people WHERE id=?`, [personId]);
  await logActivity(db, groupId, (await ensureSelf(db)).id, 'member_added', personId, `Added ${p?.name ?? 'someone'}`);
}

/* ---------- activity / audit ---------- */
export async function logActivity(db: Db, groupId: string | null, actorId: string | null, kind: string, entityId: string | null, summary: string, payload?: unknown) {
  await insertRow(db, 'activity', { group_id: groupId, actor_id: actorId, kind, entity_id: entityId, summary, payload: payload ? JSON.stringify(payload) : null });
}
export const listActivity = (db: Db, groupId?: string, limit = 100) =>
  db.all<{ id: string; group_id: string | null; actor_id: string | null; kind: string; summary: string; created_at: number; payload: string | null }>(
    `SELECT * FROM activity WHERE ${ALIVE} ${groupId ? 'AND group_id=?' : ''} ORDER BY created_at DESC LIMIT ${limit}`,
    groupId ? [groupId] : [],
  );

/* ---------- expenses ---------- */
export interface NewGroupExpense {
  groupId: string | null;
  description: string;
  amount: number;
  currency?: string;
  rate?: number;
  categoryId?: string | null;
  occurredAt?: number;
  payers: Record<string, number>;
  split: SplitInput;
  note?: string | null;
  receiptUri?: string | null;
  createdBy?: string | null;
  recurringId?: string | null;
}

export interface StoredExpense {
  id: string;
  group_id: string | null;
  description: string;
  amount: number;
  currency: string;
  rate: number;
  category_id: string | null;
  occurred_at: number;
  split_type: SplitType;
  note: string | null;
  receipt_uri: string | null;
  created_by: string | null;
  deleted_at: number | null;
  payers: Record<string, number>;
  shares: Record<string, number>;
  /** The numbers the user typed for percent / shares splits (null for other split types). */
  inputs: Record<string, number | null>;
}

async function writePayersShares(db: Db, expenseId: string, payers: Record<string, number>, shares: Record<string, number>, split: SplitInput) {
  for (const [pid, amt] of Object.entries(payers)) if (amt > 0) await insertRow(db, 'expense_payers', { expense_id: expenseId, person_id: pid, amount: amt });
  for (const [pid, amt] of Object.entries(shares)) {
    const raw = split.type === 'percent' ? split.percents[pid] : split.type === 'shares' ? split.shares[pid] : null;
    await insertRow(db, 'expense_shares', { expense_id: expenseId, person_id: pid, amount: amt, input_value: raw ?? null });
  }
}

export async function addGroupExpense(db: Db, e: NewGroupExpense): Promise<string> {
  const shares = computeShares(e.amount, e.split);
  validatePayers(e.amount, e.payers);
  const me = await ensureSelf(db);
  return db.transaction(async () => {
    const id = await insertRow(db, 'group_expenses', {
      group_id: e.groupId, description: e.description.trim(), amount: e.amount, currency: e.currency ?? 'INR', rate: e.rate ?? 1,
      category_id: e.categoryId ?? null, occurred_at: e.occurredAt ?? Date.now(), split_type: e.split.type, note: e.note ?? null,
      receipt_uri: e.receiptUri ?? null, created_by: e.createdBy ?? me.id, recurring_id: e.recurringId ?? null,
    });
    await writePayersShares(db, id, e.payers, shares, e.split);
    await syncPersonalShare(db, id);
    await logActivity(db, e.groupId, e.createdBy ?? me.id, 'expense_added', id, `Added “${e.description.trim()}” ${formatMoney(e.amount, e.currency ?? 'INR', { trimZeros: true })}`);
    if (e.groupId) await updateRow(db, 'groups_', e.groupId, {});
    return id;
  });
}

export async function updateGroupExpense(db: Db, id: string, e: NewGroupExpense) {
  const shares = computeShares(e.amount, e.split);
  validatePayers(e.amount, e.payers);
  const before = await getExpense(db, id);
  const me = await ensureSelf(db);
  await db.transaction(async () => {
    await updateRow(db, 'group_expenses', id, {
      description: e.description.trim(), amount: e.amount, currency: e.currency ?? 'INR', rate: e.rate ?? 1,
      category_id: e.categoryId ?? null, occurred_at: e.occurredAt ?? Date.now(), split_type: e.split.type, note: e.note ?? null, receipt_uri: e.receiptUri ?? null,
    });
    await db.run(`DELETE FROM expense_payers WHERE expense_id=?`, [id]);
    await db.run(`DELETE FROM expense_shares WHERE expense_id=?`, [id]);
    await writePayersShares(db, id, e.payers, shares, e.split);
    await syncPersonalShare(db, id);
    const what = before && before.amount !== e.amount
      ? `Changed “${e.description.trim()}” from ${formatMoney(before.amount, before.currency, { trimZeros: true })} to ${formatMoney(e.amount, e.currency ?? 'INR', { trimZeros: true })}`
      : `Edited “${e.description.trim()}”`;
    await logActivity(db, e.groupId, me.id, 'expense_edited', id, what, before ? { before: { amount: before.amount, description: before.description, shares: before.shares, payers: before.payers } } : undefined);
  });
}

export async function deleteGroupExpense(db: Db, id: string) {
  const e = await getExpense(db, id);
  if (!e) return;
  const me = await ensureSelf(db);
  await db.transaction(async () => {
    await softDelete(db, 'group_expenses', id);
    await db.run(`UPDATE transactions SET deleted_at=?, updated_at=?, dirty=1 WHERE group_expense_id=? AND deleted_at IS NULL`, [Date.now(), Date.now(), id]);
    await logActivity(db, e.group_id, me.id, 'expense_deleted', id, `Deleted “${e.description}” ${formatMoney(e.amount, e.currency, { trimZeros: true })}`);
  });
}

export async function undeleteGroupExpense(db: Db, id: string) {
  await db.run(`UPDATE group_expenses SET deleted_at=NULL, updated_at=?, dirty=1 WHERE id=?`, [Date.now(), id]);
  await db.run(`UPDATE transactions SET deleted_at=NULL, updated_at=?, dirty=1 WHERE group_expense_id=?`, [Date.now(), id]);
}

async function hydrate(db: Db, rows: any[]): Promise<StoredExpense[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const ph = ids.map(() => '?').join(',');
  const payers = await db.all<any>(`SELECT * FROM expense_payers WHERE expense_id IN (${ph}) AND ${ALIVE}`, ids);
  const shares = await db.all<any>(`SELECT * FROM expense_shares WHERE expense_id IN (${ph}) AND ${ALIVE}`, ids);
  return rows.map((r) => ({
    ...r,
    payers: Object.fromEntries(payers.filter((p) => p.expense_id === r.id).map((p) => [p.person_id, p.amount])),
    shares: Object.fromEntries(shares.filter((s) => s.expense_id === r.id).map((s) => [s.person_id, s.amount])),
    inputs: Object.fromEntries(shares.filter((s) => s.expense_id === r.id).map((s) => [s.person_id, s.input_value ?? null])),
  }));
}

export async function getExpense(db: Db, id: string): Promise<StoredExpense | undefined> {
  const r = await db.get<any>(`SELECT * FROM group_expenses WHERE id=?`, [id]);
  return r ? (await hydrate(db, [r]))[0] : undefined;
}

export async function listExpenses(db: Db, groupId: string | null): Promise<StoredExpense[]> {
  const rows = await db.all<any>(
    groupId === null
      ? `SELECT * FROM group_expenses WHERE group_id IS NULL AND ${ALIVE} ORDER BY occurred_at DESC`
      : `SELECT * FROM group_expenses WHERE group_id=? AND ${ALIVE} ORDER BY occurred_at DESC`,
    groupId === null ? [] : [groupId],
  );
  return hydrate(db, rows);
}

/* ---------- settle up ---------- */
export interface SettlementRow { id: string; group_id: string | null; from_person: string; to_person: string; amount: number; currency: string; method: string | null; note: string | null; occurred_at: number }
export const listSettlements = (db: Db, groupId: string | null) =>
  db.all<SettlementRow>(
    groupId === null ? `SELECT * FROM settlements WHERE group_id IS NULL AND ${ALIVE} ORDER BY occurred_at DESC` : `SELECT * FROM settlements WHERE group_id=? AND ${ALIVE} ORDER BY occurred_at DESC`,
    groupId === null ? [] : [groupId],
  );

export async function recordSettlement(db: Db, s: { groupId: string | null; from: string; to: string; amount: number; currency?: string; method?: 'cash' | 'upi' | 'other'; note?: string }) {
  if (!isValidMinor(s.amount)) throw new Error('Enter a valid amount');
  if (s.from === s.to) throw new Error('Choose two different people');
  const id = await insertRow(db, 'settlements', { group_id: s.groupId, from_person: s.from, to_person: s.to, amount: s.amount, currency: s.currency ?? 'INR', method: s.method ?? 'cash', note: s.note ?? null, occurred_at: Date.now() });
  const [a, b] = await Promise.all([db.get<Person>(`SELECT name FROM people WHERE id=?`, [s.from]), db.get<Person>(`SELECT name FROM people WHERE id=?`, [s.to])]);
  await logActivity(db, s.groupId, s.from, 'settled', id, `${a?.name} paid ${b?.name} ${formatMoney(s.amount, s.currency ?? 'INR', { trimZeros: true })}`);
  return id;
}
export const deleteSettlement = (db: Db, id: string) => softDelete(db, 'settlements', id);

/* ---------- balances ---------- */
const asLike = (e: StoredExpense): ExpenseLike => ({ amount: e.amount, currency: e.currency, rate: e.rate, payers: e.payers, shares: e.shares });
const asSettle = (s: SettlementRow): SettlementLike => ({ from: s.from_person, to: s.to_person, amount: s.amount });

export interface GroupSummary {
  group: Group;
  members: Person[];
  balances: Balances;
  transfers: Transfer[]; // simplified or pairwise depending on group.simplify
  myBalance: number;
  totalSpent: number;
}

export async function groupSummary(db: Db, groupId: string): Promise<GroupSummary | undefined> {
  const group = await getGroup(db, groupId);
  if (!group) return undefined;
  const [members, exps, sets, me] = await Promise.all([groupMembers(db, groupId), listExpenses(db, groupId), listSettlements(db, groupId), ensureSelf(db)]);
  const like = exps.map(asLike);
  const sl = sets.map(asSettle);
  const balances = computeBalances(like, sl, group.currency);
  const transfers = group.simplify ? simplifyDebts(balances) : pairwiseDebts(like, sl, group.currency);
  const totalSpent = exps.reduce((a, e) => a + Math.round(e.amount * (e.currency === group.currency ? 1 : e.rate)), 0);
  return { group, members, balances, transfers, myBalance: balances[me.id] ?? 0, totalSpent };
}

/** Net money between "me" and each friend across ALL groups and non-group expenses (INR-only; foreign-currency groups are skipped). */
export async function friendBalances(db: Db): Promise<{ person: Person; net: number }[]> {
  const me = await ensureSelf(db);
  const people = (await listPeople(db)).filter((p) => !p.is_self);
  const exps = (await db.all<any>(`SELECT * FROM group_expenses WHERE ${ALIVE} AND currency='INR'`));
  const hyd = await hydrate(db, exps);
  const sets = await db.all<SettlementRow>(`SELECT * FROM settlements WHERE ${ALIVE} AND currency='INR'`);
  const pw = pairwiseDebts(hyd.map(asLike), sets.map(asSettle));
  return people.map((p) => {
    let net = 0; // + they owe me
    for (const t of pw) {
      if (t.to === me.id && t.from === p.id) net += t.amount;
      if (t.from === me.id && t.to === p.id) net -= t.amount;
    }
    return { person: p, net };
  });
}

/* ---------- personal tracker mirror ---------- */
/** Keep the user's own share of a group expense in the personal tracker (INR groups only). */
export async function syncPersonalShare(db: Db, expenseId: string) {
  const e = await getExpense(db, expenseId);
  if (!e) return;
  const me = await ensureSelf(db);
  const grp = e.group_id ? await getGroup(db, e.group_id) : null;
  const existing = await db.get<{ id: string }>(`SELECT id FROM transactions WHERE group_expense_id=?`, [expenseId]);
  const mine = e.shares[me.id] ?? 0;
  const eligible = mine > 0 && (e.currency === 'INR') && (!grp || grp.currency === 'INR');
  if (!eligible) {
    if (existing) await db.run(`UPDATE transactions SET deleted_at=?, updated_at=?, dirty=1 WHERE id=?`, [Date.now(), Date.now(), existing.id]);
    return;
  }
  const fields = { amount: mine, merchant: e.description, note: grp ? `Group: ${grp.name}` : 'Shared expense', category_id: e.category_id, occurred_at: e.occurred_at };
  if (existing) await updateRow(db, 'transactions', existing.id, { ...fields, deleted_at: null });
  else await addTransaction(db, { type: 'expense', ...fields, source: 'group', group_expense_id: expenseId });
}

/* ---------- recurring shared expenses ---------- */
export async function addSharedRecurring(db: Db, tpl: NewGroupExpense, frequency: Frequency, firstDue: number) {
  return insertRow(db, 'recurring', { template: JSON.stringify(tpl), frequency, next_due: firstDue, scope: 'shared', active: 1 });
}

export async function materializeSharedDue(db: Db, asOf = Date.now()): Promise<number> {
  const due = await db.all<{ id: string; template: string; frequency: Frequency; next_due: number }>(
    `SELECT * FROM recurring WHERE ${ALIVE} AND active=1 AND scope='shared' AND next_due <= ?`, [asOf]);
  let n = 0;
  for (const r of due) {
    let when = r.next_due;
    const tpl = JSON.parse(r.template) as NewGroupExpense;
    let guard = 0;
    while (when <= asOf && guard++ < 400) {
      await addGroupExpense(db, { ...tpl, occurredAt: when, recurringId: r.id });
      n++;
      when = nextDue(when, r.frequency);
    }
    await updateRow(db, 'recurring', r.id, { next_due: when });
  }
  return n;
}

/* ---------- comments ---------- */
export const addComment = (db: Db, expenseId: string, personId: string | null, body: string) => insertRow(db, 'comments', { expense_id: expenseId, person_id: personId, body: body.trim() });
export const listComments = (db: Db, expenseId: string) => db.all<{ id: string; person_id: string | null; body: string; created_at: number }>(`SELECT * FROM comments WHERE expense_id=? AND ${ALIVE} ORDER BY created_at`, [expenseId]);
