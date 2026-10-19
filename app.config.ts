import type { ExpoConfig, ConfigContext } from 'expo/config';
import appConfig from './src/config/app.json';

/**
 * APP_VARIANT=lite (DEFAULT, the privacy-first Play Store edition): no SMS permission, no SMS receiver,
 *   no notification listener, no sensors. Bank messages are pasted or shared into the app and confirmed by the user.
 * APP_VARIANT=full: adds RECEIVE_SMS + the receiver (sideload APK, or a Play submission with the SMS declaration).
 * STORE_BUILD=1: additionally removes INTERNET and other unneeded permissions, so the app physically cannot
 *   send data off the phone. Used by the production / preview EAS profiles.
 */
const variant = process.env.APP_VARIANT === 'full' ? 'full' : 'lite';
const storeBuild = process.env.STORE_BUILD === '1';
/** EXPERIMENTAL=1 adds the notification listener + double-tap detector (dev/sideload builds only). */
const experimental = variant === 'full' && process.env.EXPERIMENTAL === '1';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appConfig.appName,
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
      backgroundColor: '#F3F1EC',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: true,
    allowBackup: false, // financial data must not be auto-copied to Google Drive backups
    permissions: ['POST_NOTIFICATIONS', 'USE_BIOMETRIC'],
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.USE_FINGERPRINT',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_CONTACTS',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE',
      // Store builds have no network code at all, so the permission is removed: data cannot leave the phone.
      ...(storeBuild ? ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE'] : []),
    ],
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-font',
    'expo-localization',
    'expo-asset',
    ['expo-splash-screen', { backgroundColor: '#F3F1EC', image: './assets/splash-icon.png', imageWidth: 180 }],
    ['expo-build-properties', { android: { minSdkVersion: 26, compileSdkVersion: 36, targetSdkVersion: 36 } }],
    ['./plugins/withKharchiNative', { variant, experimental }],
  ],
  experiments: { typedRoutes: true },
  extra: { appVariant: variant, experimental, storeBuild, privacyPolicyUrl: appConfig.privacyPolicyUrl, supportEmail: appConfig.supportEmail, eas: { projectId: process.env.EAS_PROJECT_ID } },
});
