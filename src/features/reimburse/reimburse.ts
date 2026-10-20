import type { Transaction } from '@/domain/types';
import { readTags } from '@/features/tracker/tags';

/**
 * Work reimbursements (Pro): expenses tagged #work in a period, ready to claim, as a printable report and a CSV.
 * Pure and tested; the screen turns the HTML into a PDF on the phone.
 */
type Tx = Pick<Transaction, 'id' | 'type' | 'amount' | 'merchant' | 'note' | 'category_id' | 'occurred_at' | 'tags' | 'receipt_uri'> & { excluded?: number | null };

export const WORK_TAG = 'work';
export const CLAIMED_TAG = 'claimed';

export interface ClaimRow { id: string; date: number; merchant: string; category: string; note: string; amount: number; receipt: string | null; claimed: boolean }

export function claimRows(txs: Tx[], from: number, to: number, catName: (id: string | null) => string): ClaimRow[] {
  return txs
    .filter((t) => t.type === 'expense' && t.occurred_at >= from && t.occurred_at < to && readTags(t.tags).map((g) => g.toLowerCase()).includes(WORK_TAG))
    .sort((a, b) => a.occurred_at - b.occurred_at)
    .map((t) => ({ id: t.id, date: t.occurred_at, merchant: (t.merchant ?? '').trim() || 'Expense', category: catName(t.category_id), note: (t.note ?? '').trim(), amount: t.amount, receipt: t.receipt_uri ?? null, claimed: readTags(t.tags).map((g) => g.toLowerCase()).includes(CLAIMED_TAG) }));
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (t: number) => new Date(t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

/** A clean, printable claim. `images` maps receipt uri to a data URI (already read from the phone). */
export function claimHtml(rows: ClaimRow[], opts: { name?: string; period: string; images?: Record<string, string> }): string {
  const total = rows.reduce((a, r) => a + r.amount, 0);
  const withReceipts = rows.filter((r) => r.receipt && opts.images?.[r.receipt]);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,Roboto,Helvetica,Arial,sans-serif;color:#212934;padding:28px;font-size:12px}
h1{font-size:20px;margin:0 0 4px}p{margin:0 0 16px;color:#5B6573}table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #E7E3DE}th{font-size:11px;color:#5B6573;text-transform:uppercase}
td.r,th.r{text-align:right}tfoot td{font-weight:700;border-top:2px solid #212934}.rc{page-break-inside:avoid;margin-top:18px}
.rc img{max-width:100%;max-height:520px;border:1px solid #E7E3DE;border-radius:6px}.foot{margin-top:24px;color:#8A93A0;font-size:10px}
</style></head><body>
<h1>Expense claim${opts.name ? ` · ${esc(opts.name)}` : ''}</h1>
<p>${esc(opts.period)} · ${rows.length} ${rows.length === 1 ? 'item' : 'items'} · total ${money(total)}</p>
<table><thead><tr><th>Date</th><th>Merchant</th><th>Category</th><th>Note</th><th class="r">Amount</th></tr></thead><tbody>
${rows.map((r) => `<tr><td>${day(r.date)}</td><td>${esc(r.merchant)}</td><td>${esc(r.category)}</td><td>${esc(r.note)}</td><td class="r">${money(r.amount)}</td></tr>`).join('\n')}
</tbody><tfoot><tr><td colspan="4">Total</td><td class="r">${money(total)}</td></tr></tfoot></table>
${withReceipts.map((r) => `<div class="rc"><p>${day(r.date)} · ${esc(r.merchant)} · ${money(r.amount)}</p><img src="${opts.images![r.receipt!]}"/></div>`).join('\n')}
<p class="foot">Prepared with BruhMe from the claimant's own records.</p>
</body></html>`;
}

/** The same rows as a CSV that opens in Excel or Google Sheets. */
export function claimCsv(rows: ClaimRow[]): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [new Date(r.date).toISOString().slice(0, 10), q(r.merchant), q(r.category), q(r.note), (r.amount / 100).toFixed(2)].join(','));
  const total = rows.reduce((a, r) => a + r.amount, 0);
  return ['Date,Merchant,Category,Note,Amount (INR)', ...lines, `,,,Total,${(total / 100).toFixed(2)}`].join('\n');
}
