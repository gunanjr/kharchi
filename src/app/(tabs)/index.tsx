import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Header, Text, Card, Row, Enter, Chip } from '@/components/ui';
import { AnimatedMoney } from '@/components/AnimatedNumber';
import { TxRow } from '@/components/TxRow';
import { EmptyState, SkeletonList, ErrorState } from '@/components/Feedback';
import { Icon } from '@/components/Icon';
import { PendingStack } from '@/features/pending/PendingStack';
import { BillsCard } from '@/features/bills/BillsCard';
import { BudgetStrip } from '@/features/tracker/ui/BudgetStrip';
import { ToastHost } from '@/components/Toast';
import { useQuery } from '@/db/provider';
import { listTransactions, totalsBetween } from '@/features/tracker/repo';
import { useCategories } from '@/features/tracker/hooks';
import { endOfMonth, startOfMonth, daysInMonth, formatDay } from '@/lib/date';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { space, radius } from '@/theme/tokens';
import { useT } from '@/i18n';
import { useSettings } from '@/store/settings';
import { haptic } from '@/lib/haptics';

export default function Home() {
  const router = useRouter();
  const { colors } = useTheme();
  const t = useT();
  const currency = useSettings((s) => s.currency);
  const { byId } = useCategories();
  const [refreshing, setRefreshing] = useState(false);
  const now = Date.now();
  const q = useQuery(async (db) => {
    const cur = await totalsBetween(db, startOfMonth(now), endOfMonth(now));
    const prev = await totalsBetween(db, startOfMonth(now, -1), startOfMonth(now, -1) + (now - startOfMonth(now)));
    const recent = await listTransactions(db, { limit: 8 });
    return { cur, prev, recent };
  }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await q.refetch(); setRefreshing(false); }, [q]);

  const d = q.data;
  const delta = d && d.prev.expense > 0 ? Math.round(((d.cur.expense - d.prev.expense) / d.prev.expense) * 100) : null;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, gap: space.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Header title="Kharchi" subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} />
        {q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : null}
        {q.loading && !d ? <SkeletonList n={4} /> : null}
        {d && (
          <>
            <Enter>
              <Card style={{ marginHorizontal: space.lg, backgroundColor: colors.primary, borderWidth: 0, paddingVertical: space.xl }}>
                <Text v="caps" color={colors.onPrimary} style={{ opacity: 0.85 }}>{t('home.spentThisMonth').toUpperCase()}</Text>
                <AnimatedMoney value={d.cur.expense} currency={currency} color={colors.onPrimary} trimZeros />
                <Row style={{ marginTop: space.sm, flexWrap: 'wrap' }}>
                  {delta !== null && (
                    <Text v="small" color={colors.onPrimary}>
                      {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}% vs same point last month
                    </Text>
                  )}
                  {d.cur.income > 0 && <Text v="small" color={colors.onPrimary}>· Income {formatMoney(d.cur.income, currency, { compact: true })}</Text>}
                </Row>
              </Card>
            </Enter>

            <BillsCard />
            <PendingStack />
            <BudgetStrip />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.askAi')}
              onPress={() => { haptic.tap(); router.push('/assistant'); }}
              style={{ marginHorizontal: space.lg, minHeight: 56, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, gap: space.md }}
            >
              <Icon name="spark" color={colors.primary} size={20} />
              <Text v="body" color={colors.textMuted} style={{ flex: 1 }}>{t('home.askAi')}</Text>
            </Pressable>

            <View style={{ paddingHorizontal: space.lg, gap: space.xs }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text v="h2">{t('home.recent')}</Text>
                <Pressable accessibilityRole="link" onPress={() => router.push('/activity')} style={{ minHeight: 48, justifyContent: 'center' }}>
                  <Text v="small" color={colors.primary}>{t('home.seeAll')}</Text>
                </Pressable>
              </Row>
              {d.recent.length === 0 ? (
                <EmptyState art="wallet" title={t('empty.tx.title')} body={t('empty.tx.body')} action={t('add.title')} onAction={() => router.push('/add')} />
              ) : (
                d.recent.map((tx, i) => (
                  <Enter key={tx.id} i={i}>
                    <TxRow tx={tx} cat={tx.category_id ? byId.get(tx.category_id) : null} onPress={() => router.push(`/tx/${tx.id}`)} />
                  </Enter>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
      <Fab onPress={() => router.push('/add')} label={t('add.title')} />
      <ToastHost />
    </Screen>
  );
}

export function Fab({ onPress, label }: { onPress: () => void; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => { haptic.light(); onPress(); }}
      style={({ pressed }) => ({
        position: 'absolute', right: space.lg, bottom: space.lg, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Icon name="plus" color={colors.onPrimary} size={28} stroke={2.4} />
    </Pressable>
  );
}
