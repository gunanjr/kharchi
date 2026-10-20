import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { useSettings } from '@/store/settings';

/**
 * "Hide from screenshots and recent apps": while on, Android blocks screenshots and screen recording of BruhMe and shows a
 * blank card in the recent-apps switcher (FLAG_SECURE). Share images made inside the app still work. No permission needed.
 */
export function useSecureScreen() {
  const on = useSettings((s) => s.secureScreen);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    (on ? ScreenCapture.preventScreenCaptureAsync('bruhme') : ScreenCapture.allowScreenCaptureAsync('bruhme')).catch(() => {});
  }, [on]);
}
