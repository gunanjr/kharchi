import React, { useMemo } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SubScreen, Card, Text, Row, Button, Money, Press } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { EmptyState, SkeletonList } from '@/components/Feedback';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { findRepeating, radarView, periodLabel, type RadarView } from '@/features/radar/radar';
import { MerchantTile } from '@/features/brands/MerchantTile';
import { ProGate } from '@/features/pro/ProGate';
import { useSettings } from '@/store/settings';
import { formatMoney } from '@/domain/money';
import { formatDay } from '@/lib/date';
import { morningBefore, notifyAt, notifyMessage } from '@/lib/notify';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

// summary figures in whole rupees
const inr = (n: number) => formatMoney(Math.round(n / 100) * 100, 'INR', { trimZeros: true });
const sod = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const nextLine = (at: number) => { const d = Math.round((sod(at) - sod(Date.now())) / 86_400_000); return d < 0 ? `was due ${formatDay(at)}` : d === 0 ? 'renews today' : d === 1 ? 'renews tomorrow' : `next ${formatDay(at)}`; };

/** Subscription radar (Pro): every repeating charge, what it costs a year, what renews next, and what went up. */
export default function Radar() {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const state = useSettings((s) => s.radarState);
  const set = useSettings((s) => s.set);
  const q = useQuery((d) => listTransactions(d, { from: Date.now() - 800 * 86_400_000, to: Date.now() + 1, type: 'expense' }), []);
  const view = useMemo(() => (q.data ? radarView(findRepeating(q.data, Date.now()), state, Date.now()) : null), [q.data, state]);

  async function remind(v: RadarView) {
    const r = await notifyAt(morningBefore(v.nextExpected, 1), `${v.name} renews tomorrow`, `${inr(v.amount)} is due. Keep it, or cancel it before it renews.`);
    toast(notifyMessage(r));
    if (r === 'scheduled') await set(db, 'radarState', { ...state, [v.key]: { ...state[v.key], remind: true } });
  }
  function toggleCancel(v: RadarView) {
    if (v.cancelled) return set(db, 'radarState', { ...state, [v.key]: { ...state[v.key], cancelledAt: undefined } });
    Alert.alert(`Mark ${v.name} as cancelled?`, 'Cancel it with the company first. BruhMe stops counting it, and tells you here if it charges you again.', [
      { text: 'Not yet', style: 'cancel' },
      { text: 'I cancelled it', onPress: () => set(db, 'radarState', { ...state, [v.key]: { ...state[v.key], cancelledAt: Date.now() } }) },
    ]);
  }

  return (
    <SubScreen title="Subscription radar">
      <ProGate title="Subscription radar" body="BruhMe finds every repeating charge in your entries, shows what each costs a year, reminds you the day before it renews, and flags price rises and charges that come back after you cancelled.">
        {q.loading && !view ? <SkeletonList n={4} /> : null}
        {view && view.items.length === 0 ? <EmptyState art="chart" title="No repeating charges yet" body="When the same charge shows up every week, month, quarter or year, it appears here." /> : null}
        {view && view.items.length > 0 ? (
          <>
            <Card tone="ink" style={{ gap: space.sm }}>
              <Text v="small" color={colors.onHeroMuted}>Your repeating charges cost</Text>
              <Money size="xl" color={colors.onHero} text={`${inr(view.yearlyActive)}`} />
              <Text v="small" color={colors.onHeroMuted}>a year · about {inr(view.monthlyActive)} a month{view.rises ? ` · ${view.rises} went up` : ''}</Text>
            </Card>
            {view.items.map((v) => (
              <Card key={v.key} style={{ gap: space.md, opacity: v.cancelled && !v.chargedAfterCancel ? 0.6 : 1 }}>
                <Press onPress={() => router.push({ pathname: '/entries', params: { q: v.name, title: v.name } })} accessibilityLabel={`${v.name} payments`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <MerchantTile name={v.name} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text v="title" numberOfLines={1}>{v.name}</Text>
                    <Text v="small" color={colors.textMuted}>
                      {v.status === 'stopped' ? `No charge since ${formatDay(v.lastAt)}` : v.cancelled && !v.chargedAfterCancel ? 'Marked cancelled' : `Every ${periodLabel(v.period)} · ${nextLine(v.nextExpected)}`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Money size="md" align="right" text={inr(v.amount)} />
                    <Text v="small" color={colors.textMuted}>{inr(v.yearly)}/yr</Text>
                  </View>
                </Press>
                {v.chargedAfterCancel ? (
                  <Row style={{ gap: 8, backgroundColor: colors.primarySoft, borderRadius: 12, padding: 10 }}><Icon name="alert" size={16} color={colors.link} /><Text v="small" color={colors.link} style={{ flex: 1 }}>Charged again on {formatDay(v.lastAt)} after you marked it cancelled.</Text></Row>
                ) : v.change > 0 ? (
                  <Row style={{ gap: 8, backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 10 }}><Icon name="arrowUp" size={16} color={colors.expense} /><Text v="small" style={{ flex: 1 }}>Price went up by {inr(v.change)} (was {inr(v.previous ?? 0)}). That is {inr(Math.round(v.change * (v.yearly / v.amount)))} more a year.</Text></Row>
                ) : null}
                {v.status === 'active' ? (
                  <Row style={{ gap: space.sm }}>
                    <Button title={state[v.key]?.remind ? 'Reminder set' : 'Remind me'} kind="secondary" size="sm" icon="bell" onPress={() => remind(v)} style={{ flex: 1 }} />
                    <Button title={v.cancelled ? 'Undo cancelled' : 'I cancelled it'} kind="ghost" size="sm" onPress={() => toggleCancel(v)} />
                  </Row>
                ) : null}
              </Card>
            ))}
            <Text v="small" color={colors.textSubtle} style={{ textAlign: 'center' }}>Found from your own entries. Cancel subscriptions with the company; BruhMe never cancels or pays anything.</Text>
          </>
        ) : null}
      </ProGate>
      <ToastHost />
    </SubScreen>
  );
}
