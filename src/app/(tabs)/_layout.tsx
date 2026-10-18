import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon, type IconName } from '@/components/Icon';
import { useT } from '@/i18n';
import { fonts } from '@/theme/tokens';

const tab = (name: string, key: Parameters<ReturnType<typeof useT>>[0], icon: IconName) => ({ name, key, icon });

export default function TabsLayout() {
  const { colors } = useTheme();
  const t = useT();
  const items = [
    tab('index', 'tab.home', 'home'),
    tab('activity', 'tab.activity', 'list'),
    tab('groups', 'tab.groups', 'users'),
    tab('insights', 'tab.insights', 'chart'),
    tab('more', 'tab.more', 'menu'),
  ];
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64, paddingTop: 6, paddingBottom: 8 },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {items.map((i) => (
        <Tabs.Screen
          key={i.name}
          name={i.name}
          options={{
            title: t(i.key),
            tabBarAccessibilityLabel: t(i.key),
            tabBarIcon: ({ color, focused }) => <Icon name={i.icon} color={color as string} stroke={focused ? 2.4 : 1.8} />,
          }}
        />
      ))}
    </Tabs>
  );
}
