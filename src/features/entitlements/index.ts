/**
 * Plus tier. There is NO billing in this app: the store edition has no payment code, no network and no purchase
 * flow, so there is nothing for Google to review beyond the free app. Plus is a local switch (Settings, Kharchi Plus)
 * that unlocks the extras below. When real billing is added later, implement `Entitlements` with purchase-token
 * validation and switch `getEntitlements()`; no screen needs to change.
 *
 * Rules (KHARCHI.md, section 7): basic entry, group splitting, budgets, standard insights, the offline assistant and
 * CSV stay FREE forever. Only features that are implemented AND clearly better than the free version go here.
 */
export type PlusFeature = 'goals_unlimited' | 'full_history' | 'health_score' | 'review_share' | 'receipt_vault' | 'accent_themes';

/** What the free tier includes of the metered features. */
export const FREE_LIMITS = { goals: 2, reviewMonthsBack: 1 } as const;

export interface PlusPerk { feature: PlusFeature; title: string; body: string; icon: string }

export const PLUS_PERKS: PlusPerk[] = [
  { feature: 'goals_unlimited', title: 'Unlimited savings goals', body: `Free includes ${FREE_LIMITS.goals} goals. Plus has no limit and suggests a monthly amount.`, icon: 'target' },
  { feature: 'full_history', title: 'Every month of history', body: 'Browse the review for any month. Free shows this and last month.', icon: 'calendar' },
  { feature: 'health_score', title: 'Money health score', body: 'A 0 to 100 indicator and the four things behind it. Not advice.', icon: 'chart' },
  { feature: 'review_share', title: 'Monthly review card', body: 'Your month as one card you can share as an image.', icon: 'share' },
  { feature: 'receipt_vault', title: 'Receipt vault', body: 'Attach an image or PDF to any transaction. Stays on your phone.', icon: 'tag' },
  { feature: 'accent_themes', title: 'Accent colours', body: 'Teal, rose or indigo instead of marigold.', icon: 'palette' },
];

export interface Entitlements {
  readonly tier: 'free' | 'plus';
  has(feature: PlusFeature): boolean;
}

export class FreeEntitlements implements Entitlements {
  readonly tier = 'free' as const;
  has(_feature: PlusFeature): boolean {
    return false;
  }
}
export class PlusEntitlements implements Entitlements {
  readonly tier = 'plus' as const;
  has(_feature: PlusFeature): boolean {
    return true;
  }
}

export const entitlementsFor = (plus: boolean): Entitlements => (plus ? new PlusEntitlements() : new FreeEntitlements());

let current: Entitlements = new FreeEntitlements();
export const getEntitlements = (): Entitlements => current;
/** Test / future-billing hook. */
export const setEntitlements = (e: Entitlements) => {
  current = e;
};

/** True when the metered goals limit lets another goal be created. */
export const canAddGoal = (e: Entitlements, existing: number) => e.has('goals_unlimited') || existing < FREE_LIMITS.goals;
