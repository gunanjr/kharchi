import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, TextInput, View } from 'react-native';
import { useDb, bumpData } from '@/db/provider';
import { Button, Chip, Row, Text, Press } from '@/components/ui';
import { CategoryChips } from '@/components/CategoryPicker';
import { Icon, type IconName } from '@/components/Icon';
import { toast } from '@/components/Toast';
import { useTheme } from '@/theme/ThemeProvider';
import { accountGlyph } from '@/components/glyphs';
import { fonts, radius, space, type as T } from '@/theme/tokens';
import { parseAmountToMinor, formatMoney } from '@/domain/money';
import { addTransaction } from '@/features/tracker/repo';
import { parseTags } from '@/features/tracker/tags';
import { loadFrequent, type Frequent } from '@/features/tracker/frequent';
import { useAccounts, useCategories } from '@/features/tracker/hooks';
import { suggestCategory, learnMerchant } from '@/features/parser/merchants';
import { canTakePhoto, captureReceiptPhoto, deleteReceipt, isPdf, pickPhoto } from '@/features/tracker/receipts';
import { BrandIcon } from '@/features/brands/BrandIcon';
import { MerchantTile } from '@/features/brands/MerchantTile';
import { suggestBrands } from '@/features/brands/match';
import { useSettings } from '@/store/settings';
import { haptic } from '@/lib/haptics';
import { DAY, startOfDay } from '@/lib/date';
import type { TxType } from '@/domain/types';

type Panel = 'date' | 'account' | 'tags' | 'photo' | null;
/** Indian digit grouping while typing, keeping what the user typed after the point. */
const formatTyped = (t: string) => { const [i, d] = t.split('.'); const n = Number(i || '0'); return (Number.isFinite(n) ? n.toLocaleString('en-IN') : i) + (d !== undefined ? `.${d}` : ''); };
const DAYS = ['Today', 'Yesterday', '2 days ago', '3 days ago'];
const TYPES: { key: TxType; label: string }[] = [{ key: 'expense', label: 'Expense' }, { key: 'income', label: 'Income' }, { key: 'transfer', label: 'Transfer' }];

/**
 * Add an entry in a few seconds. The amount is the hero; "what for" suggests merchants with their icons; category is one
 * row of chips; date, account, tags and photo fold into small pills so the sheet stays calm; Save is always visible.
 * Used by the full Add sheet and, with `compact`, by the Quick Add panel.
 */
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
  const [photo, setPhoto] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [frequent, setFrequent] = useState<Frequent[]>([]);
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  useEffect(() => { loadFrequent(db).then(setFrequent).catch(() => {}); }, [db]);
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
  const brands = type === 'transfer' ? [] : suggestBrands(what).filter((b) => b.name.toLowerCase() !== what.trim().toLowerCase());
  const tags = parseTags(tagText);
  const account = accounts.find((a) => a.id === accountId);
  const scroller = useRef<ScrollView>(null);
  const toggle = (p: Panel) => { setPanel(panel === p ? null : p); haptic.tap(); setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60); };

  async function grabPhoto(kind: 'camera' | 'gallery') {
    try {
      const uri = kind === 'camera' ? await captureReceiptPhoto() : await pickPhoto();
      if (uri) { if (photo) deleteReceipt(photo); setPhoto(uri); setPanel(null); haptic.light(); }
    } catch {
      toast('Couldn’t get that picture');
    }
  }

  async function save() {
    if (!valid || !minor || saving) return;
    setSaving(true);
    try {
      const when = dayOffset === 0 ? Date.now() : startOfDay(Date.now()) - dayOffset * DAY + 12 * 3600_000;
      await addTransaction(db, {
        type, amount: minor, currency, category_id: type === 'transfer' ? null : categoryId,
        account_id: accountId, to_account_id: type === 'transfer' ? toAccountId : null,
        merchant: what.trim() || null, tags, occurred_at: when, source: compact ? 'quick' : 'manual', receipt_uri: photo,
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

  const pill = (p: Exclude<Panel, null>, icon: IconName, label: string, set: boolean) => (
    <Press key={p} onPress={() => toggle(p)} accessibilityLabel={label} accessibilityState={{ expanded: panel === p }} scale={0.97}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: panel === p ? colors.ink : colors.border, backgroundColor: set ? colors.surfaceAlt : colors.surface }}>
      <Icon name={icon} size={15} color={set ? colors.text : colors.textMuted} />
      <Text v="small" color={set ? colors.text : colors.textMuted} style={{ fontFamily: 'Geist_600SemiBold' }} numberOfLines={1}>{label}</Text>
    </Press>
  );

  const accountChips = (value: string | null, onPick: (id: string | null) => void, allowNone: boolean) => (
    <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
      {accounts.map((a) => <Chip key={a.id} label={a.name} glyph={accountGlyph(a.type)} selected={value === a.id} onPress={() => { onPick(allowNone && value === a.id ? null : a.id); haptic.tap(); }} />)}
    </Row>
  );

  return (
    <View style={{ gap: space.md }}>
      <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: compact ? 420 : 470 }} contentContainerStyle={{ gap: space.lg, paddingBottom: space.sm }}>
        {!compact ? (
          <Row style={{ gap: 6, alignSelf: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 999, padding: 4 }}>
            {TYPES.map((t) => (
              <Press key={t.key} onPress={() => { setType(t.key); setCategoryId(null); setTouchedCat(false); setPanel(null); haptic.tap(); }} accessibilityLabel={t.label} accessibilityState={{ selected: type === t.key }}
                style={{ paddingHorizontal: 16, height: 34, borderRadius: 999, justifyContent: 'center', backgroundColor: type === t.key ? colors.ink : 'transparent' }}>
                <Text v="small" color={type === t.key ? colors.onInk : colors.textMuted} style={{ fontFamily: 'Geist_600SemiBold' }}>{t.label}</Text>
              </Press>
            ))}
          </Row>
        ) : null}

        {/* the amount is the hero */}
        <Press onPress={() => amountRef.current?.focus()} accessibilityRole="none" style={{ alignItems: 'center', gap: 2, paddingVertical: space.sm }}>
          {/* The visible amount is plain text; an invisible input on top takes the typing, so the ₹ always hugs the number. */}
          <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>
            <Row style={{ alignItems: 'flex-start', justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 28, lineHeight: 40, color: minor ? colors.text : colors.textSubtle, marginTop: 6, marginRight: 4 }}>{currency === 'INR' ? '₹' : currency}</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 56, lineHeight: 64, color: amountText ? colors.text : colors.textSubtle, fontVariant: ['tabular-nums'], letterSpacing: -1.5 }} numberOfLines={1} adjustsFontSizeToFit>{amountText ? formatTyped(amountText) : '0'}</Text>
            </Row>
            <TextInput
              ref={amountRef}
              value={amountText}
              onChangeText={(t) => setAmountText(t.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 12))}
              keyboardType="decimal-pad"
              accessibilityLabel="Amount"
              caretHidden
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.011, color: 'transparent' }}
            />
          </View>
          <Text v="small" color={colors.textSubtle}>{type === 'income' ? 'Money in' : type === 'transfer' ? 'Moving between your accounts' : DAYS[dayOffset]}{account && type !== 'transfer' ? ` · ${account.name}` : ''}</Text>
        </Press>

        {/* what for, with merchant icons */}
        {type !== 'transfer' ? (
          <View style={{ gap: space.sm }}>
            <Row style={{ gap: space.sm, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, paddingLeft: 8, paddingRight: space.md, minHeight: 56 }}>
              <MerchantTile name={what.trim() || null} size={38} fallback={<View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><Icon name="search" size={18} color={colors.textSubtle} /></View>} />
              <TextInput
                value={what}
                onChangeText={setWhat}
                placeholder={type === 'income' ? 'Where from?' : 'What was this for? Swiggy, rent, chai…'}
                placeholderTextColor={colors.textSubtle}
                accessibilityLabel="What was this for"
                returnKeyType="done"
                onSubmitEditing={save}
                style={[T.body, { flex: 1, color: colors.text, paddingVertical: 12 }]}
              />
              {what ? <Press onPress={() => setWhat('')} accessibilityLabel="Clear" hitSlop={10}><Icon name="x" size={16} color={colors.textSubtle} /></Press> : null}
            </Row>
            {brands.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.sm }}>
                {brands.map((b) => (
                  <Press key={b.name} onPress={() => { setWhat(b.name); haptic.light(); }} accessibilityLabel={`Use ${b.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 5, paddingLeft: 5, paddingRight: 14 }}>
                    <BrandIcon brand={b} size={28} />
                    <Text v="small" style={{ fontFamily: 'Geist_600SemiBold' }}>{b.name}</Text>
                  </Press>
                ))}
              </ScrollView>
            ) : !compact && frequent.length > 0 && type === 'expense' && !amountText && !what ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.sm, alignItems: 'center' }}>
                <Text v="caps" color={colors.textSubtle}>AGAIN?</Text>
                {frequent.map((f) => (
                  <Press key={f.merchant} onPress={() => { setAmountText(String(f.amount / 100)); setWhat(f.merchant); setCategoryId(f.categoryId); setTouchedCat(true); haptic.light(); }} accessibilityLabel={`${f.merchant} ${formatMoney(f.amount, currency)}`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 5, paddingLeft: 5, paddingRight: 14 }}>
                    <MerchantTile name={f.merchant} size={28} />
                    <Text v="small" style={{ fontFamily: 'Geist_600SemiBold' }}>{f.merchant} · {formatMoney(f.amount, currency, { trimZeros: true })}</Text>
                  </Press>
                ))}
              </ScrollView>
            ) : null}
          </View>
        ) : null}

        {/* category */}
        {type !== 'transfer' ? (
          <View style={{ gap: space.sm }}>
            <Text v="caps" color={colors.textMuted}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.sm }}>
              <CategoryChips categories={kinds} value={categoryId} suggestedId={suggested} onChange={(id) => { setCategoryId(id); setTouchedCat(true); }} />
            </ScrollView>
          </View>
        ) : (
          <View style={{ gap: space.md }}>
            <View style={{ gap: space.sm }}><Text v="caps" color={colors.textMuted}>FROM</Text>{accountChips(accountId, setAccountId, false)}</View>
            <View style={{ gap: space.sm }}><Text v="caps" color={colors.textMuted}>TO</Text>{accountChips(toAccountId, setToAccountId, false)}</View>
          </View>
        )}

        {/* details folded into pills */}
        {!compact ? (
          <View style={{ gap: space.sm }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.sm }}>
              {pill('date', 'calendar', DAYS[dayOffset], dayOffset !== 0)}
              {type !== 'transfer' ? pill('account', 'wallet', account?.name ?? 'Account', !!account) : null}
              {pill('tags', 'tag', tags.length ? tags.map((t) => `#${t}`).join(' ') : 'Tags', tags.length > 0)}
              {type !== 'transfer' ? pill('photo', 'camera', photo ? 'Photo added' : 'Photo', !!photo) : null}
            </ScrollView>
            {panel === 'date' ? (
              <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
                {DAYS.map((d, i) => <Chip key={d} label={d} selected={dayOffset === i} onPress={() => { setDayOffset(i); setPanel(null); haptic.tap(); }} />)}
              </Row>
            ) : panel === 'account' ? (
              accountChips(accountId, (id) => { setAccountId(id); setPanel(null); }, true)
            ) : panel === 'tags' ? (
              <TextInput autoFocus value={tagText} onChangeText={setTagText} placeholder="goa trip, work" placeholderTextColor={colors.textSubtle} accessibilityLabel="Tags" autoCapitalize="none" returnKeyType="done" onSubmitEditing={() => setPanel(null)}
                style={[T.body, { color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, minHeight: 48, paddingHorizontal: space.lg }]} />
            ) : panel === 'photo' ? (
              photo ? (
                <Row style={{ gap: space.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 8 }}>
                  {isPdf(photo) ? <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}><Icon name="tag" size={20} color={colors.textMuted} /></View> : <Image source={{ uri: photo }} style={{ width: 52, height: 52, borderRadius: 12 }} />}
                  <Text v="small" style={{ flex: 1 }}>Attached. Amount and photo are enough; details can wait.</Text>
                  <Button title="Remove" kind="ghost" size="sm" onPress={() => { deleteReceipt(photo); setPhoto(null); }} />
                </Row>
              ) : (
                <View style={{ gap: space.sm }}>
                  <Row style={{ gap: space.sm }}>
                    {canTakePhoto() ? <Button title="Camera" icon="camera" kind="secondary" onPress={() => grabPhoto('camera')} style={{ flex: 1 }} /> : null}
                    <Button title="Gallery" icon="image" kind="secondary" onPress={() => grabPhoto('gallery')} style={{ flex: 1 }} />
                  </Row>
                  <Text v="small" color={colors.textMuted}>Snap the bill and skip the typing. It stays on this phone.</Text>
                </View>
              )
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <Button title={valid && minor ? `Save ${formatMoney(minor, currency, { trimZeros: true })}` : type === 'transfer' && minor ? 'Pick both accounts' : 'Enter an amount'} onPress={save} disabled={!valid} loading={saving} />
    </View>
  );
}
