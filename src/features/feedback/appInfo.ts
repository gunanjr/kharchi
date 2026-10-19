import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { appConfig } from '@/config/app';
import { buildCrashMail, type AppInfo } from './repo';

export const appInfo = (): AppInfo => ({ app: appConfig.appName, version: Constants.expoConfig?.version ?? '1.0.0', os: Platform.OS, osVersion: String(Platform.Version) });

/** Opens the user's mail app with a short error report they can read and edit before sending. Returns false if no mail app. */
export async function reportCrash(error: Error): Promise<boolean> {
  try {
    await Linking.openURL(buildCrashMail(error, appInfo(), appConfig.supportEmail).url);
    return true;
  } catch {
    return false;
  }
}
