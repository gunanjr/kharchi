jest.mock('@/db/provider', () => ({ useDb: () => null }));
jest.mock('@/features/pro/store', () => ({ useIsPro: () => false }));
jest.mock('@/store/settings', () => ({ useSettings: () => null }));
// eslint-disable-next-line import/first
import { freeAuraOpen } from '../freeWeek';

const DAY = 86_400_000;
describe('free aura week', () => {
  it('is open before it starts and for 7 days after', () => {
    expect(freeAuraOpen(0, 1000)).toBe(true);
    expect(freeAuraOpen(1000, 1000 + 6 * DAY)).toBe(true);
    expect(freeAuraOpen(1000, 1000 + 7 * DAY)).toBe(false);
  });
  it('does not reopen when the clock is set back', () => {
    expect(freeAuraOpen(10 * DAY, 2 * DAY)).toBe(false);
  });
});
