import { parseTags, readTags, normaliseTag, MAX_TAGS } from '../tags';

test('parses commas, spaces and hashes into unique lowercase tags', () => {
  expect(parseTags('Goa, #Trip  work, goa')).toEqual(['goa', 'trip', 'work']);
});
test('drops empties and caps the count and length', () => {
  expect(parseTags(' , ,, ')).toEqual([]);
  expect(parseTags(Array.from({ length: 20 }, (_, i) => `t${i}`).join(' '))).toHaveLength(MAX_TAGS);
  expect(normaliseTag('x'.repeat(60))).toHaveLength(24);
});
test('reads stored JSON safely', () => {
  expect(readTags('["a","b"]')).toEqual(['a', 'b']);
  expect(readTags(null)).toEqual([]);
  expect(readTags('not json')).toEqual([]);
  expect(readTags('{"a":1}')).toEqual([]);
});
