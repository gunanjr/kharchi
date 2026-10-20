import type { Href } from 'expo-router';
import type { IconName } from '@/components/Icon';
import { useQuery } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { radarView, findRepeating } from '@/features/radar/radar';
import { viewAll } from '@/features/dues/dues';
import { status as warrantyStatus } from '@/features/warranty/warranty';
import { WORK_TAG, CLAIMED_TAG } from '@/features/reimburse/reimburse';
import { readTags } from '@/features/tracker/tags';
import { auraDays, auraScore, seasonsFor } from '@/features/mce/aura';
import { challengeView } from '@/features/challenges/challenges';
import { useSettings } from '@/store/settings';
import { formatMoney } from '@/domain/money';

const DAY = 86_400_000;
export type PinTab = 'home' | 'insights' | 'groups';
export const PIN_TABS: { key: PinTab; label: string }[] = [{ key: 'home', label: 'Home' }, { key: 'insights', label: 'Insights' }, { key: 'groups', label: 'Groups' }];

/** Every Pro tool, with where it opens. `stat` keys into useProStats for a live line under the title. */
export type ProWidget = { id: string; icon: IconName; title: string; sub: string; href: Href; group: 'you' | 'plan' | 'protect' | 'understand' | 'work' };
export const WIDGETS: ProWidget[] = [
  { id: 'aura', icon: 'bolt', title: 'Main Character Energy', sub: 'Your aura and rank', href: '/mce', group: 'you' },
  { id: 'challenges', icon: 'flame', title: 'Challenges', sub: 'Short goals with a finish line', href: '/challenges', group: 'you' },
  { id: 'bruh', icon: 'person', title: 'Money profile', sub: 'Persona, Roast or toast', href: '/me', group: 'you' },
  { id: 'comingUp', icon: 'calendar', title: 'Coming up', sub: 'Bills and renewals this week', href: '/dues', group: 'plan' },
  { id: 'dues', icon: 'calendar', title: 'Due dates', sub: 'Never pay late', href: '/dues', group: 'plan' },
  { id: 'radar', icon: 'repeat', title: 'Subscriptions', sub: 'Renewals and price rises', href: '/radar', group: 'plan' },
  { id: 'spaces', icon: 'wallet', title: 'Spaces', sub: 'Side hustle, home, trips', href: '/spaces', group: 'plan' },
  { id: 'vault', icon: 'lock', title: 'Vault', sub: 'Encrypted backups', href: '/settings/vault', group: 'protect' },
  { id: 'warranty', icon: 'shield', title: 'Warranties', sub: 'End dates and bills', href: '/warranty', group: 'protect' },
  { id: 'deepdive', icon: 'chart', title: 'Deep dive', sub: 'Calendar, month compare', href: '/deep-dive', group: 'understand' },
  { id: 'wrappedYear', icon: 'ribbon', title: 'Yearly Wrapped', sub: 'Your year as a story', href: { pathname: '/wrapped', params: { tab: 'year' } }, group: 'understand' },
  { id: 'tax', icon: 'receipt', title: 'Tax totals', sub: 'Yearly totals for your CA', href: '/tax', group: 'work' },
  { id: 'reimburse', icon: 'receipt', title: 'Reimbursements', sub: 'Work spends as a PDF', href: '/reimburse', group: 'work' },
];
export const widget = (id: string) => WIDGETS.find((w) => w.id === id);

/** Live one-liners for each tool, so the Pro tab reads like a dashboard rather than a menu. */
export function useProStats() {
  const s = useSettings();
  const now = Date.now();
  const q = useQuery(async (d) => ({
    txs: await listTransactions(d, { from: now - 400 * DAY, to: now + 1 }),
    sets: (await d.all<{ occurred_at: number }>('SELECT occurred_at FROM settlements WHERE deleted_at IS NULL')).map((x) => x.occurred_at),
  }), []);
  if (!q.data) return null;
  const { txs, sets } = q.data;
  const money = (n: number) => formatMoney(n, 'INR', { compact: true });
  const radar = radarView(findRepeating(txs, now), s.radarState, now);
  const liveSubs = radar.items.filter((v) => v.status === 'active' && !v.cancelled);
  const dues = viewAll(s.dueItems, now).filter((v) => v.status !== 'paid' && v.inDays <= 7);
  const ending = s.warranties.filter((w) => warrantyStatus(w, now).status === 'ending').length;
  const tagsOf = (t: { tags: string | null }) => readTags(t.tags).map((g) => g.toLowerCase());
  const unclaimed = txs.filter((t) => t.type === 'expense' && tagsOf(t).includes(WORK_TAG) && !tagsOf(t).includes(CLAIMED_TAG));
  const aura = auraScore(auraDays(txs, sets, now));
  const ago = s.vaultLastAt ? Math.round((now - s.vaultLastAt) / 3600_000) : null;
  const stat: Record<string, string> = {
    aura: `${aura.rank.title} · ${aura.score}`,
    bruh: s.profileName ? s.profileName : 'Persona and roasts',
    comingUp: dues.length ? `${dues.length} due this week` : 'Nothing due this week',
    dues: s.dueItems.length ? `${dues.length} due this week · ${s.dueItems.length} tracked` : 'Add your first bill',
    radar: liveSubs.length ? `${money(radar.monthlyActive)} a month · ${liveSubs.length} active` : 'No repeating charges yet',
    spaces: s.spaces.length ? `${s.spaces.length} ${s.spaces.length === 1 ? 'space' : 'spaces'}` : 'Make your first space',
    vault: s.vaultUri ? (ago === null ? 'On' : ago < 1 ? 'Backed up just now' : ago < 48 ? `Backed up ${ago}h ago` : `Backed up ${Math.round(ago / 24)}d ago`) : 'Off · turn it on',
    warranty: s.warranties.length ? (ending ? `${ending} ending soon` : `${s.warranties.length} covered`) : 'Add a bill',
    deepdive: 'Calendar and compare',
    wrappedYear: `Your ${new Date(now).getFullYear()} so far`,
    tax: 'This financial year',
    reimburse: unclaimed.length ? `${unclaimed.length} to claim · ${money(unclaimed.reduce((a, t) => a + t.amount, 0))}` : 'Nothing to claim',
  };
  const running = s.challenges.map((c) => challengeView(c, txs, now, money)).filter((v) => v.status === 'running');
  stat.challenges = running.length ? `${running[0].def.title} · ${running[0].line}` : s.challengeWins.length ? `${s.challengeWins.length} finished · start another` : 'Start your first';
  const seasons = seasonsFor(txs, sets, now, 6);
  const claim = { count: unclaimed.length, total: unclaimed.reduce((a, t) => a + t.amount, 0) };
  return { stat, aura, radar, dues, txs, sets, claim, running, seasons };
}
