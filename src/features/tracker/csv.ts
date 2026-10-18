import type { Category, Transaction } from '@/domain/types';
import { formatMoney, parseAmountToMinor } from '@/domain/money';

const HEADER = ['date', 'type', 'amount', 'currency', 'category', 'merchant', 'note', 'account', 'payment_method', 'tags'];

const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function toCsv(txs: Transaction[], cats: Category[], accountNames: Record<string, string> = {}): string {
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const rows = txs.map((t) =>
    [
      new Date(t.occurred_at).toISOString(),
      t.type,
      formatMoney(t.amount, t.currency, { showSymbol: false }).replace(/,/g, ''),
      t.currency,
      (t.category_id && catName.get(t.category_id)) || '',
      t.merchant ?? '',
      t.note ?? '',
      (t.account_id && accountNames[t.account_id]) || '',
      t.payment_method ?? '',
      t.tags ? (JSON.parse(t.tags) as string[]).join('|') : '',
    ].map(esc).join(','),
  );
  return [HEADER.join(','), ...rows].join('\n');
}

/** RFC-4180-ish parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') (cur += '"', i++);
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') (row.push(cur), (cur = ''));
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur);
      cur = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

export interface ImportedTx {
  type: 'expense' | 'income';
  amount: number;
  currency: string;
  occurred_at: number;
  categoryName: string;
  merchant: string | null;
  note: string | null;
}

function parseDate(s: string): number | null {
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = Date.parse(t.length > 10 ? t : `${t}T12:00:00`);
    return Number.isNaN(d) ? null : d;
  }
  m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    const yr = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return new Date(yr, Number(m[2]) - 1, Number(m[1]), 12).getTime();
  }
  return null;
}

/** Imports our own export format and generic bank-statement CSVs (date, description, debit, credit / amount). */
export function importCsv(text: string): { rows: ImportedTx[]; skipped: number } {
  const all = parseCsv(text);
  if (all.length < 2) return { rows: [], skipped: 0 };
  const head = all[0].map((h) => h.trim().toLowerCase());
  const idx = (...names: string[]) => head.findIndex((h) => names.some((n) => h.includes(n)));
  const iDate = idx('date');
  const iType = head.indexOf('type');
  const iAmt = head.findIndex((h) => h === 'amount');
  const iDebit = idx('debit', 'withdraw');
  const iCredit = idx('credit', 'deposit');
  const iCur = idx('currency');
  const iCat = idx('category');
  const iMer = idx('merchant', 'description', 'narration', 'particulars');
  const iNote = idx('note', 'remark');
  const rows: ImportedTx[] = [];
  let skipped = 0;
  for (const r of all.slice(1)) {
    const when = iDate >= 0 ? parseDate(r[iDate] ?? '') : null;
    let type: 'expense' | 'income' | null = null;
    let amount: number | null = null;
    if (iDebit >= 0 || iCredit >= 0) {
      const d = iDebit >= 0 ? parseAmountToMinor(r[iDebit] ?? '') : null;
      const c = iCredit >= 0 ? parseAmountToMinor(r[iCredit] ?? '') : null;
      if (d) (type = 'expense', (amount = d));
      else if (c) (type = 'income', (amount = c));
    } else if (iAmt >= 0) {
      const raw = r[iAmt] ?? '';
      amount = parseAmountToMinor(raw.replace('-', ''));
      const t = iType >= 0 ? (r[iType] ?? '').toLowerCase() : '';
      type = t === 'income' ? 'income' : t === 'expense' ? 'expense' : raw.trim().startsWith('-') ? 'expense' : 'income';
      if (iType < 0 && !raw.trim().startsWith('-')) type = 'expense'; // unsigned amounts default to spending
    }
    if (!when || !type || !amount || amount <= 0) {
      skipped++;
      continue;
    }
    rows.push({
      type,
      amount,
      currency: (iCur >= 0 && r[iCur]) || 'INR',
      occurred_at: when,
      categoryName: iCat >= 0 ? (r[iCat] ?? '') : '',
      merchant: iMer >= 0 ? r[iMer] || null : null,
      note: iNote >= 0 ? r[iNote] || null : null,
    });
  }
  return { rows, skipped };
}
