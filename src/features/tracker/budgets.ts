import type { Budget } from '@/domain/types';

export type BudgetStatus = 'ok' | 'warn' | 'over';
export interface BudgetProgress {
  budget: Budget;
  spent: number;
  pct: number; // 0..n (can exceed 100)
  remaining: number;
  status: BudgetStatus;
  /** projected month-end spend at the current daily pace */
  projected: number;
}

export function budgetProgress(
  budget: Budget,
  spent: number,
  dayOfMonth: number,
  daysInMonth: number,
): BudgetProgress {
  const pct = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
  const status: BudgetStatus = spent > budget.amount ? 'over' : pct >= budget.alert_pct ? 'warn' : 'ok';
  const projected = dayOfMonth > 0 ? Math.round((spent / dayOfMonth) * daysInMonth) : spent;
  return { budget, spent, pct, remaining: budget.amount - spent, status, projected };
}

/** Returns the status to alert about when spending crosses a threshold, else null. */
export function crossedThreshold(before: number, after: number, budget: Budget): 'warn' | 'over' | null {
  const warnAt = Math.ceil((budget.amount * budget.alert_pct) / 100);
  if (before <= budget.amount && after > budget.amount) return 'over';
  if (before < warnAt && after >= warnAt) return 'warn';
  return null;
}
