import React, { useEffect } from 'react';
import { Keyboard, Pressable, View, KeyboardAvoidingView, Platform, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { easeOut } from '@/theme/motion';

/**
 * Bottom sheet / top drop-down panel for use inside a transparentModal route. Slides in with a strong ease-out
 * (no bounce) over a fading scrim. `from="top"` is used by Quick Add (drops from near the notch).
 */
export function Sheet({ children, onClose, from = 'bottom', style }: {
  children: React.ReactNode; onClose: () => void; from?: 'bottom' | 'top'; style?: StyleProp<ViewStyle>;
}) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    p.value = reduce ? 1 : withTiming(1, { duration: 340, easing: easeOut });
  }, [p, reduce]);
  const panel = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.6),
    transform: [{ translateY: (1 - p.value) * (from === 'top' ? -120 : 220) }],
  }));
  const scrim = useAnimatedStyle(() => ({ opacity: p.value }));
  const close = () => {
    Keyboard.dismiss();
    if (reduce) return onClose();
    p.value = withTiming(0, { duration: 160, easing: easeOut });
    // A plain timer (not a worklet callback) so closing can never get stuck half-way.
    setTimeout(onClose, 170);
  };
  const top = from === 'top';
  return (
    <View style={{ flex: 1, justifyContent: top ? 'flex-start' : 'flex-end' }}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay }, scrim]}>
        <Pressable accessibilityLabel="Close" accessibilityRole="button" style={{ flex: 1 }} onPress={close} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View
          style={[
            {
              backgroundColor: colors.surface,
              paddingHorizontal: 20,
              paddingTop: top ? Math.max(insets.top, 24) + 8 : space.md,
              paddingBottom: top ? 24 : Math.max(insets.bottom, 16) + 8,
              borderTopLeftRadius: top ? 0 : radius.xl,
              borderTopRightRadius: top ? 0 : radius.xl,
              borderBottomLeftRadius: top ? radius.xl : 0,
              borderBottomRightRadius: top ? radius.xl : 0,
              borderCurve: 'continuous' as any,
              gap: space.lg,
            },
            shadows.floating,
            panel,
            style,
          ]}
        >
          {!top ? <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.track, marginBottom: 2 }} /> : null}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
