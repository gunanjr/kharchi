/**
 * Friend codes (section 22.2c of BRUHME.md): set once, nothing to manage. Each install has one code like BRUH-7Q4K.
 * A newcomer who enters a valid code sees the Friend offer in Google Play (30% off the first year). The code is checked
 * on the phone by its format and check letter, so sharing it widely only spreads a discount. Sharers get cosmetic
 * thank-yous (an OG badge and sticker pack), nothing that needs proof.
 */
const ALPHA = '23456789ABCDEFGHJKMNPQRSTVWXYZ'; // no 0, 1, I, L, O, U: easy to read and type
const check = (body: string) => ALPHA[[...body].reduce((a, c, i) => (a + (ALPHA.indexOf(c) + 1) * (i + 3)) % ALPHA.length, 7)];

export function newFriendCode(randomBytes: (n: number) => Uint8Array): string {
  const r = randomBytes(3);
  const body = [r[0] % 30, r[1] % 30, r[2] % 30].map((i) => ALPHA[i]).join('');
  return `BRUH-${body}${check(body)}`;
}

/** Normalise and check a typed code. Returns the clean code or an explanation. */
export function parseFriendCode(input: string, own?: string | null): { ok: true; code: string } | { ok: false; why: string } {
  const clean = (input ?? '').toUpperCase().replace(/[\s-]/g, '').replace(/^BRUH/, '').replace(/O/g, '0');
  if (clean.length !== 4) return { ok: false, why: 'A friend code looks like BRUH-7Q4K.' };
  if ([...clean].some((c) => !ALPHA.includes(c))) return { ok: false, why: 'That code has a character codes never use. Check it again.' };
  if (check(clean.slice(0, 3)) !== clean[3]) return { ok: false, why: 'That code has a typo. Check it again.' };
  const code = `BRUH-${clean}`;
  if (own && code === own) return { ok: false, why: 'That is your own code. Share it with a friend instead.' };
  return { ok: true, code };
}

export const OG_STICKERS = ['👑', '🦁', '🧃'];
