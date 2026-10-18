import type { Db } from '@/db/types';
import { addGroupExpense, addPerson, createGroup, ensureSelf, recordSettlement } from '@/features/groups/repo';
import { DAY } from '@/lib/date';

/** Two realistic groups + a non-group split, so balances, simplification and charts have something to show. */
export async function seedGroupDemo(db: Db, now = Date.now()): Promise<void> {
  const me = (await ensureSelf(db)).id;
  const [asha, ravi, meera, kabir] = await Promise.all(['Asha', 'Ravi', 'Meera', 'Kabir'].map((name, i) =>
    addPerson(db, { name, upi_id: i === 1 ? 'ravi@okaxis' : null })));
  const goa = await createGroup(db, { name: 'Goa trip', icon: '🏖️', kind: 'trip', memberIds: [asha, ravi, meera] });
  const flat = await createGroup(db, { name: 'Flat 4B', icon: '🏠', kind: 'home', memberIds: [kabir, asha] });
  const eq = (ids: string[]) => ({ type: 'equal' as const, participants: ids });
  const trip = [me, asha, ravi, meera];
  const day = (n: number) => now - n * DAY;
  await addGroupExpense(db, { groupId: goa, description: 'Villa booking', amount: 2400000, payers: { [me]: 2400000 }, split: eq(trip), categoryId: 'cat_travel', occurredAt: day(20) });
  await addGroupExpense(db, { groupId: goa, description: 'Beach shack dinner', amount: 468000, payers: { [asha]: 468000 }, split: eq(trip), categoryId: 'cat_food', occurredAt: day(19) });
  await addGroupExpense(db, { groupId: goa, description: 'Scooter rentals', amount: 180000, payers: { [ravi]: 180000 }, split: { type: 'shares', shares: { [me]: 1, [asha]: 1, [ravi]: 2, [meera]: 1 } }, categoryId: 'cat_transport', occurredAt: day(18) });
  await addGroupExpense(db, { groupId: goa, description: 'Cab to airport', amount: 120000, payers: { [meera]: 60000, [me]: 60000 }, split: eq(trip), categoryId: 'cat_transport', occurredAt: day(17) });
  await addGroupExpense(db, { groupId: goa, description: 'Groceries', amount: 90000, payers: { [me]: 90000 }, split: { type: 'itemized', items: [{ amount: 60000, participants: trip }, { amount: 30000, participants: [asha, meera] }], extra: 0 }, categoryId: 'cat_groceries', occurredAt: day(16) });
  await recordSettlement(db, { groupId: goa, from: ravi, to: me, amount: 300000, method: 'upi' });
  await addGroupExpense(db, { groupId: flat, description: 'Electricity bill', amount: 320000, payers: { [kabir]: 320000 }, split: eq([me, kabir, asha]), categoryId: 'cat_bills', occurredAt: day(6) });
  await addGroupExpense(db, { groupId: flat, description: 'Wi-Fi + maid', amount: 210000, payers: { [me]: 210000 }, split: eq([me, kabir, asha]), categoryId: 'cat_bills', occurredAt: day(4) });
  await addGroupExpense(db, { groupId: null, description: 'Movie night', amount: 150000, payers: { [meera]: 150000 }, split: eq([me, meera]), categoryId: 'cat_entertainment', occurredAt: day(2) });
}
