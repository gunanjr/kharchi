/**
 * Plus-tier groundwork. v1.0 ships FREE with every feature unlocked: no paywall UI exists on purpose.
 *
 * Rules agreed for monetisation (see docs/BUSINESS_PLAN.md):
 *  - Basic expense entry, group splitting, budgets, standard insights, the offline assistant and CSV stay FREE forever.
 *  - Only features that are implemented AND clearly better than the free version may be added to PLUS_FEATURES.
 *  - Billing (Google Play Billing) is not wired yet. When it is, implement `Entitlements` with purchase-token
 *    validation and switch `getEntitlements()`; nothing else in the app needs to change.
 */
export type PlusFeature = never; // none yet: add a string literal here when a real Plus feature ships

export interface Entitlements {
  readonly tier: 'free' | 'plus';
  has(feature: PlusFeature): boolean;
}

/** Free tier: everything that exists today is unlocked. */
export class FreeEntitlements implements Entitlements {
  readonly tier = 'free' as const;
  has(_feature: PlusFeature): boolean {
    return true; // no gated features exist yet
  }
}

let current: Entitlements = new FreeEntitlements();
export const getEntitlements = (): Entitlements => current;
/** Test / future-billing hook. */
export const setEntitlements = (e: Entitlements) => {
  current = e;
};
