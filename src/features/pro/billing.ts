import { requireOptionalNativeModule } from 'expo-modules-core';
import type { ProductId } from './entitlement';

/**
 * The bridge to Google Play Billing. The billing library is a native module, so it exists only in installed builds
 * from Google Play; in Expo Go and the browser preview it is absent and every call says so plainly.
 */
const native = requireOptionalNativeModule<Record<string, unknown>>('ExpoIap');
export const billingAvailable = () => !!native;

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'pending' | 'unavailable' | 'error';

export async function purchasePro(_product: ProductId): Promise<PurchaseOutcome> {
  if (!native) return 'unavailable';
  return 'error'; // completed when expo-iap is added with the confirmed package id (section 24.5a)
}

export async function restorePurchases(): Promise<'restored' | 'none' | 'unavailable'> {
  if (!native) return 'unavailable';
  return 'none';
}
