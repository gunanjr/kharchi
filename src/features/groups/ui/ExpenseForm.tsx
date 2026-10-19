import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { Button, Card, Chip, Field, Row, Text, Money } from '@/components/ui';
import { CategoryChips } from '@/components/CategoryPicker';
import { toast } from '@/components/Toast';
import { useCategories } from '@/features/tracker/hooks';
import { useDb, bumpData } from '@/db/provider';
import { computeShares, SPLIT_LABELS, SplitError, validatePayers, type SplitInput } from '../split';
import { addGroupExpense, ensureSelf, updateGroupExpense, type StoredExpense } from '../repo';
import { formatMoney, parseAmountToMinor, CURRENCIES } from '@/domain/money';
import type { Person, SplitType } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { space, radius, type as T } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { Comments } from './Comments';
import { prefillSplit } from '../editPrefill';

type Item = { desc: string; amount: string; who: string[] };

export function GroupExpenseForm({ groupId, members, groupCurrency, existing, onDone }: {
  groupId: string | null; members: Person[]; groupCurrency: string; existing?: StoredExpense; onDone: () => void;
}) {
  const db = useDb();
  const { colors } = useTheme();
  const { categories } = useCategories();
  const [meId, setMeId] = useState('');
  const [desc, setDesc] = useState(existing?.description ?? '');
  const [amountText, setAmountText] = useState(existing ? String(existing.amount / 100) : '');
  const [currency, setCurrency] = useState(existing?.currency ?? groupCurrency);
  const [rateText, setRateText] = useState(existing && existing.rate !== 1 ? String(existing.rate) : '');
  const [cat, setCat] = useState<string | null>(existing?.category_id ?? null);
  const prefill = useMemo(() => (existing ? prefillSplit(existing) : null), [existing]);
  const [type, setType] = useState<SplitType>(prefill?.type ?? 'equal');
  const [who, setWho] = useState<string[]>(existing ? Object.keys(existing.shares) : members.map((m) => m.id));
  const [vals, setVals] = useState<Record<string, string>>(prefill?.vals ?? {});
  const [payerIds, setPayerIds] = useState<string[]>(existing ? Object.keys(existing.payers) : []);
  const [payerVals, setPayerVals] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Item[]>([{ desc: '', amount: '', who: members.map((m) => m.id) }]);
  const [extraText, setExtraText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { ensureSelf(db).then((m) => { setMeId(m.id); if (!existing) setPayerIds([m.id]); }); }, [db, existing]);

  const total = parseAmountToMinor(amountText, currency) ?? 0;
  const foreign = currency !== groupCurrency;
  const rate = foreign ? Number(rateText) || 0 : 1;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? '?';
  const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  const num = (id: string) => Number(vals[id] ?? '') || 0;
  const minor = (id: string) => parseAmountToMinor(vals[id] ?? '', currency) ?? 0;

  const split: SplitInput | null = useMemo(() => {
    switch (type) {
      case 'equal': return { type, participants: who };
      case 'exact': return { type, amounts: Object.fromEntries(who.map((id) => [id, minor(id)])) };
      case 'percent': return { type, percents: Object.fromEntries(who.map((id) => [id, num(id)])) };
      case 'shares': return { type, shares: Object.fromEntries(who.map((id) => [id, vals[id] === undefined ? 1 : num(id)])) };
      case 'adjustment': return { type, participants: who, adjustments: Object.fromEntries(who.map((id) => [id, minor(id)])) };
      case 'itemized': return {
        type,
        items: items.map((i) => ({ amount: parseAmountToMinor(i.amount, currency) ?? 0, participants: i.who })).filter((i) => i.amount > 0),
        extra: parseAmountToMinor(extraText, currency) ?? 0,
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, who, vals, items, extraText, currency]);

  // itemized: the total is derived from items + extra
  const itemizedTotal = type === 'itemized' ? items.reduce((a, i) => a + (parseAmountToMinor(i.amount, currency) ?? 0), 0) + (parseAmountToMinor(extraText, currency) ?? 0) : 0;
  const effectiveTotal = type === 'itemized' ? itemizedTotal : total;

  const payers: Record<string, number> = useMemo(() => {
    if (payerIds.length <= 1) return payerIds.length ? { [payerIds[0]]: effectiveTotal } : {};
    return Object.fromEntries(payerIds.map((id) => [id, parseAmountToMinor(payerVals[id] ?? '', currency) ?? 0]));
  }, [payerIds, payerVals, effectiveTotal, currency]);

  const preview = useMemo(() => {
    if (effectiveTotal <= 0 || !split) return { error: null as string | null, shares: null as Record<string, number> | null };
    try {
      const shares = computeShares(effectiveTotal, split);
      validatePayers(effectiveTotal, payers);
      return { error: null, shares };
    } catch (e) {
      return { error: e instanceof SplitError ? e.message : (e as Error).message, shares: null };
    }
  }, [effectiveTotal, split, payers]);

  const canSave = !!desc.trim() && effectiveTotal > 0 && !preview.error && !!preview.shares && (!foreign || rate > 0);

  async function save() {
    if (!canSave || !split) return;
    setSaving(true);
    try {
      const input = { groupId, description: desc, amount: effectiveTotal, currency, rate, categoryId: cat, payers, split, occurredAt: existing?.occurred_at };
      if (existing) await updateGroupExpense(db, existing.id, input);
      else await addGroupExpense(db, input);
      haptic.success();
      bumpData();
      toast(existing ? 'Expense updated' : 'Expense added');
      onDone();
    } catch (e) {
      haptic.warn();
      toast((e as Error).message);
      setSaving(false);
    }
  }

  const inputStyle = [T.body, { color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, minHeight: 48, paddingHorizontal: space.md, minWidth: 96, textAlign: 'right' as const }];
  const hint = type === 'exact' ? 'amount' : type === 'percent' ? '%' : type === 'shares' ? 'shares' : type === 'adjustment' ? '+/− extra' : '';

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.md, paddingTop: space.sm, paddingBottom: 60 }}>
      <Field label="Description" value={desc} onChangeText={setDesc} placeholder="Dinner at Fisherman's Wharf" />
      {type !== 'itemized' && (
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><Field label="Amount" value={amountText} onChangeText={(t) => setAmountText(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="0" /></View>
          <Row style={{ gap: 4 }}>
            {[...new Set([groupCurrency, 'INR', 'USD', 'EUR'])].filter((c) => c in CURRENCIES).slice(0, 4).map((c) => <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />)}
          </Row>
        </View>
      )}
      {foreign && <Field label={`Rate: 1 ${currency} = ? ${groupCurrency}`} value={rateText} onChangeText={setRateText} keyboardType="decimal-pad" placeholder="83.50" />}
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}><CategoryChips categories={categories.filter((c) => c.kind === 'expense')} value={cat} onChange={setCat} /></Row>

      <Text v="caps" color={colors.textMuted}>PAID BY</Text>
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
        {members.map((m) => <Chip key={m.id} label={m.id === meId ? 'You' : m.name} selected={payerIds.includes(m.id)} onPress={() => setPayerIds((p) => (p.length === 1 && p[0] === m.id ? p : toggle(p, m.id)))} />)}
      </Row>
      {payerIds.length > 1 && payerIds.map((id) => (
        <Row key={id} style={{ justifyContent: 'space-between' }}>
          <Text>{id === meId ? 'You' : nameOf(id)} paid</Text>
          <TextInput accessibilityLabel={`${nameOf(id)} paid`} value={payerVals[id] ?? ''} onChangeText={(t) => setPayerVals({ ...payerVals, [id]: t.replace(/[^\d.]/g, '') })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textSubtle} style={inputStyle} />
        </Row>
      ))}

      <Text v="caps" color={colors.textMuted}>SPLIT</Text>
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
        {(Object.keys(SPLIT_LABELS) as SplitType[]).map((k) => <Chip key={k} label={SPLIT_LABELS[k]} selected={type === k} onPress={() => setType(k)} />)}
      </Row>

      {type !== 'itemized' && (
        <Card style={{ gap: space.sm }}>
          {members.map((m) => {
            const on = who.includes(m.id);
            return (
              <Row key={m.id} style={{ justifyContent: 'space-between', minHeight: 48 }}>
                <Chip label={m.id === meId ? 'You' : m.name} selected={on} onPress={() => setWho(toggle(who, m.id))} />
                {on && type !== 'equal' ? (
                  <TextInput accessibilityLabel={`${m.name} ${hint}`} value={vals[m.id] ?? (type === 'shares' ? '1' : '')} onChangeText={(t) => setVals({ ...vals, [m.id]: t.replace(/[^\d.-]/g, '') })} keyboardType="numbers-and-punctuation" placeholder={hint} placeholderTextColor={colors.textSubtle} style={inputStyle} />
                ) : on && preview.shares ? (
                  <Money size="sm" align="right" text={formatMoney(preview.shares[m.id] ?? 0, currency, { trimZeros: true })} />
                ) : null}
              </Row>
            );
          })}
        </Card>
      )}

      {type === 'itemized' && (
        <View style={{ gap: space.md }}>
          {items.map((it, idx) => (
            <Card key={idx} style={{ gap: space.sm }}>
              <Row>
                <View style={{ flex: 1 }}><Field label={`Item ${idx + 1}`} value={it.desc} onChangeText={(t) => setItems(items.map((x, i) => (i === idx ? { ...x, desc: t } : x)))} placeholder="Paneer tikka" /></View>
                <View style={{ width: 110 }}><Field label="Price" value={it.amount} onChangeText={(t) => setItems(items.map((x, i) => (i === idx ? { ...x, amount: t.replace(/[^\d.]/g, '') } : x)))} keyboardType="decimal-pad" /></View>
              </Row>
              <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
                {members.map((m) => <Chip key={m.id} label={m.id === meId ? 'You' : m.name} selected={it.who.includes(m.id)} onPress={() => setItems(items.map((x, i) => (i === idx ? { ...x, who: toggle(x.who, m.id) } : x)))} />)}
              </Row>
            </Card>
          ))}
          <Row><Button title="Add item" icon="plus" kind="secondary" size="sm" onPress={() => setItems([...items, { desc: '', amount: '', who: members.map((m) => m.id) }])} /></Row>
          <Field label="Tax / tip / service charge (split in proportion)" value={extraText} onChangeText={(t) => setExtraText(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" />
          <Text v="title">Total {formatMoney(itemizedTotal, currency)}</Text>
          {preview.shares && <Card>{Object.entries(preview.shares).map(([id, v]) => <Row key={id} style={{ justifyContent: 'space-between' }}><Text>{id === meId ? 'You' : nameOf(id)}</Text><Money size="sm" align="right" text={formatMoney(v, currency)} /></Row>)}</Card>}
        </View>
      )}

      {preview.error && effectiveTotal > 0 ? <Text color={colors.danger} accessibilityRole="alert">{preview.error}</Text> : null}
      <Button title={existing ? 'Save changes' : 'Add expense'} onPress={save} disabled={!canSave} loading={saving} />
      {existing ? <Comments expenseId={existing.id} members={members} /> : null}
    </ScrollView>
  );
}
