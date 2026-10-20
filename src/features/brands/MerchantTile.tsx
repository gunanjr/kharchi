import React from 'react';
import { IconTile, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { BrandIcon } from './BrandIcon';
import { resolveBrand } from './match';
import { useMerchantPhoto } from './custom';

/**
 * The one way to show a merchant anywhere in the app: the user's own photo, else the built-in brand icon, else a quiet
 * letter tile (or `fallback`, e.g. a category glyph).
 */
export function MerchantTile({ name, size = 40, fallback }: { name: string | null | undefined; size?: number; fallback?: React.ReactNode }) {
  const { colors } = useTheme();
  const photo = useMerchantPhoto(name);
  const brand = resolveBrand(name);
  if (photo || brand) return <BrandIcon brand={brand} photo={photo} size={size} />;
  if (fallback) return <>{fallback}</>;
  return <IconTile size={size} tone="plain"><Text v="title" color={colors.link}>{((name ?? '?').trim()[0] ?? '?').toUpperCase()}</Text></IconTile>;
}
