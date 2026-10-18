import React, { useMemo, useState } from 'react';
import { SectionList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Header, Text, Field, Row, Chip, Enter } from '@/components/ui';
import { TxRow } from '@/components/TxRow';
import { EmptyState, SkeletonList, ErrorState } from '@/components/Feedback';
import { Fab } from './index';
import { ToastHost } from '@/components/Toast';
import { useQuery } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { useCategories } from '@/features/tracker/hooks';
import { formatDay, startOfDay } from '@/lib/date';
import { formatMoney } from '@/domain/money';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { TxType } from '@/domain/types';

export default function Activity() {
  const router = useRouter();
  const { colors } = useTheme();
  const { byId, categories } = useCategories();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TxType | undefined>();
  const [cat, setCat] = useState<string | undefined>();
  const q = useQuery((db) => listTransactions(db, { search, type, categoryId: cat, limit: 400 }), [search, type, cat]);

  const sections = useMemo(() => {
    const map = new Map<number, { title: string; data: NonNullable<typeof q.data>; total: number }>();
    for (const tx of q.data ?? []) {
      const k = startOfDay(tx.occurred_at);
      const s = map.get(k) ?? { title: formatDay(tx.occurred_at), data: [], total: 0 };
      s.data.push(tx);
      if (tx.type === 'expense') s.total += tx.amount;
      map.set(k, s);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([, v]) => v);
  }, [q.data]);

  return (
    <Screen>
      <Header title="Activity" />
      <View style={{ paddingHorizontal: space.lg, gap: space.sm, paddingBottom: space.sm }}>
        <Field value={search} onChangeText={setSearch} placeholder="Search merchant, note, tag" accessibilityLabel="Search" returnKeyType="search" />
        <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
          {(['expense', 'income', 'transfer'] as TxType[]).map((k) => (
            <Chip key={k} label={k[0].toUpperCase() + k.slice(1)} selected={type === k} onPress={() => setType(type === k ? undefined : k)} />
          ))}
          {cat ? <Chip label={`${byId.get(cat)?.name ?? 'Category'} ✕`} selected onPress={() => setCat(undefined)} /> : null}
        </Row>
      </View>
      {q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : null}
      {q.loading && !q.data ? <SkeletonList /> : null}
      <SectionList
        sections={sections}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 120 }}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={q.data ? <EmptyState art="inbox" title={search || type ? 'Nothing matches' : 'No transactions yet'} body={search || type ? 'Try a different search or clear the filters.' : 'Add one with the + button.'} /> : undefined}
        renderSectionHeader={({ section }) => (
          <Row style={{ justifyContent: 'space-between', paddingTop: space.lg, paddingBottom: space.xs }}>
            <Text v="caps" color={colors.textMuted}>{section.title.toUpperCase()}</Text>
            {section.total > 0 && <Text v="small" color={colors.textMuted}>{formatMoney(section.total, 'INR', { trimZeros: true })}</Text>}
          </Row>
        )}
        renderItem={({ item, index }) => (
          <Enter i={index}>
            <TxRow tx={item} cat={item.category_id ? byId.get(item.category_id) : null} onPress={() => router.push(`/tx/${item.id}`)} />
          </Enter>
        )}
      />
      <Fab onPress={() => router.push('/add')} label="Add expense" />
      <ToastHost />
    </Screen>
  );
}
