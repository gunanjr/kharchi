import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** One item in the native queue (written by the Kotlin SmsReceiver / NotificationListener). */
export interface NativeQueueItem {
  id: string;
  origin: 'sms' | 'notification';
  sender: string | null; // SMS sender header, or package name for notifications
  title: string | null;
  body: string; // transient: removed from the native queue as soon as JS acks it
  receivedAt: number;
  /** Set when the user replied / tapped a chip on the notification before the app opened. */
  resolution?: { categoryKey?: string | null; note?: string | null; notMine?: boolean } | null;
}

/** Kotlin <-> TS contract. See modules/kharchi-native/android. All methods are optional: absent in Expo Go. */
export interface KharchiNativeModule {
  smsReceiverCompiledIn(): boolean; // false in the `lite` variant
  hasSmsPermission(): boolean;
  consumeSharedText(): string | null;
  drainQueue(): string; // JSON NativeQueueItem[]
  ackQueue(ids: string[]): void;
  setSenderAllowlist(list: string[]): void;
  setCaptureEnabled(sms: boolean, notifications: boolean): void;
  isNotificationListenerEnabled(): boolean;
  openNotificationListenerSettings(): void;
  openAppSettings(): void;
  consumeLaunchMode(): string | null; // 'quick' when this JS root belongs to the QuickAddActivity
  finishQuickAdd(): void;
  notificationListenerCompiledIn(): boolean;
  setDoubleTapEnabled(enabled: boolean, sensitivity: number): boolean;
  setPersistentAddNotification(enabled: boolean): void;
  scheduleReminder(atMs: number, title: string, body: string): number;
  requestAddTile(): void;
  pinWidget(): boolean | void;
}

export const native: Partial<KharchiNativeModule> | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<KharchiNativeModule>('KharchiNative') : null;

export const appVariant: 'full' | 'lite' = (Constants.expoConfig?.extra?.appVariant as 'full' | 'lite') ?? 'full';
export const isNativeAvailable = !!native;
export const isSmsCapable = () => !!native?.smsReceiverCompiledIn?.() && appVariant === 'full';
export const isExpoGo = Constants.executionEnvironment === 'storeClient';
export const experimentalEnabled: boolean = !!Constants.expoConfig?.extra?.experimental;
