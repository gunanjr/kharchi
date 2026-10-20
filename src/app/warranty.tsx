import React, { useState } from 'react';
import { Alert, Image, Modal, ScrollView, View } from 'react-native';
import { SubScreen, Card, Text, Row, Button, Field, Chip, Press } from '@/components/ui';
import { EmptyState } from '@/components/Feedback';
import { Sheet } from '@/components/Sheet';
import { ToastHost, toast } from '@/components/Toast';
import { useDb } from '@/db/provider';
import { useSettings } from '@/store/settings';
import { ProGate } from '@/features/pro/ProGate';
import { canTakePhoto, captureReceiptPhoto, deleteReceipt, pickPhoto } from '@/features/tracker/receipts';
import { reminderTimes, sortWarranties, status, validateWarranty, type Warranty } from '@/features/warranty/warranty';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import { formatDay } from '@/lib/date';
import { notifyAt, notifyMessage } from '@/lib/notify';
import { uuid } from '@/lib/id';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/** "25/12/2025" or "25-12-2025" to a local date at noon; null if not a real date. */
function parseDate(t: string): number | null {
  const m = t.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const x = new Date(y, mo, d, 12);
  return x.getFullYear() === y && x.getMonth() === mo && x.getDate() === d ? x.getTime() : null;
}
const fmt = (t: number) => { const d = new Date(t); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };

function WarrantyForm({ initial, onSave, onDelete }: { initial: Warranty | null; onSave: (w: Warranty) => void; onDelete?: () => void }) {
  const { colors } = useTheme();
  const [item, setItem] = useState(initial?.item ?? '');
  const [store, setStore] = useState(initial?.store ?? '');
  const [date, setDate] = useState(fmt(initial?.boughtAt ?? Date.now()));
  const [months, setMonths] = useState(initial?.months ?? 12);
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount / 100) : '');
  const [receipt, setReceipt] = useState<string | null>(initial?.receipt ?? null);
  async function photo(kind: 'camera' | 'gallery') {
    try { const u = kind === 'camera' ? await captureReceiptPhoto() : await pickPhoto(); if (u) { if (receipt && receipt !== initial?.receipt) deleteReceipt(receipt); setReceipt(u); } } catch { toast('Couldn’t get that picture'); }
  }
  function save() {
    const boughtAt = parseDate(date);
    if (!boughtAt) return toast('Write the date as DD/MM/YYYY, for example 25/12/2025.');
    const err = validateWarranty({ item, months, boughtAt }, Date.now());
    if (err) return toast(err);
    const a = amount.trim() ? parseAmountToMinor(amount, 'INR') : null;
    if (amount.trim() && !a) return toast('That amount doesn’t look right.');
    onSave({ id: initial?.id ?? uuid(), item: item.trim(), store: store.trim(), boughtAt, months, amount: a, receipt, remindedFor: initial?.remindedFor });
  }
  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 640 }} contentContainerStyle={{ gap: space.lg, padding: space.lg }}>
      <Text v="h2">{initial ? 'Edit warranty' : 'Add a warranty'}</Text>
      <Field label="What did you buy?" value={item} onChangeText={setItem} placeholder="Phone, laptop, fridge" maxLength={50} />
      <Field label="Where (optional)" value={store} onChangeText={setStore} placeholder="Store or website" maxLength={50} />
      <Field label="Bought on (DD/MM/YYYY)" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" />
      <View style={{ gap: space.sm }}>
        <Text v="caps" color={colors.textMuted}>WARRANTY</Text>
        <Row style={{ gap: space.sm, flexWrap: 'wrap' }}>{[6, 12, 24, 36, 60].map((m) => <Chip key={m} label={m < 12 ? `${m} months` : `${m / 12} ${m === 12 ? 'year' : 'years'}`} selected={months === m} onPress={() => setMonths(m)} />)}</Row>
      </View>
      <Field label="Price (optional)" value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" />
      {receipt ? <Row style={{ gap: space.md }}><Image source={{ uri: receipt }} style={{ width: 56, height: 56, borderRadius: 12 }} /><Text v="small" style={{ flex: 1 }}>Bill attached</Text><Button title="Remove" kind="ghost" size="sm" onPress={() => setReceipt(null)} /></Row> : (
        <Row style={{ gap: space.sm }}>
          {canTakePhoto() ? <Button title="Snap the bill" icon="camera" kind="secondary" size="sm" onPress={() => photo('camera')} /> : null}
          <Button title="Gallery" icon="image" kind="secondary" size="sm" onPress={() => photo('gallery')} />
        </Row>
      )}
      <Button title="Save" onPress={save} />
      {onDelete ? <Button title="Delete" kind="ghost" onPress={onDelete} /> : null}
    </ScrollView>
  );
}

/** Warranty vault (Pro): bills and warranty end dates in one place, with reminders 30 and 7 days before. */
export default function WarrantyScreen() {
  const db = useDb();
  const { colors } = useTheme();
  const list = useSettings((s) => s.warranties);
  const set = useSettings((s) => s.set);
  const [editing, setEditing] = useState<Warranty | null | 'new'>(null);
  const now = Date.now();
  const sorted = sortWarranties(list, now);

  async function upsert(w: Warranty) {
    let next = w;
    const times = reminderTimes(w, Date.now());
    const end = status(w, Date.now()).end;
    if (times.length && w.remindedFor !== end) {
      let ok = false;
      for (const t of times) { const r = await notifyAt(t, `${w.item} warranty ends soon`, `Ends on ${formatDay(end)}. Check it now if anything needs a repair or replacement.`); if (r === 'scheduled') ok = true; else { toast(notifyMessage(r)); break; } }
      if (ok) { next = { ...w, remindedFor: end }; toast('Saved. You’ll get a reminder 30 and 7 days before it ends.'); }
    }
    await set(db, 'warranties', list.some((x) => x.id === w.id) ? list.map((x) => (x.id === w.id ? next : x)) : [...list, next]);
    setEditing(null);
  }

  return (
    <SubScreen title="Warranties" right={<Button title="Add" size="sm" icon="plus" onPress={() => setEditing('new')} />}>
      <ProGate title="Warranty vault" body="Keep the bill and the warranty end date for your phone, laptop or fridge in one place. BruhMe reminds you 30 and 7 days before a warranty ends.">
        {sorted.length === 0 ? <EmptyState art="wallet" title="No warranties yet" body="Add something you bought with a warranty and snap the bill. It stays on this phone." action="Add a warranty" onAction={() => setEditing('new')} /> : sorted.map((w) => {
          const st = status(w, now);
          return (
            <Press key={w.id} onPress={() => setEditing(w)} accessibilityLabel={`${w.item}, ${st.status}`}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: st.status === 'expired' ? 0.6 : 1 }}>
                {w.receipt ? <Image source={{ uri: w.receipt }} style={{ width: 48, height: 48, borderRadius: 12 }} /> : <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22 }}>🧾</Text></View>}
                <View style={{ flex: 1 }}>
                  <Text v="title" numberOfLines={1}>{w.item}</Text>
                  <Text v="small" color={st.status === 'ending' ? colors.link : colors.textMuted}>{st.status === 'expired' ? `Ended ${formatDay(st.end)}` : st.status === 'ending' ? `Ends in ${st.daysLeft} ${st.daysLeft === 1 ? 'day' : 'days'} · ${formatDay(st.end)}` : `Covered until ${formatDay(st.end)}`}{w.store ? ` · ${w.store}` : ''}</Text>
                </View>
                {w.amount ? <Text v="small" color={colors.textMuted}>{formatMoney(w.amount, 'INR', { compact: true })}</Text> : null}
              </Card>
            </Press>
          );
        })}
      </ProGate>
      <Modal visible={editing !== null} transparent animationType="none" onRequestClose={() => setEditing(null)}>
        <Sheet onClose={() => setEditing(null)}>
          {editing !== null ? <WarrantyForm initial={editing === 'new' ? null : editing} onSave={upsert} onDelete={editing !== 'new' ? () => Alert.alert(`Delete ${editing.item}?`, undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { if (editing.receipt) deleteReceipt(editing.receipt); await set(db, 'warranties', list.filter((x) => x.id !== editing.id)); setEditing(null); } }]) : undefined} /> : null}
        </Sheet>
      </Modal>
      <ToastHost />
    </SubScreen>
  );
}
