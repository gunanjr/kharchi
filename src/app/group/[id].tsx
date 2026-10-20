import React, { useRef, useState } from 'react';
import { Alert, Modal, ScrollView, Share, Switch, View } from 'react-native';
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
import { useDb, useQuery, bumpData } from '@/db/provider';
import { useCategories } from '@/features/tracker/hooks';
import { deleteGroupExpense, ensureSelf, groupSummary, listActivity, listExpenses, setGroupSimplify, undeleteGroupExpense, deleteGroup } from '@/features/groups/repo';
import { SettleForm } from '@/features/groups/ui/SettleSheet';
import { groupSummaryText } from '@/features/groups/summary';
import { formatMoney } from '@/domain/money';
import { nudgeContext } from '@/features/groups/context';
import { BruhSheet } from '@/features/groups/ui/BruhSheet';
import type { NudgeInput } from '@/features/groups/nudge';
import { memberLine } from '@/features/groups/overview';
import { buildWrapped } from '@/features/groups/wrapped';
import { WrappedCard } from '@/features/groups/ui/WrappedCard';
import { TripSheet } from '@/features/groups/ui/TripSheet';
import { tripStatus, nextPayer } from '@/features/groups/trip';
import { reliability, BADGE_LABEL } from '@/features/groups/reliability';
import { formatDay, monthLabel, startOfDay } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { space, layout } from '@/theme/tokens';
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
  const [bruh, setBruh] = useState<NudgeInput | NudgeInput[] | null>(null);
  const [tripOpen, setTripOpen] = useState(false);
  const wrapShot = useRef<React.ElementRef<typeof ViewShot>>(null);
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
  function askBruh(t: { from: string; to: string; amount: number }) {
    const ctx = nudgeContext(q.data!.expenses, t.from, t.to, Date.now());
    setBruh({ amount: t.amount, currency: s!.group.currency, name: person(t.from).name, reason: s!.group.name, items: ctx.items, daysOwed: ctx.daysOwed });
  }
  function askBruhAll(ts: { from: string; to: string; amount: number }[]) {
    setBruh(ts.map((t) => {
      const ctx = nudgeContext(q.data!.expenses, t.from, t.to, Date.now());
      return { amount: t.amount, currency: s!.group.currency, name: person(t.from).name, reason: s!.group.name, items: ctx.items, daysOwed: ctx.daysOwed };
    }));
  }
  async function shareWrapped() {
    try {
      const uri = await wrapShot.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch {
      toast('Couldn’t create the image');
    }
  }
  async function shareImage() {
    try {
      const uri = await shot.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch {
      toast('Couldn’t create the image');
    }
  }

  const days = (() => {
    const m = new Map<number, { label: string; total: number; items: typeof q.data.expenses }>();
    for (const e of q.data.expenses) {
      const k = startOfDay(e.occurred_at);
      const g = m.get(k) ?? { label: formatDay(e.occurred_at), total: 0, items: [] };
      g.items.push(e);
      g.total += Math.round(e.amount * (e.currency === s.group.currency ? 1 : e.rate));
      m.set(k, g);
    }
    return [...m.entries()].sort((a, b) => b[0] - a[0]).map(([, v]) => v);
  })();
  const trip = s.group.trip_start != null && s.group.trip_end != null ? tripStatus({ start: s.group.trip_start, end: s.group.trip_end, dailyBudget: s.group.daily_budget }, q.data.expenses, s.group.currency, Date.now()) : null;
  const timesPaid: Record<string, number> = {};
  for (const e of q.data.expenses) for (const [pid, v] of Object.entries(e.payers)) if (v > 0) timesPaid[pid] = (timesPaid[pid] ?? 0) + 1;
  const payNext = trip && trip.phase !== 'over' ? nextPayer(s.balances, timesPaid) : null;
  const habit = reliability(q.data.expenses, s.settlements.map((x) => ({ from: x.from_person, to: x.to_person, amount: x.amount, occurred_at: x.occurred_at })), s.group.currency, Date.now());
  const others = s.members.filter((m) => !m.is_self).map((m) => m.name.split(' ')[0]);
  const myOwed = s.transfers.filter((t) => t.to === q.data!.me.id);
  const iOwe = s.transfers.filter((t) => t.from === q.data!.me.id);
  const goAdd = () => router.push({ pathname: '/group-expense', params: { groupId: id } });

  return (
    <SubScreen title={s.group.name} scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: space.lg, paddingBottom: 120 }}>
        <ViewShot ref={shot} options={{ format: 'png', quality: 1 }}>
          <Card tone="ink" style={{ gap: space.md }}>
            <Row style={{ gap: space.md }}>
              <View style={{ width: 44, height: 44, borderRadius: 15, borderCurve: 'continuous' as never, backgroundColor: colors.onHeroLine, alignItems: 'center', justifyContent: 'center' }}><Glyph name={groupGlyph(s.group.icon)} size={22} color={colors.onHero} /></View>
              <View style={{ flex: 1 }}>
                <Text v="h3" color={colors.onHero} numberOfLines={1}>{s.group.name}</Text>
                <Text v="small" color={colors.onHeroMuted} numberOfLines={1}>{memberLine(others)} · {formatMoney(s.totalSpent, s.group.currency, { compact: true })} spent</Text>
              </View>
            </Row>
            {s.myBalance === 0 ? <Text v="h2" color={colors.onHero}>You’re all settled up</Text> : (
              <View style={{ gap: 2 }}>
                <Text v="small" color={colors.onHeroMuted}>{s.myBalance > 0 ? 'You are owed' : 'You owe'}</Text>
                <Money size="xl" color={s.myBalance > 0 ? colors.onHero : colors.onHero} text={formatMoney(Math.abs(s.myBalance), s.group.currency, { trimZeros: true })} />
              </View>
            )}
            {s.transfers.length > 0 ? (
              <View style={{ gap: 6, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.onHeroLine }}>
                {s.transfers.slice(0, 4).map((t, i) => (
                  <Row key={i} style={{ justifyContent: 'space-between', gap: space.md }}>
                    <Text v="small" color={colors.onHeroMuted} style={{ flex: 1 }} numberOfLines={1}>{name(t.from)} {name(t.from) === 'You' ? 'pay' : 'pays'} {name(t.to) === 'You' ? 'you' : name(t.to)}</Text>
                    <Text v="small" color={colors.onHero} style={{ fontFamily: 'Geist_600SemiBold', fontVariant: ['tabular-nums'] }}>{formatMoney(t.amount, s.group.currency, { trimZeros: true })}</Text>
                  </Row>
                ))}
                {s.transfers.length > 4 ? <Text v="small" color={colors.onHeroMuted}>+ {s.transfers.length - 4} more under Balances</Text> : null}
              </View>
            ) : null}
          </Card>
        </ViewShot>

        {q.data!.expenses.length > 0 ? (
          <View style={{ position: 'absolute', left: -2000, top: 0, width: 360 }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <ViewShot ref={wrapShot} options={{ format: 'png', quality: 1 }}>
              <WrappedCard name={s.group.name} currency={s.group.currency} period={monthLabel(Date.now())} w={buildWrapped(q.data!.expenses, s.members.map((m) => ({ id: m.id, name: name(m.id) })), s.balances, s.group.currency, formatDay)} />
            </ViewShot>
          </View>
        ) : null}
        <Row style={{ gap: space.sm, flexWrap: 'wrap' }}>
          <Button title="Add expense" icon="plus" onPress={goAdd} />
          <Button title="Scan bill" kind="secondary" icon="scan" onPress={() => router.push({ pathname: '/scan-bill', params: { groupId: id } })} />
          {iOwe.length > 0 ? <Button title="Settle up" kind="secondary" onPress={() => setSettle(iOwe[0])} /> : null}
          {myOwed.length > 0 ? <Button title={myOwed.length > 1 ? `Bruh ${myOwed.length} people` : 'Bruh them'} kind="secondary" icon="send" onPress={() => askBruhAll(myOwed)} /> : null}
        </Row>

        {trip ? (
          <Card style={{ gap: space.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ gap: 2 }}>
                <Text v="caps" color={colors.textMuted}>TRIP MODE</Text>
                <Text v="h3">{trip.phase === 'upcoming' ? `Starts soon · ${trip.totalDays} days` : trip.phase === 'over' ? 'Trip done' : `Day ${trip.dayNo} of ${trip.totalDays}`}</Text>
              </View>
              <Button title="Edit" kind="ghost" size="sm" onPress={() => setTripOpen(true)} />
            </Row>
            <Row style={{ gap: space.lg }}>
              <View style={{ flex: 1, gap: 2 }}><Text v="small" color={colors.textMuted}>Spent so far</Text><Money size="md" text={formatMoney(trip.spentTotal, s.group.currency, { compact: true })} /></View>
              <View style={{ flex: 1, gap: 2 }}><Text v="small" color={colors.textMuted}>Per day</Text><Money size="md" text={formatMoney(trip.perDay, s.group.currency, { compact: true })} /></View>
              {trip.leftToday !== null ? <View style={{ flex: 1, gap: 2 }}><Text v="small" color={colors.textMuted}>{trip.leftToday >= 0 ? 'Left today' : 'Over today'}</Text><Money size="md" color={trip.leftToday >= 0 ? colors.income : colors.expense} text={formatMoney(Math.abs(trip.leftToday), s.group.currency, { compact: true })} /></View> : null}
            </Row>
            {trip.pace ? <Text v="small" color={trip.pace === 'over' ? colors.expense : colors.textMuted}>{trip.pace === 'over' ? 'Running above your daily budget.' : trip.pace === 'under' ? 'Comfortably under your daily budget.' : 'Right on your daily budget.'}</Text> : null}
            {payNext ? <Text v="small" color={colors.textMuted}><Text v="small" style={{ fontFamily: 'Geist_700Bold' }}>{name(payNext.id)}</Text> has covered {formatMoney(payNext.behind, s.group.currency, { trimZeros: true })} less than their share. Paying the next one evens it out. Just a suggestion.</Text> : null}
          </Card>
        ) : null}
        <Segmented options={(['expenses', 'balances', 'charts', 'activity'] as Tab[]).map((t) => ({ key: t, label: t[0].toUpperCase() + t.slice(1) }))} value={tab} onChange={setTab} />
        <Body />
      </ScrollView>
      {tripOpen ? <TripSheet group={s.group} visible onClose={() => setTripOpen(false)} /> : null}
      <BruhSheet input={bruh} onClose={() => setBruh(null)} />
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
    return (
      <View style={{ gap: space.md }}>
        {tab === 'expenses' && (q.data!.expenses.length === 0 ? (
          <EmptyState art="wallet" title="No expenses yet" body="Add the first one and everyone’s balance updates instantly." action="Add expense" onAction={() => router.push({ pathname: '/group-expense', params: { groupId: id } })} />
        ) : (
          <View style={{ gap: space.lg }}>
            {days.map((day) => (
              <View key={day.label} style={{ gap: space.sm }}>
                <Row style={{ justifyContent: 'space-between', paddingHorizontal: 4 }}>
                  <Text v="caps" color={colors.textMuted}>{day.label.toUpperCase()}</Text>
                  <Text v="small" color={colors.textMuted} style={{ fontVariant: ['tabular-nums'] }}>{formatMoney(day.total, s.group.currency, { trimZeros: true })}</Text>
                </Row>
                <Card pad={false} style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
                  {day.items.map((e, i) => {
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
              </View>
            ))}
          </View>
        ))}

        {tab === 'balances' && (
          <>
            <Card style={{ gap: space.sm }}>
              {s.members.map((m) => {
                const b = s.balances[m.id] ?? 0;
                const maxAbs = Math.max(1, ...s.members.map((x) => Math.abs(s.balances[x.id] ?? 0)));
                return (
                  <View key={m.id} style={{ gap: 6, paddingVertical: 6 }} accessible accessibilityLabel={`${name(m.id)} ${b === 0 ? 'is settled' : b > 0 ? 'is owed' : 'owes'} ${formatMoney(Math.abs(b), s.group.currency)}`}>
                    <Row style={{ gap: space.md }}>
                      <IconTile size={40} tone="plain"><Text v="title" color={colors.link}>{name(m.id)[0]?.toUpperCase()}</Text></IconTile>
                      <View style={{ flex: 1 }}>
                        <Text v="title">{name(m.id)}</Text>
                        {habit[m.id]?.badge ? <Text v="small" color={colors.textMuted}>{BADGE_LABEL[habit[m.id].badge!]} · about {habit[m.id].medianDays} {habit[m.id].medianDays === 1 ? 'day' : 'days'}{habit[m.id].streak >= 2 ? ` · ${habit[m.id].streak} on time in a row` : ''}</Text> : habit[m.id]?.openDays && habit[m.id].openDays! >= 14 && (s.balances[m.id] ?? 0) < 0 ? <Text v="small" color={colors.textMuted}>Waiting {habit[m.id].openDays} days</Text> : null}
                      </View>
                      <Text v="small" color={b > 0 ? colors.income : b < 0 ? colors.expense : colors.textMuted} style={{ fontFamily: 'Geist_600SemiBold', fontVariant: ['tabular-nums'] }}>{b === 0 ? 'settled' : `${b > 0 ? 'is owed' : 'owes'} ${formatMoney(Math.abs(b), s.group.currency, { trimZeros: true })}`}</Text>
                    </Row>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' }}>
                      <View style={{ width: `${(Math.abs(b) / maxAbs) * 100}%`, height: 6, borderRadius: 3, backgroundColor: b > 0 ? colors.income : colors.expense }} />
                    </View>
                  </View>
                );
              })}
            </Card>
            <Group>
              <ListRow title="Simplify debts" sub="Fewest possible payments to settle everyone" right={<Switch accessibilityLabel="Simplify debts" value={!!s.group.simplify} trackColor={{ true: colors.ink, false: colors.track }} thumbColor="#fff" onValueChange={async (v) => { await setGroupSimplify(db, id, v); bumpData(); }} />} />
            </Group>
            <SectionHeader style={{ marginTop: space.md }} title={s.group.simplify ? 'Settle up' : 'Who owes whom'} />
            {s.transfers.length === 0 ? <Text color={colors.textMuted}>Everyone is settled up.</Text> : s.transfers.map((t, i) => (
              <Card key={i} style={{ gap: space.sm }}>
                <Row style={{ justifyContent: 'space-between', gap: space.md }}>
                  <Text v="title" style={{ flex: 1 }}>{name(t.from)} → {name(t.to)}</Text>
                  <Money size="md" align="right" text={formatMoney(t.amount, s.group.currency, { trimZeros: true })} />
                </Row>
                <Row style={{ gap: space.sm }}>
                  <Button title="Settle up" kind="secondary" size="sm" onPress={() => setSettle(t)} />
                  {t.to === q.data!.me.id ? (
                    <Button title="Bruh them" size="sm" icon="send" onPress={() => askBruh(t)} />
                  ) : null}
                </Row>
              </Card>
            ))}
            <Row style={{ gap: space.sm, flexWrap: 'wrap', marginTop: space.md }}>
              <Button title="Share summary" kind="secondary" onPress={shareText} />
              <Button title="Group Wrapped" icon="send" onPress={shareWrapped} />
              <Button title={trip ? 'Trip settings' : 'Trip mode'} kind="secondary" onPress={() => setTripOpen(true)} />
              <Button title="Share as image" kind="secondary" onPress={shareImage} />
              <Button title="Delete group" kind="ghost" onPress={() => Alert.alert(`Delete ${s.group.name}?`, 'The group and its expenses are removed from this phone. Your share of them in your own tracker is removed too. This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await deleteGroup(db, id); bumpData(); router.back(); } }])} />
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
      </View>
    );
  }
}
