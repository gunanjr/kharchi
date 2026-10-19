import React, { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { Button, Card, Row, Segmented, Tag, Text } from '@/components/ui';
import { CategoryChips } from '@/components/CategoryPicker';
import { useCategories } from '@/features/tracker/hooks';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import { formatDay } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, type as T } from '@/theme/tokens';

export type SuggestionSource = 'learned' | 'auto-rule' | 'keyword' | 'none';

export interface Draft {
  type: 'expense' | 'income';
  amount: number | null; // minor units
  description: string;
  categoryId: string | null;
  source: SuggestionSource;
  occurredAt: number;
}

const SOURCE_LABEL: Record<SuggestionSource, string> = {
  learned: 'From your earlier choices',
  'auto-rule': 'Your always-rule',
  keyword: 'Guessed from the words. Please check.',
  none: 'Pick a category',
};

/**
 * One review step for every capture path (shared message, voice, paste). It shows the amount large, a category with an
 * honest note on where the suggestion came from, lets everything be edited in place, and only saves on Save.
 */
export function DraftEditor({ draft, currency = 'INR', saved, saveLabel = 'Save', onChange, onSave, onDiscard, discardLabel = 'Discard', note }: {
  draft: Draft; currency?: string; saved?: boolean; saveLabel?: string; discardLabel?: string; note?: string;
  onChange: (d: Draft) => void; onSave: () => void; onDiscard: () => void;
}) {
  const { colors } = useTheme();
  const { categories } = useCategories();
  const [amountText, setAmountText] = useState(draft.amount ? String(draft.amount / 100) : '');
  const kinds = categories.filter((c) => c.kind === draft.type);
  const valid = !!draft.amount && draft.amount > 0;

  return (
    <Card style={{ gap: space.md, opacity: saved ? 0.6 : 1 }}>
      <Segmented
        options={[{ key: 'expense', label: 'Expense' }, { key: 'income', label: 'Income' }]}
        value={draft.type}
        onChange={(t) => onChange({ ...draft, type: t, categoryId: null, source: 'none' })}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, paddingHorizontal: space.lg, minHeight: 80 }}>
        <Text v="h1" color={colors.textSubtle}>{currency === 'INR' ? '₹' : currency}</Text>
        <TextInput
          value={amountText}
          onChangeText={(t) => { const v = t.replace(/[^\d.]/g, ''); setAmountText(v); onChange({ ...draft, amount: parseAmountToMinor(v, currency) }); }}
          keyboardType="decimal-pad" placeholder="Amount" placeholderTextColor={colors.textSubtle} accessibilityLabel="Amount"
          style={[T.hero, { color: colors.text, flex: 1, minWidth: 0, fontVariant: ['tabular-nums'], paddingVertical: 4 }]}
        />
      </View>
      {!valid ? <Text v="small" color={colors.expense} accessibilityRole="alert">I could not read an amount. Type it above.</Text> : null}
      <TextInput
        value={draft.description} onChangeText={(t) => onChange({ ...draft, description: t })} placeholder={draft.type === 'income' ? 'Where from?' : 'What was this for?'}
        placeholderTextColor={colors.textSubtle} accessibilityLabel="Description"
        style={[T.body, { color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, minHeight: 52, paddingHorizontal: space.lg }]}
      />
      <Row style={{ justifyContent: 'space-between', gap: space.sm }}>
        <Text v="caps" color={colors.textMuted}>CATEGORY</Text>
        <Tag label={SOURCE_LABEL[draft.source]} tone={draft.source === 'keyword' || draft.source === 'none' ? 'warn' : 'neutral'} />
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}>
        <CategoryChips categories={kinds} value={draft.categoryId} onChange={(id) => onChange({ ...draft, categoryId: id, source: 'learned' })} />
      </ScrollView>
      <Text v="small" color={colors.textMuted}>{formatDay(draft.occurredAt)}{note ? ` · ${note}` : ''}</Text>
      <Row style={{ gap: space.sm }}>
        <Button title={saved ? 'Saved' : valid ? `${saveLabel} ${formatMoney(draft.amount!, currency, { trimZeros: true })}` : saveLabel} onPress={onSave} disabled={!valid || saved} style={{ flex: 1 }} />
        <Button title={discardLabel} kind="ghost" onPress={onDiscard} disabled={saved} />
      </Row>
    </Card>
  );
}
