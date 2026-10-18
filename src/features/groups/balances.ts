import { allocate, convertMinor, type Minor } from '@/domain/money';

export interface ExpenseLike {
  amount: Minor;
  currency: string;
  /** units of the GROUP currency per 1 unit of the expense currency */
  rate: number;
  payers: Record<string, Minor>;
  shares: Record<string, Minor>;
}
export interface SettlementLike {
  from: string; // paid
  to: string; // received
  amount: Minor;
}
export type Balances = Record<string, Minor>; // + = is owed money, - = owes money
export interface Transfer {
  from: string;
  to: string;
  amount: Minor;
}

/** Convert an expense to the group currency without losing a minor unit: payers and shares re-allocated from the converted total. */
export function toGroupCurrency(e: ExpenseLike, groupCurrency: string): { payers: Record<string, Minor>; shares: Record<string, Minor> } {
  if (e.currency === groupCurrency || e.rate === 1) return { payers: e.payers, shares: e.shares };
  const total = convertMinor(e.amount, e.rate, e.currency, groupCurrency);
  const spread = (m: Record<string, Minor>) => {
    const ids = Object.keys(m);
    const parts = allocate(total, ids.map((i) => m[i]));
    return Object.fromEntries(ids.map((id, i) => [id, parts[i]]));
  };
  return { payers: spread(e.payers), shares: spread(e.shares) };
}

export function computeBalances(expenses: ExpenseLike[], settlements: SettlementLike[], groupCurrency = 'INR'): Balances {
  const b: Balances = {};
  const add = (id: string, v: number) => (b[id] = (b[id] ?? 0) + v);
  for (const e of expenses) {
    const { payers, shares } = toGroupCurrency(e, groupCurrency);
    for (const [id, v] of Object.entries(payers)) add(id, v);
    for (const [id, v] of Object.entries(shares)) add(id, -v);
  }
  for (const s of settlements) {
    add(s.from, s.amount);
    add(s.to, -s.amount);
  }
  return b;
}

const nonZero = (b: Balances) => Object.entries(b).filter(([, v]) => v !== 0);

/** Classic greedy: biggest debtor pays biggest creditor. At most n-1 transfers, but not always the minimum. */
export function greedySettle(b: Balances): Transfer[] {
  const cred = nonZero(b).filter(([, v]) => v > 0).map(([id, v]) => ({ id, v })).sort((x, y) => y.v - x.v);
  const debt = nonZero(b).filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v })).sort((x, y) => y.v - x.v);
  const out: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < cred.length && j < debt.length) {
    const amt = Math.min(cred[i].v, debt[j].v);
    out.push({ from: debt[j].id, to: cred[i].id, amount: amt });
    cred[i].v -= amt;
    debt[j].v -= amt;
    if (cred[i].v === 0) i++;
    if (debt[j].v === 0) j++;
  }
  return out;
}

const EXACT_LIMIT = 16;

/**
 * Minimum-transfer settlement. A set of k people whose balances sum to zero can always be settled with k-1 transfers,
 * so minimising transfers == splitting everyone into the MAXIMUM number of zero-sum groups. We find that partition
 * exactly with a bitmask DP (up to 16 non-zero balances), and fall back to greedy beyond that.
 */
export function simplifyDebts(balances: Balances): Transfer[] {
  const entries = nonZero(balances);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  if (total !== 0) throw new Error(`Balances must sum to zero (got ${total})`);
  const n = entries.length;
  if (n === 0) return [];
  if (n > EXACT_LIMIT) return greedySettle(balances);

  const size = 1 << n;
  const sums = new Array<number>(size).fill(0);
  for (let m = 1; m < size; m++) {
    const low = m & -m;
    sums[m] = sums[m ^ low] + entries[31 - Math.clz32(low)][1];
  }
  // dp[m] = max number of zero-sum groups that partition subset m (only meaningful if sums[m] === 0)
  const dp = new Array<number>(size).fill(-1);
  const pick = new Array<number>(size).fill(0);
  dp[0] = 0;
  for (let m = 1; m < size; m++) {
    if (sums[m] !== 0) continue;
    const low = m & -m;
    // choose the sub-group containing the lowest set bit
    for (let sub = m; sub > 0; sub = (sub - 1) & m) {
      if (!(sub & low) || sums[sub] !== 0) continue;
      const rest = m ^ sub;
      if (dp[rest] < 0) continue;
      if (dp[rest] + 1 > dp[m]) {
        dp[m] = dp[rest] + 1;
        pick[m] = sub;
      }
    }
  }
  const out: Transfer[] = [];
  let m = size - 1;
  while (m > 0) {
    const sub = pick[m];
    const group: Balances = {};
    for (let i = 0; i < n; i++) if (sub & (1 << i)) group[entries[i][0]] = entries[i][1];
    out.push(...greedySettle(group));
    m ^= sub;
  }
  return out;
}

/** Who owes whom pairwise WITHOUT simplification (used when a group has simplify turned off, and for friend balances). */
export function pairwiseDebts(expenses: ExpenseLike[], settlements: SettlementLike[], groupCurrency = 'INR'): Transfer[] {
  const net = new Map<string, number>(); // key "a|b" (a<b): + means a owes b
  const owe = (debtor: string, creditor: string, amt: number) => {
    if (debtor === creditor || amt === 0) return;
    const [a, b] = debtor < creditor ? [debtor, creditor] : [creditor, debtor];
    const k = `${a}|${b}`;
    net.set(k, (net.get(k) ?? 0) + (debtor === a ? amt : -amt));
  };
  for (const e of expenses) {
    const { payers, shares } = toGroupCurrency(e, groupCurrency);
    const ids = [...new Set([...Object.keys(payers), ...Object.keys(shares)])];
    const surplus = ids.map((id) => ({ id, v: (payers[id] ?? 0) - (shares[id] ?? 0) }));
    const creditors = surplus.filter((s) => s.v > 0);
    const debtors = surplus.filter((s) => s.v < 0);
    const credTotal = creditors.reduce((a, c) => a + c.v, 0);
    for (const d of debtors) {
      const parts = allocate(-d.v, creditors.map((c) => c.v / Math.max(1, credTotal)));
      creditors.forEach((c, i) => owe(d.id, c.id, parts[i]));
    }
  }
  for (const s of settlements) owe(s.to, s.from, s.amount); // payer reduces what they owe the receiver
  const out: Transfer[] = [];
  for (const [k, v] of net) {
    if (v === 0) continue;
    const [a, b] = k.split('|');
    out.push(v > 0 ? { from: a, to: b, amount: v } : { from: b, to: a, amount: -v });
  }
  return out;
}

/** Apply transfers to balances, for verification: result should be all zeros. */
export function applyTransfers(b: Balances, transfers: Transfer[]): Balances {
  const r = { ...b };
  for (const t of transfers) {
    r[t.from] = (r[t.from] ?? 0) + t.amount;
    r[t.to] = (r[t.to] ?? 0) - t.amount;
  }
  return r;
}
