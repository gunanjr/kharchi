import React from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text as RNText, TextInput, View,
  type StyleProp, type TextProps, type TextStyle, type ViewStyle, type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { hit, radius, space, type as T, motion } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

import { useRouter } from 'expo-router';
import { Icon } from './Icon';

type Variant = keyof typeof T;

export function Text({ v = 'body', color, style, ...p }: TextProps & { v?: Variant; color?: string; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return <RNText {...p} style={[T[v], { color: color ?? colors.text }, style]} />;
}

/** Money text: tabular figures so columns align. */
export function MoneyText({ children, v = 'money', color, style, ...p }: TextProps & { v?: Variant; color?: string }) {
  return (
    <Text v={v} color={color} style={[{ fontVariant: ['tabular-nums'] }, style]} {...p}>
      {children}
    </Text>
  );
}

export function Screen({
  children, style, edges = ['top'],
}: { children: React.ReactNode; style?: StyleProp<ViewStyle>; edges?: ('top' | 'bottom' | 'left' | 'right')[] }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
      {children}
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const base: StyleProp<ViewStyle> = [
    { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => (haptic.tap(), onPress())}
      style={({ pressed }) => [base, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
    >
      {children}
    </Pressable>
  );
}

export function Button({
  title, onPress, kind = 'primary', loading, disabled, style, icon, accessibilityLabel,
}: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean;
  disabled?: boolean; style?: StyleProp<ViewStyle>; icon?: string; accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const bg = kind === 'primary' ? colors.primary : kind === 'danger' ? colors.danger : kind === 'secondary' ? colors.primarySoft : 'transparent';
  const fg = kind === 'primary' ? colors.onPrimary : kind === 'danger' ? '#fff' : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      onPress={() => (haptic.light(), onPress())}
      style={({ pressed }) => [
        { minHeight: hit, borderRadius: radius.pill, paddingHorizontal: space.xl, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space.sm, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : null}
      {icon ? <Text style={{ fontSize: 16 }}>{icon}</Text> : null}
      <Text v="title" color={fg}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon, color }: {
  label: string; selected?: boolean; onPress?: () => void; icon?: string; color?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => onPress && (haptic.tap(), onPress())}
      style={{
        minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: selected ? color ?? colors.primary : colors.surfaceAlt,
        borderWidth: 1, borderColor: selected ? color ?? colors.primary : colors.border,
      }}
    >
      {icon ? <Text style={{ fontSize: 15 }}>{icon}</Text> : null}
      <Text v="small" color={selected ? colors.onPrimary : colors.text}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, style, ...p }: TextInputProps & { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      {label ? <Text v="caps" color={colors.textMuted}>{label.toUpperCase()}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        {...p}
        style={[
          T.body,
          { color: colors.text, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, minHeight: hit, paddingHorizontal: space.md },
          style,
        ]}
      />
    </View>
  );
}

export function Row({ children, style, ...rest }: React.ComponentProps<typeof View>) {
  return <View {...rest} style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md }, style]}>{children}</View>;
}

/** Staggered entrance; collapses to no animation when reduce-motion is on. */
export function Enter({ i = 0, children, style }: { i?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  return (
    <Animated.View style={style} entering={reduce ? undefined : FadeInDown.delay(Math.min(i, 12) * motion.stagger).duration(motion.base).springify().damping(18)}>
      {children}
    </Animated.View>
  );
}

export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        {subtitle ? <Text v="caps" color={colors.textMuted}>{subtitle.toUpperCase()}</Text> : null}
        <Text v="h1" accessibilityRole="header">{title}</Text>
      </View>
      {right}
    </View>
  );
}

/** Standard pushed-screen chrome: back button + title. */
export function SubScreen({ title, children, right, scroll = true }: { title: string; children: React.ReactNode; right?: React.ReactNode; scroll?: boolean }) {
  const router = useRouter();
  const { colors } = useTheme();
  const Body = scroll ? require('react-native').ScrollView : View;
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, minHeight: 56 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ width: hit, height: hit, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" color={colors.text} />
        </Pressable>
        <Text v="h2" accessibilityRole="header" style={{ flex: 1 }} numberOfLines={1}>{title}</Text>
        {right}
      </View>
      <Body {...(scroll ? { contentContainerStyle: { padding: space.lg, gap: space.lg, paddingBottom: 80 }, keyboardShouldPersistTaps: 'handled' } : { style: { flex: 1 } })}>{children}</Body>
    </Screen>
  );
}
