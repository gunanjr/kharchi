import React, { useRef } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Screen, Text, Row, Button, RoundButton } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { SkeletonList } from '@/components/Feedback';
import { ToastHost, toast } from '@/components/Toast';
import { BrandMark } from '@/components/Wordmark';
import { Poster, Big, PALETTES, type PaletteKey } from '@/components/story/Poster';
import { useQuery } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { auraDays, auraScore, eraFor, promptsFor, RANKS } from '@/features/mce/aura';
import { AuraOrb, auraColors } from '@/features/mce/AuraOrb';
import { useIsPro } from '@/features/pro/store';
import { formatMoney } from '@/domain/money';
import { fonts, layout, space } from '@/theme/tokens';

const DAY = 86_400_000;
const ERA_PALETTE: Record<string, PaletteKey> = { saving: 'mint', travel: 'ocean', cafe: 'tangerine', treat: 'bubblegum', glow: 'grape', weekend: 'sunshine', soft: 'lime' };
const INK = '#FFFFFF', SOFT = 'rgba(255,255,255,0.66)', CARD = 'rgba(255,255,255,0.07)', LINE = 'rgba(255,255,255,0.12)';

/** Locks a Pro section for free users: the real content blurred behind a calm prompt, so they can feel what they are missing. */
function Locked({ pro, children, title, onUnlock }: { pro: boolean; children: React.ReactNode; title: string; onUnlock: () => void }) {
  if (pro) return <>{children}</>;
  return (
    <View style={{ borderRadius: 28, overflow: 'hidden' }}>
      <View pointerEvents="none">{children}</View>
      <BlurView intensity={40} tint="dark" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(14,17,23,0.55)' }}>
        <Icon name="lock" size={22} color="#FFE14D" />
        <Text style={{ fontFamily: fonts.brandBlack, fontSize: 20, color: INK, textAlign: 'center', marginTop: 6 }}>{title}</Text>
        <Button title="Unlock with Pro" kind="accent" size="sm" onPress={onUnlock} style={{ marginTop: 12 }} />
      </BlurView>
    </View>
  );
}

/**
 * Main Character Energy: your money habits as an aura. Free users see their aura, rank and today's points; the era
 * poster, the aura card, scenes and history are Pro. Dark, glowing, made to screenshot.
 */
export default function MainCharacterEnergy() {
  const router = useRouter();
  const pro = useIsPro();
  const { width } = useWindowDimensions();
  const eraShot = useRef<React.ElementRef<typeof ViewShot>>(null);
  const cardShot = useRef<React.ElementRef<typeof ViewShot>>(null);
  const now = Date.now();
  const q = useQuery(async (d) => ({
    txs: await listTransactions(d, { from: now - 120 * DAY, to: now + 1 }),
    sets: (await d.all<{ occurred_at: number }>('SELECT occurred_at FROM settlements WHERE deleted_at IS NULL')).map((x) => x.occurred_at),
  }), []);
  const days = q.data ? auraDays(q.data.txs, q.data.sets, now) : [];
  const a = auraScore(days);
  const [c1, c2, light] = auraColors(a.rank.key);
  const dt = new Date(now);
  const era = q.data ? eraFor(q.data.txs, dt.getFullYear(), dt.getMonth()) ?? eraFor(q.data.txs, dt.getFullYear(), dt.getMonth() - 1) : null;
  const prompts = q.data ? promptsFor(q.data.txs, q.data.sets, now, (n) => formatMoney(n, 'INR', { compact: true })) : [];
  const maxDay = Math.max(1, ...days.map((d) => d.points));
  const pw = Math.min(360, width - 40);
  const goPro = () => router.push('/pro');

  async function share(ref: React.RefObject<React.ElementRef<typeof ViewShot> | null>) {
    if (!pro) return goPro();
    try {
      const uri = await ref.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch { toast('Couldn’t create the image'); }
  }

  return (
    <Screen style={{ backgroundColor: '#0B0D12' }}>
      <Svg width="100%" height={420} style={{ position: 'absolute', top: 0 }}>
        <Defs><LinearGradient id="mce-bg" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={c2} stopOpacity="0.45" /><Stop offset="1" stopColor="#0B0D12" stopOpacity="0" /></LinearGradient></Defs>
        <Rect x={0} y={0} width="100%" height={420} fill="url(#mce-bg)" />
      </Svg>
      <Row style={{ paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: space.md }}>
        <RoundButton icon="back" label="Back" onPress={() => router.back()} />
        <Text style={{ flex: 1, fontFamily: fonts.brandBlack, fontSize: 20, color: INK }}>Main Character Energy</Text>
      </Row>
      {!q.data ? <SkeletonList n={3} /> : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 80, gap: space.xl }}>
          {/* the aura (free) */}
          <View style={{ alignItems: 'center', gap: space.sm, paddingTop: space.md }}>
            <AuraOrb rank={a.rank.key} score={a.score} emoji={a.rank.emoji} size={Math.min(250, width * 0.62)} />
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 34, color: INK, letterSpacing: -1 }}>{a.rank.title}</Text>
            <Row style={{ gap: 8 }}>
              <View style={{ backgroundColor: light, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}><Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#14181F' }}>+{a.today?.points ?? 0} aura today</Text></View>
              {a.toNext !== null ? <View style={{ backgroundColor: CARD, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: SOFT }}>{a.toNext} to {RANKS[RANKS.findIndex((r) => r.key === a.rank.key) + 1]?.title}</Text></View> : null}
            </Row>
            <View style={{ alignSelf: 'stretch', height: 8, borderRadius: 4, backgroundColor: LINE, overflow: 'hidden', marginTop: 6 }}>
              <View style={{ width: `${a.score}%`, height: 8, borderRadius: 4, backgroundColor: c1 }} />
            </View>
            <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: SOFT, textAlign: 'center' }}>Earn aura by logging, no-spend days, staying under your usual and settling up. Spending never takes it away.</Text>
          </View>

          {/* today's scenes */}
          <Locked pro={pro} title="See today’s scenes" onUnlock={goPro}>
            <View style={{ backgroundColor: CARD, borderRadius: 28, padding: space.lg, gap: space.md }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4, color: light }}>TODAY’S SCENES</Text>
              {(a.today?.reasons.length ? a.today.reasons : ['Log something today to start your scene']).map((r) => (
                <Row key={r} style={{ justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: INK }}>{r}</Text>
                  <Text style={{ fontFamily: fonts.brandBlack, fontSize: 16, color: light }}>{r.startsWith('Log something') ? '' : '+'}{r === 'Logged your day' ? 10 : r === 'No-spend day' ? 15 : r === 'Under your usual' ? 10 : r === 'Settled up' ? 20 : r.endsWith('streak') ? 5 : ''}</Text>
                </Row>
              ))}
            </View>
          </Locked>

          {/* era poster */}
          {era ? (
            <Locked pro={pro} title="Your era is ready" onUnlock={goPro}>
              <View style={{ alignItems: 'center', gap: space.md }}>
                <ViewShot ref={eraShot} options={{ format: 'png', quality: 1 }}>
                  <Poster palette={ERA_PALETTE[era.key] ?? 'grape'} label={`My era · ${dt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`} width={pw} height={Math.round(pw * 1.3)}>
                    <Big color={PALETTES[ERA_PALETTE[era.key] ?? 'grape'].ink} size={46}>{era.title}</Big>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 18, marginTop: 10, color: PALETTES[ERA_PALETTE[era.key] ?? 'grape'].ink }}>{era.line}</Text>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 14, marginTop: 14, color: PALETTES[ERA_PALETTE[era.key] ?? 'grape'].soft }}>{a.rank.emoji} {a.rank.title} · {a.score} aura</Text>
                  </Poster>
                </ViewShot>
                <Button title="Share my era" kind="accent" icon="share" onPress={() => share(eraShot)} style={{ alignSelf: 'stretch' }} />
              </View>
            </Locked>
          ) : null}

          {/* the aura card: a dating-app style profile made from your money habits */}
          <Locked pro={pro} title="Your aura card" onUnlock={goPro}>
            <View style={{ alignItems: 'center', gap: space.md }}>
              <ViewShot ref={cardShot} options={{ format: 'png', quality: 1 }}>
                <View style={{ width: pw, borderRadius: 32, overflow: 'hidden', backgroundColor: '#14181F' }}>
                  <Svg width={pw} height={220} style={{ position: 'absolute' }}>
                    <Defs><LinearGradient id="card-top" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={c1} /><Stop offset="1" stopColor={c2} /></LinearGradient></Defs>
                    <Rect x={0} y={0} width={pw} height={220} fill="url(#card-top)" />
                  </Svg>
                  <View style={{ padding: 22, gap: 14 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Row style={{ gap: 6 }}><BrandMark size={24} /><Text style={{ fontFamily: fonts.brandBlack, fontSize: 16, color: INK }}>BruhMe</Text></Row>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4, color: INK }}>AURA CARD</Text>
                    </Row>
                    <Row style={{ gap: 14, alignItems: 'center' }}>
                      <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: '#14181F', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: light }}>
                        <Text style={{ fontSize: 34, lineHeight: 42 }}>{a.rank.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: fonts.brandBlack, fontSize: 26, lineHeight: 30, color: INK }}>{a.rank.title}</Text>
                        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: INK }}>{a.score} aura{era ? ` · ${era.title}` : ''}</Text>
                      </View>
                    </Row>
                    <View style={{ gap: 10, marginTop: 8 }}>
                      {(prompts.length ? prompts : [{ q: 'Green flag', a: 'Logs every spend.' }]).map((p) => (
                        <View key={p.q} style={{ backgroundColor: '#1F2531', borderRadius: 18, padding: 14 }}>
                          <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: SOFT }}>{p.q}</Text>
                          <Text style={{ fontFamily: fonts.brandBlack, fontSize: 19, lineHeight: 24, color: INK, marginTop: 2 }}>{p.a}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </ViewShot>
              <Button title="Share my aura card" kind="accent" icon="share" onPress={() => share(cardShot)} style={{ alignSelf: 'stretch' }} />
            </View>
          </Locked>

          {/* 30-day aura history */}
          <Locked pro={pro} title="Your 30-day aura" onUnlock={goPro}>
            <View style={{ backgroundColor: CARD, borderRadius: 28, padding: space.lg, gap: space.md }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.4, color: light }}>LAST 30 DAYS · {a.total} AURA</Text>
              <Row style={{ alignItems: 'flex-end', height: 90, gap: 3 }}>
                {days.map((d) => <View key={d.day} style={{ flex: 1, height: Math.max(3, (d.points / maxDay) * 90), borderRadius: 3, backgroundColor: d.points ? c1 : LINE }} />)}
              </Row>
              <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: SOFT }}>Ranks: {RANKS.map((r) => `${r.emoji} ${r.title}`).join(' → ')}</Text>
            </View>
          </Locked>
        </ScrollView>
      )}
      <ToastHost />
    </Screen>
  );
}
