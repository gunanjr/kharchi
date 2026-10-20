import React, { useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { SubScreen, Card, Text, Row, Button, Field, Chip, GlyphPick, Swatch, Press, Tag } from '@/components/ui';
import { CategoryDot } from '@/components/TxRow';
import { Sheet } from '@/components/Sheet';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, bumpData } from '@/db/provider';
import { addCategory, deleteCategory } from '@/features/tracker/repo';
import { useCategories } from '@/features/tracker/hooks';
import { emojiGlyph } from '@/components/glyphs';
import { useTheme } from '@/theme/ThemeProvider';
import { chartColors, space } from '@/theme/tokens';
import type { Category } from '@/domain/types';

const ICONS = ['🍕', '🎮', '🐶', '👶', '🏋️', '💄', '🛠️', '🎓', '🚗', '🎁', '☕', '🍺', '📱', '🧘', '🌱', '💸'];

function NewCategory({ onDone }: { onDone: () => void }) {
  const db = useDb();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(chartColors[0]);
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 640 }} contentContainerStyle={{ gap: space.lg, padding: space.lg }}>
      <Text v="h2">New category</Text>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Pets" autoFocus />
      <Row style={{ gap: space.sm }}><Chip label="Expense" selected={kind === 'expense'} onPress={() => setKind('expense')} /><Chip label="Income" selected={kind === 'income'} onPress={() => setKind('income')} /></Row>
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{ICONS.map((i) => <GlyphPick key={i} label="Icon" glyph={emojiGlyph(i) ?? 'pricetag-outline'} selected={icon === i} onPress={() => setIcon(i)} />)}</Row>
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{chartColors.map((c) => <Swatch key={c} color={c} selected={color === c} onPress={() => setColor(c)} />)}</Row>
      <Button title="Add category" kind="accent" onPress={async () => {
        if (!name.trim()) return toast('Give it a name');
        await addCategory(db, { name: name.trim(), icon, color, kind });
        bumpData(); toast('Added'); onDone();
      }} />
    </ScrollView>
  );
}

/** Categories, grouped into spending and income. Your own ones can be deleted; built-in ones stay. */
export default function Categories() {
  const db = useDb();
  const { colors } = useTheme();
  const { categories } = useCategories();
  const [creating, setCreating] = useState(false);
  function remove(c: Category) {
    Alert.alert(`Delete ${c.name}?`, 'Entries in it become uncategorised.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCategory(db, c.id); bumpData(); } },
    ]);
  }
  const group = (kind: 'expense' | 'income', title: string) => {
    const list = categories.filter((c) => c.kind === kind);
    if (!list.length) return null;
    return (
      <View style={{ gap: space.sm }}>
        <Text v="caps" color={colors.textMuted}>{title}</Text>
        <Card pad={false} style={{ paddingHorizontal: space.lg }}>
          {list.map((c, i) => (
            <Press key={c.id} onPress={c.builtin ? undefined : () => remove(c)} disabled={!!c.builtin} accessibilityLabel={c.name}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm + 2, borderBottomWidth: i === list.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
              <CategoryDot cat={c} size={38} />
              <Text v="title" style={{ flex: 1 }}>{c.name}</Text>
              {c.builtin ? null : <Tag label="Yours" />}
            </Press>
          ))}
        </Card>
      </View>
    );
  };
  return (
    <SubScreen title="Categories" right={<Button title="New" size="sm" icon="plus" onPress={() => setCreating(true)} />}>
      {group('expense', 'SPENDING')}
      {group('income', 'INCOME')}
      <Text v="small" color={colors.textSubtle} style={{ textAlign: 'center' }}>Tap one of your own categories to delete it.</Text>
      <Modal visible={creating} transparent animationType="none" onRequestClose={() => setCreating(false)}>
        <Sheet onClose={() => setCreating(false)}><NewCategory onDone={() => setCreating(false)} /></Sheet>
      </Modal>
      <ToastHost />
    </SubScreen>
  );
}
