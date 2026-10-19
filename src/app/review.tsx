import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { SubScreen, Card, Text, Row, Button, Enter, Money, RoundButton, ProgressBar } from '@/components/ui';
import { EmptyState } from '@/components/Feedback';
import { Icon } from '@/components/Icon';
import { ToastHost, toast } from '@/components/Toast';
import { useQuery } from '@/db/provider';
import { loadReview } from '@/features/insights/review';
import { useCategories } from '@/features/tracker/hooks';
import { usePlus } from '@/features/entitlements/usePlus';
import { FREE_LIMITS } from '@/features/entitlements';
import { formatMoney } from '@/domain/money';
import { startOfMonth, monthLabel } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { toneOf, space } from '@/theme/tokens';

const DOW = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: '45%', backgroundColor: colors.onHeroLine, borderRadius: 18, padding: space.md, gap: 2 }}>
      <Text v="caps" color={colors.onHeroMuted}>{label.toUpperCase()}</Text>
      <Text v="title" color={colors.onHero} numberOfLines={1}>{value}</Text>
      {sub ? <Text v="small" color={colors.onHeroMuted} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}

export default function Review() {
  const router = useRouter();
  const { colors } = useTheme();
  const plus = usePlus();
  const { byId } = useCategories();
  const [offset, setOffset] = useState(0); // 0 = this month, -1 = last month ...
  const earliestFree = -FREE_LIMITS.reviewMonthsBack;
  const month = startOfMonth(Date.now(), offset);
  const q = useQuery((db) => loadReview(db, month), [month]);
  const shot = useRef<React.ElementRef<typeof ViewShot>>(null);
  const r = q.data;
  const inr = (n: number) => formatMoney(n, 'INR', { trimZeros: true });

  async function share() {
    if (!plus.has('review_share')) {
      toast('Sharing the review card is a Plus feature');
      return router.push('/plus');
    }
    try {
      const uri = await shot.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch {
      toast('Could not create the image');
    }
  }

  return (
    <SubScreen title="Monthly review">
      <Row style={{ justifyContent: 'space-between' }}>
        <RoundButton icon="back" label="Previous month" onPress={() => { if (offset <= earliestFree && !plus.has('full_history')) { toast('Older months are a Plus feature'); return router.push('/plus'); } setOffset(offset - 1); }} />
        <Text v="h3">{monthLabel(month)}</Text>
        <RoundButton icon="chevron" label="Next month" onPress={() => offset < 0 && setOffset(offset + 1)} />
      </Row>
      {r && r.txCount === 0 ? <EmptyState art="chart" title="Nothing in this month" body="Pick another month, or add a few transactions first." /> : null}
      {r && r.txCount > 0 && (
        <>
          <Enter>
            <ViewShot ref={shot} options={{ format: 'png', quality: 1 }}>
              <Card tone="ink" style={{ overflow: 'hidden', gap: space.lg, paddingVertical: space.xl }}>
                <Text v="caps" color={colors.onHeroMuted}>{r.label.toUpperCase()} IN REVIEW</Text>
                <View style={{ gap: 2 }}>
                  <Text v="small" color={colors.onHeroMuted}>{r.saved >= 0 ? 'You kept' : 'You overspent by'}</Text>
                  <Money size="hero" color={r.saved >= 0 ? colors.incomeOnHero : colors.expenseOnHero} text={inr(Math.abs(r.saved))} />
                  <Text v="small" color={colors.onHeroMuted}>
                    {r.rate !== null ? `${Math.round(Math.max(0, r.rate) * 100)}% of income` : 'No income recorded'} · spent {inr(r.expense)}
                  </Text>
                </View>
                <View style={{ gap: space.sm }}>
                  {r.topCategories.map((c) => (
                    <View key={c.category_id ?? 'none'} style={{ gap: 4 }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Text v="small" color={colors.onHero}>{c.category_id ? byId.get(c.category_id)?.name ?? 'Other' : 'Uncategorised'}</Text>
                        <Text v="small" color={colors.onHeroMuted}>{Math.round(c.share * 100)}%</Text>
                      </Row>
                      <ProgressBar value={c.share} color={toneOf(c.category_id ? byId.get(c.category_id)?.color : undefined)} height={8} />
                    </View>
                  ))}
                </View>
                <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
                  {r.vsPrev !== null ? <Stat label="Versus last month" value={`${r.vsPrev > 0 ? '+' : ''}${r.vsPrev}%`} sub={r.vsPrev > 0 ? 'More spending' : 'Less spending'} /> : null}
                  <Stat label="No-spend days" value={String(r.noSpendDays)} sub={r.longestNoSpendRun > 1 ? `Longest run ${r.longestNoSpendRun} days` : undefined} />
                  {r.biggest ? <Stat label="Biggest expense" value={inr(r.biggest.amount)} sub={r.biggest.merchant ?? undefined} /> : null}
                  {r.busiestWeekday !== null ? <Stat label="Heaviest day" value={DOW[r.busiestWeekday]} /> : null}
                </Row>
                <Text v="small" color={colors.onHeroMuted}>Made with Kharchi</Text>
              </Card>
            </ViewShot>
          </Enter>
          <Enter i={1}>
            <Button title={plus.has('review_share') ? 'Share as image' : 'Share as image (Plus)'} kind="secondary" icon={plus.has('review_share') ? 'share' : 'lock'} onPress={share} />
          </Enter>
          <Enter i={2}>
            <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
              <Icon name="info" color={colors.textSubtle} size={18} />
              <Text v="small" color={colors.textMuted} style={{ flex: 1 }}>Everything here is worked out on your phone from your own entries. Nothing is uploaded.</Text>
            </Card>
          </Enter>
        </>
      )}
      <ToastHost />
    </SubScreen>
  );
}
