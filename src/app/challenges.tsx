import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { SubScreen, Card, Text, Row, Button, Tag } from '@/components/ui';
import { SkeletonList } from '@/components/Feedback';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { CHALLENGES, challengeView, challengeDef, type ChallengeKey, type ChallengeView } from '@/features/challenges/challenges';
import { ProGate } from '@/features/pro/ProGate';
import { useIsPro } from '@/features/pro/store';
import { useSettings } from '@/store/settings';
import { formatMoney } from '@/domain/money';
import { uuid } from '@/lib/id';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

const DAY = 86_400_000;
const MAX_ACTIVE = 2;

/** Progress as one segment per unit of the goal (7 segments for 7 days), so a glance tells you where you are. */
function Segments({ v }: { v: ChallengeView }) {
  const { colors } = useTheme();
  const n = Math.min(v.goal, 30);
  return (
    <Row style={{ gap: n > 10 ? 2 : 4 }}>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 10, borderRadius: 3, backgroundColor: i < Math.round((v.progress / v.goal) * n) ? (v.status === 'missed' ? colors.onHeroMuted : colors.primary) : 'rgba(255,255,255,0.14)' }} />
      ))}
    </Row>
  );
}

/** Challenges (Pro): short opt-in goals, checked daily from your own entries. Failing costs nothing; start again. */
export default function Challenges() {
  const db = useDb();
  const router = useRouter();
  const pro = useIsPro();
  const { colors } = useTheme();
  const active = useSettings((s) => s.challenges);
  const wins = useSettings((s) => s.challengeWins);
  const set = useSettings((s) => s.set);
  const now = Date.now();
  const q = useQuery((d) => listTransactions(d, { from: now - 120 * DAY, to: now + 1 }), []);
  const money = (n: number) => formatMoney(n, 'INR', { compact: true });
  const views = q.data ? active.map((c) => ({ c, v: challengeView(c, q.data!, now, money) })) : [];

  // a won challenge moves to the trophy shelf once, with a small celebration
  useEffect(() => {
    const won = views.filter((x) => x.v.status === 'won');
    if (!won.length) return;
    set(db, 'challengeWins', [...wins, ...won.map((x) => ({ key: x.c.key, at: now }))]);
    set(db, 'challenges', active.filter((c) => !won.some((x) => x.c.id === c.id)));
    haptic.success();
    toast(`${won[0].v.def.title}: done. Make it a story.`);
  }, [views.map((x) => x.v.status).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start(key: ChallengeKey) {
    if (!pro) return router.push('/pro');
    if (active.some((c) => c.key === key)) return toast('That one is already running.');
    if (active.length >= MAX_ACTIVE) return toast(`Up to ${MAX_ACTIVE} at a time keeps them doable.`);
    await set(db, 'challenges', [...active, { id: uuid(), key, startedAt: Date.now() }]);
    haptic.light();
    toast(new Date().getHours() < 12 ? 'Started. Today counts.' : 'Starts tomorrow morning.');
  }
  async function stop(id: string) { await set(db, 'challenges', active.filter((c) => c.id !== id)); }
  const winsOf = (k: ChallengeKey) => wins.filter((w) => w.key === k).length;

  return (
    <SubScreen title="Challenges">
      <Text color={colors.textMuted}>Short goals with a finish line. Checked every day from what you log. Missing one costs nothing.</Text>
      {!q.data ? <SkeletonList n={2} /> : (
        <>
          {views.map(({ c, v }) => (
            <Card key={c.id} tone="ink" style={{ gap: space.md }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text v="caps" color={colors.onHeroMuted}>{v.status === 'missed' ? 'ENDED' : `DAY ${v.dayOf} OF ${v.def.days}`}</Text>
                {v.status === 'running' ? <Text v="small" color={colors.onHeroMuted}>{v.daysLeft} {v.daysLeft === 1 ? 'day' : 'days'} left</Text> : null}
              </Row>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: 26, color: colors.onHero }}>{v.def.title}</Text>
              <Segments v={v} />
              <Text v="small" color={colors.onHeroMuted}>{v.line}</Text>
              {v.status === 'missed' ? (
                <Row style={{ gap: space.sm }}>
                  <Button title="Try again" kind="accent" size="sm" onPress={async () => { await stop(c.id); await start(c.key); }} />
                  <Button title="Remove" kind="ghost" size="sm" onPress={() => stop(c.id)} />
                </Row>
              ) : <Button title="Give up" kind="ghost" size="sm" onPress={() => stop(c.id)} style={{ alignSelf: 'flex-start' }} />}
            </Card>
          ))}

          <Text v="caps" color={colors.textMuted} style={{ marginTop: space.sm }}>{active.length ? 'START ANOTHER' : 'PICK ONE'}</Text>
          <ProGate title="Challenges" body="Seven no-spend days, thirty days logged, a lighter week, a calm weekend. Daily progress from your own entries, a trophy when you finish, and a story to share.">
            <View style={{ gap: space.sm }}>
              {CHALLENGES.map((d) => {
                const running = active.some((c) => c.key === d.key);
                return (
                  <Card key={d.key} style={{ gap: space.sm }}>
                    <Row style={{ justifyContent: 'space-between', gap: space.md }}>
                      <Text v="title" style={{ flex: 1 }}>{d.title}</Text>
                      {winsOf(d.key) ? <Tag label={`Done ${winsOf(d.key)}×`} tone="income" /> : null}
                    </Row>
                    <Text v="small" color={colors.textMuted}>{d.pitch}</Text>
                    <Button title={running ? 'Running' : 'Start'} kind={running ? 'ghost' : 'secondary'} size="sm" disabled={running} onPress={() => start(d.key)} style={{ alignSelf: 'flex-start' }} />
                  </Card>
                );
              })}
            </View>
          </ProGate>

          {wins.length ? (
            <Card style={{ gap: space.sm }}>
              <Text v="caps" color={colors.textMuted}>TROPHY SHELF</Text>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: 30 }}>{wins.length}</Text>
              <Text v="small" color={colors.textMuted}>{wins.length === 1 ? 'challenge finished' : 'challenges finished'} · last: {challengeDef(wins[wins.length - 1].key as ChallengeKey).title}</Text>
              <Button title="Make it a story" kind="accent" icon="image" onPress={() => router.push('/story')} />
            </Card>
          ) : null}
        </>
      )}
      <ToastHost />
    </SubScreen>
  );
}
