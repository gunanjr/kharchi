import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Press, Text } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout, space } from '@/theme/tokens';
import { useStatus } from './useStatus';
import { RankMark } from '@/features/mce/AuraOrb';
import { useAuraAccess } from '@/features/mce/freeWeek';

/** Avatar colours: solid, each with dark or white ink that reads on it. */
export const AVATAR_COLORS: { bg: string; ink: string }[] = [
  { bg: '#14181F', ink: '#FFFFFF' }, { bg: '#FF8106', ink: '#14181F' }, { bg: '#FF2E7E', ink: '#FFFFFF' }, { bg: '#4B1FD1', ink: '#FFFFFF' },
  { bg: '#1460FF', ink: '#FFFFFF' }, { bg: '#0C9C74', ink: '#FFFFFF' }, { bg: '#9EE21A', ink: '#14181F' }, { bg: '#FFB800', ink: '#14181F' },
];

/** The avatar in the Home header: the first letter of the name on the chosen colour. Opens the profile. */
export function Avatar({ size = 44, onPress }: { size?: number; onPress?: () => void }) {
  const router = useRouter();
  const { colors } = useTheme();
  const bg = useSettings((s) => s.profileColor);
  const name = useSettings((s) => s.profileName);
  const c = AVATAR_COLORS.find((x) => x.bg === bg);
  return (
    <Press onPress={onPress ?? (() => router.push('/me'))} accessibilityLabel="Your profile" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c?.bg ?? colors.ink, alignItems: 'center', justifyContent: 'center' }}>
      {name ? <Text style={{ fontFamily: fonts.brandBlack, fontSize: size * 0.44, lineHeight: size * 0.56, color: c?.ink ?? colors.onInk }}>{name.trim()[0].toUpperCase()}</Text>
        : <Icon name="person" size={size * 0.45} color={c?.ink ?? colors.onInk} />}
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

/** Home status row: logging streak and aura, nothing else. A space chip leads only while a space is active. */
export function StatusRow({ lead }: { lead?: React.ReactNode }) {
  const router = useRouter();
  const { colors } = useTheme();
  const q = useStatus();
  const { access } = useAuraAccess();
  if (!q.data) return null;
  const { streak, aura } = q.data;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: layout.gutter, gap: space.sm }}>
      {lead}
      <Chip onPress={() => router.push('/me')} label={`${streak} day logging streak`}>
        <Icon name="flame" size={16} color={streak > 0 ? colors.primary : colors.textSubtle} />
        <Text v="small" style={{ fontFamily: fonts.bold }}>{streak}</Text>
        <Text v="small" color={colors.textMuted}>day streak</Text>
      </Chip>
      <Chip onPress={() => router.push('/mce')} label={access === 'locked' ? 'Aura, locked' : `${aura.score} aura, ${aura.rank.title}`}>
        {access === 'locked' ? <Icon name="lock" size={14} color={colors.textMuted} /> : <RankMark rank={aura.rank.key} size={15} color={colors.ink} off={colors.track} />}
        {access === 'locked' ? null : <Text v="small" style={{ fontFamily: fonts.bold }}>{aura.score}</Text>}
        <Text v="small" color={colors.textMuted}>aura</Text>
      </Chip>
    </View>
  );
}
