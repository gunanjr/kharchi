import React from 'react';
import { Image, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/ui';
import { fonts } from '@/theme/tokens';
import type { Brand } from './data';

const initials = (n: string) => {
  const w = n.replace(/[^A-Za-z0-9+ ]/g, '').split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] ?? '?').slice(0, 1)).toUpperCase();
};

/** A merchant's mark in a rounded tile: the user's own photo if they set one, else the brand logo, else a colour monogram. */
export function BrandIcon({ brand, photo, size = 46 }: { brand?: Brand | null; photo?: string | null; size?: number }) {
  const r = Math.round(size * 0.32);
  if (photo) {
    return <Image source={{ uri: photo.startsWith('file://') ? photo : `file://${photo}` }} accessibilityIgnoresInvertColors style={{ width: size, height: size, borderRadius: r }} />;
  }
  if (!brand) return null;
  if (brand.img) return <Image source={brand.img} accessibilityIgnoresInvertColors resizeMode="cover" style={{ width: size, height: size, borderRadius: r, backgroundColor: brand.hex }} />;
  const fg = brand.dark ? '#1A1A1A' : '#FFFFFF';
  return (
    <View style={{ width: size, height: size, borderRadius: r, borderCurve: 'continuous' as never, backgroundColor: brand.hex, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {brand.path ? (
        <Svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24"><Path d={brand.path} fill={fg} /></Svg>
      ) : (
        <Text style={{ fontFamily: fonts.brandBlack, fontSize: size * (brand.name.trim().includes(' ') ? 0.36 : 0.46), color: fg, letterSpacing: -0.5 }}>{initials(brand.name)}</Text>
      )}
    </View>
  );
}
