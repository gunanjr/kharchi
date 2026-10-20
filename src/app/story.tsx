import React, { useRef, useState } from 'react';
import { Image, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import ViewShot from 'react-native-view-shot';
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
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const DAY = 86_400_000;
const LABEL: Record<StickerKey, string> = { streak: 'Streak', less: 'Spent less', nospend: 'No-spend days', aura: 'Aura' };
// Flat backdrops for when there is no photo. Deliberately few and solid.
const BACKDROPS = ['#14181F', '#FF8106', '#1460FF', '#0C9C74', '#FF2E7E', '#4B1FD1'];
type Pos = 'top' | 'middle' | 'bottom';

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
  const [pick, setPick] = useState<StickerKey | null>(null);
  const [pos, setPos] = useState<Pos>('bottom');
  const now = Date.now();
  const q = useQuery(async (d) => ({
    txs: await listTransactions(d, { from: now - 70 * DAY, to: now + 1 }),
    sets: (await d.all<{ occurred_at: number }>('SELECT occurred_at FROM settlements WHERE deleted_at IS NULL')).map((x) => x.occurred_at),
  }), []);

  const fw = Math.min(360, width - 40), fh = Math.round((fw * 16) / 9);
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
    if (key === 'streak') { const t = dayTrack(txs, now); return <StreakSticker days={runLength(t)} track={t} />; }
    if (key === 'less') { const l = monthLines(txs, now); return <LessSticker pct={l.pct ?? 0} cur={l.cur} prev={l.prev} prevLabel={l.prevLabel} />; }
    if (key === 'nospend') { const c = monthCells(txs, now); return <NoSpendSticker count={c.noSpend} cells={c.cells} firstWeekday={c.firstWeekday} month={new Date(now).toLocaleDateString('en-IN', { month: 'long' })} />; }
    const a = auraScore(auraDays(txs, sets, now));
    return <AuraSticker score={a.score} rank={a.rank.key} title={a.rank.title} />;
  })();

  return (
    <SubScreen title="Make a story">
      {!q.data ? <SkeletonList n={2} /> : (
        <>
          <View style={{ alignItems: 'center' }}>
            <ViewShot ref={frame} options={{ format: 'png', quality: 1 }}>
              <View style={{ width: fw, height: fh, borderRadius: 24, overflow: 'hidden', backgroundColor: bg, padding: 28, justifyContent: pos === 'top' ? 'flex-start' : pos === 'middle' ? 'center' : 'flex-end' }}>
                {photo ? <Image source={{ uri: photo }} style={{ position: 'absolute', top: 0, left: 0, width: fw, height: fh }} resizeMode="cover" /> : null}
                <ViewShot ref={sticker} options={{ format: 'png', quality: 1 }} style={{ alignSelf: 'flex-start', paddingTop: pos === 'top' ? 40 : 0, paddingBottom: pos === 'bottom' ? 40 : 0 }}>
                  {st}
                </ViewShot>
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
          <Row style={{ gap: space.sm }}>
            {(['top', 'middle', 'bottom'] as Pos[]).map((p) => <Chip key={p} label={p[0].toUpperCase() + p.slice(1)} selected={pos === p} onPress={() => setPos(p)} />)}
          </Row>

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
