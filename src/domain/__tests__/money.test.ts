import { allocate, convertMinor, formatMoney, parseAmountToMinor } from '../money';

test('parse', () => {
  expect(parseAmountToMinor('1,299.50')).toBe(129950);
  expect(parseAmountToMinor('₹ 450')).toBe(45000);
  expect(parseAmountToMinor('0.5')).toBe(50);
  expect(parseAmountToMinor('abc')).toBeNull();
  expect(parseAmountToMinor('500', 'JPY')).toBe(500);
});
test('format with Indian grouping', () => {
  expect(formatMoney(123456789)).toBe('₹12,34,567.89');
  expect(formatMoney(-45000, 'INR', { trimZeros: true })).toBe('-₹450');
  expect(formatMoney(1234500, 'USD')).toBe('$12,345.00');
  expect(formatMoney(25000000, 'INR', { compact: true })).toBe('₹2.5L');
});
test('allocate sums exactly', () => {
  expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
  for (let t = 0; t < 200; t++) {
    const w = [Math.random(), Math.random() * 5, 1, 3];
    expect(allocate(t * 37, w).reduce((a, b) => a + b, 0)).toBe(t * 37);
  }
  expect(allocate(10, [0, 0])).toEqual([5, 5]);
});
test('convert', () => {
  expect(convertMinor(10000, 83.5, 'USD', 'INR')).toBe(835000);
  expect(convertMinor(100, 0.5, 'INR', 'JPY')).toBe(1); // 1.00 INR*0.5 -> 0.5 JPY rounds to 1 (half-up)
});
