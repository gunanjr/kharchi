import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SubScreen, Card, Text, Row, Button, Chip, Field, MoneyText } from '@/components/ui';
import { ToastHost, toast } from '@/components/Toast';
import { Sheet } from '@/components/Sheet';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { ensureSelf, groupMembers, listGroups, listPeople } from '@/features/groups/repo';
import { finishBill, getBill, parsedFromBill, saveParsed } from '@/features/bills/repo';
import { canScanBills, parsePastedBill, scanBillPhoto } from '@/features/bills/ocr';
import { assignRestToAll, billExtra, buildItemizedSplit, itemsSum, toggleAssignee, type AssignedItem } from '@/features/bills/assign';
import { SAMPLE_BILLS } from '@/features/bills/samples';
import type { ParsedBill } from '@/features/bills/types';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, type as T } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

const WARN: Record<string, string> = {
  no_items: 'I couldn’t read any items. Add them by hand, or retake the photo flat and well lit.',
  items_missing: 'The items add up to much less than the bill total. Some lines may be missing: add them with “+ Add item”.',
  items_exceed_total: 'The items add up to more than the bill total. Check the prices or the total.',
  total_unreliable: 'The total looks wrong. Please check it.',
  no_total: 'I couldn’t find the bill total. Type it in below.',
};

export default function BillScreen() {
  const { id, groupId: groupParam } = useLocalSearchParams<{ id: string; groupId?: string }>();
  const router = useRouter();
  const db = useDb();
  const { colors } = useTheme();
  const bill = useQuery((d) => getBill(d, id), [id]);
  const groups = useQuery((d) => listGroups(d), []);
  const [groupId, setGroupId] = useState<string | null>(groupParam ?? null);
  const members = useQuery(async (d) => (groupId ? groupMembers(d, groupId) : listPeople(d)), [groupId]);
  const [meId, setMeId] = useState('');
  const [paidBy, setPaidBy] = useState<string | null>(null);

  const [phase, setPhase] = useState<'loading' | 'review' | 'error'>('loading');
  const [error, setError] = useState('');
  const [store, setStore] = useState('');
  const [items, setItems] = useState<AssignedItem[]>([]);
  const [totalText, setTotalText] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [photoOpen, setPhotoOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { ensureSelf(db).then((m) => { setMeId(m.id); setPaidBy((p) => p ?? m.id); }); }, [db]);
  useEffect(() => { if (!groupId && groups.data?.length && !groupParam) setGroupId(groups.data[0].id); }, [groups.data, groupId, groupParam]);

  const applyParsed = (p: ParsedBill) => {
    setStore(p.store ?? '');
    setItems(p.items.map((i) => ({ id: i.id, name: i.name, amount: i.amount, assignees: [] })));
    setTotalText(p.total ? String(p.total / 100) : '');
    setWarnings(p.warnings);
    setPhase('review');
  };

  // load: cached parse, or run OCR on the photo
  const b = bill.data;
  useEffect(() => {
    if (!b || phase !== 'loading') return;
    const cached = parsedFromBill(b);
    if (cached) return applyParsed(cached);
    if (!b.photo_path || !canScanBills()) { setPhase('review'); setWarnings(['no_items']); return; }
    let live = true;
    scanBillPhoto(b.photo_path)
      .then(async (p) => { if (!live) return; await saveParsed(db, b.id, p); applyParsed(p); })
      .catch((e) => { if (live) { setError((e as Error).message); setPhase('error'); } });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b?.id, phase]);

  const people = members.data ?? [];
  const nameOf = (pid: string) => (pid === meId ? 'You' : people.find((p) => p.id === pid)?.name ?? '?');
  const total = parseAmountToMinor(totalText) ?? 0;
  const sum = itemsSum(items);
  const extra = total ? billExtra(total, items) : 0;
  const built = buildItemizedSplit(items, total || sum);
  const unassigned = items.filter((i) => i.assignees.length === 0).length;
  const everyone = people.map((p) => p.id);

  const setItem = (iid: string, patch: Partial<AssignedItem>) => setItems((a) => a.map((x) => (x.id === iid ? { ...x, ...patch } : x)));

  async function save() {
    if (!built.ok || !b) return toast(built.ok ? 'Nothing to save' : built.error);
    const t = total || sum;
    setSaving(true);
    try {
      await finishBill(db, b.id, {
        groupId, description: store.trim() || 'Bill', amount: t, currency: 'INR', rate: 1,
        payers: { [paidBy ?? meId]: t }, split: built.split,
      }, b.photo_path);
      haptic.success();
      bumpData();
      toast('Bill split ✓');
      if (groupId) router.replace(`/group/${groupId}`);
      else router.back();
    } catch (e) {
      haptic.warn();
      toast((e as Error).message);
      setSaving(false);
    }
  }

  if (!b) return <SubScreen title="Bill"><Text>Loading…</Text></SubScreen>;

  return (
    <SubScreen title={store || 'Split bill'} scroll={false}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        {phase === 'loading' && (
          <Card style={{ alignItems: 'center', gap: space.md, padding: space.xl }}>
            <ActivityIndicator color={colors.primary} />
            <Text v="title">Reading your bill…</Text>
            <Text v="small" color={colors.textMuted}>On your phone, no internet. A few seconds.</Text>
          </Card>
        )}
        {phase === 'error' && (
          <Card style={{ gap: space.md }}>
            <Text v="title">Couldn’t read the photo</Text>
            <Text color={colors.textMuted}>{error}</Text>
            <Row><Button title="Try again" onPress={() => setPhase('loading')} /><Button title="Enter items by hand" kind="secondary" onPress={() => setPhase('review')} /></Row>
          </Card>
        )}

        {phase === 'review' && (
          <>
            <Row style={{ alignItems: 'flex-start' }}>
              {b.photo_path ? (
                <Pressable accessibilityRole="imagebutton" accessibilityLabel="View the bill photo" onPress={() => setPhotoOpen(true)}>
                  <Image source={{ uri: `file://${b.photo_path}` }} style={{ width: 64, height: 84, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt }} />
                </Pressable>
              ) : null}
              <View style={{ flex: 1 }}><Field label="Store / description" value={store} onChangeText={setStore} placeholder="Where was this?" /></View>
            </Row>

            {warnings.map((w) => WARN[w] ? <Card key={w} style={{ backgroundColor: colors.primarySoft }}><Text v="small">⚠️ {WARN[w]}</Text></Card> : null)}

            <Text v="caps" color={colors.textMuted}>GROUP</Text>
            <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
              {(groups.data ?? []).map((g) => <Chip key={g.id} label={`${g.icon ?? ''} ${g.name}`.trim()} selected={groupId === g.id} onPress={() => { setGroupId(g.id); setItems((a) => a.map((x) => ({ ...x, assignees: [] }))); }} />)}
              <Chip label="Just friends" selected={groupId === null} onPress={() => { setGroupId(null); setItems((a) => a.map((x) => ({ ...x, assignees: [] }))); }} />
            </Row>
            <Text v="caps" color={colors.textMuted}>WHO PAID THE BILL</Text>
            <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
              {people.map((p) => <Chip key={p.id} label={nameOf(p.id)} selected={paidBy === p.id} onPress={() => setPaidBy(p.id)} />)}
            </Row>

            <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
              <Text v="h2">Who had what?</Text>
              {items.length > 0 && <Text v="small" color={unassigned ? colors.warn : colors.income}>{unassigned ? `${unassigned} left` : 'all assigned ✓'}</Text>}
            </Row>
            <Text v="small" color={colors.textMuted}>Tap a name under each item. Tap several to share it equally. Fix any wrong name or price.</Text>

            {items.map((it) => (
              <Card key={it.id} style={{ gap: space.sm, borderColor: it.assignees.length ? colors.border : colors.warn }}>
                <Row style={{ alignItems: 'center' }}>
                  <TextInput value={it.name} onChangeText={(t) => setItem(it.id, { name: t })} accessibilityLabel="Item name" style={[T.title, { flex: 1, color: colors.text, padding: 0 }]} />
                  <TextInput
                    value={String(it.amount / 100)} onChangeText={(t) => setItem(it.id, { amount: parseAmountToMinor(t) ?? 0 })} keyboardType="decimal-pad" accessibilityLabel={`${it.name} price`}
                    style={[T.money, { color: colors.text, minWidth: 80, textAlign: 'right', fontVariant: ['tabular-nums'], padding: 0 }]}
                  />
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${it.name}`} onPress={() => setItems((a) => a.filter((x) => x.id !== it.id))} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                    <Text color={colors.textMuted}>✕</Text>
                  </Pressable>
                </Row>
                <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
                  {people.map((p) => <Chip key={p.id} label={nameOf(p.id)} selected={it.assignees.includes(p.id)} onPress={() => setItems((a) => toggleAssignee(a, it.id, p.id))} />)}
                  <Chip label="Everyone" selected={everyone.length > 0 && it.assignees.length === everyone.length} onPress={() => setItem(it.id, { assignees: it.assignees.length === everyone.length ? [] : everyone })} />
                </Row>
              </Card>
            ))}

            <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
              <Button title="+ Add item" kind="secondary" onPress={() => setItems((a) => [...a, { id: `m${Date.now()}`, name: '', amount: 0, assignees: [] }])} />
              {unassigned > 0 && <Button title="Split the rest equally" kind="ghost" onPress={() => setItems((a) => assignRestToAll(a, everyone))} />}
              <Button title="Paste bill text" kind="ghost" onPress={() => setPasteOpen(true)} />
            </Row>

            <Card style={{ gap: space.sm }}>
              <Row style={{ justifyContent: 'space-between' }}><Text>Items</Text><MoneyText v="body">{formatMoney(sum, 'INR')}</MoneyText></Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text>Tax, charges, round-off, discount</Text>
                <MoneyText v="body" color={extra < 0 ? colors.income : colors.text}>{formatMoney(extra, 'INR', { sign: true })}</MoneyText>
              </Row>
              <Field label="Bill total (what was paid)" value={totalText} onChangeText={(t) => setTotalText(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" />
              <Text v="small" color={colors.textMuted}>Tax and discounts are shared in proportion to what each person had.</Text>
            </Card>

            {built.ok && (
              <Card style={{ gap: 4 }}>
                <Text v="caps" color={colors.textMuted}>EACH PERSON PAYS</Text>
                {Object.entries(built.shares).map(([pid, v]) => (
                  <Row key={pid} style={{ justifyContent: 'space-between' }}><Text>{nameOf(pid)}</Text><MoneyText v="body">{formatMoney(v, 'INR')}</MoneyText></Row>
                ))}
              </Card>
            )}
            {!built.ok && items.length > 0 && <Text v="small" color={colors.warn} accessibilityRole="alert">{built.error}</Text>}
          </>
        )}
      </ScrollView>

      {phase === 'review' && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Button title={built.ok ? `Split ${formatMoney(total || sum, 'INR', { trimZeros: true })}` : built.error} onPress={save} disabled={!built.ok} loading={saving} />
        </View>
      )}

      <Modal visible={pasteOpen} transparent animationType="none" onRequestClose={() => setPasteOpen(false)}>
        <Sheet onClose={() => setPasteOpen(false)}>
          <Text v="h2">Paste or type the bill</Text>
          <Text v="small" color={colors.textMuted}>One line per item, price at the end. Example: Paneer 250.00</Text>
          <TextInput
            value={pasteText} onChangeText={setPasteText} multiline accessibilityLabel="Bill text" placeholder={'Milk 1L 68.00\nBread 45.00\nTotal 113.00'} placeholderTextColor={colors.textMuted}
            style={[T.body, { minHeight: 140, textAlignVertical: 'top', color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space.md }]}
          />
          <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
            <Button title="Read it" onPress={() => { applyParsed(parsePastedBill(pasteText)); setPasteOpen(false); }} disabled={!pasteText.trim()} />
            <Button title="Use a sample" kind="secondary" onPress={() => { setPasteText(SAMPLE_BILLS[1].rows.join('\n')); }} />
          </Row>
        </Sheet>
      </Modal>

      <Modal visible={photoOpen} transparent animationType="fade" onRequestClose={() => setPhotoOpen(false)}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close photo" onPress={() => setPhotoOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' }}>
          {b.photo_path ? <Image source={{ uri: `file://${b.photo_path}` }} resizeMode="contain" style={{ width: '100%', height: '90%' }} /> : null}
        </Pressable>
      </Modal>
      <ToastHost />
    </SubScreen>
  );
}
