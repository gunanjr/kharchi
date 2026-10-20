import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Text, Row, Press } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { SkeletonList } from '@/components/Feedback';
import { useIsPro, useProStore } from '@/features/pro/store';
import { PRODUCTS } from '@/features/pro/entitlement';
import { useProStats } from '@/features/pro/widgets';
import { seasonDaysLeft } from '@/features/mce/aura';
import { useStatus } from '@/features/profile/useStatus';
import { Caps, SeasonHero, Bento, StoryRail, ToolRail, Ticket } from '@/features/pro/hub/Blocks';
import { SeasonSection, StoriesSection, MoneySection } from '@/features/pro/hub/Sections';
import { ReportSection } from '@/features/pro/hub/Report';
import { ChallengeBoard } from '@/features/challenges/ChallengeBoard';
import { ToastHost } from '@/components/Toast';
import { seasonTheme as themeFor } from '@/features/pro/hub/theme';
import { CustomiseSheet } from '@/features/pro/hub/Customise';
import { useSettings } from '@/store/settings';
import { ProThemeProvider } from '@/theme/ThemeProvider';
import { fonts, layout, space } from '@/theme/tokens';

type Section = 'all' | 'season' | 'challenges' | 'report' | 'stories' | 'money';
const RAIL: { key: Section; label: string; icon: IconName }[] = [
  { key: 'all', label: 'All', icon: 'menu' },
  { key: 'season', label: 'Season', icon: 'bolt' },
  { key: 'challenges', label: 'Challenges', icon: 'flame' },
  { key: 'report', label: 'Report', icon: 'ribbon' },
  { key: 'stories', label: 'Stories', icon: 'image' },
  { key: 'money', label: 'Money', icon: 'chart' },
];
const PLAN_NAME: Record<string, string> = { [PRODUCTS.monthly]: 'Monthly', [PRODUCTS.yearly]: 'Yearly', [PRODUCTS.lifetime]: 'Lifetime' };
const TOOLS = ['vault', 'dues', 'radar', 'warranty', 'spaces', 'reimburse', 'tax', 'deepdive', 'wrappedYear'];

/**
 * The Pro tab: a place of its own. It takes the month's season colours, opens with a bold line about you, and its
 * sections (Aura, Challenges, Stories, Money, Protect) open right here under a sticky rail instead of sending you away.
 */
export default function ProTab() {
  return <ProThemeProvider><ProTabInner /></ProThemeProvider>;
}

function ProTabInner() {
  const router = useRouter();
  const pro = useIsPro();
  const plan = useProStore((s) => s.entitlement.productId);
  const stats = useProStats();
  const status = useStatus();
  const [section, setSection] = useState<Section>('all');
  const [editing, setEditing] = useState(false);
  const now = Date.now();
  const pick = useSettings((s) => s.proPalette);
  const t = themeFor(now, pick);
  const locked = !pro;
  const ch = stats?.running[0];
  const headline = ch ? `Day ${ch.dayOf} of ${ch.def.days}` : stats ? stats.aura.rank.title : ' ';


  const content = !stats ? <SkeletonList n={3} /> : section === 'all' ? (
    <View style={{ gap: space.xl }}>
      {locked ? <Ticket t={t} title="7 days of Pro, free" line="Everything on this tab, unlocked. Then ₹999 a year or ₹129 a month. Cancel any time." cta="Start free week" onPress={() => router.push('/pro')} /> : null}
      <SeasonHero t={t} stats={stats} onPress={() => setSection('season')} />
      <Bento t={t} stats={stats} locked={locked} />
      <View style={{ gap: space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.brandBlack, fontSize: 22, color: t.ink }}>Make it a story</Text>
          <Press onPress={() => setSection('stories')} accessibilityLabel="See all stories"><Text style={{ fontFamily: fonts.bold, fontSize: 13, color: t.accent }}>See all</Text></Press>
        </Row>
        <StoryRail t={t} stats={stats} />
      </View>
      <View style={{ gap: space.md }}>
        <Text style={{ fontFamily: fonts.brandBlack, fontSize: 22, color: t.ink }}>Pro tools</Text>
        <ToolRail stats={stats} locked={locked} ids={TOOLS} />
      </View>
      {pro ? <Ticket t={t} title="Give 30% off Pro" line="Friends who use your code get 30% off their first year. You get the OG badge." cta="Share your code" onPress={() => router.push('/pro')} /> : null}
      <Press onPress={() => router.push('/pro')} accessibilityLabel="Plan" style={{ alignSelf: 'center', paddingVertical: space.sm }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: t.soft }}>{pro ? 'Manage plan · Restore' : 'Plans · Friend codes · Restore'}</Text>
      </Press>
    </View>
  ) : section === 'season' ? <SeasonSection t={t} stats={stats} />
    : section === 'challenges' ? <ChallengeBoard />
    : section === 'report' ? <ReportSection t={t} stats={stats} locked={locked} />
    : section === 'stories' ? <StoriesSection t={t} stats={stats} />
    : <MoneySection t={t} stats={stats} locked={locked} />;

  return (
    <Screen style={{ backgroundColor: t.base }}>
      <ScrollView stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 168 }}>
        {/* header: a bold line about you, like a store's promise */}
        <View style={{ paddingHorizontal: layout.gutter, paddingTop: space.lg, gap: space.md }}>
          <Row style={{ alignItems: 'flex-start', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: t.ink }}>BruhMe Pro{pro && plan ? ` · ${PLAN_NAME[plan] ?? ''}` : ''}</Text>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: 38, lineHeight: 44, letterSpacing: -1.2, color: t.ink }} numberOfLines={1} adjustsFontSizeToFit>{headline}</Text>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: t.soft }}>{t.name} season · {seasonDaysLeft(now)} days left</Text>
            </View>
            <Press onPress={() => router.push('/me')} accessibilityLabel="Your streak" style={{ alignItems: 'center', borderRadius: 18, backgroundColor: t.tile2, paddingHorizontal: 12, paddingVertical: 8, gap: 2 }}>
              <Icon name="flame" size={20} color={t.accent} />
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: 14, color: t.ink }}>{status.data?.streak ?? 0}</Text>
            </Press>
            <Press onPress={() => router.push('/settings')} accessibilityLabel="Settings" style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.tile2, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="settings" size={20} color={t.ink} />
            </Press>
          </Row>
          <Row style={{ gap: space.sm }}>
            <Press onPress={() => router.push('/story')} accessibilityLabel="Make a story" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: 18, backgroundColor: t.tile2, paddingHorizontal: space.lg, paddingVertical: 14 }}>
              <Icon name="image" size={20} color={t.ink} />
              <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: t.soft }}>Make a story from this month</Text>
            </Press>
            {pro ? (
              <Press onPress={() => setEditing(true)} accessibilityLabel="Choose what shows on your other tabs" style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: t.tile2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="options" size={20} color={t.ink} />
              </Press>
            ) : null}
          </Row>
        </View>

        {/* sticky rail */}
        <View style={{ backgroundColor: t.base, paddingTop: space.md, borderBottomWidth: 1, borderBottomColor: t.line }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.gutter, gap: space.lg }}>
            {RAIL.map((r) => {
              const on = r.key === section;
              return (
                <Press key={r.key} onPress={() => setSection(r.key)} accessibilityLabel={r.label} accessibilityState={{ selected: on }} style={{ alignItems: 'center', gap: 4, paddingBottom: 10, borderBottomWidth: 3, borderBottomColor: on ? t.ink : 'transparent' }}>
                  <Icon name={r.icon} size={24} color={on ? t.ink : t.soft} />
                  <Text style={{ fontFamily: on ? fonts.bold : fonts.semibold, fontSize: 13, color: on ? t.ink : t.soft }}>{r.label}</Text>
                </Press>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: layout.gutter, paddingTop: space.lg }}>
          {section !== 'all' ? <View style={{ marginBottom: space.md }}><Caps color={t.soft}>{RAIL.find((r) => r.key === section)!.label.toUpperCase()}</Caps></View> : null}
          {content}
        </View>
      </ScrollView>

      <CustomiseSheet open={editing} onClose={() => setEditing(false)} />
      <ToastHost />
    </Screen>
  );
}
