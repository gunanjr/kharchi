import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Text } from '@/components/ui';
import { BrandMark } from '@/components/Wordmark';
import { fonts } from '@/theme/tokens';

/**
 * Bold, share-ready poster backgrounds for Wrapped, the money profile and pay cards. Fixed colours (not the app theme)
 * so a shared image looks the same everywhere. Each palette has its own decoration so slides feel different.
 */
export type PaletteKey = 'grape' | 'tangerine' | 'lime' | 'ocean' | 'bubblegum' | 'mint' | 'midnight' | 'sunshine';
export const PALETTES: Record<PaletteKey, { from: string; to: string; ink: string; soft: string; accent: string; deco: string }> = {
  grape: { from: '#8B5CFF', to: '#4B1FD1', ink: '#FFFFFF', soft: 'rgba(255,255,255,0.72)', accent: '#C6F432', deco: '#B69CFF' },
  tangerine: { from: '#FFA23A', to: '#FE5A0C', ink: '#FFFFFF', soft: 'rgba(255,255,255,0.78)', accent: '#2B1400', deco: '#FFD08A' },
  lime: { from: '#D8FB5C', to: '#9EE21A', ink: '#14181F', soft: 'rgba(20,24,31,0.68)', accent: '#4B1FD1', deco: '#F2FFB8' },
  ocean: { from: '#38D0FF', to: '#1460FF', ink: '#FFFFFF', soft: 'rgba(255,255,255,0.75)', accent: '#FFE14D', deco: '#9FE6FF' },
  bubblegum: { from: '#FF8AC4', to: '#FF2E7E', ink: '#FFFFFF', soft: 'rgba(255,255,255,0.78)', accent: '#2B0016', deco: '#FFC2DE' },
  mint: { from: '#3BE3AE', to: '#0C9C74', ink: '#FFFFFF', soft: 'rgba(255,255,255,0.78)', accent: '#FFE14D', deco: '#A6F5DA' },
  midnight: { from: '#2A3342', to: '#0E1117', ink: '#FFFFFF', soft: 'rgba(255,255,255,0.66)', accent: '#FF8106', deco: '#3B4659' },
  sunshine: { from: '#FFE36A', to: '#FFB800', ink: '#1F1300', soft: 'rgba(31,19,0,0.66)', accent: '#FF2E7E', deco: '#FFF3B0' },
};

function Deco({ k, w, h }: { k: PaletteKey; w: number; h: number }) {
  const p = PALETTES[k];
  const variant = Object.keys(PALETTES).indexOf(k) % 4;
  return (
    <Svg width={w} height={h} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id={`pg-${k}`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={p.from} /><Stop offset="1" stopColor={p.to} /></LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#pg-${k})`} />
      {variant === 0 ? (<><Circle cx={w * 0.92} cy={h * 0.08} r={w * 0.32} fill={p.deco} opacity={0.35} /><Circle cx={w * 0.05} cy={h * 0.95} r={w * 0.28} fill={p.deco} opacity={0.25} /></>) : null}
      {variant === 1 ? <Path d={`M0 ${h * 0.78} C ${w * 0.3} ${h * 0.7}, ${w * 0.6} ${h * 0.9}, ${w} ${h * 0.8} L ${w} ${h} L 0 ${h} Z`} fill={p.deco} opacity={0.35} /> : null}
      {variant === 2 ? Array.from({ length: 6 }, (_, i) => <Circle key={i} cx={w * (0.12 + i * 0.16)} cy={h * 0.1 + (i % 2) * 18} r={5} fill={p.deco} opacity={0.6} />) : null}
      {variant === 3 ? <Path d={`M ${w * 0.75} 0 L ${w} 0 L ${w} ${h * 0.35} Z M 0 ${h * 0.7} L ${w * 0.25} ${h} L 0 ${h} Z`} fill={p.deco} opacity={0.35} /> : null}
      {/* sparkles */}
      <Path d={`M ${w * 0.85} ${h * 0.55} l 4 10 l 10 4 l -10 4 l -4 10 l -4 -10 l -10 -4 l 10 -4 Z`} fill={p.ink} opacity={0.5} />
      <Path d={`M ${w * 0.12} ${h * 0.4} l 3 7 l 7 3 l -7 3 l -3 7 l -3 -7 l -7 -3 l 7 -3 Z`} fill={p.ink} opacity={0.35} />
    </Svg>
  );
}

/** A poster: palette background, decoration, BruhMe header and footer. Children are the content. */
export function Poster({ palette, width = 340, height = 560, label, children, style }: { palette: PaletteKey; width?: number; height?: number; label?: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = PALETTES[palette];
  return (
    <View style={[{ width, height, borderRadius: 32, overflow: 'hidden' }, style]}>
      <Deco k={palette} w={width} h={height} />
      <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <BrandMark size={26} />
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 17, color: p.ink }}>Bruh<Text style={{ fontFamily: fonts.brandBlack, fontSize: 17, color: palette === 'midnight' ? '#FF8106' : p.ink }}>Me</Text></Text>
          </View>
          {label ? <View style={{ borderWidth: 1.5, borderColor: p.soft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}><Text style={{ fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2, color: p.ink }}>{label.toUpperCase()}</Text></View> : null}
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>{children}</View>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: p.soft, textAlign: 'center' }}>made with BruhMe · bro, pay me back</Text>
      </View>
    </View>
  );
}

/** Huge headline text sized for posters. */
export const Big = ({ children, color, size = 48 }: { children: React.ReactNode; color: string; size?: number }) => (
  <Text style={{ fontFamily: fonts.brandBlack, fontSize: size, lineHeight: size * 1.08, color, letterSpacing: -size * 0.03 }} adjustsFontSizeToFit numberOfLines={3}>{children}</Text>
);

/** A big emoji that never gets clipped (explicit line height and padding). */
export const Hero = ({ e, size = 72 }: { e: string; size?: number }) => (
  <Text style={{ fontSize: size, lineHeight: size * 1.25, paddingTop: size * 0.05, includeFontPadding: false }}>{e}</Text>
);
