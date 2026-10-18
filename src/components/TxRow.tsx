import React from 'react';
import { Pressable, View } from 'react-native';
import { Text, MoneyText } from './ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';
import { formatMoney } from '@/domain/money';
import { formatTime } from '@/lib/date';
import type { Category, Transaction } from '@/domain/types';

export function CategoryDot({ cat, size = 44 }: { cat?: Category | null; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: (cat?.color ?? colors.textMuted) + '26', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.46 }}>{cat?.icon ?? '❔'}</Text>
    </View>
  );
}

export function TxRow({ tx, cat, onPress }: { tx: Transaction; cat?: Category | null; onPress?: () => void }) {
  const { colors } = useTheme();
  const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '';
  const color = tx.type === 'income' ? colors.income : tx.type === 'expense' ? colors.text : colors.textMuted;
  const title = tx.merchant || tx.note || cat?.name || (tx.type === 'transfer' ? 'Transfer' : 'Transaction');
  const sub = [cat?.name, tx.note && tx.merchant ? tx.note : null, formatTime(tx.occurred_at)].filter(Boolean).join(' · ');
  const label = `${title}, ${sign === '−' ? 'spent' : sign === '+' ? 'received' : 'moved'} ${formatMoney(tx.amount, tx.currency)}, ${sub}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, opacity: pressed ? 0.7 : 1, borderRadius: radius.md })}
    >
      <CategoryDot cat={cat} />
      <View style={{ flex: 1 }}>
        <Text v="title" numberOfLines={1}>{title}</Text>
        <Text v="small" color={colors.textMuted} numberOfLines={1}>{sub}</Text>
      </View>
      <MoneyText v="money" color={color}>{sign}{formatMoney(tx.amount, tx.currency, { trimZeros: true })}</MoneyText>
    </Pressable>
  );
}
