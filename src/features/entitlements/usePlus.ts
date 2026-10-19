import { useMemo } from 'react';
import { useSettings } from '@/store/settings';
import { entitlementsFor, type Entitlements } from './index';

/** Reactive entitlements for screens: re-renders when Plus is switched on or off. */
export function usePlus(): Entitlements & { isPlus: boolean } {
  const plus = useSettings((s) => s.plusPreview);
  return useMemo(() => {
    const e = entitlementsFor(plus);
    return { tier: e.tier, has: (f) => e.has(f), isPlus: plus };
  }, [plus]);
}
