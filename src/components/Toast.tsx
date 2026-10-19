import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { Text } from './ui';
import { Icon } from './Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, space } from '@/theme/tokens';
import { enterUp } from '@/theme/motion';

type ToastState = { msg: string | null; action?: { label: string; run: () => void }; show: (msg: string, action?: { label: string; run: () => void }) => void; hide: () => void };
let timer: ReturnType<typeof setTimeout> | undefined;
export const useToast = create<ToastState>((set) => ({
  msg: null,
  show: (msg, action) => {
    clearTimeout(timer);
    set({ msg, action });
    timer = setTimeout(() => set({ msg: null, action: undefined }), action ? 5000 : 2500);
  },
  hide: () => set({ msg: null, action: undefined }),
}));
export const toast = (msg: string, action?: { label: string; run: () => void }) => useToast.getState().show(msg, action);

/** An ink pill that rises above the tab bar, with an optional action in marigold. */
export function ToastHost() {
  const { msg, action, hide } = useToast();
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  if (!msg) return null;
  return (
    <Animated.View key={msg} entering={enterUp(0, 18, 280)} exiting={FadeOutDown.duration(180)} pointerEvents="box-none" style={{ position: 'absolute', left: layout.gutter, right: layout.gutter, bottom: insets.bottom + layout.tabBar + 36 }}>
      <View accessibilityLiveRegion="polite" style={[{ backgroundColor: colors.ink, borderRadius: radius.pill, paddingLeft: space.lg, paddingRight: space.sm, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md }, shadows.floating]}>
        <Icon name="check" color={colors.primary} size={18} />
        <Text v="small" color={colors.onInk} style={{ flex: 1 }}>{msg}</Text>
        {action ? (
          <Pressable accessibilityRole="button" onPress={() => { action.run(); hide(); }} style={{ minHeight: 40, paddingHorizontal: space.md, justifyContent: 'center' }}>
            <Text v="small" color={colors.primary} style={{ fontFamily: 'Geist_600SemiBold' }}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
