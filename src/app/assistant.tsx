import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SubScreen, Text, Chip, Row, Card } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Donut, BarList, LineArea } from '@/components/charts';
import { EmptyState } from '@/components/Feedback';
import { useDb } from '@/db/provider';
import { insertRow } from '@/db/rows';
import { aiProvider, SUGGESTED_QUESTIONS, type AiAnswer } from '@/features/ai';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, type as T } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

interface Msg { id: string; role: 'user' | 'assistant'; text: string; chart?: AiAnswer['chart']; followUps?: string[] }

export default function Assistant() {
  const db = useDb();
  const { colors } = useTheme();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    db.all<any>(`SELECT * FROM ai_messages WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 40`).then((rows) =>
      setMsgs(rows.reverse().map((r) => ({ id: r.id, role: r.role, text: r.text, ...(r.payload ? JSON.parse(r.payload) : {}) }))),
    );
  }, [db]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    setText('');
    setBusy(true);
    haptic.tap();
    const uid = await insertRow(db, 'ai_messages', { role: 'user', text: question });
    setMsgs((m) => [...m, { id: uid, role: 'user', text: question }]);
    try {
      const a = await aiProvider.answer(question, { db, now: Date.now() });
      const payload = JSON.stringify({ chart: a.chart, followUps: a.followUps });
      const id = await insertRow(db, 'ai_messages', { role: 'assistant', text: a.text, payload });
      setMsgs((m) => [...m, { id, role: 'assistant', text: a.text, chart: a.chart, followUps: a.followUps }]);
    } catch (e) {
      setMsgs((m) => [...m, { id: `err${Date.now()}`, role: 'assistant', text: `Sorry, I couldn't work that out (${(e as Error).message}).` }]);
    } finally {
      setBusy(false);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <SubScreen title="Ask your money" scroll={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={list}
          data={msgs}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState art="chat" title="Ask me about your spending" body={`I run on your phone: no account, no internet. ${aiProvider.name}.`} />}
          renderItem={({ item }) => (
            <View style={{ alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%', gap: space.sm }}>
              <View style={{ backgroundColor: item.role === 'user' ? colors.primary : colors.surface, borderRadius: radius.lg, padding: space.md, borderWidth: item.role === 'user' ? 0 : 1, borderColor: colors.border }}>
                <Text color={item.role === 'user' ? colors.onPrimary : colors.text}>{item.text}</Text>
              </View>
              {item.chart && (
                <Card>
                  {item.chart.kind === 'donut' && <Donut slices={item.chart.slices} size={160} />}
                  {item.chart.kind === 'bars' && <BarList rows={item.chart.rows} />}
                  {item.chart.kind === 'line' && <LineArea actual={item.chart.actual} projected={item.chart.projected} />}
                </Card>
              )}
              {item.followUps && <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{item.followUps.map((f) => <Chip key={f} label={f} onPress={() => ask(f)} />)}</Row>}
            </View>
          )}
          ListFooterComponent={busy ? <Text color={colors.textMuted}>Thinking…</Text> : undefined}
        />
        <View style={{ paddingHorizontal: space.lg, paddingVertical: space.sm, gap: space.sm }}>
          <FlatList horizontal showsHorizontalScrollIndicator={false} data={SUGGESTED_QUESTIONS} keyExtractor={(s) => s} contentContainerStyle={{ gap: space.sm }} keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <Chip label={item} onPress={() => ask(item)} />} />
          <Row>
            <TextInput
              value={text} onChangeText={setText} onSubmitEditing={() => ask(text)} returnKeyType="send" placeholder="e.g. How much on food last month?" placeholderTextColor={colors.textMuted}
              accessibilityLabel="Your question" style={[T.body, { flex: 1, color: colors.text, backgroundColor: colors.surface, borderRadius: radius.pill, minHeight: 48, paddingHorizontal: space.lg, borderWidth: 1, borderColor: colors.border }]}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={() => ask(text)} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevron" color={colors.onPrimary} />
            </Pressable>
          </Row>
        </View>
      </KeyboardAvoidingView>
    </SubScreen>
  );
}
