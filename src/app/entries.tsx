import React, { useMemo } from 'react';
import { SectionList, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Row, Text, Money, RoundButton } from '@/components/ui';
import { TxRow } from '@/components/TxRow';
import { EmptyState, SkeletonList, ErrorState } from '@/components/Feedback';
import { useQuery } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { useCategories } from '@/features/tracker/hooks';
import { formatDay, startOfDay } from '@/lib/date';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { splitPrivate, usePrivateUnlock } from '@/features/privacy/private';
import { PrivateRow } from '@/components/PrivateRow';
import { layout, space } from '@/theme/tokens';

/**
 * A plain list of entries behind a number someone tapped (a category, a merchant, a period). It is its own screen in the
 * stack, so Back returns to exactly where the user was.
 */
export default function Entries() {
  const router = useRouter();
  const { colors } = useTheme();
  const { byId } = useCategories();
  const p = useLocalSearchParams<{ cat?: string; q?: string; from?: string; to?: string; title?: string }>();
  const from = p.from ? Number(p.from) : undefined;
  const to = p.to ? Number(p.to) : undefined;
  const q = useQuery((db) => listTransactions(db, { categoryId: p.cat, search: p.q, from, to, type: 'expense', limit: 500 }), [p.cat, p.q, from, to]);
  const title = p.title ?? (p.cat ? byId.get(p.cat)?.name : p.q) ?? 'Entries';

  const unlockedPrivate = usePrivateUnlock((st) => st.unlocked);
  const split = splitPrivate(q.data ?? [], unlockedPrivate);
  const rows = q.data ? split.visible : undefined;
  const sections = useMemo(() => {
    const map = new Map<number, { title: string; data: NonNullable<typeof rows>; total: number }>();
    for (const tx of rows ?? []) {
      const k = startOfDay(tx.occurred_at);
      const s = map.get(k) ?? { title: formatDay(tx.occurred_at), data: [], total: 0 };
      s.data.push(tx);
      s.total += tx.amount;
      map.set(k, s);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([, v]) => v);
  }, [rows]);
  const total = (q.data ?? []).reduce((a, t) => a + t.amount, 0);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: layout.gutter, paddingTop: space.sm, paddingBottom: space.md }}>
        <RoundButton icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={{ flex: 1 }}>
          <Text v="h2" numberOfLines={1} accessibilityRole="header">{title}</Text>
          {q.data ? <Text v="small" color={colors.textMuted}>{q.data.length} {q.data.length === 1 ? 'entry' : 'entries'} · {formatMoney(total, 'INR', { trimZeros: true })}</Text> : null}
        </View>
      </View>
      {q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : null}
      {q.loading && !q.data ? <SkeletonList n={6} /> : null}
      {q.data && q.data.length === 0 ? <EmptyState art="wallet" title="Nothing here" body="No entries match this in the chosen period." /> : null}
      <SectionList
        sections={sections}
        ListHeaderComponent={<PrivateRow hidden={split.hidden} />}
        keyExtractor={(t) => t.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        initialNumToRender={14}
        windowSize={7}
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 60 }}
        renderSectionHeader={({ section }) => (
          <Row style={{ justifyContent: 'space-between', paddingTop: space.lg, paddingBottom: space.xs }}>
            <Text v="caps" color={colors.textMuted}>{section.title.toUpperCase()}</Text>
            <Money size="sm" color={colors.textMuted} text={formatMoney(Math.round(section.total / 100) * 100, 'INR', { trimZeros: true })} />
          </Row>
        )}
        renderItem={({ item }) => <TxRow tx={item} cat={item.category_id ? byId.get(item.category_id) : null} onPress={() => router.push(`/tx/${item.id}`)} />}
      />
    </Screen>
  );
}
