import { native, isSmsCapable } from './module';
import { useSettings } from '@/store/settings';

/** Mirror JS settings into the native side (the receiver runs without JS, so it reads native prefs). */
export function syncNativeSettings() {
  if (!native) return;
  const s = useSettings.getState();
  const smsOn = isSmsCapable() && s.smsDisclosureAccepted && !!native.hasSmsPermission?.();
  native.setCaptureEnabled?.(smsOn, s.notifListenerEnabled && !!native.isNotificationListenerEnabled?.());
  native.setSenderAllowlist?.(s.senderAllowlist.split(',').map((x) => x.trim()).filter(Boolean));
}
