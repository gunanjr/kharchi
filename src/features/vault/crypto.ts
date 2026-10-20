import { gcm } from '@noble/ciphers/aes.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

/**
 * BruhMe Vault encryption (section 22.1a of BRUHME.md).
 *
 * No passphrase to remember: the user keeps a **recovery code** (128 random bits shown as 26 easy characters plus one
 * check character). The file key is derived from the code with HKDF-SHA256 and a random salt, and the backup is sealed
 * with AES-256-GCM, which also proves on opening that the file is complete and unchanged.
 */

export class VaultError extends Error {}

/* Small self-contained UTF-8 and base64 helpers, so Vault never depends on which text APIs a phone's JS engine has. */
function utf8(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) { const d = text.charCodeAt(i + 1); if (d >= 0xdc00 && d <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; } }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return new Uint8Array(out);
}
function fromUtf8(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; ) {
    const c = b[i++];
    let cp: number;
    if (c < 0x80) cp = c;
    else if (c < 0xe0) cp = ((c & 31) << 6) | (b[i++] & 63);
    else if (c < 0xf0) cp = ((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    else cp = ((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
    if (cp >= 0x10000) { cp -= 0x10000; s += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 1023)); } else s += String.fromCharCode(cp);
  }
  return s;
}
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64(u: Uint8Array): string {
  let s = '';
  for (let i = 0; i < u.length; i += 3) {
    const n = (u[i] << 16) | ((u[i + 1] ?? 0) << 8) | (u[i + 2] ?? 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < u.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < u.length ? B64[n & 63] : '=');
  }
  return s;
}
function unb64(t: string): Uint8Array {
  const clean = t.replace(/=+$/, '');
  if (/[^A-Za-z0-9+/]/.test(clean)) throw new VaultError('bad base64');
  const out: number[] = [];
  let bits = 0, value = 0;
  for (const ch of clean) { value = (value << 6) | B64.indexOf(ch); bits += 6; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  return new Uint8Array(out);
}


// Crockford base32: no I, L, O or U, so the code is easy to read aloud and type.
const ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_BYTES = 16;
const INFO = utf8('bruhme-vault-v1');

function base32(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) { out += ALPHA[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHA[(value << (5 - bits)) & 31];
  return out;
}
function unbase32(text: string): Uint8Array {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of text) {
    const i = ALPHA.indexOf(ch);
    if (i < 0) throw new VaultError('That recovery code has a character that is not used in codes.');
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}
const check = (body: string) => ALPHA[sha256(utf8(body))[0] & 31];

/** A new recovery code like `7Q4K-M2XD-…` (27 characters in groups of 4 and 3). */
export function newRecoveryCode(randomBytes: (n: number) => Uint8Array): string {
  const r = randomBytes(CODE_BYTES);
  if (!(r instanceof Uint8Array) || r.length !== CODE_BYTES) throw new VaultError('Could not create a secure code on this phone.');
  const body = base32(r); // 26 characters
  return formatCode(body + check(body));
}
export const formatCode = (raw: string) => raw.match(/.{1,4}/g)!.join('-');

/** Turns whatever the user typed (any case, spaces, dashes, O for 0, I or L for 1) into the code bytes, or explains what is wrong. */
export function parseRecoveryCode(input: string): Uint8Array {
  const clean = (input ?? '').toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V');
  if (clean.length !== 27) throw new VaultError('A recovery code has 27 characters. Check it and try again.');
  const body = clean.slice(0, 26);
  if (check(body) !== clean[26]) throw new VaultError('That recovery code has a typo. Check each character and try again.');
  const bytes = unbase32(body);
  return bytes.slice(0, CODE_BYTES);
}


export interface VaultFile { app: 'bruhme-vault'; v: 1; createdAt: number; salt: string; nonce: string; data: string }

export const isVaultText = (text: string) => {
  try { const j = JSON.parse(text) as Partial<VaultFile>; return j?.app === 'bruhme-vault'; } catch { return false; }
};

/** Encrypt a backup's JSON text with the recovery code. */
export function sealVault(plain: string, code: string, randomBytes: (n: number) => Uint8Array, now = Date.now()): string {
  const salt = randomBytes(16);
  const realKey = hkdf(sha256, parseRecoveryCode(code), salt, INFO, 32);
  const nonce = randomBytes(12);
  const data = gcm(realKey, nonce).encrypt(utf8(plain));
  realKey.fill(0);
  const file: VaultFile = { app: 'bruhme-vault', v: 1, createdAt: now, salt: b64(salt), nonce: b64(nonce), data: b64(data) };
  return JSON.stringify(file);
}

/** Decrypt a Vault file. Throws a plain-language VaultError for a wrong code, a damaged file or a file that is not a Vault. */
export function openVault(text: string, code: string): { plain: string; createdAt: number } {
  let f: Partial<VaultFile>;
  try { f = JSON.parse(text); } catch { throw new VaultError('That file is not a BruhMe Vault backup, or it was cut short.'); }
  if (!f || f.app !== 'bruhme-vault') throw new VaultError('That file is not a BruhMe Vault backup.');
  if (f.v !== 1) throw new VaultError('That Vault backup was made by a newer BruhMe. Update the app, then try again.');
  if (typeof f.salt !== 'string' || typeof f.nonce !== 'string' || typeof f.data !== 'string') throw new VaultError('That Vault backup is damaged.');
  const codeBytes = parseRecoveryCode(code);
  let salt: Uint8Array, nonce: Uint8Array, data: Uint8Array;
  try { salt = unb64(f.salt); nonce = unb64(f.nonce); data = unb64(f.data); } catch { throw new VaultError('That Vault backup is damaged.'); }
  if (salt.length !== 16 || nonce.length !== 12 || data.length < 16) throw new VaultError('That Vault backup is damaged.');
  const key = hkdf(sha256, codeBytes, salt, INFO, 32);
  try {
    const plain = fromUtf8(gcm(key, nonce).decrypt(data));
    return { plain, createdAt: typeof f.createdAt === 'number' ? f.createdAt : 0 };
  } catch {
    throw new VaultError('That recovery code does not open this backup, or the file was changed. Check the code, or try another backup file.');
  } finally {
    key.fill(0);
  }
}
