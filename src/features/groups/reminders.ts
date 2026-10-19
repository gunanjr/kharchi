import { PermissionsAndroid, Platform } from 'react-native';
import { native } from '@/features/native/module';

export type ReminderResult = 'scheduled' | 'denied' | 'unsupported';

/**
 * Local reminder ("Ask Ravi for ₹450") N days from now, through the app's own native alarm.
 * No push service, no network. Needs the installed app (not Expo Go) and, on Android 13+, notification permission.
 */
export async function scheduleReminder(name: string, amountText: string, inDays: number): Promise<ReminderResult> {
  if (Platform.OS !== 'android' || !native?.scheduleReminder) return 'unsupported';
  try {
    if (Platform.Version >= 33) {
      const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (r !== 'granted') return 'denied';
    }
    native.scheduleReminder(Date.now() + Math.max(1, inDays) * 86_400_000, `Settle up with ${name}`, `${name} still owes you ${amountText}. A gentle nudge?`);
    return 'scheduled';
  } catch {
    return 'unsupported';
  }
}
