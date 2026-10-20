import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Header, Text, Card, Enter, Press, SectionHeader, IconTile, Button } from '@/components/ui';
import { Wordmark } from '@/components/Wordmark';
import { PrivateRow } from '@/components/PrivateRow';
import { splitPrivate, usePrivateUnlock } from '@/features/privacy/private';
import { PrivacyNote } from '@/components/PrivacyNote';
import { SpendHero } from '@/features/tracker/ui/SpendHero';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TxRow } from '@/components/TxRow';
import { EmptyState, SkeletonList, ErrorState } from '@/components/Feedback';
import { Icon } from '@/components/Icon';
import { PendingStack } from '@/features/pending/PendingStack';
import { BillsCard } from '@/features/bills/BillsCard';
import { BudgetStrip } from '@/features/tracker/ui/BudgetStrip';
import { loadCompleteDemo } from '@/features/dev/loadDemo';
import { PulseWidgets } from '@/features/tracker/ui/PulseWidgets';
import { ToastHost } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { listTransactions, totalsBetween } from '@/features/tracker/repo';
import { useCategories } from '@/features/tracker/hooks';
import { endOfMonth, startOfMonth } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { space, radius, layout } from '@/theme/tokens';
import { useT } from '@/i18n';
import { useSettings } from '@/store/settings';

export default function Home() {
  const spaces = useSettings((st) => st.spaces);
  const unlockedPrivate = usePrivateUnlock((st) => st.unlocked);
  const activeSpaceId = useSettings((st) => st.activeSpace);
  const spaceName = activeSpaceId ? (() => { const x = spaces.find((y) => y.id === activeSpaceId); return x ? `${x.emoji} ${x.name}` : '🙂 Personal'; })() : '🙂 Personal';
  const router = useRouter();
  const db = useDb();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [exploring, setExploring] = useState(false); // the hero chart is being slid along: the page must not scroll
  const { colors } = useTheme();
  const t = useT();
  const currency = useSettings((s) => s.currency);
  const { byId } = useCategories();
  const [refreshing, setRefreshing] = useState(false);
  const now = Date.now();
  const q = useQuery(async (db) => {
    const cur = await totalsBetween(db, startOfMonth(now), endOfMonth(now));
    const prev = await totalsBetween(db, startOfMonth(now, -1), startOfMonth(now, -1) + (now - startOfMonth(now)));
    const recent = await listTransactions(db, { limit: 8, includeExcluded: true });
    return { cur, prev, recent };
  }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await q.refetch(); setRefreshing(false); }, [q]);

  const d = q.data;

  return (
    <Screen>
      <ScrollView
        scrollEnabled={!exploring}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 168, gap: space.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Header title="BruhMe" titleNode={<Wordmark height={38} />} subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} />
        {spaces.length > 0 ? (
          <Press onPress={() => router.push('/spaces')} accessibilityLabel={`Space: ${spaceName}. Tap to switch`} style={{ alignSelf: 'flex-start', marginHorizontal: layout.gutter, marginTop: -4, marginBottom: space.sm, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text v="small" style={{ fontFamily: 'Geist_600SemiBold' }}>{spaceName}</Text>
            <Icon name="chevron" size={14} color={colors.textMuted} />
          </Press>
        ) : null}
        {q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : null}
        {q.loading && !d ? <SkeletonList n={4} /> : null}
        {d && (
          <>
            <Enter style={{ marginHorizontal: layout.gutter }}>
              <SpendHero currency={currency} onExploreChange={setExploring} />
            </Enter>

            <BillsCard />
            <PendingStack />
            <PulseWidgets />
            <BudgetStrip />

            <Enter i={2} style={{ marginHorizontal: layout.gutter }}>
              <Press
                accessibilityLabel={t('home.askAi')}
                onPress={() => router.push('/assistant')}
                style={{ minHeight: 60, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingRight: space.lg, gap: space.md }}
              >
                <IconTile tone="solid" color={colors.primary} size={40} icon="chat" />
                <Text v="body" color={colors.textMuted} style={{ flex: 1 }}>{t('home.askAi')}</Text>
                <Icon name="chevron" color={colors.textSubtle} size={18} />
              </Press>
            </Enter>

            <View style={{ paddingHorizontal: layout.gutter, gap: space.xs }}>
              <SectionHeader title={t('home.recent')} action={t('home.seeAll')} onAction={() => router.push('/activity')} />
              {d.recent.length === 0 ? (
                <>
                  <EmptyState art="wallet" title={t('empty.tx.title')} body={t('empty.tx.body')} action={t('add.title')} onAction={() => router.push('/add')} />
                  <Button title="Explore with sample data" kind="secondary" icon="play" loading={loadingDemo} onPress={async () => { setLoadingDemo(true); try { await loadCompleteDemo(db); bumpData(); } finally { setLoadingDemo(false); } }} />
                </>
              ) : (
                <Card pad={false} style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
                  {splitPrivate(d.recent, unlockedPrivate).visible.map((tx, i) => (
                    <Enter key={tx.id} i={i + 3}>
                      <TxRow tx={tx} cat={tx.category_id ? byId.get(tx.category_id) : null} onPress={() => router.push(`/tx/${tx.id}`)} />
                    </Enter>
                  ))}
                  <PrivateRow hidden={splitPrivate(d.recent, unlockedPrivate).hidden} />
                </Card>
              )}
            </View>
            <PrivacyNote />
          </>
        )}
      </ScrollView>
      <Fab onPress={() => router.push('/add')} label={t('add.title')} />
      <ToastHost />
    </Screen>
  );
}

/** Marigold add button that floats above the tab bar. */
export function Fab({ onPress, label }: { onPress: () => void; label: string }) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Press
      accessibilityLabel={label}
      onPress={onPress}
      feedback="light"
      scale={0.92}
      style={[{ position: 'absolute', right: layout.gutter, bottom: Math.max(insets.bottom, 12) + layout.tabBar + 16, width: 60, height: 60, borderRadius: 22, borderCurve: 'continuous' as any, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, shadows.floating]}
    >
      <Icon name="plus" color={colors.onPrimary} size={28} />
    </Press>
  );
}
