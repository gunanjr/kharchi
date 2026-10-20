import { generateKeyPairSync, createSign } from 'crypto';
import { parsePublicKey, verifySha1Rsa, b64ToBytes } from '../rsa';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pubB64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const sign = (data: string, key = privateKey) => { const s = createSign('RSA-SHA1'); s.update(data, 'utf8'); return s.sign(key).toString('base64'); };
const json = JSON.stringify({ orderId: 'GPA.1', packageName: 'com.bruhme.app', productId: 'bruhme_pro_yearly', purchaseToken: 'tok', purchaseState: 0 });

describe('Play purchase signature', () => {
  const key = parsePublicKey(pubB64);
  it('parses a Play-style public key', () => {
    expect(key.bytes).toBe(256);
    expect(key.e).toBe(BigInt(65537));
  });
  it('accepts a genuine signature', () => {
    expect(verifySha1Rsa(json, sign(json), key)).toBe(true);
  });
  it('rejects edited JSON, other keys, junk and empty input', () => {
    const sig = sign(json);
    expect(verifySha1Rsa(json.replace('yearly', 'lifetime'), sig, key)).toBe(false);
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    expect(verifySha1Rsa(json, sign(json, other), key)).toBe(false);
    expect(verifySha1Rsa(json, 'abc', key)).toBe(false);
    expect(verifySha1Rsa(json, '', key)).toBe(false);
    expect(verifySha1Rsa(json, sig, null)).toBe(false);
    const flipped = b64ToBytes(sig); flipped[10] ^= 1;
    expect(verifySha1Rsa(json, Buffer.from(flipped).toString('base64'), key)).toBe(false);
  });
  it('refuses a malformed key', () => {
    expect(() => parsePublicKey('bm90IGEga2V5')).toThrow();
  });
});
