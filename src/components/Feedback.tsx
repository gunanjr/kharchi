import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Text, Divider as UiDivider } from './ui';
import { Emblem } from './Emblem';
import { reportCrash } from '@/features/feedback/appInfo';
import { easeOut } from '@/theme/motion';
import { layout, radius, space } from '@/theme/tokens';
import type { GlyphName } from './glyphs';

export const Divider = UiDivider;

/** Breathing placeholder sized like the content it stands in for. Prefer it to a spinner. */
export function Skeleton({ h = 16, w = '100%', r = 8 }: { h?: number; w?: number | `${number}%`; r?: number }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (!reduce) o.value = withRepeat(withSequence(withTiming(0.5, { duration: 900, easing: easeOut }), withTiming(1, { duration: 900, easing: easeOut })), -1);
  }, [o, reduce]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View accessibilityLabel="Loading" style={[{ height: h, width: w, borderRadius: r, backgroundColor: colors.skeleton }, st]} />;
}

export function SkeletonList({ n = 5 }: { n?: number }) {
  return (
    <View style={{ gap: space.lg, paddingHorizontal: layout.gutter, paddingTop: space.md }}>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <Skeleton h={46} w={46} r={16} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton h={14} w="55%" />
            <Skeleton h={12} w="32%" />
          </View>
          <Skeleton h={16} w={64} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonCard({ h = 160 }: { h?: number }) {
  return <View style={{ marginHorizontal: layout.gutter }}><Skeleton h={h} r={radius.lg} /></View>;
}

type Art = 'wallet' | 'group' | 'chart' | 'inbox' | 'chat';
const ART: Record<Art, GlyphName> = { wallet: 'wallet-outline', group: 'people-outline', chart: 'stats-chart-outline', inbox: 'file-tray-outline', chat: 'chatbubble-ellipses-outline' };

/** Kept for existing call sites: now an emblem (icon tile in soft rings) instead of a drawing. */
export function Illustration({ kind, size = 132 }: { kind: Art; size?: number }) {
  return <Emblem glyph={ART[kind]} size={size} />;
}

export function EmptyState({ art, title, body, action, onAction }: {
  art: Art; title: string; body: string; action?: string; onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xxl, paddingHorizontal: layout.gutter + 8, gap: space.sm }}>
      <Emblem glyph={ART[art]} size={152} />
      <Text v="h2" style={{ textAlign: 'center', marginTop: space.sm }}>{title}</Text>
      <Text v="body" color={colors.textMuted} style={{ textAlign: 'center', maxWidth: 320 }}>{body}</Text>
      {action && onAction ? <Button title={action} onPress={onAction} style={{ marginTop: space.lg, alignSelf: 'center' }} /> : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ padding: layout.gutter, gap: space.sm, alignItems: 'center' }} accessibilityRole="alert">
      <Emblem glyph="alert-circle-outline" size={120} />
      <Text v="h2">Something went wrong</Text>
      <Text v="body" color={colors.textMuted} style={{ textAlign: 'center' }}>Your entries are safe on this phone. Try again, and if it keeps happening please tell us.</Text>
      <Text v="small" color={colors.textSubtle} style={{ textAlign: 'center' }} numberOfLines={3}>{error.message}</Text>
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
        {onRetry ? <Button title="Try again" kind="secondary" onPress={onRetry} /> : null}
        <Button title="Send report" kind="ghost" onPress={() => reportCrash(error)} />
      </View>
    </View>
  );
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) return <ErrorState error={this.state.error} onRetry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}
