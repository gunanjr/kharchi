import type { ExpoConfig, ConfigContext } from 'expo/config';
import appConfig from './src/config/app.json';

/**
 * APP_VARIANT=lite (DEFAULT, the privacy-first Play Store edition): no SMS permission, no SMS receiver,
 *   no notification listener, no sensors. Bank messages are pasted or shared into the app and confirmed by the user.
 * STORE_BUILD=1: additionally removes INTERNET and other unneeded permissions, so the app physically cannot
 *   send data off the phone. Used by the production / preview EAS profiles.
 */
// One edition only (founder decision, 20 Oct): no SMS reading, no notification listener, ever.
const variant = 'lite' as const;
const storeBuild = process.env.STORE_BUILD === '1';
const experimental = false;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appConfig.appName,
  slug: appConfig.slug,
  scheme: appConfig.scheme,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  web: { favicon: './assets/favicon.png' },
  ios: { supportsTablet: false, bundleIdentifier: appConfig.iosBundleId },
  android: {
    package: appConfig.androidPackage,
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
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
      // Amendment A1 (20 Oct): store builds keep INTERNET so Google Play Billing works; BruhMe still sends no entries anywhere.
      ...(storeBuild ? ['android.permission.ACCESS_NETWORK_STATE'] : []),
    ],
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-font',
    'expo-localization',
    'expo-asset',
    // Camera and gallery for photos. All its permissions are blocked: installed builds take photos through the phone's own
    // camera app (Kotlin module, no CAMERA permission) and pick through the system photo picker; this module's camera path is
    // used only inside Expo Go, which has its own permission.
    // Google Play Billing for BruhMe Pro (amendment A1). Adds the Play billing library and its BILLING permission.
    'expo-iap',
    ['expo-image-picker', { cameraPermission: false, microphonePermission: false, photosPermission: false }],
    ['expo-splash-screen', { backgroundColor: '#FFFFFF', image: './assets/splash-icon.png', imageWidth: 180 }],
    ['expo-build-properties', { android: { minSdkVersion: 26, compileSdkVersion: 36, targetSdkVersion: 36 } }],
    ['./plugins/withKharchiNative', { variant, experimental }],
  ],
  experiments: { typedRoutes: true },
  extra: { appVariant: variant, experimental, storeBuild, privacyPolicyUrl: appConfig.privacyPolicyUrl, supportEmail: appConfig.supportEmail, eas: { projectId: process.env.EAS_PROJECT_ID } },
});
