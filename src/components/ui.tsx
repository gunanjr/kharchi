import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text as RNText, TextInput, View,
  type LayoutChangeEvent, type StyleProp, type TextProps, type TextStyle, type ViewStyle, type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, motion, radius, space, type as T } from '@/theme/tokens';
import { easeOut, enterUp } from '@/theme/motion';
import { haptic } from '@/lib/haptics';
import { formatMoney } from '@/domain/money';
import { useSettings } from '@/store/settings';
import { Glyph, Icon, type IconName } from './Icon';
import type { GlyphName } from './glyphs';

type Variant = keyof typeof T;

/* ------------------------------------------------------------------ text */

export function Text({ v = 'body', color, style, ...p }: TextProps & { v?: Variant; color?: string; style?: StyleProp<TextStyle> }) {
  const { colors } = useTheme();
  return <RNText {...p} style={[T[v], { color: color ?? colors.text }, style]} />;
}

/** Text with tabular figures so columns of money align and live values do not jitter. */
export function MoneyText({ children, v = 'money', color, style, ...p }: TextProps & { v?: Variant; color?: string }) {
  return (
    <Text v={v} color={color} style={[{ fontVariant: ['tabular-nums'] }, style]} {...p}>
      {children}
    </Text>
  );
}

const MONEY_SIZE = { hero: 46, xl: 34, lg: 26, md: 17, sm: 14 } as const;
export type MoneySize = keyof typeof MONEY_SIZE;

/**
 * Money, the hero of the interface: tabular figures, the paise quieter than the rupees, and an amount that always
 * fits its container (it shrinks to fit rather than overflowing).
 */
export function Money({ value, currency = 'INR', size = 'md', color, muted, style, compact, trimZeros, sign, text, align }: {
  value?: number; currency?: string; size?: MoneySize; color?: string; muted?: string; style?: StyleProp<TextStyle>;
  compact?: boolean; trimZeros?: boolean; sign?: boolean; text?: string; align?: 'left' | 'right' | 'center';
}) {
  const { colors } = useTheme();
  const hidden = useSettings((s) => s.hideAmounts);
  const str = hidden ? '₹ ••••' : (text ?? formatMoney(value ?? 0, currency, { compact, trimZeros, sign }));
  const m = compact ? null : str.match(/^(.*?)(\.\d+)$/);
  const base = MONEY_SIZE[size];
  const big = size === 'hero' || size === 'xl' || size === 'lg';
  const [w, setW] = useState(0);
  // Big figures shrink to fit the width they are given (about 0.6em per character); small ones are always short.
  const fit = big && w > 0 ? Math.min(1, w / (str.length * base * 0.6)) : 1;
  const fs = big ? Math.max(Math.round(base * 0.55), Math.floor(base * fit)) : base;
  const c = color ?? colors.text;
  const textNode = (
    <RNText
      numberOfLines={1}
      accessibilityLabel={str}
      style={[
        big ? T.moneyLg : T.money,
        { fontSize: fs, lineHeight: Math.round(fs * 1.16), color: c, fontVariant: ['tabular-nums'], textAlign: align ?? 'left', letterSpacing: -fs * 0.03 },
        size === 'hero' && { fontFamily: T.hero.fontFamily, letterSpacing: -fs * 0.035 },
        style,
      ]}
    >
      {m ? m[1] : str}
      {m ? <RNText style={{ color: muted ?? c, opacity: big ? 0.5 : 0.72 }}>{m[2]}</RNText> : null}
    </RNText>
  );
  if (!big) return textNode;
  return <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ width: '100%' }}>{textNode}</View>;
}

/* ------------------------------------------------------------ containers */

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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Press feedback used by everything tappable: a quick scale to 0.97, released with a strong ease-out. */
export function Press({
  children, onPress, style, scale = motion.scale, feedback = 'tap', disabled, accessibilityLabel, accessibilityRole = 'button', accessibilityState, hitSlop, onLongPress,
}: {
  children: React.ReactNode; onPress?: () => void; onLongPress?: () => void; style?: StyleProp<ViewStyle>; scale?: number; feedback?: 'tap' | 'light' | 'none';
  disabled?: boolean; accessibilityLabel?: string; accessibilityRole?: 'button' | 'link' | 'none'; accessibilityState?: object; hitSlop?: number;
}) {
  const reduce = useReducedMotion();
  const s = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole === 'none' ? undefined : accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      disabled={disabled}
      hitSlop={hitSlop}
      onLongPress={onLongPress}
      onPressIn={() => { if (!reduce) s.value = withTiming(scale, { duration: motion.press, easing: easeOut }); }}
      onPressOut={() => { if (!reduce) s.value = withTiming(1, { duration: motion.release, easing: easeOut }); }}
      onPress={onPress ? () => { if (feedback === 'tap') haptic.tap(); else if (feedback === 'light') haptic.light(); onPress(); } : undefined}
      style={[style, st]}
    >
      {children}
    </AnimatedPressable>
  );
}

/** Opaque white card with a hairline edge and a soft shadow. `tone="ink"` is the deep hero surface. */
export function Card({ children, style, onPress, accessibilityLabel, tone = 'surface', pad = true }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string; tone?: 'surface' | 'ink' | 'inset'; pad?: boolean;
}) {
  const { colors, shadows } = useTheme();
  const bg = tone === 'ink' ? colors.hero : tone === 'inset' ? colors.surfaceAlt : colors.surface;
  const base: StyleProp<ViewStyle> = [
    {
      backgroundColor: bg, borderRadius: radius.lg, padding: pad ? layout.cardPad : 0, borderCurve: 'continuous' as any,
      borderWidth: tone === 'ink' ? 0 : StyleSheet.hairlineWidth, borderColor: colors.border,
    },
    tone === 'surface' && shadows.card,
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return <Press accessibilityLabel={accessibilityLabel} onPress={onPress} style={base}>{children}</Press>;
}

export function Row({ children, style, ...rest }: React.ComponentProps<typeof View>) {
  return <View {...rest} style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md }, style]}>{children}</View>;
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: inset }} />;
}

/** Staggered entrance (a short rise and fade, strong ease-out). Collapses to nothing with reduce-motion. */
export function Enter({ i = 0, children, style }: { i?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  return <Animated.View style={style} entering={reduce ? undefined : enterUp(i)}>{children}</Animated.View>;
}

/* --------------------------------------------------------------- controls */

export function Button({
  title, onPress, kind = 'primary', loading, disabled, style, icon, accessibilityLabel, size = 'md',
}: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'; loading?: boolean;
  disabled?: boolean; style?: StyleProp<ViewStyle>; icon?: IconName; accessibilityLabel?: string; size?: 'md' | 'sm';
}) {
  const { colors } = useTheme();
  const bg = kind === 'primary' ? colors.ink : kind === 'accent' ? colors.primary : kind === 'danger' ? colors.expense : kind === 'secondary' ? colors.surface : 'transparent';
  const fg = kind === 'primary' ? colors.onInk : kind === 'accent' ? colors.onPrimary : kind === 'danger' ? '#FFFFFF' : kind === 'ghost' ? colors.link : colors.text;
  const h = size === 'sm' ? 40 : 52;
  return (
    <Press
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      feedback="light"
      onPress={onPress}
      style={[
        {
          minHeight: h, borderRadius: radius.pill, paddingHorizontal: size === 'sm' ? space.lg : space.xl, backgroundColor: bg,
          alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space.sm, opacity: disabled ? 0.4 : 1,
          borderWidth: kind === 'secondary' ? StyleSheet.hairlineWidth : 0, borderColor: colors.border,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : null}
      {icon && !loading ? <Icon name={icon} color={fg} size={size === 'sm' ? 16 : 18} /> : null}
      <Text v={size === 'sm' ? 'small' : 'title'} color={fg} style={size === 'sm' ? { fontFamily: T.title.fontFamily } : undefined}>{title}</Text>
    </Press>
  );
}

export function Chip({ label, selected, onPress, leading, glyph, color }: {
  label: string; selected?: boolean; onPress?: () => void; leading?: React.ReactNode; glyph?: GlyphName; color?: string;
}) {
  const { colors } = useTheme();
  const fg = selected ? colors.onInk : colors.text;
  const inner = (
    <>
      {leading ?? (glyph ? <Glyph name={glyph} size={16} color={selected ? colors.onInk : color ?? colors.textMuted} /> : null)}
      {label ? <Text v="small" color={fg}>{label}</Text> : null}
    </>
  );
  const st: ViewStyle = {
    minHeight: 40, paddingHorizontal: label ? space.lg : space.md, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: selected ? colors.ink : colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: selected ? colors.ink : colors.border,
  };
  if (!onPress) return <View style={st}>{inner}</View>;
  return <Press accessibilityState={{ selected: !!selected }} onPress={onPress} style={st}>{inner}</Press>;
}

export function Field({ label, style, onFocus, onBlur, ...p }: TextInputProps & { label?: string }) {
  const { colors } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text v="caps" color={colors.textMuted}>{label.toUpperCase()}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textSubtle}
        selectionColor={colors.primary}
        {...p}
        onFocus={(e) => { setFocus(true); onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); onBlur?.(e); }}
        style={[
          T.body,
          {
            color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderCurve: 'continuous' as any, minHeight: 52, paddingHorizontal: space.lg,
            borderWidth: 1.5, borderColor: focus ? colors.ink : 'transparent', outlineStyle: 'none' as any,
          },
          style,
        ]}
      />
    </View>
  );
}

/** A compact two-to-four way switch with a sliding ink thumb. */
export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const reduce = useReducedMotion();
  const idx = Math.max(0, options.findIndex((o) => o.key === value));
  const x = useSharedValue(0);
  const seg = w > 0 ? (w - 8) / options.length : 0;
  useEffect(() => { x.value = reduce ? idx * seg : withTiming(idx * seg, { duration: motion.base, easing: easeOut }); }, [idx, seg, reduce, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4 }}>
      {seg > 0 ? <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 4, top: 4, bottom: 4, width: seg, borderRadius: radius.pill, backgroundColor: colors.ink }, thumb]} /> : null}
      {options.map((o) => (
        <Pressable key={o.key} accessibilityRole="button" accessibilityState={{ selected: o.key === value }} onPress={() => { if (o.key !== value) { haptic.tap(); onChange(o.key); } }} style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Text v="small" color={o.key === value ? colors.onInk : colors.textMuted} numberOfLines={1}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ---------------------------------------------------------- small pieces */

/** The signature icon tile: a continuous-corner square, tinted, holding one line icon. */
export function IconTile({ glyph, color, size = 44, tone = 'soft', icon, children }: {
  glyph?: GlyphName; icon?: IconName; color?: string; size?: number; tone?: 'soft' | 'solid' | 'ink' | 'plain'; children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const c = color ?? colors.text;
  // Quiet by default: a neutral plate with a hairline and a single-colour glyph. Colour is kept for meaning (the category
  // tone on the glyph), not painted as a pastel block behind every icon.
  const bg = tone === 'solid' ? c : tone === 'ink' ? colors.ink : colors.surfaceAlt;
  const fg = tone === 'solid' ? (c === colors.primary ? colors.onPrimary : '#FFFFFF') : tone === 'ink' ? colors.onInk : tone === 'plain' ? colors.text : c;
  const ic = Math.round(size * 0.5);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, borderCurve: 'continuous' as any, backgroundColor: bg, borderWidth: tone === 'soft' || tone === 'plain' ? StyleSheet.hairlineWidth : 0, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
      {children ?? (glyph ? <Glyph name={glyph} size={ic} color={fg} /> : icon ? <Icon name={icon} size={ic} color={fg} /> : null)}
    </View>
  );
}

/** Darken a #rrggbb colour toward black (used so an icon stays legible on its own pale tint). */
/** A tappable icon tile for pickers: ink ring when selected. */
export function GlyphPick({ glyph, selected, onPress, color, label }: { glyph: GlyphName; selected?: boolean; onPress: () => void; color?: string; label: string }) {
  const { colors } = useTheme();
  return (
    <Press accessibilityLabel={label} accessibilityState={{ selected: !!selected }} onPress={onPress} feedback="light" style={{ width: 52, height: 52, borderRadius: 18, borderCurve: 'continuous' as any, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.ink : colors.surfaceAlt, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
      <Glyph name={glyph} size={22} color={selected ? colors.onInk : color ?? colors.text} />
    </Press>
  );
}

/** Round colour swatch for pickers; selected shows an ink ring and a check. */
export function Swatch({ color, selected, onPress }: { color: string; selected?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Press accessibilityLabel="Colour" accessibilityState={{ selected: !!selected }} onPress={onPress} feedback="light" style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: selected ? colors.ink : 'transparent' }}>
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        {selected ? <Icon name="check" size={16} color="#fff" /> : null}
      </View>
    </Press>
  );
}

export function shade(hex: string, amt: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.round(v * (1 - amt)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
}

export function Tag({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'income' | 'expense' | 'warn' | 'primary' | 'ink' }) {
  const { colors } = useTheme();
  const map = {
    neutral: [colors.track, colors.textMuted], income: [colors.incomeSoft, colors.income], expense: [colors.expenseSoft, colors.expense],
    warn: [colors.warnSoft, colors.warn], primary: [colors.primarySoft, colors.link], ink: [colors.ink, colors.onInk],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text v="caps" color={fg}>{label.toUpperCase()}</Text>
    </View>
  );
}

export function SectionHeader({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <Row style={[{ justifyContent: 'space-between', minHeight: 32 }, style]}>
      <Text v="h3" accessibilityRole="header">{title}</Text>
      {action && onAction ? (
        <Press accessibilityRole="link" onPress={onAction} hitSlop={10} scale={0.96}>
          <Text v="small" color={colors.link}>{action}</Text>
        </Press>
      ) : null}
    </Row>
  );
}

export function ProgressBar({ value, color, height = 8, over }: { value: number; color?: string; height?: number; over?: boolean }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  const target = Math.max(0, Math.min(1, value));
  useEffect(() => { p.value = reduce ? target : withTiming(target, { duration: motion.slow + 200, easing: easeOut }); }, [target, reduce, p]);
  const st = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: colors.track, overflow: 'hidden' }}>
      <Animated.View style={[{ height, borderRadius: height / 2, backgroundColor: over ? colors.expense : color ?? colors.primary }, st]} />
    </View>
  );
}

/** One row of a settings list: optional leading tile, title and subtitle, trailing control or chevron. */
export function ListRow({ title, sub, leading, right, onPress, chevron, accessibilityLabel }: {
  title: string; sub?: string; leading?: React.ReactNode; right?: React.ReactNode; onPress?: () => void; chevron?: boolean; accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const body = (
    <>
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text v="title" numberOfLines={2}>{title}</Text>
        {sub ? <Text v="small" color={colors.textMuted} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {right ?? (onPress || chevron ? <Icon name="chevron" color={colors.textSubtle} size={18} /> : null)}
    </>
  );
  const st: ViewStyle = { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm };
  if (!onPress) return <View style={st}>{body}</View>;
  return <Press accessibilityLabel={accessibilityLabel ?? title} scale={0.985} onPress={onPress} style={st}>{body}</Press>;
}

/** Several rows in one card with hairline separators between them. */
export function Group({ title, children, style }: { title?: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const kids = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: space.sm }}>
      {title ? <Text v="caps" color={colors.textMuted} style={{ paddingHorizontal: 4 }}>{title.toUpperCase()}</Text> : null}
      <Card pad={false} style={[{ paddingHorizontal: layout.cardPad - 4 }, style]}>
        {kids.map((k, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <Divider /> : null}
            {k}
          </React.Fragment>
        ))}
      </Card>
    </View>
  );
}

/* ------------------------------------------------------------ page chrome */

export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: layout.gutter, paddingTop: space.lg, paddingBottom: space.md, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md }}>
      <View style={{ flex: 1 }}>
        {subtitle ? <Text v="caps" color={colors.textMuted} style={{ marginBottom: 4 }}>{subtitle.toUpperCase()}</Text> : null}
        <Text v="h1" accessibilityRole="header">{title}</Text>
      </View>
      {right}
    </View>
  );
}

/** A round hairline icon button (back, close, add). */
export function RoundButton({ icon, onPress, label, tone = 'surface', size = 44 }: { icon: IconName; onPress: () => void; label: string; tone?: 'surface' | 'ink' | 'primary'; size?: number }) {
  const { colors } = useTheme();
  const bg = tone === 'ink' ? colors.ink : tone === 'primary' ? colors.primary : colors.surface;
  const fg = tone === 'ink' ? colors.onInk : tone === 'primary' ? colors.onPrimary : colors.text;
  return (
    <Press accessibilityLabel={label} onPress={onPress} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: tone === 'surface' ? StyleSheet.hairlineWidth : 0, borderColor: colors.border }}>
      <Icon name={icon} color={fg} size={Math.round(size * 0.46)} />
    </Press>
  );
}

/** Standard pushed-screen chrome: a round back button and the title. */
export function SubScreen({ title, children, right, scroll = true }: { title: string; children: React.ReactNode; right?: React.ReactNode; scroll?: boolean }) {
  const router = useRouter();
  const Body = scroll ? ScrollView : View;
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: layout.gutter, paddingTop: space.sm, paddingBottom: space.md, minHeight: 64 }}>
        <RoundButton icon="back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Text v="h2" accessibilityRole="header" style={{ flex: 1 }} numberOfLines={1}>{title}</Text>
        {right}
      </View>
      <Body {...(scroll ? { contentContainerStyle: { paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: layout.gap, paddingBottom: 96 }, keyboardShouldPersistTaps: 'handled', showsVerticalScrollIndicator: false } : { style: { flex: 1 } })}>{children}</Body>
    </Screen>
  );
}
