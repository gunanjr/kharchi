import type { ExpoConfig, ConfigContext } from 'expo/config';
import appConfig from './src/config/app.json';

/**
 * APP_VARIANT=full (default): SMS permissions + receiver included.
 * APP_VARIANT=lite: no SMS permissions / receiver (Play Store fallback).
 */
const variant = process.env.APP_VARIANT === 'lite' ? 'lite' : 'full';
/** EXPERIMENTAL=1 adds the notification listener + double-tap detector (dev/sideload builds only). */
const experimental = variant === 'full' && process.env.EXPERIMENTAL === '1';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: variant === 'lite' ? `${appConfig.appName} Lite` : appConfig.appName,
  slug: appConfig.slug,
  scheme: appConfig.scheme,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: { supportsTablet: false, bundleIdentifier: appConfig.iosBundleId },
  android: {
    package: appConfig.androidPackage,
    adaptiveIcon: {
      backgroundColor: '#F4EBDD',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: true,
    allowBackup: false, // financial data must not be auto-copied to Google Drive backups
    permissions: ['POST_NOTIFICATIONS', 'USE_BIOMETRIC'],
    blockedPermissions: ['android.permission.RECORD_AUDIO', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.USE_FINGERPRINT'],
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-font',
    'expo-localization',
    'expo-asset',
    ['expo-splash-screen', { backgroundColor: '#F4EBDD', image: './assets/splash-icon.png', imageWidth: 180 }],
    ['expo-build-properties', { android: { minSdkVersion: 26 } }],
    ['expo-notifications', { color: '#C2410C' }],
    ['./plugins/withKharchiNative', { variant, experimental }],
  ],
  experiments: { typedRoutes: true },
  extra: { appVariant: variant, experimental, eas: { projectId: process.env.EAS_PROJECT_ID } },
});
