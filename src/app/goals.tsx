import React, { useState } from 'react';
import { Modal, View } from 'react-native';
import { SubScreen, Card, Text, Row, Button, Enter, Money, IconTile, Tag, ProgressBar } from '@/components/ui';
import { EmptyState } from '@/components/Feedback';
import { Glyph } from '@/components/Icon';
import { ProgressRing } from '@/components/charts';
import { Sheet } from '@/components/Sheet';
import { ToastHost, toast } from '@/components/Toast';
import { useQuery, useDb, bumpData } from '@/db/provider';
import { listGoals, removeGoal, type GoalProgress } from '@/features/goals/repo';
import { ContributeForm, NewGoalForm } from '@/features/goals/ui';
import { goalGlyph } from '@/components/glyphs';
import { formatMoney } from '@/domain/money';
import { formatDay } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function Goals() {
  const db = useDb();
  const { colors } = useTheme();
  const q = useQuery((d) => listGoals(d), []);
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState<GoalProgress | null>(null);
  const goals = q.data ?? [];
  const saved = goals.reduce((a, g) => a + g.saved, 0);
  const target = goals.reduce((a, g) => a + g.goal.target, 0);

  const newGoal = () => setCreating(true);

  return (
    <SubScreen title="Goals" right={<Button title="New" size="sm" icon="plus" onPress={newGoal} />}>
      {q.data && goals.length === 0 ? (
        <EmptyState art="wallet" title="Save for something specific" body="Set a target, add money when you can, and see how much to set aside each month." action="Create a goal" onAction={newGoal} />
      ) : null}
      {goals.length > 0 && (
        <Enter>
          <Card tone="ink" style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <ProgressRing pct={target ? (saved / target) * 100 : 0} size={84} stroke={9} color={colors.primary} track={colors.onHeroLine}>
              <Text v="title" color={colors.onHero}>{target ? Math.round((saved / target) * 100) : 0}%</Text>
            </ProgressRing>
            <View style={{ flex: 1, gap: 2 }}>
              <Text v="caps" color={colors.onHeroMuted}>SAVED ACROSS {goals.length} GOALS</Text>
              <Money size="lg" color={colors.onHero} text={formatMoney(saved, 'INR', { trimZeros: true })} />
              <Text v="small" color={colors.onHeroMuted}>of {formatMoney(target, 'INR', { compact: true })}</Text>
            </View>
          </Card>
        </Enter>
      )}
      {goals.map((p, i) => (
        <Enter key={p.goal.id} i={i + 1}>
          <Card style={{ gap: space.md }}>
            <Row style={{ gap: space.md }}>
              <IconTile size={48} color={p.goal.color}><Glyph name={goalGlyph(p.goal.icon)} size={22} color={p.goal.color} /></IconTile>
              <View style={{ flex: 1 }}>
                <Text v="title" numberOfLines={1}>{p.goal.name}</Text>
                <Text v="small" color={colors.textMuted}>
                  {p.done ? 'Reached' : p.daysLeft === null ? 'No deadline' : p.daysLeft >= 0 ? `${p.daysLeft} days left · ${formatDay(p.goal.deadline!)}` : 'Deadline passed'}
                </Text>
              </View>
              {p.done ? <Tag label="Reached" tone="income" /> : <Text v="title">{p.pct}%</Text>}
            </Row>
            <ProgressBar value={p.pct / 100} color={p.done ? colors.income : p.goal.color} height={10} />
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Money size="md" text={formatMoney(p.saved, 'INR', { trimZeros: true })} />
                <Text v="small" color={colors.textMuted}>of {formatMoney(p.goal.target, 'INR', { trimZeros: true })}</Text>
              </View>
              {p.perMonth ? <Text v="small" color={colors.textMuted} style={{ textAlign: 'right', flex: 1 }}>Set aside about {formatMoney(p.perMonth, 'INR', { compact: true })} a month</Text> : null}
            </Row>
            <Row style={{ gap: space.sm }}>
              <Button title="Add money" kind={p.done ? 'secondary' : 'primary'} size="sm" icon="plus" onPress={() => setAdding(p)} />
              <Button title="Remove" kind="ghost" size="sm" onPress={async () => { await removeGoal(db, p.goal.id); bumpData(); toast('Goal removed'); }} />
            </Row>
          </Card>
        </Enter>
      ))}
      <Modal visible={creating} transparent animationType="none" onRequestClose={() => setCreating(false)}>
        <Sheet onClose={() => setCreating(false)}><NewGoalForm onDone={() => setCreating(false)} /></Sheet>
      </Modal>
      <Modal visible={!!adding} transparent animationType="none" onRequestClose={() => setAdding(null)}>
        <Sheet onClose={() => setAdding(null)}>{adding && <ContributeForm progress={adding} onDone={() => setAdding(null)} />}</Sheet>
      </Modal>
      <ToastHost />
    </SubScreen>
  );
}
