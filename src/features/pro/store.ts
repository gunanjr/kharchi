import { create } from 'zustand';
import type { Entitlement } from './entitlement';

/**
 * The app-wide Pro state. Set only by the billing layer from a verified Google Play purchase (entitlement.ts).
 * Development builds also have a Developer switch so the team can see every Pro screen in Expo Go; that switch does not
 * exist in store builds (`__DEV__` is false there), so it can never unlock Pro for customers.
 */
interface ProState {
  entitlement: Pick<Entitlement, 'pro' | 'productId' | 'source'>;
  devPro: boolean;
  setEntitlement: (e: Pick<Entitlement, 'pro' | 'productId' | 'source'>) => void;
  setDevPro: (on: boolean) => void;
}

export const useProStore = create<ProState>((set) => ({
  entitlement: { pro: false, productId: null, source: 'none' },
  devPro: __DEV__,
  setEntitlement: (entitlement) => set({ entitlement }),
  setDevPro: (devPro) => set({ devPro: __DEV__ ? devPro : false }),
}));

export const isProNow = () => {
  const s = useProStore.getState();
  return s.entitlement.pro || (__DEV__ && s.devPro);
};
export const useIsPro = () => useProStore((s) => s.entitlement.pro || (__DEV__ && s.devPro));
