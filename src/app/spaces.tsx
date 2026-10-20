import React, { useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SubScreen, Card, Text, Row, Button, Money, Press, Field, Chip } from '@/components/ui';
import { Sheet } from '@/components/Sheet';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { KIND_INFO, summarize, validateSpace, type Space, type SpaceKind } from '@/features/spaces/spaces';
import { ProGate } from '@/features/pro/ProGate';
import { useIsPro } from '@/features/pro/store';
import { useSettings } from '@/store/settings';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import { monthLabel, startOfMonth } from '@/lib/date';
import { uuid } from '@/lib/id';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space as sp } from '@/theme/tokens';

const cmp = (n: number) => formatMoney(n, 'INR', { compact: true });

function SpaceForm({ initial, existing, onSave, onDelete }: { initial: Space | null; existing: Space[]; onSave: (s: Space) => void; onDelete?: () => void }) {
  const { colors } = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<SpaceKind>(initial?.kind ?? 'side');
  const [taxPct, setTaxPct] = useState(initial?.taxPct ?? 20);
  const [myShare, setMyShare] = useState(initial?.myShare ?? 50);
  const [budget, setBudget] = useState(initial?.budget ? String(initial.budget / 100) : '');
  const save = () => {
    const err = validateSpace({ name, existing, id: initial?.id });
    if (err) return toast(err);
    const b = budget.trim() ? parseAmountToMinor(budget, 'INR') : null;
    if (budget.trim() && !b) return toast('That budget doesn’t look right.');
    onSave({ id: initial?.id ?? uuid(), name: name.trim(), kind, emoji: KIND_INFO[kind].emoji, taxPct: kind === 'side' ? taxPct : undefined, myShare: kind === 'home' ? myShare : undefined, budget: kind === 'trip' || kind === 'event' ? b : null });
  };
  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 620 }} contentContainerStyle={{ gap: sp.lg, padding: sp.lg }}>
      <Text v="h2">{initial ? 'Edit space' : 'New space'}</Text>
      <Row style={{ flexWrap: 'wrap', gap: sp.sm }}>
        {(Object.keys(KIND_INFO) as SpaceKind[]).map((k) => <Chip key={k} label={`${KIND_INFO[k].emoji} ${KIND_INFO[k].label}`} selected={kind === k} onPress={() => setKind(k)} />)}
      </Row>
      <Text v="small" color={colors.textMuted}>{KIND_INFO[kind].hint}</Text>
      <Field label="Name" value={name} onChangeText={setName} placeholder={kind === 'side' ? 'Design work' : kind === 'home' ? 'Our flat' : kind === 'trip' ? 'Goa 2026' : 'Riya’s wedding'} maxLength={30} />
      {kind === 'side' ? (
        <View style={{ gap: sp.sm }}>
          <Text v="caps" color={colors.textMuted}>SET ASIDE FOR TAX</Text>
          <Row style={{ gap: sp.sm, flexWrap: 'wrap' }}>{[0, 10, 20, 30].map((v) => <Chip key={v} label={`${v}% of profit`} selected={taxPct === v} onPress={() => setTaxPct(v)} />)}</Row>
          <Text v="small" color={colors.textMuted}>An estimate to keep aside, not tax advice.</Text>
        </View>
      ) : null}
      {kind === 'home' ? (
        <View style={{ gap: sp.sm }}>
          <Text v="caps" color={colors.textMuted}>YOUR SHARE OF HOME COSTS</Text>
          <Row style={{ gap: sp.sm, flexWrap: 'wrap' }}>{[30, 40, 50, 60, 70].map((v) => <Chip key={v} label={`${v}%`} selected={myShare === v} onPress={() => setMyShare(v)} />)}</Row>
        </View>
      ) : null}
      {kind === 'trip' || kind === 'event' ? <Field label="Budget (optional)" value={budget} onChangeText={(t) => setBudget(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="e.g. 30000" /> : null}
      <Button title="Save" onPress={save} />
      {onDelete ? <Button title="Delete space" kind="ghost" onPress={onDelete} /> : null}
    </ScrollView>
  );
}

/** Spaces (Pro): personal, side hustle, home, trip and event money kept apart on one phone. */
export default function Spaces() {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const pro = useIsPro();
  const spaces = useSettings((s) => s.spaces);
  const active = useSettings((s) => s.activeSpace);
  const set = useSettings((s) => s.set);
  const [editing, setEditing] = useState<Space | null | 'new'>(null);
  const from = startOfMonth(Date.now());
  const q = useQuery((d) => listTransactions(d, { from, to: Date.now() + 1, allSpaces: true }), [spaces.length]);

  async function switchTo(id: string) {
    await set(db, 'activeSpace', id);
    bumpData();
    router.back();
  }
  async function saveSpace(s: Space) {
    const list = spaces.some((x) => x.id === s.id) ? spaces.map((x) => (x.id === s.id ? s : x)) : [...spaces, s];
    await set(db, 'spaces', list);
    setEditing(null);
  }
  function remove(s: Space) {
    Alert.alert(`Delete ${s.name}?`, 'Its entries are kept and move back to Personal.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await db.run(`UPDATE transactions SET space_id=NULL, updated_at=? WHERE space_id=?`, [Date.now(), s.id]);
        await set(db, 'spaces', spaces.filter((x) => x.id !== s.id));
        if (active === s.id) await set(db, 'activeSpace', '');
        bumpData();
        setEditing(null);
      } },
    ]);
  }

  const personal = q.data ? q.data.filter((t) => !t.space_id && !t.excluded) : [];
  const pSpent = personal.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);

  return (
    <SubScreen title="Spaces" right={pro ? <Button title="New" size="sm" icon="plus" onPress={() => setEditing('new')} /> : undefined}>
      <Text v="small" color={colors.textMuted}>Each space has its own entries, totals and Insights. Tap one to switch. {monthLabel(from)} so far.</Text>
      <Press onPress={() => switchTo('')} accessibilityLabel="Switch to Personal">
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: sp.md, borderWidth: active === '' ? 2 : 1, borderColor: active === '' ? colors.primary : colors.border }}>
          <Text style={{ fontSize: 28 }}>🙂</Text>
          <View style={{ flex: 1 }}><Text v="title">Personal</Text><Text v="small" color={colors.textMuted}>Everyday money</Text></View>
          <Money size="md" align="right" text={cmp(pSpent)} />
        </Card>
      </Press>
      {spaces.map((s) => {
        const sum = q.data ? summarize(s, q.data, from, Date.now() + 1) : null;
        const line = !sum ? '' : s.kind === 'side' ? `${cmp(sum.income)} in · ${cmp(sum.spent)} out · ${sum.margin === null ? 'no income yet' : `${sum.margin}% margin`}${sum.taxSetAside ? ` · set aside ${cmp(sum.taxSetAside)}` : ''}`
          : s.kind === 'home' ? `${cmp(sum.spent)} spent · your share ${cmp(sum.myShare ?? 0)}`
          : sum.budgetLeft !== null ? `${cmp(sum.spent)} of ${cmp(s.budget ?? 0)} · ${sum.budgetLeft >= 0 ? `${cmp(sum.budgetLeft)} left` : `${cmp(-sum.budgetLeft)} over`}` : `${cmp(sum.spent)} spent`;
        return (
          <Press key={s.id} onPress={() => switchTo(s.id)} onLongPress={() => pro && setEditing(s)} accessibilityLabel={`Switch to ${s.name}`}>
            <Card style={{ gap: sp.sm, borderWidth: active === s.id ? 2 : 1, borderColor: active === s.id ? colors.primary : colors.border }}>
              <Row style={{ gap: sp.md }}>
                <Text style={{ fontSize: 28 }}>{s.emoji}</Text>
                <View style={{ flex: 1 }}><Text v="title">{s.name}</Text><Text v="small" color={colors.textMuted}>{KIND_INFO[s.kind].label}</Text></View>
                {pro ? <Button title="Edit" kind="ghost" size="sm" onPress={() => setEditing(s)} /> : null}
              </Row>
              <Text v="small" style={{ fontFamily: fonts.semibold }}>{line}</Text>
              {sum && sum.budgetUsedPct !== null ? <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.track }}><View style={{ width: `${Math.min(100, sum.budgetUsedPct)}%`, height: 6, borderRadius: 3, backgroundColor: sum.budgetUsedPct > 100 ? colors.expense : colors.primary }} /></View> : null}
            </Card>
          </Press>
        );
      })}
      {spaces.length === 0 ? (
        <ProGate title="Spaces" body="Keep a side hustle, your home, a trip or a wedding apart from your personal money, each with its own totals, profit or budget.">
          <Card style={{ gap: sp.sm }}>
            {(Object.keys(KIND_INFO) as SpaceKind[]).map((k) => <Row key={k} style={{ gap: sp.md }}><Text style={{ fontSize: 22 }}>{KIND_INFO[k].emoji}</Text><View style={{ flex: 1 }}><Text v="title">{KIND_INFO[k].label}</Text><Text v="small" color={colors.textMuted}>{KIND_INFO[k].hint}</Text></View></Row>)}
            <Button title="Create a space" onPress={() => setEditing('new')} />
          </Card>
        </ProGate>
      ) : null}
      <Modal visible={editing !== null} transparent animationType="none" onRequestClose={() => setEditing(null)}>
        <Sheet onClose={() => setEditing(null)}>
          {editing !== null ? <SpaceForm initial={editing === 'new' ? null : editing} existing={spaces} onSave={saveSpace} onDelete={editing !== 'new' ? () => remove(editing) : undefined} /> : null}
        </Sheet>
      </Modal>
      <ToastHost />
    </SubScreen>
  );
}
