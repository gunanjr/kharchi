import React from 'react';
import { ScrollView, View } from 'react-native';
import { useQuery } from '@/db/provider';
import { Card, Text, Row } from '@/components/ui';
import { listBudgets, spendByCategory, totalsBetween } from '@/features/tracker/repo';
import { budgetProgress } from '@/features/tracker/budgets';
import { useCategories } from '@/features/tracker/hooks';
import { daysInMonth, endOfMonth, startOfMonth } from '@/lib/date';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { useRouter } from 'expo-router';

export function ProgressBar({ pct, status }: { pct: number; status: 'ok' | 'warn' | 'over' }) {
  const { colors } = useTheme();
  const fill = status === 'over' ? colors.danger : status === 'warn' ? colors.warn : colors.accent;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.min(100, pct) }}
      style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}
    >
      <View style={{ width: `${Math.min(100, pct)}%`, height: 8, backgroundColor: fill, borderRadius: 4 }} />
    </View>
  );
}

export function BudgetStrip() {
  const { colors } = useTheme();
  const router = useRouter();
  const { byId } = useCategories();
  const q = useQuery(async (db) => {
    const now = Date.now();
    const budgets = await listBudgets(db);
    if (!budgets.length) return [];
    const by = await spendByCategory(db, startOfMonth(now), endOfMonth(now));
    const tot = await totalsBetween(db, startOfMonth(now), endOfMonth(now));
    const day = new Date(now).getDate();
    return budgets.map((b) => {
      const spent = b.category_id ? (by.find((x) => x.category_id === b.category_id)?.total ?? 0) : tot.expense;
      return budgetProgress(b, spent, day, daysInMonth(now));
    });
  }, []);
  if (!q.data?.length) return null;
  return (
    <View style={{ gap: space.sm }}>
      <Text v="h2" style={{ paddingHorizontal: space.lg }}>Budgets</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
        {q.data.map((p) => {
          const cat = p.budget.category_id ? byId.get(p.budget.category_id) : null;
          return (
            <Card key={p.budget.id} onPress={() => router.push('/budgets')} style={{ width: 210, gap: space.sm }} accessibilityLabel={`${cat?.name ?? 'Overall'} budget ${p.pct} percent used`}>
              <Row><Text style={{ fontSize: 18 }}>{cat?.icon ?? '🎯'}</Text><Text v="title">{cat?.name ?? 'Overall'}</Text></Row>
              <ProgressBar pct={p.pct} status={p.status} />
              <Text v="small" color={p.status === 'over' ? colors.danger : colors.textMuted}>
                {p.status === 'over' ? `${formatMoney(-p.remaining, 'INR', { compact: true })} over` : `${formatMoney(p.remaining, 'INR', { compact: true })} left`} · {p.pct}%
              </Text>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}
