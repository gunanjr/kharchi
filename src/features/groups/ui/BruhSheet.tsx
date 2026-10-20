import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, Share, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Sheet } from '@/components/Sheet';
import { BrandMark } from '@/components/Wordmark';
import { QrCode } from '@/components/QrCode';
import { Icon } from '@/components/Icon';
import { toast } from '@/components/Toast';
import { Button, Card, Chip, Field, Press, Row, Text } from '@/components/ui';
import { useDb } from '@/db/provider';
import { formatMoney } from '@/domain/money';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { fillLine, FREE_TONES, isUpiId, linesIn, nudgeMessage, suggestTone, TONES, upiLink, type NudgeInput, type Tone } from '../nudge';
import { useRouter } from 'expo-router';
import { isProNow, useIsPro } from '@/features/pro/store';
import { showPro } from '@/features/pro/flags';
import { OG_STICKERS } from '@/features/referral/referral';

function Ring({ delay }: { delay: number }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => { p.value = reduce ? 0.5 : withRepeat(withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) }), -1, false); }, [p, reduce]);
  const st = useAnimatedStyle(() => {
    const t = (p.value + delay) % 1;
    return { opacity: 0.6 * (1 - t), transform: [{ scale: 0.6 + t * 1.7 }] };
  });
  return <Animated.View style={[{ position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#FF8106' }, st]} />;
}

const HEADLINE: Record<Tone, string> = {
  polite: 'A gentle nudge 🙂', playful: 'Bruh me 👀', desi: 'Bhai, hisaab? 🙏', minimal: 'Settle up.',
  dramatic: 'The wait is unreal 🥲', firm: 'Time to settle.', formal: 'Payment request', savage: 'The math isn’t mathing 💀',
};

/**
 * The pay card a friend sees on your screen or receives in a chat. Built to be screenshot-worthy: a tone headline, the
 * amount large, what it was for as chips, and a UPI QR (with the BruhMe mark in the middle) that any UPI app can scan.
 */
export const CARD_THEMES = {
  midnight: { from: '#2A3342', to: '#14181F', base: '#14181F', accent: '#FF8106', label: 'Midnight' },
  sunset: { from: '#FF9A2E', to: '#C2410C', base: '#C2410C', accent: '#FFFFFF', label: 'Sunset' },
  mint: { from: '#0E7C70', to: '#064E46', base: '#064E46', accent: '#FFD166', label: 'Mint' },
  mono: { from: '#3A3A3A', to: '#0A0A0A', base: '#0A0A0A', accent: '#FFFFFF', label: 'Mono' },
} as const;
export type CardTheme = keyof typeof CARD_THEMES;
export const STICKERS = ['😎', '🍕', '🎉', '💸', '🙏', '🔥', '🫠', '✈️'];

function BumpCard({ input, upiId, tone, theme = 'midnight', sticker = '' }: { input: NudgeInput; upiId: string | null; tone: Tone | 'mine'; theme?: CardTheme; sticker?: string }) {
  const th = CARD_THEMES[theme];
  const first = input.name?.trim().split(/\s+/)[0];
  const items = (input.items ?? []).filter(Boolean).slice(0, 2);
  const link = upiLink({ upiId, payeeName: null, amount: input.amount, note: items.length ? items.join(' + ') : input.reason });
  const chips = [...items, ...(input.reason && !items.includes(input.reason) ? [input.reason] : []), ...(input.daysOwed && input.daysOwed >= 2 ? [`${input.daysOwed} days`] : [])].slice(0, 4);
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return (
    <View style={{ borderRadius: 32, overflow: 'hidden', backgroundColor: th.to }}>
      <View style={{ padding: 22, gap: 18 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row style={{ gap: 8 }}>
            <BrandMark size={30} />
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 19, color: '#FFFFFF', letterSpacing: -0.3 }}>Bruh<Text style={{ fontFamily: fonts.brandBlack, fontSize: 19, color: theme === 'midnight' ? '#FF8106' : '#FFFFFF' }}>Me</Text></Text>
          </Row>
          <View style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontFamily: 'Geist_600SemiBold', fontSize: 11, color: 'rgba(255,255,255,0.75)', letterSpacing: 1 }}>PAY REQUEST · {date.toUpperCase()}</Text>
          </View>
        </Row>
        <View style={{ gap: 4 }}>
          {sticker ? <Text style={{ position: 'absolute', right: 0, top: -6, fontSize: 44 }}>{sticker}</Text> : null}
          <Text style={{ fontFamily: fonts.brandBlack, fontSize: 30, lineHeight: 34, color: '#FFFFFF', letterSpacing: -0.8, paddingRight: sticker ? 56 : 0 }}>{tone === 'mine' ? 'Bruh me 👀' : HEADLINE[tone]}</Text>
          <Text style={{ fontFamily: 'Geist_500Medium', fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>{first ? `${first}, you owe me` : 'You owe me'}</Text>
          <Text style={{ fontFamily: 'Geist_700Bold', fontSize: 52, lineHeight: 58, color: th.accent, letterSpacing: -1.5, fontVariant: ['tabular-nums'] }}>{formatMoney(Math.abs(input.amount), input.currency ?? 'INR', { trimZeros: true })}</Text>
        </View>
        {chips.length ? (
          <Row style={{ gap: 6, flexWrap: 'wrap' }}>
            {chips.map((c) => (
              <View key={c} style={{ backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 }}>
                <Text style={{ fontFamily: 'Geist_500Medium', fontSize: 13, color: '#FFFFFF' }} numberOfLines={1}>{c}</Text>
              </View>
            ))}
          </Row>
        ) : null}
        {link ? (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, alignItems: 'center', gap: 10 }}>
            <QrCode value={link} size={196} logo={<BrandMark size={30} />} />
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: 18, color: '#14181F' }}>Scan to pay · any UPI app</Text>
              <Text style={{ fontFamily: 'Geist_500Medium', fontSize: 12, color: '#5B6573' }}>Amount filled in · {upiId}</Text>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 14 }}>
            <Text style={{ fontFamily: 'Geist_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Pay me back on any UPI app</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Compose a settle-up request: pick a tone, flip through lines (left and right, so a good earlier one is never lost),
 * then Send it, or Bump: a card with a UPI QR the friend next to you scans with their own payments app, or shares on
 * by Nearby Share or AirDrop. BruhMe moves no money and sends nothing itself.
 */
export function BruhSheet({ input: given, onClose }: { input: NudgeInput | NudgeInput[] | null; onClose: () => void }) {
  const db = useDb();
  const { colors } = useTheme();
  const myUpi = useSettings((s) => s.myUpi);
  const setSetting = useSettings((s) => s.set);
  const [tone, setTone] = useState<Tone | 'mine'>('playful');
  const [draft, setDraft] = useState('');
  const pro = useIsPro();
  const router = useRouter();
  const savedLines = useSettings((s) => s.savedLines);
  const theme = useSettings((s) => s.bumpTheme);
  const sticker = useSettings((s) => s.bumpSticker);
  const sharedCode = useSettings((s) => s.sharedCode);
  const [variant, setVariant] = useState(0);
  const [upi, setUpi] = useState('');
  const [mode, setMode] = useState<'compose' | 'bumping' | 'card'>('compose');
  const shot = useRef<React.ElementRef<typeof ViewShot>>(null);
  // A group can have several people who owe you: pick who to bruh (or switch between them) without leaving the sheet.
  const people = useMemo(() => (given ? (Array.isArray(given) ? given : [given]) : []), [given]);
  const [who, setWho] = useState(0);
  const input: NudgeInput | null = people[Math.min(who, people.length - 1)] ?? null;
  useEffect(() => { setWho(0); }, [given]);

  useEffect(() => { if (input) { const t = suggestTone(input.daysOwed); setTone(showPro() && !isProNow() && !FREE_TONES.includes(t) ? 'firm' : t); setVariant(0); setMode('compose'); } }, [input]);
  useEffect(() => { if (!given) setMode('compose'); }, [given]);

  const upiOk = isUpiId(myUpi) ? myUpi : null;
  const mineCount = savedLines.length;
  const text = useMemo(() => {
    if (!input) return '';
    const full = { ...input, upiId: upiOk };
    if (tone === 'mine') {
      if (draft.trim()) return fillLine(draft, full);
      if (!mineCount) return fillLine('{name}, {amount} for {for}. Bruh me 🙏', full);
      return fillLine(savedLines[((variant % mineCount) + mineCount) % mineCount], full);
    }
    return nudgeMessage(full, tone, variant);
  }, [input, tone, variant, upiOk, draft, savedLines, mineCount]);
  const locked = (t: Tone) => showPro() && !pro && !FREE_TONES.includes(t);
  const goPro = () => { onClose(); setTimeout(() => router.push('/pro'), 250); };
  if (!input) return null;
  const count = tone === 'mine' ? Math.max(1, mineCount) : linesIn(tone);
  const pos = ((variant % count) + count) % count;

  /** A typed but unsaved UPI ID is saved automatically, so nobody has to find the Save button. False if it is invalid. */
  async function commitUpi(): Promise<string | null | false> {
    const v = upi.trim();
    if (!v) return upiOk;
    if (!isUpiId(v)) { toast('That doesn’t look like a UPI ID. It looks like yourname@okaxis.'); return false; }
    await setSetting(db, 'myUpi', v);
    setUpi('');
    return v;
  }
  async function send() {
    const id = await commitUpi();
    if (id === false) return;
    // A UPI ID typed just now is saved first; rebuild the message so it carries the new pay link.
    const message = id && id !== upiOk ? (tone === 'mine' ? fillLine(draft.trim() || (mineCount ? savedLines[((variant % mineCount) + mineCount) % mineCount] : '{name}, {amount} for {for}. Bruh me 🙏'), { ...input!, upiId: id }) : nudgeMessage({ ...input!, upiId: id }, tone, variant)) : text;
    try { await Share.share({ message }); } catch { toast('Could not open sharing'); }
  }
  async function bump() {
    if ((await commitUpi()) === false) return;
    setMode('bumping');
    haptic.success();
    setTimeout(() => { haptic.success(); setMode('card'); }, 1600);
  }
  async function shareCard() {
    try {
      const uri = await shot.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Bump it to a phone nearby' });
      else await send();
    } catch {
      toast('Couldn’t create the card');
    }
  }
  async function saveUpi() {
    const v = upi.trim();
    if (!isUpiId(v)) return toast('That doesn’t look like a UPI ID. It looks like name@bank.');
    await setSetting(db, 'myUpi', v);
    setUpi('');
    toast('Saved on this phone');
  }
  const step = (d: number) => { setVariant(pos + d); haptic.tap(); };

  const upiField = upiOk ? null : (
    <View style={{ gap: space.sm }}>
      <Field label="Your UPI ID, to get paid faster (optional)" value={upi} onChangeText={setUpi} autoCapitalize="none" autoCorrect={false} placeholder="yourname@okaxis" />
      <Text v="small" color={colors.textMuted}>It is the address people pay you on, like yourname@okaxis. You can find it in the profile of whichever UPI app you use. With it, your message gets a tap-to-pay link and Bump shows a QR their UPI app scans with the amount filled in. You still receive the money in your own UPI app; BruhMe never touches it. Saved only on this phone.</Text>
      {upi.trim() ? <Button title="Save UPI ID" kind="secondary" size="sm" onPress={saveUpi} style={{ alignSelf: 'flex-start' }} /> : null}
    </View>
  );

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Sheet onClose={onClose}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.lg, padding: space.lg }} style={{ maxHeight: 720 }}>
          {mode === 'bumping' ? (
            <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.lg }}>
              <View style={{ height: 170, alignItems: 'center', justifyContent: 'center' }}>
                <Ring delay={0} /><Ring delay={0.5} />
                <BrandMark size={72} />
              </View>
              <Text v="h2">Making {input.name ? `${input.name.trim().split(/\s+/)[0]}’s` : 'the'} pay card…</Text>
            </View>
          ) : mode === 'card' ? (
            <>
              <ViewShot ref={shot} options={{ format: 'png', quality: 1 }}>
                <BumpCard input={input} upiId={upiOk} tone={tone} theme={pro ? theme : 'midnight'} sticker={pro || (sharedCode && OG_STICKERS.includes(sticker)) ? sticker : ''} />
              </ViewShot>
              {upiOk ? (
                <Card tone="inset" style={{ gap: 6 }}>
                  <Text v="caps" color={colors.textMuted}>HOW TO USE IT</Text>
                  <Text v="small"><Text v="small" style={{ fontFamily: 'Geist_700Bold' }}>Friend next to you?</Text> Turn your phone to them. They open any UPI app, tap Scan and point it here. The amount is already filled in; the money lands in your UPI app.</Text>
                  <Text v="small"><Text v="small" style={{ fontFamily: 'Geist_700Bold' }}>Not nearby?</Text> Send card shares this picture on WhatsApp or to a phone nearby (Nearby Share, AirDrop). They scan it from the picture.</Text>
                </Card>
              ) : (
                <Card tone="inset" style={{ gap: space.sm }}>
                  <Text v="title">Add your UPI ID to get a scan-to-pay QR</Text>
                  {upiField}
                  {upi.trim() ? null : <Text v="small" color={colors.textMuted}>Without it, you can still send the card or the message; they pay you the usual way.</Text>}
                </Card>
              )}
              {showPro() ? (
                <View style={{ gap: space.sm }}>
                  <Row style={{ gap: space.sm }}>
                    {(Object.keys(CARD_THEMES) as CardTheme[]).map((k) => (
                      <Press key={k} onPress={() => (pro ? setSetting(db, 'bumpTheme', k) : goPro())} accessibilityLabel={`${CARD_THEMES[k].label} card${pro ? '' : ', Pro'}`} style={{ flex: 1, height: 40, borderRadius: 14, backgroundColor: CARD_THEMES[k].from, borderWidth: 2, borderColor: (pro ? theme : 'midnight') === k ? colors.text : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        {!pro && k !== 'midnight' ? <Icon name="lock" size={14} color="#FFFFFF" /> : null}
                      </Press>
                    ))}
                  </Row>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                    <Chip label="No sticker" selected={!sticker || (!pro && !OG_STICKERS.includes(sticker))} onPress={() => setSetting(db, 'bumpSticker', '')} />
                    {sharedCode ? OG_STICKERS.map((e) => <Chip key={e} label={e} selected={sticker === e} onPress={() => setSetting(db, 'bumpSticker', e)} />) : null}
                    {STICKERS.map((e) => <Chip key={e} label={pro ? e : `${e} 🔒`} selected={pro && sticker === e} onPress={() => (pro ? setSetting(db, 'bumpSticker', e) : goPro())} />)}
                  </ScrollView>
                </View>
              ) : null}
              <Row style={{ gap: space.sm }}>
                <Button title="Send card" icon="send" onPress={shareCard} style={{ flex: 1 }} />
                <Button title="Message" kind="secondary" icon="chat" onPress={send} style={{ flex: 1 }} />
              </Row>
              <Button title="Change the message" kind="ghost" onPress={() => setMode('compose')} />
            </>
          ) : (
            <>
              <View style={{ gap: 2 }}>
                <Text v="h2">Bruh {input.name ? input.name.trim().split(/\s+/)[0] : 'them'}</Text>
                <Text v="small" color={colors.textMuted}>{TONES.find((t) => t.key === tone)?.hint}. Nothing is sent until you choose where.</Text>
              </View>
              {people.length > 1 ? (
                <View style={{ gap: space.xs }}>
                  <Text v="caps" color={colors.textMuted}>{people.length} PEOPLE OWE YOU · PICK ONE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.sm }}>
                    {people.map((p, i) => (
                      <Chip key={`${p.name}-${i}`} label={`${(p.name ?? 'Friend').trim().split(/\s+/)[0]} · ${formatMoney(Math.abs(p.amount), p.currency ?? 'INR', { compact: true })}`} selected={i === who} onPress={() => { setWho(i); haptic.tap(); }} />
                    ))}
                  </ScrollView>
                </View>
              ) : null}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.sm }}>
                {TONES.map((t) => <Chip key={t.key} label={locked(t.key) ? `${t.label} · Pro` : t.label} selected={tone === t.key} onPress={() => { if (locked(t.key)) return goPro(); setTone(t.key); setVariant(0); haptic.tap(); }} />)}
                {showPro() ? <Chip label={pro ? 'My lines' : 'My lines · Pro'} selected={tone === 'mine'} onPress={() => { if (!pro) return goPro(); setTone('mine'); setVariant(0); haptic.tap(); }} /> : null}
              </ScrollView>
              <Card tone="inset" style={{ gap: space.md }}>
                <Text accessibilityLabel={`Message preview: ${text}`}>{text}</Text>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Press onPress={() => step(-1)} accessibilityLabel="Previous line" hitSlop={10} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
                    <Icon name="back" size={18} color={colors.text} />
                  </Press>
                  <Text v="small" color={colors.textMuted} style={{ fontVariant: ['tabular-nums'] }}>Line {pos + 1} of {count}</Text>
                  <Press onPress={() => step(1)} accessibilityLabel="Next line" hitSlop={10} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
                    <Icon name="chevron" size={18} color={colors.text} />
                  </Press>
                </Row>
              </Card>
              {tone === 'mine' ? (
                <View style={{ gap: space.sm }}>
                  <Field label="Write your own line" value={draft} onChangeText={setDraft} placeholder="{name}, {amount} for {for}. Bruh me 🙏" maxLength={300} multiline />
                  <Text v="small" color={colors.textMuted}>Use {'{name}'}, {'{amount}'}, {'{for}'} and {'{days}'}; BruhMe fills them in for each person.</Text>
                  <Row style={{ gap: space.sm }}>
                    <Button title="Save line" kind="secondary" size="sm" disabled={!draft.trim() || savedLines.includes(draft.trim())} onPress={async () => { await setSetting(db, 'savedLines', [...savedLines, draft.trim()].slice(-20)); setDraft(''); setVariant(savedLines.length); toast('Line saved'); }} />
                    {mineCount && !draft ? <Button title="Delete this line" kind="ghost" size="sm" onPress={async () => { const k = ((variant % mineCount) + mineCount) % mineCount; await setSetting(db, 'savedLines', savedLines.filter((_, x) => x !== k)); setVariant(0); }} /> : null}
                  </Row>
                </View>
              ) : null}
              {upiOk ? (
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text v="small" color={colors.textMuted}>Tap-to-pay link on · {upiOk}</Text>
                  <Button title="Change" kind="ghost" size="sm" onPress={() => setSetting(db, 'myUpi', '')} />
                </Row>
              ) : upiField}
              <Button title="Bump: make the pay card" kind="accent" onPress={bump} />
              <Press onPress={send} accessibilityLabel="Send as text only" style={{ alignItems: 'center', paddingVertical: 6 }}>
                <Text v="small" color={colors.link} style={{ fontFamily: 'Geist_600SemiBold' }}>Just send the text instead</Text>
              </Press>
              
            </>
          )}
        </ScrollView>
      </Sheet>
    </Modal>
  );
}
