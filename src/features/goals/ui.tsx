import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Field, GlyphPick, Row, Segmented, Swatch, Text } from '@/components/ui';
import { toast } from '@/components/Toast';
import { GOAL_ICONS, goalGlyph } from '@/components/glyphs';
import { Glyph } from '@/components/Icon';
import { useDb, bumpData } from '@/db/provider';
import { addGoal, contribute, type GoalProgress } from './repo';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import { DAY } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { chartColors, space } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

export { goalGlyph, Glyph };

const WHEN = [{ key: 'none', label: 'No date' }, { key: '3', label: '3 months' }, { key: '6', label: '6 months' }, { key: '12', label: '1 year' }] as const;

/** Create-goal form, shown inside a Sheet. */
export function NewGoalForm({ onDone }: { onDone: () => void }) {
  const db = useDb();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [icon, setIcon] = useState('target');
  const [color, setColor] = useState(chartColors[0]);
  const [when, setWhen] = useState<(typeof WHEN)[number]['key']>('none');
  const target = parseAmountToMinor(amount) ?? 0;

  async function save() {
    try {
      await addGoal(db, { name, target, icon, color, deadline: when === 'none' ? null : Date.now() + Number(when) * 30 * DAY });
      haptic.success();
      bumpData();
      toast('Goal created');
      onDone();
    } catch (e) {
      toast((e as Error).message);
    }
  }
  return (
    <>
      <Text v="h2">New goal</Text>
      <Field label="What are you saving for" value={name} onChangeText={setName} placeholder="Goa trip" autoFocus />
      <Field label="Target amount (₹)" value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="50000" />
      <Segmented options={WHEN.map((w) => ({ key: w.key, label: w.label }))} value={when} onChange={setWhen} />
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
        {GOAL_ICONS.map((g) => <GlyphPick key={g.key} label={g.label} glyph={g.glyph} color={color} selected={icon === g.key} onPress={() => setIcon(g.key)} />)}
      </Row>
      <Row style={{ flexWrap: 'wrap' }}>{chartColors.map((c) => <Swatch key={c} color={c} selected={color === c} onPress={() => setColor(c)} />)}</Row>
      <Button title="Create goal" onPress={save} disabled={!name.trim() || target <= 0} />
    </>
  );
}

/** Add to, or take out of, a goal. */
export function ContributeForm({ progress, onDone }: { progress: GoalProgress; onDone: () => void }) {
  const db = useDb();
  const { colors } = useTheme();
  const [mode, setMode] = useState<'add' | 'take'>('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const minor = parseAmountToMinor(amount) ?? 0;

  async function save() {
    try {
      await contribute(db, progress.goal.id, mode === 'add' ? minor : -minor, note.trim() || null);
      haptic.success();
      bumpData();
      toast(mode === 'add' ? `${formatMoney(minor, 'INR', { trimZeros: true })} added` : `${formatMoney(minor, 'INR', { trimZeros: true })} taken out`);
      onDone();
    } catch (e) {
      toast((e as Error).message);
    }
  }
  return (
    <>
      <Text v="h2">{progress.goal.name}</Text>
      <Text v="small" color={colors.textMuted}>{formatMoney(progress.saved, 'INR', { trimZeros: true })} saved of {formatMoney(progress.goal.target, 'INR', { trimZeros: true })}</Text>
      <Segmented options={[{ key: 'add', label: 'Add money' }, { key: 'take', label: 'Take out' }]} value={mode} onChange={setMode} />
      <Field label="Amount (₹)" value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder={progress.perMonth ? String(Math.round(progress.perMonth / 100)) : '1000'} autoFocus />
      <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Bonus" />
      <View><Button title={mode === 'add' ? 'Add to goal' : 'Take out'} onPress={save} disabled={minor <= 0} /></View>
    </>
  );
}
