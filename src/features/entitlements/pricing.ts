import { formatMoney } from '@/domain/money';

/**
 * Launch pricing (KHARCHI.md section 7; change here only). Billing is not built: until it is, the app shows these
 * prices and collects a waitlist choice on the phone. Amounts are in paise like every other amount in the app.
 */
export const PRICING = { currency: 'INR', monthly: 7900, yearly: 49900 } as const;

export type Billing = 'monthly' | 'yearly';

export const perMonthOf = (b: Billing) => (b === 'monthly' ? PRICING.monthly : Math.round(PRICING.yearly / 12));
/** Whole-number percent saved by paying yearly instead of twelve monthly payments. */
export const yearlySavingPct = () => Math.round((1 - PRICING.yearly / (PRICING.monthly * 12)) * 100);
export const priceLabel = (b: Billing) => `${formatMoney(PRICING[b], PRICING.currency, { trimZeros: true })}${b === 'monthly' ? ' a month' : ' a year'}`;

export interface CompareRow { label: string; free: string | boolean; plus: string | boolean }
/** Free versus Plus, one row per thing a person would ask about. Keep in step with PLUS_PERKS and FREE_LIMITS. */
export const COMPARISON: CompareRow[] = [
  { label: 'Add and edit expenses, income, transfers', free: true, plus: true },
  { label: 'Groups and every split type', free: 'Unlimited', plus: 'Unlimited' },
  { label: 'Budgets, recurring, tags, search, CSV', free: true, plus: true },
  { label: 'Questions about your money', free: true, plus: true },
  { label: 'Say an expense, share a bank message', free: true, plus: true },
  { label: 'Backup, restore, app lock, dark mode', free: true, plus: true },
  { label: 'Savings goals', free: '2', plus: 'Unlimited' },
  { label: 'Monthly review history', free: 'This and last month', plus: 'Every month' },
  { label: 'Share the review as an image', free: false, plus: true },
  { label: 'Money health score', free: false, plus: true },
  { label: 'Receipt vault', free: false, plus: true },
  { label: 'Accent colours', free: false, plus: true },
];
