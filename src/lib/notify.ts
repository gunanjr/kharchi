import { PermissionsAndroid, Platform } from 'react-native';
import { native } from '@/features/native/module';

export type NotifyResult = 'scheduled' | 'denied' | 'unsupported' | 'past';

/**
 * Schedule one local notification at a time of day on a given date, through the app's own native alarm.
 * No push service, no server, no cost. Needs the installed app (Expo Go cannot) and, on Android 13+, the optional
 * notification permission, which is asked for only when the user turns a reminder on.
 */
export async function notifyAt(at: number, title: string, body: string, now = Date.now()): Promise<NotifyResult> {
  if (at <= now) return 'past';
  if (Platform.OS !== 'android' || !native?.scheduleReminder) return 'unsupported';
  try {
    if (Platform.Version >= 33) {
      const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (r !== 'granted') return 'denied';
    }
    native.scheduleReminder(at, title, body);
    return 'scheduled';
  } catch {
    return 'unsupported';
  }
}

/** 10 am on the day `days` before `t` (never in the past). */
export function morningBefore(t: number, days: number): number {
  const d = new Date(t - days * 86_400_000);
  d.setHours(10, 0, 0, 0);
  return d.getTime();
}

export const notifyMessage = (r: NotifyResult) =>
  r === 'scheduled' ? 'Reminder set' : r === 'denied' ? 'Allow notifications for BruhMe in Android settings to get reminders' : r === 'past' ? 'That date has already passed' : 'Reminders work in the installed app, not in Expo Go';
