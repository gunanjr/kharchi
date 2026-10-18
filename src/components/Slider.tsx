import React, { useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

/** Minimal accessible slider (0..100). Adjustable by drag, or by accessibility increment/decrement actions. */
export function Slider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const { colors } = useTheme();
  const [w, setW] = useState(1);
  const wRef = useRef(1);
  const cb = useRef(onChange);
  cb.current = onChange;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => cb.current(clamp((e.nativeEvent.locationX / wRef.current) * 100)),
      onPanResponderMove: (e) => cb.current(clamp((e.nativeEvent.locationX / wRef.current) * 100)),
    }),
  ).current;
  return (
    <View
      {...pan.panHandlers}
      onLayout={(e) => { setW(e.nativeEvent.layout.width); wRef.current = e.nativeEvent.layout.width; }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(clamp(value + (e.nativeEvent.actionName === 'increment' ? 10 : -10)))}
      style={{ height: 48, justifyContent: 'center' }}
    >
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt }}>
        <View style={{ width: `${value}%`, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
      </View>
      <View style={{ position: 'absolute', left: Math.max(0, (value / 100) * w - 14), width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.surface }} />
    </View>
  );
}
const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
