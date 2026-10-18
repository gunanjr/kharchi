/**
 * Config plugin for the local Kotlin module `modules/kharchi-native`.
 * Re-runs on every `npx expo prebuild`, so the generated android/ folder never needs hand edits.
 *
 *  - variant "full": adds RECEIVE_SMS + SmsReceiver, NotificationCaptureService, DoubleTapService
 *  - variant "lite": adds none of those (Play Store fallback). Quick add, tile, widget, shortcut remain.
 *  - both: QuickAddActivity (translucent drop-down host), launcher shortcut, DrainTaskService (headless drain)
 */
const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withStringsXml,
  withAndroidStyles,
  withDangerousMod,
  AndroidConfig,
} = require('expo/config-plugins');

const CONFIG_CHANGES =
  'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize|assetsPaths|locale|layoutDirection';

function addPermission(manifest, name) {
  manifest['uses-permission'] = manifest['uses-permission'] || [];
  if (!manifest['uses-permission'].some((p) => p.$['android:name'] === name)) {
    manifest['uses-permission'].push({ $: { 'android:name': name } });
  }
}

function upsertComponent(list, node) {
  const name = node.$['android:name'];
  const i = list.findIndex((c) => c.$['android:name'] === name);
  if (i >= 0) list[i] = node;
  else list.push(node);
}

module.exports = function withKharchiNative(config, props = {}) {
  const variant = props.variant === 'lite' ? 'lite' : 'full';
  const scheme = config.scheme || 'kharchi';
  const pkg = config.android && config.android.package;

  config = withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    const app = manifest.application[0];
    app.receiver = app.receiver || [];
    app.service = app.service || [];
    app.activity = app.activity || [];

    addPermission(manifest, 'android.permission.RECEIVE_BOOT_COMPLETED');
    addPermission(manifest, 'android.permission.POST_NOTIFICATIONS');

    // Quick add host activity (translucent, not in recents, own task)
    upsertComponent(app.activity, {
      $: {
        'android:name': '.QuickAddActivity',
        'android:theme': '@style/Theme.Kharchi.QuickAdd',
        'android:exported': 'false',
        'android:launchMode': 'singleTask',
        'android:taskAffinity': '',
        'android:excludeFromRecents': 'true',
        'android:windowSoftInputMode': 'adjustResize',
        'android:configChanges': CONFIG_CHANGES,
        'android:screenOrientation': 'portrait',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          category: [
            { $: { 'android:name': 'android.intent.category.DEFAULT' } },
            { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
          ],
          data: [{ $: { 'android:scheme': scheme, 'android:host': 'quick-add' } }],
        },
      ],
    });

    // launcher long-press shortcut on MainActivity
    const main = app.activity.find((a) => a.$['android:name'] === '.MainActivity');
    if (main) {
      main['meta-data'] = (main['meta-data'] || []).filter((m) => m.$['android:name'] !== 'android.app.shortcuts');
      main['meta-data'].push({ $: { 'android:name': 'android.app.shortcuts', 'android:resource': '@xml/shortcuts' } });
    }

    // receive text shared from the SMS app ("Share into Kharchi") - works in both variants
    if (main) {
      main['intent-filter'] = main['intent-filter'] || [];
      const hasSend = main['intent-filter'].some((f) => (f.action || []).some((a) => a.$['android:name'] === 'android.intent.action.SEND'));
      if (!hasSend) {
        main['intent-filter'].push({
          action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
          category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
          data: [{ $: { 'android:mimeType': 'text/plain' } }],
        });
      }
    }

    // headless drain after a notification reply (best effort)
    upsertComponent(app.service, {
      $: { 'android:name': 'expo.modules.kharchinative.DrainTaskService', 'android:exported': 'false' },
    });

    if (variant === 'full') {
      addPermission(manifest, 'android.permission.RECEIVE_SMS');
      addPermission(manifest, 'android.permission.FOREGROUND_SERVICE');
      addPermission(manifest, 'android.permission.FOREGROUND_SERVICE_SPECIAL_USE');

      upsertComponent(app.receiver, {
        $: {
          'android:name': 'expo.modules.kharchinative.SmsReceiver',
          'android:exported': 'true',
          'android:permission': 'android.permission.BROADCAST_SMS',
        },
        'intent-filter': [
          {
            $: { 'android:priority': '999' },
            action: [{ $: { 'android:name': 'android.provider.Telephony.SMS_RECEIVED' } }],
          },
        ],
      });
      upsertComponent(app.service, {
        $: {
          'android:name': 'expo.modules.kharchinative.NotificationCaptureService',
          'android:exported': 'true',
          'android:label': '@string/app_name',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
        },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.service.notification.NotificationListenerService' } }] }],
      });
      upsertComponent(app.service, {
        $: {
          'android:name': 'expo.modules.kharchinative.DoubleTapService',
          'android:exported': 'false',
          'android:foregroundServiceType': 'specialUse',
        },
        property: [
          {
            $: {
              'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
              'android:value': 'Optional user-enabled double-tap gesture detector that opens the Add expense panel',
            },
          },
        ],
      });
    } else {
      // make sure nothing SMS/notification-listener related survives from a previous prebuild
      const strip = (list, names) => list.filter((x) => !names.includes(x.$['android:name']));
      app.receiver = strip(app.receiver, ['expo.modules.kharchinative.SmsReceiver']);
      app.service = strip(app.service, ['expo.modules.kharchinative.NotificationCaptureService', 'expo.modules.kharchinative.DoubleTapService']);
      manifest['uses-permission'] = (manifest['uses-permission'] || []).filter(
        (p) => !['android.permission.RECEIVE_SMS', 'android.permission.READ_SMS'].includes(p.$['android:name']),
      );
    }
    return c;
  });

  config = withStringsXml(config, (c) => {
    c.modResults = AndroidConfig.Strings.setStringItem(
      [
        { $: { name: 'kharchi_scheme' }, _: scheme },
        { $: { name: 'kharchi_shortcut_short' }, _: 'Add expense' },
        { $: { name: 'kharchi_shortcut_long' }, _: 'Quick add an expense' },
      ],
      c.modResults,
    );
    return c;
  });

  config = withAndroidStyles(config, (c) => {
    const styles = c.modResults.resources.style || [];
    const exists = styles.some((s) => s.$.name === 'Theme.Kharchi.QuickAdd');
    if (!exists) {
      styles.push({
        $: { name: 'Theme.Kharchi.QuickAdd', parent: 'AppTheme' },
        item: [
          { $: { name: 'android:windowIsTranslucent' }, _: 'true' },
          { $: { name: 'android:windowBackground' }, _: '@android:color/transparent' },
          { $: { name: 'android:backgroundDimEnabled' }, _: 'false' },
          { $: { name: 'android:windowContentOverlay' }, _: '@null' },
          { $: { name: 'android:statusBarColor' }, _: '@android:color/transparent' },
        ],
      });
    }
    c.modResults.resources.style = styles;
    return c;
  });

  config = withDangerousMod(config, [
    'android',
    async (c) => {
      const root = c.modRequest.platformProjectRoot;
      const javaDir = path.join(root, 'app/src/main/java', ...pkg.split('.'));
      fs.mkdirSync(javaDir, { recursive: true });
      fs.writeFileSync(
        path.join(javaDir, 'QuickAddActivity.kt'),
        `package ${pkg}

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

/** Translucent host for the Quick Add drop-down panel (GENERATED by plugins/withKharchiNative.js). */
class QuickAddActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
      this,
      BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {})
  }
}
`,
      );
      const xmlDir = path.join(root, 'app/src/main/res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, 'shortcuts.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
  <shortcut
    android:shortcutId="quick_add"
    android:enabled="true"
    android:icon="@mipmap/ic_launcher"
    android:shortcutShortLabel="@string/kharchi_shortcut_short"
    android:shortcutLongLabel="@string/kharchi_shortcut_long">
    <intent
      android:action="android.intent.action.VIEW"
      android:data="${scheme}://quick-add"
      android:targetPackage="${pkg}"
      android:targetClass="${pkg}.QuickAddActivity" />
  </shortcut>
</shortcuts>
`,
      );
      return c;
    },
  ]);

  return config;
};
