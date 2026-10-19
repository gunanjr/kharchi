import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SubScreen, Card, Text, Button, Row, Chip, IconTile } from '@/components/ui';
import { ToastHost, toast } from '@/components/Toast';
import { DraftEditor, type Draft } from '@/features/capture/DraftEditor';
import { useDb, bumpData } from '@/db/provider';
import { parseVoice } from '@/features/voice/parse';
import { suggestCategory, learnMerchant } from '@/features/parser/merchants';
import { addTransaction, deleteTransaction } from '@/features/tracker/repo';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, type as T } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

const EXAMPLES = ['Spent 180 on lunch', 'Paid 250 for petrol', 'Received 2000 from freelance work', 'Spent 120 on groceries yesterday'];

type Item = { draft: Draft; saved: boolean; method: 'upi' | 'card' | 'cash' | null };

/**
 * Say or type an expense. Dictation comes from the keyboard's own microphone key, so Kharchi never asks for the
 * microphone and never records. The sentence is read on the phone by simple rules; each expense found is a draft to review.
 */
export default function Voice() {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const currency = useSettings((s) => s.currency);
  const [text, setText] = useState('');
  const [items, setItems] = useState<Item[] | null>(null);

  async function read() {
    const found = parseVoice(text);
    if (!found.length) return toast('Say or type something like “spent 180 on lunch”');
    const out: Item[] = [];
    for (const f of found) {
      const s = await suggestCategory(db, f.description);
      const cat = s.categoryId ?? (f.categoryKey ? `cat_${f.categoryKey}` : null);
      out.push({ method: f.paymentMethod, saved: false, draft: { type: f.type, amount: f.amount, description: f.description, categoryId: cat, source: s.source !== 'none' ? s.source : cat ? 'keyword' : 'none', occurredAt: f.occurredAt } });
    }
    setItems(out);
  }

  async function save(i: number) {
    const it = items?.[i];
    if (!it || it.saved || !it.draft.amount) return;
    setItems((cur) => cur!.map((x, k) => (k === i ? { ...x, saved: true } : x))); // blocks a double tap
    try {
      const d = it.draft;
      const id = await addTransaction(db, { type: d.type, amount: d.amount!, currency, category_id: d.categoryId, merchant: d.description.trim() || null, occurred_at: d.occurredAt, payment_method: it.method, source: 'manual' });
      if (d.categoryId && d.description.trim()) await learnMerchant(db, d.description, d.categoryId);
      haptic.success();
      bumpData();
      toast('Saved', { label: 'Undo', run: async () => { await deleteTransaction(db, id); setItems((cur) => cur?.map((x, k) => (k === i ? { ...x, saved: false } : x)) ?? null); bumpData(); } });
    } catch (e) {
      setItems((cur) => cur!.map((x, k) => (k === i ? { ...x, saved: false } : x)));
      toast((e as Error).message);
    }
  }

  return (
    <SubScreen title="Say it">
      <Card style={{ gap: space.md }}>
        <Row style={{ gap: space.md }}>
          <IconTile icon="chat" size={44} tone="ink" />
          <Text style={{ flex: 1 }} color={colors.textMuted}>Tap the microphone on your keyboard and say it, or just type it. I only read the words on your phone, and nothing is saved until you confirm.</Text>
        </Row>
        <TextInput
          value={text} onChangeText={(t) => { setText(t); setItems(null); }} multiline autoFocus placeholder="Spent 180 on lunch and 60 on tea"
          placeholderTextColor={colors.textSubtle} accessibilityLabel="Say or type an expense"
          style={[T.body, { color: colors.text, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, minHeight: 96, padding: space.lg, textAlignVertical: 'top' }]}
        />
        <Button title="Read it" icon="chat" onPress={read} disabled={!text.trim()} />
        {!items ? <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{EXAMPLES.map((e) => <Chip key={e} label={e} onPress={() => setText(e)} />)}</Row> : null}
      </Card>
      {items?.map((it, i) => (
        <View key={i} style={{ gap: space.sm }}>
          {items.length > 1 ? <Text v="caps" color={colors.textMuted}>EXPENSE {i + 1} OF {items.length}</Text> : null}
          <DraftEditor
            draft={it.draft} currency={currency} saved={it.saved}
            note={it.method ? `Paid by ${it.method}` : undefined}
            onChange={(d) => setItems((cur) => cur!.map((x, k) => (k === i ? { ...x, draft: d } : x)))}
            onSave={() => save(i)}
            discardLabel="Remove"
            onDiscard={() => { const next = items.filter((_, k) => k !== i); setItems(next.length ? next : null); }}
          />
        </View>
      ))}
      {items && items.every((x) => x.saved) ? <Button title="Done" kind="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : null}
      <ToastHost />
    </SubScreen>
  );
}
