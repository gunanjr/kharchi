import { FreeEntitlements, getEntitlements, setEntitlements } from '../index';

test('v1 is free with nothing gated', () => {
  expect(getEntitlements().tier).toBe('free');
});
test('entitlements can be swapped (future billing hook)', () => {
  const old = getEntitlements();
  setEntitlements({ tier: 'plus', has: () => true });
  expect(getEntitlements().tier).toBe('plus');
  setEntitlements(old);
  expect(new FreeEntitlements().has('x' as never)).toBe(true);
});
