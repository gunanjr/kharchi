/**
 * BruhMe Pro entitlement (Google Play Billing only; section 22.2a of BRUHME.md).
 *
 * Pure decision logic, kept free of native code so every rule is unit-tested:
 * - Pro comes only from verified Play purchases. Never from settings, the database, a backup file or a deep link.
 * - Online: the purchase list from Play is the truth (refunds and lapsed subscriptions drop out of it).
 * - Offline: a previously verified entitlement lasts a short grace period, measured from the latest time ever seen,
 *   so winding the phone clock back cannot extend it.
 */

export const PRODUCTS = {
  monthly: 'bruhme_pro_monthly',
  yearly: 'bruhme_pro_yearly',
  lifetime: 'bruhme_pro_lifetime',
} as const;
export type ProductId = (typeof PRODUCTS)[keyof typeof PRODUCTS];
const KNOWN = new Set<string>(Object.values(PRODUCTS));

export const GRACE_MS = 7 * 86_400_000;

/** The fields we rely on from a Play purchase (as returned by the billing library). */
export interface PlayPurchase {
  productId: string;
  packageName: string;
  purchaseToken: string;
  /** 1 = purchased (Play's PURCHASED state). Anything else (pending, unspecified) does not grant Pro. */
  purchaseState: number;
  acknowledged: boolean;
  purchaseTime: number;
  /** The signed JSON and its signature, checked against the app's Play public key. */
  originalJson: string;
  signature: string;
}

/** What is stored in the phone's secure keystore between launches. Never in SQLite, never in backups. */
export interface EntitlementCache {
  productId: ProductId;
  purchaseToken: string;
  verifiedAt: number;
  /** The latest wall-clock time ever observed; protects grace from clock rollback. */
  lastSeen: number;
}

export interface VerifyDeps {
  packageName: string;
  /** RSA signature check of originalJson with the Play public key (native or crypto library). */
  verifySignature: (originalJson: string, signature: string) => boolean;
}

export type Reason = 'ok' | 'unknown-product' | 'wrong-package' | 'not-purchased' | 'bad-signature' | 'json-mismatch' | 'no-token';

/** Every check a purchase must pass before it can grant Pro. */
export function checkPurchase(p: PlayPurchase, deps: VerifyDeps): Reason {
  if (!p || !KNOWN.has(p.productId)) return 'unknown-product';
  if (p.packageName !== deps.packageName) return 'wrong-package';
  if (p.purchaseState !== 1) return 'not-purchased';
  if (!p.purchaseToken) return 'no-token';
  if (!p.signature || !p.originalJson || !deps.verifySignature(p.originalJson, p.signature)) return 'bad-signature';
  // The signed JSON must say the same thing as the fields we act on (stops edited fields with a reused signature).
  try {
    const j = JSON.parse(p.originalJson) as { productId?: string; packageName?: string; purchaseToken?: string; purchaseState?: number };
    if (j.productId !== p.productId || j.packageName !== p.packageName || j.purchaseToken !== p.purchaseToken) return 'json-mismatch';
    if (j.purchaseState !== undefined && j.purchaseState !== 0) return 'not-purchased'; // in the signed JSON, 0 = purchased
  } catch {
    return 'json-mismatch';
  }
  return 'ok';
}

/** Lifetime beats yearly beats monthly when several valid purchases exist. */
const RANK: Record<ProductId, number> = { bruhme_pro_lifetime: 3, bruhme_pro_yearly: 2, bruhme_pro_monthly: 1 };

export interface Entitlement {
  pro: boolean;
  productId: ProductId | null;
  /** 'play' = confirmed by Play now; 'grace' = offline, using a recent verification; 'none' = free. */
  source: 'play' | 'grace' | 'none';
  /** Purchases that verified but still need acknowledging with Play (must be done within 3 days or Play refunds). */
  toAcknowledge: string[];
  /** The cache to store next (null = delete it). */
  cache: EntitlementCache | null;
}

/**
 * Decide Pro. `purchases` is the list from Play when Play answered, or null when Play could not be reached.
 */
export function resolveEntitlement(input: { purchases: PlayPurchase[] | null; cache: EntitlementCache | null; now: number; deps: VerifyDeps }): Entitlement {
  const { purchases, cache, deps } = input;
  const effectiveNow = Math.max(input.now, cache?.lastSeen ?? 0);

  if (purchases) {
    const valid = purchases.filter((p) => checkPurchase(p, deps) === 'ok');
    if (!valid.length) return { pro: false, productId: null, source: 'none', toAcknowledge: [], cache: null };
    const best = [...valid].sort((a, b) => RANK[b.productId as ProductId] - RANK[a.productId as ProductId] || b.purchaseTime - a.purchaseTime)[0];
    return {
      pro: true,
      productId: best.productId as ProductId,
      source: 'play',
      toAcknowledge: valid.filter((p) => !p.acknowledged).map((p) => p.purchaseToken),
      cache: { productId: best.productId as ProductId, purchaseToken: best.purchaseToken, verifiedAt: effectiveNow, lastSeen: effectiveNow },
    };
  }

  // Offline.
  if (!cache || !KNOWN.has(cache.productId) || !(cache.verifiedAt > 0)) return { pro: false, productId: null, source: 'none', toAcknowledge: [], cache: null };
  const next = { ...cache, lastSeen: effectiveNow };
  const within = effectiveNow - cache.verifiedAt <= GRACE_MS && cache.verifiedAt <= effectiveNow;
  return within
    ? { pro: true, productId: cache.productId, source: 'grace', toAcknowledge: [], cache: next }
    : { pro: false, productId: cache.productId, source: 'none', toAcknowledge: [], cache: next }; // keep the record so Play can re-confirm later
}

/** Everything Pro unlocks. Free features are never listed here. */
export type ProFeature =
  | 'vault' | 'radar' | 'dueDates' | 'wrappedMonthly' | 'wrappedYearly' | 'milestones' | 'insightsDeep' | 'customRange'
  | 'bumpThemes' | 'allTones' | 'savedLines' | 'tripUnlimited' | 'spaces' | 'persona' | 'reimbursements' | 'warranty'
  | 'taxTotals' | 'privateMode' | 'extraThemes' | 'appIcons' | 'unlimitedBudgets' | 'unlimitedGoals' | 'photoIcons' | 'pdfReports';

/** Free limits that Pro removes. */
export const FREE_LIMITS = { budgets: 3, goals: 2, activeTrips: 1 } as const;

export const canUse = (_feature: ProFeature, e: Pick<Entitlement, 'pro'>) => e.pro;
