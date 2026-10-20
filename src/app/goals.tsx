import React, { useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { SubScreen, Card, Text, Row, Button, Enter, Money, Tag, Press } from '@/components/ui';
import { EmptyState } from '@/components/Feedback';
import { Glyph } from '@/components/Icon';
import { ProgressRing } from '@/components/charts';
import { Sheet } from '@/components/Sheet';
import { ToastHost, toast } from '@/components/Toast';
import { useQuery, useDb, bumpData } from '@/db/provider';
import { listGoals, removeGoal, contribute, type GoalProgress } from '@/features/goals/repo';
import { ContributeForm, NewGoalForm } from '@/features/goals/ui';
import { goalGlyph } from '@/components/glyphs';
import { formatMoney } from '@/domain/money';
import { formatDay } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

const cmp = (n: number) => formatMoney(n, 'INR', { compact: true });
const QUICK = [50000, 100000, 500000];

/** Four milestones (25, 50, 75, 100%) as segments, and the next one in words. */
function Milestones({ p }: { p: GoalProgress }) {
  const { colors } = useTheme();
  const next = [25, 50, 75, 100].find((m) => p.pct < m);
  return (
    <View style={{ gap: 6 }}>
      <Row style={{ gap: 4 }}>
        {[25, 50, 75, 100].map((m, i) => {
          const from = i * 25;
          const fill = Math.max(0, Math.min(1, (p.pct - from) / 25));
          return (
            <View key={m} style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.track, overflow: 'hidden' }}>
              <View style={{ width: `${fill * 100}%`, height: 10, backgroundColor: p.done ? colors.income : p.goal.color }} />
            </View>
          );
        })}
      </Row>
      <Text v="small" color={colors.textMuted}>{next ? `Next: ${cmp(Math.round((p.goal.target * next) / 100))} at ${next}%` : 'All milestones done'}</Text>
    </View>
  );
}

function GoalCard({ p, onOpen }: { p: GoalProgress; onOpen: () => void }) {
  const db = useDb();
  const { colors } = useTheme();
  async function quick(n: number) {
    await contribute(db, p.goal.id, n, null);
    haptic.success();
    bumpData();
    toast(`${cmp(n)} added to ${p.goal.name}`);
  }
  const when = p.done ? 'Reached' : p.daysLeft === null ? 'No deadline' : p.daysLeft >= 0 ? `${p.daysLeft} days left · ${formatDay(p.goal.deadline!)}` : 'Deadline passed';
  return (
    <Card onPress={onOpen} accessibilityLabel={`${p.goal.name}, ${p.pct} percent`} style={{ gap: space.md, backgroundColor: p.done ? colors.incomeSoft : colors.surface }}>
      <Row style={{ gap: space.md }}>
        <ProgressRing pct={p.pct} size={62} stroke={7} color={p.done ? colors.income : p.goal.color} track={colors.track}>
          <Glyph name={goalGlyph(p.goal.icon)} size={22} color={p.done ? colors.income : p.goal.color} />
        </ProgressRing>
        <View style={{ flex: 1, gap: 2 }}>
          <Row style={{ gap: space.sm }}>
            <Text v="title" numberOfLines={1} style={{ flex: 1 }}>{p.goal.name}</Text>
            {p.done ? <Tag label="Reached" tone="income" /> : <Text style={{ fontFamily: fonts.brandBlack, fontSize: 18, color: colors.text }}>{p.pct}%</Text>}
          </Row>
          <Text v="small" color={p.daysLeft !== null && p.daysLeft < 0 && !p.done ? colors.expense : colors.textMuted}>{when}</Text>
          <Text v="small" style={{ fontFamily: fonts.semibold }}>{formatMoney(p.saved, 'INR', { trimZeros: true })} <Text v="small" color={colors.textMuted}>of {formatMoney(p.goal.target, 'INR', { trimZeros: true })}</Text></Text>
        </View>
      </Row>
      <Milestones p={p} />
      {!p.done ? (
        <>
          {p.perMonth ? <Text v="small" color={colors.textMuted}>About {cmp(p.perMonth)} a month gets you there on time.</Text> : null}
          <Row style={{ gap: space.sm }}>
            {QUICK.map((n) => (
              <Press key={n} onPress={() => quick(n)} accessibilityLabel={`Add ${cmp(n)}`} style={{ flex: 1, alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingVertical: 8 }}>
                <Text v="small" style={{ fontFamily: fonts.bold }}>+{cmp(n)}</Text>
              </Press>
            ))}
            <Press onPress={onOpen} accessibilityLabel="Add another amount" style={{ flex: 1, alignItems: 'center', borderRadius: 999, backgroundColor: colors.ink, paddingVertical: 8 }}>
              <Text v="small" color={colors.onInk} style={{ fontFamily: fonts.bold }}>Other</Text>
            </Press>
          </Row>
        </>
      ) : null}
    </Card>
  );
}

/** Goals: save for something specific. Quick amounts on each card; edit, take out or remove inside the goal. */
export default function Goals() {
  const db = useDb();
  const { colors } = useTheme();
  const q = useQuery((d) => listGoals(d), []);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<GoalProgress | null>(null);
  const goals = [...(q.data ?? [])].sort((a, b) => Number(a.done) - Number(b.done));
  const saved = goals.reduce((a, g) => a + g.saved, 0);
  const target = goals.reduce((a, g) => a + g.goal.target, 0);
  const reached = goals.filter((g) => g.done).length;
  const monthly = goals.reduce((a, g) => a + (g.perMonth ?? 0), 0);

  function remove(p: GoalProgress) {
    Alert.alert(`Remove ${p.goal.name}?`, 'The goal and its savings history are removed from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await removeGoal(db, p.goal.id); bumpData(); setOpen(null); toast('Goal removed'); } },
    ]);
  }

  return (
    <SubScreen title="Goals" right={<Button title="New" size="sm" icon="plus" onPress={() => setCreating(true)} />}>
      {q.data && goals.length === 0 ? (
        <EmptyState art="wallet" title="Save for something specific" body="Set a target, add money when you can, and see how much to set aside each month." action="Create a goal" onAction={() => setCreating(true)} />
      ) : null}
      {goals.length > 0 && (
        <Enter>
          <Card tone="ink" style={{ gap: space.lg }}>
            <Row style={{ gap: space.lg }}>
              <ProgressRing pct={target ? (saved / target) * 100 : 0} size={88} stroke={10} color={colors.primary} track={colors.onHeroLine}>
                <Text v="title" color={colors.onHero}>{target ? Math.round((saved / target) * 100) : 0}%</Text>
              </ProgressRing>
              <View style={{ flex: 1, gap: 2 }}>
                <Text v="caps" color={colors.onHeroMuted}>SAVED SO FAR</Text>
                <Money size="lg" color={colors.onHero} text={formatMoney(saved, 'INR', { trimZeros: true })} />
                <Text v="small" color={colors.onHeroMuted}>of {cmp(target)} across {goals.length} {goals.length === 1 ? 'goal' : 'goals'}</Text>
              </View>
            </Row>
            <Row style={{ borderTopWidth: 1, borderTopColor: colors.onHeroLine, paddingTop: space.md }}>
              <View style={{ flex: 1 }}><Text v="small" color={colors.onHeroMuted}>Reached</Text><Text v="title" color={colors.onHero}>{reached} of {goals.length}</Text></View>
              <View style={{ flex: 1 }}><Text v="small" color={colors.onHeroMuted}>To stay on time</Text><Text v="title" color={colors.onHero}>{monthly ? `${cmp(monthly)} a month` : 'All set'}</Text></View>
            </Row>
          </Card>
        </Enter>
      )}
      {goals.map((p, i) => <Enter key={p.goal.id} i={i + 1}><GoalCard p={p} onOpen={() => setOpen(p)} /></Enter>)}
      <Modal visible={creating} transparent animationType="none" onRequestClose={() => setCreating(false)}>
        <Sheet onClose={() => setCreating(false)}><NewGoalForm onDone={() => setCreating(false)} /></Sheet>
      </Modal>
      <Modal visible={!!open} transparent animationType="none" onRequestClose={() => setOpen(null)}>
        <Sheet onClose={() => setOpen(null)}>
          {open ? (
            <>
              <ContributeForm progress={open} onDone={() => setOpen(null)} />
              <Button title="Remove goal" kind="ghost" onPress={() => remove(open)} />
            </>
          ) : null}
        </Sheet>
      </Modal>
      <ToastHost />
    </SubScreen>
  );
}
