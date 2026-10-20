import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import { readTags } from '@/features/tracker/tags';

/**
 * Private mode (Pro): entries tagged `private` are hidden from lists until the user unlocks with fingerprint, face or
 * screen lock. Unlocking lasts until the app is closed. Totals still include private entries, so numbers never lie.
 */
export const PRIVATE_TAG = 'private';
export const isPrivate = (t: { tags?: string | null }) => readTags(t.tags ?? null).map((g) => g.toLowerCase()).includes(PRIVATE_TAG);

export const usePrivateUnlock = create<{ unlocked: boolean; set: (v: boolean) => void }>((set) => ({ unlocked: false, set: (unlocked) => set({ unlocked }) }));

/** Ask for fingerprint, face or screen lock. Without any lock on the phone, private entries simply show. */
export async function unlockPrivate(): Promise<boolean> {
  try {
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) { usePrivateUnlock.getState().set(true); return true; }
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Show private entries' });
    if (r.success) usePrivateUnlock.getState().set(true);
    return r.success;
  } catch {
    return false;
  }
}

/** Split a list into what to show and how many are hidden. */
export function splitPrivate<T extends { tags?: string | null }>(list: T[], unlocked: boolean): { visible: T[]; hidden: number } {
  if (unlocked) return { visible: list, hidden: 0 };
  const visible = list.filter((t) => !isPrivate(t));
  return { visible, hidden: list.length - visible.length };
}
