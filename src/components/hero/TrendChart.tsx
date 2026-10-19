import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  PanResponder,
  Platform,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import {
  REVEAL_TOTAL_MS,
  clampTooltipLeft,
  curveYAtX,
  fullDateLabel,
  nearestPointIndex,
  revealPaths,
  revealState,
  sampleCurve,
  scaleSeries,
  valueFromY,
} from '@/lib/trend';

export interface TrendPoint {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Integer paise, as a string. */
  valuePaise: string;
}

// Right and top padding leave room for the latest point's halo so it is never clipped.
const PAD = { left: 4, right: 14, top: 14, bottom: 6 };
/** The bold on-green line (the on-glass ink line stays fine). */
const LINE_WIDTH_BOLD = 3.6;
const LINE_WIDTH_FINE = 1.75;
const TOOLTIP_WIDTH = 104;
const TOOLTIP_HEIGHT = 40;
/** Sideways movement beyond this (px) turns a touch into a slide along the chart. */
const SCRUB_SLOP = 8;
/** A touch shorter than this that did not move is a tap. */
const TAP_MS = 450;
/** A selection made by the screen reader stays this long, then clears. */
const SELECTION_HOLD_MS = 2500;
/** A touch this recent means mouse events are the browser's echo of it, not a hover. */
const TOUCH_ECHO_MS = 1000;
const SAMPLES_PER_SEGMENT = 24;

/**
 * Drives the one-time reveal: returns the milliseconds elapsed since the chart
 * first had something to draw (`REVEAL_TOTAL_MS` once finished), or -1 until the
 * reduced-motion preference is known. Reduced motion skips straight to the end, and
 * so does a short fallback timer, so the line can never stay hidden. Runs once per
 * mount: refreshing the data or switching tabs does not replay it.
 */
function useRevealClock(ready: boolean): number {
  const [elapsed, setElapsed] = useState(-1);

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    let frame = 0;
    let startedAt: number | null = null;

    const fallback = setTimeout(() => {
      if (!cancelled) setElapsed((e) => (e === -1 ? REVEAL_TOTAL_MS : e));
    }, 600);

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (cancelled) return;
        if (reduceMotion) {
          setElapsed(REVEAL_TOTAL_MS);
          return;
        }
        const step = (timestamp: number): void => {
          if (cancelled) return;
          if (startedAt === null) startedAt = timestamp;
          const e = Math.min(timestamp - startedAt, REVEAL_TOTAL_MS);
          setElapsed(e);
          if (e < REVEAL_TOTAL_MS) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      })
      .catch(() => {
        if (!cancelled) setElapsed(REVEAL_TOTAL_MS);
      });

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      cancelAnimationFrame(frame);
    };
  }, [ready]);

  return elapsed;
}

/**
 * The Net Worth trend on the green hero card, drawn with plain `react-native-svg`
 * (no charting library): one thin, crisp white line (a smooth Catmull–Rom curve through
 * the history) over a barely-there secondary stroke and a faint white fade, and a small
 * highlighted latest point (white ring, green centre, soft halo). The monthly
 * checkpoints are invisible: they only shape the curve.
 *
 * Reveal: on first appearance the line draws left to right in about a second and the
 * latest point settles in with one soft halo pulse; reduced motion shows it at once.
 *
 * Exploring: tap the chart and a guide line and a small marker appear on the curve at that spot,
 * with a tooltip giving the date and the value there (read from the curve between the data points,
 * never outside the real minimum and maximum). It stays after the finger lifts; slide a finger
 * along the chart to move it (the page's scroll is locked only while sliding, so the page never
 * gets stuck), and tap again to dismiss it. On the web a mouse hover shows it too.
 *
 * Gestures: the chart owns its touches (nothing behind it is pressable, so exploring can never
 * navigate). A touch that moves up or down is a normal scroll and is handed to the page. On the
 * web the chart declares `touch-action: pan-y`.
 * Screen readers get one adjustable element: swipe up or down to step through the
 * months, each announced with its value.
 *
 * The history arrives already computed by the backend (the mock AA provider's
 * snapshots); this component only draws it. Values go through `formatValue` so the
 * hide-amounts mask applies to the tooltip and the spoken value.
 */
export default function NetWorthTrendChart({
  points,
  height,
  formatValue,
  accessibilityLabel,
  onExploreChange,
  tone = 'onGreen',
  color,
  coreColor,
  lineWidth,
  formatLabel,
}: {
  /** Draw the line in this colour instead of the tone's (e.g. green or red by direction on a price chart). */
  color?: string;
  /** The fill of the end dot's centre (the colour of whatever the chart sits on); default follows the tone. */
  coreColor?: string;
  /** Line thickness in px; default is bold on green and fine on glass. */
  lineWidth?: number;
  /** The tooltip's date text for a point's `date`; default is "8 Oct 2026". */
  formatLabel?: (date: string) => string | null;
  /** 'onGreen' draws white strokes (for a green card); 'onGlass' draws a fine ink line (for a glass surface). */
  tone?: 'onGreen' | 'onGlass';
  points: readonly TrendPoint[];
  height: number;
  formatValue: (valuePaise: string) => string;
  accessibilityLabel: string;
  /** Called with true when exploring starts and false when it ends (the page locks its scroll). */
  onExploreChange?: (exploring: boolean) => void;
}): React.JSX.Element {
  const { colors, shadows } = useTheme();
  const stroke = color ?? (tone === 'onGlass' ? colors.ink : colors.onHero);
  const core = coreColor ?? (tone === 'onGlass' ? colors.surface : colors.hero);
  const [width, setWidth] = useState(0);
  const [focusX, setFocusX] = useState<number | null>(null);

  const elapsed = useRevealClock(width > 0 && points.length >= 2);
  const reveal = revealState(elapsed);

  const values = useMemo(() => points.map((p) => Number(p.valuePaise)), [points]);
  const pts = useMemo(
    () => (width > 0 ? scaleSeries(values, width, height, PAD) : []),
    [values, width, height],
  );
  // A long, busy series needs few samples between points; a short one is smoothed more.
  const samples = useMemo(() => sampleCurve(pts, pts.length > 20 ? 4 : SAMPLES_PER_SEGMENT), [pts]);

  // --- gestures: handlers are created once and read the latest geometry through refs ---
  const overlayRef = useRef<View>(null);
  const leftRef = useRef<number | null>(null);
  const firstXRef = useRef(0);
  const lastXRef = useRef(0);
  const exploreChangeRef = useRef(onExploreChange);
  firstXRef.current = pts[0]?.x ?? 0;
  lastXRef.current = pts[pts.length - 1]?.x ?? 0;
  exploreChangeRef.current = onExploreChange;
  const gesture = useRef({
    /** True while a finger is sliding along the chart (the page's scroll is locked meanwhile). */
    active: false,
    /** True once a tap or a slide has left the readout in place; a mouse hover never pins it. */
    pinned: false,
    moved: false,
    startX: 0,
    startAt: 0,
    lastTouchAt: -Infinity,
    pressTimer: null as ReturnType<typeof setTimeout> | null,
    holdTimer: null as ReturnType<typeof setTimeout> | null,
  }).current;

  // A new set of points (another time frame) clears a readout left on the old one.
  useEffect(() => {
    gesture.pinned = false;
    setFocusX(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  const clearTimer = (key: 'pressTimer' | 'holdTimer'): void => {
    const t = gesture[key];
    if (t !== null) clearTimeout(t);
    gesture[key] = null;
  };
  const focusAt = (px: number): void => {
    if (!Number.isFinite(px)) return;
    setFocusX(Math.min(lastXRef.current, Math.max(firstXRef.current, px)));
  };

  /** A touch's x within the chart. On a phone `locationX` is relative to the chart and keeps
   *  working while the finger leaves it; on the web page coordinates minus the chart's left edge. */
  const touchX = (e: GestureResponderEvent): number => {
    if (Platform.OS !== 'web') return e.nativeEvent.locationX;
    const el = overlayRef.current as unknown as {
      getBoundingClientRect?: () => { left: number };
    } | null;
    const left = el?.getBoundingClientRect?.().left ?? leftRef.current;
    return left === null || left === undefined ? NaN : e.nativeEvent.pageX - left;
  };

  /** The finger lifts after a slide: the readout stays where it was left, the page scrolls again. */
  const endScrub = (): void => {
    if (gesture.active) {
      gesture.active = false;
      exploreChangeRef.current?.(false);
    }
  };
  const dismiss = (): void => {
    gesture.pinned = false;
    setFocusX(null);
  };
  useEffect(
    () => () => {
      clearTimer('pressTimer');
      clearTimer('holdTimer');
      if (gesture.active) exploreChangeRef.current?.(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const pan = useRef(
    PanResponder.create({
      // Claim the touch at its start so nothing behind the chart ever receives it (a tap on the
      // chart can never navigate), and let the page take it back for a vertical scroll.
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        gesture.lastTouchAt = performance.now();
        gesture.startAt = Date.now();
        gesture.startX = touchX(e);
        gesture.moved = false;
      },
      onPanResponderMove: (e, g) => {
        if (gesture.active) {
          focusAt(touchX(e));
        } else if (Math.abs(g.dx) > SCRUB_SLOP && Math.abs(g.dx) > Math.abs(g.dy)) {
          gesture.active = true;
          gesture.pinned = true;
          gesture.moved = true;
          exploreChangeRef.current?.(true);
          focusAt(touchX(e));
        } else if (Math.hypot(g.dx, g.dy) > SCRUB_SLOP) {
          gesture.moved = true;
        }
      },
      // Before a slide starts a vertical scroll may take the gesture; during a slide, never.
      onPanResponderTerminationRequest: () => !gesture.active,
      onPanResponderRelease: () => {
        if (gesture.active) {
          endScrub();
        } else if (!gesture.moved && Date.now() - gesture.startAt < TAP_MS) {
          // A tap: show the readout here, or take it away if it is already showing.
          if (!gesture.pinned) {
            gesture.pinned = true;
            focusAt(gesture.startX);
          } else {
            dismiss();
          }
        }
      },
      onPanResponderTerminate: endScrub,
    }),
  ).current;

  // Web only: hover with a mouse. Ignored right after a touch (the browser echoes touches as mouse events).
  const onMouseMove = (e: {
    clientX: number;
    currentTarget: { getBoundingClientRect: () => { left: number } };
  }): void => {
    if (performance.now() - gesture.lastTouchAt < TOUCH_ECHO_MS || gesture.pinned) return;
    focusAt(e.clientX - e.currentTarget.getBoundingClientRect().left);
  };
  const onMouseLeave = (): void => {
    if (performance.now() - gesture.lastTouchAt < TOUCH_ECHO_MS || gesture.active || gesture.pinned) return;
    setFocusX(null);
  };

  const onLayout = (e: LayoutChangeEvent): void => {
    setWidth(Math.round(e.nativeEvent.layout.width));
    overlayRef.current?.measureInWindow((x) => {
      leftRef.current = x;
    });
  };

  // --- what is under the finger / pointer ---
  const focus = (() => {
    if (focusX === null || samples.length === 0) return null;
    const y = curveYAtX(samples, focusX);
    const v = y === null ? null : valueFromY(y, values, height, PAD);
    const near = points[nearestPointIndex(pts, focusX)];
    if (y === null || v === null || !near) return null;
    return {
      x: focusX,
      y,
      value: formatValue(String(Math.round(v))),
      label: (formatLabel ?? fullDateLabel)(near.date),
    };
  })();

  const lastPoint = points[points.length - 1];
  const spoken = focus
    ? `${focus.label ?? ''}, ${focus.value}`
    : lastPoint
      ? `Latest, ${formatValue(lastPoint.valuePaise)}`
      : '';

  const stepByMonth = (delta: number): void => {
    if (pts.length === 0) return;
    clearTimer('holdTimer');
    const from = focusX === null ? pts.length - 1 : nearestPointIndex(pts, focusX);
    const next = Math.min(pts.length - 1, Math.max(0, from + delta));
    setFocusX((pts[next] as { x: number }).x);
    gesture.holdTimer = setTimeout(() => setFocusX(null), SELECTION_HOLD_MS);
  };

  // --- drawing ---
  const first = pts[0];
  const last = pts[pts.length - 1];
  const xLimit = first && last ? first.x + reveal.draw * (last.x - first.x) : 0;
  const { line, area } = useMemo(
    () => revealPaths(samples, xLimit, height),
    [samples, xLimit, height],
  );
  const dot = reveal.dot;
  const haloRadius = 9 * dot * (1 + 0.28 * reveal.pulse);

  const tooltipTop = focus
    ? focus.y - TOOLTIP_HEIGHT - 10 >= -8
      ? focus.y - TOOLTIP_HEIGHT - 10
      : focus.y + 14
    : 0;

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: spoken }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => stepByMonth(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      style={{ height, width: '100%' }}
    >
      {width > 0 && last ? (
        <Svg width={width} height={height} pointerEvents="none">
          <Defs>
            <LinearGradient id="netWorthArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={stroke} stopOpacity={tone === 'onGlass' ? 0.14 : 0.12} />
              <Stop offset="1" stopColor={stroke} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {area ? <Path d={area} fill="url(#netWorthArea)" /> : null}
          {line ? (
            <>
              <Path
                d={line}
                fill="none"
                stroke={stroke}
                strokeWidth={lineWidth ?? (tone === 'onGlass' ? LINE_WIDTH_FINE : LINE_WIDTH_BOLD)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : null}

          {focus ? (
            <>
              <Line
                x1={focus.x}
                x2={focus.x}
                y1={PAD.top - 4}
                y2={height}
                stroke={stroke}
                strokeOpacity={0.45}
                strokeWidth={1}
              />
              <Circle cx={focus.x} cy={focus.y} r={8} fill={stroke} fillOpacity={0.2} />
              <Circle cx={focus.x} cy={focus.y} r={4.5} fill={stroke} />
              <Circle cx={focus.x} cy={focus.y} r={2.6} fill={core} />
            </>
          ) : null}

          {dot > 0 ? (
            <>
              <Circle
                cx={last.x}
                cy={last.y}
                r={haloRadius}
                fill={stroke}
                fillOpacity={0.2}
              />
              <Circle cx={last.x} cy={last.y} r={5.5 * dot} fill={stroke} />
              <Circle cx={last.x} cy={last.y} r={3 * dot} fill={core} />
            </>
          ) : null}
        </Svg>
      ) : null}

      {focus ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: tooltipTop,
            left: clampTooltipLeft(focus.x, TOOLTIP_WIDTH, width),
            width: TOOLTIP_WIDTH,
            height: TOOLTIP_HEIGHT,
            borderRadius: 10,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            ...shadows.card,
          }}
        >
          {focus.label ? (
            <Text
              v="small"
              color={colors.textMuted}
              numberOfLines={1}
              style={{ fontSize: 10, lineHeight: 12, letterSpacing: 0.8 }}
            >
              {focus.label.toUpperCase()}
            </Text>
          ) : null}
          <Text
            v="small"
            numberOfLines={1}
            style={{ fontWeight: '600', color: colors.text }}
          >
            {focus.value}
          </Text>
        </View>
      ) : null}

      {/* The touch surface: above the drawing, nothing inside it. */}
      <View
        ref={overlayRef}
        {...pan.panHandlers}
        // Web only: hover, and no text selection or long-press menu on the chart.
        {...({
          onMouseMove,
          onMouseLeave,
          onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
        } as object)}
        style={[
          StyleSheet.absoluteFill,
          // Web only: let the browser handle vertical pans (page scroll); sideways ones are ours.
          { touchAction: 'pan-y', userSelect: 'none' } as unknown as ViewStyle,
        ]}
      />
    </View>
  );
}
