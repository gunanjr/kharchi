import { useQuery } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { ensureSelf, listExpenses, listGroups, listSettlements } from '@/features/groups/repo';
import { reliability, BADGE_LABEL } from '@/features/groups/reliability';
import { currentStreak } from '@/features/persona/persona';
import { auraDays, auraScore } from '@/features/mce/aura';

const DAY = 86_400_000;

/** The three status numbers shown on Home and the profile: logging streak, aura and Bruh score. */
export function useStatus() {
  const now = Date.now();
  return useQuery(async (d) => {
    const txs = await listTransactions(d, { from: now - 120 * DAY, to: now + 1 });
    const me = await ensureSelf(d);
    const groups = await listGroups(d);
    const exps = (await Promise.all(groups.map((g) => listExpenses(d, g.id)))).flat();
    const sets = (await Promise.all([...groups.map((g) => listSettlements(d, g.id)), listSettlements(d, null)])).flat();
    const rel = reliability(exps, sets.map((x) => ({ from: x.from_person, to: x.to_person, amount: x.amount, occurred_at: x.occurred_at })), 'INR', now)[me.id];
    const aura = auraScore(auraDays(txs, sets.map((x) => x.occurred_at), now));
    return { streak: currentStreak(txs, now).days, aura, bruh: rel?.badge ? BADGE_LABEL[rel.badge] : null };
  }, []);
}
