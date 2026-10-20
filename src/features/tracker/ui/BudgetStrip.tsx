import { useCarousel } from '@/lib/carousel';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useQuery } from '@/db/provider';
import { Card, Text, Row, IconTile, ProgressBar as Bar, SectionHeader } from '@/components/ui';
import { Glyph } from '@/components/Icon';
import { categoryGlyph } from '@/components/glyphs';
import { listBudgets, spendByCategory, totalsBetween } from '@/features/tracker/repo';
import { budgetProgress } from '@/features/tracker/budgets';
import { useCategories } from '@/features/tracker/hooks';
import { daysInMonth, endOfMonth, startOfMonth } from '@/lib/date';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, space, toneOf } from '@/theme/tokens';
import { useRouter } from 'expo-router';

/** Kept for existing call sites: maps a budget status onto the shared animated bar. */
export function ProgressBar({ pct, status }: { pct: number; status: 'ok' | 'warn' | 'over' }) {
  const { colors } = useTheme();
  return <Bar value={pct / 100} over={status === 'over'} color={status === 'warn' ? colors.warn : colors.primary} />;
}

export function BudgetStrip() {
  const { colors } = useTheme();
  const router = useRouter();
  const { byId } = useCategories();
  const car = useCarousel(2);
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
      <SectionHeader title="Budgets" action="Manage" onAction={() => router.push('/budgets')} style={{ paddingHorizontal: layout.gutter }} />
      <View style={{ paddingHorizontal: layout.gutter }}><ScrollView {...car.props} contentContainerStyle={{ paddingBottom: 14, gap: car.gap }} style={{ marginBottom: -14 }}>
        {q.data.map((p) => {
          const cat = p.budget.category_id ? byId.get(p.budget.category_id) : null;
          const tone = toneOf(cat?.color);
          const g = categoryGlyph(cat);
          const over = p.status === 'over';
          return (
            <Card key={p.budget.id} onPress={() => router.push('/budgets')} style={{ width: car.card, gap: space.md }} accessibilityLabel={`${cat?.name ?? 'Overall'} budget ${p.pct} percent used`}>
              <Row style={{ gap: space.sm }}>
                <IconTile size={36}>{g ? <Glyph name={g} size={17} color={tone} /> : <Glyph name="flag-outline" size={17} color={colors.text} />}</IconTile>
                <Text v="title" numberOfLines={1} style={{ flex: 1 }}>{cat?.name ?? 'Overall'}</Text>
              </Row>
              <Bar value={p.pct / 100} over={over} color={p.status === 'warn' ? colors.warn : cat ? tone : colors.primary} />
              <Text v="small" color={over ? colors.expense : colors.textMuted}>
                {over ? `${formatMoney(-p.remaining, 'INR', { compact: true })} over` : `${formatMoney(p.remaining, 'INR', { compact: true })} left`} · {p.pct}%
              </Text>
            </Card>
          );
        })}
      </ScrollView></View>
    </View>
  );
}
