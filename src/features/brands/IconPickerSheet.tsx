import React, { useState } from 'react';
import { Modal, View } from 'react-native';
import { Sheet } from '@/components/Sheet';
import { toast } from '@/components/Toast';
import { Button, Text } from '@/components/ui';
import { useDb } from '@/db/provider';
import { native } from '@/features/native/module';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { merchantKey } from './match';

/**
 * Let the user give a merchant their own picture (a shop sign, a product, a logo from their gallery). It reuses the
 * app's existing no-permission photo flow: the phone's own camera app or the system photo picker, stored privately on
 * the phone. The picture is used for every entry with that merchant name.
 */
export function IconPickerSheet({ merchant, onClose }: { merchant: string | null; onClose: () => void }) {
  const db = useDb();
  const { colors } = useTheme();
  const icons = useSettings((s) => s.merchantIcons);
  const set = useSettings((s) => s.set);
  const [busy, setBusy] = useState(false);
  if (!merchant) return null;
  const key = merchantKey(merchant);
  const current = icons[key];

  async function grab(kind: 'camera' | 'gallery') {
    setBusy(true);
    try {
      const path = await (kind === 'camera' ? native?.captureBillPhoto?.() : native?.pickBillPhoto?.());
      if (path) {
        if (current && current !== path) native?.deleteBillPhoto?.(current);
        await set(db, 'merchantIcons', { ...icons, [key]: path });
        toast('Icon saved');
        onClose();
      }
    } catch {
      toast('Couldn’t get that picture. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (current) native?.deleteBillPhoto?.(current);
    const next = { ...icons };
    delete next[key];
    await set(db, 'merchantIcons', next);
    onClose();
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Sheet onClose={onClose}>
        <View style={{ gap: space.lg, padding: space.lg }}>
          <View style={{ gap: 2 }}>
            <Text v="h2">Icon for {merchant}</Text>
            <Text v="small" color={colors.textMuted}>Snap it or pick a picture. It shows on every {merchant} entry so you spot it at a glance. It stays on this phone.</Text>
          </View>
          {!native?.captureBillPhoto ? <Text v="small" color={colors.textMuted}>Photos work in the installed app, not in Expo Go or the browser preview.</Text> : null}
          <Button title="Take a photo" icon="camera" onPress={() => grab('camera')} loading={busy} disabled={!native?.captureBillPhoto} />
          <Button title="Choose from gallery" kind="secondary" onPress={() => grab('gallery')} disabled={busy || !native?.pickBillPhoto} />
          {current ? <Button title="Remove my icon" kind="ghost" onPress={remove} /> : null}
        </View>
      </Sheet>
    </Modal>
  );
}
