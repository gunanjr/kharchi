import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect, G } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Text } from './ui';
import { radius, space } from '@/theme/tokens';

export function Skeleton({ h = 16, w = '100%', r = 8 }: { h?: number; w?: number | `${number}%`; r?: number }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (!reduce) o.value = withRepeat(withTiming(0.45, { duration: 800 }), -1, true);
  }, [o, reduce]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View accessibilityLabel="Loading" style={[{ height: h, width: w, borderRadius: r, backgroundColor: colors.skeleton }, st]} />;
}

export function SkeletonList({ n = 5 }: { n?: number }) {
  return (
    <View style={{ gap: space.md, padding: space.lg }}>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <Skeleton h={44} w={44} r={22} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton h={14} w="60%" />
            <Skeleton h={12} w="35%" />
          </View>
          <Skeleton h={16} w={60} />
        </View>
      ))}
    </View>
  );
}

type Art = 'wallet' | 'group' | 'chart' | 'inbox' | 'chat';

export function Illustration({ kind, size = 132 }: { kind: Art; size?: number }) {
  const { colors } = useTheme();
  const c1 = colors.primary, c2 = colors.accent, c3 = colors.primarySoft, ink = colors.text;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx="60" cy="62" r="50" fill={c3} />
      {kind === 'wallet' && (
        <G>
          <Rect x="24" y="38" width="72" height="50" rx="10" fill={c1} />
          <Rect x="24" y="38" width="72" height="14" rx="7" fill={ink} opacity={0.18} />
          <Rect x="70" y="58" width="30" height="18" rx="9" fill={colors.surface} />
          <Circle cx="80" cy="67" r="4" fill={c2} />
        </G>
      )}
      {kind === 'group' && (
        <G>
          <Circle cx="40" cy="55" r="12" fill={c1} />
          <Circle cx="80" cy="55" r="12" fill={c2} />
          <Circle cx="60" cy="48" r="14" fill={ink} opacity={0.85} />
          <Path d="M20 92c2-16 12-22 20-22s14 4 20 4 12-4 20-4 18 6 20 22z" fill={c1} opacity={0.75} />
        </G>
      )}
      {kind === 'chart' && (
        <G>
          <Rect x="26" y="62" width="14" height="28" rx="4" fill={c2} />
          <Rect x="46" y="46" width="14" height="44" rx="4" fill={c1} />
          <Rect x="66" y="54" width="14" height="36" rx="4" fill={c2} />
          <Rect x="86" y="34" width="14" height="56" rx="4" fill={c1} />
        </G>
      )}
      {kind === 'inbox' && (
        <G>
          <Path d="M24 64l12-24h48l12 24v22a6 6 0 01-6 6H30a6 6 0 01-6-6z" fill={c1} />
          <Path d="M24 64h26a10 10 0 0020 0h26" stroke={colors.surface} strokeWidth="4" fill="none" />
          <Circle cx="60" cy="30" r="7" fill={c2} />
        </G>
      )}
      {kind === 'chat' && (
        <G>
          <Rect x="24" y="34" width="62" height="40" rx="14" fill={c1} />
          <Path d="M40 74l-8 14 22-14z" fill={c1} />
          <Rect x="52" y="56" width="44" height="30" rx="12" fill={c2} />
          <Circle cx="64" cy="71" r="2.5" fill="#fff" />
          <Circle cx="74" cy="71" r="2.5" fill="#fff" />
          <Circle cx="84" cy="71" r="2.5" fill="#fff" />
        </G>
      )}
    </Svg>
  );
}

export function EmptyState({ art, title, body, action, onAction }: {
  art: Art; title: string; body: string; action?: string; onAction?: () => void;
}) {
  return (
    <View style={{ alignItems: 'center', padding: space.xxl, gap: space.md }}>
      <Illustration kind={art} />
      <Text v="h2" style={{ textAlign: 'center' }}>{title}</Text>
      <Text v="body" style={{ textAlign: 'center', opacity: 0.75 }}>{body}</Text>
      {action && onAction ? <Button title={action} onPress={onAction} style={{ marginTop: space.sm }} /> : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ padding: space.xl, gap: space.md, alignItems: 'center' }} accessibilityRole="alert">
      <Text style={{ fontSize: 34 }}>⚠️</Text>
      <Text v="h2">Something went wrong</Text>
      <Text v="small" color={colors.textMuted} style={{ textAlign: 'center' }}>{error.message}</Text>
      {onRetry ? <Button title="Try again" kind="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return <ErrorState error={this.state.error} onRetry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}

export const Divider = () => {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: radius.sm }} />;
};
