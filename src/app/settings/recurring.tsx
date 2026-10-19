import React, { useState } from 'react';
import { SubScreen, Card, Text, Row, Button, Field, Segmented, IconTile } from '@/components/ui';
import { EmptyState } from '@/components/Feedback';
import { CategoryChips } from '@/components/CategoryPicker';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { addRecurring } from '@/features/tracker/recurring';
import { softDelete } from '@/db/rows';
import { useCategories } from '@/features/tracker/hooks';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import { formatDay } from '@/lib/date';
import type { Frequency } from '@/domain/types';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export default function Recurring() {
  const db = useDb();
  const { colors } = useTheme();
  const { categories } = useCategories();
  const q = useQuery((d) => d.all<any>(`SELECT * FROM recurring WHERE deleted_at IS NULL AND scope='personal' ORDER BY next_due`), []);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [freq, setFreq] = useState<Frequency>('monthly');
  const [cat, setCat] = useState<string | null>(null);

  return (
    <SubScreen title="Recurring">
      {q.data?.length === 0 && <EmptyState art="chart" title="Nothing recurring" body="Add rent, subscriptions or SIPs and they log themselves on time." />}
      {q.data?.map((r) => {
        const t = JSON.parse(r.template);
        return (
          <Card key={r.id} style={{ gap: space.xs }}>
            <Row style={{ justifyContent: 'space-between', gap: space.md }}>
              <Row style={{ flex: 1, gap: space.md }}>
                <IconTile size={40} icon="repeat" />
                <Text v="title" numberOfLines={1} style={{ flex: 1 }}>{t.merchant ?? 'Recurring'} · {formatMoney(t.amount, 'INR', { trimZeros: true })}</Text>
              </Row>
              <Button title="Stop" kind="ghost" size="sm" onPress={async () => { await softDelete(db, 'recurring', r.id); bumpData(); }} />
            </Row>
            <Text v="small" color={colors.textMuted}>{r.frequency} · next {formatDay(r.next_due)}</Text>
          </Card>
        );
      })}
      <Card style={{ gap: space.md }}>
        <Text v="h2">New recurring expense</Text>
        <Field label="What" value={name} onChangeText={setName} placeholder="Netflix" />
        <Field label="Amount (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <Segmented options={(['weekly', 'monthly', 'yearly'] as Frequency[]).map((f) => ({ key: f, label: f[0].toUpperCase() + f.slice(1) }))} value={freq} onChange={setFreq} />
        <Row style={{ flexWrap: 'wrap', gap: space.sm }}><CategoryChips categories={categories.filter((c) => c.kind === 'expense')} value={cat} onChange={setCat} /></Row>
        <Button title="Add" onPress={async () => {
          const m = parseAmountToMinor(amount);
          if (!m || !name.trim()) return toast('Add a name and amount');
          await addRecurring(db, { type: 'expense', amount: m, merchant: name.trim(), category_id: cat }, freq, Date.now());
          setName(''); setAmount(''); bumpData(); toast('Added. First entry is logged now.');
        }} />
      </Card>
      <ToastHost />
    </SubScreen>
  );
}
