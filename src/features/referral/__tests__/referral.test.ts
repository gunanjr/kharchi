import { randomBytes } from 'crypto';
import { newFriendCode, parseFriendCode } from '../referral';
const rnd = (n: number) => new Uint8Array(randomBytes(n));
test('codes round-trip, forgive case and dashes, catch typos and own code', () => {
  for (let i = 0; i < 50; i++) {
    const c = newFriendCode(rnd);
    expect(c).toMatch(/^BRUH-[2-9A-HJKMNP-TV-Z]{4}$/);
    expect(parseFriendCode(c.toLowerCase().replace('-', ' '))).toEqual({ ok: true, code: c });
    expect(parseFriendCode(c, c)).toMatchObject({ ok: false });
  }
  expect(parseFriendCode('BRUH-ABC')).toMatchObject({ ok: false });
  expect(parseFriendCode('')).toMatchObject({ ok: false });
  // A one-character check letter catches most typos (about 29 in 30); measure it over every single-character change.
  const c = newFriendCode(rnd);
  const ALPHA = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  let caught = 0, total = 0;
  for (let pos = 5; pos < 8; pos++) for (const ch of ALPHA) { if (ch === c[pos]) continue; total++; if (!parseFriendCode(c.slice(0, pos) + ch + c.slice(pos + 1)).ok) caught++; }
  expect(caught / total).toBeGreaterThan(0.9);
});
