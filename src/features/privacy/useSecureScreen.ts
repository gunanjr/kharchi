import { useEffect } from 'react';
import { Platform } from 'react-native';
import { native } from '@/features/native/module';
import { useSettings } from '@/store/settings';

/**
 * "Hide from screenshots and recent apps": while on, Android blocks screenshots and screen recording of BruhMe and shows a
 * blank card in the recent-apps switcher (FLAG_SECURE). Share images made inside the app still work. No permission needed.
 */
export function useSecureScreen() {
  const on = useSettings((s) => s.secureScreen);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    try {
      native?.setSecureScreen?.(on); // our own Kotlin module sets/clears FLAG_SECURE; absent in Expo Go (then nothing happens)
    } catch {
      /* never let a privacy nicety crash the app */
    }
  }, [on]);
}
