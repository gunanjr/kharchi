import React from 'react';
import { Tabs } from 'expo-router';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { useTheme } from '@/theme/ThemeProvider';
import { useT } from '@/i18n';

const ITEMS = [
  ['index', 'tab.home'],
  ['activity', 'tab.activity'],
  ['groups', 'tab.groups'],
  ['insights', 'tab.insights'],
  ['club', 'tab.pro'],
] as const;

export default function TabsLayout() {
  const { colors } = useTheme();
  const t = useT();
  return (
    <Tabs
      tabBar={(p) => <FloatingTabBar {...p} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      {ITEMS.map(([name, key]) => (
        <Tabs.Screen key={name} name={name} options={{ title: t(key), tabBarAccessibilityLabel: t(key) }} />
      ))}
    </Tabs>
  );
}
