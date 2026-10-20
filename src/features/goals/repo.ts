import type { Db } from '@/db/types';
import { insertRow, softDelete, updateRow } from '@/db/rows';
import { DAY } from '@/lib/date';
import { isValidMinor } from '@/domain/money';

const ALIVE = 'deleted_at IS NULL';

export interface Goal {
  id: string;
  name: string;
  icon: string; // a glyph key from components/glyphs (GOAL_ICONS)
  color: string;
  target: number; // minor units
  deadline: number | null;
  achieved_at: number | null;
}
export interface GoalEntry { id: string; goal_id: string; amount: number; note: string | null; occurred_at: number }

export interface GoalProgress {
  goal: Goal;
  saved: number;
  pct: number; // 0..100
  remaining: number;
  /** Whole days until the deadline (negative once passed), or null with no deadline. */
  daysLeft: number | null;
  /** Amount to set aside per month to land on the deadline, or null when there is no deadline or it is done. */
  perMonth: number | null;
  done: boolean;
}

export async function addGoal(db: Db, g: { name: string; target: number; icon?: string; color?: string; deadline?: number | null }): Promise<string> {
  if (!g.name.trim()) throw new Error('Give the goal a name');
  if (!isValidMinor(g.target)) throw new Error('Target must be a positive amount');
  return insertRow(db, 'goals', { name: g.name.trim(), target: g.target, icon: g.icon ?? 'target', color: g.color ?? '#FF8106', deadline: g.deadline ?? null });
}

export const removeGoal = (db: Db, id: string) => softDelete(db, 'goals', id);

export async function contribute(db: Db, goalId: string, amount: number, note?: string | null, at = Date.now()): Promise<void> {
  if (!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > 1e12) throw new Error('Enter an amount');
  await db.transaction(async () => {
    const saved = await savedFor(db, goalId);
    if (saved + amount < 0) throw new Error('That is more than is saved in this goal');
    await insertRow(db, 'goal_entries', { goal_id: goalId, amount, note: note ?? null, occurred_at: at });
    const g = await db.get<Goal>(`SELECT * FROM goals WHERE id=?`, [goalId]);
    if (!g) throw new Error('Goal not found');
    const done = saved + amount >= g.target;
    await updateRow(db, 'goals', goalId, { achieved_at: done ? (g.achieved_at ?? at) : null });
  });
}

const savedFor = async (db: Db, goalId: string) =>
  (await db.get<{ s: number }>(`SELECT COALESCE(SUM(amount),0) s FROM goal_entries WHERE goal_id=? AND ${ALIVE}`, [goalId]))?.s ?? 0;

export function progressOf(goal: Goal, saved: number, now = Date.now()): GoalProgress {
  const remaining = Math.max(0, goal.target - saved);
  const done = saved >= goal.target;
  const daysLeft = goal.deadline ? Math.ceil((goal.deadline - now) / DAY) : null;
  const months = daysLeft !== null && daysLeft > 0 ? Math.max(1, Math.round(daysLeft / 30)) : null;
  return {
    goal, saved, remaining, done, daysLeft,
    pct: Math.min(100, Math.round((saved / goal.target) * 100)),
    perMonth: !done && months ? Math.ceil(remaining / months) : null,
  };
}

export async function listGoals(db: Db, now = Date.now()): Promise<GoalProgress[]> {
  const goals = await db.all<Goal>(`SELECT * FROM goals WHERE ${ALIVE} ORDER BY achieved_at IS NOT NULL, COALESCE(deadline, 9e15), created_at`);
  const sums = await db.all<{ goal_id: string; s: number }>(`SELECT goal_id, SUM(amount) s FROM goal_entries WHERE ${ALIVE} GROUP BY goal_id`);
  const by = new Map(sums.map((x) => [x.goal_id, x.s]));
  return goals.map((g) => progressOf(g, by.get(g.id) ?? 0, now));
}

export const listEntries = (db: Db, goalId: string) =>
  db.all<GoalEntry>(`SELECT * FROM goal_entries WHERE goal_id=? AND ${ALIVE} ORDER BY occurred_at DESC`, [goalId]);
