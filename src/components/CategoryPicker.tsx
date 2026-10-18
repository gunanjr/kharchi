import React from 'react';
import { ScrollView } from 'react-native';
import { Chip } from './ui';
import type { Category } from '@/domain/types';
import { space } from '@/theme/tokens';

export function CategoryChips({ categories, value, onChange, suggestedId, wrap = true }: {
  categories: Category[]; value: string | null; onChange: (id: string) => void; suggestedId?: string | null; wrap?: boolean;
}) {
  const sorted = suggestedId ? [...categories].sort((a, b) => (a.id === suggestedId ? -1 : b.id === suggestedId ? 1 : 0)) : categories;
  const chips = sorted.map((c) => (
    <Chip key={c.id} label={c.id === suggestedId && value !== c.id ? `${c.name} ✨` : c.name} icon={c.icon} selected={value === c.id} color={c.color} onPress={() => onChange(c.id)} />
  ));
  if (!wrap)
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
        {chips}
      </ScrollView>
    );
  return <>{chips}</>;
}
