import { parseSms, looksLikeFinancialSender, extractTimestamp, bankFromSender } from '../sms';
import { SAMPLES } from '../samples';

const RECEIVED = new Date(2026, 9, 18, 15, 0).getTime();

test('has 60+ samples', () => expect(SAMPLES.length).toBeGreaterThanOrEqual(60));

describe.each(SAMPLES.map((s) => [s.name, s] as const))('%s', (_n, s) => {
  const r = parseSms(s.body, { sender: s.sender, receivedAt: RECEIVED });
  if ('reject' in s.expect) {
    it(`rejects as ${s.expect.reject}`, () => {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe((s.expect as any).reject);
    });
  } else {
    const e = s.expect;
    it('parses', () => {
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.tx.amount).toBe(e.amount);
      expect(r.tx.direction).toBe(e.direction);
      expect(r.tx.currency).toBe(e.currency ?? 'INR');
      if (e.last4 !== undefined) expect(r.tx.accountLast4).toBe(e.last4);
      if (e.ref !== undefined) expect(r.tx.upiRef).toBe(e.ref);
      if (e.balance !== undefined) expect(r.tx.balance).toBe(e.balance);
      if (e.instrument !== undefined) expect(r.tx.instrument).toBe(e.instrument);
      if (e.merchant !== undefined) {
        if (e.merchant === null) expect(r.tx.merchant).toBeNull();
        else if (e.merchant instanceof RegExp) expect(r.tx.merchant).toMatch(e.merchant);
        else expect(r.tx.merchant).toBe(e.merchant);
      }
    });
  }
});

test('timestamp parsing', () => {
  const d = (s: string) => new Date(extractTimestamp(s, 0));
  expect(d('on 18-10-26').getDate()).toBe(18);
  expect(d('on 18/10/2026 at 14:05').getHours()).toBe(14);
  expect(d('on 18Oct26').getMonth()).toBe(9);
  expect(d('18-Oct-2026 11:30 pm').getHours()).toBe(23);
  expect(d('2026-10-18').getFullYear()).toBe(2026);
  expect(extractTimestamp('no date here', 12345)).toBe(12345);
});

test('sender heuristics', () => {
  expect(looksLikeFinancialSender('AX-HDFCBK')).toBe(true);
  expect(looksLikeFinancialSender('VM-SBIINB-S')).toBe(true);
  expect(looksLikeFinancialSender('+919876543210')).toBe(false);
  expect(looksLikeFinancialSender('Mom')).toBe(false);
  expect(bankFromSender('VM-KOTAKB')).toBe('Kotak');
});
