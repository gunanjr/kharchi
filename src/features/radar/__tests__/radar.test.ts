import { findRepeating, radarView } from '../radar';
const D = 86_400_000;
const NOW = new Date(2026, 9, 20, 12).getTime();
const tx = (merchant: string, amount: number, daysAgo: number, extra: object = {}) => ({ type: 'expense' as const, amount, merchant, note: null, occurred_at: NOW - daysAgo * D, ...extra });

describe('findRepeating', () => {
  test('monthly with a price rise, weekly, quarterly and yearly charges are all found', () => {
    const items = findRepeating([
      tx('Netflix', 64900, 92), tx('Netflix', 64900, 61), tx('Netflix', 64900, 31), tx('Netflix', 79900, 1),
      tx('Milk', 3000, 21), tx('Milk', 3000, 14), tx('Milk', 3200, 7), tx('Milk', 3000, 0),
      tx('Insurance', 1800000, 273), tx('Insurance', 1800000, 182), tx('Insurance', 1800000, 91),
      tx('Domain', 99900, 730), tx('Domain', 99900, 365), tx('Domain', 99900, 0),
    ], NOW);
    const by = Object.fromEntries(items.map((i) => [i.name, i]));
    expect(by.Netflix).toMatchObject({ period: 30, amount: 79900, previous: 64900, change: 15000, status: 'active' });
    expect(by.Netflix.yearly).toBe(Math.round(79900 * 365 / 30.4));
    expect(by.Milk.period).toBe(7);
    expect(by.Insurance.period).toBe(91);
    expect(by.Domain.period).toBe(365);
  });
  test('random shopping, too few charges and left-out entries are not subscriptions', () => {
    expect(findRepeating([tx('Shop', 50000, 40), tx('Shop', 12000, 33), tx('Shop', 99000, 3)], NOW)).toEqual([]);
    expect(findRepeating([tx('Gym', 99900, 30), tx('Gym', 99900, 0)], NOW)).toEqual([]);
    expect(findRepeating([tx('X', 100, 60, { excluded: 1 }), tx('X', 100, 30, { excluded: 1 }), tx('X', 100, 0, { excluded: 1 })], NOW)).toEqual([]);
    expect(findRepeating([tx('Odd', 10000, 90), tx('Odd', 10000, 60), tx('Odd', 90000, 30)], NOW)).toEqual([]); // amount out of band
  });
  test('a charge that stopped is marked stopped, not active', () => {
    const items = findRepeating([tx('Old', 19900, 150), tx('Old', 19900, 120), tx('Old', 19900, 90)], NOW);
    expect(items[0].status).toBe('stopped');
  });
  test('tiny wobbles are not price changes', () => {
    const items = findRepeating([tx('Power', 150000, 60), tx('Power', 150000, 30), tx('Power', 150200, 0)], NOW);
    expect(items[0].change).toBe(0);
  });
});

describe('radarView', () => {
  const items = findRepeating([tx('Netflix', 64900, 61), tx('Netflix', 64900, 31), tx('Netflix', 64900, 1), tx('Spotify', 11900, 62), tx('Spotify', 11900, 32), tx('Spotify', 11900, 2)], NOW);
  test('totals count only live charges; cancelled ones drop out until they charge again', () => {
    const all = radarView(items, {}, NOW);
    const net = items.find((i) => i.name === 'Netflix')!;
    const cancelledEarly = radarView(items, { [net.key]: { cancelledAt: NOW - 10 * D } }, NOW);
    expect(cancelledEarly.items.find((v) => v.name === 'Netflix')).toMatchObject({ cancelled: true, chargedAfterCancel: true });
    const cancelledNow = radarView(items, { [net.key]: { cancelledAt: NOW } }, NOW);
    expect(cancelledNow.yearlyActive).toBeLessThan(all.yearlyActive);
    expect(cancelledNow.items.find((v) => v.name === 'Netflix')!.chargedAfterCancel).toBe(false);
    expect(all.items[0].renewsInDays).toBeGreaterThan(0);
  });
});
