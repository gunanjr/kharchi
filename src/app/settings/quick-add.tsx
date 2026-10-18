import React, { useState } from 'react';
import { Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SubScreen, Card, Text, Button, Row } from '@/components/ui';
import { Slider } from '@/components/Slider';
import { ToastHost, toast } from '@/components/Toast';
import { native, appVariant, isExpoGo, experimentalEnabled } from '@/features/native/module';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useDb } from '@/db/provider';
import { space } from '@/theme/tokens';

const GUIDES = [
  ['Pixel (Quick Tap)', 'Settings → System → Gestures → Quick Tap → turn on “Use Quick Tap” → choose “Open app” → pick this app’s shortcut “Add expense”.'],
  ['Samsung (back-tap)', 'Install Good Lock → RegiStar → Back-tap action → Double tap → “Open app” (or Shortcut) → Add expense.'],
  ['Nothing / OnePlus / Xiaomi / Realme', 'Look for “Gestures”, “Shortcuts” or “Quick ball” in Settings and bind a double-tap / back-tap to the “Add expense” launcher shortcut (long-press the app icon to find it).'],
  ['Any phone', 'Add the Add expense tile to Quick Settings (swipe down twice) or place the widget on your home screen: one tap, same panel.'],
];

export default function QuickAddSettings() {
  const router = useRouter();
  const db = useDb();
  const { colors } = useTheme();
  const s = useSettings();
  const [persist, setPersist] = useState(false);
  const [sens, setSens] = useState(50);
  const hasNative = !!native;

  return (
    <SubScreen title="Quick add">
      {!hasNative && <Card style={{ backgroundColor: colors.primarySoft }}><Text>{isExpoGo ? 'Tile, widget and shortcut need the dev build (Expo Go can’t load native code). You can still try the panel below.' : 'Native module not present.'}</Text></Card>}
      <Card style={{ gap: space.md }}>
        <Text v="h2">Try it</Text>
        <Text color={colors.textMuted}>Amount, what for, Save. About three seconds.</Text>
        <Button title="Open the quick panel" onPress={() => router.push('/quick-add')} />
      </Card>

      <Card style={{ gap: space.md }}>
        <Text v="h2">1. Quick Settings tile</Text>
        <Text color={colors.textMuted}>Swipe down twice, tap the pencil, drag “Add expense” into your tiles.</Text>
        <Button title="Add tile now" kind="secondary" disabled={!hasNative} onPress={() => native?.requestAddTile?.()} />
      </Card>

      <Card style={{ gap: space.md }}>
        <Text v="h2">2. Shortcut & widget</Text>
        <Text color={colors.textMuted}>Long-press the app icon for “Add expense”. Or pin the widget to your home screen.</Text>
        <Button title="Pin home-screen widget" kind="secondary" disabled={!hasNative} onPress={() => (native?.pinWidget?.() === false ? toast('Your launcher doesn’t support pinning. Add it from the widgets list.') : null)} />
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}><Text v="title">Notification-shade button</Text><Text v="small" color={colors.textMuted}>A permanent “Add expense” action</Text></View>
          <Switch accessibilityLabel="Notification shade button" disabled={!hasNative} value={persist} trackColor={{ true: colors.primary }} onValueChange={(v) => { setPersist(v); native?.setPersistentAddNotification?.(v); }} />
        </Row>
      </Card>

      <Card style={{ gap: space.md }}>
        <Text v="h2">3. Double-tap the back of your phone</Text>
        <Text color={colors.textMuted}>Android has no public API for the back-tap gesture, so apps can’t listen for it directly. The reliable way is to bind your phone’s own gesture to our shortcut:</Text>
        {GUIDES.map(([h, b]) => (
          <View key={h} style={{ gap: 2 }}>
            <Text v="title">{h}</Text>
            <Text v="small" color={colors.textMuted}>{b}</Text>
          </View>
        ))}
      </Card>

      {appVariant === 'full' && experimentalEnabled && (
        <Card style={{ gap: space.md, borderColor: colors.warn }}>
          <Text v="h2">4. Experimental detector</Text>
          <Text color={colors.textMuted}>An always-on motion listener that tries to catch a double tap. It can misfire and it uses battery because it keeps a foreground service running. Off by default.</Text>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text v="title">Enable detector</Text>
            <Switch
              accessibilityLabel="Enable experimental double-tap detector"
              disabled={!hasNative}
              value={s.doubleTapExperimental}
              trackColor={{ true: colors.primary }}
              onValueChange={async (v) => {
                const ok = native?.setDoubleTapEnabled?.(v, sens);
                if (v && !ok) return toast('This phone has no usable motion sensor');
                await s.set(db, 'doubleTapExperimental', v);
              }}
            />
          </Row>
          <Text v="caps" color={colors.textMuted}>SENSITIVITY</Text>
          <Slider value={sens} onChange={(v) => { setSens(v); if (s.doubleTapExperimental) native?.setDoubleTapEnabled?.(true, v); }} label="Sensitivity" />
          <Text v="small" color={colors.warn}>⚠ Battery: expect a noticeable drain. Rate-limited to one trigger every 2 seconds.</Text>
        </Card>
      )}
      <ToastHost />
    </SubScreen>
  );
}
