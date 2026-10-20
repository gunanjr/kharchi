import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Svg, { Defs, LinearGradient as SvgGradient, Rect as SvgRect, Stop } from 'react-native-svg';
import { SubScreen, Card, Text, Row, Button, Segmented, Chip } from '@/components/ui';
import { SkeletonList } from '@/components/Feedback';
import { BrandMark } from '@/components/Wordmark';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery } from '@/db/provider';
import { listTransactions, listCategories } from '@/features/tracker/repo';
import { listSettlements } from '@/features/groups/repo';
import { lastWeek, milestones, monthWindow, recap, yearWindow, type Recap } from '@/features/wrapped/recap';
import { ProGate } from '@/features/pro/ProGate';
import { useSettings } from '@/store/settings';
import { formatMoney } from '@/domain/money';
import { formatDay } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

type Tab = 'week' | 'month' | 'year' | 'milestones';
const DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

/** One share card for a recap. Fixed colours so it looks the same wherever it is posted. */
function RecapCard({ r, title, catName, hide }: { r: Recap; title: string; catName: (id: string | null) => string; hide: boolean }) {
  const money = (n: number) => (hide ? '₹•••' : formatMoney(n, 'INR', { compact: true }));
  const rows: [string, string, string][] = [];
  if (r.topPlaces[0]) rows.push(['📍', 'Top place', `${r.topPlaces[0].name} · ${r.topPlaces[0].count}×`]);
  if (r.topCategory) rows.push(['🏷️', 'Most spent on', catName(r.topCategory.id)]);
  if (r.biggest) rows.push(['💥', 'Biggest one', `${r.biggest.name} · ${money(r.biggest.amount)}`]);
  if (r.busiestDay) rows.push(['🔥', 'Busiest day', formatDay(r.busiestDay.at)]);
  if (r.priciestWeekday !== null) rows.push(['📅', 'Priciest days', DAYS[r.priciestWeekday]]);
  if (r.noSpendDays) rows.push(['🧘', 'No-spend days', String(r.noSpendDays)]);
  return (
    <View style={{ borderRadius: 30, overflow: 'hidden', backgroundColor: '#14181F' }}>
      <Svg width="100%" height="100%" style={{ position: 'absolute' }} preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs><SvgGradient id="wr" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#2A3342" /><Stop offset="1" stopColor="#14181F" /></SvgGradient></Defs>
        <SvgRect x="0" y="0" width="100" height="100" fill="url(#wr)" />
      </Svg>
      <View style={{ padding: 22, gap: 16 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row style={{ gap: 8 }}><BrandMark size={28} /><Text style={{ fontFamily: fonts.brandBlack, fontSize: 18, color: '#fff' }}>Bruh<Text style={{ fontFamily: fonts.brandBlack, fontSize: 18, color: '#FF8106' }}>Me</Text></Text></Row>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>WRAPPED</Text>
        </Row>
        <View style={{ gap: 2 }}>
          <Text style={{ fontFamily: fonts.brandBlack, fontSize: 28, lineHeight: 32, color: '#fff' }}>{title}</Text>
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>{r.entries} {r.entries === 1 ? 'spend' : 'spends'} logged</Text>
        </View>
        <View>
          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>Spent</Text>
          <Text style={{ fontFamily: fonts.bold, fontSize: 46, lineHeight: 52, color: '#FF8106', letterSpacing: -1.4 }}>{hide ? '₹•••••' : formatMoney(r.spent, 'INR', { trimZeros: true })}</Text>
          {r.changePct !== null ? <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: r.changePct <= 0 ? '#5FD0A0' : 'rgba(255,255,255,0.75)' }}>{r.changePct <= 0 ? `↓ ${Math.abs(r.changePct)}% less than before` : `↑ ${r.changePct}% more than before`}</Text> : null}
        </View>
        <View style={{ gap: 8 }}>
          {rows.slice(0, 5).map(([e, k, v]) => (
            <Row key={k} style={{ gap: 10, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ fontSize: 16 }}>{e}</Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: 'rgba(255,255,255,0.65)', width: 104 }}>{k}</Text>
              <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: '#fff', textAlign: 'right' }} numberOfLines={1}>{v}</Text>
            </Row>
          ))}
        </View>
        <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>made with BruhMe</Text>
      </View>
    </View>
  );
}

/** Weekly recap (free), Monthly and Yearly Wrapped and milestones (Pro), each shareable as an image. */
export default function Wrapped() {
  const db = useDb();
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('week');
  const [hide, setHide] = useState(false);
  const now = Date.now();
  const d = new Date(now);
  const [monthOff, setMonthOff] = useState(1); // last complete month by default
  const [yearOff, setYearOff] = useState(0);
  const shot = useRef<React.ElementRef<typeof ViewShot>>(null);
  const weekly = useSettings((s) => s.weeklySummary);
  const set = useSettings((s) => s.set);
  const q = useQuery(async (x) => ({ txs: await listTransactions(x, { from: now - 3 * 366 * 86_400_000, to: now + 1 }), cats: await listCategories(x), sets: await listSettlements(x, null).then(async (a) => a) }), []);
  const catName = (id: string | null) => q.data?.cats.find((c) => c.id === id)?.name ?? 'Uncategorised';

  const view = useMemo(() => {
    if (!q.data) return null;
    const txs = q.data.txs;
    if (tab === 'week') return { r: recap(txs, lastWeek(now)), title: 'Your week' };
    if (tab === 'month') { const m = new Date(d.getFullYear(), d.getMonth() - monthOff, 1); const w = monthWindow(m.getFullYear(), m.getMonth()); return { r: recap(txs, w), title: `Your ${w.label.split(' ')[0]}` }; }
    if (tab === 'year') { const w = yearWindow(d.getFullYear() - yearOff); return { r: recap(txs, w), title: `Your ${w.label}` }; }
    return null;
  }, [q.data, tab, monthOff, yearOff, now, d]);
  const earned = useMemo(() => (q.data ? milestones(q.data.txs, { settlements: q.data.sets.map((s) => s.occurred_at) }, now) : []), [q.data, now]);

  async function share() {
    try {
      const uri = await shot.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch { toast('Couldn’t create the image'); }
  }

  const card = view ? (
    <>
      <ViewShot ref={shot} options={{ format: 'png', quality: 1 }}><RecapCard r={view.r} title={view.title} catName={catName} hide={hide} /></ViewShot>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text v="small" color={colors.textMuted}>Hide amounts on the card</Text>
        <Switch value={hide} onValueChange={setHide} accessibilityLabel="Hide amounts on the card" />
      </Row>
      <Button title="Share" icon="share" onPress={share} disabled={view.r.entries === 0} />
      {view.r.entries === 0 ? <Text v="small" color={colors.textMuted} style={{ textAlign: 'center' }}>Nothing logged in this period yet.</Text> : null}
    </>
  ) : null;

  return (
    <SubScreen title="Wrapped">
      <Segmented options={[{ key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }, { key: 'year', label: 'Year' }, { key: 'milestones', label: 'Badges' }]} value={tab} onChange={(k) => setTab(k as Tab)} />
      {!q.data ? <SkeletonList n={3} /> : null}
      {tab === 'week' && q.data ? (
        <>
          {card}
          <Card style={{ gap: space.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text v="title">Monday recap</Text>
                <Text v="small" color={colors.textMuted}>A notification every Monday morning with your week. Optional.</Text>
              </View>
              <Switch value={weekly} onValueChange={(v) => set(db, 'weeklySummary', v)} accessibilityLabel="Monday recap notification" />
            </Row>
          </Card>
        </>
      ) : null}
      {tab === 'month' && q.data ? (
        <ProGate title="Monthly Wrapped" body="Your month as a story card: what you spent, your top place, the biggest day, and how it compares with the month before. Share it or keep it.">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {Array.from({ length: 12 }, (_, i) => i).map((i) => { const m = new Date(d.getFullYear(), d.getMonth() - i, 1); return <Chip key={i} label={i === 0 ? 'This month' : m.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })} selected={monthOff === i} onPress={() => setMonthOff(i)} />; })}
          </ScrollView>
          {card}
        </ProGate>
      ) : null}
      {tab === 'year' && q.data ? (
        <ProGate title="Yearly Wrapped" body="Your whole year in one card, ready to share.">
          <Row style={{ gap: space.sm }}>{[0, 1, 2].map((i) => <Chip key={i} label={String(d.getFullYear() - i)} selected={yearOff === i} onPress={() => setYearOff(i)} />)}</Row>
          {card}
        </ProGate>
      ) : null}
      {tab === 'milestones' && q.data ? (
        <ProGate title="Milestones" body="Badges you earn by logging and settling up: streaks, first 100 entries, a no-spend weekend, a cheaper month. Earned only, never taken away.">
          {earned.length === 0 ? <Text color={colors.textMuted}>Your first badge arrives with your first entry.</Text> : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
              {earned.map((m) => (
                <Card key={m.key} style={{ flexBasis: '46%', flexGrow: 1, alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 34 }}>{m.emoji}</Text>
                  <Text v="title" style={{ textAlign: 'center' }}>{m.title}</Text>
                  <Text v="small" color={colors.textMuted} style={{ textAlign: 'center' }}>{m.detail}</Text>
                  <Text v="small" color={colors.textSubtle}>{formatDay(m.earnedAt)}</Text>
                </Card>
              ))}
            </View>
          )}
        </ProGate>
      ) : null}
      <ToastHost />
    </SubScreen>
  );
}
