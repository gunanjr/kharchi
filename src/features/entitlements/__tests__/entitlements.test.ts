import { FreeEntitlements, PlusEntitlements, canAddGoal, entitlementsFor, FREE_LIMITS, PLUS_PERKS, getEntitlements, setEntitlements } from '../index';

test('free gates every Plus feature but keeps a goals allowance', () => {
  const f = new FreeEntitlements();
  for (const p of PLUS_PERKS) expect(f.has(p.feature)).toBe(false);
  expect(canAddGoal(f, FREE_LIMITS.goals - 1)).toBe(true);
  expect(canAddGoal(f, FREE_LIMITS.goals)).toBe(false);
});
test('plus unlocks everything and has no goal limit', () => {
  const p = new PlusEntitlements();
  for (const x of PLUS_PERKS) expect(p.has(x.feature)).toBe(true);
  expect(canAddGoal(p, 100)).toBe(true);
});
test('the active entitlement can be swapped (future billing hook)', () => {
  expect(getEntitlements().tier).toBe('free');
  const old = getEntitlements();
  setEntitlements(entitlementsFor(true));
  expect(getEntitlements().tier).toBe('plus');
  setEntitlements(old);
});
test('every perk is unique and described', () => {
  expect(new Set(PLUS_PERKS.map((p) => p.feature)).size).toBe(PLUS_PERKS.length);
  for (const p of PLUS_PERKS) { expect(p.title.length).toBeGreaterThan(3); expect(p.body).not.toMatch(/—/); }
});
