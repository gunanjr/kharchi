import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { IconTile } from './ui';
import type { GlyphName } from './glyphs';
import type { IconName } from './Icon';

/** A large icon tile on a soft squircle plate, for empty states, onboarding and the lock screen. Decorative only. */
export function Emblem({ glyph, icon, size = 168, tone = 'ink' }: { glyph?: GlyphName; icon?: IconName; size?: number; tone?: 'ink' | 'primary' }) {
  const { colors } = useTheme();
  const plate = Math.round(size * 0.72);
  const tile = Math.round(size * 0.36);
  return (
    <View style={{ width: size, height: size * 0.8, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', width: plate, height: plate * 0.8, borderRadius: plate * 0.26, borderCurve: 'continuous' as any, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }} />
      {tone === 'primary' ? <IconTile glyph={glyph} icon={icon} size={tile} color={colors.primary} tone="solid" /> : <IconTile glyph={glyph} icon={icon} size={tile} tone="ink" />}
    </View>
  );
}
