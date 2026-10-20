import { nudgeMessage, suggestTone, upiLink, isUpiId, TONES, linesIn } from '../nudge';

const base = { amount: 50000, name: 'Asha Rao', items: ['Dinner', 'Cab', 'Hotel'], daysOwed: 12 };

test('every tone and variant names the person, the amount and what it was for', () => {
  for (const t of TONES) for (let v = 0; v < linesIn(t.key); v++) {
    const m = nudgeMessage(base, t.key, v);
    expect(m).toContain('Asha');
    expect(m).toContain('₹500');
    expect(m).toMatch(/Dinner \+ Cab/);
    expect(m).not.toContain('Hotel'); // only the two biggest items
    expect(m).not.toMatch(/undefined|null|NaN|\{|\}|\s,|  /);
  }
});
test('age appears only when it is meaningful', () => {
  expect(nudgeMessage({ amount: 100, daysOwed: 12 }, 'firm', 0)).toContain('12 days');
  expect(nudgeMessage({ amount: 100, daysOwed: 1 }, 'firm', 0)).not.toContain('days');
  expect(nudgeMessage({ amount: 100 }, 'firm', 0)).not.toContain('after');
});
test('tone suggestion escalates with age', () => {
  expect([0, 5, 15, 40].map(suggestTone)).toEqual(['polite', 'playful', 'firm', 'savage']);
  expect(suggestTone(null)).toBe('polite');
});
test('UPI link is built only from a valid id and is URL-encoded', () => {
  expect(isUpiId('asha@okaxis')).toBe(true);
  expect(isUpiId('bad id@x')).toBe(false);
  expect(isUpiId('nope')).toBe(false);
  const l = upiLink({ upiId: 'asha@okaxis', payeeName: 'Asha R&B', amount: 123456, note: 'Dinner + Cab' })!;
  expect(l.startsWith('upi://pay?pa=asha%40okaxis')).toBe(true);
  expect(l).toContain('am=1234.56');
  expect(l).toContain('pn=Asha%20R%26B');
  expect(upiLink({ upiId: 'x', amount: 100 })).toBeNull();
});
test('message carries the pay link only when a UPI id is saved', () => {
  expect(nudgeMessage({ amount: 100 }, 'polite')).not.toContain('upi://');
  expect(nudgeMessage({ amount: 100, upiId: 'me@ybl' }, 'polite')).toContain('Tap to pay: upi://pay?pa=me%40ybl');
});
test('hostile input stays inert text; negative amounts and wrapping variants are safe', () => {
  const m = nudgeMessage({ amount: -100, name: "'; DROP TABLE x;--", reason: '   ' }, 'playful', -3);
  expect(m).toContain('₹1');
  expect(nudgeMessage({ amount: 100, name: '   ', reason: '   ' }, 'savage', 7)).not.toMatch(/undefined|null/);
});

test('every tone has several lines and the picker wraps both ways', () => {
  for (const t of TONES) expect(linesIn(t.key)).toBeGreaterThanOrEqual(3);
  expect(TONES.length).toBeGreaterThanOrEqual(8);
  const n = linesIn('desi');
  expect(nudgeMessage({ amount: 100 }, 'desi', n)).toBe(nudgeMessage({ amount: 100 }, 'desi', 0));
  expect(nudgeMessage({ amount: 100 }, 'desi', -1)).toBe(nudgeMessage({ amount: 100 }, 'desi', n - 1));
});
test('lines read cleanly with no name and no reason', () => {
  for (const t of TONES) for (let v = 0; v < linesIn(t.key); v++) {
    const m = nudgeMessage({ amount: 25000 }, t.key, v);
    expect(m).toContain('₹250');
    expect(m).not.toMatch(/undefined|null|  |\s,|\s\.|^[a-z]/);
  }
});
