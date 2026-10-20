import { useSettings } from '@/store/settings';
import { merchantKey } from './match';

/** The photo the user picked as this merchant's icon, if any. */
export const useMerchantPhoto = (merchant: string | null | undefined) =>
  useSettings((s) => (merchant ? s.merchantIcons[merchantKey(merchant)] ?? null : null));
