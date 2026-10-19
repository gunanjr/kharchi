import React, { useRef, useState } from 'react';
import { Modal, Pressable, View, type LayoutChangeEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { Glyph } from '@/components/Icon';
import { Text } from '@/components/ui';
import TrendChart from '@/components/hero/TrendChart';
import { useDb, useQuery } from '@/db/provider';
import { listTransactions } from '../repo';
import { RANGES, RANGE_LABEL, VERSUS_LABEL, buildFrame, frameStart, type Range } from '../frames';
import { axisLabels, describeChange, trendRange } from '@/lib/trend';
import { formatMoney } from '@/domain/money';
import { haptic } from '@/lib/haptics';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout, radius, space } from '@/theme/tokens';

const CHART_HEIGHT = 92;

/**
 * The Home hero: one solid card with the label, a time-frame pill, the hide-amounts eye and an arrow to Insights, the
 * figure (the paise quieter than the rupees), the change against the stretch before, an interactive trend line, five
 * axis labels, and Income and Kept as a footer. Ported from the Fermor app's Home hero (same structure and behaviour),
 * drawn with Kharchi's colours and its own data: what was spent. Entries the user left out of totals are not counted.
 *
 * The card is not pressable. The chart owns its touches (press and hold to explore); the page locks its scroll while a
 * finger slides along it, through `onExploreChange`.
 */
export function SpendHero({ currency, onExploreChange }: { currency: string; onExploreChange?: (exploring: boolean) => void }) {
  const { colors, shadows } = useTheme();
  const router = useRouter();
  const db = useDb();
  const hide = useSettings((s) => s.hideAmounts);
  const setSetting = useSettings((s) => s.set);
  const [range, setRange] = useState<Range>('1M');
  const [menuOpen, setMenuOpen] = useState(false);
  const pillRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; h: number } | null>(null);
  const [rowWidth, setRowWidth] = useState(0);
  const now = Date.now();

  const q = useQuery(async (d) => buildFrame(await listTransactions(d, { from: frameStart(range, now), to: now + 1 }), now, range), [range]);
  // While a new time frame loads, the previous chart stays (dimmed) instead of blanking the card.
  const keep = useRef<ReturnType<typeof buildFrame> | null>(null);
  if (q.data) keep.current = q.data;
  const f = q.data ?? keep.current;
  const switching = q.loading && !!f;

  const hero = { bg: colors.hero, fg: colors.onHero, muted: colors.onHeroMuted, soft: colors.onHeroLine };
  const mask = (text: string) => (hide ? '••••' : text);
  const money = (paise: number) => formatMoney(paise, currency, { showSymbol: true });

  const toggleMenu = () => {
    haptic.tap();
    if (menuOpen) return setMenuOpen(false);
    pillRef.current?.measureInWindow((x, y, _w, h) => { setAnchor({ x, y, h }); setMenuOpen(true); });
  };

  const first = f?.points[0];
  const last = f?.points[f.points.length - 1];
  const pillText = first && last ? (trendRange(first.date, last.date) ?? RANGE_LABEL[f!.range]) : RANGE_LABEL[range];
  const change = f && f.percent !== null
    ? describeChange({ amountPaise: String(f.delta), percent: f.percent }, (abs) => mask(money(Number(abs))), VERSUS_LABEL[f.range])
    : null;

  // The figure is sized from its measured row (the web ignores adjustsFontSizeToFit): the same rule Fermor uses.
  const full = f ? money(f.spent) : '';
  const dot = full.lastIndexOf('.');
  const whole = hide ? '••••' : dot >= 0 ? full.slice(0, dot) : full;
  const decimals = hide ? '' : dot >= 0 ? full.slice(dot) : '';
  const available = rowWidth > 0 ? rowWidth : 280;
  const size = Math.max(26, Math.min(44, Math.floor(available / ((whole.length + decimals.length) * 0.56))));

  return (
    <View style={{ backgroundColor: hero.bg, borderRadius: radius.lg, borderCurve: 'continuous' as never, padding: layout.cardPad, gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, zIndex: 10 }}>
        <Text v="caps" color={hero.muted}>SPENT</Text>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          {f ? (
            <Pressable
              ref={pillRef as never}
              onPress={toggleMenu}
              accessibilityRole="button"
              accessibilityLabel={`Time frame, ${RANGE_LABEL[range]}. Tap to change.`}
              accessibilityState={{ expanded: menuOpen }}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 26, borderRadius: radius.pill, backgroundColor: hero.soft }}
            >
              <Text v="small" numberOfLines={1} color={hero.fg} style={{ fontFamily: fonts.semibold, fontSize: 12 }}>{pillText}</Text>
              <Glyph name={menuOpen ? 'chevron-up' : 'chevron-down'} size={13} color={hero.fg} />
            </Pressable>
          ) : null}
          <Modal visible={menuOpen && anchor !== null} transparent animationType="none" onRequestClose={() => setMenuOpen(false)}>
            {/* Any tap outside the menu closes it. */}
            <Pressable style={{ flex: 1 }} onPress={() => setMenuOpen(false)} accessibilityLabel="Close time frame menu">
              <View
                accessibilityRole="menu"
                style={{
                  position: 'absolute', top: (anchor?.y ?? 0) + (anchor?.h ?? 0) + 6, left: anchor?.x ?? 0, minWidth: 150, paddingVertical: space.xs,
                  borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadows.floating,
                }}
              >
                {RANGES.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => { haptic.tap(); setMenuOpen(false); setRange(r); }}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: r === range }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingHorizontal: space.md, minHeight: 44 }}
                  >
                    <Text v="body" style={{ fontFamily: r === range ? fonts.bold : fonts.regular }}>{RANGE_LABEL[r]}</Text>
                    {r === range ? <Glyph name="checkmark" size={16} color={colors.link} /> : null}
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Modal>
        </View>
        <Pressable onPress={() => { haptic.tap(); setSetting(db, 'hideAmounts', !hide); }} accessibilityRole="button" accessibilityLabel={hide ? 'Show amounts' : 'Hide amounts'} hitSlop={10}>
          <Glyph name={hide ? 'eye-off-outline' : 'eye-outline'} size={20} color={hero.fg} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/insights')}
          accessibilityRole="button"
          accessibilityLabel="Open Insights"
          hitSlop={10}
          style={{ width: 26, height: 26, borderRadius: radius.pill, backgroundColor: hero.soft, alignItems: 'center', justifyContent: 'center' }}
        >
          <Glyph name="chevron-forward" size={16} color={hero.fg} />
        </Pressable>
      </View>

      {!f ? (
        <View style={{ gap: space.md }}>
          <View style={{ width: '70%', height: 40, borderRadius: radius.sm, backgroundColor: hero.soft }} />
          <View style={{ height: CHART_HEIGHT, borderRadius: radius.sm, backgroundColor: hero.soft }} />
        </View>
      ) : (
        <>
          <View onLayout={(e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width)}>
            <Text
              numberOfLines={1}
              accessibilityLabel={hide ? 'Amount spent hidden' : `Spent ${whole}`}
              color={hero.fg}
              style={{ fontFamily: fonts.semibold, fontSize: size, lineHeight: Math.round(size * 1.12), letterSpacing: -size * 0.03, fontVariant: ['tabular-nums'] }}
            >
              {whole}
              <Text color={hero.muted} style={{ fontFamily: fonts.regular, fontSize: size, lineHeight: Math.round(size * 1.12), letterSpacing: -size * 0.03 }}>{decimals}</Text>
            </Text>
            {change ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                {change.direction === 'flat' ? null : <Glyph name={change.direction === 'up' ? 'caret-up' : 'caret-down'} size={12} color={hero.fg} />}
                <Text v="small" color={hero.fg} style={{ fontFamily: fonts.semibold }}>{change.text}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ opacity: switching ? 0.45 : 1 }}>
            <TrendChart
              tone="onGreen"
              color={hero.fg}
              coreColor={hero.bg}
              points={f.points}
              height={CHART_HEIGHT}
              formatValue={(paise) => mask(money(Number(paise)))}
              accessibilityLabel={`Spending trend, ${pillText}`}
              onExploreChange={onExploreChange}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {axisLabels(f.points.map((p) => p.date), f.range).map((label, i) => (
              <Text key={`${label}-${i}`} v="small" color={hero.muted} style={{ fontSize: 11 }}>{label}</Text>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: space.md, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: hero.soft }}>
            <Stat label="Income" value={mask(money(f.income))} />
            <Stat label={f.income - f.spent >= 0 ? 'Kept' : 'Over income by'} value={mask(money(Math.abs(f.income - f.spent)))} />
          </View>
        </>
      )}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text v="small" color={colors.onHeroMuted}>{label}</Text>
      <Text v="body" numberOfLines={1} color={colors.onHero} style={{ fontFamily: fonts.semibold, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}
