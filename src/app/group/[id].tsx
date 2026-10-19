import React, { useRef, useState } from 'react';
import { Modal, Pressable, Share, Switch, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { SubScreen, Card, Text, Row, Button, Chip, Enter, MoneyText } from '@/components/ui';
import { EmptyState } from '@/components/Feedback';
import { Sheet } from '@/components/Sheet';
import { ToastHost, toast } from '@/components/Toast';
import { BarList } from '@/components/charts';
import { CategoryDot } from '@/components/TxRow';
import { Fab } from '../(tabs)/index';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { useCategories } from '@/features/tracker/hooks';
import { deleteGroupExpense, ensureSelf, groupSummary, listActivity, listExpenses, setGroupSimplify, undeleteGroupExpense, deleteGroup } from '@/features/groups/repo';
import { SettleForm } from '@/features/groups/ui/SettleSheet';
import { groupSummaryText } from '@/features/groups/summary';
import { formatMoney } from '@/domain/money';
import { formatDay } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import type { Transfer } from '@/features/groups/balances';

type Tab = 'expenses' | 'balances' | 'charts' | 'activity';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useDb();
  const { colors } = useTheme();
  const { byId } = useCategories();
  const [tab, setTab] = useState<Tab>('expenses');
  const [settle, setSettle] = useState<Transfer | null>(null);
  const shot = useRef<React.ElementRef<typeof ViewShot>>(null);
  const q = useQuery(async (d) => {
    const me = await ensureSelf(d);
    const summary = await groupSummary(d, id);
    return { me, summary, expenses: await listExpenses(d, id), activity: await listActivity(d, id) };
  }, [id]);

  const s = q.data?.summary;
  if (!s || !q.data) return <SubScreen title="Group"><Text>Loading…</Text></SubScreen>;
  const summary = s;
  const name = (pid: string) => (pid === q.data!.me.id ? 'You' : s.members.find((m) => m.id === pid)?.name ?? '?');
  const person = (pid: string) => s.members.find((m) => m.id === pid)!;

  const byCat = new Map<string, number>();
  const byPerson = new Map<string, number>();
  for (const e of q.data.expenses) {
    byCat.set(e.category_id ?? 'none', (byCat.get(e.category_id ?? 'none') ?? 0) + e.amount);
    for (const [p, v] of Object.entries(e.payers)) byPerson.set(p, (byPerson.get(p) ?? 0) + v);
  }

  async function shareText() {
    await Share.share({ message: groupSummaryText(s!) });
  }
  async function shareImage() {
    try {
      const uri = await shot.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch {
      toast('Couldn’t create the image');
    }
  }

  return (
    <SubScreen title={`${s.group.icon ?? ''} ${s.group.name}`} scroll={false}>
      <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
        <ViewShot ref={shot} options={{ format: 'png', quality: 1 }}>
          <Card style={{ gap: 4 }}>
            <Text v="caps" color={colors.textMuted}>{s.members.length} PEOPLE · {formatMoney(s.totalSpent, s.group.currency, { compact: true })} SPENT</Text>
            {s.myBalance === 0 ? <Text v="h2">You’re settled up</Text> : (
              <Row style={{ alignItems: 'baseline' }}>
                <Text v="h2">{s.myBalance > 0 ? 'You are owed' : 'You owe'}</Text>
                <MoneyText v="h1" color={s.myBalance > 0 ? colors.income : colors.expense}>{formatMoney(Math.abs(s.myBalance), s.group.currency, { trimZeros: true })}</MoneyText>
              </Row>
            )}
            {s.transfers.slice(0, 4).map((t, i) => <Text key={i} v="small" color={colors.textMuted}>{name(t.from)} → {name(t.to)}  {formatMoney(t.amount, s.group.currency, { trimZeros: true })}</Text>)}
          </Card>
        </ViewShot>
        <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
          {(['expenses', 'balances', 'charts', 'activity'] as Tab[]).map((t) => <Chip key={t} label={t[0].toUpperCase() + t.slice(1)} selected={tab === t} onPress={() => setTab(t)} />)}
        </Row>
      </View>

      <View style={{ flex: 1 }}>
        <Body />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Scan a bill"
        onPress={() => router.push({ pathname: '/scan-bill', params: { groupId: id } })}
        style={{ position: 'absolute', right: space.lg + 72, bottom: space.lg, height: 60, minWidth: 60, paddingHorizontal: space.lg, borderRadius: 30, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', elevation: 6 }}
      >
        <Text v="title" color="#fff">📷 Scan bill</Text>
      </Pressable>
      <Fab onPress={() => router.push({ pathname: '/group-expense', params: { groupId: id } })} label="Add expense" />
      <Modal visible={!!settle} transparent animationType="none" onRequestClose={() => setSettle(null)}>
        <Sheet onClose={() => setSettle(null)}>
          {settle && <SettleForm groupId={id} from={person(settle.from)} to={person(settle.to)} amount={settle.amount} currency={s.group.currency} onDone={() => setSettle(null)} />}
        </Sheet>
      </Modal>
      <ToastHost />
    </SubScreen>
  );

  function Body() {
    const s = summary;
    const { ScrollView } = require('react-native');
    return (
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.sm, paddingBottom: 120 }}>
        {tab === 'expenses' && (q.data!.expenses.length === 0 ? (
          <EmptyState art="wallet" title="No expenses yet" body="Add the first one and everyone’s balance updates instantly." action="Add expense" onAction={() => router.push({ pathname: '/group-expense', params: { groupId: id } })} />
        ) : q.data!.expenses.map((e, i) => {
          const mine = e.shares[q.data!.me.id] ?? 0;
          const paidByMe = e.payers[q.data!.me.id] ?? 0;
          const lent = paidByMe - mine;
          return (
            <Enter key={e.id} i={i}>
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/group-expense', params: { groupId: id, id: e.id } })} onLongPress={async () => { await deleteGroupExpense(db, e.id); bumpData(); toast('Deleted', { label: 'Undo', run: async () => { await undeleteGroupExpense(db, e.id); bumpData(); } }); }}
                style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <CategoryDot cat={e.category_id ? byId.get(e.category_id) : null} />
                <View style={{ flex: 1 }}>
                  <Text v="title" numberOfLines={1}>{e.description}</Text>
                  <Text v="small" color={colors.textMuted}>{formatDay(e.occurred_at)} · {Object.keys(e.payers).map(name).join(', ')} paid {formatMoney(e.amount, e.currency, { trimZeros: true })}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text v="caps" color={lent > 0 ? colors.income : lent < 0 ? colors.expense : colors.textMuted}>{lent > 0 ? 'YOU LENT' : lent < 0 ? 'YOU BORROWED' : 'NOT INVOLVED'}</Text>
                  {lent !== 0 && <MoneyText v="body" color={lent > 0 ? colors.income : colors.expense}>{formatMoney(Math.abs(lent), e.currency, { trimZeros: true })}</MoneyText>}
                </View>
              </Pressable>
            </Enter>
          );
        }))}

        {tab === 'balances' && (
          <>
            {s.members.map((m) => {
              const b = s.balances[m.id] ?? 0;
              return (
                <Row key={m.id} style={{ justifyContent: 'space-between', minHeight: 48 }}>
                  <Text v="title">{name(m.id)}</Text>
                  <MoneyText v="body" color={b > 0 ? colors.income : b < 0 ? colors.expense : colors.textMuted}>{b === 0 ? 'settled' : `${b > 0 ? 'gets' : 'owes'} ${formatMoney(Math.abs(b), s.group.currency, { trimZeros: true })}`}</MoneyText>
                </Row>
              );
            })}
            <Row style={{ justifyContent: 'space-between', marginTop: space.md }}>
              <View style={{ flex: 1 }}><Text v="title">Simplify debts</Text><Text v="small" color={colors.textMuted}>Fewest possible payments to settle everyone</Text></View>
              <Switch accessibilityLabel="Simplify debts" value={!!s.group.simplify} trackColor={{ true: colors.primary }} onValueChange={async (v) => { await setGroupSimplify(db, id, v); bumpData(); }} />
            </Row>
            <Text v="h2" style={{ marginTop: space.md }}>{s.group.simplify ? 'Settle up' : 'Who owes whom'}</Text>
            {s.transfers.length === 0 ? <Text color={colors.textMuted}>Everyone is settled up ✅</Text> : s.transfers.map((t, i) => (
              <Card key={i} style={{ gap: space.sm }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text v="title">{name(t.from)} → {name(t.to)}</Text>
                  <MoneyText>{formatMoney(t.amount, s.group.currency, { trimZeros: true })}</MoneyText>
                </Row>
                <Button title="Settle up" kind="secondary" onPress={() => setSettle(t)} />
              </Card>
            ))}
            <Row style={{ gap: space.sm, flexWrap: 'wrap', marginTop: space.md }}>
              <Button title="Share summary" kind="secondary" onPress={shareText} />
              <Button title="Share as image" kind="secondary" onPress={shareImage} />
              <Button title="Invite" kind="ghost" onPress={() => router.push(`/invite/${id}`)} />
              <Button title="Delete group" kind="ghost" onPress={async () => { await deleteGroup(db, id); bumpData(); router.back(); }} />
            </Row>
          </>
        )}

        {tab === 'charts' && (
          <>
            <Text v="h2">By category</Text>
            <BarList rows={[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ label: k === 'none' ? 'Uncategorised' : byId.get(k)?.name ?? k, value: v, color: byId.get(k)?.color }))} currency={s.group.currency} />
            <Text v="h2" style={{ marginTop: space.md }}>Who paid</Text>
            <BarList rows={[...byPerson.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: name(k), value: v }))} currency={s.group.currency} />
          </>
        )}

        {tab === 'activity' && q.data!.activity.map((a) => (
          <View key={a.id} style={{ paddingVertical: space.sm }}>
            <Text>{a.summary}</Text>
            <Text v="small" color={colors.textMuted}>{formatDay(a.created_at)}</Text>
          </View>
        ))}
      </ScrollView>
    );
  }
}
