import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Header, Text, Field, Row, Chip, Enter, Card } from '@/components/ui';
import { TxRow } from '@/components/TxRow';
import { EmptyState, SkeletonList, ErrorState } from '@/components/Feedback';
import { Fab } from './index';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { useCategories } from '@/features/tracker/hooks';
import { formatDay, startOfDay } from '@/lib/date';
import { formatMoney } from '@/domain/money';
import { space, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { TxType } from '@/domain/types';
import { readTags } from '@/features/tracker/tags';
import { setExcluded } from '@/features/tracker/exclude';

export default function Activity() {
  const router = useRouter();
  const db = useDb();
  const { colors } = useTheme();
  const { byId } = useCategories();
  const params = useLocalSearchParams<{ cat?: string; q?: string }>();
  const [search, setSearch] = useState(params.q ?? '');
  const [type, setType] = useState<TxType | undefined>();
  const [cat, setCat] = useState<string | undefined>(params.cat);
  React.useEffect(() => { setCat(params.cat); setSearch(params.q ?? ''); }, [params.cat, params.q]);
  const [tag, setTag] = useState<string | undefined>();
  const [onlyOut, setOnlyOut] = useState(false);
  const q = useQuery((db) => listTransactions(db, { search: tag ? `${search} ${tag}`.trim() : search, type, categoryId: cat, limit: 400, includeExcluded: true, onlyExcluded: onlyOut }), [search, type, cat, tag, onlyOut]);
  const tags = useMemo(() => {
    const n = new Map<string, number>();
    for (const t of q.data ?? []) for (const g of readTags(t.tags)) n.set(g, (n.get(g) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([g]) => g);
  }, [q.data]);

  const sections = useMemo(() => {
    const map = new Map<number, { title: string; data: NonNullable<typeof q.data>; total: number }>();
    for (const tx of q.data ?? []) {
      const k = startOfDay(tx.occurred_at);
      const s = map.get(k) ?? { title: formatDay(tx.occurred_at), data: [], total: 0 };
      s.data.push(tx);
      if (tx.type === 'expense' && !tx.excluded) s.total += tx.amount;
      map.set(k, s);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([, v]) => v);
  }, [q.data]);

  return (
    <Screen>
      <Header title="Activity" />
      <View style={{ paddingHorizontal: layout.gutter, gap: space.md, paddingBottom: space.sm }}>
        <Field value={search} onChangeText={setSearch} placeholder="Search merchant, note, tag" accessibilityLabel="Search" returnKeyType="search" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.sm, paddingRight: layout.gutter }} style={{ marginHorizontal: -layout.gutter, paddingLeft: layout.gutter }}>
          {(['expense', 'income', 'transfer'] as TxType[]).map((k) => (
            <Chip key={k} label={k[0].toUpperCase() + k.slice(1)} selected={type === k} onPress={() => setType(type === k ? undefined : k)} />
          ))}
          {(tag ? [tag] : tags).map((g) => <Chip key={g} label={`#${g}`} selected={tag === g} onPress={() => setTag(tag === g ? undefined : g)} />)}
          <Chip label="Not counted" selected={onlyOut} onPress={() => setOnlyOut(!onlyOut)} />
          {cat ? <Chip label={`${byId.get(cat)?.name ?? 'Category'} · clear`} selected onPress={() => setCat(undefined)} /> : null}
        </ScrollView>
      </View>
      {q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : null}
      {q.loading && !q.data ? <SkeletonList /> : null}
      <FlatList
        data={sections}
        keyExtractor={(s) => s.title}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 168 }}
        ListEmptyComponent={q.data ? <EmptyState art="inbox" title={search || type ? 'Nothing matches' : 'No transactions yet'} body={search || type ? 'Try a different search or clear the filters.' : 'Add one with the + button.'} /> : undefined}
        renderItem={({ item: section, index }) => (
          <Enter i={Math.min(index, 4)}>
            <Row style={{ justifyContent: 'space-between', paddingTop: space.lg, paddingBottom: space.sm, paddingHorizontal: 4 }}>
              <Text v="caps" color={colors.textMuted}>{section.title.toUpperCase()}</Text>
              {section.total > 0 && <Text v="small" color={colors.textMuted} style={{ fontVariant: ['tabular-nums'] }}>{formatMoney(section.total, 'INR', { trimZeros: true })}</Text>}
            </Row>
            <Card pad={false} style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
              {section.data.map((tx) => (
                <TxRow key={tx.id} tx={tx} cat={tx.category_id ? byId.get(tx.category_id) : null} onPress={() => router.push(`/tx/${tx.id}`)} onLongPress={async () => { const out = !tx.excluded; await setExcluded(db, tx.id, out); bumpData(); toast(out ? 'Left out of your totals' : 'Counted again', { label: 'Undo', run: async () => { await setExcluded(db, tx.id, !out); bumpData(); } }); }} />
              ))}
            </Card>
          </Enter>
        )}
      />
      <Fab onPress={() => router.push('/add')} label="Add expense" />
      <ToastHost />
    </Screen>
  );
}
