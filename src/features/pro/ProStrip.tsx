import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Press, Text, SectionHeader } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useIsPro } from './store';
import { showPro } from './flags';
import { widget, useProStats, type PinTab } from './widgets';
import { useSettings, defaultSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

/**
 * Pro tools pinned to a tab (Insights, Groups). Pro users choose what appears here from the Pro tab; free users see the
 * default set with a lock, and each tool's own screen shows what it does before asking for Pro.
 */
export function ProStrip({ tab, bleed = 20, exclude = [], title }: { tab: PinTab; bleed?: number; exclude?: string[]; title?: string }) {
  const router = useRouter();
  const pro = useIsPro();
  const { colors } = useTheme();
  const pins = useSettings((s) => s.proPins);
  const stats = useProStats();
  const ids = (pro ? pins[tab] : defaultSettings.proPins[tab]).filter((id) => !exclude.includes(id));
  if (!showPro() || !ids.length) return null;
  return (
    <View style={{ gap: space.sm }}>
    {title ? <SectionHeader title={title} action={pro ? 'Edit' : undefined} onAction={pro ? () => router.push('/club') : undefined} /> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -bleed }} contentContainerStyle={{ paddingHorizontal: bleed, gap: space.sm }}>
      {ids.map((id) => widget(id)).filter((w) => !!w).map((w) => (
        <Press key={w.id} onPress={() => router.push(w.href)} accessibilityLabel={`${w.title}${pro ? '' : ', Pro'}`}
          style={{ width: 156, minHeight: 92, borderRadius: 20, backgroundColor: colors.hero, padding: space.md, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
            <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.onHero }} numberOfLines={1}>{w.title}</Text>
            {pro ? null : <Icon name="lock" size={14} color={colors.onHeroMuted} />}
          </View>
          <Text v="small" color={colors.onHeroMuted} numberOfLines={2}>{pro && stats ? stats.stat[w.id] : w.sub}</Text>
        </Press>
      ))}
    </ScrollView>
    </View>
  );
}
