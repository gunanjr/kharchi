import { BRANDS, type Brand } from './data';

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9+ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const entries = BRANDS.map((b) => ({ b, keys: [b.name, ...b.aliases].map(norm) }));

/** Brands whose name or alias starts with what the user has typed (or any word of it), best first. */
export function suggestBrands(query: string, limit = 4): Brand[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const scored: { b: Brand; s: number }[] = [];
  for (const { b, keys } of entries) {
    let s = 0;
    for (const k of keys) {
      if (k === q) s = Math.max(s, 100);
      else if (k.startsWith(q)) s = Math.max(s, 80 - (k.length - q.length));
      else if (k.split(' ').some((w) => w.startsWith(q))) s = Math.max(s, 50);
    }
    if (s > 0) scored.push({ b, s });
  }
  return scored.sort((a, c) => c.s - a.s || a.b.name.localeCompare(c.b.name)).slice(0, limit).map((x) => x.b);
}

/** Brand names that are also everyday words: these only match when the whole merchant text is the name. */
const COMMON = new Set(['apple', 'lime', 'target', 'calm', 'wise', 'bolt', 'noon', 'delta', 'gap', 'plum', 'jar', 'social', 'nothing', 'district', 'spar', 'tally', 'grab', 'pret', 'uni', 'visa', 'kindle', 'aha', 'proton', 'cursor', 'shell', 'max', 'slice', 'notion', 'zoom', 'hero', 'honda', 'giva', 'snitch', 'jupiter', 'navi', 'porter', 'dhan', 'fibe', 'kiwi', 'swiggy genie', 'campus', 'vi', 'x', 'lic', 'sony', 'canon', 'nike', 'puma', 'crocs', 'subway', 'amul', 'social offline']);

const cache = new Map<string, Brand | null>();
/** The brand a saved merchant text refers to (exact name/alias, or the text begins with one), else null. Cached: used in lists. */
export function resolveBrand(text: string | null | undefined): Brand | null {
  if (!text) return null;
  const hit = cache.get(text);
  if (hit !== undefined) return hit;
  const t = norm(text);
  let found: Brand | null = null;
  if (t.length >= 2) {
    let best = 0;
    for (const { b, keys } of entries) {
      for (const k of keys) {
        if (k.length < 3 && t !== k) continue;
        const loose = !COMMON.has(k) && (t.startsWith(k + ' ') || t.endsWith(' ' + k));
        if ((t === k || loose) && k.length > best) { best = k.length; found = b; }
      }
    }
  }
  if (cache.size > 2000) cache.clear();
  cache.set(text, found);
  return found;
}

export const merchantKey = (text: string) => norm(text);
