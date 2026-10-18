import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { create } from 'zustand';
import { Text } from './ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

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

export function ToastHost() {
  const { msg, action, hide } = useToast();
  const { colors } = useTheme();
  if (!msg) return null;
  return (
    <Animated.View entering={FadeInDown} exiting={FadeOutDown} pointerEvents="box-none" style={{ position: 'absolute', left: space.lg, right: space.lg, bottom: 84 }}>
      <View accessibilityLiveRegion="polite" style={{ backgroundColor: colors.text, borderRadius: radius.md, paddingHorizontal: space.lg, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Text v="small" color={colors.bg} style={{ flex: 1 }}>{msg}</Text>
        {action ? (
          <Pressable accessibilityRole="button" onPress={() => { action.run(); hide(); }} style={{ minHeight: 48, justifyContent: 'center' }}>
            <Text v="title" color={colors.primary === '#B8400E' ? '#F29A52' : colors.primary}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
