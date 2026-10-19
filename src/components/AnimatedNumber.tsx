import React, { useEffect, useState } from 'react';
import { type StyleProp, type TextStyle } from 'react-native';
import { Easing, useReducedMotion } from 'react-native-reanimated';
import { Money, type MoneySize } from './ui';

const SIZE: Record<string, MoneySize> = { hero: 'hero', h1: 'xl', h2: 'lg', money: 'md' };
const ease = Easing.bezier(0.23, 1, 0.32, 1).factory();

/** Counts up from the previous value to the new one with a strong ease-out (skipped with reduce-motion). */
export function AnimatedMoney({ value, currency = 'INR', style, v = 'hero', color, muted, duration = 700, ...fmt }: {
  value: number; currency?: string; style?: StyleProp<TextStyle>; v?: 'hero' | 'h1' | 'money' | 'h2'; color?: string; muted?: string;
  duration?: number; compact?: boolean; trimZeros?: boolean; sign?: boolean;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const prev = React.useRef(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setShown(value); prev.current = value; return; }
    const from = prev.current;
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      setShown(Math.round(from + (value - from) * ease(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce, duration]);
  return <Money value={shown} currency={currency} size={SIZE[v]} color={color} muted={muted} style={style} {...fmt} />;
}
