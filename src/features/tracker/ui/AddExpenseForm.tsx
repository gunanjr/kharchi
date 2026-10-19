import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useDb, bumpData } from '@/db/provider';
import { Button, Chip, Row, Text, Segmented } from '@/components/ui';
import { CategoryChips } from '@/components/CategoryPicker';
import { useTheme } from '@/theme/ThemeProvider';
import { accountGlyph } from '@/components/glyphs';
import { radius, space, type as T } from '@/theme/tokens';
import { parseAmountToMinor, formatMoney } from '@/domain/money';
import { addTransaction } from '@/features/tracker/repo';
import { parseTags } from '@/features/tracker/tags';
import { loadFrequent, type Frequent } from '@/features/tracker/frequent';
import { useAccounts, useCategories } from '@/features/tracker/hooks';
import { suggestCategory, learnMerchant } from '@/features/parser/merchants';
import { useSettings } from '@/store/settings';
import { haptic } from '@/lib/haptics';
import { toast } from '@/components/Toast';
import { DAY, startOfDay } from '@/lib/date';
import type { TxType } from '@/domain/types';

/** Used by the full Add modal and by the Quick Add drop-down panel (compact). */
export function AddExpenseForm({ compact, onDone, initialType = 'expense' }: { compact?: boolean; onDone: () => void; initialType?: TxType }) {
  const db = useDb();
  const { colors } = useTheme();
  const currency = useSettings((s) => s.currency);
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const [type, setType] = useState<TxType>(initialType);
  const [amountText, setAmountText] = useState('');
  const [what, setWhat] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [touchedCat, setTouchedCat] = useState(false);
  const [suggested, setSuggested] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [tagText, setTagText] = useState('');
  const [frequent, setFrequent] = useState<Frequent[]>([]);
  useEffect(() => { loadFrequent(db).then(setFrequent).catch(() => {}); }, [db]);
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!what.trim() || touchedCat) return;
    let live = true;
    suggestCategory(db, what).then((s) => {
      if (!live) return;
      setSuggested(s.categoryId);
      if (s.categoryId) setCategoryId(s.categoryId);
    });
    return () => { live = false; };
  }, [what, db, touchedCat]);

  const minor = parseAmountToMinor(amountText, currency);
  const kinds = useMemo(() => categories.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense')), [categories, type]);
  const valid = !!minor && minor > 0 && (type !== 'transfer' || (!!accountId && !!toAccountId && accountId !== toAccountId));

  async function save() {
    if (!valid || !minor || saving) return;
    setSaving(true);
    try {
      const when = dayOffset === 0 ? Date.now() : startOfDay(Date.now()) - dayOffset * DAY + 12 * 3600_000;
      await addTransaction(db, {
        type, amount: minor, currency, category_id: type === 'transfer' ? null : categoryId,
        account_id: accountId, to_account_id: type === 'transfer' ? toAccountId : null,
        merchant: what.trim() || null, tags: parseTags(tagText), occurred_at: when, source: compact ? 'quick' : 'manual',
      });
      if (categoryId && what.trim() && type !== 'transfer') await learnMerchant(db, what.trim(), categoryId);
      haptic.success();
      bumpData();
      toast(`${formatMoney(minor, currency, { trimZeros: true })} saved`);
      onDone();
    } catch (e) {
      haptic.warn();
      toast(`Couldn't save: ${(e as Error).message}`);
      setSaving(false);
    }
  }

  return (
    <View style={{ gap: space.md }}>
      {!compact && (
        <Segmented
          options={(['expense', 'income', 'transfer'] as TxType[]).map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1) }))}
          value={type}
          onChange={(k) => { setType(k); setCategoryId(null); setTouchedCat(false); }}
        />
      )}
      {!compact && frequent.length > 0 && type === 'expense' && !amountText && !what ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}>
          {frequent.map((f) => (
            <Chip key={f.merchant} label={`${f.merchant} ${formatMoney(f.amount, currency, { trimZeros: true })}`} onPress={() => { setAmountText(String(f.amount / 100)); setWhat(f.merchant); setCategoryId(f.categoryId); setTouchedCat(true); haptic.light(); }} />
          ))}
        </ScrollView>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, paddingHorizontal: space.lg, minHeight: 84 }}>
        <Text v="h1" color={colors.textSubtle}>{currency === 'INR' ? '₹' : currency}</Text>
        <TextInput
          ref={amountRef}
          value={amountText}
          onChangeText={(t) => setAmountText(t.replace(/[^\d.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel="Amount"
          style={[T.hero, { color: colors.text, flex: 1, minWidth: 0, fontVariant: ['tabular-nums'], paddingVertical: 4 }]}
        />
      </View>
      <TextInput
        value={what}
        onChangeText={(t) => { setWhat(t); }}
        placeholder={type === 'income' ? 'Where from?' : 'What was this for?'}
        placeholderTextColor={colors.textSubtle}
        accessibilityLabel="What was this for"
        returnKeyType="done"
        onSubmitEditing={save}
        style={[T.body, { color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, minHeight: 52, paddingHorizontal: space.lg }]}
      />
      {type !== 'transfer' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }}>
          <CategoryChips categories={kinds} value={categoryId} suggestedId={suggested} onChange={(id) => { setCategoryId(id); setTouchedCat(true); }} />
        </ScrollView>
      )}
      {!compact && (
        <>
          <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
            <Chip label="Today" selected={dayOffset === 0} onPress={() => setDayOffset(0)} />
            <Chip label="Yesterday" selected={dayOffset === 1} onPress={() => setDayOffset(1)} />
            <Chip label="2 days ago" selected={dayOffset === 2} onPress={() => setDayOffset(2)} />
          </Row>
          <TextInput
            value={tagText}
            onChangeText={setTagText}
            placeholder="Tags, e.g. goa trip, work"
            placeholderTextColor={colors.textSubtle}
            accessibilityLabel="Tags"
            autoCapitalize="none"
            style={[T.body, { color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, minHeight: 52, paddingHorizontal: space.lg }]}
          />
          <Text v="caps" color={colors.textMuted}>{type === 'transfer' ? 'FROM' : 'ACCOUNT'}</Text>
          <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
            {accounts.map((a) => (
              <Chip key={a.id} label={a.name} glyph={accountGlyph(a.type)} selected={accountId === a.id} onPress={() => setAccountId(accountId === a.id ? null : a.id)} />
            ))}
          </Row>
          {type === 'transfer' && (
            <>
              <Text v="caps" color={colors.textMuted}>TO</Text>
              <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
                {accounts.map((a) => (
                  <Chip key={a.id} label={a.name} glyph={accountGlyph(a.type)} selected={toAccountId === a.id} onPress={() => setToAccountId(a.id)} />
                ))}
              </Row>
            </>
          )}
        </>
      )}
      <Button title="Save" onPress={save} disabled={!valid} loading={saving} />
    </View>
  );
}
