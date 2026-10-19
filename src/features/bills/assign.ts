import type { Minor } from '@/domain/money';
import { computeShares, SplitError, type SplitInput } from '@/features/groups/split';

export interface AssignedItem {
  id: string;
  name: string;
  amount: Minor;
  assignees: string[]; // person ids; the item's cost is split equally among them
}

export const itemsSum = (items: { amount: Minor }[]) => items.reduce((a, i) => a + i.amount, 0);

/** Difference between the printed bill total and the items: tax / service charge / round-off (+) or discount (-). */
export const billExtra = (total: Minor, items: { amount: Minor }[]) => total - itemsSum(items);

export type BuildResult = { ok: true; split: SplitInput; shares: Record<string, Minor> } | { ok: false; error: string };

/** Validates the assignment and builds the itemised split the group-expense engine understands. */
export function buildItemizedSplit(items: AssignedItem[], total: Minor): BuildResult {
  const real = items.filter((i) => i.amount > 0);
  if (!real.length) return { ok: false, error: 'Add at least one item' };
  const unassigned = real.filter((i) => i.assignees.length === 0);
  if (unassigned.length) return { ok: false, error: `${unassigned.length} item${unassigned.length === 1 ? '' : 's'} not assigned yet` };
  if (!(total > 0)) return { ok: false, error: 'Enter the bill total' };
  const extra = billExtra(total, real);
  const split: SplitInput = { type: 'itemized', items: real.map((i) => ({ amount: i.amount, participants: i.assignees })), extra };
  try {
    return { ok: true, split, shares: computeShares(total, split) };
  } catch (e) {
    return { ok: false, error: e instanceof SplitError ? e.message : (e as Error).message };
  }
}

/** Give every unassigned item to everyone (the "split the rest equally" shortcut). */
export function assignRestToAll(items: AssignedItem[], everyone: string[]): AssignedItem[] {
  return items.map((i) => (i.assignees.length ? i : { ...i, assignees: everyone }));
}

/** Toggle one person on one item. */
export function toggleAssignee(items: AssignedItem[], itemId: string, personId: string): AssignedItem[] {
  return items.map((i) =>
    i.id !== itemId ? i : { ...i, assignees: i.assignees.includes(personId) ? i.assignees.filter((p) => p !== personId) : [...i.assignees, personId] },
  );
}
