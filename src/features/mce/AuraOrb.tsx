import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { Text } from '@/components/ui';
import { fonts } from '@/theme/tokens';

const AURAS: Record<string, [string, string, string]> = {
  npc: ['#B9C0CB', '#7D8796', '#E6E9EE'],
  side: ['#7FD3FF', '#3D7BFF', '#CDEBFF'],
  support: ['#5BF0B8', '#0CA678', '#C8FBE6'],
  main: ['#FFB547', '#FF2E7E', '#FFE0B8'],
  armor: ['#B57BFF', '#4B1FD1', '#E5D4FF'],
  boss: ['#FFE14D', '#FF2E7E', '#FFF6C2'],
};
export const auraColors = (rank: string) => AURAS[rank] ?? AURAS.npc;

/** The glowing aura: a slowly turning gradient ring with a soft pulse, the rank emoji and the score in the middle. */
export function AuraOrb({ rank, score, emoji, size = 220 }: { rank: string; score: number; emoji: string; size?: number }) {
  const reduce = useReducedMotion();
  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    spin.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduce, spin, pulse]);
  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const glow = useAnimatedStyle(() => ({ opacity: 0.45 + pulse.value * 0.35, transform: [{ scale: 1 + pulse.value * 0.06 }] }));
  const [a, b, light] = auraColors(rank);
  const r = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute' }, glow]}>
        <Svg width={size} height={size}>
          <Defs><RadialGradient id={`glow-${rank}`} cx="50%" cy="50%" r="50%"><Stop offset="0.55" stopColor={a} stopOpacity="0.55" /><Stop offset="1" stopColor={b} stopOpacity="0" /></RadialGradient></Defs>
          <Circle cx={r} cy={r} r={r} fill={`url(#glow-${rank})`} />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute' }, ring]}>
        <Svg width={size * 0.82} height={size * 0.82}>
          <Defs><LinearGradient id={`ring-${rank}`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={a} /><Stop offset="0.5" stopColor={light} /><Stop offset="1" stopColor={b} /></LinearGradient></Defs>
          <Circle cx={size * 0.41} cy={size * 0.41} r={size * 0.36} stroke={`url(#ring-${rank})`} strokeWidth={size * 0.06} fill="none" strokeDasharray={`${size * 0.9} ${size * 0.12}`} strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <View style={{ width: size * 0.58, height: size * 0.58, borderRadius: size, backgroundColor: '#14181F', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: size * 0.16, lineHeight: size * 0.2 }}>{emoji}</Text>
        <Text style={{ fontFamily: fonts.brandBlack, fontSize: size * 0.17, lineHeight: size * 0.2, color: '#FFFFFF' }}>{score}</Text>
        <Text style={{ fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.4, color: light }}>AURA</Text>
      </View>
    </View>
  );
}
