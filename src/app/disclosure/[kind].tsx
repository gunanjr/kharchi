import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SubScreen, Card, Text, Button } from '@/components/ui';
import { Emblem } from '@/components/Emblem';
import { useDb } from '@/db/provider';
import { useSettings } from '@/store/settings';
import { requestSmsPermission } from '@/features/native/sms';
import { native } from '@/features/native/module';
import { syncNativeSettings } from '@/features/native/sync';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const COPY = {
  sms: {
    title: 'Before we ask for SMS access',
    lead: 'To turn bank and UPI texts into expenses automatically, the app needs permission to receive SMS.',
    points: [
      ['What is read', 'Only the text of incoming messages from bank / UPI sender IDs that look like a payment: an amount plus “debited”, “credited”, “spent” and similar.'],
      ['What is ignored', 'OTPs, offers, delivery updates and personal chats are discarded instantly on your phone. They are never stored, never logged and never shown.'],
      ['What is kept', 'The amount, merchant, account last-4, date and a one-way hash. The message text itself is deleted as soon as it has been understood.'],
      ['Nothing is uploaded', 'All reading happens on this device. No message, number or transaction is sent anywhere.'],
      ['You are in control', 'Say no and the app stays fully usable (manual entry, quick add, share a message into the app). You can revoke access any time in Android Settings, or limit it to specific senders in this app.'],
    ],
    cta: 'Agree and continue',
  },
  notifications: {
    title: 'Before we ask to read payment notifications',
    lead: 'Optionally, the app can notice payment notifications from apps like Google Pay, PhonePe and Paytm.',
    points: [
      ['What is read', 'Notifications from a fixed list of UPI and bank apps only. Notifications from every other app are ignored without being looked at.'],
      ['How it is used', 'To spot a payment and ask “What was this for?”. If a bank SMS arrives for the same payment, it is merged so you never get two entries.'],
      ['Nothing is uploaded', 'Everything stays on this device. Only the amount, merchant and time are kept.'],
      ['You are in control', 'Android will take you to a settings page where you turn it on. Turn it off there at any time.'],
    ],
    cta: 'Agree and open settings',
  },
} as const;

export default function Disclosure() {
  const { kind } = useLocalSearchParams<{ kind: 'sms' | 'notifications' }>();
  const c = COPY[kind === 'notifications' ? 'notifications' : 'sms'];
  const router = useRouter();
  const db = useDb();
  const set = useSettings((s) => s.set);
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  async function agree() {
    setBusy(true);
    try {
      if (kind === 'notifications') {
        await set(db, 'notifListenerEnabled', true);
        native?.openNotificationListenerSettings?.();
      } else {
        await set(db, 'smsDisclosureAccepted', true);
        const r = await requestSmsPermission(); // standard Android Allow / Don't allow dialog
        if (r !== 'granted') {
          Alert.alert('SMS access not granted', 'No problem. You can still add expenses manually, with Quick add, or by sharing a bank message into the app. You can allow SMS later in Android Settings.', [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => native?.openAppSettings?.() },
          ]);
        }
      }
      syncNativeSettings();
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SubScreen title="Your privacy">
      <View style={{ alignItems: 'center', paddingVertical: space.sm }}><Emblem icon="shield" size={150} /></View>
      <Text v="h1" accessibilityRole="header">{c.title}</Text>
      <Text color={colors.textMuted}>{c.lead}</Text>
      {c.points.map(([h, b]) => (
        <Card key={h} style={{ gap: space.xs }}>
          <Text v="title">{h}</Text>
          <Text color={colors.textMuted}>{b}</Text>
        </Card>
      ))}
      <View style={{ gap: space.sm }}>
        <Button title={c.cta} onPress={agree} loading={busy} />
        <Button title="No thanks" kind="ghost" onPress={() => router.back()} />
      </View>
    </SubScreen>
  );
}
