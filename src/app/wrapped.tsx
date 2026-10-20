import React, { useMemo, useRef, useState } from 'react';
import { FlatList, ScrollView, Switch, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Svg, { Circle } from 'react-native-svg';
import { SubScreen, Card, Text, Row, Button, Segmented, Chip } from '@/components/ui';
import { SkeletonList } from '@/components/Feedback';
import { ToastHost, toast } from '@/components/Toast';
import { Poster, Big, Num, PALETTES, type PaletteKey } from '@/components/story/Poster';
import { Medal } from '@/components/story/Medal';
import { useDb, useQuery } from '@/db/provider';
import { listTransactions, listCategories } from '@/features/tracker/repo';
import { lastWeek, longestStreak, monthWindow, recap, yearWindow, type Recap } from '@/features/wrapped/recap';
import { badgeCounts, badgeStates, TIER_NAME } from '@/features/wrapped/badges';
import { ProGate } from '@/features/pro/ProGate';
import { useSettings } from '@/store/settings';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

type Tab = 'week' | 'month' | 'year' | 'badges';
const DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

function Ring({ pct, color, track }: { pct: number; color: string; track: string }) {
  const r = 54, c = 2 * Math.PI * r;
  return (
    <Svg width={132} height={132} viewBox="0 0 132 132">
      <Circle cx={66} cy={66} r={r} stroke={track} strokeWidth={16} fill="none" />
      <Circle cx={66} cy={66} r={r} stroke={color} strokeWidth={16} fill="none" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 66 66)" />
    </Svg>
  );
}
const Pill = ({ text, p }: { text: string; p: PaletteKey }) => (
  <View style={{ alignSelf: 'flex-start', backgroundColor: PALETTES[p].ink === '#FFFFFF' ? 'rgba(255,255,255,0.22)' : 'rgba(20,24,31,0.12)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}>
    <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: PALETTES[p].ink }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{text}</Text>
  </View>
);
const Soft = ({ children, p }: { children: React.ReactNode; p: PaletteKey }) => <Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: PALETTES[p].soft, marginBottom: 6 }}>{children}</Text>;

/** The story: one poster per slide, each in its own palette. Merchant names only, never other companies' logos. */
function slidesFor(r: Recap, title: string, label: string, catName: (id: string | null) => string, hide: boolean, wins: { streak: number; badges: number }, w: number, h: number) {
  const money = (n: number) => (hide ? '₹•••' : formatMoney(n, 'INR', { trimZeros: true }));
  const days = Math.max(1, Math.round((r.window.to - r.window.from) / 86_400_000));
  const out: { key: string; node: React.ReactNode }[] = [];
  out.push({ key: 'intro', node: (
    <Poster palette="grape" label={label} width={w} height={h}>
      <Soft p="grape">{title.replace(/^Your /, '')}</Soft>
      <Big color={PALETTES.grape.ink} size={54}>{r.changePct !== null && r.changePct <= -5 ? 'Spent less.\nLived well.' : wins.streak >= 7 ? 'Showed up\nevery day.' : 'Kept it\nin check.'}</Big>
      <View style={{ height: 14 }} />
      <Soft p="grape">{[wins.streak >= 3 ? `${wins.streak}-day streak` : null, r.noSpendDays >= 2 ? `${r.noSpendDays} no-spend days` : null].filter(Boolean).join(' · ') || 'Every spend accounted for'}</Soft>
    </Poster>
  ) });
  out.push({ key: 'total', node: (
    <Poster palette="tangerine" label={label} width={w} height={h}>
      {r.changePct !== null && r.changePct < 0 ? (<>
        <Num color={PALETTES.tangerine.ink} size={96}>−{Math.abs(r.changePct)}%</Num>
        <Soft p="tangerine">spent than the month before</Soft>
      </>) : (<>
        <Soft p="tangerine">Spent</Soft>
        <Num color={PALETTES.tangerine.ink} size={58}>{money(r.spent)}</Num>
        <Soft p="tangerine">{hide ? 'and knew where every rupee went' : `about ${money(Math.round(r.spent / days))} a day`}</Soft>
      </>)}
    </Poster>
  ) });
  if (r.topPlaces[0]) out.push({ key: 'place', node: (
    <Poster palette="lime" label={label} width={w} height={h}>
      <Soft p="lime">A regular at</Soft>
      <Big color={PALETTES.lime.ink} size={52}>{r.topPlaces[0].name}</Big>
      <Row style={{ gap: 8, flexWrap: 'wrap', marginTop: 14 }}><Pill p="lime" text={`${r.topPlaces[0].count} ${r.topPlaces[0].count === 1 ? 'visit' : 'visits'}`} />{hide ? null : <Pill p="lime" text={money(r.topPlaces[0].total)} />}</Row>
      {r.topPlaces[1] ? <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: PALETTES.lime.soft, marginTop: 18 }}>Runners-up: {r.topPlaces.slice(1).map((x) => x.name).join(', ')}</Text> : null}
    </Poster>
  ) });
  if (r.topCategory) {
    const pct = r.spent ? r.topCategory.total / r.spent : 0;
    out.push({ key: 'cat', node: (
      <Poster palette="ocean" label={label} width={w} height={h}>
        <Soft p="ocean">Most of it went to</Soft>
        <Big color={PALETTES.ocean.ink} size={48}>{catName(r.topCategory.id)}</Big>
        <Row style={{ gap: 16, marginTop: 18 }}>
          <View style={{ width: 132, height: 132, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute' }}><Ring pct={pct} color={PALETTES.ocean.accent} track="rgba(255,255,255,0.25)" /></View>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 28, color: '#fff' }} numberOfLines={1}>{Math.round(pct * 100)}%</Text>
          </View>
          <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: PALETTES.ocean.soft }}>of everything you spent · {money(r.topCategory.total)}</Text>
        </Row>
      </Poster>
    ) });
  }
  if (r.busiestDay) out.push({ key: 'days', node: (
    <Poster palette="bubblegum" label={label} width={w} height={h}>
      <Soft p="bubblegum">Your biggest day</Soft>
      <Big color={PALETTES.bubblegum.ink} size={44}>{new Date(r.busiestDay.at).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</Big>
      <View style={{ marginTop: 12 }}><Num color={PALETTES.bubblegum.ink} size={40}>{money(r.busiestDay.total)}</Num></View>
      {r.priciestWeekday !== null ? <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: PALETTES.bubblegum.ink, marginTop: 22 }}>{DAYS[r.priciestWeekday]} cost you the most</Text> : null}
    </Poster>
  ) });
  out.push({ key: 'wins', node: (
    <Poster palette="mint" label={label} width={w} height={h}>
      <Big color={PALETTES.mint.ink} size={46}>The wins</Big>
      <View style={{ gap: 10, marginTop: 18 }}>
        <Pill p="mint" text={`${r.noSpendDays} no-spend ${r.noSpendDays === 1 ? 'day' : 'days'}`} />
        <Pill p="mint" text={`${wins.streak}-day best streak`} />
        <Pill p="mint" text={`${wins.badges} badge levels earned`} />
      </View>
    </Poster>
  ) });
  out.push({ key: 'outro', node: (
    <Poster palette="midnight" label={label} width={w} height={h}>
      <Big color="#FFFFFF" size={48}>That’s a wrap.</Big>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: PALETTES.midnight.soft, marginTop: 12 }}>{wins.badges ? `${wins.badges} badge levels and counting.` : 'On to the next one.'}</Text>
    </Poster>
  ) });
  return out;
}

/** Weekly and monthly Wrapped (free), yearly Wrapped (Pro), and badges with levels and progress. */
export default function Wrapped() {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ tab?: string; off?: string }>();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>((params.tab as Tab) || 'month');
  const [hide, setHide] = useState(true); // amounts stay off share slides unless the user turns them on
  const [monthOff, setMonthOff] = useState(params.off ? Number(params.off) : 1);
  const [yearOff, setYearOff] = useState(0);
  const [page, setPage] = useState(0);
  const shots = useRef<(React.ElementRef<typeof ViewShot> | null)[]>([]);
  const weekly = useSettings((s) => s.weeklySummary);
  const sharedCode = useSettings((s) => s.sharedCode);
  const set = useSettings((s) => s.set);
  const now = Date.now();
  const q = useQuery(async (x) => ({ txs: await listTransactions(x, { from: now - 3 * 366 * 86_400_000, to: now + 1 }), cats: await listCategories(x), sets: await x.all<{ occurred_at: number }>('SELECT occurred_at FROM settlements WHERE deleted_at IS NULL') }), []);
  const catName = (id: string | null) => q.data?.cats.find((c) => c.id === id)?.name ?? 'Uncategorised';
  const posterW = Math.min(360, width - 40), posterH = Math.round(posterW * 1.62);

  const badges = q.data ? badgeStates(badgeCounts(q.data.txs, { settlements: q.data.sets.length, now })) : [];
  const earned = badges.reduce((a, b) => a + b.tier, 0);
  const story = useMemo(() => {
    if (!q.data || tab === 'badges') return null;
    const d = new Date(now);
    let r: Recap, title: string, label: string;
    if (tab === 'week') { r = recap(q.data.txs, lastWeek(now)); title = 'Your week'; label = 'Weekly wrapped'; }
    else if (tab === 'month') { const m = new Date(d.getFullYear(), d.getMonth() - monthOff, 1); const w = monthWindow(m.getFullYear(), m.getMonth()); r = recap(q.data.txs, w); title = `Your ${w.label.split(' ')[0]}`; label = `Wrapped · ${m.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`; }
    else { const w = yearWindow(d.getFullYear() - yearOff); r = recap(q.data.txs, w); title = `Your ${w.label}`; label = `Wrapped · ${w.label}`; }
    return { r, slides: slidesFor(r, title, label, catName, hide, { streak: longestStreak(q.data.txs).days, badges: earned }, posterW, posterH) };
  }, [q.data, tab, monthOff, yearOff, hide, posterW, posterH]); // eslint-disable-line react-hooks/exhaustive-deps

  async function share() {
    try {
      const uri = await shots.current[page]?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch { toast('Couldn’t create the image'); }
  }
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  const storyView = story ? (
    story.r.entries === 0 ? <Card><Text color={colors.textMuted}>Nothing logged in this period yet. Your Wrapped appears once you log a few spends.</Text></Card> : (
      <View style={{ gap: space.md, marginHorizontal: -20 }}>
        <Row style={{ gap: 4, paddingHorizontal: 20 }}>
          {story.slides.map((s, i) => <View key={s.key} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= page ? colors.primary : colors.track }} />)}
        </Row>
        <FlatList
          data={story.slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          keyExtractor={(s) => s.key}
          renderItem={({ item, index }) => (
            <View style={{ width, alignItems: 'center' }}>
              <ViewShot ref={(r) => { shots.current[index] = r; }} options={{ format: 'png', quality: 1 }}>{item.node}</ViewShot>
            </View>
          )}
        />
        <View style={{ paddingHorizontal: 20, gap: space.sm }}>
          <Button title={`Share this slide (${page + 1}/${story.slides.length})`} kind="accent" icon="share" onPress={share} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Text v="small" color={colors.textMuted}>Hide amounts on the slides</Text>
            <Switch value={hide} onValueChange={setHide} accessibilityLabel="Hide amounts" />
          </Row>
        </View>
      </View>
    )
  ) : null;

  return (
    <SubScreen title="Wrapped" right={<Button title="Story" size="sm" kind="accent" icon="image" onPress={() => router.push('/story')} />}>
      <Segmented options={[{ key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }, { key: 'year', label: 'Year' }, { key: 'badges', label: 'Badges' }]} value={tab} onChange={(k) => { setTab(k as Tab); setPage(0); }} />
      {!q.data ? <SkeletonList n={3} /> : null}
      {tab === 'month' && q.data ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {Array.from({ length: 12 }, (_, i) => i).map((i) => { const m = new Date(new Date(now).getFullYear(), new Date(now).getMonth() - i, 1); return <Chip key={i} label={i === 0 ? 'This month' : m.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })} selected={monthOff === i} onPress={() => { setMonthOff(i); setPage(0); }} />; })}
        </ScrollView>
      ) : null}
      {tab === 'year' && q.data ? <Row style={{ gap: space.sm }}>{[0, 1, 2].map((i) => <Chip key={i} label={String(new Date(now).getFullYear() - i)} selected={yearOff === i} onPress={() => { setYearOff(i); setPage(0); }} />)}</Row> : null}
      {tab === 'year' ? <ProGate title="Yearly Wrapped" body="Your whole year as a story: total, top places, biggest day, the wins. Made to share.">{storyView}</ProGate> : tab !== 'badges' ? storyView : null}
      {tab === 'week' && q.data ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1 }}><Text v="title">Monday recap</Text><Text v="small" color={colors.textMuted}>A notification every Monday morning with your week.</Text></View>
          <Switch value={weekly} onValueChange={(v) => set(db, 'weeklySummary', v)} accessibilityLabel="Monday recap notification" />
        </Card>
      ) : null}
      {tab === 'badges' && q.data ? (
        <View style={{ gap: space.md }}>
          <Card tone="ink" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Medal tier={earned >= 14 ? 4 : earned >= 8 ? 3 : earned >= 3 ? 2 : earned ? 1 : 0} icon="trophy" size={56} />
            <View style={{ flex: 1 }}><Text v="h3" color={colors.onHero}>{earned} levels earned</Text><Text v="small" color={colors.onHeroMuted}>Earn levels by logging, settling up and keeping streaks. They never go away.</Text></View>
          </Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            {badges.map((b) => (
              <Card key={b.key} style={{ flexBasis: '46%', flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: space.lg }}>
                <Medal tier={b.tier} icon={b.icon} size={76} />
                <Text v="title" style={{ textAlign: 'center' }}>{b.title}</Text>
                <Text v="small" color={b.tier ? colors.link : colors.textSubtle} style={{ fontFamily: fonts.semibold }}>{TIER_NAME[b.tier]}</Text>
                <View style={{ alignSelf: 'stretch', height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: 'hidden' }}><View style={{ width: `${Math.round(b.progress * 100)}%`, height: 8, borderRadius: 4, backgroundColor: colors.primary }} /></View>
                <Text v="small" color={colors.textMuted} style={{ textAlign: 'center' }}>{b.caption}</Text>
              </Card>
            ))}
          </View>
          {sharedCode ? <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}><Medal tier={4} icon="star" size={48} /><View style={{ flex: 1 }}><Text v="title">OG Bruh</Text><Text v="small" color={colors.textMuted}>You shared BruhMe with a friend</Text></View></Card> : null}
        </View>
      ) : null}
      <ToastHost />
    </SubScreen>
  );
}
