import React, { useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Text, Button, Row, Field, Card, Money, RoundButton, Tag, Press, Chip } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { CategoryChips } from '@/components/CategoryPicker';
import { CategoryDot } from '@/components/TxRow';
import { ErrorState } from '@/components/Feedback';
import { ReceiptCard } from '@/features/tracker/ui/ReceiptCard';
import { setExcluded } from '@/features/tracker/exclude';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { deleteTransaction, getTransaction, undeleteTransaction, updateTransaction } from '@/features/tracker/repo';
import { useCategories } from '@/features/tracker/hooks';
import { learnMerchant } from '@/features/parser/merchants';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import { formatDay, formatTime } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { layout, space } from '@/theme/tokens';
import { parseTags, readTags } from '@/features/tracker/tags';
import { BrandIcon } from '@/features/brands/BrandIcon';
import { IconPickerSheet } from '@/features/brands/IconPickerSheet';
import { resolveBrand } from '@/features/brands/match';
import { useMerchantPhoto } from '@/features/brands/custom';

export default function TxDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const { byId, categories } = useCategories();
  const q = useQuery((d) => getTransaction(d, id), [id]);
  const [editing, setEditing] = useState(false);
  const spaces = useSettings((st) => st.spaces);
  const [iconOpen, setIconOpen] = useState(false);
  const photo = useMerchantPhoto(q.data?.merchant);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [tagText, setTagText] = useState('');

  const tx = q.data;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  if (q.error) return <Screen><ErrorState error={q.error} onRetry={q.refetch} /></Screen>;
  if (!tx || tx.deleted_at) return <Screen><Text style={{ padding: space.xl }}>Transaction not found.</Text><Button title="Back" onPress={back} /></Screen>;

  const cat = tx.category_id ? byId.get(tx.category_id) : null;
  const kinds = categories.filter((c) => c.kind === (tx.type === 'income' ? 'income' : 'expense'));
  const readOnly = !!tx.group_expense_id;

  async function changeCategory(catId: string) {
    await updateTransaction(db, tx!.id, { category_id: catId });
    if (tx!.merchant) await learnMerchant(db, tx!.merchant, catId);
    bumpData();
  }
  async function saveEdit() {
    const m = parseAmountToMinor(amount, tx!.currency);
    if (!m) return toast('Enter a valid amount');
    await updateTransaction(db, tx!.id, { amount: m, merchant: merchant.trim() || null, note: note.trim() || null, tags: parseTags(tagText) });
    setEditing(false);
    bumpData();
    toast('Updated');
  }
  async function remove() {
    await deleteTransaction(db, tx!.id);
    bumpData();
    const tid = tx!.id;
    back();
    toast('Deleted', { label: 'Undo', run: async () => { await undeleteTransaction(db, tid); bumpData(); } });
  }

  return (
    <Screen>
      <Row style={{ paddingHorizontal: layout.gutter, paddingVertical: space.sm, justifyContent: 'space-between', minHeight: 64 }}>
        <RoundButton icon="back" label="Back" onPress={back} />
        <Row style={{ gap: space.sm }}>
          {!readOnly && !editing && <Button title="Edit" kind="secondary" size="sm" icon="edit" onPress={() => { setAmount(String(tx.amount / 100)); setMerchant(tx.merchant ?? ''); setNote(tx.note ?? ''); setTagText(readTags(tx.tags).join(', ')); setEditing(true); }} />}
          <Button title="Delete" kind="danger" size="sm" icon="trash" onPress={remove} />
        </Row>
      </Row>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: space.md, paddingBottom: 60, gap: space.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.md }}>
          {tx.merchant && !readOnly ? (
            <Press onPress={() => setIconOpen(true)} accessibilityLabel={`Change icon for ${tx.merchant}`} scale={0.96}>
              {photo || resolveBrand(tx.merchant) ? <BrandIcon brand={resolveBrand(tx.merchant)} photo={photo} size={76} /> : <CategoryDot cat={cat} size={76} />}
              <View style={{ position: 'absolute', right: -4, bottom: -4, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg }}><Icon name="camera" size={14} color={colors.onInk} /></View>
            </Press>
          ) : photo || resolveBrand(tx.merchant) ? <BrandIcon brand={resolveBrand(tx.merchant)} photo={photo} size={76} /> : <CategoryDot cat={cat} size={76} />}
          <View style={{ alignSelf: 'stretch', marginTop: space.sm }}>
            <Money size="hero" align="center" color={tx.type === 'income' ? colors.income : colors.text} text={formatMoney(tx.amount, tx.currency, { trimZeros: true })} />
          </View>
          <Text v="h3" style={{ textAlign: 'center' }}>{tx.merchant || tx.note || cat?.name || 'Transaction'}</Text>
          <Row style={{ gap: space.sm }}>
            <Tag label={tx.type} tone={tx.type === 'income' ? 'income' : 'neutral'} />
            <Text v="small" color={colors.textMuted}>{formatDay(tx.occurred_at)} · {formatTime(tx.occurred_at)}</Text>
          </Row>
        </View>
        {editing ? (
          <Card style={{ gap: space.md }}>
            <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <Field label="Merchant" value={merchant} onChangeText={setMerchant} />
            <Field label="Note" value={note} onChangeText={setNote} />
            <Field label="Tags (comma separated)" value={tagText} onChangeText={setTagText} autoCapitalize="none" placeholder="goa, trip" />
            <Row style={{ gap: space.sm }}><Button title="Save" onPress={saveEdit} /><Button title="Cancel" kind="ghost" onPress={() => setEditing(false)} /></Row>
          </Card>
        ) : (
          <>
            {readTags(tx.tags).length ? <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{readTags(tx.tags).map((t) => <Tag key={t} label={`#${t}`} tone="primary" />)}</Row> : null}
            {tx.note ? <Card><Text v="caps" color={colors.textMuted}>NOTE</Text><Text>{tx.note}</Text></Card> : null}
            {tx.type !== 'transfer' && (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={{ flex: 1 }}>
                  <Text v="title">Leave out of my totals</Text>
                  <Text v="small" color={colors.textMuted}>{tx.excluded ? 'This entry is not counted in your spending, budgets, charts or answers. It stays in your list and in your account balance.' : 'Turn on to keep this entry in your list but out of your spending, budgets, charts and answers.'}</Text>
                </View>
                <Switch accessibilityLabel="Leave out of my totals" value={!!tx.excluded} trackColor={{ true: colors.ink, false: colors.track }} thumbColor="#fff"
                  onValueChange={async (v) => { await setExcluded(db, tx.id, v); bumpData(); toast(v ? 'Left out of your totals' : 'Counted again'); }} />
              </Card>
            )}
            {tx.type !== 'transfer' && <ReceiptCard txId={tx.id} uri={tx.receipt_uri} />}
            {spaces.length > 0 && !readOnly ? (
              <Card style={{ gap: space.sm }}>
                <Text v="caps" color={colors.textMuted}>SPACE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                  <Chip label="🙂 Personal" selected={!tx.space_id} onPress={async () => { await updateTransaction(db, tx.id, { space_id: '' }); bumpData(); toast('Moved to Personal'); }} />
                  {spaces.map((sp) => <Chip key={sp.id} label={`${sp.emoji} ${sp.name}`} selected={tx.space_id === sp.id} onPress={async () => { await updateTransaction(db, tx.id, { space_id: sp.id }); bumpData(); toast(`Moved to ${sp.name}`); }} />)}
                </ScrollView>
              </Card>
            ) : null}
            {tx.type !== 'transfer' && !readOnly && (
              <View style={{ gap: space.sm }}>
                <Text v="caps" color={colors.textMuted}>CATEGORY</Text>
                <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
                  <CategoryChips categories={kinds} value={tx.category_id} onChange={changeCategory} />
                </Row>
              </View>
            )}
            <Card style={{ gap: 4 }}>
              <Text v="small" color={colors.textMuted}>Source: {tx.source}{tx.payment_method ? ` · ${tx.payment_method}` : ''}</Text>
              {readOnly && <Text v="small" color={colors.textMuted}>This is your share of a group expense. Edit it from the group.</Text>}
            </Card>
          </>
        )}
      </ScrollView>
      {iconOpen ? <IconPickerSheet merchant={tx.merchant} onClose={() => setIconOpen(false)} /> : null}
      <ToastHost />
    </Screen>
  );
}
