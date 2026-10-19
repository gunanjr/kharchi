import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { smoothPath } from '@/lib/curve';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { Text, Row } from './ui';
import { useTheme } from '@/theme/ThemeProvider';
import { chartColors, space, fonts, toneOf } from '@/theme/tokens';
import { formatMoney } from '@/domain/money';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface Slice { label: string; value: number; color?: string }

/** Donut with centre total. Slices animate in; legend is real text (screen-reader friendly). */
export function Donut({ slices, currency = 'INR', size = 190, centerLabel }: { slices: Slice[]; currency?: string; size?: number; centerLabel?: string }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const total = slices.reduce((a, s) => a + s.value, 0);
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => { p.value = reduce ? 1 : withTiming(1, { duration: 900, easing: Easing.bezier(0.23, 1, 0.32, 1) }); }, [p, reduce, total]);
  const sw = 18;
  const r = size / 2 - sw;
  const C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <View accessible accessibilityLabel={`Spending breakdown. ${slices.map((s) => `${s.label} ${Math.round((s.value / Math.max(1, total)) * 100)} percent`).join(', ')}`} style={{ alignItems: 'center', gap: space.md }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceAlt} strokeWidth={sw} fill="none" />
          {total > 0 && slices.map((s, i) => {
            const len = (s.value / total) * C;
            const start = offset;
            offset += len;
            return <DonutArc key={s.label + i} cx={size / 2} cy={size / 2} r={r} sw={sw} len={len} start={start} C={C} color={toneOf(s.color) === s.color || !s.color ? (s.color ?? chartColors[i % chartColors.length]) : toneOf(s.color)} p={p} />;
          })}
        </Svg>
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
          <Text v="caps" color={colors.textMuted}>{(centerLabel ?? 'TOTAL').toUpperCase()}</Text>
          <Text v="h2" style={{ fontVariant: ['tabular-nums'], textAlign: 'center' }}>{formatMoney(total, currency, { compact: true })}</Text>
        </View>
      </View>
      <View style={{ alignSelf: 'stretch', gap: 6 }}>
        {slices.slice(0, 6).map((s, i) => (
          <Row key={s.label + i} style={{ justifyContent: 'space-between' }}>
            <Row style={{ gap: 8, flex: 1 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: toneOf(s.color) ?? chartColors[i % chartColors.length] }} />
              <Text v="small" numberOfLines={1} style={{ flex: 1 }}>{s.label}</Text>
            </Row>
            <Text v="small" color={colors.textMuted} style={{ fontVariant: ['tabular-nums'] }}>{formatMoney(s.value, currency, { compact: true })} · {Math.round((s.value / Math.max(1, total)) * 100)}%</Text>
          </Row>
        ))}
      </View>
    </View>
  );
}

function DonutArc({ cx, cy, r, sw, len, start, C, color, p }: { cx: number; cy: number; r: number; sw: number; len: number; start: number; C: number; color: string; p: { value: number } }) {
  const props = useAnimatedProps(() => ({ strokeDasharray: [Math.max(0.01, len * p.value - 7), C] as unknown as string, strokeDashoffset: -(start + 3.5) }));
  return <AnimatedCircle cx={cx} cy={cy} r={r} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" animatedProps={props} />;
}

/** Horizontal bars with labels and values. */
export function BarList({ rows, currency = 'INR' }: { rows: { label: string; value: number; color?: string }[]; currency?: string }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <Text color={colors.textMuted}>Nothing to show yet.</Text>;
  return (
    <View style={{ gap: space.sm }}>
      {rows.slice(0, 8).map((r, i) => (
        <View key={r.label + i} style={{ gap: 4 }} accessible accessibilityLabel={`${r.label}, ${formatMoney(r.value, currency)}`}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text v="small" numberOfLines={1} style={{ flex: 1 }}>{r.label}</Text>
            <Text v="small" style={{ fontVariant: ['tabular-nums'] }}>{formatMoney(r.value, currency, { compact: true })}</Text>
          </Row>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.track }}>
            <View style={{ width: `${(r.value / max) * 100}%`, height: 10, borderRadius: 5, backgroundColor: r.color ? toneOf(r.color) : chartColors[i % chartColors.length] }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Grouped vertical bars (e.g. income vs expense per month). */
export function GroupedBars({ data, series, currency = 'INR', height = 150 }: {
  data: { label: string; values: number[] }[]; series: { name: string; color: string }[]; currency?: string; height?: number;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const w = width - space.lg * 4;
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  const gw = w / Math.max(1, data.length);
  const bw = Math.min(26, (gw - 12) / series.length);
  return (
    <View accessible accessibilityLabel={`Chart. ${data.map((d) => `${d.label}: ${series.map((s, i) => `${s.name} ${formatMoney(d.values[i], currency, { compact: true })}`).join(', ')}`).join('. ')}`}>
      <Svg width={w} height={height + 24}>
        <Line x1={0} x2={w} y1={height} y2={height} stroke={colors.border} strokeWidth={1} strokeDasharray="2 5" />
        {data.map((d, gi) => (
          <G key={d.label}>
            {d.values.map((v, si) => {
              const h = (v / max) * (height - 8);
              return <Rect key={si} x={gi * gw + (gw - bw * series.length) / 2 + si * bw} y={height - h} width={bw - 3} height={Math.max(h, v > 0 ? 2 : 0)} rx={Math.min(8, (bw - 3) / 2)} fill={series[si].color} />;
            })}
            <SvgText x={gi * gw + gw / 2} y={height + 16} fontSize={11} fill={colors.textMuted} textAnchor="middle" fontFamily={fonts.medium}>{d.label}</SvgText>
          </G>
        ))}
      </Svg>
      <Row style={{ gap: space.md }}>{series.map((s) => <Row key={s.name} style={{ gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} /><Text v="small">{s.name}</Text></Row>)}</Row>
    </View>
  );
}

/** Line/area chart for a cumulative series with an optional projected tail. */
export function LineArea({ actual, projected = [], height = 130, color }: { actual: number[]; projected?: number[]; height?: number; color?: string }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const w = width - space.lg * 4;
  const all = [...actual, ...projected];
  const max = Math.max(1, ...all);
  const n = Math.max(2, all.length);
  const x = (i: number) => (i / (n - 1)) * w;
  const y = (v: number) => height - (v / max) * (height - 10) - 2;
  const path = (arr: number[], offset = 0) => smoothPath(arr.map((v, i) => ({ x: x(i + offset), y: y(v) })));
  const c = color ?? colors.primary;
  const lastX = x(Math.max(0, actual.length - 1));
  const lastY = y(actual[actual.length - 1] ?? 0);
  return (
    <Svg width={w} height={height} accessibilityLabel="Cumulative spending this month with projection">
      <Defs>
        <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c} stopOpacity={0.34} />
          <Stop offset="1" stopColor={c} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {actual.length > 1 && <Path d={`${path(actual)} L${x(actual.length - 1)},${height} L0,${height} Z`} fill="url(#area)" />}
      {projected.length > 0 && <Path d={path([actual[actual.length - 1] ?? 0, ...projected], Math.max(0, actual.length - 1))} stroke={colors.textSubtle} strokeWidth={2} strokeDasharray="2 6" fill="none" strokeLinecap="round" />}
      {actual.length > 1 && <Path d={path(actual)} stroke={c} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      {actual.length > 1 && (
        <G>
          <Circle cx={lastX} cy={lastY} r={9} fill={c} opacity={0.22} />
          <Circle cx={lastX} cy={lastY} r={5} fill={colors.surface} stroke={c} strokeWidth={3} />
        </G>
      )}
    </Svg>
  );
}

/** Calendar heatmap of daily spend: 7 rows (Mon..Sun) x weeks. */
export function Heatmap({ days }: { days: { date: number; value: number }[] }) {
  const { colors, dark } = useTheme();
  if (!days.length) return null;
  const max = Math.max(1, ...days.map((d) => d.value));
  const first = new Date(days[0].date);
  const lead = (first.getDay() + 6) % 7;
  const cells: ({ date: number; value: number } | null)[] = [...Array(lead).fill(null), ...days];
  const weeks = Math.ceil(cells.length / 7);
  const cell = 14;
  const gap = 4;
  const base = dark ? '245,179,58' : '240,163,27';
  const deep = dark ? '255,226,160' : '28,26,34';
  return (
    <View accessible accessibilityLabel={`Daily spending heatmap. Highest day ${formatMoney(max, 'INR', { compact: true })}`}>
      <Svg width={weeks * (cell + gap)} height={7 * (cell + gap)}>
        {cells.map((c, i) => {
          const col = Math.floor(i / 7);
          const row = i % 7;
          const a = c ? 0.12 + 0.88 * (c.value / max) : 0;
          return <Rect key={i} x={col * (cell + gap)} y={row * (cell + gap)} width={cell} height={cell} rx={5} fill={c ? (c.value === 0 ? colors.track : a > 0.72 ? `rgba(${deep},${(0.55 + 0.45 * (a - 0.72) / 0.28).toFixed(2)})` : `rgba(${base},${(0.25 + a).toFixed(2)})`) : 'transparent'} />;
        })}
      </Svg>
    </View>
  );
}

export function Sparkline({ values, color, width = 80, height = 28 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...values);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${(i / Math.max(1, values.length - 1)) * width},${height - (v / max) * (height - 4) - 2}`).join(' ');
  return <Svg width={width} height={height}><Path d={d} stroke={color ?? colors.primary} strokeWidth={2} fill="none" strokeLinecap="round" /></Svg>;
}

/** Circular progress with the content in the middle; the arc eases in. */
export function ProgressRing({ pct, size = 64, stroke = 7, color, track, children }: { pct: number; size?: number; stroke?: number; color?: string; track?: string; children?: React.ReactNode }) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => { p.value = reduce ? 1 : withTiming(1, { duration: 800, easing: Easing.bezier(0.23, 1, 0.32, 1) }); }, [p, reduce, pct]);
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const props = useAnimatedProps(() => ({ strokeDasharray: [Math.max(0.01, (C * Math.min(100, pct)) / 100 * p.value), C] as unknown as string }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={`${Math.round(pct)} percent`}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? colors.track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color ?? colors.primary} strokeWidth={stroke} fill="none" strokeLinecap="round" animatedProps={props} />
      </Svg>
      {children}
    </View>
  );
}



