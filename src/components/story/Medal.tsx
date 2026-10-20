import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Tier } from '@/features/wrapped/badges';

const TIERS: Record<Tier, { rim: [string, string]; face: [string, string]; ribbon: string }> = {
  0: { rim: ['#D9D6D1', '#B9B5AE'], face: ['#EEEBE6', '#DCD8D1'], ribbon: '#C9C4BC' },
  1: { rim: ['#F0A868', '#B4622A'], face: ['#E58E4C', '#A9541C'], ribbon: '#C9692E' },
  2: { rim: ['#F4F6FA', '#9AA4B5'], face: ['#D5DCE8', '#8F9BB0'], ribbon: '#7C8AA3' },
  3: { rim: ['#FFE68A', '#E0A400'], face: ['#FFCF33', '#E59A00'], ribbon: '#FF8106' },
  4: { rim: ['#FF9AE0', '#7B4DFF'], face: ['#B57BFF', '#4B1FD1'], ribbon: '#FF2E7E' },
};

/** A medal: ribbon tails, a flat rim and face, and a white glyph. Tier 0 is a quiet locked medal. */
export function Medal({ tier, icon, size = 72 }: { tier: Tier; icon: string; size?: number }) {
  const t = TIERS[tier];
  return (
    <View style={{ width: size, height: size * 1.12, alignItems: 'center' }}>
      <Svg width={size} height={size * 1.12} viewBox="0 0 100 112" style={{ position: 'absolute' }}>
        <Path d="M30 70 L22 110 L38 100 L46 112 L50 74 Z" fill={t.ribbon} opacity={tier ? 1 : 0.6} />
        <Path d="M70 70 L78 110 L62 100 L54 112 L50 74 Z" fill={t.ribbon} opacity={tier ? 0.85 : 0.5} />
        <Circle cx={50} cy={46} r={44} fill={t.rim[1]} />
        <Circle cx={50} cy={46} r={35} fill={t.face[0]} />
      </Svg>
      <View style={{ position: 'absolute', top: size * 0.41 - size * 0.17, width: size, alignItems: 'center' }}>
        <Ionicons name={(tier ? icon : 'lock-closed') as never} size={size * 0.34} color={tier ? '#FFFFFF' : '#A29D95'} />
      </View>
    </View>
  );
}
