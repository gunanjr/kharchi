import React, { useEffect, useRef } from 'react';
import { Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { SubScreen, Card, Text, Row, Button, Chip } from '@/components/ui';
import { SkeletonList } from '@/components/Feedback';
import { BrandMark } from '@/components/Wordmark';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { ensureSelf, listExpenses, listGroups, listSettlements } from '@/features/groups/repo';
import { reliability, BADGE_LABEL } from '@/features/groups/reliability';
import { currentStreak, personaFor, roastFacts, roastLine, type PersonaKey } from '@/features/persona/persona';
import { longestStreak } from '@/features/wrapped/recap';
import { ProGate } from '@/features/pro/ProGate';
import { useSettings } from '@/store/settings';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

const DAY = 86_400_000;

/** Your BruhMe profile (Pro): money persona, streaks, Bruh score and a monthly Roast or toast. All worked out on this phone. */
export default function Me() {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useSettings();
  const shot = useRef<React.ElementRef<typeof ViewShot>>(null);
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
  const facts = data ? roastFacts(data.txs, from, now + 1, prevSpent) : [];
  const tone = s.roastOn ? s.roastTone : 'toast';
  const line = facts[0] ? roastLine(facts[0], tone, (n) => formatMoney(n, 'INR', { compact: true })) : null;

  async function share() {
    try {
      const uri = await shot.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch { toast('Couldn’t create the image'); }
  }

  return (
    <SubScreen title="Your profile">
      <ProGate title="Your money profile" body="Your money persona from your own habits, logging streaks, your Bruh score (how fast you pay friends back) and a monthly Roast or toast card to share. Worked out on your phone by fixed rules.">
        {!data ? <SkeletonList n={3} /> : (
          <>
            {s.personaOn ? (
              <>
                <ViewShot ref={shot} options={{ format: 'png', quality: 1 }}>
                  <View style={{ backgroundColor: '#14181F', borderRadius: 28, padding: 22, gap: 12 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Row style={{ gap: 8 }}><BrandMark size={26} /><Text style={{ fontFamily: fonts.brandBlack, fontSize: 17, color: '#fff' }}>Bruh<Text style={{ fontFamily: fonts.brandBlack, fontSize: 17, color: '#FF8106' }}>Me</Text></Text></Row>
                      <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>MY MONEY PERSONA</Text>
                    </Row>
                    {persona?.status === 'ok' ? (
                      <>
                        <Text style={{ fontSize: 56 }}>{persona.emoji}</Text>
                        <Text style={{ fontFamily: fonts.brandBlack, fontSize: 30, lineHeight: 34, color: '#fff' }}>{persona.name}</Text>
                        <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Because: {persona.why}, last 30 days.</Text>
                      </>
                    ) : (
                      <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: 'rgba(255,255,255,0.8)' }}>Your persona appears after {persona?.status === 'not-enough' ? persona.needed : 'a few more weeks of logging'}.</Text>
                    )}
                    {line ? (
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 12 }}>
                        <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: '#FF9433', letterSpacing: 1 }}>{tone === 'toast' ? 'A TOAST' : 'A ROAST'}</Text>
                        <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: '#fff', marginTop: 4 }}>{line}</Text>
                      </View>
                    ) : null}
                  </View>
                </ViewShot>
                <Button title="Share my persona" icon="share" onPress={share} disabled={persona?.status !== 'ok'} />
              </>
            ) : null}

            <Row style={{ gap: space.md }}>
              <Card style={{ flex: 1, gap: 4 }}>
                <Text v="small" color={colors.textMuted}>Logging streak</Text>
                <Text v="h2">{streak?.days ?? 0} 🔥</Text>
                <Text v="small" color={colors.textSubtle}>{streak?.freezesUsed ? `${streak.freezesUsed} missed day forgiven` : 'One missed day a week is forgiven'}</Text>
              </Card>
              <Card style={{ flex: 1, gap: 4 }}>
                <Text v="small" color={colors.textMuted}>Longest streak</Text>
                <Text v="h2">{best?.days ?? 0}</Text>
                <Text v="small" color={colors.textSubtle}>days in a row</Text>
              </Card>
            </Row>

            <Card style={{ gap: 4 }}>
              <Text v="small" color={colors.textMuted}>Your Bruh score</Text>
              {mine?.badge ? (
                <>
                  <Text v="h3">{BADGE_LABEL[mine.badge]} · about {mine.medianDays} {mine.medianDays === 1 ? 'day' : 'days'}</Text>
                  <Text v="small" color={colors.textMuted}>How fast you pay friends back{mine.streak >= 2 ? ` · ${mine.streak} on time in a row` : ''}. Only you see this.</Text>
                </>
              ) : <Text v="small" color={colors.textMuted}>Settle up with friends twice and your Bruh score appears here. Only you see it.</Text>}
            </Card>

            <Card style={{ gap: space.md }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text v="title">Roast me</Text>
                  <Text v="small" color={colors.textMuted}>Off: a kind toast. On: a playful roast about a habit, never about you.</Text>
                </View>
                <Switch value={s.roastOn} onValueChange={(v) => s.set(db, 'roastOn', v)} accessibilityLabel="Roast me" />
              </Row>
              {s.roastOn ? <Row style={{ gap: space.sm }}>{(['gentle', 'playful', 'savage'] as const).map((k) => <Chip key={k} label={k[0].toUpperCase() + k.slice(1)} selected={s.roastTone === k} onPress={() => s.set(db, 'roastTone', k)} />)}</Row> : null}
            </Card>

            <Button title="See my badges" kind="secondary" icon="ribbon" onPress={() => router.push('/wrapped')} />
            <Card style={{ gap: space.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text v="title">Show my persona</Text>
                  <Text v="small" color={colors.textMuted}>Turning it off also forgets the last persona on this phone.</Text>
                </View>
                <Switch value={s.personaOn} onValueChange={async (v) => { await s.set(db, 'personaOn', v); if (!v) await s.set(db, 'personaPrev', ''); }} accessibilityLabel="Show my persona" />
              </Row>
            </Card>
          </>
        )}
      </ProGate>
      <ToastHost />
    </SubScreen>
  );
}
