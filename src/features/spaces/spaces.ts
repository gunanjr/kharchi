import type { Transaction } from '@/domain/types';

/** Spaces (Pro): what each kind of book shows. Pure and tested. */
export type SpaceKind = 'side' | 'home' | 'trip' | 'event';
export interface Space {
  id: string;
  name: string;
  kind: SpaceKind;
  emoji: string;
  /** side hustle: share of profit to set aside for tax, 0 to 50 (%) */
  taxPct?: number;
  /** home: your share of shared home costs, 1 to 99 (%) */
  myShare?: number;
  /** trip or event: total budget in paise */
  budget?: number | null;
}

export const KIND_INFO: Record<SpaceKind, { label: string; emoji: string; hint: string }> = {
  side: { label: 'Side hustle', emoji: '💼', hint: 'Money in and out, profit, margin and tax to set aside' },
  home: { label: 'Home', emoji: '🏠', hint: 'Shared home costs and your fair share' },
  trip: { label: 'Trip', emoji: '✈️', hint: 'Budget, spent so far and what is left' },
  event: { label: 'Event', emoji: '🎉', hint: 'Weddings, parties, festivals: budget and spend' },
};

type Tx = Pick<Transaction, 'type' | 'amount' | 'occurred_at'> & { excluded?: number | null; space_id?: string | null };

export interface SpaceSummary {
  income: number;
  spent: number;
  profit: number;
  /** profit as a share of income, 0 to 100, null without income */
  margin: number | null;
  taxSetAside: number;
  myShare: number | null;
  budgetLeft: number | null;
  budgetUsedPct: number | null;
  entries: number;
}

export function summarize(space: Space, txs: Tx[], from: number, to: number): SpaceSummary {
  const mine = txs.filter((t) => (t.space_id ?? '') === space.id && !t.excluded && t.occurred_at >= from && t.occurred_at < to);
  const income = mine.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const spent = mine.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const profit = income - spent;
  const taxPct = Math.min(50, Math.max(0, space.taxPct ?? 0));
  const share = space.myShare !== undefined ? Math.min(99, Math.max(1, space.myShare)) : null;
  const budget = space.budget && space.budget > 0 ? space.budget : null;
  return {
    income, spent, profit,
    margin: income > 0 ? Math.round((profit / income) * 100) : null,
    taxSetAside: space.kind === 'side' && profit > 0 ? Math.round((profit * taxPct) / 100) : 0,
    myShare: space.kind === 'home' && share !== null ? Math.round((spent * share) / 100) : null,
    budgetLeft: budget !== null ? budget - spent : null,
    budgetUsedPct: budget !== null ? Math.round((spent / budget) * 100) : null,
    entries: mine.length,
  };
}

export function validateSpace(s: { name: string; existing: Space[]; id?: string }): string | null {
  const n = s.name.trim();
  if (!n) return 'Give the space a name.';
  if (n.length > 30) return 'Keep the name under 30 characters.';
  if (n.toLowerCase() === 'personal') return 'Personal already exists.';
  if (s.existing.some((x) => x.id !== s.id && x.name.trim().toLowerCase() === n.toLowerCase())) return 'You already have a space with that name.';
  if (s.existing.filter((x) => x.id !== s.id).length >= 10) return 'You can have up to 10 spaces.';
  return null;
}
