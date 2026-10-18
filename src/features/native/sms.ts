import { PermissionsAndroid, Platform } from 'react-native';
import { native, isSmsCapable, type NativeQueueItem } from './module';

export type SmsPermission = 'granted' | 'denied' | 'unavailable';

export function smsPermissionStatus(): SmsPermission {
  if (!isSmsCapable()) return 'unavailable';
  return native?.hasSmsPermission?.() ? 'granted' : 'denied';
}

/** Shows the standard Android runtime dialog. Call ONLY after the in-app disclosure screen was accepted. */
export async function requestSmsPermission(): Promise<SmsPermission> {
  if (!isSmsCapable() || Platform.OS !== 'android') return 'unavailable';
  const r = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    PermissionsAndroid.PERMISSIONS.READ_SMS,
  ]);
  const ok = r['android.permission.RECEIVE_SMS'] === 'granted';
  return ok ? 'granted' : 'denied';
}

export function drainNativeQueue(): NativeQueueItem[] {
  try {
    const json = native?.drainQueue?.();
    return json ? (JSON.parse(json) as NativeQueueItem[]) : [];
  } catch {
    return [];
  }
}

export const ackNativeQueue = (ids: string[]) => ids.length && native?.ackQueue?.(ids);
