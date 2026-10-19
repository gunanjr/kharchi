import React, { useRef, useState } from 'react';
import { Modal, Share, Switch, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { SubScreen, Card, Text, Row, Button, Enter, Money, Press, Segmented, Group, ListRow, IconTile, SectionHeader } from '@/components/ui';
import { Glyph } from '@/components/Icon';
import { groupGlyph } from '@/components/glyphs';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { space, layout } from '@/theme/tokens';
import type { Transfer } from '@/features/groups/balances';

type Tab = 'expenses' | 'balances' | 'charts' | 'activity';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useDb();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
    <SubScreen title={s.group.name} scroll={false}>
      <View style={{ paddingHorizontal: layout.gutter, gap: space.lg }}>
        <ViewShot ref={shot} options={{ format: 'png', quality: 1 }}>
          <Card tone="ink" style={{ gap: space.sm }}>
            <Row style={{ gap: space.md }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, borderCurve: 'continuous' as any, backgroundColor: colors.onHeroLine, alignItems: 'center', justifyContent: 'center' }}><Glyph name={groupGlyph(s.group.icon)} size={20} color={colors.onHero} /></View>
              <Text v="caps" color={colors.onHeroMuted} style={{ flex: 1 }}>{s.members.length} PEOPLE · {formatMoney(s.totalSpent, s.group.currency, { compact: true })} SPENT</Text>
            </Row>
            {s.myBalance === 0 ? <Text v="h2" color={colors.onHero}>You’re settled up</Text> : (
              <>
                <Text v="small" color={colors.onHeroMuted}>{s.myBalance > 0 ? 'You are owed' : 'You owe'}</Text>
                <Money size="xl" color={s.myBalance > 0 ? colors.incomeOnHero : colors.expenseOnHero} text={formatMoney(Math.abs(s.myBalance), s.group.currency, { trimZeros: true })} />
              </>
            )}
            {s.transfers.slice(0, 4).map((t, i) => <Text key={i} v="small" color={colors.onHeroMuted}>{name(t.from)} → {name(t.to)}  {formatMoney(t.amount, s.group.currency, { trimZeros: true })}</Text>)}
          </Card>
        </ViewShot>
        <Segmented options={(['expenses', 'balances', 'charts', 'activity'] as Tab[]).map((t) => ({ key: t, label: t[0].toUpperCase() + t.slice(1) }))} value={tab} onChange={setTab} />
      </View>

      <View style={{ flex: 1 }}>
        <Body />
      </View>
      {tab === 'expenses' ? (
        <>
          <Press
            accessibilityLabel="Scan a bill"
            onPress={() => router.push({ pathname: '/scan-bill', params: { groupId: id } })}
            style={{ position: 'absolute', right: layout.gutter + 72, bottom: Math.max(insets.bottom, 12) + layout.tabBar + 16, height: 60, paddingHorizontal: space.lg, borderRadius: 22, borderCurve: 'continuous' as never, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', gap: space.sm }}
          >
            <Glyph name="scan-outline" size={20} color={colors.onInk} />
            <Text v="title" color={colors.onInk}>Scan bill</Text>
          </Press>
          <Fab onPress={() => router.push({ pathname: '/group-expense', params: { groupId: id } })} label="Add expense" />
        </>
      ) : null}
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: space.lg, gap: space.md, paddingBottom: 140 }}>
        {tab === 'expenses' && (q.data!.expenses.length === 0 ? (
          <EmptyState art="wallet" title="No expenses yet" body="Add the first one and everyone’s balance updates instantly." action="Add expense" onAction={() => router.push({ pathname: '/group-expense', params: { groupId: id } })} />
        ) : (
          <Card pad={false} style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
            {q.data!.expenses.map((e, i) => {
              const mine = e.shares[q.data!.me.id] ?? 0;
              const paidByMe = e.payers[q.data!.me.id] ?? 0;
              const lent = paidByMe - mine;
              return (
                <Enter key={e.id} i={i}>
                  <Press scale={0.985} onPress={() => router.push({ pathname: '/group-expense', params: { groupId: id, id: e.id } })} onLongPress={async () => { await deleteGroupExpense(db, e.id); bumpData(); toast('Deleted', { label: 'Undo', run: async () => { await undeleteGroupExpense(db, e.id); bumpData(); } }); }}
                    style={{ minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <CategoryDot cat={e.category_id ? byId.get(e.category_id) : null} />
                    <View style={{ flex: 1 }}>
                      <Text v="title" numberOfLines={1}>{e.description}</Text>
                      <Text v="small" color={colors.textMuted} numberOfLines={2}>{formatDay(e.occurred_at)} · {Object.keys(e.payers).map(name).join(', ')} paid {formatMoney(e.amount, e.currency, { trimZeros: true })}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text v="caps" color={lent > 0 ? colors.income : lent < 0 ? colors.expense : colors.textMuted}>{lent > 0 ? 'YOU LENT' : lent < 0 ? 'YOU BORROWED' : 'NOT INVOLVED'}</Text>
                      {lent !== 0 && <Money size="sm" align="right" color={lent > 0 ? colors.income : colors.expense} text={formatMoney(Math.abs(lent), e.currency, { trimZeros: true })} />}
                    </View>
                  </Press>
                </Enter>
              );
            })}
          </Card>
        ))}

        {tab === 'balances' && (
          <>
            <Group>
              {s.members.map((m) => {
                const b = s.balances[m.id] ?? 0;
                return (
                  <ListRow
                    key={m.id}
                    title={name(m.id)}
                    leading={<IconTile size={40} tone="plain"><Text v="title" color={colors.link}>{name(m.id)[0]?.toUpperCase()}</Text></IconTile>}
                    right={<Text v="small" color={b > 0 ? colors.income : b < 0 ? colors.expense : colors.textMuted} style={{ fontFamily: 'Geist_600SemiBold', fontVariant: ['tabular-nums'] }}>{b === 0 ? 'settled' : `${b > 0 ? 'gets' : 'owes'} ${formatMoney(Math.abs(b), s.group.currency, { trimZeros: true })}`}</Text>}
                  />
                );
              })}
              <ListRow title="Simplify debts" sub="Fewest possible payments to settle everyone" right={<Switch accessibilityLabel="Simplify debts" value={!!s.group.simplify} trackColor={{ true: colors.ink, false: colors.track }} thumbColor="#fff" onValueChange={async (v) => { await setGroupSimplify(db, id, v); bumpData(); }} />} />
            </Group>
            <SectionHeader style={{ marginTop: space.md }} title={s.group.simplify ? 'Settle up' : 'Who owes whom'} />
            {s.transfers.length === 0 ? <Text color={colors.textMuted}>Everyone is settled up.</Text> : s.transfers.map((t, i) => (
              <Card key={i} style={{ gap: space.sm }}>
                <Row style={{ justifyContent: 'space-between', gap: space.md }}>
                  <Text v="title" style={{ flex: 1 }}>{name(t.from)} → {name(t.to)}</Text>
                  <Money size="md" align="right" text={formatMoney(t.amount, s.group.currency, { trimZeros: true })} />
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
            <SectionHeader title="By category" />
            <Card><BarList rows={[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ label: k === 'none' ? 'Uncategorised' : byId.get(k)?.name ?? k, value: v, color: byId.get(k)?.color }))} currency={s.group.currency} /></Card>
            <SectionHeader style={{ marginTop: space.md }} title="Who paid" />
            <Card><BarList rows={[...byPerson.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: name(k), value: v }))} currency={s.group.currency} /></Card>
          </>
        )}

        {tab === 'activity' && (
          <Group>
            {q.data!.activity.map((a) => <ListRow key={a.id} title={a.summary} sub={formatDay(a.created_at)} />)}
          </Group>
        )}
      </ScrollView>
    );
  }
}
