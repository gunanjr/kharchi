import React, { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, TextInput, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Screen, Text, Button, Row, Press } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { BrandMark, Wordmark } from '@/components/Wordmark';
import { toast } from '@/components/Toast';
import { QrCode } from '@/components/QrCode';
import Svg, { Circle as SvgCircle, Defs, LinearGradient as SvgGradient, Rect as SvgRect, Stop } from 'react-native-svg';
import { isUpiId } from '@/features/groups/nudge';
import { useDb, bumpData } from '@/db/provider';
import { useRestoreFlow } from '@/features/vault/ui/useRestoreFlow';
import { hasAnyData, loadCompleteDemo } from '@/features/dev/loadDemo';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { useT, type Key } from '@/i18n';
import { fonts, layout, space } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

const PAGES: { id: string; t: Key; b: Key }[] = [
  { id: 'intro', t: 'onb.0.title', b: 'onb.0.body' },
  { id: 'log', t: 'onb.1.title', b: 'onb.1.body' },
  { id: 'split', t: 'onb.2.title', b: 'onb.2.body' },
  { id: 'insights', t: 'onb.3.title', b: 'onb.3.body' },
  { id: 'privacy', t: 'onb.4.title', b: 'onb.4.body' },
  { id: 'upi', t: 'onb.5.title', b: 'onb.5.body' },
];

/* ---------- visuals: BruhMe's own world (no other companies' brands), one bold panel per page ---------- */

/** Static layout wrapper. Onboarding content appears without entrance animations (founder decision: calmer, more professional). */
function Float({ children, style }: { children: React.ReactNode; delay?: number; active?: boolean; style?: object }) {
  return <View style={style}>{children}</View>;
}

/** The coloured stage every page's visual sits on. */
function Panel({ from, to, children }: { from: string; to: string; children: React.ReactNode }) {
  const gid = `pg${from.slice(1)}${to.slice(1)}`; // unique per colour pair: shared ids clash when several pages render
  return (
    <View style={{ width: '100%', flex: 1, borderRadius: 36, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 20 }}>
      <Svg width="100%" height="100%" style={{ position: 'absolute' }} preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <SvgGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </SvgGradient>
        </Defs>
        <SvgRect x="0" y="0" width="100" height="100" fill={`url(#${gid})`} />
        <SvgCircle cx="88" cy="10" r="22" fill="#FFFFFF" opacity="0.07" />
        <SvgCircle cx="6" cy="94" r="18" fill="#FFFFFF" opacity="0.06" />
      </Svg>
      {children}
    </View>
  );
}

const Emoji = ({ e, bg, size = 44 }: { e: string; bg: string; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontSize: size * 0.5, lineHeight: size * 0.62 }}>{e}</Text>
  </View>
);

function EntryCard({ e, bg, title, sub, amt, tilt }: { e: string; bg: string; title: string; sub: string; amt: string; tilt: string }) {
  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, transform: [{ rotate: tilt }], shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 }}>
      <Emoji e={e} bg={bg} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Geist_600SemiBold', fontSize: 15, color: '#212934' }}>{title}</Text>
        <Text style={{ fontFamily: 'Geist_400Regular', fontSize: 12, color: '#5B6573' }}>{sub}</Text>
      </View>
      <Text style={{ fontFamily: 'Geist_700Bold', fontSize: 15, color: '#212934', fontVariant: ['tabular-nums'] }}>{amt}</Text>
    </View>
  );
}

function LogVisual({ active }: { active: boolean }) {
  return (
    <Panel from="#FF9A2E" to="#FE590C">
      <View style={{ width: '100%', gap: 10, paddingHorizontal: 4 }}>
        <Float active={active} delay={0} style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Row style={{ gap: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={24} color="#FE6A0A" />
            </View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 40, lineHeight: 46, color: '#FFFFFF', letterSpacing: -1.2 }}>₹180</Text>
          </Row>
          <Text style={{ fontFamily: 'Geist_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>Saved in 3 seconds</Text>
        </Float>
        <Float active={active} delay={120}><EntryCard e="☕" bg="#FFF1E3" title="Chai with Riya" sub="Food · just now" amt="−₹40" tilt="0deg" /></Float>
        <Float active={active} delay={200}><EntryCard e="🛺" bg="#E8F1FB" title="Auto to college" sub="Travel · 9:40 am" amt="−₹90" tilt="0deg" /></Float>
        <Float active={active} delay={280}><EntryCard e="🍕" bg="#FDEBEC" title="Friday pizza" sub="Food · yesterday" amt="−₹540" tilt="0deg" /></Float>
      </View>
    </Panel>
  );
}

function Bubble({ side, e, bg, text, dark }: { side: 'l' | 'r'; e?: string; bg: string; text: string; dark?: boolean }) {
  return (
    <View style={{ flexDirection: side === 'l' ? 'row' : 'row-reverse', alignItems: 'flex-end', gap: 8 }}>
      {e ? <Emoji e={e} bg={bg} size={30} /> : null}
      <View style={{ maxWidth: '78%', backgroundColor: dark ? '#212934' : '#FFFFFF', borderRadius: 18, borderBottomLeftRadius: side === 'l' ? 6 : 18, borderBottomRightRadius: side === 'r' ? 6 : 18, paddingHorizontal: 14, paddingVertical: 9 }}>
        <Text style={{ fontFamily: 'Geist_500Medium', fontSize: 14, lineHeight: 19, color: dark ? '#FFFFFF' : '#212934' }}>{text}</Text>
      </View>
    </View>
  );
}

/** The intro tells the story BruhMe fixes, as a tiny group chat: who paid, the split, and getting paid back. */
function IntroVisual({ active }: { active: boolean }) {
  return (
    <Panel from="#FF9A2E" to="#FE590C">
      <View style={{ width: '100%', gap: 10, paddingHorizontal: 8 }}>
        <Float active={active} delay={0}><Bubble side="l" e="🤑" bg="#06D6A0" text="who paid for dinner? 😅" /></Float>
        <Float active={active} delay={120}><Bubble side="r" bg="#212934" dark text="me. split it on BruhMe ✌️" /></Float>
        <Float active={active} delay={240} style={{ alignSelf: 'center', width: '86%' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <BrandMark size={32} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Geist_600SemiBold', fontSize: 13, color: '#212934' }}>Dinner ₹2,400 · 4 ways</Text>
              <Text style={{ fontFamily: 'Geist_500Medium', fontSize: 12, color: '#5B6573' }}>₹600 each · pay card sent</Text>
            </View>
          </View>
        </Float>
        <Float active={active} delay={360}><Bubble side="l" e="😎" bg="#FFD166" text="done, paid you ₹600 ✅" /></Float>
      </View>
    </Panel>
  );
}

function SplitVisual({ active }: { active: boolean }) {
  const crew: [string, string][] = [['😎', '#FFD166'], ['🤑', '#06D6A0'], ['🥲', '#7FB3FF'], ['🙃', '#FF8FA3']];
  return (
    <Panel from="#2A3342" to="#14181F">
      <View style={{ width: '100%', alignItems: 'center', gap: 14, paddingHorizontal: 6 }}>
        <Float active={active} delay={0} style={{ flexDirection: 'row' }}>
          {crew.map(([e, c], i) => (
            <View key={e} style={{ marginLeft: i ? -10 : 0, borderRadius: 26, borderWidth: 3, borderColor: '#1C222C' }}><Emoji e={e} bg={c} size={46} /></View>
          ))}
        </Float>
        <Float active={active} delay={140} style={{ alignSelf: 'stretch' }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontFamily: 'Geist_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Dinner for 4</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: '#FFFFFF' }}>₹2,400</Text>
            </View>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>÷ 4 =</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'Geist_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>each</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: '#FF8106' }}>₹600</Text>
            </View>
          </View>
        </Float>
        <Float active={active} delay={280} style={{ alignSelf: 'stretch' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Row style={{ gap: 6 }}><BrandMark size={20} /><Text style={{ fontFamily: 'Geist_600SemiBold', fontSize: 10, color: '#8A93A0', letterSpacing: 1 }}>PAY REQUEST</Text></Row>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: 20, color: '#14181F' }}>Bruh me 👀</Text>
              <Text style={{ fontFamily: 'Geist_500Medium', fontSize: 12, color: '#5B6573' }}>Meera owes you</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 26, color: '#FE6A0A', letterSpacing: -0.6 }}>₹600</Text>
            </View>
            <QrCode value="BruhMe · bro, pay me back" size={78} />
          </View>
        </Float>
      </View>
    </Panel>
  );
}

function InsightVisual({ active }: { active: boolean }) {
  const cats: [string, string, number, string][] = [['🍜', 'Food', 0.42, '#FF8106'], ['🛍️', 'Shopping', 0.33, '#212934'], ['🛺', 'Travel', 0.25, '#2E9C8A']];
  const R = 46, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <Panel from="#FFF4E8" to="#FFE2C4">
      <View style={{ width: '100%', gap: 12 }}>
        <Float active={active} delay={0}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 112, height: 112, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={112} height={112} viewBox="0 0 112 112" style={{ position: 'absolute' }}>
                <SvgCircle cx={56} cy={56} r={R} stroke="#F1EEEA" strokeWidth={14} fill="none" />
                {cats.map(([, n, p, c]) => {
                  const dash = C * p - 3;
                  const el = <SvgCircle key={n} cx={56} cy={56} r={R} stroke={c} strokeWidth={14} fill="none" strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-off} strokeLinecap="butt" transform="rotate(-90 56 56)" />;
                  off += C * p;
                  return el;
                })}
              </Svg>
              <Text style={{ fontFamily: 'Geist_500Medium', fontSize: 10, color: '#8A93A0' }}>this month</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: '#212934' }}>₹18,420</Text>
            </View>
            <View style={{ flex: 1, gap: 10 }}>
              {cats.map(([e, n, p, c]) => (
                <Row key={n} style={{ gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
                  <Text style={{ fontSize: 13 }}>{e}</Text>
                  <Text style={{ flex: 1, fontFamily: 'Geist_500Medium', fontSize: 13, color: '#212934' }}>{n}</Text>
                  <Text style={{ fontFamily: 'Geist_700Bold', fontSize: 13, color: '#212934' }}>{Math.round(p * 100)}%</Text>
                </Row>
              ))}
            </View>
          </View>
        </Float>
        <Float active={active} delay={160} style={{ alignSelf: 'flex-start' }}>
          <View style={{ backgroundColor: '#212934', borderRadius: 18, borderBottomLeftRadius: 6, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ fontFamily: 'Geist_600SemiBold', fontSize: 14, color: '#FFFFFF' }}>Fridays cost you the most 😅</Text>
          </View>
        </Float>
        <Float active={active} delay={240} style={{ alignSelf: 'flex-end' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ fontFamily: 'Geist_600SemiBold', fontSize: 14, color: '#212934' }}>₹2,100 less than last month 🙌</Text>
          </View>
        </Float>
      </View>
    </Panel>
  );
}

/** Honest comparison: everything lives on your phone; BruhMe's side is empty because there is no BruhMe server. */
function PrivacyVisual({ active }: { active: boolean }) {
  const items: [string, string][] = [['🧾', 'Entries'], ['👯', 'Splits'], ['📸', 'Bill photos'], ['🔐', 'Backups']];
  return (
    <Panel from="#2A3342" to="#14181F">
      <View style={{ width: '100%', gap: 12, paddingHorizontal: 4 }}>
        <Float active={active} delay={0}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16, gap: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: 16, color: '#212934' }}>📱 On your phone</Text>
              <View style={{ backgroundColor: '#E7F5EE', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontFamily: 'Geist_600SemiBold', fontSize: 11, color: '#1B7F57' }}>everything</Text></View>
            </Row>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {items.map(([e, t]) => (
                <Row key={t} style={{ width: '48%', gap: 8, backgroundColor: '#F6F4F1', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 }}>
                  <Text style={{ fontSize: 14 }}>{e}</Text>
                  <Text style={{ fontFamily: 'Geist_600SemiBold', fontSize: 13, color: '#212934' }} numberOfLines={1}>{t}</Text>
                </Row>
              ))}
            </View>
          </View>
        </Float>
        <Float active={active} delay={140}>
          <View style={{ borderRadius: 22, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.28)', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 40, lineHeight: 46, color: '#FF8106' }}>0</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: 15, color: '#FFFFFF' }}>☁️ On BruhMe servers</Text>
              <Text style={{ fontFamily: 'Geist_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>we don’t run any 🤷 · no sign-up</Text>
            </View>
          </View>
        </Float>
      </View>
    </Panel>
  );
}

/** Last page: the QR friends will scan, and the UPI ID field, inside the panel so this page keeps the same layout as the others. */
function UpiVisual({ upi, setUpi, onDone }: VisualProps) {
  return (
    <Panel from="#FF9A2E" to="#FE590C">
      <View style={{ width: '100%', alignItems: 'center', gap: 16, paddingHorizontal: 8 }}>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 28, padding: 14, alignItems: 'center', shadowColor: '#7A2E00', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
          <QrCode value="BruhMe · scan to pay" size={132} logo={<BrandMark size={26} />} />
        </View>
        <Text style={{ fontFamily: 'Geist_600SemiBold', fontSize: 14, color: '#FFFFFF', textAlign: 'center' }}>Anyone can scan it with any UPI app.{'\n'}The amount is already filled in.</Text>
        <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, height: 54, paddingLeft: 14, paddingRight: 8, gap: 10 }}>
          <View style={{ backgroundColor: '#FFF1E3', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ fontFamily: 'Geist_700Bold', fontSize: 12, color: '#C24700' }}>UPI ID</Text>
          </View>
          <TextInput
            value={upi}
            onChangeText={setUpi}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="yourname@okaxis (optional)"
            placeholderTextColor="#8A93A0"
            returnKeyType="done"
            onSubmitEditing={onDone}
            accessibilityLabel="Your UPI ID, optional"
            style={{ flex: 1, height: 54, fontFamily: 'Geist_500Medium', fontSize: 15, color: '#212934' }}
          />
        </View>
      </View>
    </Panel>
  );
}

type VisualProps = { active: boolean; upi: string; setUpi: (v: string) => void; onDone: () => void };
const VISUAL: Record<string, (p: VisualProps) => React.ReactElement> = { intro: IntroVisual, log: LogVisual, split: SplitVisual, insights: InsightVisual, privacy: PrivacyVisual, upi: UpiVisual };

/* ---------- screen ---------- */

export default function Onboarding() {
  const { width, height } = useWindowDimensions();
  const { colors } = useTheme();
  const t = useT();
  const db = useDb();
  const set = useSettings((s) => s.set);
  const [i, setI] = useState(0);
  const [upi, setUpi] = useState('');
  const [busy, setBusy] = useState(false);
  const [listH, setListH] = useState(0);
  // New phone: restore a Vault or plain backup straight from the welcome screen.
  const restore = useRestoreFlow(() => { set(db, 'onboarded', true); });
  const list = useRef<FlatList>(null);
  const reduce = useReducedMotion();
  const last = i === PAGES.length - 1;
  const visualH = Math.min(440, Math.max(260, height * 0.52)); // identical on every page

  const go = (n: number) => {
    const k = Math.max(0, Math.min(PAGES.length - 1, n));
    list.current?.scrollToIndex({ index: k, animated: !reduce });
    setI(k);
    haptic.tap();
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const k = Math.round(e.nativeEvent.contentOffset.x / width);
    if (k !== i) setI(k);
  };

  async function finish(withDemo: boolean) {
    if (busy) return;
    const v = upi.trim();
    if (v && !isUpiId(v)) return toast('That doesn’t look like a UPI ID. It looks like yourname@okaxis.');
    setBusy(true);
    try {
      if (v) await set(db, 'myUpi', v);
      // Development builds (Expo Go) always start with the complete sample data so every screen has content; the team sees
      // the same app. In store builds sample data only loads when the user asks for it.
      if ((withDemo || __DEV__) && !(await hasAnyData(db))) { await loadCompleteDemo(db); bumpData(); }
      haptic.success();
      await set(db, 'onboarded', true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: layout.gutter, paddingTop: space.sm, height: 52 }}>
        <Row style={{ gap: 8 }}>
          <BrandMark size={30} />
          <Wordmark height={24} />
        </Row>
      </Row>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} onLayout={(e) => setListH(e.nativeEvent.layout.height)}>
        <FlatList
          ref={list}
          data={PAGES}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onMomentumScrollEnd={onScroll}
          keyExtractor={(p) => p.id}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          renderItem={({ item, index }) => {
            const V = VISUAL[item.id];
            const active = index === i;
            return (
              <View style={{ width, height: listH || undefined, paddingHorizontal: layout.gutter + 4, justifyContent: 'center' }}>
                <View style={{ height: visualH, alignItems: 'stretch', justifyContent: 'center' }}>
                  <V key={`${item.id}-${active}`} active={active} upi={upi} setUpi={setUpi} onDone={() => finish(false)} />
                </View>
                <View style={{ gap: space.sm, marginTop: space.lg, height: 124 }}>
                  <Text accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit style={{ fontFamily: fonts.brandBlack, fontSize: 32, lineHeight: 36, letterSpacing: -1, color: colors.text }}>{t(item.t)}</Text>
                  <Text v="body" color={colors.textMuted} numberOfLines={3} style={{ fontSize: 16, lineHeight: 23 }}>{t(item.b)}</Text>
                </View>
              </View>
            );
          }}
        />
      </KeyboardAvoidingView>

      <View style={{ paddingHorizontal: layout.gutter, paddingBottom: space.lg, gap: space.lg, height: 150, justifyContent: 'flex-end' }}>
        <Row style={{ justifyContent: 'center', gap: 6 }} accessibilityElementsHidden>
          {PAGES.map((p, k) => (
            <Press key={p.id} onPress={() => go(k)} accessibilityLabel={`Page ${k + 1}`} hitSlop={8}>
              <View style={{ width: k === i ? 26 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? colors.primary : colors.track }} />
            </Press>
          ))}
        </Row>
        {last ? (
          <View style={{ gap: space.sm }}>
            <Button title={upi.trim() ? t('onb.start') : `${t('onb.start')} · skip UPI for now`} kind="accent" onPress={() => finish(false)} loading={busy} />
            <Row style={{ justifyContent: 'center', gap: space.lg }}>
              <Press onPress={() => finish(true)} accessibilityLabel={t('onb.demo')} hitSlop={8} style={{ paddingVertical: 6 }}>
                <Text v="small" color={colors.link} style={{ fontFamily: 'Geist_600SemiBold' }}>Try sample data</Text>
              </Press>
              <Text v="small" color={colors.textSubtle}>·</Text>
              <Press onPress={restore.start} accessibilityLabel="Restore from a backup" hitSlop={8} style={{ paddingVertical: 6 }}>
                <Text v="small" color={colors.link} style={{ fontFamily: 'Geist_600SemiBold' }}>Restore a backup</Text>
              </Press>
            </Row>
          </View>
        ) : (
          <Row style={{ gap: space.sm }}>
            {i > 0 ? <Button title="Back" kind="secondary" onPress={() => go(i - 1)} style={{ flex: 1 }} /> : null}
            <Button title={t('onb.next')} kind="accent" onPress={() => go(i + 1)} style={{ flex: 2 }} />
          </Row>
        )}
      </View>
      {restore.element}
    </Screen>
  );
}
