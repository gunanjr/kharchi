import React, { useEffect, useRef, useState } from 'react';
import { Switch, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { SubScreen, Card, Text, Row, Button, Chip, Press } from '@/components/ui';
import { SkeletonList } from '@/components/Feedback';
import { ToastHost, toast } from '@/components/Toast';
import { Poster, Big, Hero, PALETTES } from '@/components/story/Poster';
import { Medal } from '@/components/story/Medal';
import { useDb, useQuery } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { ensureSelf, listExpenses, listGroups, listSettlements } from '@/features/groups/repo';
import { reliability, BADGE_LABEL } from '@/features/groups/reliability';
import { currentStreak, personaFor, roastFacts, roastLine, PERSONA_STYLE, type PersonaKey, type RoastTone } from '@/features/persona/persona';
import { longestStreak } from '@/features/wrapped/recap';
import { badgeCounts, badgeStates } from '@/features/wrapped/badges';
import { ProGate } from '@/features/pro/ProGate';
import { useSettings } from '@/store/settings';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

const DAY = 86_400_000;
const TONES: { key: RoastTone; label: string }[] = [{ key: 'toast', label: '🥂 Toast' }, { key: 'gentle', label: '🙂 Gentle' }, { key: 'playful', label: '😏 Playful' }, { key: 'savage', label: '💀 Savage' }];

const StatTile = ({ e, value, label, ink, soft }: { e: string; value: string; label: string; ink: string; soft: string }) => (
  <View style={{ flex: 1, backgroundColor: ink === '#FFFFFF' ? 'rgba(255,255,255,0.18)' : 'rgba(20,24,31,0.1)', borderRadius: 18, paddingVertical: 10, alignItems: 'center' }}>
    <Text style={{ fontSize: 18, lineHeight: 24 }}>{e}</Text>
    <Text style={{ fontFamily: fonts.brandBlack, fontSize: 20, color: ink }}>{value}</Text>
    <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: soft }}>{label}</Text>
  </View>
);

/** Your money profile (Pro): a persona poster, a Roast or toast poster, streaks, Bruh score and badges. On this phone only. */
export default function Me() {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const s = useSettings();
  const personaShot = useRef<React.ElementRef<typeof ViewShot>>(null);
  const roastShot = useRef<React.ElementRef<typeof ViewShot>>(null);
  const [variant, setVariant] = useState(0);
  const now = Date.now();
  const q = useQuery(async (d) => {
    const txs = await listTransactions(d, { from: now - 400 * DAY, to: now + 1 });
    const me = await ensureSelf(d);
    const groups = await listGroups(d);
    const exps = (await Promise.all(groups.map((g) => listExpenses(d, g.id)))).flat();
    const sets = (await Promise.all([...groups.map((g) => listSettlements(d, g.id)), listSettlements(d, null)])).flat();
    return { txs, me, exps, sets };
  }, []);

  const data = q.data;
  const from = now - 30 * DAY;
  const income = data ? data.txs.filter((t) => t.type === 'income' && !t.excluded && t.occurred_at >= from).reduce((a, t) => a + t.amount, 0) : 0;
  const prevSpent = data ? data.txs.filter((t) => t.type === 'expense' && !t.excluded && t.occurred_at >= from - 30 * DAY && t.occurred_at < from).reduce((a, t) => a + t.amount, 0) : 0;
  const persona = data && s.personaOn ? personaFor(data.txs, from, now + 1, { income, prevSpent, previous: (s.personaPrev || null) as PersonaKey | null }) : null;
  const shownKey = persona?.status === 'ok' ? persona.key : null;
  useEffect(() => { if (shownKey && shownKey !== s.personaPrev) s.set(db, 'personaPrev', shownKey); }, [shownKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const streak = data ? currentStreak(data.txs, now) : null;
  const best = data ? longestStreak(data.txs) : null;
  const mine = data ? reliability(data.exps, data.sets.map((x) => ({ from: x.from_person, to: x.to_person, amount: x.amount, occurred_at: x.occurred_at })), 'INR', now)[data.me.id] : undefined;
  const badges = data ? badgeStates(badgeCounts(data.txs, { settlements: data.sets.length, now })) : [];
  const levels = badges.reduce((a, b) => a + b.tier, 0);
  const facts = data ? roastFacts(data.txs, from, now + 1, prevSpent) : [];
  const tone: RoastTone = s.roastOn ? s.roastTone : 'toast';
  const fact = facts.length ? facts[variant % facts.length] : null;
  const line = fact ? roastLine(fact, tone, (n) => formatMoney(n, 'INR', { compact: true }), Math.floor(variant / Math.max(1, facts.length))) : null;
  const style = shownKey ? PERSONA_STYLE[shownKey] : null;
  const pal = style ? PALETTES[style.palette] : PALETTES.midnight;
  const pw = Math.min(360, width - 40);

  async function share(ref: React.RefObject<React.ElementRef<typeof ViewShot> | null>) {
    try {
      const uri = await ref.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch { toast('Couldn’t create the image'); }
  }
  function pickTone(k: RoastTone) {
    if (k === 'toast') s.set(db, 'roastOn', false);
    else { s.set(db, 'roastOn', true); s.set(db, 'roastTone', k); }
    setVariant(0);
  }

  return (
    <SubScreen title="Your profile">
      <ProGate title="Your money profile" body="Your money persona from your own habits, as a poster to share. Plus streaks, your Bruh score, badges, and a monthly Roast or toast. Worked out on your phone by fixed rules.">
        {!data ? <SkeletonList n={3} /> : (
          <>
            {s.personaOn ? (
              <View style={{ alignItems: 'center', gap: space.md }}>
                <ViewShot ref={personaShot} options={{ format: 'png', quality: 1 }}>
                  <Poster palette={style?.palette ?? 'midnight'} label="My money persona" width={pw} height={Math.round(pw * 1.45)}>
                    {persona?.status === 'ok' && style ? (
                      <View style={{ gap: 10 }}>
                        <Hero e={persona.emoji} size={84} />
                        <Big color={pal.ink} size={44}>{persona.name}</Big>
                        <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: pal.ink }}>{style.tagline}</Text>
                        <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                          {style.traits.map((t) => <View key={t} style={{ backgroundColor: pal.ink === '#FFFFFF' ? 'rgba(255,255,255,0.22)' : 'rgba(20,24,31,0.12)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: pal.ink }}>{t}</Text></View>)}
                        </Row>
                        <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: pal.soft }}>Because: {persona.why}, last 30 days</Text>
                        <Row style={{ gap: 8, marginTop: 6 }}>
                          <StatTile e="🔥" value={String(streak?.days ?? 0)} label="day streak" ink={pal.ink} soft={pal.soft} />
                          <StatTile e="🏅" value={String(levels)} label="badge levels" ink={pal.ink} soft={pal.soft} />
                          <StatTile e="⚡" value={mine?.medianDays !== null && mine?.medianDays !== undefined ? `${mine.medianDays}d` : '—'} label="pays back in" ink={pal.ink} soft={pal.soft} />
                        </Row>
                      </View>
                    ) : (
                      <View style={{ gap: 10 }}>
                        <Hero e="🔮" size={70} />
                        <Big color="#FFFFFF" size={36}>Your persona is loading…</Big>
                        <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: PALETTES.midnight.soft }}>It appears after {persona?.status === 'not-enough' ? persona.needed : 'a few more weeks of logging'}.</Text>
                      </View>
                    )}
                  </Poster>
                </ViewShot>
                <Button title="Share my persona" kind="accent" icon="share" onPress={() => share(personaShot)} disabled={persona?.status !== 'ok'} style={{ alignSelf: 'stretch' }} />
              </View>
            ) : null}

            {line ? (
              <View style={{ alignItems: 'center', gap: space.md }}>
                <Row style={{ gap: space.sm, flexWrap: 'wrap', alignSelf: 'stretch' }}>{TONES.map((t) => <Chip key={t.key} label={t.label} selected={tone === t.key} onPress={() => pickTone(t.key)} />)}</Row>
                <ViewShot ref={roastShot} options={{ format: 'png', quality: 1 }}>
                  <Poster palette={tone === 'toast' ? 'sunshine' : tone === 'savage' ? 'midnight' : 'bubblegum'} label={tone === 'toast' ? 'A toast' : `Roasted · ${tone}`} width={pw} height={Math.round(pw * 1.05)}>
                    <Hero e={tone === 'toast' ? '🥂' : tone === 'savage' ? '💀' : '🔥'} size={58} />
                    <Big color={tone === 'toast' ? PALETTES.sunshine.ink : '#FFFFFF'} size={30}>“{line}”</Big>
                  </Poster>
                </ViewShot>
                <Row style={{ gap: space.sm, alignSelf: 'stretch' }}>
                  <Button title="Another one 🔄" kind="secondary" onPress={() => setVariant(variant + 1)} style={{ flex: 1 }} />
                  <Button title="Share" icon="share" onPress={() => share(roastShot)} style={{ flex: 1 }} />
                </Row>
                <Text v="small" color={colors.textMuted} style={{ textAlign: 'center' }}>Roasts are about a habit, never about you. Health, education and income are never mentioned.</Text>
              </View>
            ) : null}

            <Row style={{ gap: space.md }}>
              <Card style={{ flex: 1, gap: 2 }}>
                <Text v="small" color={colors.textMuted}>Logging streak</Text>
                <Text v="h2">{streak?.days ?? 0} 🔥</Text>
                <Text v="small" color={colors.textSubtle}>best {Math.max(best?.days ?? 0, streak?.days ?? 0)} · 1 missed day a week is forgiven</Text>
              </Card>
              <Card style={{ flex: 1, gap: 2 }}>
                <Text v="small" color={colors.textMuted}>Bruh score</Text>
                <Text v="h3">{mine?.badge ? BADGE_LABEL[mine.badge] : 'Not yet'}</Text>
                <Text v="small" color={colors.textSubtle}>{mine?.badge ? `pays back in about ${mine.medianDays} days` : 'settle up twice to see it'}</Text>
              </Card>
            </Row>

            <Press onPress={() => router.push({ pathname: '/wrapped', params: { tab: 'badges' } })} accessibilityLabel="See all badges">
              <Card style={{ gap: space.md }}>
                <Row style={{ justifyContent: 'space-between' }}><Text v="title">Badges</Text><Text v="small" color={colors.link} style={{ fontFamily: fonts.semibold }}>See all</Text></Row>
                <Row style={{ justifyContent: 'space-around' }}>
                  {[...badges].sort((a, b) => b.tier - a.tier).slice(0, 4).map((b) => <View key={b.key} style={{ alignItems: 'center', gap: 4 }}><Medal tier={b.tier} icon={b.icon} size={54} /><Text v="small" color={colors.textMuted}>{b.title}</Text></View>)}
                </Row>
              </Card>
            </Press>

            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Text v="title">Show my persona</Text>
                <Text v="small" color={colors.textMuted}>Turning it off also forgets the last persona on this phone.</Text>
              </View>
              <Switch value={s.personaOn} onValueChange={async (v) => { await s.set(db, 'personaOn', v); if (!v) await s.set(db, 'personaPrev', ''); }} accessibilityLabel="Show my persona" />
            </Card>
          </>
        )}
      </ProGate>
      <ToastHost />
    </SubScreen>
  );
}
