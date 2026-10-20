import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Header, Text, Card, Row, Button, Enter, Money, IconTile, Segmented, SectionHeader, Press } from '@/components/ui';
import { Glyph, Icon } from '@/components/Icon';
import { categoryGlyph } from '@/components/glyphs';
import { EmptyState, SkeletonList, ErrorState } from '@/components/Feedback';

import { useQuery } from '@/db/provider';
import { HealthCard } from '@/features/insights/ui/HealthCard';
import { MonthBars, PaceTrack, RankedRow, StackedBar, StatBox, WeekdayBars } from '@/features/insights/ui/parts';
import { MerchantTile } from '@/features/brands/MerchantTile';
import { showPro } from '@/features/pro/flags';
import { useIsPro } from '@/features/pro/store';
import { loadInsights } from '@/features/insights/load';
import { buildRangeInsights } from '@/features/insights/range';
import { savingsTips } from '@/features/insights/analytics';
import { RANGE_LABEL, SPAN, VERSUS_LABEL, type Range } from '@/features/tracker/frames';
import { useCategories } from '@/features/tracker/hooks';
import { formatMoney } from '@/domain/money';
import { endOfMonth, formatDay, monthLabel, startOfDay, startOfMonth } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { chartColors, layout, space, toneOf } from '@/theme/tokens';

const FULL_DAY = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const SHORT: Record<Range, string> = { '1M': '1M', '3M': '3M', '6M': '6M', '1Y': '1Y' };

export default function Insights() {
  const router = useRouter();
  const { colors } = useTheme();
  const { byId } = useCategories();
  const [range, setRange] = useState<Range>('1M');
  const isPro = useIsPro();
  const [monthSel, setMonthSel] = useState<number | null>(null);
  const q = useQuery((db) => loadInsights(db), []);
  const d = q.data;
  const r = useMemo(() => (d ? buildRangeInsights(d.all, Date.now(), range) : null), [d, range]);
  const inr = (n: number) => formatMoney(n, 'INR', { trimZeros: true });
  const cmp = (n: number) => formatMoney(n, 'INR', { compact: true });
  const name = (id: string | null) => (id ? byId.get(id)?.name ?? 'Other' : 'Uncategorised');

  const win = { from: startOfDay(Date.now()) + 86_400_000 - SPAN[range] * 86_400_000, to: Date.now() };
  const prevMonth = d ? d.prevByCat.reduce((a, c) => a + c.total, 0) : 0;
  const cats = r ? r.cats.slice(0, 6).map((c, i) => ({ ...c, color: chartColors[i % chartColors.length] })) : [];
  const restTotal = r ? r.cats.slice(6).reduce((a, c) => a + c.total, 0) : 0;

  return (
    <Screen>
      <Header title="Insights" right={<Row style={{ gap: space.sm }}>{showPro() ? <Button title="Deep dive" kind="secondary" size="sm" icon="chart" onPress={() => router.push('/deep-dive')} /> : null}<Button title="Ask" kind="secondary" size="sm" icon="chat" onPress={() => router.push('/assistant')} /></Row>} />
      {q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : null}
      {q.loading && !d ? <SkeletonList n={4} /> : null}
      {d && d.all.length === 0 ? (
        <EmptyState art="chart" title="Nothing to chart yet" body="Log a few spends and this page turns into a story about your money. Or load sample data from More, Developer." action="Add expense" onAction={() => router.push('/add')} />
      ) : d && r ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: space.xl, paddingBottom: 168 }}>
          <Segmented options={(['1M', '3M', '6M', '1Y'] as Range[]).map((k) => ({ key: k, label: (k === '6M' || k === '1Y') && showPro() && !isPro ? `${SHORT[k]} 🔒` : SHORT[k] }))} value={range} onChange={(k) => { if ((k === '6M' || k === '1Y') && showPro() && !isPro) { router.push('/pro'); return; } setRange(k); setMonthSel(null); }} />

          {/* 1. The headline */}
          <Enter i={0}>
            <Card tone="ink" style={{ gap: space.md }}>
              <Text v="caps" color={colors.onHeroMuted}>SPENT · LAST {RANGE_LABEL[range].toUpperCase()}</Text>
              <Money size="xl" color={colors.onHero} text={inr(r.frame.spent)} />
              {r.frame.percent !== null ? (
                <Row style={{ gap: 6 }}>
                  <Icon name={r.frame.delta > 0 ? 'arrowUp' : 'arrowDown'} color={colors.primary} size={14} />
                  <Text v="small" color={colors.onHero} style={{ fontFamily: 'Geist_600SemiBold' }}>{`${r.frame.delta > 0 ? '+' : '−'}${inr(Math.abs(r.frame.delta))} (${Math.abs(r.frame.percent).toFixed(1)}%)`}</Text>
                  <Text v="small" color={colors.onHeroMuted}>vs {VERSUS_LABEL[range]}</Text>
                </Row>
              ) : <Text v="small" color={colors.onHeroMuted}>Nothing earlier to compare with yet</Text>}
              <View style={{ flexDirection: 'row', gap: space.lg, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.onHeroLine }}>
                <View style={{ flex: 1, gap: 2 }}><Text v="small" color={colors.onHeroMuted}>Income</Text><Money size="md" color={colors.onHero} text={inr(r.frame.income)} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text v="small" color={colors.onHeroMuted}>{r.frame.income - r.frame.spent >= 0 ? 'Kept' : 'Over income by'}</Text>
                  <Money size="md" color={r.frame.income - r.frame.spent >= 0 ? colors.incomeOnHero : colors.expenseOnHero} text={inr(Math.abs(r.frame.income - r.frame.spent))} />
                </View>
                <View style={{ flex: 1, gap: 2 }}><Text v="small" color={colors.onHeroMuted}>No-spend days</Text><Text v="title" color={colors.onHero}>{r.noSpendDays}</Text></View>
              </View>
            </Card>
          </Enter>

          {/* 2. Where it went */}
          {cats.length > 0 ? (
            <Enter i={1}>
              <View style={{ gap: space.sm }}>
                <SectionHeader title="Where it went" />
                <Card style={{ gap: space.sm }}>
                  <StackedBar parts={[...cats.map((c) => ({ value: c.total, color: c.color })), ...(restTotal > 0 ? [{ value: restTotal, color: colors.textSubtle }] : [])]} />
                  <View>
                    {cats.map((c) => {
                      const cat = c.category_id ? byId.get(c.category_id) : undefined;
                      const g = cat ? categoryGlyph(cat) : null;
                      return (
                        <RankedRow
                          key={c.category_id ?? 'none'}
                          tile={<IconTile size={40}>{g ? <Glyph name={g} size={19} color={toneOf(cat?.color)} /> : <Glyph name="ellipsis-horizontal" size={19} color={colors.textMuted} />}</IconTile>}
                          name={name(c.category_id)}
                          amount={inr(c.total)}
                          pct={c.share}
                          color={c.color}
                          onPress={c.category_id ? () => router.push({ pathname: '/entries', params: { cat: c.category_id!, from: String(win.from), to: String(win.to) } }) : undefined}
                        />
                      );
                    })}
                    {restTotal > 0 ? <Text v="small" color={colors.textMuted} style={{ paddingTop: space.sm }}>{`+ ${r.cats.length - 6} smaller ${r.cats.length - 6 === 1 ? 'category' : 'categories'}, ${inr(restTotal)} together`}</Text> : null}
                  </View>
                </Card>
              </View>
            </Enter>
          ) : null}

          {/* 3. Month by month */}
          {r.months.length > 0 ? (() => {
            const i = Math.min(monthSel ?? r.months.length - 1, r.months.length - 1);
            const m = r.months[i];
            const prev = i > 0 ? r.months[i - 1] : null;
            const kept = m.income - m.expense;
            const change = prev && prev.expense > 0 ? ((m.expense - prev.expense) / prev.expense) * 100 : null;
            const avg = r.months.reduce((a, x) => a + x.expense, 0) / r.months.length;
            return (
              <Enter i={2}>
                <View style={{ gap: space.sm }}>
                  <SectionHeader title="Month by month" />
                  <Card style={{ gap: space.lg }}>
                    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ gap: 2 }}>
                        <Text v="small" color={colors.textMuted}>{monthLabel(m.month)}</Text>
                        <Money size="lg" text={inr(m.expense)} />
                      </View>
                      {change !== null ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: change > 0 ? colors.primarySoft : colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                          <Icon name={change > 0 ? 'arrowUp' : 'arrowDown'} size={12} color={change > 0 ? colors.link : colors.income} />
                          <Text v="small" color={change > 0 ? colors.link : colors.income} style={{ fontFamily: 'Geist_600SemiBold' }}>{Math.abs(change).toFixed(0)}% vs {monthLabel(prev!.month).slice(0, 3)}</Text>
                        </View>
                      ) : null}
                    </Row>
                    <MonthBars months={r.months.map((x) => ({ label: monthLabel(x.month).slice(0, 3), expense: x.expense, income: x.income }))} selected={i} onSelect={setMonthSel} format={cmp} />
                    <Row style={{ gap: space.sm }}>
                      <StatBox label="Income" value={cmp(m.income)} />
                      <StatBox label={kept >= 0 ? 'Kept' : 'Over by'} value={cmp(Math.abs(kept))} color={kept >= 0 ? colors.income : colors.expense} />
                      <StatBox label="vs average" value={`${m.expense >= avg ? '+' : '−'}${cmp(Math.abs(Math.round(m.expense - avg)))}`} />
                    </Row>
                    <Press onPress={() => router.push({ pathname: '/entries', params: { from: String(m.month), to: String(endOfMonth(m.month)), title: monthLabel(m.month) } })} accessibilityLabel={`See ${monthLabel(m.month)} entries`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4 }}>
                      <Text v="small" color={colors.link} style={{ fontFamily: 'Geist_600SemiBold' }}>See all {monthLabel(m.month).split(' ')[0]} entries</Text>
                      <Icon name="chevron" size={14} color={colors.link} />
                    </Press>
                  </Card>
                </View>
              </Enter>
            );
          })() : null}

          {/* 4. This month */}
          {(() => {
            const f = d.forecast;
            const left = f.dim - f.day;
            const perDay = Math.round(f.spent / Math.max(1, f.day));
            const diff = prevMonth > 0 ? f.projectedTotal - prevMonth : null;
            return (
              <Enter i={3}>
                <View style={{ gap: space.sm }}>
                  <SectionHeader title="This month" />
                  <Card onPress={() => router.push({ pathname: '/entries', params: { from: String(startOfMonth(Date.now())), to: String(Date.now()), title: monthLabel(Date.now()) } })} accessibilityLabel="This month, open entries" style={{ gap: space.lg }}>
                    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ gap: 2 }}>
                        <Text v="small" color={colors.textMuted}>Spent so far</Text>
                        <Money size="lg" text={inr(f.spent)} />
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text v="small" color={colors.textMuted}>On pace for</Text>
                        <Text v="h3">{cmp(f.projectedTotal)}</Text>
                      </View>
                    </Row>
                    <PaceTrack spent={f.spent} projected={f.projectedTotal} last={prevMonth} format={cmp} />
                    <Row style={{ gap: space.sm }}>
                      <StatBox label="Per day" value={cmp(perDay)} />
                      <StatBox label="Days left" value={String(left)} />
                      <StatBox label={`vs ${monthLabel(startOfMonth(Date.now(), -1)).slice(0, 3)}`} value={diff === null ? '—' : `${diff > 0 ? '+' : '−'}${cmp(Math.abs(diff))}`} color={diff === null ? undefined : diff > 0 ? colors.expense : colors.income} />
                    </Row>
                  </Card>
                </View>
              </Enter>
            );
          })()}

          {/* 5. Which days cost you */}
          {r.priciest !== null ? (
            <Enter i={4}>
              <View style={{ gap: space.sm }}>
                <SectionHeader title="Which days cost you" />
                <Card style={{ gap: space.md }}>
                  <Text v="body" color={colors.textMuted}><Text v="title">{FULL_DAY[r.priciest]}</Text> are your priciest day, {inr(r.weekday[r.priciest])} on average.</Text>
                  <WeekdayBars values={r.weekday} highlight={r.priciest} format={(n) => formatMoney(n, 'INR', { compact: true })} full={(n) => inr(n)} />
                </Card>
              </View>
            </Enter>
          ) : null}

          {/* 6. Top places */}
          {r.merchants.length > 0 ? (
            <Enter i={5}>
              <View style={{ gap: space.sm }}>
                <SectionHeader title="Top places" />
                <Card>
                  {r.merchants.map((m, i) => (
                    <RankedRow key={m.name} tile={<MerchantTile name={m.name} />} name={m.name} amount={inr(m.total)} pct={m.total / r.merchants[0].total} color={chartColors[i % chartColors.length]} onPress={() => router.push({ pathname: '/entries', params: { q: m.name, from: String(win.from), to: String(win.to) } })} />
                  ))}
                </Card>
              </View>
            </Enter>
          ) : null}

          {/* 7. Repeating charges: found in your history, tap to see each one's payments */}
          {d.subs.length > 0 ? (
            <Enter i={6}>
              <View style={{ gap: space.sm }}>
                <SectionHeader title="Repeating charges" action={showPro() ? 'Open radar' : undefined} onAction={showPro() ? () => router.push('/radar') : undefined} />
                <Card style={{ gap: space.xs }}>
                  <Text v="small" color={colors.textMuted}>{`Spotted in your history: ${d.subs.length}, about ${cmp(d.subs.reduce((a, s) => a + s.yearly, 0))} a year`}</Text>
                  {d.subs.map((s) => (
                    <Press key={s.name} onPress={() => router.push({ pathname: '/entries', params: { q: s.name, title: s.name } })} accessibilityLabel={`${s.name}, ${inr(s.amount)} every ${s.everyDays === 30 ? 'month' : s.everyDays === 7 ? 'week' : 'year'}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 8 }}>
                      <MerchantTile name={s.name} />
                      <View style={{ flex: 1 }}>
                        <Text v="title" numberOfLines={1}>{s.name}</Text>
                        <Text v="small" color={colors.textMuted}>every {s.everyDays === 30 ? 'month' : s.everyDays === 7 ? 'week' : 'year'} · next {formatDay(s.nextExpected)}</Text>
                      </View>
                      <Money size="sm" align="right" text={inr(s.amount)} />
                      <Icon name="chevron" size={16} color={colors.textSubtle} />
                    </Press>
                  ))}
                </Card>
              </View>
            </Enter>
          ) : null}

          {/* 8. Worth a look */}
          {d.anomalies.length > 0 ? (
            <Enter i={7}>
              <View style={{ gap: space.sm }}>
                <SectionHeader title="Worth a look" />
                <Card style={{ gap: space.md }}>
                  {d.anomalies.slice(0, 3).map((a, i) => (
                    <Press key={i} onPress={a.tx.id ? () => router.push(`/tx/${a.tx.id}`) : undefined} disabled={!a.tx.id} accessibilityLabel={`Open ${inr(a.tx.amount)} entry`} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                      <View>
                        <MerchantTile name={a.tx.merchant} fallback={<IconTile size={40} icon="alert" color={colors.warn} />} />
                        <View style={{ position: 'absolute', right: -4, top: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.warn, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface }}><Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Geist_700Bold' }}>!</Text></View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text v="title">{inr(a.tx.amount)}{a.tx.merchant ? ` at ${a.tx.merchant}` : ''}</Text>
                        <Text v="small" color={colors.textMuted}>{a.reason}</Text>
                      </View>
                      <Icon name="chevron" size={16} color={colors.textSubtle} />
                    </Press>
                  ))}
                </Card>
              </View>
            </Enter>
          ) : null}

          {/* 9. Health check and ideas */}
          <Enter i={8}>
            <View style={{ gap: space.sm }}>
              <SectionHeader title="Health check" />
              <HealthCard />
            </View>
          </Enter>
          <Enter i={9}>
            <View style={{ gap: space.sm }}>
              <SectionHeader title="Ideas to save" />
              <Card pad={false} style={{ paddingHorizontal: space.lg }}>
                {savingsTips({ byCat: d.byCat, prevByCat: d.prevByCat, subs: d.subs, income: d.income, expense: d.expense, names: name }).slice(0, 3).map((t, i, all) => (
                  <Row key={i} style={{ gap: space.md, alignItems: 'flex-start', paddingVertical: space.md, borderBottomWidth: i === all.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                      <Text v="small" color={colors.link} style={{ fontFamily: 'Geist_700Bold' }}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1 }}>{t}</Text>
                  </Row>
                ))}
              </Card>
            </View>
          </Enter>
          <Text v="small" color={colors.textSubtle} style={{ textAlign: 'center' }}>Estimates from your own entries.</Text>
        </ScrollView>
      ) : null}
    </Screen>
  );
}
