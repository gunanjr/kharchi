import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SubScreen, Text, Card, Row, Button, Enter } from '@/components/ui';
import { EmptyState } from '@/components/Feedback';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { deleteBill, listBills } from '@/features/bills/repo';
import { formatDay } from '@/lib/date';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { space, radius } from '@/theme/tokens';

export default function Bills() {
  const router = useRouter();
  const db = useDb();
  const { colors } = useTheme();
  const q = useQuery(async (d) => ({ waiting: await listBills(d, 'new'), done: await listBills(d, 'split') }), []);
  const d = q.data;

  const Row_ = ({ b, i }: { b: NonNullable<typeof d>['waiting'][number]; i: number }) => (
    <Enter i={i}>
      <Card onPress={() => router.push(`/bill/${b.id}`)} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }} accessibilityLabel={`Bill ${b.store ?? ''}`}>
        {b.photo_path ? <Image source={{ uri: `file://${b.photo_path}` }} style={{ width: 56, height: 72, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt }} /> : <View style={{ width: 56, height: 72, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}><Text>🧾</Text></View>}
        <View style={{ flex: 1 }}>
          <Text v="title" numberOfLines={1}>{b.store ?? 'Bill'}</Text>
          <Text v="small" color={colors.textMuted}>{formatDay(b.created_at)}{b.total ? ` · ${formatMoney(b.total, 'INR', { trimZeros: true })}` : ''}</Text>
        </View>
        {b.status === 'new' && <Button title="Delete" kind="ghost" onPress={async () => { await deleteBill(db, b.id); bumpData(); toast('Bill deleted'); }} />}
      </Card>
    </Enter>
  );

  return (
    <SubScreen title="Bills">
      {d && d.waiting.length === 0 && d.done.length === 0 && (
        <EmptyState art="inbox" title="No bills yet" body="Scan a bill with the widget or the Scan bill button, then split it item by item." action="Scan a bill" onAction={() => router.push('/scan-bill')} />
      )}
      {d && d.waiting.length > 0 && <Text v="caps" color={colors.textMuted}>WAITING TO BE SPLIT</Text>}
      {d?.waiting.map((b, i) => <Row_ key={b.id} b={b} i={i} />)}
      {d && d.done.length > 0 && <Text v="caps" color={colors.textMuted} style={{ marginTop: space.md }}>ALREADY SPLIT</Text>}
      {d?.done.map((b, i) => <Row_ key={b.id} b={b} i={i} />)}
      <Row style={{ marginTop: space.md }}><Button title="📷 Scan a bill" onPress={() => router.push('/scan-bill')} /></Row>
      <ToastHost />
    </SubScreen>
  );
}
