import React, { useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { MerchantTile } from '@/features/brands/MerchantTile';
import { SubScreen, Card, Text, Row, Button, Field, Segmented, IconTile, Press } from '@/components/ui';
import { EmptyState } from '@/components/Feedback';
import { CategoryChips } from '@/components/CategoryPicker';
import { Sheet } from '@/components/Sheet';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { addRecurring } from '@/features/tracker/recurring';
import { softDelete } from '@/db/rows';
import { useCategories } from '@/features/tracker/hooks';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import { formatDay } from '@/lib/date';
import type { Frequency } from '@/domain/types';
import { fonts, space } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

const FREQ: Record<string, string> = { weekly: 'Every week', monthly: 'Every month', yearly: 'Every year' };

function NewRecurring({ onDone }: { onDone: () => void }) {
  const db = useDb();
  const { categories } = useCategories();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [freq, setFreq] = useState<Frequency>('monthly');
  const [cat, setCat] = useState<string | null>(null);
  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 620 }} contentContainerStyle={{ gap: space.lg, padding: space.lg }}>
      <Text v="h2">New recurring expense</Text>
      <Field label="What" value={name} onChangeText={setName} placeholder="Netflix" autoFocus />
      <Field label="Amount (₹)" value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" />
      <Segmented options={(['weekly', 'monthly', 'yearly'] as Frequency[]).map((f) => ({ key: f, label: f[0].toUpperCase() + f.slice(1) }))} value={freq} onChange={setFreq} />
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}><CategoryChips categories={categories.filter((c) => c.kind === 'expense')} value={cat} onChange={setCat} /></Row>
      <Button title="Add" kind="accent" onPress={async () => {
        const m = parseAmountToMinor(amount);
        if (!m || !name.trim()) return toast('Add a name and amount');
        await addRecurring(db, { type: 'expense', amount: m, merchant: name.trim(), category_id: cat }, freq, Date.now());
        bumpData(); toast('Added. The first entry is logged now.'); onDone();
      }} />
    </ScrollView>
  );
}

/** Recurring: what logs itself on time. Tap one to stop it; New adds another. */
export default function Recurring() {
  const db = useDb();
  const { colors } = useTheme();
  const [creating, setCreating] = useState(false);
  const q = useQuery((d) => d.all<any>(`SELECT * FROM recurring WHERE deleted_at IS NULL AND scope='personal' ORDER BY next_due`), []);
  const rows = (q.data ?? []).map((r) => ({ r, t: JSON.parse(r.template) as { merchant?: string; amount: number } }));
  const monthly = rows.reduce((a, { r, t }) => a + (r.frequency === 'weekly' ? t.amount * 4.33 : r.frequency === 'yearly' ? t.amount / 12 : t.amount), 0);
  function stop(id: string, name: string) {
    Alert.alert(`Stop ${name}?`, 'Past entries stay. It just stops logging itself.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: async () => { await softDelete(db, 'recurring', id); bumpData(); } },
    ]);
  }
  return (
    <SubScreen title="Recurring" right={<Button title="New" size="sm" icon="plus" onPress={() => setCreating(true)} />}>
      {q.data?.length === 0 ? <EmptyState art="chart" title="Nothing recurring" body="Add rent, subscriptions or SIPs and they log themselves on time." action="Add one" onAction={() => setCreating(true)} /> : null}
      {rows.length ? (
        <Card tone="ink" style={{ gap: 6 }}>
          <Text v="caps" color={colors.onHeroMuted}>{rows.length} RECURRING</Text>
          <Text style={{ fontFamily: fonts.brandBlack, fontSize: 28, lineHeight: 34, color: colors.onHero }}>{formatMoney(Math.round(monthly / 100) * 100, 'INR', { compact: true })} a month</Text>
          <Text v="small" color={colors.onHeroMuted}>Each one logs itself on its date. Tap one to stop it.</Text>
        </Card>
      ) : null}
      {rows.length ? (
        <Card pad={false} style={{ paddingHorizontal: space.lg }}>
          {rows.map(({ r, t }, i) => (
            <Press key={r.id} onPress={() => stop(r.id, t.merchant ?? 'this')} accessibilityLabel={`${t.merchant ?? 'Recurring'}, tap to stop`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
              <MerchantTile name={t.merchant} fallback={<IconTile size={40} icon="repeat" />} />
              <View style={{ flex: 1 }}>
                <Text v="title" numberOfLines={1}>{t.merchant ?? 'Recurring'}</Text>
                <Text v="small" color={colors.textMuted}>{FREQ[r.frequency] ?? r.frequency} · next {formatDay(r.next_due)}</Text>
              </View>
              <Text v="title">{formatMoney(t.amount, 'INR', { trimZeros: true })}</Text>
            </Press>
          ))}
        </Card>
      ) : null}
      <Modal visible={creating} transparent animationType="none" onRequestClose={() => setCreating(false)}>
        <Sheet onClose={() => setCreating(false)}><NewRecurring onDone={() => setCreating(false)} /></Sheet>
      </Modal>
      <ToastHost />
    </SubScreen>
  );
}
