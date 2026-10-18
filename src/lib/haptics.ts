import * as Haptics from 'expo-haptics';
import { useSettings } from '@/store/settings';

const on = () => useSettings.getState().hapticsEnabled;
export const haptic = {
  tap: () => on() && Haptics.selectionAsync().catch(() => {}),
  light: () => on() && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  success: () => on() && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warn: () => on() && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};
