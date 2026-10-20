import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SubScreen, Card, Text, Row, Button, Press, Chip, SectionHeader, RoundButton } from '@/components/ui';
import { SkeletonList } from '@/components/Feedback';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { listTransactions, setBudget } from '@/features/tracker/repo';
import { useCategories } from '@/features/tracker/hooks';
import { spendCalendar, compareMonths, suggestBudgets } from '@/features/insights/deep';
import { ProGate } from '@/features/pro/ProGate';
import { formatMoney } from '@/domain/money';
import { monthLabel } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

const inr = (n: number) => formatMoney(n, 'INR', { trimZeros: true });
const cmp = (n: number) => formatMoney(n, 'INR', { compact: true });
const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Pro Insights: a spending calendar, any month against another, and budgets suggested from your own history. */
export default function DeepDive() {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const { byId } = useCategories();
  const now = Date.now();
  const today = new Date(now);
  const [calOff, setCalOff] = useState(0);
  const [aOff, setAOff] = useState(1);
  const [bOff, setBOff] = useState(0);
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const q = useQuery((d) => listTransactions(d, { from: now - 400 * 86_400_000, to: now + 1 }), []);
  const name = (id: string | null) => (id ? byId.get(id)?.name ?? 'Other' : 'Uncategorised');
  const ym = (off: number) => { const m = new Date(today.getFullYear(), today.getMonth() - off, 1); return { y: m.getFullYear(), m: m.getMonth(), t: m.getTime() }; };

  const cal = q.data ? spendCalendar(q.data, ym(calOff).y, ym(calOff).m) : null;
  const comp = q.data ? compareMonths(q.data, ym(aOff), ym(bOff)) : null;
  const sugg = q.data ? suggestBudgets(q.data, now) : [];
  const levelColor = (l: number) => (l === 0 ? colors.surfaceAlt : ['', 'rgba(255,129,6,0.22)', 'rgba(255,129,6,0.45)', 'rgba(255,129,6,0.7)', colors.primary][l]);
  const monthChips = (value: number, onPick: (n: number) => void) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
      {Array.from({ length: 12 }, (_, i) => i).map((i) => <Chip key={i} label={new Date(ym(i).t).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })} selected={value === i} onPress={() => onPick(i)} />)}
    </ScrollView>
  );

  async function apply(cat: string, amount: number) {
    try {
      await setBudget(db, cat, amount, 80);
      setApplied((a) => ({ ...a, [cat]: true }));
      bumpData();
      toast(`${name(cat)} budget set to ${inr(amount)}`);
    } catch { toast('Could not set that budget'); }
  }

  return (
    <SubScreen title="Deep dive">
      <ProGate title="Deep dive" body="A calendar of your spending day by day, any month compared with another, and budgets suggested from what you actually spend.">
        {!q.data ? <SkeletonList n={4} /> : null}
        {cal ? (
          <View style={{ gap: space.sm }}>
            <SectionHeader title="Spending calendar" />
            <Card style={{ gap: space.md }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <RoundButton icon="back" label="Previous month" size={36} onPress={() => setCalOff(Math.min(11, calOff + 1))} />
                <View style={{ alignItems: 'center' }}>
                  <Text v="title">{monthLabel(ym(calOff).t)}</Text>
                  <Text v="small" color={colors.textMuted}>{inr(cal.total)} spent</Text>
                </View>
                <RoundButton icon="chevron" label="Next month" size={36} onPress={() => setCalOff(Math.max(0, calOff - 1))} />
              </Row>
              <View style={{ flexDirection: 'row' }}>{WD.map((w, i) => <Text key={i} v="caps" color={colors.textSubtle} style={{ flex: 1, textAlign: 'center' }}>{w}</Text>)}</View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {Array.from({ length: cal.firstWeekday }, (_, i) => <View key={`b${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />)}
                {cal.days.map((dday) => {
                  const { y, m } = ym(calOff);
                  const from = new Date(y, m, dday.day).getTime();
                  return (
                    <View key={dday.day} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
                      <Press onPress={() => dday.total && router.push({ pathname: '/entries', params: { from: String(from), to: String(from + 86_400_000 - 1), title: new Date(from).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }) } })} disabled={!dday.total}
                        accessibilityLabel={`${dday.day}: ${inr(dday.total)}`} style={{ flex: 1, borderRadius: 10, backgroundColor: levelColor(dday.level), alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 12, fontFamily: fonts.semibold, color: dday.level >= 3 ? colors.onPrimary : colors.text }}>{dday.day}</Text>
                      </Press>
                    </View>
                  );
                })}
              </View>
              <Row style={{ gap: 6, justifyContent: 'flex-end' }}>
                <Text v="small" color={colors.textMuted}>less</Text>
                {[0, 1, 2, 3, 4].map((l) => <View key={l} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: levelColor(l) }} />)}
                <Text v="small" color={colors.textMuted}>more</Text>
              </Row>
            </Card>
          </View>
        ) : null}

        {comp ? (
          <View style={{ gap: space.sm }}>
            <SectionHeader title="Compare two months" />
            <Card style={{ gap: space.md }}>
              <Text v="small" color={colors.textMuted}>From</Text>
              {monthChips(aOff, setAOff)}
              <Text v="small" color={colors.textMuted}>To</Text>
              {monthChips(bOff, setBOff)}
              <Row style={{ justifyContent: 'space-between', paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text v="title">Total</Text>
                <Text v="title">{cmp(comp.totalA)} → {cmp(comp.totalB)} <Text v="title" color={comp.diff > 0 ? colors.expense : colors.income}>{comp.diff === 0 ? '' : `${comp.diff > 0 ? '+' : '−'}${cmp(Math.abs(comp.diff))}`}</Text></Text>
              </Row>
              {comp.rows.slice(0, 8).map((r) => (
                <Row key={r.category_id ?? 'none'} style={{ justifyContent: 'space-between', gap: space.md }}>
                  <Text style={{ flex: 1 }} numberOfLines={1}>{name(r.category_id)}</Text>
                  <Text v="small" color={colors.textMuted} style={{ fontVariant: ['tabular-nums'] }}>{cmp(r.a)} → {cmp(r.b)}</Text>
                  <Text v="small" color={r.diff > 0 ? colors.expense : r.diff < 0 ? colors.income : colors.textMuted} style={{ width: 70, textAlign: 'right', fontFamily: fonts.semibold, fontVariant: ['tabular-nums'] }}>{r.diff === 0 ? '0' : `${r.diff > 0 ? '+' : '−'}${cmp(Math.abs(r.diff))}`}</Text>
                </Row>
              ))}
              {comp.rows.length === 0 ? <Text color={colors.textMuted}>No spending in these months yet.</Text> : null}
            </Card>
          </View>
        ) : null}

        <View style={{ gap: space.sm }}>
          <SectionHeader title="Budget autopilot" />
          <Card style={{ gap: space.md }}>
            <Text v="small" color={colors.textMuted}>Based on your last three full months (the middle one, rounded up to the next ₹500). Rent and income are left out. Tap Use to set it.</Text>
            {sugg.length === 0 ? <Text color={colors.textMuted}>Log a couple of months and suggestions appear here.</Text> : sugg.map((s) => (
              <Row key={s.category_id} style={{ gap: space.md }}>
                <View style={{ flex: 1 }}>
                  <Text v="title" numberOfLines={1}>{name(s.category_id)}</Text>
                  <Text v="small" color={colors.textMuted}>{s.months.slice().reverse().map(cmp).join(' · ')}</Text>
                </View>
                <Text v="title">{inr(s.suggested)}</Text>
                <Button title={applied[s.category_id] ? 'Set' : 'Use'} size="sm" kind={applied[s.category_id] ? 'ghost' : 'secondary'} disabled={applied[s.category_id]} onPress={() => apply(s.category_id, s.suggested)} />
              </Row>
            ))}
          </Card>
        </View>
      </ProGate>
      <ToastHost />
    </SubScreen>
  );
}
