import React, { useEffect, useState } from 'react';
import { type StyleProp, type TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { MoneyText } from './ui';
import { formatMoney } from '@/domain/money';

/** Counts up from the previous value to the new one (skipped with reduce-motion). */
export function AnimatedMoney({ value, currency = 'INR', style, v = 'hero', color, duration = 700, ...fmt }: {
  value: number; currency?: string; style?: StyleProp<TextStyle>; v?: 'hero' | 'h1' | 'money' | 'h2'; color?: string;
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
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce, duration]);
  return (
    <MoneyText v={v} color={color} style={style} accessibilityLabel={formatMoney(value, currency, fmt)}>
      {formatMoney(shown, currency, fmt)}
    </MoneyText>
  );
}
