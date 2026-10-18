import type { Db } from '@/db/types';
import { insertRow, updateRow } from '@/db/rows';
import { KEYWORD_CATEGORY } from '@/features/tracker/defaults';

/** Normalise a merchant / VPA / note into a stable key for learning. */
export function merchantKey(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = raw.toLowerCase().trim();
  s = s.replace(/@[a-z0-9]+$/i, ''); // strip VPA handle (@ybl, @oksbi)
  s = s.replace(/^(upi|pos|ecom|ach|neft|imps)[\s/*-]+/i, '');
  s = s.replace(/\b(pvt|ltd|limited|private|india|online|payments?|technologies|tech|services|store|stores)\b/g, ' ');
  s = s.replace(/[0-9]{4,}/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s.split(' ').slice(0, 2).join(' ');
}

export const AUTO_AFTER = 2;

export interface Suggestion {
  categoryId: string | null;
  source: 'learned' | 'auto-rule' | 'keyword' | 'none';
  /** true once the user confirmed the same mapping AUTO_AFTER times but hasn't enabled "always" yet */
  offerAlways?: boolean;
}

export async function suggestCategory(db: Db, text: string | null | undefined): Promise<Suggestion> {
  const key = merchantKey(text);
  if (key) {
    const rule = await db.get<{ category_id: string; confirm_count: number; auto: number }>(
      `SELECT * FROM merchant_rules WHERE merchant_key=? AND deleted_at IS NULL`,
      [key],
    );
    if (rule) return { categoryId: rule.category_id, source: rule.auto ? 'auto-rule' : 'learned', offerAlways: !rule.auto && rule.confirm_count >= AUTO_AFTER };
  }
  if (text) for (const [re, cat] of KEYWORD_CATEGORY) if (re.test(text)) return { categoryId: `cat_${cat}`, source: 'keyword' };
  return { categoryId: null, source: 'none' };
}

/** Record that the user chose `categoryId` for this merchant. Returns the updated confirm count. */
export async function learnMerchant(db: Db, merchant: string | null | undefined, categoryId: string): Promise<{ count: number; offerAlways: boolean }> {
  const key = merchantKey(merchant);
  if (!key) return { count: 0, offerAlways: false };
  const rule = await db.get<{ id: string; category_id: string; confirm_count: number; auto: number }>(
    `SELECT * FROM merchant_rules WHERE merchant_key=? AND deleted_at IS NULL`,
    [key],
  );
  if (!rule) {
    await insertRow(db, 'merchant_rules', { merchant_key: key, category_id: categoryId, confirm_count: 1, auto: 0 });
    return { count: 1, offerAlways: false };
  }
  if (rule.category_id === categoryId) {
    const count = rule.confirm_count + 1;
    await updateRow(db, 'merchant_rules', rule.id, { confirm_count: count });
    return { count, offerAlways: !rule.auto && count >= AUTO_AFTER };
  }
  // user changed their mind: restart the streak with the new category
  await updateRow(db, 'merchant_rules', rule.id, { category_id: categoryId, confirm_count: 1, auto: 0 });
  return { count: 1, offerAlways: false };
}

export async function setAlwaysCategorize(db: Db, merchant: string, categoryId: string) {
  const key = merchantKey(merchant);
  if (!key) return;
  const rule = await db.get<{ id: string }>(`SELECT id FROM merchant_rules WHERE merchant_key=?`, [key]);
  if (rule) await updateRow(db, 'merchant_rules', rule.id, { category_id: categoryId, auto: 1 });
  else await insertRow(db, 'merchant_rules', { merchant_key: key, category_id: categoryId, confirm_count: AUTO_AFTER, auto: 1 });
}
