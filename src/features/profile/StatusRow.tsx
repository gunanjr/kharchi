import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Press, Text } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout, space } from '@/theme/tokens';
import { useStatus } from './useStatus';

/** The avatar in the Home header: opens the profile. Shows the chosen emoji, else the first letter of the name. */
export function Avatar({ size = 44 }: { size?: number }) {
  const router = useRouter();
  const { colors } = useTheme();
  const emoji = useSettings((s) => s.profileEmoji);
  const name = useSettings((s) => s.profileName);
  return (
    <Press onPress={() => router.push('/me')} accessibilityLabel="Your profile" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
      {emoji ? <Text style={{ fontSize: size * 0.48, lineHeight: size * 0.62 }}>{emoji}</Text>
        : name ? <Text style={{ fontFamily: fonts.brandBlack, fontSize: size * 0.42, color: colors.onHero }}>{name.trim()[0].toUpperCase()}</Text>
        : <Icon name="person" size={size * 0.45} color={colors.onHero} />}
    </Press>
  );
}

export function Chip({ onPress, label, children, tint }: { onPress: () => void; label: string; children: React.ReactNode; tint?: string }) {
  const { colors } = useTheme();
  return (
    <Press onPress={onPress} accessibilityLabel={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tint ?? colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
      {children}
    </Press>
  );
}

/** Home status row: streak, aura and Bruh score as compact chips, each opening its own screen. */
export function StatusRow({ lead }: { lead?: React.ReactNode }) {
  const router = useRouter();
  const { colors } = useTheme();
  const q = useStatus();
  if (!q.data) return null;
  const { streak, aura, bruh } = q.data;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.gutter, gap: space.sm }}>
      {lead}
      <Chip onPress={() => router.push('/me')} label={`${streak} day logging streak`}>
        <Icon name="flame" size={16} color={streak > 0 ? '#FF6A00' : colors.textSubtle} />
        <Text v="small" style={{ fontFamily: fonts.bold }}>{streak}</Text>
        <Text v="small" color={colors.textMuted}>day streak</Text>
      </Chip>
      <Chip onPress={() => router.push('/mce')} label={`${aura.score} aura, ${aura.rank.title}`}>
        <Text style={{ fontSize: 14, lineHeight: 18 }}>{aura.rank.emoji}</Text>
        <Text v="small" style={{ fontFamily: fonts.bold }}>{aura.score}</Text>
        <Text v="small" color={colors.textMuted}>aura</Text>
      </Chip>
      <Chip onPress={() => router.push('/me')} label={`Bruh score ${bruh ?? 'not yet'}`}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: bruh ? colors.income : colors.textSubtle }} />
        <Text v="small" style={{ fontFamily: fonts.bold }}>{bruh ?? 'Bruh score'}</Text>
      </Chip>
    </ScrollView>
  );
}
