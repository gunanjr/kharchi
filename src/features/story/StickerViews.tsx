import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Text } from '@/components/ui';
import { BrandMark } from '@/components/Wordmark';
import { RankMark } from '@/features/mce/AuraOrb';
import { fonts } from '@/theme/tokens';
import type { Cell } from './stickers';

/**
 * Story stickers: white on transparent with a soft shadow, so they sit on any photo the way a run summary does.
 * One big number, one short line, one drawing, a small mark. Never an amount.
 */
const SHADOW = { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 } as const;
const sh = (ink: string) => (ink === '#FFFFFF' ? SHADOW : {});
const W = 260;

function Big({ children, ink }: { children: React.ReactNode; ink: string }) {
  return <Text style={{ fontFamily: fonts.brandBlack, fontSize: 88, lineHeight: 94, letterSpacing: -3, color: ink, ...sh(ink) }} numberOfLines={1} adjustsFontSizeToFit>{children}</Text>;
}
function Line({ children, ink }: { children: React.ReactNode; ink: string }) {
  return <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: ink, ...sh(ink) }}>{children}</Text>;
}
function Mark({ ink }: { ink: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
      <BrandMark size={18} />
      <Text style={{ fontFamily: fonts.brandBlack, fontSize: 13, color: ink, ...sh(ink) }}>BruhMe</Text>
    </View>
  );
}

/** A path through normalised points (0..1), drawn left to right in a w x h box. */
function pathOf(pts: number[], w: number, h: number, total: number) {
  if (!pts.length) return '';
  const step = w / Math.max(1, total - 1);
  return pts.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)} ${(h - v * (h - 4) - 2).toFixed(1)}`).join(' ');
}

export function StreakSticker({ days, track, ink = '#FFFFFF' }: { days: number; track: boolean[]; ink?: string }) {
  const dot = W / track.length;
  return (
    <View style={{ width: W }}>
      <Big ink={ink}>{days}</Big>
      <Line ink={ink}>{days === 1 ? 'day' : 'days'} in a row, every spend logged</Line>
      <Svg width={W} height={14} style={{ marginTop: 14 }}>
        {track.map((on, i) => <Circle key={i} cx={i * dot + dot / 2} cy={7} r={Math.min(4, dot / 2 - 1)} fill={ink} opacity={on ? 1 : 0.3} />)}
      </Svg>
      <Mark ink={ink} />
    </View>
  );
}

export function LessSticker({ pct, cur, prev, prevLabel, ink = '#FFFFFF' }: { pct: number; cur: number[]; prev: number[]; prevLabel: string; ink?: string }) {
  const h = 90, total = Math.max(cur.length, prev.length);
  const end = cur.length ? { x: ((cur.length - 1) * W) / Math.max(1, total - 1), y: h - cur[cur.length - 1] * (h - 4) - 2 } : null;
  return (
    <View style={{ width: W }}>
      <Big ink={ink}>{pct < 0 ? `−${Math.abs(pct)}` : `+${pct}`}%</Big>
      <Line ink={ink}>spent vs {prevLabel}, same days</Line>
      <Svg width={W} height={h} style={{ marginTop: 14 }}>
        <Path d={pathOf(prev, W, h, total)} stroke={ink} strokeOpacity={0.45} strokeWidth={2.5} strokeDasharray="5 6" fill="none" strokeLinecap="round" />
        <Path d={pathOf(cur, W, h, total)} stroke={ink} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {end ? <Circle cx={end.x} cy={end.y} r={6} fill={ink} /> : null}
      </Svg>
      <Mark ink={ink} />
    </View>
  );
}

export function NoSpendSticker({ count, cells, firstWeekday, month, ink = '#FFFFFF' }: { count: number; cells: Cell[]; firstWeekday: number; month: string; ink?: string }) {
  const size = 26, gap = 6;
  const slots = [...Array(firstWeekday).fill(null), ...cells] as (Cell | null)[];
  return (
    <View style={{ width: W }}>
      <Big ink={ink}>{count}</Big>
      <Line ink={ink}>no-spend days in {month}</Line>
      <Svg width={7 * size + 6 * gap} height={Math.ceil(slots.length / 7) * (size + gap)} style={{ marginTop: 14 }}>
        {slots.map((c, i) => c === null ? null : (
          <Rect key={i} x={(i % 7) * (size + gap)} y={Math.floor(i / 7) * (size + gap)} width={size} height={size} rx={7}
            fill={c === 'nospend' ? ink : 'none'} stroke={ink} strokeOpacity={c === 'future' ? 0.2 : c === 'nospend' ? 1 : 0.5} strokeWidth={1.5} />
        ))}
      </Svg>
      <Mark ink={ink} />
    </View>
  );
}

export function AuraSticker({ score, rank, title, ink = '#FFFFFF' }: { score: number; rank: string; title: string; ink?: string }) {
  const s = 150, sw = 12, r = (s - sw) / 2, c = 2 * Math.PI * r;
  const off = ink === '#FFFFFF' ? 'rgba(255,255,255,0.3)' : 'rgba(20,24,31,0.2)';
  const fit = Math.min(30, Math.floor((W - 34) / (title.length * 0.62))); // sized from the text so it never cuts, on every platform
  return (
    <View style={{ width: W }}>
      <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={s} height={s} style={{ position: 'absolute', top: 0, left: 0 }}>
          <Circle cx={s / 2} cy={s / 2} r={r} stroke={off} strokeWidth={sw} fill="none" />
          <Circle cx={s / 2} cy={s / 2} r={r} stroke={ink} strokeWidth={sw} fill="none" strokeLinecap="round" strokeDasharray={`${(c * Math.max(2, score)) / 100} ${c}`} transform={`rotate(-90 ${s / 2} ${s / 2})`} />
        </Svg>
        <Text style={{ fontFamily: fonts.brandBlack, fontSize: 52, lineHeight: 62, color: ink, ...sh(ink) }} numberOfLines={1}>{score}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <RankMark rank={rank} size={22} color={ink} off={off} />
        <Text style={{ flex: 1, fontFamily: fonts.brandBlack, fontSize: fit, lineHeight: fit * 1.2, color: ink, ...sh(ink) }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{title}</Text>
      </View>
      <Line ink={ink}>aura this month</Line>
      <Mark ink={ink} />
    </View>
  );
}
