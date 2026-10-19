import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Sheet } from '@/components/Sheet';
import { Button, Row, Text } from '@/components/ui';
import { useDb, bumpData } from '@/db/provider';
import { addBill, addSampleBill } from '@/features/bills/repo';
import { canScanBills } from '@/features/bills/ocr';
import { parseBillRows } from '@/features/bills/parse';
import { SAMPLE_BILLS } from '@/features/bills/samples';
import { native } from '@/features/native/module';
import { finishQuickAdd } from '@/features/native/quickAdd';
import { appConfig } from '@/config/app';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

/**
 * "Scan a bill" panel: take the photo now, split it later from Home.
 * Opened from the home-screen widget / launcher shortcut (external, `?src=ext`, drops from the top over whatever
 * you were doing) or from inside the app.
 */
export default function ScanBill() {
  const router = useRouter();
  const db = useDb();
  const { colors } = useTheme();
  const { src, groupId } = useLocalSearchParams<{ src?: string; groupId?: string }>();
  const external = !!src;
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const close = () => {
    if (external && finishQuickAdd()) return;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  async function grab(kind: 'camera' | 'gallery') {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const path = await (kind === 'camera' ? native?.captureBillPhoto?.() : native?.pickBillPhoto?.());
      if (!path) { setMsg('No photo taken.'); return; }
      const id = await addBill(db, path);
      haptic.success();
      bumpData();
      // Inside the app there is nothing to "come back to": go straight to choosing who had what.
      if (!external) { router.replace(`/bill/${id}${groupId ? `?groupId=${groupId}` : ''}`); return; }
      setSavedId(id);
    } catch (e) {
      setMsg(`Couldn’t get the photo: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function sample() {
    const s = SAMPLE_BILLS[0];
    const id = await addSampleBill(db, parseBillRows(s.rows));
    bumpData();
    setSavedId(id);
  }

  function splitNow() {
    if (!savedId) return;
    const q = groupId ? `?groupId=${groupId}` : '';
    if (external) {
      Linking.openURL(`${appConfig.scheme}://bill/${savedId}${q}`).catch(() => {});
      finishQuickAdd();
    } else router.replace(`/bill/${savedId}${q}`);
  }

  return (
    <Sheet from="top" onClose={close}>
      <Text v="h2" accessibilityRole="header">Scan a bill</Text>
      {savedId ? (
        <View style={{ gap: space.md }}>
          <Text v="title">Saved ✓</Text>
          <Text color={colors.textMuted}>Your bill is waiting on Home. Split it now, or later when everyone’s together.</Text>
          <Row style={{ gap: space.sm }}>
            <Button title="Split now" onPress={splitNow} style={{ flex: 1 }} />
            <Button title="Done" kind="secondary" onPress={close} style={{ flex: 1 }} />
          </Row>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <Text color={colors.textMuted}>
            Snap the bill now. The app reads the items on your phone (no internet) and you choose who had what later.
          </Text>
          <Row style={{ gap: space.sm }}>
            <Button title="📷  Take photo" onPress={() => grab('camera')} loading={busy} disabled={!native?.captureBillPhoto} style={{ flex: 1 }} />
            <Button title="Gallery" kind="secondary" onPress={() => grab('gallery')} disabled={busy || !native?.pickBillPhoto} style={{ flex: 1 }} />
          </Row>
          {!canScanBills() && (
            <View style={{ gap: space.sm }}>
              <Text v="small" color={colors.textMuted}>Photo scanning needs the installed app (Expo Go can’t load it). You can still try the splitting with a sample bill:</Text>
              <Button title="Try a sample supermarket bill" kind="secondary" onPress={sample} />
            </View>
          )}
          {msg ? <Text v="small" color={colors.danger}>{msg}</Text> : null}
        </View>
      )}
    </Sheet>
  );
}
