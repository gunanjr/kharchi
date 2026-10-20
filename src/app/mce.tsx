import React, { useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Screen, Text, Row, Button, RoundButton, Press } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { SkeletonList } from '@/components/Feedback';
import { ToastHost, toast } from '@/components/Toast';
import { BrandMark } from '@/components/Wordmark';
import { Poster, Big, PALETTES, type PaletteKey } from '@/components/story/Poster';
import { useQuery } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { auraDays, auraScore, eraFor, movesFor, promptsFor, weekCompare, RANKS } from '@/features/mce/aura';
import { AuraOrb, RankMark, auraColors } from '@/features/mce/AuraOrb';
import { useIsPro } from '@/features/pro/store';
import { useSettings } from '@/store/settings';
import { formatMoney } from '@/domain/money';
import { fonts, layout, space } from '@/theme/tokens';

const DAY = 86_400_000;
const ERA_PALETTE: Record<string, PaletteKey> = { saving: 'mint', travel: 'ocean', cafe: 'tangerine', treat: 'bubblegum', glow: 'grape', weekend: 'sunshine', soft: 'lime' };
const BG = '#0B0D12', INK = '#FFFFFF', SOFT = 'rgba(255,255,255,0.62)', CARD = '#151A23', LINE = 'rgba(255,255,255,0.08)';
type Section = 'today' | 'era' | 'card' | 'history';
const SECTIONS: { key: Section; label: string }[] = [{ key: 'today', label: 'Today' }, { key: 'era', label: 'Era' }, { key: 'card', label: 'Aura card' }, { key: 'history', label: 'History' }];

/** Locks a Pro section for free users: the real content blurred behind a calm prompt, so they can feel what they are missing. */
function Locked({ pro, children, title, onUnlock }: { pro: boolean; children: React.ReactNode; title: string; onUnlock: () => void }) {
  if (pro) return <>{children}</>;
  return (
    <View style={{ borderRadius: 28, overflow: 'hidden' }}>
      <View pointerEvents="none">{children}</View>
      <BlurView intensity={40} tint="dark" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(11,13,18,0.55)' }}>
        <Icon name="lock" size={22} color={INK} />
        <Text style={{ fontFamily: fonts.brandBlack, fontSize: 20, color: INK, textAlign: 'center', marginTop: 6 }}>{title}</Text>
        <Button title="Unlock with Pro" kind="accent" size="sm" onPress={onUnlock} style={{ marginTop: 12 }} />
      </BlurView>
    </View>
  );
}

const Label = ({ children, color = SOFT }: { children: React.ReactNode; color?: string }) => <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.4, color }}>{children}</Text>;

/**
 * Main Character Energy: money habits as an aura. Four sections: Today (aura, moves, rank ladder, week), Era (a poster
 * of the month's story), Aura card (a profile made from your habits) and History. Free users get Today; the rest is Pro.
 */
export default function MainCharacterEnergy() {
  const router = useRouter();
  const pro = useIsPro();
  const { width } = useWindowDimensions();
  const name = useSettings((s) => s.profileName);
  const eraShot = useRef<React.ElementRef<typeof ViewShot>>(null);
  const cardShot = useRef<React.ElementRef<typeof ViewShot>>(null);
  const [section, setSection] = useState<Section>('today');
  const [hidden, setHidden] = useState<string[]>([]); // prompts the user took off their card
  const now = Date.now();
  const q = useQuery(async (d) => ({
    txs: await listTransactions(d, { from: now - 120 * DAY, to: now + 1 }),
    sets: (await d.all<{ occurred_at: number }>('SELECT occurred_at FROM settlements WHERE deleted_at IS NULL')).map((x) => x.occurred_at),
  }), []);
  const money = (n: number) => formatMoney(n, 'INR', { compact: true });
  const days = q.data ? auraDays(q.data.txs, q.data.sets, now) : [];
  const a = auraScore(days);
  const [c1, , light] = auraColors(a.rank.key);
  const dt = new Date(now);
  const era = q.data ? eraFor(q.data.txs, dt.getFullYear(), dt.getMonth()) ?? eraFor(q.data.txs, dt.getFullYear(), dt.getMonth() - 1) : null;
  const prompts = q.data ? promptsFor(q.data.txs, q.data.sets, now, money) : [];
  const shownPrompts = prompts.filter((p) => !hidden.includes(p.q));
  const moves = q.data ? movesFor(q.data.txs, q.data.sets, now, money) : [];
  const week = weekCompare(days);
  const rankIdx = RANKS.findIndex((r) => r.key === a.rank.key);
  const maxDay = Math.max(1, ...days.map((d) => d.points));
  const best = days.reduce<typeof days[number] | null>((b, d) => (!b || d.points > b.points ? d : b), null);
  const activeDays = days.filter((d) => d.points > 0).length;
  const pw = Math.min(360, width - layout.gutter * 2);
  const goPro = () => router.push('/pro');

  async function share(ref: React.RefObject<React.ElementRef<typeof ViewShot> | null>) {
    if (!pro) return goPro();
    try {
      const uri = await ref.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch { toast('Couldn’t create the image'); }
  }

  const today = (
    <>
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <AuraOrb rank={a.rank.key} score={a.score} size={Math.min(220, width * 0.56)} />
        <Text style={{ fontFamily: fonts.brandBlack, fontSize: 34, lineHeight: 42, color: INK, letterSpacing: -1 }} numberOfLines={1} adjustsFontSizeToFit>{a.rank.title}</Text>
        <Row style={{ gap: 8 }}>
          <View style={{ backgroundColor: light, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}><Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#14181F' }}>+{a.today?.points ?? 0} today</Text></View>
          {a.toNext !== null ? <View style={{ backgroundColor: CARD, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: SOFT }}>{a.toNext} to {RANKS[rankIdx + 1]?.title}</Text></View> : null}
        </Row>
      </View>

      {/* moves: the useful part, what earns aura today */}
      <View style={{ backgroundColor: CARD, borderRadius: 28, padding: space.lg, gap: space.md, borderWidth: 1, borderColor: LINE }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label color={light}>TODAY’S MOVES</Label>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: SOFT }}>{moves.filter((m) => m.done).length}/{moves.length} done</Text>
        </Row>
        {moves.map((m) => (
          <Row key={m.key} style={{ gap: space.md, alignItems: 'flex-start' }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, marginTop: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: m.done ? c1 : 'transparent', borderWidth: m.done ? 0 : 2, borderColor: LINE }}>
              {m.done ? <Icon name="check" size={15} color="#14181F" /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: m.done ? SOFT : INK, textDecorationLine: m.done ? 'line-through' : 'none' }}>{m.title}</Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: SOFT }}>{m.sub}</Text>
            </View>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 16, color: m.done ? SOFT : light }}>+{m.points}</Text>
          </Row>
        ))}
        <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: SOFT }}>Spending never takes aura away. A 3-day logging streak adds +5 a day.</Text>
      </View>

      {/* the ladder */}
      <View style={{ gap: space.sm }}>
        <Label>THE LADDER</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -layout.gutter }} contentContainerStyle={{ paddingHorizontal: layout.gutter, gap: space.sm }}>
          {RANKS.map((r, i) => {
            const here = i === rankIdx, passed = i < rankIdx;
            const [rc] = auraColors(r.key);
            return (
              <View key={r.key} style={{ width: 112, borderRadius: 20, padding: space.md, gap: 4, backgroundColor: here ? rc : CARD, borderWidth: 1, borderColor: here ? rc : LINE, opacity: passed || here ? 1 : 0.55 }}>
                <RankMark rank={r.key} size={24} color={here ? '#14181F' : rc} off={here ? 'rgba(20,24,31,0.2)' : LINE} />
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: here ? '#14181F' : INK }} numberOfLines={1}>{r.title}</Text>
                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: here ? 'rgba(20,24,31,0.7)' : SOFT }}>{here ? 'You are here' : passed ? 'Unlocked' : `${r.min}+ aura`}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* week vs week */}
      <Row style={{ gap: space.sm }}>
        <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 22, padding: space.lg, gap: 2, borderWidth: 1, borderColor: LINE }}>
          <Label>THIS WEEK</Label>
          <Text style={{ fontFamily: fonts.brandBlack, fontSize: 28, color: INK }}>{week.now}</Text>
          <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: week.now >= week.before ? light : SOFT }}>{week.before ? `${week.now >= week.before ? '↑' : '↓'} ${Math.abs(week.now - week.before)} vs last week` : 'aura earned'}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: CARD, borderRadius: 22, padding: space.lg, gap: 2, borderWidth: 1, borderColor: LINE }}>
          <Label>ACTIVE DAYS</Label>
          <Text style={{ fontFamily: fonts.brandBlack, fontSize: 28, color: INK }}>{activeDays}/30</Text>
          <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: SOFT }}>days with aura</Text>
        </View>
      </Row>
    </>
  );

  const eraView = era ? (
    <Locked pro={pro} title="Your era is ready" onUnlock={goPro}>
      <View style={{ alignItems: 'center', gap: space.md }}>
        <ViewShot ref={eraShot} options={{ format: 'png', quality: 1 }}>
          <Poster palette={ERA_PALETTE[era.key] ?? 'grape'} label={`${name ? `${name}’s era` : 'My era'} · ${dt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`} width={pw} height={Math.round(pw * 1.3)}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: PALETTES[ERA_PALETTE[era.key] ?? 'grape'].soft, marginBottom: 6 }}>Currently in my</Text>
            <Big color={PALETTES[ERA_PALETTE[era.key] ?? 'grape'].ink} size={50}>{era.title}</Big>
            <Text style={{ fontFamily: fonts.bold, fontSize: 18, marginTop: 12, color: PALETTES[ERA_PALETTE[era.key] ?? 'grape'].ink }}>{era.line}</Text>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, marginTop: 18, color: PALETTES[ERA_PALETTE[era.key] ?? 'grape'].soft }}>{a.rank.title} · {a.score} aura</Text>
          </Poster>
        </ViewShot>
        <Button title="Share my era" kind="accent" icon="share" onPress={() => share(eraShot)} style={{ alignSelf: 'stretch' }} />
        <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: SOFT, textAlign: 'center' }}>Your era is worked out from this month’s pattern. It can change as the month goes on.</Text>
      </View>
    </Locked>
  ) : (
    <View style={{ backgroundColor: CARD, borderRadius: 28, padding: space.xl, gap: 6 }}>
      <Text style={{ fontFamily: fonts.brandBlack, fontSize: 22, color: INK }}>Your era is loading</Text>
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: SOFT }}>It appears after 15 spends in a month. Keep logging.</Text>
    </View>
  );

  const cardView = (
    <Locked pro={pro} title="Your aura card" onUnlock={goPro}>
      <View style={{ alignItems: 'center', gap: space.md }}>
        <ViewShot ref={cardShot} options={{ format: 'png', quality: 1 }}>
          <View style={{ width: pw, borderRadius: 32, overflow: 'hidden', backgroundColor: '#14181F' }}>
            <View style={{ position: 'absolute', top: 0, left: 0, width: pw, height: 200, backgroundColor: c1 }} />
            <View style={{ padding: 22, gap: 14 }}>
              <Row style={{ gap: 6 }}><BrandMark size={24} /><Text style={{ fontFamily: fonts.brandBlack, fontSize: 16, color: '#14181F' }}>BruhMe</Text></Row>
              <Row style={{ gap: 14, alignItems: 'center', marginTop: 8 }}>
                <View style={{ width: 84, height: 84, borderRadius: 24, backgroundColor: '#14181F', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.brandBlack, fontSize: 34, color: c1 }}>{a.score}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  {name ? <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: '#14181F' }} numberOfLines={1}>{name}</Text> : null}
                  <Text style={{ fontFamily: fonts.brandBlack, fontSize: 26, lineHeight: 30, color: '#14181F' }} numberOfLines={2}>{a.rank.title}</Text>
                  <Row style={{ gap: 6, marginTop: 2 }}><RankMark rank={a.rank.key} size={16} color="#14181F" off="rgba(20,24,31,0.2)" /><Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#14181F' }} numberOfLines={1}>{era ? era.title : 'aura'}</Text></Row>
                </View>
              </Row>
              <View style={{ gap: 10, marginTop: 10 }}>
                {(shownPrompts.length ? shownPrompts : [{ q: 'Green flag', a: 'Logs every spend.' }]).map((p) => (
                  <View key={p.q} style={{ backgroundColor: '#1F2531', borderRadius: 18, padding: 14 }}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: SOFT }}>{p.q}</Text>
                    <Text style={{ fontFamily: fonts.brandBlack, fontSize: 19, lineHeight: 24, color: INK, marginTop: 2 }}>{p.a}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ViewShot>
        {prompts.length > 1 ? (
          <View style={{ alignSelf: 'stretch', gap: space.sm }}>
            <Label>ON YOUR CARD</Label>
            <Row style={{ gap: space.sm, flexWrap: 'wrap' }}>
              {prompts.map((p) => {
                const on = !hidden.includes(p.q);
                return (
                  <Press key={p.q} onPress={() => setHidden(on ? [...hidden, p.q] : hidden.filter((x) => x !== p.q))} accessibilityLabel={`${p.q}, ${on ? 'shown' : 'hidden'}`} accessibilityState={{ selected: on }}
                    style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: on ? INK : CARD, borderWidth: 1, borderColor: on ? INK : LINE }}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: on ? '#14181F' : SOFT }}>{p.q}</Text>
                  </Press>
                );
              })}
            </Row>
          </View>
        ) : null}
        <Button title="Share my aura card" kind="accent" icon="share" onPress={() => share(cardShot)} style={{ alignSelf: 'stretch' }} />
      </View>
    </Locked>
  );

  const historyView = (
    <Locked pro={pro} title="Your 30-day aura" onUnlock={goPro}>
      <View style={{ gap: space.md }}>
        <View style={{ backgroundColor: CARD, borderRadius: 28, padding: space.lg, gap: space.md, borderWidth: 1, borderColor: LINE }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Label color={light}>LAST 30 DAYS</Label>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 16, color: INK }}>{a.total} aura</Text>
          </Row>
          <Row style={{ alignItems: 'flex-end', height: 110, gap: 3 }}>
            {days.map((d) => <View key={d.day} style={{ flex: 1, height: Math.max(3, (d.points / maxDay) * 110), borderRadius: 3, backgroundColor: d === best ? light : d.points ? c1 : LINE }} />)}
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: SOFT }}>{days[0] ? new Date(days[0].day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: SOFT }}>Today</Text>
          </Row>
        </View>
        {best && best.points > 0 ? (
          <View style={{ backgroundColor: CARD, borderRadius: 22, padding: space.lg, gap: 4, borderWidth: 1, borderColor: LINE }}>
            <Label>BEST DAY</Label>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 22, color: INK }}>{new Date(best.day).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: SOFT }}>+{best.points} · {best.reasons.join(', ')}</Text>
          </View>
        ) : null}
      </View>
    </Locked>
  );

  return (
    <Screen style={{ backgroundColor: BG }}>
      <Row style={{ paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: space.md }}>
        <RoundButton icon="back" label="Back" onPress={() => router.back()} />
        <Text style={{ flex: 1, fontFamily: fonts.brandBlack, fontSize: 20, color: INK }} numberOfLines={1}>Main Character Energy</Text>
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: space.md }} contentContainerStyle={{ paddingHorizontal: layout.gutter, gap: space.sm }}>
        {SECTIONS.map((x) => {
          const on = x.key === section;
          return (
            <Press key={x.key} onPress={() => setSection(x.key)} accessibilityLabel={x.label} accessibilityState={{ selected: on }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: on ? INK : CARD }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: on ? '#14181F' : INK }}>{x.label}</Text>
              {!pro && x.key !== 'today' ? <Icon name="lock" size={12} color={on ? '#14181F' : SOFT} /> : null}
            </Press>
          );
        })}
      </ScrollView>
      {!q.data ? <SkeletonList n={3} /> : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: space.lg, paddingBottom: 80, gap: space.xl }}>
          {section === 'today' ? today : section === 'era' ? eraView : section === 'card' ? cardView : historyView}
        </ScrollView>
      )}
      <ToastHost />
    </Screen>
  );
}
