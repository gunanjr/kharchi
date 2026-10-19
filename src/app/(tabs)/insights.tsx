import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Header, Text, Card, Row, Button, Enter, Money, IconTile } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { EmptyState, SkeletonList, ErrorState } from '@/components/Feedback';
import { BarList, Donut, GroupedBars, Heatmap, LineArea } from '@/components/charts';
import { useQuery } from '@/db/provider';
import { HealthCard } from '@/features/insights/ui/HealthCard';
import { loadInsights } from '@/features/insights/load';
import { savingsTips } from '@/features/insights/analytics';
import { useCategories } from '@/features/tracker/hooks';
import { formatMoney } from '@/domain/money';
import { formatDay, monthLabel } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { space, layout } from '@/theme/tokens';

export default function Insights() {
  const router = useRouter();
  const { colors } = useTheme();
  const { byId } = useCategories();
  const q = useQuery((db) => loadInsights(db), []);
  const d = q.data;
  const name = (id: string | null) => (id ? byId.get(id)?.name ?? 'Other' : 'Uncategorised');
  const inr = (n: number) => formatMoney(n, 'INR', { trimZeros: true });

  return (
    <Screen>
      <Header title="Insights" right={<Button title="Questions" kind="secondary" size="sm" icon="chat" onPress={() => router.push('/assistant')} />} />
      {q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : null}
      {q.loading && !d ? <SkeletonList n={4} /> : null}
      {d && d.all.length === 0 ? (
        <EmptyState art="chart" title="Nothing to chart yet" body="Add a few expenses, or generate demo data in Settings → Developer." action="Add expense" onAction={() => router.push('/add')} />
      ) : d ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: space.lg, paddingBottom: 168 }}>
          <Enter i={0}>
            <Card tone="ink" style={{ gap: space.md }}>
              <Text v="caps" color={colors.onHeroMuted}>{monthLabel(Date.now()).toUpperCase()}</Text>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: space.md }}>
                <View style={{ flex: 1 }}><Text v="small" color={colors.onHeroMuted}>Spent</Text><Money size="lg" color={colors.onHero} text={inr(d.expense)} /></View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}><Text v="small" color={colors.onHeroMuted}>Income</Text><Money size="lg" color={colors.primary} align="right" text={inr(d.income)} /></View>
              </Row>
              {d.prevExpenseSamePoint > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name={d.expense >= d.prevExpenseSamePoint ? 'arrowUp' : 'arrowDown'} color={colors.primary} size={14} />
                  <Text v="small" color={colors.onHeroMuted}>{inr(Math.abs(d.expense - d.prevExpenseSamePoint))} {d.expense >= d.prevExpenseSamePoint ? 'more' : 'less'} than at this point last month</Text>
                </View>
              )}
            </Card>
          </Enter>

          <Enter i={1}><HealthCard /></Enter>

          <Enter i={2}><Card style={{ gap: space.md }}>
            <Text v="h2">Where it went</Text>
            <Donut slices={d.byCat.slice(0, 7).map((c) => ({ label: name(c.category_id), value: c.total, color: c.category_id ? byId.get(c.category_id)?.color : undefined }))} />
          </Card></Enter>

          <Enter i={2}><Card style={{ gap: space.md }}>
            <Text v="h2">Pace & forecast</Text>
            <LineArea actual={d.forecast.actual} projected={d.forecast.projected} />
            <Text v="small" color={colors.textMuted}>On track for about {inr(d.forecast.projectedTotal)} by month end.</Text>
          </Card></Enter>

          <Enter i={3}><Card style={{ gap: space.md }}>
            <Text v="h2">Income vs expense</Text>
            <GroupedBars data={d.trend.map((t) => ({ label: monthLabel(t.month).slice(0, 3), values: [t.income, t.expense] }))} series={[{ name: 'Income', color: colors.income }, { name: 'Expense', color: colors.primary }]} />
          </Card></Enter>

          <Enter i={4}><Card style={{ gap: space.md }}>
            <Text v="h2">Top merchants</Text>
            <BarList rows={d.merchants.map((m) => ({ label: m.name, value: m.total }))} />
          </Card></Enter>

          <Enter i={5}><Card style={{ gap: space.md }}>
            <Text v="h2">Daily heatmap</Text>
            <Heatmap days={d.heat} />
          </Card></Enter>

          {d.subs.length > 0 && (
            <Enter i={6}><Card style={{ gap: space.sm }}>
              <Text v="h2">Subscriptions</Text>
              {d.subs.map((s) => (
                <Row key={s.name} style={{ justifyContent: 'space-between' }}>
                  <View><Text v="title">{s.name}</Text><Text v="small" color={colors.textMuted}>every {s.everyDays === 30 ? 'month' : s.everyDays === 7 ? 'week' : 'year'} · next {formatDay(s.nextExpected)}</Text></View>
                  <Money size="sm" text={inr(s.amount)} align="right" />
                </Row>
              ))}
            </Card></Enter>
          )}

          {d.anomalies.length > 0 && (
            <Enter i={7}><Card style={{ gap: space.md }}>
              <Row style={{ gap: space.sm }}><IconTile size={32} icon="alert" color={colors.warn} /><Text v="h2">Worth a look</Text></Row>
              {d.anomalies.slice(0, 3).map((a, i) => (
                <Text key={i} color={colors.textMuted}>{inr(a.tx.amount)} {a.tx.merchant ? `at ${a.tx.merchant}` : ''}: {a.reason}</Text>
              ))}
            </Card></Enter>
          )}

          <Enter i={8}><Card style={{ gap: space.sm }}>
            <Row style={{ gap: space.sm }}><IconTile size={32} icon="bulb" /><Text v="h2">Ideas to save</Text></Row>
            {savingsTips({ byCat: d.byCat, prevByCat: d.prevByCat, subs: d.subs, income: d.income, expense: d.expense, names: name }).map((t, i) => <Text key={i} color={colors.textMuted}>{t}</Text>)}
          </Card></Enter>
        </ScrollView>
      ) : null}
    </Screen>
  );
}
