import React from 'react';
import { View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Press, Text } from './ui';
import { Icon, type IconName } from './Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius } from '@/theme/tokens';
import { easeOut } from '@/theme/motion';
import { haptic } from '@/lib/haptics';

const ICONS: Record<string, [IconName, IconName]> = {
  index: ['home', 'homeFill'], activity: ['list', 'listFill'], groups: ['users', 'usersFill'], insights: ['chart', 'chartFill'], club: ['bolt', 'boltFill'],
};

/** Floating capsule tab bar: the active tab is an ink pill that slides between items. */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [w, setW] = React.useState(0);
  const n = state.routes.length;
  const pad = 6;
  const itemW = w > 0 ? (w - pad * 2) / n : 0;
  const x = useSharedValue(0);
  React.useEffect(() => {
    x.value = reduce ? state.index * itemW : withTiming(state.index * itemW, { duration: 280, easing: easeOut });
  }, [state.index, itemW, reduce, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 12), paddingHorizontal: layout.gutter, alignItems: 'center' }}>
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={[{ flexDirection: 'row', padding: pad, height: layout.tabBar, alignSelf: 'stretch', maxWidth: layout.maxWidth - 40, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, shadows.floating]}
      >
        {itemW > 0 ? <Animated.View style={[{ position: 'absolute', left: pad, top: pad, bottom: pad, width: itemW, borderRadius: radius.pill, backgroundColor: colors.ink }, thumb]} /> : null}
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const label = (descriptors[route.key].options.title as string) ?? route.name;
          const [off, on] = ICONS[route.name] ?? ['home', 'homeFill'];
          // the Pro tab carries the accent even when it is not selected, so it reads as a place of its own
          const color = focused ? colors.onInk : route.name === 'club' ? colors.primary : colors.textMuted;
          return (
            <Press
              key={route.key}
              accessibilityLabel={label}
                            accessibilityState={{ selected: focused }}
              scale={0.94}
              onPress={() => {
                const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !ev.defaultPrevented) { haptic.light(); navigation.navigate(route.name, route.params); }
              }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}
            >
              <Icon name={focused ? on : off} color={color} size={22} />
              <Text style={{ fontSize: 10.5, lineHeight: 12, color, fontFamily: focused ? 'Geist_600SemiBold' : 'Geist_500Medium' }}>{label}</Text>
            </Press>
          );
        })}
      </View>
    </View>
  );
}
