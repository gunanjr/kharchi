import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as IAP from 'expo-iap';
import { billingAvailable, refreshEntitlement } from './billing';

/** Checks Pro with Google Play when the app opens, comes back to the foreground, or a purchase finishes. */
export function useBilling() {
  useEffect(() => {
    if (!billingAvailable()) return;
    refreshEntitlement();
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') refreshEntitlement(); });
    const sub = IAP.purchaseUpdatedListener(() => { refreshEntitlement(); });
    return () => { app.remove(); sub.remove(); };
  }, []);
}
