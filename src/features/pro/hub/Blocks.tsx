import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Svg, { Circle, Rect } from 'react-native-svg';
import { Press, Text, Row } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { AuraOrb, RankMark, RANK_ORDER, auraColors } from '@/features/mce/AuraOrb';
import { RANKS, seasonDaysLeft } from '@/features/mce/aura';
import { dayTrack, runLength, monthLines, monthCells, worthSharing } from '@/features/story/stickers';
import { StreakSticker, LessSticker, NoSpendSticker, AuraSticker } from '@/features/story/StickerViews';
import { WIDGETS, type useProStats } from '@/features/pro/widgets';
import { formatMoney } from '@/domain/money';
import { fonts, space } from '@/theme/tokens';
import { TOOL_COLORS, type SeasonTheme } from './theme';

type Stats = NonNullable<ReturnType<typeof useProStats>>;
const money = (n: number) => formatMoney(n, 'INR', { compact: true });
export const Caps = ({ children, color }: { children: React.ReactNode; color: string }) => <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.5, color }}>{children}</Text>;

/** The month's season, the way a store does its festive banner: big name, countdown, the rank ladder. */
export function SeasonHero({ t, stats, onPress }: { t: SeasonTheme; stats: Stats; onPress: () => void }) {
  const lvl = RANK_ORDER.indexOf(stats.aura.rank.key);
  const days = seasonDaysLeft(Date.now());
  return (
    <Press onPress={onPress} accessibilityLabel={`${t.name} season, ${days} days left`} style={{ borderRadius: 28, backgroundColor: t.tile, padding: space.lg, gap: space.md, borderWidth: 1, borderColor: t.line }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Caps color={t.accent}>— SEASON —</Caps>
        <View style={{ borderRadius: 999, borderWidth: 1, borderColor: t.accent, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: t.accent }}>{days} DAYS LEFT</Text>
        </View>
      </Row>
      <Text style={{ fontFamily: fonts.brandBlack, fontSize: 44, lineHeight: 48, letterSpacing: -1.5, color: t.ink }}>{t.name.toUpperCase()}</Text>
      <Row style={{ gap: 6 }}>
        {RANKS.map((r, i) => (
          <View key={r.key} style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: i <= lvl ? t.accent : t.line }} />
            <Text style={{ fontFamily: fonts.semibold, fontSize: 9.5, color: i === lvl ? t.ink : t.soft }} numberOfLines={1}>{i === lvl ? 'YOU' : r.title.split(' ')[0].toUpperCase()}</Text>
          </View>
        ))}
      </Row>
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: t.soft }}>{stats.aura.rank.title} now. Finish the month higher and keep the badge.</Text>
    </Press>
  );
}

function Tile({ t, onPress, label, style, children }: { t: SeasonTheme; onPress: () => void; label: string; style?: object; children: React.ReactNode }) {
  return <Press onPress={onPress} accessibilityLabel={label} style={[{ borderRadius: 24, backgroundColor: t.tile, padding: space.md, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }, style]}>{children}</Press>;
}

/** Bento: one tall tile (the challenge) and four small ones, each a live drawing of the user's own data. */
export function Bento({ t, stats, locked }: { t: SeasonTheme; stats: Stats; locked: boolean }) {
  const router = useRouter();
  const go = (h: Href) => () => router.push(h);
  const ch = stats.running[0];
  const now = Date.now();
  const renewing = stats.radar.items.filter((v) => v.status === 'active' && !v.cancelled && v.renewsInDays >= 0 && v.renewsInDays <= 7);
  const out = stats.dues.reduce((a, d) => a + (d.amount ?? 0), 0) + renewing.reduce((a, v) => a + v.amount, 0);
  const next3 = [...stats.dues.map((d) => d.due), ...renewing.map((r) => r.nextExpected)].sort((a, b) => a - b).slice(0, 3);
  const subs = stats.radar.items.filter((v) => v.status === 'active' && !v.cancelled).sort((a, b) => b.amount - a.amount).slice(0, 6);
  const maxSub = Math.max(1, ...subs.map((s) => s.amount));
  const mask = (s: string) => (locked ? '••' : s);
  const goal = ch ? Math.min(ch.goal, 30) : 30;
  const filled = ch ? Math.round((ch.progress / ch.goal) * goal) : 0;
  const cols = goal > 14 ? 5 : goal > 7 ? 4 : 3;
  return (
    <View style={{ gap: space.sm }}>
    <Row style={{ gap: space.sm, alignItems: 'stretch' }}>
      {/* tall: challenge with a dot calendar */}
      <Tile t={t} onPress={go('/challenges')} label="Challenge" style={{ flex: 1, minHeight: 300, justifyContent: 'space-between' }}>
        <View style={{ gap: 4 }}>
          <Caps color={t.soft}>CHALLENGE</Caps>
          <Text style={{ fontFamily: fonts.brandBlack, fontSize: 20, lineHeight: 24, color: t.ink }}>{ch ? ch.def.title : 'Start one'}</Text>
        </View>
        <Svg width={cols * 22} height={Math.ceil(goal / cols) * 22}>
          {Array.from({ length: goal }, (_, i) => <Circle key={i} cx={(i % cols) * 22 + 9} cy={Math.floor(i / cols) * 22 + 9} r={8} fill={i < filled ? t.accent : 'none'} stroke={i < filled ? t.accent : t.line} strokeWidth={2} />)}
        </Svg>
        <View>
          <Text style={{ fontFamily: fonts.brandBlack, fontSize: 34, color: t.ink }}>{ch ? `${ch.progress}/${ch.goal}` : '0/7'}</Text>
          <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: t.soft }}>{ch ? `${ch.daysLeft} days left` : 'Tap to pick a challenge'}</Text>
        </View>
      </Tile>
      <View style={{ flex: 1, gap: space.sm }}>
        <Tile t={t} onPress={go('/mce')} label="Aura" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <AuraOrb rank={stats.aura.rank.key} score={stats.aura.score} size={54} color={t.accent} track={t.line} />
          <View style={{ flex: 1 }}>
            <Caps color={t.soft}>AURA</Caps>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: Math.min(15, Math.floor(84 / (Math.max(...stats.aura.rank.title.split(' ').map((w) => w.length)) * 0.72))), lineHeight: 18, color: t.ink }} numberOfLines={2}>{stats.aura.rank.title}</Text>
          </View>
        </Tile>
        <Tile t={t} onPress={go('/dues')} label="Going out this week" style={{ gap: 8 }}>
          <Caps color={t.soft}>NEXT 7 DAYS</Caps>
          <Text style={{ fontFamily: fonts.brandBlack, fontSize: 24, color: t.ink }}>{mask(money(out))}</Text>
          <Row style={{ gap: 6 }}>
            {next3.length ? next3.map((d, i) => (
              <View key={i} style={{ borderRadius: 10, backgroundColor: t.tile2, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.brandBlack, fontSize: 14, color: t.ink }}>{new Date(d).getDate()}</Text>
                <Text style={{ fontFamily: fonts.bold, fontSize: 8.5, color: t.soft }}>{new Date(d).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</Text>
              </View>
            )) : <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: t.soft }}>Nothing due</Text>}
          </Row>
        </Tile>
        <Tile t={t} onPress={go('/radar')} label="Repeating charges" style={{ gap: 8, flex: 1 }}>
          <Caps color={t.soft}>REPEATING</Caps>
          <Text style={{ fontFamily: fonts.brandBlack, fontSize: 20, color: t.ink }}>{mask(`${money(stats.radar.monthlyActive)}/mo`)}</Text>
          <Svg width="100%" height={26}>
            {subs.map((s, i) => <Rect key={s.key} x={`${i * 16.6}%`} y={26 - (s.amount / maxSub) * 26} width="11%" height={(s.amount / maxSub) * 26} rx={3} fill={s.change > 0 ? '#FF8A8A' : t.accent} />)}
          </Svg>
        </Tile>
      </View>
    </Row>
    <Tile t={t} onPress={go('/reimburse')} label="Ready to claim" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Icon name="receipt" size={22} color={t.accent} />
      <View style={{ flex: 1 }}>
        <Caps color={t.soft}>READY TO CLAIM FROM WORK</Caps>
        <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: t.soft }}>{stats.claim.count} work spends · PDF with receipts</Text>
      </View>
      <Text style={{ fontFamily: fonts.brandBlack, fontSize: 20, color: t.ink }}>{mask(money(stats.claim.total))}</Text>
    </Tile>
    </View>
  );
}

/** "Make it a story": real sticker previews on small story frames; tapping opens the maker with that sticker. */
export function StoryRail({ t, stats }: { t: SeasonTheme; stats: Stats }) {
  const router = useRouter();
  const now = Date.now();
  const track = dayTrack(stats.txs, now);
  const l = monthLines(stats.txs, now);
  const c = monthCells(stats.txs, now);
  // only stickers worth showing off are previewed (no "0 no-spend days")
  const worthy = worthSharing(stats.txs, now);
  const all: { key: string; label: string; node: React.ReactNode }[] = [
    { key: 'streak', label: 'Streak', node: <StreakSticker days={runLength(track)} track={track} /> },
    { key: 'less', label: 'Spent less', node: <LessSticker pct={l.pct ?? 0} cur={l.cur} prev={l.prev} prevLabel={l.prevLabel} /> },
    { key: 'nospend', label: 'No-spend', node: <NoSpendSticker count={c.noSpend} cells={c.cells} firstWeekday={c.firstWeekday} month={new Date(now).toLocaleDateString('en-IN', { month: 'long' })} /> },
    { key: 'aura', label: 'Aura', node: <AuraSticker score={stats.aura.score} rank={stats.aura.rank.key} title={stats.aura.rank.title} /> },
  ];
  const items = all.filter((x) => worthy.includes(x.key as never));
  const BG = ['#14181F', '#FF8106', '#1460FF', '#0C9C74'];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: space.sm }}>
      {items.map((it, i) => (
        <Press key={it.key} onPress={() => router.push({ pathname: '/story', params: { s: it.key } })} accessibilityLabel={`Make a ${it.label} story`} style={{ alignItems: 'center', gap: 8 }}>
          <View style={{ width: 118, height: 200, borderRadius: 18, backgroundColor: BG[i % BG.length], overflow: 'hidden', justifyContent: 'flex-end', borderWidth: 2, borderColor: i === 0 ? t.accent : 'transparent' }}>
            <View style={{ transform: [{ scale: 0.38 }], width: 260, marginLeft: -71, marginBottom: -60 }}>{it.node}</View>
          </View>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: i === 0 ? t.ink : t.soft }}>{it.label}</Text>
        </Press>
      ))}
    </ScrollView>
  );
}

/** Tools as coloured shop fronts with a big glyph and a live line. */
export function ToolRail({ stats, locked, ids }: { stats: Stats; locked: boolean; ids: string[] }) {
  const router = useRouter();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: space.sm }}>
      {ids.map((id) => WIDGETS.find((w) => w.id === id)).filter((w) => !!w).map((w) => (
        <Press key={w.id} onPress={() => router.push(w.href)} accessibilityLabel={w.title} style={{ width: 150, height: 196, borderRadius: 22, backgroundColor: TOOL_COLORS[w.id] ?? '#14181F', padding: space.md, overflow: 'hidden' }}>
          <Text style={{ fontFamily: fonts.brandBlack, fontSize: 18, lineHeight: 22, color: '#FFFFFF' }}>{w.title}</Text>
          <Text style={{ fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 }} numberOfLines={3}>{locked ? w.sub : stats.stat[w.id]}</Text>
          <View style={{ position: 'absolute', right: -14, bottom: -14 }}><Icon name={w.icon as IconName} size={96} color="rgba(255,255,255,0.22)" /></View>
          {locked ? <View style={{ position: 'absolute', left: space.md, bottom: space.md }}><Icon name="lock" size={16} color="#FFFFFF" /></View> : null}
        </Press>
      ))}
    </ScrollView>
  );
}

/** A ticket-style card (notched edge), used for the friend code or the free week. */
export function Ticket({ t, title, line, cta, onPress }: { t: SeasonTheme; title: string; line: string; cta: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityLabel={title} style={{ borderRadius: 22, backgroundColor: t.accent, overflow: 'hidden' }}>
      <View style={{ padding: space.lg, gap: 6 }}>
        <Text style={{ fontFamily: fonts.brandBlack, fontSize: 22, lineHeight: 26, color: '#14181F' }}>{title}</Text>
        <Text style={{ fontFamily: fonts.medium, fontSize: 13.5, color: 'rgba(20,24,31,0.72)' }}>{line}</Text>
        <View style={{ alignSelf: 'flex-start', marginTop: 6, borderRadius: 999, backgroundColor: '#14181F', paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#FFFFFF' }}>{cta}</Text>
        </View>
      </View>
      <Row style={{ position: 'absolute', bottom: -6, left: 0, right: 0, justifyContent: 'space-between', paddingHorizontal: 4 }}>
        {Array.from({ length: 22 }, (_, i) => <View key={i} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: t.base }} />)}
      </Row>
    </Press>
  );
}

export { auraColors, RankMark };
