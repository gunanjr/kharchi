import type { AiAnswer, AiContext, AiProvider } from './types';
import { parsePeriod } from './period';
import { formatMoney } from '@/domain/money';
import { listBudgets, listCategories, listTransactions, spendByCategory } from '@/features/tracker/repo';
import { friendBalances } from '@/features/groups/repo';
import * as A from '@/features/insights/analytics';
import { DAY, daysInMonth, startOfMonth } from '@/lib/date';
import { merchantKey } from '@/features/parser/merchants';
import type { Category, Transaction } from '@/domain/types';

const inr = (n: number) => formatMoney(n, 'INR', { trimZeros: true });

export type Intent =
  | 'owe' | 'predict' | 'save' | 'biggest' | 'count' | 'average' | 'by_category' | 'by_merchant'
  | 'income' | 'subscriptions' | 'budget' | 'compare' | 'total';

export function detectIntent(q: string): Intent {
  const t = q.toLowerCase();
  if (/\b(owe|owes|owed|settle|balance with|who do i)\b/.test(t)) return 'owe';
  if (/(predict|forecast|project|on track|end of (the )?month|will i (spend|end))/.test(t)) return 'predict';
  if (/(can i save|save\b|savings|saving rate|how much.*(left|remaining))/.test(t) && !/spent on/.test(t)) return 'save';
  if (/(subscription|recurring|autopay)/.test(t)) return 'subscriptions';
  if (/budget/.test(t)) return 'budget';
  if (/(biggest|largest|highest|most expensive|top expense|costliest)/.test(t) && !/merchant|shop|store/.test(t)) return 'biggest';
  if (/(how many|number of|count of)/.test(t)) return 'count';
  if (/(average|avg|per day|daily|on average)/.test(t)) return 'average';
  if (/(top merchant|merchants|where do i spend|most at|spend the most|by merchant|which (shop|store|app))/.test(t)) return 'by_merchant';
  if (/(by category|categories|breakdown|break down|where did (my|the) money go|split of|distribution)/.test(t)) return 'by_category';
  if (/(compare|versus|vs\b|more than last|less than last|compared to)/.test(t)) return 'compare';
  if (/(income|earn|earned|salary|received|credited|made)/.test(t)) return 'income';
  return 'total';
}

const SYNONYMS: Record<string, string[]> = {
  food: ['food', 'eating', 'dining', 'restaurant', 'restaurants', 'zomato', 'swiggy', 'lunch', 'dinner', 'coffee'],
  groceries: ['grocery', 'groceries', 'vegetables', 'supermarket'],
  transport: ['transport', 'travel', 'cab', 'cabs', 'uber', 'ola', 'commute', 'fuel', 'petrol'],
  shopping: ['shopping', 'clothes', 'amazon', 'flipkart'],
  bills: ['bills', 'bill', 'utilities', 'electricity', 'recharge'],
  rent: ['rent'],
  entertainment: ['entertainment', 'movies', 'movie', 'fun'],
  health: ['health', 'medical', 'medicine', 'pharmacy', 'doctor'],
  subscriptions: ['subscriptions'],
};

export function findCategory(q: string, cats: Category[]): Category | null {
  const t = q.toLowerCase();
  for (const c of cats) if (t.includes(c.name.toLowerCase())) return c;
  for (const c of cats) {
    const key = c.id.replace('cat_', '');
    if ((SYNONYMS[key] ?? [key]).some((w) => new RegExp(`\\b${w}\\b`).test(t))) return c;
  }
  return null;
}

function merchantInQuestion(q: string, txs: Transaction[]): string | null {
  const m = q.toLowerCase().match(/(?:at|on|to|from|for)\s+([a-z0-9][a-z0-9 &.'-]{1,24}?)(?:\s+(?:this|last|in|during|over|since|today|yesterday|so far)\b|[?.!]|$)/);
  if (!m) return null;
  const key = merchantKey(m[1]);
  if (!key) return null;
  return txs.some((t) => merchantKey(t.merchant || t.note).startsWith(key.split(' ')[0])) ? key : null;
}

export class LocalRulesProvider implements AiProvider {
  readonly name = 'On-device assistant';

  async answer(question: string, { db, now }: AiContext): Promise<AiAnswer> {
    const period = parsePeriod(question, now);
    const intent = detectIntent(question);
    const cats = await listCategories(db);
    const names = new Map(cats.map((c) => [c.id, c]));
    const catName = (id: string | null) => (id ? names.get(id)?.name ?? 'Other' : 'Uncategorised');
    const inPeriod = await listTransactions(db, { from: period.from, to: period.to });
    const spend = inPeriod.filter((t) => t.type === 'expense');
    const total = spend.reduce((a, t) => a + t.amount, 0);
    const cat = findCategory(question, cats);
    const merchant = merchantInQuestion(question, inPeriod);
    const days = Math.max(1, Math.round((Math.min(period.to, now) - period.from) / DAY) + 1);

    if (spend.length === 0 && !['owe', 'predict', 'save', 'subscriptions', 'budget'].includes(intent))
      return { text: `I couldn't find any spending for ${period.label}. Try “this month” or “last 30 days”, or add some expenses first.`, followUps: ['How much did I spend this month?'] };

    switch (intent) {
      case 'owe': {
        const fb = (await friendBalances(db)).filter((f) => f.net !== 0);
        if (!fb.length) return { text: 'You’re all settled up. Nobody owes you and you owe nobody. 🎉' };
        const owe = fb.filter((f) => f.net < 0).sort((a, b) => a.net - b.net);
        const owed = fb.filter((f) => f.net > 0).sort((a, b) => b.net - a.net);
        const lines = [
          owe.length ? `You owe ${owe.map((f) => `${f.person.name} ${inr(-f.net)}`).join(', ')}.` : '',
          owed.length ? `${owed.map((f) => `${f.person.name} owes you ${inr(f.net)}`).join(', ')}.` : '',
        ].filter(Boolean);
        return { text: lines.join(' '), chart: { kind: 'bars', rows: fb.map((f) => ({ label: f.person.name, value: Math.abs(f.net) })) }, followUps: ['How much can I save this month?'] };
      }
      case 'predict': {
        const all = await listTransactions(db, { from: startOfMonth(now, -1), to: now + 1 });
        const f = A.forecastMonth(all, now);
        const budgets = await listBudgets(db);
        const overall = budgets.find((b) => !b.category_id);
        const verdict = overall ? (f.projectedTotal > overall.amount ? ` That is ${inr(f.projectedTotal - overall.amount)} over your ${inr(overall.amount)} budget.` : ` That is within your ${inr(overall.amount)} budget.`) : '';
        return { text: `You’ve spent ${inr(f.spent)} in ${f.day} days. At this pace you’ll finish the month around ${inr(f.projectedTotal)}.${verdict}`, chart: { kind: 'line', actual: f.actual, projected: f.projected }, followUps: ['Where did my money go this month?'] };
      }
      case 'save': {
        const cur = await listTransactions(db, { from: startOfMonth(now), to: now + 1 });
        const income = cur.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
        const exp = cur.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
        const all = await listTransactions(db, { from: startOfMonth(now, -6), to: now + 1 });
        const prev = all.filter((t) => t.occurred_at < startOfMonth(now));
        const subs = A.detectSubscriptions(all);
        const tips = A.savingsTips({
          byCat: A.byCategory(cur), prevByCat: A.byCategory(prev.filter((t) => t.occurred_at >= startOfMonth(now, -1))), subs, income, expense: exp, names: catName,
        });
        const f = A.forecastMonth(all, now);
        const headline = income > 0 ? `So far this month you earned ${inr(income)} and spent ${inr(exp)}, leaving ${inr(income - exp)}. On your current pace you’ll end up saving about ${inr(income - f.projectedTotal)}.` : `You’ve spent ${inr(exp)} this month and no income is logged yet.`;
        return { text: [headline, ...tips.slice(0, 3)].join('\n\n'), followUps: ['Show my subscriptions', 'Predict this month'] };
      }
      case 'subscriptions': {
        const subs = A.detectSubscriptions(await listTransactions(db, { from: startOfMonth(now, -12), to: now + 1 }));
        if (!subs.length) return { text: 'I don’t see any steady recurring charges yet. I need at least three similar payments to spot one.' };
        const yearly = subs.reduce((a, s) => a + s.yearly, 0);
        return { text: `I found ${subs.length} recurring ${subs.length === 1 ? 'charge' : 'charges'} costing about ${inr(yearly)} a year: ${subs.map((s) => `${s.name} ${inr(s.amount)}`).join(', ')}.`, chart: { kind: 'bars', rows: subs.map((s) => ({ label: s.name, value: s.yearly })) } };
      }
      case 'budget': {
        const budgets = await listBudgets(db);
        if (!budgets.length) return { text: 'You haven’t set any budgets yet. Set one under More → Budgets and I can track it for you.' };
        const by = await spendByCategory(db, startOfMonth(now), now + 1);
        const tot = by.reduce((a, c) => a + c.total, 0);
        const rows = budgets.map((b) => {
          const spent = b.category_id ? by.find((x) => x.category_id === b.category_id)?.total ?? 0 : tot;
          return { label: b.category_id ? catName(b.category_id) : 'Overall', value: spent, limit: b.amount };
        });
        return { text: rows.map((r) => `${r.label}: ${inr(r.value)} of ${inr(r.limit)} (${Math.round((r.value / r.limit) * 100)}%)`).join('\n'), chart: { kind: 'bars', rows: rows.map((r) => ({ label: r.label, value: r.value })) } };
      }
      case 'biggest': {
        const pool = cat ? spend.filter((t) => t.category_id === cat.id) : spend;
        const top = [...pool].sort((a, b) => b.amount - a.amount).slice(0, 3);
        if (!top.length) return { text: `No ${cat?.name ?? ''} spending found for ${period.label}.` };
        return { text: `Your biggest ${cat ? cat.name.toLowerCase() + ' ' : ''}expense ${period.label} was ${inr(top[0].amount)} at ${top[0].merchant || top[0].note || catName(top[0].category_id)} on ${new Date(top[0].occurred_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`, chart: { kind: 'bars', rows: top.map((t) => ({ label: t.merchant || t.note || catName(t.category_id), value: t.amount })) } };
      }
      case 'count': {
        const pool = cat ? spend.filter((t) => t.category_id === cat.id) : merchant ? spend.filter((t) => merchantKey(t.merchant || t.note).startsWith(merchant.split(' ')[0])) : spend;
        return { text: `${pool.length} ${pool.length === 1 ? 'transaction' : 'transactions'}${cat ? ` in ${cat.name}` : merchant ? ` at ${merchant}` : ''} ${period.label}, totalling ${inr(pool.reduce((a, t) => a + t.amount, 0))}.` };
      }
      case 'average': {
        const pool = cat ? spend.filter((t) => t.category_id === cat.id) : spend;
        const sum = pool.reduce((a, t) => a + t.amount, 0);
        const perDay = Math.round(sum / days);
        return { text: `${cat ? cat.name + ': ' : ''}you averaged ${inr(perDay)} a day ${period.label}, and ${pool.length ? inr(Math.round(sum / pool.length)) : '₹0'} per transaction.` };
      }
      case 'by_merchant': {
        const m = A.topMerchants(spend, 6);
        return { text: `Top places ${period.label}: ${m.map((x) => `${x.name} ${inr(x.total)}`).join(', ')}.`, chart: { kind: 'bars', rows: m.map((x) => ({ label: x.name, value: x.total })) }, followUps: ['Where did my money go this month?'] };
      }
      case 'by_category': {
        const c = A.byCategory(spend);
        const lead = c[0];
        return {
          text: `You spent ${inr(total)} ${period.label}. ${catName(lead.category_id)} led at ${inr(lead.total)} (${Math.round((lead.total / total) * 100)}%).`,
          chart: { kind: 'donut', slices: c.slice(0, 8).map((x) => ({ label: catName(x.category_id), value: x.total, color: x.category_id ? names.get(x.category_id)?.color : undefined })) },
          followUps: ['Top merchants this month', 'Compare with last month'],
        };
      }
      case 'compare': {
        const prev = parsePeriod('last month', now);
        const prevTx = (await listTransactions(db, { from: prev.from, to: prev.to })).filter((t) => t.type === 'expense');
        const cur = await listTransactions(db, { from: startOfMonth(now), to: now + 1 });
        const curSpend = cur.filter((t) => t.type === 'expense');
        const day = new Date(now).getDate();
        const prevSame = prevTx.filter((t) => new Date(t.occurred_at).getDate() <= day);
        const a = curSpend.reduce((s, t) => s + t.amount, 0);
        const b = prevSame.reduce((s, t) => s + t.amount, 0);
        const diff = a - b;
        return { text: b === 0 ? `You’ve spent ${inr(a)} this month; I have no spending last month to compare.` : `By day ${day} you’ve spent ${inr(a)}, vs ${inr(b)} at the same point last month: ${diff >= 0 ? 'up' : 'down'} ${inr(Math.abs(diff))} (${Math.round((Math.abs(diff) / b) * 100)}%).`, chart: { kind: 'bars', rows: [{ label: 'Last month', value: b }, { label: 'This month', value: a }] } };
      }
      case 'income': {
        const inc = inPeriod.filter((t) => t.type === 'income');
        const s = inc.reduce((a, t) => a + t.amount, 0);
        return { text: s ? `You received ${inr(s)} ${period.label} across ${inc.length} ${inc.length === 1 ? 'credit' : 'credits'}.` : `No income recorded for ${period.label}.` };
      }
      default: {
        if (cat) {
          const s = spend.filter((t) => t.category_id === cat.id).reduce((a, t) => a + t.amount, 0);
          return { text: `You spent ${inr(s)} on ${cat.name} ${period.label}${total ? ` (${Math.round((s / total) * 100)}% of your spending)` : ''}.`, followUps: [`Biggest ${cat.name.toLowerCase()} expense ${period.label}`] };
        }
        if (merchant) {
          const pool = spend.filter((t) => merchantKey(t.merchant || t.note).startsWith(merchant.split(' ')[0]));
          const s = pool.reduce((a, t) => a + t.amount, 0);
          return { text: `You spent ${inr(s)} at ${merchant[0].toUpperCase() + merchant.slice(1)} ${period.label} across ${pool.length} ${pool.length === 1 ? 'visit' : 'visits'}.` };
        }
        return { text: `You spent ${inr(total)} ${period.label} across ${spend.length} transactions.`, chart: { kind: 'donut', slices: A.byCategory(spend).slice(0, 6).map((x) => ({ label: catName(x.category_id), value: x.total, color: x.category_id ? names.get(x.category_id)?.color : undefined })) }, followUps: ['Where did my money go?', 'Predict this month'] };
      }
    }
  }
}

export const SUGGESTED_QUESTIONS = [
  'How much did I spend this month?',
  'Where did my money go last month?',
  'How much on food this month?',
  'Biggest expense this week',
  'Top merchants in the last 30 days',
  'Predict this month',
  'How much can I save?',
  'Who do I owe?',
  'Show my subscriptions',
];

export { daysInMonth };
