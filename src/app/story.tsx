import React, { useRef, useState } from 'react';
import { Image, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { SubScreen, Text, Row, Button, Chip, Press } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { SkeletonList } from '@/components/Feedback';
import { ToastHost, toast } from '@/components/Toast';
import { useQuery } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { dayTrack, runLength, monthLines, monthCells, worthSharing, type StickerKey } from '@/features/story/stickers';
import { StreakSticker, LessSticker, NoSpendSticker, AuraSticker } from '@/features/story/StickerViews';
import { auraDays, auraScore } from '@/features/mce/aura';
import { useIsPro } from '@/features/pro/store';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const DAY = 86_400_000;
const LABEL: Record<StickerKey, string> = { streak: 'Streak', less: 'Spent less', nospend: 'No-spend days', aura: 'Aura' };
// Flat backdrops for when there is no photo. Deliberately few and solid.
const BACKDROPS = ['#14181F', '#FF8106', '#1460FF', '#0C9C74', '#FF2E7E', '#4B1FD1'];

/**
 * Story maker: the user's own photo with a small habit sticker on top, sized 9:16 for a story. The streak sticker is
 * free; the others are Pro. Nothing leaves the phone except through the share sheet.
 */
export default function Story() {
  const router = useRouter();
  const pro = useIsPro();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const frame = useRef<React.ElementRef<typeof ViewShot>>(null);
  const sticker = useRef<React.ElementRef<typeof ViewShot>>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [bg, setBg] = useState(BACKDROPS[0]);
  const [ink, setInk] = useState('#FFFFFF'); // dark ink for light photos
  const [pick, setPick] = useState<StickerKey | null>(null);
  // free placement: drag, pinch and twist the sticker anywhere on the photo
  const tx = useSharedValue(0), ty = useSharedValue(0), sc = useSharedValue(1), rot = useSharedValue(0);
  const sx = useSharedValue(0), sy = useSharedValue(0), ss = useSharedValue(1), sr = useSharedValue(0);
  const now = Date.now();
  const q = useQuery(async (d) => ({
    txs: await listTransactions(d, { from: now - 70 * DAY, to: now + 1 }),
    sets: (await d.all<{ occurred_at: number }>('SELECT occurred_at FROM settlements WHERE deleted_at IS NULL')).map((x) => x.occurred_at),
  }), []);

  const fw = Math.min(360, width - 40), fh = Math.round((fw * 16) / 9);

  // Snapping: the sticker's centre locks onto the frame's centre lines, and its angle onto 0, 45 and 90 degrees, with a
  // light haptic tick on each lock. Guides show only while the sticker is being moved. Callbacks run on the JS thread.
  const [size, setSize] = useState({ w: 260, h: 260 });
  const [guide, setGuide] = useState<{ on: boolean; x: boolean; y: boolean; r: boolean }>({ on: false, x: false, y: false, r: false });
  const snapRef = useRef({ x: false, y: false, r: false });
  const SNAP = 8, ANGLE = (4 * Math.PI) / 180;
  const baseX = 28 + size.w / 2, baseY = fh - 28 - size.h / 2;
  function lock(next: { x: boolean; y: boolean; r: boolean }) {
    const prev = snapRef.current;
    if ((next.x && !prev.x) || (next.y && !prev.y) || (next.r && !prev.r)) haptic.light();
    snapRef.current = next;
    setGuide({ on: true, ...next });
  }
  const pan = Gesture.Pan().runOnJS(true)
    .onStart(() => { sx.value = tx.value; sy.value = ty.value; setGuide((g) => ({ ...g, on: true })); })
    .onUpdate((e) => {
      let nx = sx.value + e.translationX, ny = sy.value + e.translationY;
      const dx = fw / 2 - (baseX + nx), dy = fh / 2 - (baseY + ny);
      const x = Math.abs(dx) < SNAP, y = Math.abs(dy) < SNAP;
      if (x) nx += dx;
      if (y) ny += dy;
      tx.value = nx; ty.value = ny;
      lock({ ...snapRef.current, x, y });
    })
    .onEnd(() => setGuide((g) => ({ ...g, on: false })));
  const pinch = Gesture.Pinch().runOnJS(true).onStart(() => { ss.value = sc.value; }).onUpdate((e) => { sc.value = Math.min(2.6, Math.max(0.4, ss.value * e.scale)); });
  const twist = Gesture.Rotation().runOnJS(true)
    .onStart(() => { sr.value = rot.value; setGuide((g) => ({ ...g, on: true })); })
    .onUpdate((e) => {
      let a = sr.value + e.rotation;
      const step = Math.PI / 4, near = Math.round(a / step) * step;
      const r = Math.abs(a - near) < ANGLE;
      if (r) a = near;
      rot.value = a;
      lock({ ...snapRef.current, r });
    })
    .onEnd(() => setGuide((g) => ({ ...g, on: false })));
  const gesture = Gesture.Simultaneous(pan, pinch, twist);
  const moved = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: sc.value }, { rotate: `${rot.value}rad` }] }));
  const reset = () => { tx.value = 0; ty.value = 0; sc.value = 1; rot.value = 0; snapRef.current = { x: false, y: false, r: false }; };
  const keys = q.data ? worthSharing(q.data.txs, now) : [];
  const key = pick && keys.includes(pick) ? pick : keys[0] ?? 'aura';
  const locked = !pro && key !== 'streak';

  async function choosePhoto() {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (!r.canceled && r.assets[0]) setPhoto(r.assets[0].uri);
    } catch { toast('Couldn’t open your photos'); }
  }
  async function share(ref: React.RefObject<React.ElementRef<typeof ViewShot> | null>) {
    if (locked) return router.push('/pro');
    try {
      const uri = await ref.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch { toast('Couldn’t create the image'); }
  }

  const st = (() => {
    if (!q.data) return null;
    const { txs, sets } = q.data;
    if (key === 'streak') { const t = dayTrack(txs, now); return <StreakSticker days={runLength(t)} track={t} ink={ink} />; }
    if (key === 'less') { const l = monthLines(txs, now); return <LessSticker pct={l.pct ?? 0} cur={l.cur} prev={l.prev} prevLabel={l.prevLabel} ink={ink} />; }
    if (key === 'nospend') { const c = monthCells(txs, now); return <NoSpendSticker count={c.noSpend} cells={c.cells} firstWeekday={c.firstWeekday} month={new Date(now).toLocaleDateString('en-IN', { month: 'long' })} ink={ink} />; }
    const a = auraScore(auraDays(txs, sets, now));
    return <AuraSticker score={a.score} rank={a.rank.key} title={a.rank.title} ink={ink} />;
  })();

  return (
    <SubScreen title="Make a story">
      {!q.data ? <SkeletonList n={2} /> : (
        <>
          <View style={{ alignItems: 'center' }}>
            <ViewShot ref={frame} options={{ format: 'png', quality: 1 }}>
              <View style={{ width: fw, height: fh, borderRadius: 24, overflow: 'hidden', backgroundColor: bg, padding: 28, justifyContent: 'flex-end' }}>
                {photo ? <Image source={{ uri: photo }} style={{ position: 'absolute', top: 0, left: 0, width: fw, height: fh }} resizeMode="cover" /> : null}
                {guide.on ? (
                  <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: fw, height: fh }}>
                    {[1, 2].map((i) => <View key={`v${i}`} style={{ position: 'absolute', left: (fw * i) / 3, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.18)' }} />)}
                    {[1, 2].map((i) => <View key={`h${i}`} style={{ position: 'absolute', top: (fh * i) / 3, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.18)' }} />)}
                    <View style={{ position: 'absolute', left: fw / 2 - 0.75, top: 0, bottom: 0, width: 1.5, backgroundColor: guide.x ? colors.primary : 'rgba(255,255,255,0.32)' }} />
                    <View style={{ position: 'absolute', top: fh / 2 - 0.75, left: 0, right: 0, height: 1.5, backgroundColor: guide.y ? colors.primary : 'rgba(255,255,255,0.32)' }} />
                    {guide.r ? <View style={{ position: 'absolute', top: 14, alignSelf: 'center', left: fw / 2 - 30, width: 60, borderRadius: 999, backgroundColor: colors.primary, paddingVertical: 3, alignItems: 'center' }}><Text v="small" style={{ fontFamily: 'Geist_700Bold', color: '#14181F' }}>{Math.round(((rot.value * 180) / Math.PI) % 360)}°</Text></View> : null}
                  </View>
                ) : null}
                <GestureDetector gesture={gesture}>
                  <Animated.View onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={[{ alignSelf: 'flex-start', paddingBottom: 40 }, moved]}>
                    <ViewShot ref={sticker} options={{ format: 'png', quality: 1 }}>{st}</ViewShot>
                  </Animated.View>
                </GestureDetector>
              </View>
            </ViewShot>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {keys.map((k) => <Chip key={k} label={`${LABEL[k]}${!pro && k !== 'streak' ? ' · Pro' : ''}`} selected={key === k} onPress={() => setPick(k)} />)}
          </ScrollView>

          <Row style={{ gap: space.sm, alignItems: 'center' }}>
            <Button title={photo ? 'Change photo' : 'Add your photo'} kind="secondary" icon="image" onPress={choosePhoto} style={{ flex: 1 }} />
            {photo ? <Button title="Remove" kind="ghost" size="sm" onPress={() => setPhoto(null)} /> : null}
          </Row>
          {!photo ? (
            <Row style={{ gap: space.sm }}>
              {BACKDROPS.map((c) => (
                <Press key={c} onPress={() => setBg(c)} accessibilityLabel="Background colour" accessibilityState={{ selected: bg === c }}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, borderWidth: 3, borderColor: bg === c ? colors.primary : 'transparent' }}><View /></Press>
              ))}
            </Row>
          ) : null}
          <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Row style={{ gap: space.sm, flex: 1 }}>
              <Chip label="White" selected={ink === '#FFFFFF'} onPress={() => setInk('#FFFFFF')} />
              <Chip label="Dark" selected={ink !== '#FFFFFF'} onPress={() => setInk('#14181F')} />
            </Row>
            <Button title="Reset" kind="ghost" size="sm" onPress={reset} />
          </Row>

          <Text v="small" color={colors.textMuted} style={{ textAlign: 'center' }}>Drag the sticker to move it. Pinch to resize, twist to turn.</Text>
          <Button title={locked ? 'Unlock this sticker with Pro' : 'Share to your story'} kind="accent" icon={locked ? 'lock' : 'share'} onPress={() => share(frame)} />
          {!locked ? (
            <Press onPress={() => share(sticker)} accessibilityLabel="Share the sticker only" style={{ alignSelf: 'center', paddingVertical: 6 }}>
              <Row style={{ gap: 6 }}><Icon name="download" size={16} color={colors.link} /><Text v="small" color={colors.link}>Sticker only, to place on any photo</Text></Row>
            </Press>
          ) : null}
          <Text v="small" color={colors.textMuted} style={{ textAlign: 'center' }}>No amounts are ever shown. Your photo stays on your phone until you share.</Text>
        </>
      )}
      <ToastHost />
    </SubScreen>
  );
}
