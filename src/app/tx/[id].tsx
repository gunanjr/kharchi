import React, { useState } from 'react';
import { ScrollView, View , Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Text, Button, Row, Field, Chip, Card } from '@/components/ui';
import { CategoryChips } from '@/components/CategoryPicker';
import { CategoryDot } from '@/components/TxRow';
import { Icon } from '@/components/Icon';
import { ErrorState } from '@/components/Feedback';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { deleteTransaction, getTransaction, undeleteTransaction, updateTransaction } from '@/features/tracker/repo';
import { useCategories } from '@/features/tracker/hooks';
import { learnMerchant } from '@/features/parser/merchants';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import { formatDay, formatTime } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function TxDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const { byId, categories } = useCategories();
  const q = useQuery((d) => getTransaction(d, id), [id]);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');

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
    await updateTransaction(db, tx!.id, { amount: m, merchant: merchant.trim() || null, note: note.trim() || null });
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
      <Row style={{ padding: space.md, justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={{ width: 48, height: 48, justifyContent: 'center' }}>
          <Icon name="back" color={colors.text} />
        </Pressable>
        <Row>
          {!readOnly && !editing && <Button title="Edit" kind="ghost" onPress={() => { setAmount(String(tx.amount / 100)); setMerchant(tx.merchant ?? ''); setNote(tx.note ?? ''); setEditing(true); }} />}
          <Button title="Delete" kind="ghost" onPress={remove} />
        </Row>
      </Row>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: space.sm }}>
          <CategoryDot cat={cat} size={72} />
          <Text v="hero" style={{ fontVariant: ['tabular-nums'] }}>{formatMoney(tx.amount, tx.currency, { trimZeros: true })}</Text>
          <Text v="title">{tx.merchant || tx.note || cat?.name || 'Transaction'}</Text>
          <Text v="small" color={colors.textMuted}>{tx.type} · {formatDay(tx.occurred_at)} {formatTime(tx.occurred_at)}</Text>
        </View>
        {editing ? (
          <Card style={{ gap: space.md }}>
            <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <Field label="Merchant" value={merchant} onChangeText={setMerchant} />
            <Field label="Note" value={note} onChangeText={setNote} />
            <Row><Button title="Save" onPress={saveEdit} /><Button title="Cancel" kind="ghost" onPress={() => setEditing(false)} /></Row>
          </Card>
        ) : (
          <>
            {tx.note ? <Card><Text v="caps" color={colors.textMuted}>NOTE</Text><Text>{tx.note}</Text></Card> : null}
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
      <ToastHost />
    </Screen>
  );
}
