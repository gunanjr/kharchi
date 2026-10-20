import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Press, Text } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { useIsPro } from './store';
import { showPro } from './flags';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

export type ProTool = { icon: IconName; title: string; sub: string; href: Href };

/**
 * Pro tools where they belong (Insights, Groups) instead of only in More. Pro users get dark tiles that open the tool;
 * free users see the same tiles with a lock, and the tool's own screen shows what it does before asking for Pro.
 */
export function ProStrip({ tools, bleed = 20 }: { tools: ProTool[]; bleed?: number }) {
  const router = useRouter();
  const pro = useIsPro();
  const { colors } = useTheme();
  if (!showPro()) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -bleed }} contentContainerStyle={{ paddingHorizontal: bleed, gap: space.sm }}>
      {tools.map((t) => (
        <Press key={t.title} onPress={() => router.push(t.href)} accessibilityLabel={`${t.title}${pro ? '' : ', Pro'}`}
          style={{ width: 148, borderRadius: 20, backgroundColor: colors.hero, padding: space.md, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Icon name={t.icon} size={17} color="#FFFFFF" /></View>
            {pro ? null : <Icon name="lock" size={14} color={colors.onHeroMuted} />}
          </View>
          <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.onHero }} numberOfLines={1}>{t.title}</Text>
          <Text v="small" color={colors.onHeroMuted} numberOfLines={2}>{t.sub}</Text>
        </Press>
      ))}
    </ScrollView>
  );
}
