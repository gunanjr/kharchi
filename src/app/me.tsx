import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Switch, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { SubScreen, Card, Text, Row, Button, Chip, Press, Field, Swatch, Divider } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { Avatar, AVATAR_COLORS } from '@/features/profile/StatusRow';
import { SkeletonList } from '@/components/Feedback';
import { ToastHost, toast } from '@/components/Toast';
import { Poster, Big, PALETTES, type PaletteKey } from '@/components/story/Poster';
import { Medal } from '@/components/story/Medal';
import { useDb, useQuery } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { ensureSelf, listExpenses, listGroups, listSettlements } from '@/features/groups/repo';
import { reliability, BADGE_LABEL } from '@/features/groups/reliability';
import { currentStreak, personaFor, roastFacts, PERSONA_STYLE, type PersonaKey, type RoastTone } from '@/features/persona/persona';
import { longestStreak } from '@/features/wrapped/recap';
import { badgeCounts, badgeStates, TIER_NAME } from '@/features/wrapped/badges';
import { auraDays, auraScore } from '@/features/mce/aura';
import { dayNumber, markSeen, pickRoast } from '@/features/persona/fresh';
import { useAuraAccess } from '@/features/mce/freeWeek';
import { ProGate } from '@/features/pro/ProGate';
import { useIsPro } from '@/features/pro/store';
import { useSettings } from '@/store/settings';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

const DAY = 86_400_000;
const sod = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
type Tab = 'persona' | 'roast' | 'badges' | 'records';
const TABS: { key: Tab; label: string }[] = [{ key: 'persona', label: 'Persona' }, { key: 'roast', label: 'Roast' }, { key: 'badges', label: 'Badges' }, { key: 'records', label: 'Records' }];
const TONES: { key: RoastTone; label: string }[] = [{ key: 'toast', label: 'Toast' }, { key: 'gentle', label: 'Gentle' }, { key: 'playful', label: 'Playful' }, { key: 'savage', label: 'Savage' }];

function Stat({ value, label, onPress }: { value: string; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Press onPress={onPress} accessibilityLabel={`${value} ${label}`} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={{ fontFamily: fonts.brandBlack, fontSize: 24, lineHeight: 30, color: colors.text }}>{value}</Text>
      <Text v="small" color={colors.textMuted}>{label}</Text>
    </Press>
  );
}
function Rec({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: space.md }}>
      <Text color={colors.textMuted}>{label}</Text>
      <Text v="title">{value}</Text>
    </Row>
  );
}

/**
 * Your profile. The header (avatar, name, streak, aura, badge levels) is for everyone; the persona poster, Roast or
 * toast, badges and records sit behind Pro. Everything is worked out on the phone from your own entries.
 */
export default function Me() {
  const db = useDb();
  const router = useRouter();
  const pro = useIsPro();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const s = useSettings();
  const { access } = useAuraAccess();
  const personaShot = useRef<React.ElementRef<typeof ViewShot>>(null);
  const roastShot = useRef<React.ElementRef<typeof ViewShot>>(null);
  const [variant, setVariant] = useState(0);
  const [tab, setTab] = useState<Tab>('persona');
  const [editing, setEditing] = useState(false);
  const [nameText, setNameText] = useState(s.profileName);
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
  const streak = data ? currentStreak(data.txs, now).days : 0;
  const best = data ? Math.max(longestStreak(data.txs).days, streak) : 0;
  const mine = data ? reliability(data.exps, data.sets.map((x) => ({ from: x.from_person, to: x.to_person, amount: x.amount, occurred_at: x.occurred_at })), 'INR', now)[data.me.id] : undefined;
  const badges = data ? badgeStates(badgeCounts(data.txs, { settlements: data.sets.length, now })) : [];
  const levels = badges.reduce((a, b) => a + b.tier, 0);
  const aura = data ? auraScore(auraDays(data.txs, data.sets.map((x) => x.occurred_at), now)) : null;
  const facts = data ? roastFacts(data.txs, from, now + 1, prevSpent) : [];
  const tone: RoastTone = s.roastOn ? s.roastTone : 'toast';
  // one fresh line a day; "Another one" walks further down the same no-repeat order
  const today = dayNumber(now);
  const pick = pickRoast(facts, tone, (n) => formatMoney(n, 'INR', { compact: true }), today, s.roastSeen, variant);
  const line = pick?.text ?? null;
  useEffect(() => { if (pick && !s.roastSeen.some((x) => x.id === pick.id)) s.set(db, 'roastSeen', markSeen(s.roastSeen, pick.id, today)); }, [pick?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = shownKey ? PERSONA_STYLE[shownKey] : null;
  const posterKey = ((s.posterPalette && s.posterPalette in PALETTES ? s.posterPalette : style?.palette) ?? 'midnight') as PaletteKey;
  const pal = PALETTES[posterKey];
  const pw = Math.min(360, width - 40);

  // records
  const days = data ? new Set(data.txs.map((t) => sod(t.occurred_at))) : new Set<number>();
  const since = data && data.txs.length ? Math.min(...data.txs.map((t) => t.occurred_at)) : null;
  const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
  const spendDays = data ? new Set(data.txs.filter((t) => t.type === 'expense' && !t.excluded && t.occurred_at >= monthStart).map((t) => sod(t.occurred_at))) : new Set<number>();
  const noSpend = [...days].filter((d) => d >= monthStart && !spendDays.has(d)).length;

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
    <SubScreen title="Profile" right={<Press onPress={() => router.push('/settings')} accessibilityLabel="Settings" style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}><Icon name="settings" size={20} color={colors.text} /></Press>}>
      {/* identity */}
      <View style={{ gap: space.lg }}>
        <Row style={{ gap: space.lg }}>
          <Avatar size={84} onPress={() => { setNameText(s.profileName); setEditing(true); }} />
          <Row style={{ flex: 1 }}>
            <Stat value={String(streak)} label="day streak" onPress={() => setTab('records')} />
            <Stat value={access === 'locked' || !aura ? '••' : String(aura.score)} label="aura" onPress={() => router.push('/mce')} />
            <Stat value={String(levels)} label="badges" onPress={() => setTab('badges')} />
          </Row>
        </Row>
        <View style={{ gap: 2 }}>
          <Text v="h2" numberOfLines={1}>{s.profileName || 'Your name'}</Text>
          {pro && persona?.status === 'ok' && style ? (
            <>
              <Text v="title" color={colors.link}>{persona.name}</Text>
              <Text color={colors.textMuted}>{style.tagline}</Text>
            </>
          ) : (
            <Text color={colors.textMuted}>{aura && access !== 'locked' ? aura.rank.title : 'Logging since day one'}</Text>
          )}
        </View>
        <Row style={{ gap: space.sm }}>
          <Button title="Edit profile" kind="secondary" onPress={() => { setNameText(s.profileName); setEditing(true); }} style={{ flex: 1 }} />
          {pro && persona?.status === 'ok' ? <Button title="Share" kind="secondary" icon="share" onPress={() => { setTab('persona'); setTimeout(() => share(personaShot), 250); }} style={{ flex: 1 }} /> : null}
        </Row>
      </View>

      {/* tabs */}
      <Row style={{ borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: space.sm }}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <Press key={t.key} onPress={() => setTab(t.key)} accessibilityLabel={t.label} accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', paddingVertical: space.md, borderBottomWidth: 2, borderBottomColor: on ? colors.ink : 'transparent', marginBottom: -1 }}>
              <Text v="title" color={on ? colors.text : colors.textMuted} style={{ fontSize: 15 }}>{t.label}</Text>
            </Press>
          );
        })}
      </Row>

      <ProGate title="Your money profile" body="Your money persona as a poster to share, a monthly Roast or toast, badges with levels, and your personal records. Worked out on your phone by fixed rules.">
        {!data ? <SkeletonList n={3} /> : (
          <View style={{ gap: space.lg }}>
            {tab === 'persona' ? (
              !s.personaOn ? (
                <Card style={{ gap: space.md }}>
                  <Text color={colors.textMuted}>Your persona is turned off.</Text>
                  <Button title="Turn it on" kind="secondary" onPress={() => s.set(db, 'personaOn', true)} />
                </Card>
              ) : persona?.status === 'ok' && style ? (
                <View style={{ alignItems: 'center', gap: space.md }}>
                  <ViewShot ref={personaShot} options={{ format: 'png', quality: 1 }}>
                    <Poster palette={posterKey} label={s.profileName ? `${s.profileName}’s money persona` : 'My money persona'} width={pw} height={Math.round(pw * 1.3)}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: pal.soft, marginBottom: 6 }}>My money persona is</Text>
                      <Big color={pal.ink} size={46}>{persona.name}</Big>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: pal.ink, marginTop: 10 }}>{style.tagline}</Text>
                      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: pal.soft, marginTop: 6 }}>{style.traits.join(' · ')}</Text>
                      <Row style={{ marginTop: 28, gap: 22 }}>
                        <View><Text style={{ fontFamily: fonts.brandBlack, fontSize: 26, color: pal.ink }}>{streak}</Text><Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: pal.soft }}>day streak</Text></View>
                        <View><Text style={{ fontFamily: fonts.brandBlack, fontSize: 26, color: pal.ink }}>{levels}</Text><Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: pal.soft }}>badge levels</Text></View>
                        {mine?.medianDays !== null && mine?.medianDays !== undefined ? <View><Text style={{ fontFamily: fonts.brandBlack, fontSize: 26, color: pal.ink }}>{mine.medianDays}d</Text><Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: pal.soft }}>pays back in</Text></View> : null}
                      </Row>
                    </Poster>
                  </ViewShot>
                  <Button title="Share my persona" kind="accent" icon="share" onPress={() => share(personaShot)} style={{ alignSelf: 'stretch' }} />
                  <Card style={{ alignSelf: 'stretch', gap: 4 }}>
                    <Text v="caps" color={colors.textMuted}>WHY THIS PERSONA</Text>
                    <Text>{persona.why ? `${persona.why[0].toUpperCase()}${persona.why.slice(1)}, in the last 30 days.` : 'From your last 30 days of spending.'}</Text>
                    <Text v="small" color={colors.textSubtle}>It updates as your habits change. Rent, bills, health and education never count.</Text>
                  </Card>
                </View>
              ) : (
                <Card style={{ gap: 6 }}>
                  <Text v="h3">Your persona is on its way</Text>
                  <Text color={colors.textMuted}>It appears after {persona?.status === 'not-enough' ? persona.needed : 'a few more weeks of logging'}.</Text>
                </Card>
              )
            ) : null}

            {tab === 'roast' ? (
              <View style={{ gap: space.md }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>{TONES.map((t) => <Chip key={t.key} label={t.label} selected={tone === t.key} onPress={() => pickTone(t.key)} />)}</ScrollView>
                {line ? (
                  <View style={{ alignItems: 'center', gap: space.md }}>
                    <ViewShot ref={roastShot} options={{ format: 'png', quality: 1 }}>
                      <Poster palette={tone === 'toast' ? 'sunshine' : tone === 'savage' ? 'midnight' : tone === 'gentle' ? 'mint' : 'bubblegum'} label={tone === 'toast' ? 'A toast' : `Roast · ${tone}`} width={pw} height={Math.round(pw * 1.05)}>
                        <Big color={tone === 'toast' ? PALETTES.sunshine.ink : '#FFFFFF'} size={30}>“{line}”</Big>
                      </Poster>
                    </ViewShot>
                    <Row style={{ gap: space.sm, alignSelf: 'stretch' }}>
                      <Button title="Another one" kind="secondary" onPress={() => setVariant(variant + 1)} style={{ flex: 1 }} />
                      <Button title="Share" kind="accent" icon="share" onPress={() => share(roastShot)} style={{ flex: 1 }} />
                    </Row>
                    <Text v="small" color={colors.textMuted} style={{ textAlign: 'center' }}>About a habit, never about you. Health, education and income are never mentioned.</Text>
                  </View>
                ) : <Card><Text color={colors.textMuted}>Log a few more spends this month and your Roast or toast appears here.</Text></Card>}
              </View>
            ) : null}

            {tab === 'badges' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {[...badges].sort((a, b) => b.tier - a.tier || b.progress - a.progress).map((b) => (
                  <Card key={b.key} style={{ width: '48.5%', alignItems: 'center', gap: 6 }}>
                    <Medal tier={b.tier} icon={b.icon} size={56} />
                    <Text v="title" numberOfLines={1}>{b.title}</Text>
                    <Text v="small" color={colors.textMuted} numberOfLines={1}>{b.tier ? TIER_NAME[b.tier] : 'Locked'}</Text>
                    <View style={{ alignSelf: 'stretch', height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden', marginTop: 4 }}>
                      <View style={{ width: `${b.progress * 100}%`, height: 6, backgroundColor: colors.ink }} />
                    </View>
                    <Text v="small" color={colors.textSubtle} numberOfLines={2} style={{ textAlign: 'center' }}>{b.caption}</Text>
                  </Card>
                ))}
              </View>
            ) : null}

            {tab === 'records' ? (
              <>
                <Card style={{ paddingVertical: space.xs }}>
                  <Rec label="Current streak" value={`${streak} days`} />
                  <Divider />
                  <Rec label="Longest streak" value={`${best} days`} />
                  <Divider />
                  <Rec label="Days logged this year" value={String(days.size)} />
                  <Divider />
                  <Rec label="Entries this year" value={String(data.txs.length)} />
                  <Divider />
                  <Rec label="No-spend days this month" value={String(noSpend)} />
                  <Divider />
                  <Rec label="Bruh score" value={mine?.badge ? `${BADGE_LABEL[mine.badge]} · ${mine.medianDays}d` : 'After 2 paybacks'} />
                  {since ? <><Divider /><Rec label="Logging since" value={new Date(since).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} /></> : null}
                </Card>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <View style={{ flex: 1 }}>
                    <Text v="title">Show my persona</Text>
                    <Text v="small" color={colors.textMuted}>Turning it off also forgets the last persona on this phone.</Text>
                  </View>
                  <Switch value={s.personaOn} onValueChange={async (v) => { await s.set(db, 'personaOn', v); if (!v) await s.set(db, 'personaPrev', ''); }} accessibilityLabel="Show my persona" />
                </Card>
              </>
            ) : null}
          </View>
        )}
      </ProGate>

      {editing ? (
        <Sheet onClose={() => setEditing(false)}>
          <View style={{ gap: space.lg }}>
            <Text v="h3">Edit profile</Text>
            <Field label="Name" value={nameText} onChangeText={setNameText} placeholder="Your name" maxLength={24} />
            <View style={{ gap: space.sm }}>
              <Text v="small" color={colors.textMuted}>Avatar colour</Text>
              <Row style={{ flexWrap: 'wrap', gap: 8 }}>
                {AVATAR_COLORS.map((c) => {
                  const on = (s.profileColor || AVATAR_COLORS[0].bg) === c.bg;
                  return (
                    <Press key={c.bg} onPress={() => s.set(db, 'profileColor', c.bg)} accessibilityLabel="Avatar colour" accessibilityState={{ selected: on }}
                      style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg, borderWidth: 3, borderColor: on ? colors.primary : 'transparent' }}>
                      <Text style={{ fontFamily: fonts.brandBlack, fontSize: 18, color: c.ink }}>{(nameText.trim()[0] ?? 'A').toUpperCase()}</Text>
                    </Press>
                  );
                })}
              </Row>
            </View>
            {pro ? (
              <View style={{ gap: space.sm }}>
                <Text v="small" color={colors.textMuted}>Poster colour</Text>
                <Row style={{ flexWrap: 'wrap' }}>
                  <Chip label="Auto" selected={!s.posterPalette} onPress={() => s.set(db, 'posterPalette', '')} />
                  {(Object.keys(PALETTES) as PaletteKey[]).map((k) => <Swatch key={k} color={PALETTES[k].to} selected={s.posterPalette === k} onPress={() => s.set(db, 'posterPalette', k)} />)}
                </Row>
              </View>
            ) : null}
            <Button title="Save" kind="accent" onPress={async () => { await s.set(db, 'profileName', nameText.trim()); setEditing(false); }} />
          </View>
        </Sheet>
      ) : null}
      <ToastHost />
    </SubScreen>
  );
}
