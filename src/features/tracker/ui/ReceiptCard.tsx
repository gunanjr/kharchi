import React from 'react';
import { Image, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Card, Text, Row, Button, IconTile } from '@/components/ui';
import { toast } from '@/components/Toast';
import { useDb, bumpData } from '@/db/provider';
import { updateTransaction } from '../repo';
import { deleteReceipt, isPdf, pickReceipt } from '../receipts';
import { usePlus } from '@/features/entitlements/usePlus';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/** Receipt vault entry for one transaction: attach, view, share or remove an image or PDF kept on the phone. */
export function ReceiptCard({ txId, uri }: { txId: string; uri: string | null }) {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const plus = usePlus();
  const allowed = plus.has('receipt_vault');

  async function attach() {
    if (!allowed) {
      toast('The receipt vault is a Plus feature');
      return router.push('/plus');
    }
    try {
      const next = await pickReceipt();
      if (!next) return;
      if (uri) deleteReceipt(uri);
      await updateTransaction(db, txId, { receipt_uri: next });
      bumpData();
      toast('Receipt saved on this phone');
    } catch {
      toast('Could not save that file');
    }
  }
  async function remove() {
    deleteReceipt(uri);
    await updateTransaction(db, txId, { receipt_uri: null });
    bumpData();
    toast('Receipt removed');
  }

  if (!uri)
    return (
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconTile icon={allowed ? 'tag' : 'lock'} size={44} />
        <View style={{ flex: 1 }}>
          <Text v="title">Receipt</Text>
          <Text v="small" color={colors.textMuted}>{allowed ? 'Attach an image or PDF. It stays on your phone.' : 'Keep receipts with your transactions. Plus feature.'}</Text>
        </View>
        <Button title={allowed ? 'Attach' : 'Plus'} size="sm" kind="secondary" onPress={attach} />
      </Card>
    );
  return (
    <Card style={{ gap: space.md }}>
      <Text v="caps" color={colors.textMuted}>RECEIPT</Text>
      {isPdf(uri) ? (
        <Row style={{ gap: space.md }}><IconTile icon="download" size={48} /><Text v="title">PDF receipt</Text></Row>
      ) : (
        <Image source={{ uri }} accessibilityLabel="Receipt" resizeMode="cover" style={{ width: '100%', height: 220, borderRadius: 18, backgroundColor: colors.surfaceAlt }} />
      )}
      <Row style={{ gap: space.sm, flexWrap: 'wrap' }}>
        <Button title="Share" size="sm" kind="secondary" icon="share" onPress={async () => { if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri); }} />
        <Button title="Replace" size="sm" kind="secondary" onPress={attach} />
        <Button title="Remove" size="sm" kind="ghost" onPress={remove} />
      </Row>
    </Card>
  );
}
