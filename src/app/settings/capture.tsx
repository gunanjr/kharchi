import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { SubScreen, Card, Text, Button, Field, Row } from '@/components/ui';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, bumpData } from '@/db/provider';
import { useSettings } from '@/store/settings';
import { appVariant, experimentalEnabled, isExpoGo, isNativeAvailable, native, isSmsCapable } from '@/features/native/module';
import { smsPermissionStatus } from '@/features/native/sms';
import { syncNativeSettings } from '@/features/native/sync';
import { ingestSharedText } from '@/features/native/share';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const STEPS = [
  ['1', 'Open your messages app and long-press the bank message.'],
  ['2', 'Tap Share (or Copy).'],
  ['3', 'Choose this app (or come back here and tap “Paste a copied message”).'],
  ['4', 'Confirm what it was for. Done.'],
];

export default function Capture() {
  const router = useRouter();
  const db = useDb();
  const { colors } = useTheme();
  const s = useSettings();
  const smsBuild = appVariant === 'full';
  const [perm, setPerm] = useState(smsPermissionStatus());
  const [listener, setListener] = useState(!!native?.isNotificationListenerEnabled?.());
  const [allow, setAllow] = useState(s.senderAllowlist);

  const refresh = useCallback(() => {
    setPerm(smsPermissionStatus());
    setListener(!!native?.isNotificationListenerEnabled?.());
    syncNativeSettings();
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const smsOn = perm === 'granted' && s.smsDisclosureAccepted;

  async function paste() {
    const text = await Clipboard.getStringAsync();
    if (!text) return toast('Copy a bank message first, then tap this');
    const r = await ingestSharedText(db, text);
    bumpData();
    toast(r === 'created' ? 'Found a transaction. Check Home.' : r === 'duplicate' ? 'Already captured' : 'That doesn’t look like a transaction');
  }

  return (
    <SubScreen title={smsBuild ? 'Bank & UPI messages' : 'Import from a message'}>
      <Card style={{ gap: space.md }}>
        <Text v="h2">Paste or share a bank message</Text>
        <Text color={colors.textMuted}>
          The app reads the amount, merchant and date on your phone, then asks what it was for. Nothing runs in the background, and the message text is never stored or sent anywhere.
        </Text>
        {STEPS.map(([n, t]) => (
          <Row key={n} style={{ alignItems: 'flex-start' }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text v="small" color={colors.primary}>{n}</Text>
            </View>
            <Text style={{ flex: 1 }}>{t}</Text>
          </Row>
        ))}
        <Button title="Paste a copied message" onPress={paste} />
      </Card>

      {smsBuild && (
        <Card style={{ gap: space.md }}>
          {!isNativeAvailable && <Text color={colors.textMuted}>{isExpoGo ? 'Automatic reading needs the installed app (Expo Go cannot load custom native code).' : 'Native module not present.'}</Text>}
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text v="title">Read bank SMS automatically</Text>
              <Text v="small" color={colors.textMuted}>
                {perm === 'unavailable' ? 'Not available in this build' : smsOn ? 'On: works even when the app is closed' : perm === 'denied' && s.smsDisclosureAccepted ? 'Permission denied' : 'Off'}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Read bank SMS automatically"
              disabled={!isSmsCapable()}
              value={smsOn}
              trackColor={{ true: colors.primary }}
              onValueChange={(v) => (v ? router.push('/disclosure/sms') : (native?.openAppSettings?.(), toast('Turn off “SMS” under Permissions')))}
            />
          </Row>
          {perm === 'denied' && s.smsDisclosureAccepted && <Button title="Open Android settings" kind="secondary" onPress={() => native?.openAppSettings?.()} />}
          <Field label="Only read these sender IDs (optional)" value={allow} onChangeText={setAllow} placeholder="HDFCBK, SBIINB, ICICIT" autoCapitalize="characters"
            onEndEditing={async () => { await s.set(db, 'senderAllowlist', allow); syncNativeSettings(); }} />
        </Card>
      )}

      {smsBuild && experimentalEnabled && (
        <Card style={{ gap: space.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text v="title">Also read UPI app notifications</Text>
              <Text v="small" color={colors.textMuted}>Google Pay, PhonePe, Paytm and a few more. One payment never becomes two entries.</Text>
            </View>
            <Switch
              accessibilityLabel="Read UPI app notifications"
              disabled={!native?.notificationListenerCompiledIn?.()}
              value={listener && s.notifListenerEnabled}
              trackColor={{ true: colors.primary }}
              onValueChange={async (v) => {
                if (v) router.push('/disclosure/notifications');
                else { await s.set(db, 'notifListenerEnabled', false); native?.openNotificationListenerSettings?.(); syncNativeSettings(); }
              }}
            />
          </Row>
        </Card>
      )}
      <ToastHost />
    </SubScreen>
  );
}
