import { requireOptionalNativeModule } from 'expo-modules-core';
import * as SecureStore from 'expo-secure-store';
import * as IAP from 'expo-iap';
import Constants from 'expo-constants';
import { appConfig } from '@/config/app';
import { parsePublicKey, verifySha1Rsa, type RsaKey } from './rsa';
import { PRODUCTS, resolveEntitlement, type EntitlementCache, type PlayPurchase, type ProductId } from './entitlement';
import { useProStore } from './store';

/**
 * Google Play Billing (expo-iap). Present only in installed builds from Google Play; absent in Expo Go and the browser
 * preview, where every call says so plainly. Play Console must have:
 * - subscriptions `bruhme_pro_monthly` (₹129) and `bruhme_pro_yearly` (₹999) with a base plan each; on the yearly base
 *   plan an offer tagged `trial` (7 days free) and a developer-determined offer tagged `friend` (30% off the first year);
 * - a one-time product `bruhme_pro_lifetime` (₹2,999).
 */
const available = () => !!requireOptionalNativeModule('ExpoIap');
export const billingAvailable = available;

const CACHE_KEY = 'bruhme_pro_cache';
let connected = false;

async function connect(): Promise<boolean> {
  if (!available()) return false;
  if (!connected) { await IAP.initConnection(); connected = true; }
  return true;
}

type AnyPurchase = { productId: string; purchaseToken?: string | null; purchaseState: string; isAcknowledgedAndroid?: boolean | null; transactionDate: number; dataAndroid?: string | null; signatureAndroid?: string | null; packageNameAndroid?: string | null };

/** Play's purchase in the shape the entitlement rules check. */
function toPlay(p: AnyPurchase): PlayPurchase {
  return {
    productId: p.productId,
    packageName: p.packageNameAndroid ?? appConfig.androidPackage,
    purchaseToken: p.purchaseToken ?? '',
    purchaseState: p.purchaseState === 'purchased' ? 1 : 0,
    acknowledged: !!p.isAcknowledgedAndroid,
    purchaseTime: p.transactionDate,
    originalJson: p.dataAndroid ?? '',
    signature: p.signatureAndroid ?? '',
  };
}

/**
 * Purchases come from the Play billing service on the phone. Each one is RSA-verified against the app's Play licence key
 * (rsa.ts) and its signed JSON must match what we act on (entitlement.ts), so edited or replayed purchase data is refused.
 */
let parsed: RsaKey | null | undefined;
function licenceKey(): RsaKey | null {
  if (parsed !== undefined) return parsed;
  const b64 = (Constants.expoConfig?.extra as { playLicenseKey?: string } | undefined)?.playLicenseKey ?? '';
  try { parsed = b64 ? parsePublicKey(b64) : null; } catch { parsed = null; }
  return parsed;
}
// Every purchase must carry Google's RSA signature for our licence key. Store builds cannot be built without the key
// (app.config.ts); only a development build without a key falls back to a presence check, so testers can try billing.
const deps = {
  packageName: appConfig.androidPackage,
  verifySignature: (json: string, sig: string) => { const k = licenceKey(); return k ? verifySha1Rsa(json, sig, k) : __DEV__ && json.length > 0 && sig.length > 0; },
};

async function readCache(): Promise<EntitlementCache | null> {
  try { const t = await SecureStore.getItemAsync(CACHE_KEY); return t ? (JSON.parse(t) as EntitlementCache) : null; } catch { return null; }
}
async function writeCache(c: EntitlementCache | null) {
  try { if (c) await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(c)); else await SecureStore.deleteItemAsync(CACHE_KEY); } catch { /* keystore unavailable: next launch asks Play again */ }
}

/** Ask Play what this Google account owns, acknowledge new purchases, and update Pro. Offline: a short grace period. */
export async function refreshEntitlement(): Promise<boolean> {
  const cache = await readCache();
  let raw: AnyPurchase[] | null = null;
  try {
    if (await connect()) raw = (await IAP.getAvailablePurchases()) as unknown as AnyPurchase[];
  } catch { raw = null; }
  if (!available() && !cache) return false;
  const e = resolveEntitlement({ purchases: raw ? raw.map(toPlay) : null, cache, now: Date.now(), deps });
  for (const token of e.toAcknowledge) {
    const p = raw?.find((x) => x.purchaseToken === token);
    if (p) { try { await IAP.finishTransaction({ purchase: p as never, isConsumable: false }); } catch { /* retried on the next launch; Play allows 3 days */ } }
  }
  await writeCache(e.cache);
  useProStore.getState().setEntitlement({ pro: e.pro, productId: e.productId, source: e.source });
  return e.pro;
}

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'pending' | 'unavailable' | 'error';

type Offer = { offerTokenAndroid?: string | null; offerTagsAndroid?: string[] | null; id?: string | null };

/** Buy a plan. The Friend offer (30% off the first year) is used when a valid friend code was entered. */
export async function purchasePro(product: ProductId, opts: { friendCode?: string } = {}): Promise<PurchaseOutcome> {
  try {
    if (!(await connect())) return 'unavailable';
    if (product === PRODUCTS.lifetime) {
      await IAP.requestPurchase({ type: 'in-app', request: { google: { skus: [product] } } });
    } else {
      const products = (await IAP.fetchProducts({ skus: [product], type: 'subs' })) as unknown as { id: string; subscriptionOffers?: Offer[] | null }[];
      const offers = products?.find((p) => p.id === product)?.subscriptionOffers ?? [];
      const tagged = (tag: string) => offers.find((o) => (o.offerTagsAndroid ?? []).includes(tag) && o.offerTokenAndroid);
      const pick = (product === PRODUCTS.yearly && opts.friendCode ? tagged('friend') : undefined) ?? (product === PRODUCTS.yearly ? tagged('trial') : undefined) ?? offers.find((o) => o.offerTokenAndroid);
      if (!pick?.offerTokenAndroid) return 'error';
      await IAP.requestPurchase({ type: 'subs', request: { google: { skus: [product], subscriptionOffers: [{ sku: product, offerToken: pick.offerTokenAndroid }] } } });
    }
    const pro = await refreshEntitlement();
    if (pro) return 'purchased';
    const owned = ((await IAP.getAvailablePurchases().catch(() => [])) as unknown as AnyPurchase[]).find((p) => p.productId === product);
    return owned?.purchaseState === 'pending' ? 'pending' : 'error';
  } catch (e) {
    return IAP.isUserCancelledError?.(e as never) ? 'cancelled' : 'error';
  }
}

export async function restorePurchases(): Promise<'restored' | 'none' | 'unavailable'> {
  if (!available()) return 'unavailable';
  return (await refreshEntitlement()) ? 'restored' : 'none';
}

/** Opens Google Play's subscription page so cancelling is always one tap away. */
export async function manageSubscription() {
  try { if (await connect()) await IAP.deepLinkToSubscriptions({ skuAndroid: undefined } as never); } catch { /* Play not available */ }
}
