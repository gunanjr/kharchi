import { allocate, type Minor } from '@/domain/money';
import type { SplitType } from '@/domain/types';

export type SplitInput =
  | { type: 'equal'; participants: string[] }
  | { type: 'exact'; amounts: Record<string, Minor> }
  | { type: 'percent'; percents: Record<string, number> }
  | { type: 'shares'; shares: Record<string, number> }
  /** Equal split of (total - sum(adjustments)) with each person's fixed adjustment added on top. */
  | { type: 'adjustment'; participants: string[]; adjustments: Record<string, Minor> }
  /** Each item split equally among its participants; `extra` (tax/tip, or a NEGATIVE discount) is spread in proportion to item subtotals. */
  | { type: 'itemized'; items: { amount: Minor; participants: string[] }[]; extra?: Minor };

export class SplitError extends Error {}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Returns each person's share of `total`. The result ALWAYS sums exactly to `total` or this throws SplitError. */
export function computeShares(total: Minor, input: SplitInput): Record<string, Minor> {
  if (!Number.isInteger(total) || total <= 0) throw new SplitError('Total must be a positive amount');
  const out: Record<string, Minor> = {};
  const fromWeights = (ids: string[], weights: number[], amount = total) => {
    if (!ids.length) throw new SplitError('Pick at least one person');
    allocate(amount, weights).forEach((v, i) => (out[ids[i]] = (out[ids[i]] ?? 0) + v));
  };

  switch (input.type) {
    case 'equal': {
      const ids = [...new Set(input.participants)];
      fromWeights(ids, ids.map(() => 1));
      break;
    }
    case 'exact': {
      const ids = Object.keys(input.amounts);
      if (sum(Object.values(input.amounts)) !== total) throw new SplitError('Amounts must add up to the total');
      if (Object.values(input.amounts).some((v) => v < 0)) throw new SplitError('Amounts cannot be negative');
      for (const id of ids) out[id] = input.amounts[id];
      break;
    }
    case 'percent': {
      const ids = Object.keys(input.percents);
      const p = sum(Object.values(input.percents));
      if (Math.abs(p - 100) > 0.001) throw new SplitError('Percentages must add up to 100');
      fromWeights(ids, ids.map((i) => input.percents[i]));
      break;
    }
    case 'shares': {
      const ids = Object.keys(input.shares).filter((i) => input.shares[i] > 0);
      fromWeights(ids, ids.map((i) => input.shares[i]));
      break;
    }
    case 'adjustment': {
      const ids = [...new Set(input.participants)];
      const adjTotal = sum(ids.map((i) => input.adjustments[i] ?? 0));
      const remaining = total - adjTotal;
      if (remaining < 0) throw new SplitError('Adjustments exceed the total');
      if (!ids.length) throw new SplitError('Pick at least one person');
      const base = allocate(remaining, ids.map(() => 1));
      ids.forEach((id, i) => (out[id] = base[i] + (input.adjustments[id] ?? 0)));
      break;
    }
    case 'itemized': {
      const extra = input.extra ?? 0;
      const itemsTotal = sum(input.items.map((i) => i.amount));
      if (itemsTotal + extra !== total) throw new SplitError('Items plus tax/tip must add up to the total');
      const perItem: Record<string, number> = {};
      for (const it of input.items) {
        const ids = [...new Set(it.participants)];
        if (!ids.length) throw new SplitError('Every item needs at least one person');
        allocate(it.amount, ids.map(() => 1)).forEach((v, i) => (perItem[ids[i]] = (perItem[ids[i]] ?? 0) + v));
      }
      if (extra !== 0) {
        // tax / tip / round-off (positive) or a discount (negative) is spread in proportion to each person's items
        const ids = Object.keys(perItem);
        const parts = allocate(Math.abs(extra), ids.map((i) => perItem[i]));
        ids.forEach((id, i) => (perItem[id] += extra > 0 ? parts[i] : -parts[i]));
        if (Object.values(perItem).some((v) => v < 0)) throw new SplitError('The discount is larger than the items');
      }
      Object.assign(out, perItem);
      break;
    }
  }
  if (sum(Object.values(out)) !== total) throw new SplitError('Internal error: shares do not add up');
  return out;
}

export function validatePayers(total: Minor, payers: Record<string, Minor>) {
  const paid = sum(Object.values(payers));
  if (paid !== total) throw new SplitError(`Paid amounts (${paid}) must equal the total (${total})`);
  if (Object.values(payers).some((v) => v < 0)) throw new SplitError('Payer amounts cannot be negative');
}

export const SPLIT_LABELS: Record<SplitType, string> = {
  equal: 'Equally',
  exact: 'Exact amounts',
  percent: 'Percentages',
  shares: 'Shares',
  adjustment: 'Adjustment',
  itemized: 'Itemised',
};
