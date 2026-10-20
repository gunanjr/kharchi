import React, { useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { SubScreen, Card, Text, Row, Button, Field, IconTile, Segmented, Tag, ProgressBar as Bar } from '@/components/ui';
import { Glyph } from '@/components/Icon';
import { categoryGlyph } from '@/components/glyphs';
import { EmptyState } from '@/components/Feedback';
import { Sheet } from '@/components/Sheet';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { listBudgets, setBudget, removeBudget, spendByCategory, totalsBetween } from '@/features/tracker/repo';
import { budgetProgress, type BudgetProgress } from '@/features/tracker/budgets';
import { useCategories } from '@/features/tracker/hooks';
import { CategoryChips } from '@/components/CategoryPicker';
import { daysInMonth, endOfMonth, startOfMonth } from '@/lib/date';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space, toneOf } from '@/theme/tokens';

const cmp = (n: number) => formatMoney(n, 'INR', { compact: true });
const whole = (n: number) => formatMoney(Math.round(n / 100) * 100, 'INR', { trimZeros: true });
const STATUS: Record<BudgetProgress['status'], { label: string; tone: 'income' | 'warn' | 'expense'; order: number }> = {
  over: { label: 'Over', tone: 'expense', order: 0 }, warn: { label: 'Close', tone: 'warn', order: 1 }, ok: { label: 'On track', tone: 'income', order: 2 },
};

/** Add or change a budget (overall, or one category). Editing an existing one also offers Remove. */
function BudgetForm({ editing, onDone }: { editing: BudgetProgress | null; onDone: () => void }) {
  const db = useDb();
  const { categories } = useCategories();
  const [overall, setOverall] = useState(editing ? editing.budget.category_id === null : true);
  const [cat, setCat] = useState<string | null>(editing?.budget.category_id ?? null);
  const [amount, setAmount] = useState(editing ? String(Math.round(editing.budget.amount / 100)) : '');
  async function save() {
    const m = parseAmountToMinor(amount);
    if (!m) return toast('Enter a monthly limit');
    if (!overall && !cat) return toast('Pick a category');
    await setBudget(db, overall ? null : cat, m);
    bumpData();
    toast('Budget saved');
    onDone();
  }
  function remove() {
    if (!editing) return;
    Alert.alert('Remove this budget?', 'Your spending stays; only the limit goes.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await removeBudget(db, editing.budget.id); bumpData(); onDone(); } },
    ]);
  }
  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 600 }} contentContainerStyle={{ gap: space.lg, padding: space.lg }}>
      <Text v="h2">{editing ? 'Edit budget' : 'New budget'}</Text>
      {!editing ? <Segmented options={[{ key: 'overall', label: 'Whole month' }, { key: 'category', label: 'One category' }]} value={overall ? 'overall' : 'category'} onChange={(k) => setOverall(k === 'overall')} /> : null}
      {!overall && !editing ? <Row style={{ flexWrap: 'wrap', gap: space.sm }}><CategoryChips categories={categories.filter((c) => c.kind === 'expense')} value={cat} onChange={setCat} /></Row> : null}
      <Field label="Monthly limit (₹)" value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="10000" autoFocus />
      <Button title="Save budget" kind="accent" onPress={save} />
      {editing ? <Button title="Remove budget" kind="ghost" onPress={remove} /> : null}
    </ScrollView>
  );
}

/** Budgets: a monthly summary first, then every limit sorted by what needs attention. Tap one to change it. */
export default function Budgets() {
  const { colors } = useTheme();
  const { byId } = useCategories();
  const [sheet, setSheet] = useState<BudgetProgress | 'new' | null>(null);
  const now = Date.now();
  const q = useQuery(async (d) => {
    const budgets = await listBudgets(d);
    const by = await spendByCategory(d, startOfMonth(now), endOfMonth(now));
    const tot = await totalsBetween(d, startOfMonth(now), endOfMonth(now));
    return budgets.map((b) => budgetProgress(b, b.category_id ? (by.find((x) => x.category_id === b.category_id)?.total ?? 0) : tot.expense, new Date(now).getDate(), daysInMonth(now)));
  }, []);
  const all = q.data ?? [];
  const overall = all.find((p) => p.budget.category_id === null);
  const cats = all.filter((p) => p.budget.category_id !== null).sort((a, b) => STATUS[a.status].order - STATUS[b.status].order || b.pct - a.pct);
  const count = (s: BudgetProgress['status']) => cats.filter((p) => p.status === s).length;
  const daysLeft = daysInMonth(now) - new Date(now).getDate();

  return (
    <SubScreen title="Budgets" right={<Button title="New" size="sm" icon="plus" onPress={() => setSheet('new')} />}>
      {q.data && all.length === 0 ? <EmptyState art="chart" title="No budgets yet" body="Set a monthly limit and get a nudge before you cross it." action="Set a budget" onAction={() => setSheet('new')} /> : null}
      {all.length > 0 ? (
        <Card tone="ink" style={{ gap: space.md }} onPress={overall ? () => setSheet(overall) : () => setSheet('new')} accessibilityLabel="This month's budget">
          <Row style={{ justifyContent: 'space-between' }}>
            <Text v="caps" color={colors.onHeroMuted}>THIS MONTH · {daysLeft} DAYS LEFT</Text>
            {overall ? <Tag label={STATUS[overall.status].label} tone={STATUS[overall.status].tone} /> : null}
          </Row>
          {overall ? (
            <>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: 32, color: colors.onHero }}>{overall.remaining >= 0 ? `${cmp(overall.remaining)} left` : `${cmp(-overall.remaining)} over`}</Text>
              <Bar value={overall.pct / 100} over={overall.status === 'over'} color={overall.status === 'warn' ? colors.warn : colors.primary} height={10} />
              <Text v="small" color={colors.onHeroMuted}>{whole(overall.spent)} of {whole(overall.budget.amount)} · on pace for {cmp(overall.projected)}</Text>
            </>
          ) : <Text v="small" color={colors.onHeroMuted}>Add a whole-month limit to see how the month is going overall.</Text>}
          {cats.length ? (
            <Row style={{ gap: space.sm, borderTopWidth: 1, borderTopColor: colors.onHeroLine, paddingTop: space.md }}>
              {(['ok', 'warn', 'over'] as const).map((s) => (
                <View key={s} style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.brandBlack, fontSize: 22, color: colors.onHero }}>{count(s)}</Text>
                  <Text v="small" color={colors.onHeroMuted}>{STATUS[s].label.toLowerCase()}</Text>
                </View>
              ))}
            </Row>
          ) : null}
        </Card>
      ) : null}
      {cats.map((p) => {
        const c = byId.get(p.budget.category_id!);
        const st = STATUS[p.status];
        return (
          <Card key={p.budget.id} onPress={() => setSheet(p)} accessibilityLabel={`${c?.name ?? 'Category'} budget, ${st.label}`} style={{ gap: space.md }}>
            <Row style={{ gap: space.md }}>
              <IconTile size={40} color={toneOf(c?.color)}><Glyph name={(c && categoryGlyph(c)) || 'flag-outline'} size={19} color={toneOf(c?.color)} /></IconTile>
              <View style={{ flex: 1 }}>
                <Text v="title" numberOfLines={1}>{c?.name ?? 'Category'}</Text>
                <Text v="small" color={colors.textMuted}>{whole(p.spent)} of {whole(p.budget.amount)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Tag label={st.label} tone={st.tone} />
                <Text style={{ fontFamily: fonts.brandBlack, fontSize: 16, color: p.status === 'over' ? colors.expense : colors.text }}>{p.remaining >= 0 ? `${cmp(p.remaining)} left` : `${cmp(-p.remaining)} over`}</Text>
              </View>
            </Row>
            <Bar value={p.pct / 100} over={p.status === 'over'} color={p.status === 'warn' ? colors.warn : c ? toneOf(c.color) : colors.primary} height={8} />
            <Text v="small" color={colors.textMuted}>{p.pct}% used · on pace for {cmp(p.projected)}</Text>
          </Card>
        );
      })}
      <Modal visible={sheet !== null} transparent animationType="none" onRequestClose={() => setSheet(null)}>
        <Sheet onClose={() => setSheet(null)}>{sheet !== null ? <BudgetForm editing={sheet === 'new' ? null : sheet} onDone={() => setSheet(null)} /> : null}</Sheet>
      </Modal>
      <ToastHost />
    </SubScreen>
  );
}
