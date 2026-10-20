import React, { useState } from 'react';
import { Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SubScreen, Card, Text, Button, Row } from '@/components/ui';
import { ToastHost, toast } from '@/components/Toast';
import { native, isExpoGo } from '@/features/native/module';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function WidgetsAndShortcuts() {
  const router = useRouter();
  const { colors } = useTheme();
  const [persist, setPersist] = useState(false);
  const hasNative = !!native;
  const pin = (fn: (() => boolean | void) | undefined) => {
    const r = fn?.();
    if (r === false) toast('Your launcher can’t pin widgets from here. Long-press the home screen → Widgets → BruhMe.');
  };

  return (
    <SubScreen title="Widgets & shortcuts">
      {!hasNative && <Card style={{ backgroundColor: colors.primarySoft }}><Text>{isExpoGo ? 'Widgets and shortcuts need the installed app (Expo Go can’t load them). You can still try the panels below.' : 'Native module not present.'}</Text></Card>}

      <Card style={{ gap: space.md }}>
        <Text v="h2">Quick add widget</Text>
        <Text color={colors.textMuted}>One tap on your home screen drops a small panel from the top: amount, what for, Save. About three seconds.</Text>
        <Row style={{ gap: space.sm, flexWrap: 'wrap' }}>
          <Button title="Add to home screen" disabled={!hasNative} onPress={() => pin(native?.pinWidget)} />
          <Button title="Try the panel" kind="secondary" onPress={() => router.push('/quick-add')} />
        </Row>
      </Card>

      <Card style={{ gap: space.md }}>
        <Text v="h2">Scan bill widget</Text>
        <Text color={colors.textMuted}>At the supermarket or restaurant: tap, snap the bill, done. Split it item by item later, when you’re home and everyone’s there.</Text>
        <Row style={{ gap: space.sm, flexWrap: 'wrap' }}>
          <Button title="Add to home screen" disabled={!hasNative} onPress={() => pin(native?.pinScanWidget)} />
          <Button title="Try the panel" kind="secondary" onPress={() => router.push('/scan-bill')} />
        </Row>
      </Card>

      <Card style={{ gap: space.md }}>
        <Text v="h2">Long-press shortcuts</Text>
        <Text color={colors.textMuted}>Press and hold the app icon on your home screen to see “Add expense” and “Scan bill”.</Text>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}><Text v="title">Notification-shade button</Text><Text v="small" color={colors.textMuted}>A permanent “Add expense” action while you swipe down</Text></View>
          <Switch accessibilityLabel="Notification shade button" disabled={!hasNative} value={persist} trackColor={{ true: colors.primary }} onValueChange={(v) => { setPersist(v); native?.setPersistentAddNotification?.(v); }} />
        </Row>
      </Card>
      <ToastHost />
    </SubScreen>
  );
}
