import { checkPurchase, resolveEntitlement, GRACE_MS, PRODUCTS, type PlayPurchase, type VerifyDeps } from '../entitlement';

const PKG = 'com.bruhme.app';
const sign = (json: string) => `sig:${json.length}`; // stand-in for RSA: a signature only valid for that exact JSON
const deps: VerifyDeps = { packageName: PKG, verifySignature: (j, s) => s === sign(j) };
const make = (over: Partial<PlayPurchase> = {}, jsonOver: Record<string, unknown> = {}): PlayPurchase => {
  const base = { productId: PRODUCTS.yearly, packageName: PKG, purchaseToken: 'tok1', purchaseState: 1, acknowledged: true, purchaseTime: 1000, ...over };
  const originalJson = JSON.stringify({ productId: base.productId, packageName: base.packageName, purchaseToken: base.purchaseToken, purchaseState: 0, ...jsonOver });
  return { ...base, originalJson, signature: over.signature ?? sign(originalJson) };
};
const DAY = 86_400_000;

describe('checkPurchase', () => {
  test('a genuine purchase passes', () => expect(checkPurchase(make(), deps)).toBe('ok'));
  test('every kind of tampering or wrong purchase is refused', () => {
    expect(checkPurchase(make({ productId: 'cheap_coins' }), deps)).toBe('unknown-product');
    expect(checkPurchase(make({ packageName: 'com.cloned.app' }), deps)).toBe('wrong-package');
    expect(checkPurchase(make({ purchaseState: 2 }), deps)).toBe('not-purchased');
    expect(checkPurchase(make({ signature: 'forged' }), deps)).toBe('bad-signature');
    expect(checkPurchase(make({ purchaseToken: '' }), deps)).toBe('no-token');
    // a valid signature for a monthly purchase cannot be reused to claim lifetime
    const monthly = make({ productId: PRODUCTS.monthly });
    expect(checkPurchase({ ...monthly, productId: PRODUCTS.lifetime }, deps)).toBe('json-mismatch');
    expect(checkPurchase(make({}, { purchaseState: 1 }), deps)).toBe('not-purchased'); // refunded or pending inside the signed data
    expect(checkPurchase({ ...make(), originalJson: '{broken', signature: sign('{broken') }, deps)).toBe('json-mismatch');
  });
});

describe('resolveEntitlement', () => {
  test('online: Play is the truth, best plan wins, unacknowledged purchases are listed', () => {
    const e = resolveEntitlement({ purchases: [make({ productId: PRODUCTS.monthly, purchaseToken: 'm' }), make({ productId: PRODUCTS.lifetime, purchaseToken: 'L', acknowledged: false })], cache: null, now: 10 * DAY, deps });
    expect(e).toMatchObject({ pro: true, productId: PRODUCTS.lifetime, source: 'play', toAcknowledge: ['L'] });
    expect(e.cache?.verifiedAt).toBe(10 * DAY);
  });
  test('online with no valid purchase (refund, lapse, forgery) relocks and clears the cache', () => {
    const cache = { productId: PRODUCTS.yearly, purchaseToken: 't', verifiedAt: 9 * DAY, lastSeen: 9 * DAY };
    expect(resolveEntitlement({ purchases: [], cache, now: 10 * DAY, deps })).toMatchObject({ pro: false, source: 'none', cache: null });
    expect(resolveEntitlement({ purchases: [make({ signature: 'x' })], cache, now: 10 * DAY, deps }).pro).toBe(false);
  });
  test('offline: grace for 7 days after the last verification, then pause', () => {
    const cache = { productId: PRODUCTS.yearly, purchaseToken: 't', verifiedAt: 10 * DAY, lastSeen: 10 * DAY };
    expect(resolveEntitlement({ purchases: null, cache, now: 15 * DAY, deps })).toMatchObject({ pro: true, source: 'grace' });
    expect(resolveEntitlement({ purchases: null, cache, now: 10 * DAY + GRACE_MS + 1, deps }).pro).toBe(false);
  });
  test('winding the clock back does not extend grace', () => {
    const cache = { productId: PRODUCTS.yearly, purchaseToken: 't', verifiedAt: 10 * DAY, lastSeen: 30 * DAY };
    expect(resolveEntitlement({ purchases: null, cache, now: 11 * DAY, deps }).pro).toBe(false);
  });
  test('no cache, or a junk cache, means free', () => {
    expect(resolveEntitlement({ purchases: null, cache: null, now: DAY, deps }).pro).toBe(false);
    expect(resolveEntitlement({ purchases: null, cache: { productId: 'hacked' as never, purchaseToken: 'x', verifiedAt: DAY, lastSeen: DAY }, now: DAY, deps }).pro).toBe(false);
    expect(resolveEntitlement({ purchases: null, cache: { productId: PRODUCTS.lifetime, purchaseToken: 'x', verifiedAt: 0, lastSeen: 0 }, now: DAY, deps }).pro).toBe(false);
  });
  test('a cache from the future (edited) does not grant Pro', () => {
    const cache = { productId: PRODUCTS.lifetime, purchaseToken: 'x', verifiedAt: 50 * DAY, lastSeen: 0 };
    expect(resolveEntitlement({ purchases: null, cache, now: 10 * DAY, deps }).pro).toBe(false);
  });
});
