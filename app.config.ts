import type { ExpoConfig, ConfigContext } from 'expo/config';
import appConfig from './src/config/app.json';

/**
 * APP_VARIANT=full (default): SMS permissions + receiver included.
 * APP_VARIANT=lite: no SMS permissions / receiver (Play Store fallback).
 */
const variant = process.env.APP_VARIANT === 'lite' ? 'lite' : 'full';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: variant === 'lite' ? `${appConfig.appName} Lite` : appConfig.appName,
  slug: appConfig.slug,
  scheme: appConfig.scheme,
  version: '0.1.0',
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
    ['./plugins/withKharchiNative', { variant }],
  ],
  experiments: { typedRoutes: true },
  extra: { appVariant: variant, eas: { projectId: process.env.EAS_PROJECT_ID } },
});
