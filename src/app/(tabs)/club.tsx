import React, { useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Text, Row, Press, Button, Chip } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { SkeletonList } from '@/components/Feedback';
import { useDb } from '@/db/provider';
import { useIsPro, useProStore } from '@/features/pro/store';
import { PRODUCTS } from '@/features/pro/entitlement';
import { WIDGETS, PIN_TABS, useProStats, type PinTab } from '@/features/pro/widgets';
import { seasonDaysLeft } from '@/features/mce/aura';
import { useStatus } from '@/features/profile/useStatus';
import { Caps, SeasonHero, Bento, StoryRail, ToolRail, Ticket } from '@/features/pro/hub/Blocks';
import { SeasonSection, StoriesSection, MoneySection } from '@/features/pro/hub/Sections';
import { ReportSection } from '@/features/pro/hub/Report';
import { ChallengeBoard } from '@/features/challenges/ChallengeBoard';
import { ToastHost } from '@/components/Toast';
import { seasonTheme as themeFor, PALETTE_COUNT, paletteName, paletteSwatch } from '@/features/pro/hub/theme';
import { ProThemeProvider } from '@/theme/ThemeProvider';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
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
  const db = useDb();
  const pro = useIsPro();
  const plan = useProStore((s) => s.entitlement.productId);
  const { colors } = useTheme();
  const pins = useSettings((s) => s.proPins);
  const setSetting = useSettings((s) => s.set);
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

  function togglePin(tab: PinTab, id: string) {
    const cur = pins[tab];
    setSetting(db, 'proPins', { ...pins, [tab]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  }

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

      <Modal visible={editing} transparent animationType="none" onRequestClose={() => setEditing(false)}>
        <Sheet onClose={() => setEditing(false)}>
          <ScrollView style={{ maxHeight: 640 }} contentContainerStyle={{ gap: space.lg, padding: space.lg }}>
            <Text v="h2">Customise Pro</Text>
            <View style={{ gap: space.sm }}>
              <Text v="title">Pro colours</Text>
              <Text v="small" color={colors.textMuted}>Follow the season (a new palette every month), or keep one you like.</Text>
              <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
                <Chip label="Follow the season" selected={pick < 0} onPress={() => setSetting(db, 'proPalette', -1)} />
                {Array.from({ length: PALETTE_COUNT }, (_, i) => (
                  <Press key={i} onPress={() => setSetting(db, 'proPalette', i)} accessibilityLabel={`${paletteName(i)} palette`} accessibilityState={{ selected: pick === i }}
                    style={{ width: 64, borderRadius: 14, overflow: 'hidden', borderWidth: 3, borderColor: pick === i ? colors.primary : 'transparent' }}>
                    <View style={{ height: 34, backgroundColor: paletteSwatch(i)[0], alignItems: 'flex-end', padding: 4 }}><View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: paletteSwatch(i)[1] }} /></View>
                    <Text style={{ fontSize: 10, fontFamily: fonts.semibold, textAlign: 'center', paddingVertical: 3, color: colors.text }}>{paletteName(i).slice(0, 3)}</Text>
                  </Press>
                ))}
              </Row>
            </View>
            <View style={{ gap: space.sm }}>
              <Text v="title">Pin to your tabs</Text>
              <Text v="small" color={colors.textMuted}>Choose which Pro tools show up on Home, Insights and Groups.</Text>
              {WIDGETS.filter((w) => w.id !== 'aura').map((w) => (
                <View key={w.id} style={{ gap: 6 }}>
                  <Text v="small" style={{ fontFamily: fonts.semibold }}>{w.title}</Text>
                  <Row style={{ gap: space.sm }}>
                    {PIN_TABS.filter((x) => (w.id === 'comingUp' ? x.key === 'home' : true)).map((x) => <Chip key={x.key} label={x.label} selected={pins[x.key].includes(w.id)} onPress={() => togglePin(x.key, w.id)} />)}
                  </Row>
                </View>
              ))}
            </View>
            <Button title="Done" kind="accent" onPress={() => setEditing(false)} />
          </ScrollView>
        </Sheet>
      </Modal>
      <ToastHost />
    </Screen>
  );
}
