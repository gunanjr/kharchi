import React, { useState } from 'react';
import { SubScreen, Card, Text, Row, Button, Field, IconTile, Segmented, ProgressBar as Bar } from '@/components/ui';
import { Glyph } from '@/components/Icon';
import { categoryGlyph } from '@/components/glyphs';
import { EmptyState } from '@/components/Feedback';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { listBudgets, setBudget, removeBudget, spendByCategory, totalsBetween } from '@/features/tracker/repo';
import { budgetProgress } from '@/features/tracker/budgets';
import { useCategories } from '@/features/tracker/hooks';
import { CategoryChips } from '@/components/CategoryPicker';
import { daysInMonth, endOfMonth, startOfMonth } from '@/lib/date';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { space, toneOf } from '@/theme/tokens';

export default function Budgets() {
  const db = useDb();
  const { colors } = useTheme();
  const { byId, categories } = useCategories();
  const [cat, setCat] = useState<string | null>(null);
  const [overall, setOverall] = useState(true);
  const [amount, setAmount] = useState('');
  const q = useQuery(async (d) => {
    const now = Date.now();
    const budgets = await listBudgets(d);
    const by = await spendByCategory(d, startOfMonth(now), endOfMonth(now));
    const tot = await totalsBetween(d, startOfMonth(now), endOfMonth(now));
    return budgets.map((b) => budgetProgress(b, b.category_id ? (by.find((x) => x.category_id === b.category_id)?.total ?? 0) : tot.expense, new Date(now).getDate(), daysInMonth(now)));
  }, []);

  async function add() {
    const m = parseAmountToMinor(amount);
    if (!m) return toast('Enter an amount');
    if (!overall && !cat) return toast('Pick a category');
    await setBudget(db, overall ? null : cat, m);
    setAmount('');
    bumpData();
    toast('Budget saved');
  }

  return (
    <SubScreen title="Budgets">
      {q.data?.length === 0 && <EmptyState art="chart" title="No budgets yet" body="Set a monthly limit and get a nudge before you cross it." />}
      {q.data?.map((p) => {
        const c = p.budget.category_id ? byId.get(p.budget.category_id) : null;
        return (
          <Card key={p.budget.id} style={{ gap: space.md }}>
            <Row style={{ justifyContent: 'space-between', gap: space.md }}>
              <Row style={{ flex: 1, gap: space.md }}>
                <IconTile size={40} color={toneOf(c?.color)}>
                  <Glyph name={(c && categoryGlyph(c)) || 'flag-outline'} size={19} color={toneOf(c?.color)} />
                </IconTile>
                <Text v="title" numberOfLines={1} style={{ flex: 1 }}>{c ? c.name : 'Overall monthly'}</Text>
              </Row>
              <Button title="Remove" kind="ghost" size="sm" onPress={async () => { await removeBudget(db, p.budget.id); bumpData(); }} />
            </Row>
            <Bar value={p.pct / 100} over={p.status === 'over'} color={p.status === 'warn' ? colors.warn : c ? toneOf(c.color) : colors.primary} height={10} />
            <Text v="small" color={colors.textMuted}>
              {formatMoney(p.spent, 'INR', { trimZeros: true })} of {formatMoney(p.budget.amount, 'INR', { trimZeros: true })} · on pace for {formatMoney(p.projected, 'INR', { compact: true })}
            </Text>
          </Card>
        );
      })}
      <Card style={{ gap: space.md }}>
        <Text v="h2">Set a budget</Text>
        <Segmented options={[{ key: 'overall', label: 'Overall' }, { key: 'category', label: 'Category' }]} value={overall ? 'overall' : 'category'} onChange={(k) => setOverall(k === 'overall')} />
        {!overall && <Row style={{ flexWrap: 'wrap', gap: space.sm }}><CategoryChips categories={categories.filter((c) => c.kind === 'expense')} value={cat} onChange={setCat} /></Row>}
        <Field label="Monthly limit (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="10000" />
        <Button title="Save budget" onPress={add} />
      </Card>
      <ToastHost />
    </SubScreen>
  );
}
