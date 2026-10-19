import React, { useEffect } from 'react';
import { Keyboard, Pressable, View, KeyboardAvoidingView, Platform, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/**
 * Spring bottom sheet / top drop-down panel for use inside a transparentModal route.
 * `from="top"` is used by Quick Add (drops from near the notch).
 */
export function Sheet({ children, onClose, from = 'bottom', style }: {
  children: React.ReactNode; onClose: () => void; from?: 'bottom' | 'top'; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    p.value = reduce ? 1 : withSpring(1, { damping: 18, stiffness: 190 });
  }, [p, reduce]);
  const panel = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * (from === 'top' ? -140 : 160) }],
  }));
  const scrim = useAnimatedStyle(() => ({ opacity: p.value }));
  const close = () => {
    Keyboard.dismiss();
    if (reduce) return onClose();
    p.value = withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) });
    // A plain timer (not a worklet callback) so closing can never get stuck half-way.
    setTimeout(onClose, 170);
  };
  return (
    <View style={{ flex: 1, justifyContent: from === 'top' ? 'flex-start' : 'flex-end' }}>
      <Animated.View style={[{ position: 'absolute', inset: 0, backgroundColor: colors.overlay }, scrim]}>
        <Pressable accessibilityLabel="Close" accessibilityRole="button" style={{ flex: 1 }} onPress={close} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View
          style={[
            {
              backgroundColor: colors.surface,
              padding: space.lg,
              paddingTop: from === 'top' ? 52 : space.lg,
              borderTopLeftRadius: from === 'top' ? 0 : radius.lg + 6,
              borderTopRightRadius: from === 'top' ? 0 : radius.lg + 6,
              borderBottomLeftRadius: from === 'top' ? radius.lg + 6 : 0,
              borderBottomRightRadius: from === 'top' ? radius.lg + 6 : 0,
              gap: space.md,
            },
            panel,
            style,
          ]}
        >
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
