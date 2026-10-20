import { claimRows, claimHtml, claimCsv } from '../reimburse';
const at = (d: number) => new Date(2026, 9, d, 12).getTime();
const t = (id: string, amount: number, d: number, tags: string[] | null, extra = {}) => ({ id, type: 'expense' as const, amount, merchant: 'Cab', note: null, category_id: 'cat_transport', occurred_at: at(d), tags: tags ? JSON.stringify(tags) : null, receipt_uri: null, ...extra });
const name = () => 'Transport';

test('only #work expenses in the period, oldest first, claimed flag read from tags', () => {
  const rows = claimRows([t('a', 45000, 9, ['Work']), t('b', 12000, 2, ['work', 'claimed']), t('c', 99999, 3, ['trip']), t('d', 1000, 31, ['work'], { occurred_at: new Date(2026, 10, 1).getTime() }), t('e', 1, 4, null)], at(1) - 86400000, new Date(2026, 10, 1).getTime(), name);
  expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
  expect(rows[0].claimed).toBe(true);
});

test('report escapes text, totals correctly and embeds only provided receipts', () => {
  const rows = claimRows([t('a', 45050, 9, ['work'], { merchant: '<script>alert(1)</script>', receipt_uri: 'file:///r.jpg' }), t('b', 12000, 2, ['work'], { receipt_uri: 'file:///missing.jpg' })], 0, Date.now() * 2, name);
  const html = claimHtml(rows, { name: 'Asha & Co', period: 'October 2026', images: { 'file:///r.jpg': 'data:image/jpeg;base64,AAAA' } });
  expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;script&gt;');
  expect(html).toContain('Asha &amp; Co');
  expect(html).toContain('₹570.50');
  expect(html.match(/<img /g)).toHaveLength(1);
});

test('CSV quotes text and ends with a total', () => {
  const csv = claimCsv(claimRows([t('a', 45050, 9, ['work'], { merchant: 'Cab "Go"', note: 'airport, late' })], 0, Date.now() * 2, name));
  expect(csv.split('\n')).toHaveLength(3);
  expect(csv).toContain('"Cab ""Go"""');
  expect(csv).toContain('"airport, late"');
  expect(csv.trim().endsWith(',,,Total,450.50')).toBe(true);
});
