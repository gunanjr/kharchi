import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { Text, Row, Press, Button, Chip, Field } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { toast } from '@/components/Toast';
import { Medal } from '@/components/story/Medal';
import { useDb, useQuery } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { useCategories } from '@/features/tracker/hooks';
import { CHALLENGES, challengeView, customTitle, type ChallengeKey, type ChallengeView, type CustomSpec, type ActiveChallenge } from './challenges';
import { useIsPro } from '@/features/pro/store';
import { useSettings } from '@/store/settings';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import { uuid } from '@/lib/id';
import { haptic } from '@/lib/haptics';
import { useTheme, useSeason } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

const DAY = 86_400_000;
const MAX_ACTIVE = 2;
const money = (n: number) => formatMoney(n, 'INR', { compact: true });
// each challenge has its own flat colour and one big number as its picture
const LOOK: Record<ChallengeKey, { color: string; big: string; small: string; level: string }> = {
  nospend7: { color: '#0C9C74', big: '7', small: 'no-spend days in 14', level: 'Medium' },
  log30: { color: '#FF8106', big: '30', small: 'days logged in a row', level: 'Hard' },
  lowweek: { color: '#1460FF', big: '−20%', small: 'for one week', level: 'Medium' },
  calmweekend: { color: '#8B5CFF', big: '2', small: 'calm days, Sat and Sun', level: 'Easy' },
  custom: { color: '#FF2E7E', big: '+', small: 'your own rule', level: 'You decide' },
};

/** The running challenge: flat accent card, a day-by-day dot calendar, what today needs. */
function ActiveCard({ v, onStop, onRetry }: { c: ActiveChallenge; v: ChallengeView; onStop: () => void; onRetry: () => void }) {
  const t = useSeason();
  const live = v.status === 'running';
  const bg = live ? t.accent : t.tile2, ink = live ? '#14181F' : '#FFFFFF', soft = live ? 'rgba(20,24,31,0.62)' : 'rgba(255,255,255,0.6)';
  const n = Math.min(v.goal, 30), cols = n > 14 ? 10 : 7, size = 24, gap = 6;
  const filled = Math.round((v.progress / v.goal) * n);
  return (
    <View style={{ borderRadius: 28, backgroundColor: bg, padding: space.lg, gap: space.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ borderRadius: 999, backgroundColor: live ? '#14181F' : 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, color: live ? t.accent : '#FFFFFF' }}>{v.status === 'missed' ? 'ENDED' : `DAY ${v.dayOf} OF ${v.def.days}`}</Text>
        </View>
        {live ? <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: soft }}>{v.daysLeft} {v.daysLeft === 1 ? 'day' : 'days'} left</Text> : null}
      </Row>
      <Text style={{ fontFamily: fonts.brandBlack, fontSize: 30, lineHeight: 34, color: ink, letterSpacing: -0.6 }}>{v.def.title}</Text>
      <Svg width={cols * (size + gap)} height={Math.ceil(n / cols) * (size + gap)}>
        {Array.from({ length: n }, (_, i) => {
          const isToday = live && i === filled;
          return <Circle key={i} cx={(i % cols) * (size + gap) + size / 2} cy={Math.floor(i / cols) * (size + gap) + size / 2} r={size / 2 - 2} fill={i < filled ? ink : 'none'} stroke={ink} strokeOpacity={i < filled ? 1 : isToday ? 1 : 0.25} strokeWidth={isToday ? 3 : 2} strokeDasharray={isToday ? '3 3' : undefined} />;
        })}
      </Svg>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: ink }}>{v.line}</Text>
      <Row style={{ gap: space.sm }}>
        {v.status === 'missed' ? (
          <Press onPress={onRetry} accessibilityLabel="Try again" style={{ borderRadius: 999, backgroundColor: t.accent, paddingHorizontal: 16, paddingVertical: 9 }}><Text style={{ fontFamily: fonts.bold, fontSize: 14, color: '#14181F' }}>Try again</Text></Press>
        ) : null}
        <Press onPress={onStop} accessibilityLabel={v.status === 'missed' ? 'Remove' : 'Give up'} style={{ paddingHorizontal: 4, paddingVertical: 9 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: soft }}>{v.status === 'missed' ? 'Remove' : 'Give up'}</Text></Press>
      </Row>
    </View>
  );
}

/** Builder for "your own" challenge: skip a category, or stay under a daily amount, for a number of days. */
function Builder({ onStart, onClose }: { onStart: (spec: CustomSpec) => void; onClose: () => void }) {
  const { colors } = useTheme();
  const { categories } = useCategories();
  const cats = categories.filter((c) => c.kind === 'expense' && !['cat_rent', 'cat_bills', 'cat_health', 'cat_education'].includes(c.id));
  const [kind, setKind] = useState<CustomSpec['kind']>('skipcat');
  const [cat, setCat] = useState<string | null>(null);
  const [cap, setCap] = useState('');
  const [days, setDays] = useState(7);
  const start = () => {
    if (kind === 'skipcat') {
      const c = cats.find((x) => x.id === cat);
      if (!c) return toast('Pick a category to skip.');
      onStart({ kind, category: c.id, categoryName: c.name, days });
    } else {
      const v = parseAmountToMinor(cap, 'INR');
      if (!v) return toast('Set a daily amount.');
      onStart({ kind, cap: v, days });
    }
  };
  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 620 }} contentContainerStyle={{ gap: space.lg, padding: space.lg }}>
      <Text v="h2">Make your own</Text>
      <Row style={{ gap: space.sm }}>
        <Chip label="Skip a category" selected={kind === 'skipcat'} onPress={() => setKind('skipcat')} />
        <Chip label="Daily limit" selected={kind === 'daycap'} onPress={() => setKind('daycap')} />
      </Row>
      {kind === 'skipcat' ? (
        <View style={{ gap: space.sm }}>
          <Text v="small" color={colors.textMuted}>No spending in this category until the challenge ends.</Text>
          <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{cats.map((c) => <Chip key={c.id} label={c.name} selected={cat === c.id} onPress={() => setCat(c.id)} />)}</Row>
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          <Text v="small" color={colors.textMuted}>Everyday spending under this amount each day. Rent, bills and subscriptions never count.</Text>
          <Field label="Daily limit" value={cap} onChangeText={(x) => setCap(x.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="e.g. 500" />
        </View>
      )}
      <View style={{ gap: space.sm }}>
        <Text v="small" color={colors.textMuted}>For how long</Text>
        <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{[3, 5, 7, 14, 21, 30].map((d) => <Chip key={d} label={`${d} days`} selected={days === d} onPress={() => setDays(d)} />)}</Row>
      </View>
      <Button title="Start challenge" kind="accent" onPress={start} />
      <Button title="Cancel" kind="ghost" onPress={onClose} />
    </ScrollView>
  );
}

/** Challenges, shared by the Pro tab section and the Challenges screen. */
export function ChallengeBoard() {
  const router = useRouter();
  const db = useDb();
  const pro = useIsPro();
  const t = useSeason();
  const active = useSettings((s) => s.challenges);
  const wins = useSettings((s) => s.challengeWins);
  const set = useSettings((s) => s.set);
  const [building, setBuilding] = useState(false);
  const now = Date.now();
  const q = useQuery((d) => listTransactions(d, { from: now - 120 * DAY, to: now + 1 }), []);
  const views = q.data ? active.map((c) => ({ c, v: challengeView(c, q.data!, now, money) })) : [];

  // a won challenge moves to the trophy shelf once
  useEffect(() => {
    const won = views.filter((x) => x.v.status === 'won');
    if (!won.length) return;
    set(db, 'challengeWins', [...wins, ...won.map((x) => ({ key: x.c.key === 'custom' && x.c.custom ? `custom:${customTitle(x.c.custom, money)}` : x.c.key, at: now }))]);
    set(db, 'challenges', active.filter((c) => !won.some((x) => x.c.id === c.id)));
    haptic.success();
    toast(`${won[0].v.def.title}: done. Make it a story.`);
  }, [views.map((x) => x.v.status).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start(key: ChallengeKey, custom?: CustomSpec) {
    if (!pro) return router.push('/pro');
    if (key !== 'custom' && active.some((c) => c.key === key)) return toast('That one is already running.');
    if (active.length >= MAX_ACTIVE) return toast(`Up to ${MAX_ACTIVE} at a time keeps them doable.`);
    await set(db, 'challenges', [...active, { id: uuid(), key, startedAt: Date.now(), custom }]);
    haptic.light();
    toast(new Date().getHours() < 12 ? 'Started. Today counts.' : 'Starts tomorrow morning.');
  }
  const stop = (id: string) => set(db, 'challenges', active.filter((c) => c.id !== id));
  const titleOf = (k: string) => (k.startsWith('custom:') ? k.slice(7) : CHALLENGES.find((c) => c.key === k)?.title ?? 'Challenge');

  return (
    <View style={{ gap: space.lg }}>
      {views.map(({ c, v }) => <ActiveCard key={c.id} c={c} v={v} onStop={() => stop(c.id)} onRetry={async () => { await stop(c.id); await start(c.key, c.custom); }} />)}

      <Text style={{ fontFamily: fonts.brandBlack, fontSize: 22, color: '#FFFFFF' }}>{active.length ? 'Pick your next' : 'Pick a challenge'}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {[...CHALLENGES.map((d) => ({ key: d.key, title: d.title, pitch: d.pitch, days: d.days })), { key: 'custom' as const, title: 'Make your own', pitch: 'Skip a category or keep a daily limit, for as long as you choose.', days: 0 }].map((d) => {
          const look = LOOK[d.key];
          const running = d.key !== 'custom' && active.some((c) => c.key === d.key);
          return (
            <Press key={d.key} onPress={() => (d.key === 'custom' ? (pro ? setBuilding(true) : router.push('/pro')) : start(d.key))} accessibilityLabel={d.title}
              style={{ width: d.key === 'custom' ? '100%' : '48.5%', minHeight: d.key === 'custom' ? 120 : 196, borderRadius: 24, backgroundColor: look.color, padding: space.md, overflow: 'hidden', opacity: running ? 0.55 : 1, flexDirection: d.key === 'custom' ? 'row' : 'column', alignItems: d.key === 'custom' ? 'center' : 'stretch', gap: d.key === 'custom' ? space.md : 0 }}>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: d.key === 'custom' ? 64 : 56, lineHeight: d.key === 'custom' ? 70 : 62, letterSpacing: -2, color: '#FFFFFF' }}>{look.big}</Text>
              <View style={{ flex: d.key === 'custom' ? 1 : undefined, marginTop: d.key === 'custom' ? 0 : 'auto', gap: 4 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{look.small}</Text>
                <Text style={{ fontFamily: fonts.brandBlack, fontSize: 17, lineHeight: 21, color: '#FFFFFF' }}>{d.title}</Text>
                <Row style={{ gap: 6, marginTop: 4 }}>
                  <View style={{ borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontFamily: fonts.bold, fontSize: 11, color: '#FFFFFF' }}>{look.level}</Text></View>
                  {running ? <View style={{ borderRadius: 999, backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontFamily: fonts.bold, fontSize: 11, color: '#14181F' }}>Running</Text></View> : null}
                  {!pro ? <Icon name="lock" size={14} color="#FFFFFF" /> : null}
                </Row>
              </View>
            </Press>
          );
        })}
      </View>

      <View style={{ gap: space.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.brandBlack, fontSize: 22, color: '#FFFFFF' }}>Trophy shelf</Text>
          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: t.accent }}>{wins.length} won</Text>
        </Row>
        {wins.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: space.sm }}>
            {[...wins].reverse().map((w, i) => (
              <View key={`${w.key}${w.at}${i}`} style={{ width: 128, borderRadius: 22, backgroundColor: t.tile, padding: space.md, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: t.line }}>
                <Medal tier={3} icon="trophy" size={52} />
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF', textAlign: 'center' }} numberOfLines={2}>{titleOf(w.key)}</Text>
                <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: t.soft }}>{new Date(w.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
              </View>
            ))}
          </ScrollView>
        ) : <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: t.soft }}>Finish a challenge and its trophy lands here.</Text>}
      </View>

      <Modal visible={building} transparent animationType="none" onRequestClose={() => setBuilding(false)}>
        <Sheet onClose={() => setBuilding(false)}>
          <Builder onClose={() => setBuilding(false)} onStart={async (spec) => { setBuilding(false); await start('custom', spec); }} />
        </Sheet>
      </Modal>
    </View>
  );
}
