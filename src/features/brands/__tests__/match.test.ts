import { suggestBrands, resolveBrand, merchantKey } from '../match';
import { BRANDS } from '../data';

test('typing a few letters suggests the brand', () => {
  expect(suggestBrands('swigg')[0].name).toBe('Swiggy');
  expect(suggestBrands('SWIGGY')[0].name).toBe('Swiggy');
  expect(suggestBrands('amaz')[0].name).toBe('Amazon');
  expect(suggestBrands('rap')[0].name).toBe('Rapido');
  expect(suggestBrands('blin')[0].name).toBe('Blinkit');
  expect(suggestBrands('flip')[0].name).toBe('Flipkart');
  expect(suggestBrands('net')[0].name).toBe('Netflix');
});
test('aliases and short input', () => {
  expect(suggestBrands('gpay')[0].name).toBe('Google Pay');
  expect(suggestBrands('s')).toEqual([]);
  expect(suggestBrands('')).toEqual([]);
  expect(suggestBrands('zzzzqq')).toEqual([]);
  expect(suggestBrands('x'.repeat(5000))).toEqual([]);
});
test('resolves saved merchant text without false positives', () => {
  expect(resolveBrand('Swiggy')?.name).toBe('Swiggy');
  expect(resolveBrand('SWIGGY INSTAMART')?.name).toBe('Swiggy');
  expect(resolveBrand('Amazon Pay')?.name).toBe('Amazon');
  expect(resolveBrand('Rapido ride')?.name).toBe('Rapido');
  expect(resolveBrand('Olive Garden')).toBeNull();
  expect(resolveBrand('Idea cafe')).toBeNull();
  expect(resolveBrand('Apollo hospital visit')).toBeNull();
  expect(resolveBrand('Sugar')).toBeNull();
  expect(resolveBrand('Lime juice')).toBeNull();
  expect(resolveBrand('Apple juice')).toBeNull();
  expect(resolveBrand('Apple')?.name).toBe('Apple');
  expect(resolveBrand('Target practice')).toBeNull();
  expect(resolveBrand('Zerodha SIP')?.name).toBe('Zerodha');
  expect(resolveBrand('Vineet')).toBeNull();
  expect(resolveBrand(null)).toBeNull();
  expect(resolveBrand('')).toBeNull();
});
test('catalogue is well formed', () => {
  for (const b of BRANDS) {
    expect(b.hex).toMatch(/^#[0-9A-F]{6}$/i);
    expect(b.name.length).toBeGreaterThan(0);
    if (b.path) expect(b.path).toMatch(/^[Mm]/);
  }
  expect(new Set(BRANDS.map((b) => b.name)).size).toBe(BRANDS.length);
  expect(merchantKey('  Swiggy!! ')).toBe('swiggy');
});
