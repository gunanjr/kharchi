import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { Card, Chip, Row, Text, Button, Enter, MoneyText } from '@/components/ui';
import { CategoryDot } from '@/components/TxRow';
import { useCategories } from '@/features/tracker/hooks';
import { confirmPending, listPending, markNotMine, skipPending, setAlwaysCategorize } from './service';
import { formatMoney } from '@/domain/money';
import { formatDay, formatTime } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { categoryGlyph } from '@/components/glyphs';
import { layout, space, toneOf } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';
import { toast } from '@/components/Toast';
import type { PendingTx } from '@/domain/types';

const QUICK_EXPENSE = ['cat_food', 'cat_groceries', 'cat_transport', 'cat_shopping', 'cat_bills', 'cat_entertainment', 'cat_other'];
const QUICK_INCOME = ['cat_salary', 'cat_refund', 'cat_gift', 'cat_income_other'];

export function PendingStack() {
  const db = useDb();
  const { colors } = useTheme();
  const { byId } = useCategories();
  const { data } = useQuery((d) => listPending(d), []);
  const [offer, setOffer] = useState<{ merchant: string; categoryId: string } | null>(null);
  if (!data?.length && !offer) return null;

  async function pick(p: PendingTx, categoryId: string) {
    const r = await confirmPending(db, p.id, { categoryId });
    haptic.success();
    bumpData();
    if (r.offerAlways) setOffer(r.offerAlways);
    else toast(`Saved ${formatMoney(p.amount, p.currency, { trimZeros: true })}`);
  }

  return (
    <View style={{ gap: space.sm }}>
      <Row style={{ justifyContent: 'space-between', paddingHorizontal: layout.gutter }}>
        <Text v="h3">Needs your input</Text>
        {data?.length ? <Text v="small" color={colors.textMuted}>{data.length} waiting</Text> : null}
      </Row>
      {offer && (
        <Card style={{ marginHorizontal: layout.gutter, backgroundColor: colors.primarySoft, gap: space.sm }}>
          <Text v="title">Always categorise “{offer.merchant}” as {byId.get(offer.categoryId)?.name}?</Text>
          <Row style={{ gap: space.sm }}>
            <Button title="Yes, always" size="sm" onPress={async () => { await setAlwaysCategorize(db, offer.merchant, offer.categoryId); setOffer(null); toast('Got it. I’ll remember.'); }} />
            <Button title="Not now" kind="ghost" onPress={() => setOffer(null)} />
          </Row>
        </Card>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToAlignment="start" decelerationRate="fast" contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: 14, gap: space.md }} style={{ marginBottom: -14 }}>
        {(data ?? []).map((p, i) => {
          const sug = p.suggested_category_id ? byId.get(p.suggested_category_id) : null;
          const ids = (p.direction === 'debit' ? QUICK_EXPENSE : QUICK_INCOME).filter((id) => id !== p.suggested_category_id);
          return (
            <Enter key={p.id} i={i}>
              <Card style={{ width: 300, gap: space.md }}>
                <Row>
                  <CategoryDot cat={sug} />
                  <View style={{ flex: 1 }}>
                    <Text v="title" numberOfLines={1}>{p.direction === 'debit' ? 'Spent at' : 'Received from'} {p.merchant ?? 'unknown'}</Text>
                    <Text v="small" color={colors.textMuted}>{formatDay(p.occurred_at)} · {formatTime(p.occurred_at)}{p.account_last4 ? ` · •${p.account_last4}` : ''}</Text>
                  </View>
                  <MoneyText color={p.direction === 'credit' ? colors.income : colors.text}>{formatMoney(p.amount, p.currency, { trimZeros: true })}</MoneyText>
                </Row>
                <Text v="small" color={colors.textMuted}>What was this for?</Text>
                <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
                  {sug && <Chip label={sug.name} glyph={categoryGlyph(sug) ?? undefined} selected color={toneOf(sug.color)} onPress={() => pick(p, sug.id)} />}
                  {ids.slice(0, sug ? 3 : 4).map((id) => {
                    const c = byId.get(id);
                    return c ? <Chip key={id} label={c.name} glyph={categoryGlyph(c) ?? undefined} onPress={() => pick(p, id)} /> : null;
                  })}
                </Row>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Button title="Skip" kind="ghost" size="sm" onPress={async () => { await skipPending(db, p.id); bumpData(); }} />
                  <Button title="Isn't mine" kind="ghost" size="sm" onPress={async () => { await markNotMine(db, p.id); bumpData(); toast('Removed. I won’t ask again.'); }} />
                </Row>
              </Card>
            </Enter>
          );
        })}
      </ScrollView>
    </View>
  );
}
