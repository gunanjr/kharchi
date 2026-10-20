import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { Text } from '@/components/ui';
import { fonts } from '@/theme/tokens';

// One flat colour per rank. Dark ink (#14181F) reads on every one of them.
const AURAS: Record<string, [string, string, string]> = {
  npc: ['#B9C0CB', '#7D8796', '#E6E9EE'],
  side: ['#7FD3FF', '#3D7BFF', '#CDEBFF'],
  support: ['#5BF0B8', '#0CA678', '#C8FBE6'],
  main: ['#FFB547', '#FF2E7E', '#FFE0B8'],
  armor: ['#B57BFF', '#4B1FD1', '#E5D4FF'],
  boss: ['#FFE14D', '#FF2E7E', '#FFF6C2'],
};
export const auraColors = (rank: string) => AURAS[rank] ?? AURAS.npc;
export const RANK_ORDER = ['npc', 'side', 'support', 'main', 'armor', 'boss'];

/** The aura as a plain progress ring: score out of 100, the number in the middle. No glow, no gradient. */
export function AuraOrb({ rank, score, size = 220, ink = '#FFFFFF', track = 'rgba(255,255,255,0.1)', color }: { rank: string; score: number; size?: number; ink?: string; track?: string; color?: string }) {
  const sw = size * 0.08, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const fill = color ?? auraColors(rank)[0];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={sw} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={fill} strokeWidth={sw} fill="none" strokeLinecap="round" strokeDasharray={`${(c * Math.max(2, score)) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <Text style={{ fontFamily: fonts.brandBlack, fontSize: size * 0.3, lineHeight: size * 0.36, color: ink, letterSpacing: -size * 0.01 }}>{score}</Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: Math.max(9, size * 0.055), letterSpacing: 1.4, color: ink, opacity: 0.6 }}>AURA</Text>
    </View>
  );
}

/** The rank as six rising bars, filled up to your rank. Our own mark instead of an emoji. */
export function RankMark({ rank, size = 20, color, off = 'rgba(127,127,127,0.3)' }: { rank: string; size?: number; color?: string; off?: string }) {
  const lvl = RANK_ORDER.indexOf(rank);
  const fill = color ?? auraColors(rank)[0];
  const bw = size / 8.5, gap = bw * 0.5;
  return (
    <Svg width={size} height={size}>
      {RANK_ORDER.map((_, i) => {
        const h = size * (0.3 + (0.7 * i) / 5);
        return <Rect key={i} x={i * (bw + gap)} y={size - h} width={bw} height={h} rx={bw / 2} fill={i <= lvl ? fill : off} />;
      })}
    </Svg>
  );
}
