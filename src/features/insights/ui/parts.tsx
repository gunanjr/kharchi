import React from 'react';
import { View } from 'react-native';
import { Text, Row, Money, IconTile, Press } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/** One rounded bar split into coloured segments (one per category). Segments below 2% still get a sliver so nothing vanishes. */
export function StackedBar({ parts, height = 14 }: { parts: { value: number; color: string }[]; height?: number }) {
  const { colors } = useTheme();
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (total <= 0) return <View style={{ height, borderRadius: height / 2, backgroundColor: colors.track }} />;
  return (
    <View style={{ flexDirection: 'row', height, gap: 3 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {parts.map((p, i) => (
        <View key={i} style={{ flex: Math.max(p.value / total, 0.02), backgroundColor: p.color, borderRadius: height / 2 }} />
      ))}
    </View>
  );
}

/** A ranked row: tile, name, share bar, amount and percent. Used for categories and places. */
export function RankedRow({ tile, name, sub, amount, pct, color, onPress }: { tile: React.ReactNode; name: string; sub?: string; amount: string; pct: number; color: string; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Press onPress={onPress} disabled={!onPress} scale={0.99} accessibilityLabel={`${name}, ${amount}, ${Math.round(pct * 100)} percent${onPress ? '. Opens the entries' : ''}`} style={{ gap: 8, paddingVertical: 10 }}>
      <Row style={{ gap: space.md }}>
        {tile}
        <View style={{ flex: 1 }}>
          <Text v="title" numberOfLines={1}>{name}</Text>
          {sub ? <Text v="small" color={colors.textMuted} numberOfLines={1}>{sub}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Money size="md" align="right" text={amount} />
          <Text v="small" color={colors.textMuted}>{Math.round(pct * 100)}%</Text>
        </View>
      </Row>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(2, Math.min(100, pct * 100))}%`, height: 6, borderRadius: 3, backgroundColor: color }} />
      </View>
    </Press>
  );
}

export const Initial = ({ name }: { name: string }) => {
  const { colors } = useTheme();
  return <IconTile size={40} tone="plain"><Text v="title" color={colors.link}>{(name[0] ?? '?').toUpperCase()}</Text></IconTile>;
};

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Seven bars, Sunday to Saturday. Tap a bar to read that day's average; the priciest day starts selected. */
export function WeekdayBars({ values, highlight, height = 96, format, full }: { values: number[]; highlight: number | null; height?: number; format: (n: number) => string; full: (n: number) => string }) {
  const { colors } = useTheme();
  const [sel, setSel] = React.useState<number | null>(null);
  const on = sel ?? highlight;
  const max = Math.max(1, ...values);
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: height + 24 }}>
        {values.map((v, i) => (
          <Press key={i} onPress={() => setSel(i)} scale={0.96} accessibilityLabel={`${FULL[i]}, average ${full(v)}`} accessibilityState={{ selected: on === i }} style={{ flex: 1, alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            <View style={{ width: '100%', height: Math.max(6, (v / max) * height), borderRadius: 8, borderCurve: 'continuous' as never, backgroundColor: on === i ? colors.primary : colors.skeleton }} />
            <Text v="caps" color={on === i ? colors.text : colors.textSubtle} style={{ letterSpacing: 0 }}>{DAYS[i]}</Text>
          </Press>
        ))}
      </View>
      {on !== null ? <Text v="small" color={colors.textMuted}><Text v="small" style={{ fontFamily: 'Geist_700Bold' }}>{FULL[on]}s</Text>{`: about ${full(values[on])} on a typical one`}</Text> : null}
    </View>
  );
}

/**
 * Month columns: slim rounded bars on a dotted average line. Tap a month to select it (the newest starts selected); the
 * selected bar is orange with its amount in a small pill above it.
 */
export function MonthBars({ months, selected, onSelect, height = 132, format }: { months: { label: string; expense: number; income: number }[]; selected: number; onSelect: (i: number) => void; height?: number; format: (n: number) => string }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...months.map((m) => m.expense)) * 1.15;
  const avg = months.reduce((a, m) => a + m.expense, 0) / Math.max(1, months.length);
  const avgY = (avg / max) * height;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end' }}>
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: avgY, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          {Array.from({ length: 40 }, (_, i) => <View key={i} style={{ flex: 1, height: 1.5, backgroundColor: colors.textSubtle, opacity: 0.45 }} />)}
        </View>
        <Text v="small" color={colors.textSubtle} style={{ position: 'absolute', left: 0, bottom: avgY + 4, fontSize: 11 }}>avg {format(avg)}</Text>
        {months.map((m, i) => {
          const on = i === selected;
          const h = Math.max(6, (m.expense / max) * height);
          return (
            <Press key={i} onPress={() => onSelect(i)} scale={0.95} accessibilityLabel={`${m.label}: spent ${format(m.expense)}`} accessibilityState={{ selected: on }} style={{ flex: 1, height, alignItems: 'center', justifyContent: 'flex-end' }}>
              {on ? (
                <View style={{ backgroundColor: colors.ink, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 6 }}>
                  <Text v="small" color={colors.onInk} style={{ fontSize: 11, fontFamily: 'Geist_600SemiBold' }}>{format(m.expense)}</Text>
                </View>
              ) : null}
              <View style={{ width: '62%', maxWidth: 30, height: h, borderRadius: 10, borderCurve: 'continuous' as never, backgroundColor: on ? colors.primary : colors.skeleton }} />
            </Press>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {months.map((m, i) => <Text key={i} v="caps" color={i === selected ? colors.text : colors.textSubtle} style={{ flex: 1, textAlign: 'center', letterSpacing: 0, fontSize: 11 }}>{m.label}</Text>)}
      </View>
    </View>
  );
}

/** A small labelled number in a soft box (used under charts). */
export function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, gap: 2 }}>
      <Text v="small" color={colors.textMuted} numberOfLines={1} style={{ fontSize: 12 }}>{label}</Text>
      <Text v="title" color={color} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

/**
 * Month pace on one track: solid orange is spent so far, light orange runs to where this pace ends the month, and a navy
 * tick marks last month's total. A small legend under the track names all three, with amounts.
 */
export function PaceTrack({ spent, projected, last, format }: { spent: number; projected: number; last: number; format: (n: number) => string }) {
  const { colors } = useTheme();
  const scale = Math.max(1, spent, projected, last) * 1.06;
  const pct = (v: number) => `${Math.min(100, (v / scale) * 100)}%` as const;
  const lastPct = (last / scale) * 100;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ height: 16, borderRadius: 8, backgroundColor: colors.track, overflow: 'visible' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct(projected), borderRadius: 8, backgroundColor: colors.primarySoft }} />
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct(spent), borderRadius: 8, backgroundColor: colors.primary }} />
        {last > 0 ? <View style={{ position: 'absolute', left: `${lastPct}%`, top: -5, width: 3, height: 26, borderRadius: 2, backgroundColor: colors.ink }} /> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, rowGap: 4, paddingTop: 2 }}>
        <Row style={{ gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colors.primary }} /><Text v="small" color={colors.textMuted} style={{ fontSize: 12 }}>Spent so far {format(spent)}</Text></Row>
        <Row style={{ gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colors.primarySoft }} /><Text v="small" color={colors.textMuted} style={{ fontSize: 12 }}>At this pace {format(projected)}</Text></Row>
        {last > 0 ? <Row style={{ gap: 6 }}><View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: colors.ink }} /><Text v="small" color={colors.textMuted} style={{ fontSize: 12 }}>Last month {format(last)}</Text></Row> : null}
      </View>
    </View>
  );
}
