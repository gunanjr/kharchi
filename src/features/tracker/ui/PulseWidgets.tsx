import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Card, Text, Row, Money, IconTile, SectionHeader, Group, ListRow, Tag } from '@/components/ui';
import { Glyph } from '@/components/Icon';
import { accountGlyph, goalGlyph } from '@/components/glyphs';
import { ProgressRing } from '@/components/charts';
import { listGoals, type GoalProgress } from '@/features/goals/repo';
import { useQuery } from '@/db/provider';
import { loadPulse, type Pulse } from '../pulse';
import { formatMoney } from '@/domain/money';
import { formatDay } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, motion, space } from '@/theme/tokens';
import { easeOut } from '@/theme/motion';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function Bar({ h, today, i, label }: { h: number; today: boolean; i: number; label: string }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  React.useEffect(() => { p.value = reduce ? 1 : withDelay(i * motion.stagger, withTiming(1, { duration: 520, easing: easeOut })); }, [p, i, reduce, h]);
  const st = useAnimatedStyle(() => ({ height: Math.max(6, 64 * h * p.value) }));
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <View style={{ height: 64, justifyContent: 'flex-end' }}>
        <Animated.View style={[{ width: 22, borderRadius: 8, backgroundColor: today ? colors.primary : colors.skeleton, borderCurve: 'continuous' as any }, st]} />
      </View>
      <Text v="caps" color={today ? colors.text : colors.textSubtle} style={{ letterSpacing: 0 }}>{label}</Text>
    </View>
  );
}

/** "Today": what is safe to spend per day (from the overall budget) above a seven-day rhythm of daily spend. */
export function TodayCard({ pulse }: { pulse: Pulse }) {
  const { colors } = useTheme();
  const router = useRouter();
  const max = Math.max(1, ...pulse.week.map((d) => d.total));
  const hasBudget = pulse.safePerDay !== null;
  return (
    <Card style={{ gap: space.lg }} onPress={() => router.push(hasBudget ? '/insights' : '/budgets')} accessibilityLabel={hasBudget ? 'Daily allowance' : 'Set a monthly budget'}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: space.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text v="caps" color={colors.textMuted}>{hasBudget ? 'SAFE TO SPEND TODAY' : 'LAST 7 DAYS'}</Text>
          <Money size="xl" text={formatMoney(hasBudget ? pulse.safePerDay! : pulse.weekTotal, 'INR', { trimZeros: true })} />
          <Text v="small" color={pulse.overBudget ? colors.expense : colors.textMuted}>
            {hasBudget
              ? pulse.overBudget ? 'Over this month’s budget' : `Per day for the next ${pulse.daysLeft} days`
              : 'Set a monthly budget to see a daily allowance'}
          </Text>
        </View>
        {pulse.overBudget ? <Tag label="Over" tone="expense" /> : null}
      </Row>
      <Row style={{ alignItems: 'flex-end' }} accessible accessibilityLabel={`Spending this week ${formatMoney(pulse.weekTotal, 'INR', { compact: true })}`}>
        {pulse.week.map((d, i) => (
          <Bar key={d.day} i={i} h={d.total / max} today={i === 6} label={DOW[new Date(d.day).getDay()]} />
        ))}
      </Row>
    </Card>
  );
}

/** Balances of every account, as small tiles that scroll sideways. */
export function AccountsStrip({ pulse }: { pulse: Pulse }) {
  const { colors } = useTheme();
  const router = useRouter();
  if (!pulse.accounts.length) return null;
  const total = pulse.accounts.reduce((a, x) => a + x.balance, 0);
  return (
    <View style={{ gap: space.sm }}>
      <SectionHeader title="Accounts" action="Manage" onAction={() => router.push('/settings/accounts')} style={{ paddingHorizontal: layout.gutter }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 14, gap: space.md }} style={{ marginBottom: -14 }}>
        <Card tone="ink" onPress={() => router.push('/settings/accounts')} accessibilityLabel={`All accounts ${formatMoney(total, 'INR')}`} style={{ width: 168, gap: space.md, justifyContent: 'space-between' }}>
          <Text v="caps" color={colors.onHeroMuted}>ALL ACCOUNTS</Text>
          <Money size="lg" color={colors.onHero} text={formatMoney(total, 'INR', { compact: true })} />
        </Card>
        {pulse.accounts.map(({ account, balance }) => (
          <Card key={account.id} onPress={() => router.push('/settings/accounts')} accessibilityLabel={`${account.name} ${formatMoney(balance, 'INR')}`} style={{ width: 168, gap: space.md }}>
            <IconTile size={36}><Glyph name={accountGlyph(account.type)} size={17} color={colors.text} /></IconTile>
            <View style={{ gap: 2 }}>
              <Text v="small" color={colors.textMuted} numberOfLines={1}>{account.name}</Text>
              <Money size="md" color={balance < 0 ? colors.expense : colors.text} text={formatMoney(balance, 'INR', { compact: true })} />
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

/** Savings goals as ring cards, or a gentle prompt to start one. */
export function GoalsStrip({ goals }: { goals: GoalProgress[] }) {
  const { colors } = useTheme();
  const router = useRouter();
  if (!goals.length)
    return (
      <View style={{ paddingHorizontal: layout.gutter }}>
        <Card onPress={() => router.push('/goals')} accessibilityLabel="Start a savings goal" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <IconTile icon="target" size={44} />
          <View style={{ flex: 1 }}>
            <Text v="title">Save for something</Text>
            <Text v="small" color={colors.textMuted}>Set a target and track it here.</Text>
          </View>
        </Card>
      </View>
    );
  return (
    <View style={{ gap: space.sm }}>
      <SectionHeader title="Goals" action="See all" onAction={() => router.push('/goals')} style={{ paddingHorizontal: layout.gutter }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 14, gap: space.md }} style={{ marginBottom: -14 }}>
        {goals.map((p) => (
          <Card key={p.goal.id} onPress={() => router.push('/goals')} accessibilityLabel={`${p.goal.name}, ${p.pct} percent`} style={{ width: 176, gap: space.md, alignItems: 'flex-start' }}>
            <ProgressRing pct={p.pct} size={64} stroke={7} color={p.done ? colors.income : p.goal.color}>
              <Glyph name={goalGlyph(p.goal.icon)} size={22} color={p.done ? colors.income : p.goal.color} />
            </ProgressRing>
            <View style={{ gap: 2 }}>
              <Text v="title" numberOfLines={1}>{p.goal.name}</Text>
              <Text v="small" color={colors.textMuted}>{p.done ? 'Reached' : `${formatMoney(p.saved, 'INR', { compact: true })} of ${formatMoney(p.goal.target, 'INR', { compact: true })}`}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

/** Recurring payments due in the next ten days. */
export function ComingUp({ pulse }: { pulse: Pulse }) {
  const router = useRouter();
  if (!pulse.upcoming.length) return null;
  return (
    <View style={{ paddingHorizontal: layout.gutter, gap: space.sm }}>
      <SectionHeader title="Coming up" action="All recurring" onAction={() => router.push('/settings/recurring')} />
      <Group>
        {pulse.upcoming.slice(0, 4).map((u) => (
          <ListRow
            key={u.id}
            title={u.name}
            sub={formatDay(u.due)}
            leading={<IconTile size={40} icon="repeat" />}
            right={<Money size="sm" align="right" text={formatMoney(u.amount, 'INR', { trimZeros: true })} />}
            onPress={() => router.push('/settings/recurring')}
          />
        ))}
      </Group>
    </View>
  );
}

/** One query for all three widgets; renders nothing until data arrives so Home never jumps around. */
export function PulseWidgets() {
  const q = useQuery((db) => loadPulse(db), []);
  const g = useQuery((db) => listGoals(db), []);
  if (!q.data) return null;
  return (
    <>
      <View style={{ paddingHorizontal: layout.gutter }}><TodayCard pulse={q.data} /></View>
      <AccountsStrip pulse={q.data} />
      <GoalsStrip goals={g.data ?? []} />
      <ComingUp pulse={q.data} />
    </>
  );
}
