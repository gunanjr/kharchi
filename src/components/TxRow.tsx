import React from 'react';
import { View } from 'react-native';
import { Text, Money, Press, IconTile, Tag } from './ui';
import { Glyph } from './Icon';
import { categoryGlyph } from './glyphs';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, toneOf } from '@/theme/tokens';
import { formatMoney } from '@/domain/money';
import { formatTime } from '@/lib/date';
import type { Category, Transaction } from '@/domain/types';

/** Category mark: a soft squircle tile holding a line glyph in the category's tone. */
export function CategoryDot({ cat, size = 46 }: { cat?: Category | null; size?: number }) {
  const { colors } = useTheme();
  const g = categoryGlyph(cat);
  const tone = toneOf(cat?.color);
  return (
    <IconTile size={size} color={tone}>
      {g ? <Glyph name={g} size={Math.round(size * 0.46)} color={tone} /> : <Glyph name="receipt-outline" size={Math.round(size * 0.46)} color={colors.textMuted} />}
    </IconTile>
  );
}

/** One transaction. Expenses stay neutral (ink), income is green: red is reserved for real problems. */
export function TxRow({ tx, cat, onPress, onLongPress }: { tx: Transaction; cat?: Category | null; onPress?: () => void; onLongPress?: () => void }) {
  const { colors } = useTheme();
  const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '';
  const color = tx.type === 'income' ? colors.income : tx.type === 'expense' ? colors.text : colors.textMuted;
  const title = tx.merchant || tx.note || cat?.name || (tx.type === 'transfer' ? 'Transfer' : 'Transaction');
  const sub = [cat?.name, tx.note && tx.merchant ? tx.note : null, formatTime(tx.occurred_at)].filter(Boolean).join(' · ');
  const label = `${title}, ${sign === '−' ? 'spent' : sign === '+' ? 'received' : 'moved'} ${formatMoney(tx.amount, tx.currency)}, ${sub}`;
  return (
    <Press onPress={onPress} onLongPress={onLongPress} accessibilityLabel={tx.excluded ? `${label}, not counted in totals` : label} scale={0.985} style={{ opacity: tx.excluded ? 0.55 : 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderRadius: radius.md }}>
      {tx.type === 'transfer' ? <IconTile size={46} icon="swap" /> : <CategoryDot cat={cat} />}
      <View style={{ flex: 1 }}>
        <Text v="title" numberOfLines={1}>{title}</Text>
        <Text v="small" color={colors.textMuted} numberOfLines={1}>{sub}</Text>
        {tx.excluded ? <View style={{ marginTop: 4 }}><Tag label="Not counted" /></View> : null}
      </View>
      <Money size="md" color={color} text={`${sign}${formatMoney(tx.amount, tx.currency, { trimZeros: true })}`} align="right" />
    </Press>
  );
}
