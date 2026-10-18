import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { SubScreen, Card, Text, Button, Field, Row } from '@/components/ui';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, bumpData } from '@/db/provider';
import { useSettings } from '@/store/settings';
import { appVariant, isExpoGo, isNativeAvailable, native, isSmsCapable } from '@/features/native/module';
import { smsPermissionStatus } from '@/features/native/sms';
import { syncNativeSettings } from '@/features/native/sync';
import { ingestSharedText } from '@/features/native/share';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function Capture() {
  const router = useRouter();
  const db = useDb();
  const { colors } = useTheme();
  const s = useSettings();
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
  const why = !isNativeAvailable
    ? `Native features aren't available here (${isExpoGo ? 'Expo Go can’t load custom native code' : 'this build has no native module'}). Use the simulator in Settings → Developer, paste a message below, or build the dev app.`
    : appVariant === 'lite'
      ? 'This is the “lite” build: it has no SMS permission by design. Share a bank message into the app, or paste it below.'
      : null;

  async function paste() {
    const text = await Clipboard.getStringAsync();
    if (!text) return toast('Copy a bank SMS first, then tap this');
    const r = await ingestSharedText(db, text);
    bumpData();
    toast(r === 'created' ? 'Found a transaction. Check Home.' : r === 'duplicate' ? 'Already captured' : 'That doesn’t look like a transaction');
  }

  return (
    <SubScreen title="Bank & UPI messages">
      {why ? <Card style={{ backgroundColor: colors.primarySoft }}><Text>{why}</Text></Card> : null}

      <Card style={{ gap: space.md }}>
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
        <Text v="small" color={colors.textMuted}>Comma separated. Empty means every bank/UPI sender is considered.</Text>
      </Card>

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

      <Card style={{ gap: space.md }}>
        <Text v="h2">No permission? Still works.</Text>
        <Text>Select a bank SMS in your messages app, tap Share, and choose this app. Or copy it and paste it here. Same parser, same “What was this for?” step.</Text>
        <Button title="Paste a copied SMS" kind="secondary" onPress={paste} />
      </Card>
      <ToastHost />
    </SubScreen>
  );
}
