import React, { useEffect, useRef, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { SubScreen, Text, Chip, Row, Card, Segmented, IconTile, Button, ListRow, Group } from '@/components/ui';
import { Donut, BarList, LineArea } from '@/components/charts';
import { EmptyState } from '@/components/Feedback';
import { useDb, useQuery } from '@/db/provider';
import { insertRow } from '@/db/rows';
import { aiProvider, type AiAnswer } from '@/features/ai';
import { buildCatalog } from '@/features/ai/catalog';
import { listCategories, spendByCategory } from '@/features/tracker/repo';
import { endOfMonth, startOfMonth } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, space } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

interface Msg { id: string; role: 'user' | 'assistant'; text: string; chart?: AiAnswer['chart']; followUps?: string[] }

/**
 * Questions about your own money. The on-device assistant understands a fixed set of questions, so they are offered as
 * taps; there is deliberately no free text box that would promise more than it can answer.
 */
export default function Assistant() {
  const db = useDb();
  const { colors } = useTheme();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [group, setGroup] = useState('spending');
  const [picking, setPicking] = useState(true);
  const list = useRef<FlatList<Msg>>(null);
  const cat = useQuery(async (d) => {
    const now = Date.now();
    const cats = await listCategories(d);
    const by = await spendByCategory(d, startOfMonth(now), endOfMonth(now));
    return buildCatalog(cats, by.map((x) => x.category_id).filter((x): x is string => !!x), now);
  }, []);

  useEffect(() => {
    db.all<any>(`SELECT * FROM ai_messages WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 40`).then((rows) => {
      const m = rows.reverse().map((r) => {
        let p = {};
        try { p = r.payload ? JSON.parse(r.payload) : {}; } catch { /* unreadable old row: show the text only */ }
        return { id: r.id, role: r.role, text: r.text, ...p } as Msg;
      });
      setMsgs(m);
      setPicking(m.length === 0);
    }).catch(() => {});
  }, [db]);

  async function ask(q: string) {
    if (busy) return;
    setBusy(true);
    setPicking(false);
    haptic.tap();
    try {
      const uid = await insertRow(db, 'ai_messages', { role: 'user', text: q });
      setMsgs((m) => [...m, { id: uid, role: 'user', text: q }]);
      const a = await aiProvider.answer(q, { db, now: Date.now() });
      const id = await insertRow(db, 'ai_messages', { role: 'assistant', text: a.text, payload: JSON.stringify({ chart: a.chart, followUps: a.followUps }) });
      setMsgs((m) => [...m, { id, role: 'assistant', text: a.text, chart: a.chart, followUps: a.followUps }]);
    } catch {
      setMsgs((m) => [...m, { id: `err${Date.now()}`, role: 'assistant', text: 'I could not work that one out. Please try another question.' }]);
    } finally {
      setBusy(false);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  async function clear() {
    await db.run(`UPDATE ai_messages SET deleted_at=? WHERE deleted_at IS NULL`, [Date.now()]);
    setMsgs([]);
    setPicking(true);
  }

  const groups = cat.data ?? [];
  const current = groups.find((g) => g.key === group) ?? groups[0];

  return (
    <SubScreen title="Ask about your money" scroll={false} right={msgs.length ? <Button title="Clear" kind="ghost" size="sm" onPress={clear} /> : undefined}>
      <FlatList
        ref={list}
        data={msgs}
        keyExtractor={(m) => m.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingVertical: space.md, gap: space.lg, flexGrow: 1 }}
        ListEmptyComponent={<EmptyState art="chat" title="Pick a question" body="Answers are worked out on your phone from your own entries. Nothing is sent anywhere." />}
        renderItem={({ item }) => (
          <View style={{ alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%', gap: space.sm }}>
            <View style={{ backgroundColor: item.role === 'user' ? colors.ink : colors.surface, borderRadius: radius.lg, borderBottomRightRadius: item.role === 'user' ? 8 : radius.lg, borderBottomLeftRadius: item.role === 'user' ? radius.lg : 8, paddingHorizontal: space.lg, paddingVertical: 14, borderWidth: item.role === 'user' ? 0 : 1, borderColor: colors.border }}>
              <Text color={item.role === 'user' ? colors.onInk : colors.text}>{item.text}</Text>
            </View>
            {item.chart && (
              <Card>
                {item.chart.kind === 'donut' && <Donut slices={item.chart.slices} size={160} />}
                {item.chart.kind === 'bars' && <BarList rows={item.chart.rows} />}
                {item.chart.kind === 'line' && <LineArea actual={item.chart.actual} projected={item.chart.projected} />}
              </Card>
            )}
            {item.followUps && item.role === 'assistant' && <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{item.followUps.map((f) => <Chip key={f} label={f} onPress={() => ask(f)} />)}</Row>}
          </View>
        )}
        ListFooterComponent={busy ? <Row style={{ gap: space.sm }}><IconTile size={28} icon="chat" /><Text color={colors.textMuted}>Working it out…</Text></Row> : undefined}
      />
      <View style={{ paddingHorizontal: layout.gutter, paddingTop: space.md, paddingBottom: space.lg, gap: space.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg }}>
        {picking && current ? (
          <>
            <Segmented options={groups.map((g) => ({ key: g.key, label: g.short }))} value={current.key} onChange={setGroup} />
            <View style={{ height: 248 }}>
              <ScrollView showsVerticalScrollIndicator nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space.sm }}>
                <Group>{current.items.map((it) => <ListRow key={it.id} title={it.label} onPress={() => ask(it.question)} />)}</Group>
              </ScrollView>
            </View>
          </>
        ) : (
          <Button title="Ask another question" kind="secondary" icon="chat" onPress={() => setPicking(true)} />
        )}
      </View>
    </SubScreen>
  );
}
