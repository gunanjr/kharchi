import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { SubScreen, Card, Text, Button, Row } from '@/components/ui';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, bumpData } from '@/db/provider';
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
  async function paste() {
    const text = await Clipboard.getStringAsync();
    if (!text) return toast('Copy a bank message first, then tap this');
    const r = await ingestSharedText(db, text);
    bumpData();
    if (r.status === 'created') router.push({ pathname: '/import-review', params: { id: r.pendingId } });
    else toast(r.status === 'duplicate' ? 'Already captured' : 'That doesn’t look like a transaction');
  }

  return (
    <SubScreen title="Import from a message">
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

      <ToastHost />
    </SubScreen>
  );
}
