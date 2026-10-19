import React, { useState } from 'react';
import { SubScreen, Card, Text, Row, Button, Field, Chip, GlyphPick, Swatch } from '@/components/ui';
import { CategoryDot } from '@/components/TxRow';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, bumpData } from '@/db/provider';
import { addCategory, deleteCategory } from '@/features/tracker/repo';
import { useCategories } from '@/features/tracker/hooks';
import { emojiGlyph } from '@/components/glyphs';
import { chartColors, space } from '@/theme/tokens';

const ICONS = ['🍕', '🎮', '🐶', '👶', '🏋️', '💄', '🛠️', '🎓', '🚗', '🎁', '☕', '🍺', '📱', '🧘', '🌱', '💸'];

export default function Categories() {
  const db = useDb();
  const { categories } = useCategories();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(chartColors[0]);
  const [kind, setKind] = useState<'expense' | 'income'>('expense');

  return (
    <SubScreen title="Categories">
      <Card style={{ gap: space.md }}>
        <Text v="h2">New category</Text>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Pets" />
        <Row><Chip label="Expense" selected={kind === 'expense'} onPress={() => setKind('expense')} /><Chip label="Income" selected={kind === 'income'} onPress={() => setKind('income')} /></Row>
        <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{ICONS.map((i) => <GlyphPick key={i} label="Icon" glyph={emojiGlyph(i) ?? 'pricetag-outline'} selected={icon === i} onPress={() => setIcon(i)} />)}</Row>
        <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{chartColors.map((c) => <Swatch key={c} color={c} selected={color === c} onPress={() => setColor(c)} />)}</Row>
        <Button title="Add" onPress={async () => {
          if (!name.trim()) return toast('Give it a name');
          await addCategory(db, { name: name.trim(), icon, color, kind });
          setName(''); bumpData(); toast('Added');
        }} />
      </Card>
      {categories.map((c) => (
        <Row key={c.id} style={{ justifyContent: 'space-between' }}>
          <Row><CategoryDot cat={c} size={40} /><Text v="title">{c.name}</Text><Text v="small">{c.kind}</Text></Row>
          {!c.builtin && <Button title="Delete" kind="ghost" onPress={async () => { await deleteCategory(db, c.id); bumpData(); }} />}
        </Row>
      ))}
      <ToastHost />
    </SubScreen>
  );
}
