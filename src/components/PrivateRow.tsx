import React from 'react';
import { Press, Text } from './ui';
import { Icon } from './Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';
import { unlockPrivate } from '@/features/privacy/private';

/** "3 private entries hidden · Show": unlocks with fingerprint, face or screen lock. */
export function PrivateRow({ hidden }: { hidden: number }) {
  const { colors } = useTheme();
  if (!hidden) return null;
  return (
    <Press onPress={unlockPrivate} accessibilityLabel={`${hidden} private entries hidden. Show`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm }}>
      <Icon name="lock" size={15} color={colors.textMuted} />
      <Text v="small" color={colors.textMuted} style={{ flex: 1 }}>{hidden} private {hidden === 1 ? 'entry' : 'entries'} hidden</Text>
      <Text v="small" color={colors.link} style={{ fontFamily: 'Geist_600SemiBold' }}>Show</Text>
    </Press>
  );
}
