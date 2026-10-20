/* eslint-disable import/first -- the lock module must be mocked before it is imported */
jest.mock('expo-local-authentication', () => ({ hasHardwareAsync: async () => false, isEnrolledAsync: async () => false, authenticateAsync: async () => ({ success: true }) }));
import { isPrivate, splitPrivate } from '../private';
const t = (id: string, tags: string[] | null) => ({ id, tags: tags ? JSON.stringify(tags) : null });
test('private entries hide until unlocked; tags are case-insensitive; broken tags are safe', () => {
  const list = [t('a', ['Private']), t('b', null), t('c', ['work']), { id: 'd', tags: '{broken' }];
  expect(isPrivate(list[0])).toBe(true);
  expect(splitPrivate(list, false)).toEqual({ visible: [list[1], list[2], list[3]], hidden: 1 });
  expect(splitPrivate(list, true).hidden).toBe(0);
});
