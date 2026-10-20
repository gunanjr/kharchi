import { randomBytes } from 'crypto';
import { newRecoveryCode, parseRecoveryCode, sealVault, openVault, isVaultText, VaultError } from '../crypto';

const rnd = (n: number) => new Uint8Array(randomBytes(n));
const backup = JSON.stringify({ app: 'bruhme', version: 1, tables: { transactions: [{ id: 'a', amount: 45000 }] } });

describe('recovery code', () => {
  test('looks right and parses back', () => {
    const code = newRecoveryCode(rnd);
    expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){6}[0-9A-HJKMNP-TV-Z]{3}$/);
    expect(parseRecoveryCode(code)).toHaveLength(16);
  });
  test('forgiving input: case, spaces, missing dashes, O for 0, I or L for 1', () => {
    const code = newRecoveryCode(rnd);
    const messy = ` ${code.toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o').replace(/1/g, 'l')} `;
    expect(Array.from(parseRecoveryCode(messy))).toEqual(Array.from(parseRecoveryCode(code)));
  });
  test('typos and wrong lengths are caught with a clear message', () => {
    const code = newRecoveryCode(rnd).replace(/-/g, '');
    const swapped = code.slice(0, 5) + (code[5] === 'A' ? 'B' : 'A') + code.slice(6);
    expect(() => parseRecoveryCode(swapped)).toThrow(/typo|does not open/);
    expect(() => parseRecoveryCode('ABC')).toThrow(/27 characters/);
    expect(() => parseRecoveryCode('')).toThrow(VaultError);
  });
});

describe('vault file', () => {
  test('round trip on a new phone with only the code', () => {
    const code = newRecoveryCode(rnd);
    const file = sealVault(backup, code, rnd, 123);
    expect(isVaultText(file)).toBe(true);
    expect(file).not.toContain('45000'); // nothing readable inside
    expect(openVault(file, code)).toEqual({ plain: backup, createdAt: 123 });
  });
  test('wrong code, edited file, cut-short file and non-vault files are refused', () => {
    const code = newRecoveryCode(rnd);
    const file = sealVault(backup, code, rnd);
    expect(() => openVault(file, newRecoveryCode(rnd))).toThrow(/does not open/);
    const j = JSON.parse(file);
    const flipped = JSON.stringify({ ...j, data: (j.data[0] === 'A' ? 'B' : 'A') + j.data.slice(1) });
    expect(() => openVault(flipped, code)).toThrow(/does not open|damaged/);
    expect(() => openVault(file.slice(0, file.length / 2), code)).toThrow(/cut short/);
    expect(() => openVault(backup, code)).toThrow(/not a BruhMe Vault/);
    expect(() => openVault(JSON.stringify({ ...j, v: 9 }), code)).toThrow(/newer BruhMe/);
    expect(() => openVault(JSON.stringify({ ...j, nonce: 'AAAA' }), code)).toThrow(/damaged/);
    expect(isVaultText('hello')).toBe(false);
  });
  test('the same backup sealed twice gives different files (fresh salt and nonce)', () => {
    const code = newRecoveryCode(rnd);
    expect(sealVault(backup, code, rnd)).not.toEqual(sealVault(backup, code, rnd));
  });
});

test('unicode notes (₹, emoji, Devanagari) survive the round trip', () => {
  const code = newRecoveryCode(rnd);
  const text = JSON.stringify({ note: 'Chai ☕ ₹40 · दोस्त · 𝓫𝓻𝓾𝓱 🫠' });
  expect(openVault(sealVault(text, code, rnd), code).plain).toBe(text);
});
