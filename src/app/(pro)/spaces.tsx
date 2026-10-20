import React, { useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { SubScreen, Card, Text, Row, Button, Press, Field, Chip, Tag } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { KIND_INFO, summarize, validateSpace, type Space, type SpaceKind, type SpaceSummary } from '@/features/spaces/spaces';
import { ProGate } from '@/features/pro/ProGate';
import { useIsPro } from '@/features/pro/store';
import { useSettings } from '@/store/settings';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import { monthLabel, startOfMonth } from '@/lib/date';
import { uuid } from '@/lib/id';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space as sp } from '@/theme/tokens';

const cmp = (n: number) => formatMoney(n, 'INR', { compact: true });
// One flat colour per kind; the space's first letter sits on it (no emojis).
const KIND_COLOR: Record<SpaceKind | 'personal', string> = { personal: '#14181F', side: '#4B1FD1', home: '#0C9C74', trip: '#1460FF', event: '#FF2E7E' };

function Mono({ name, kind, size = 44 }: { name: string; kind: SpaceKind | 'personal'; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: KIND_COLOR[kind], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.brandBlack, fontSize: size * 0.44, color: '#FFFFFF' }}>{name.trim()[0]?.toUpperCase() ?? '?'}</Text>
    </View>
  );
}

/** The two or three numbers that matter for each kind of space. */
function stats(s: Space, sum: SpaceSummary): { label: string; value: string; tone?: 'good' | 'bad' }[] {
  if (s.kind === 'side') return [
    { label: 'In', value: cmp(sum.income) },
    { label: 'Out', value: cmp(sum.spent) },
    { label: 'Profit', value: cmp(sum.profit), tone: sum.profit >= 0 ? 'good' : 'bad' },
  ];
  if (s.kind === 'home') return [{ label: 'Spent', value: cmp(sum.spent) }, { label: 'Your share', value: cmp(sum.myShare ?? 0) }];
  if (sum.budgetLeft !== null) return [{ label: 'Spent', value: cmp(sum.spent) }, { label: sum.budgetLeft >= 0 ? 'Left' : 'Over', value: cmp(Math.abs(sum.budgetLeft)), tone: sum.budgetLeft >= 0 ? 'good' : 'bad' }];
  return [{ label: 'Spent', value: cmp(sum.spent) }, { label: 'Entries', value: String(sum.entries) }];
}

function SpaceForm({ initial, kind0, existing, onSave, onDelete }: { initial: Space | null; kind0: SpaceKind; existing: Space[]; onSave: (s: Space) => void; onDelete?: () => void }) {
  const { colors } = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<SpaceKind>(initial?.kind ?? kind0);
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
      <Row style={{ gap: sp.md }}>
        <Mono name={name || KIND_INFO[kind].label} kind={kind} size={48} />
        <Text v="h2" style={{ flex: 1 }}>{initial ? 'Edit space' : 'New space'}</Text>
      </Row>
      <Row style={{ flexWrap: 'wrap', gap: sp.sm }}>
        {(Object.keys(KIND_INFO) as SpaceKind[]).map((k) => <Chip key={k} label={KIND_INFO[k].label} selected={kind === k} onPress={() => setKind(k)} />)}
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
      <Button title="Save" kind="accent" onPress={save} />
      {onDelete ? <Button title="Delete space" kind="ghost" onPress={onDelete} /> : null}
    </ScrollView>
  );
}

/** Spaces (Pro): personal, side hustle, home, trip and event money kept apart on one phone. */
export default function Spaces() {
  const db = useDb();
  const { colors } = useTheme();
  const pro = useIsPro();
  const spaces = useSettings((s) => s.spaces);
  const active = useSettings((s) => s.activeSpace);
  const set = useSettings((s) => s.set);
  const [editing, setEditing] = useState<Space | null | 'new'>(null);
  const [newKind, setNewKind] = useState<SpaceKind>('side');
  const from = startOfMonth(Date.now());
  const q = useQuery((d) => listTransactions(d, { from, to: Date.now() + 1, allSpaces: true }), [spaces.length]);

  async function switchTo(id: string) {
    if (id === active) return;
    await set(db, 'activeSpace', id);
    bumpData();
    toast(id ? `Switched to ${spaces.find((x) => x.id === id)?.name}` : 'Back to Personal');
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
  const startNew = (k: SpaceKind) => { setNewKind(k); setEditing('new'); };

  const personal = q.data ? q.data.filter((t) => !t.space_id && !t.excluded) : [];
  const pSpent = personal.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const cur = spaces.find((x) => x.id === active) ?? null;
  const curSum = cur && q.data ? summarize(cur, q.data, from, Date.now() + 1) : null;

  const heroStats = cur && curSum ? stats(cur, curSum) : [{ label: 'Spent', value: cmp(pSpent) }, { label: 'Entries', value: String(personal.length) }];

  return (
    <SubScreen title="Spaces">
      {/* where you are now */}
      <Card tone="ink" style={{ gap: sp.lg }}>
        <Row style={{ gap: sp.md }}>
          <Mono name={cur?.name ?? 'Personal'} kind={cur?.kind ?? 'personal'} size={52} />
          <View style={{ flex: 1 }}>
            <Text v="caps" color={colors.onHeroMuted}>YOU’RE IN</Text>
            <Text style={{ fontFamily: fonts.brandBlack, fontSize: 24, color: colors.onHero }} numberOfLines={1}>{cur?.name ?? 'Personal'}</Text>
          </View>
          {cur ? <Button title="Personal" size="sm" kind="secondary" onPress={() => switchTo('')} /> : null}
        </Row>
        <Row style={{ gap: sp.lg }}>
          {heroStats.map((x) => (
            <View key={x.label} style={{ flex: 1 }}>
              <Text v="small" color={colors.onHeroMuted}>{x.label}</Text>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: 22, color: x.tone === 'bad' ? '#FF8A8A' : colors.onHero }}>{x.value}</Text>
            </View>
          ))}
        </Row>
        {curSum && curSum.budgetUsedPct !== null ? (
          <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, curSum.budgetUsedPct)}%`, height: 8, backgroundColor: curSum.budgetUsedPct > 100 ? '#FF8A8A' : colors.primary }} />
          </View>
        ) : null}
        <Text v="small" color={colors.onHeroMuted}>{monthLabel(from)} so far. Home, Activity and Insights show only this space.</Text>
      </Card>

      {spaces.length > 0 ? <Text v="caps" color={colors.textMuted} style={{ marginTop: sp.sm }}>YOUR SPACES</Text> : null}
      {[{ id: '', s: null as Space | null }, ...spaces.map((s) => ({ id: s.id, s }))].map(({ id, s }) => {
        const sum = s && q.data ? summarize(s, q.data, from, Date.now() + 1) : null;
        const on = active === id;
        const row = s && sum ? stats(s, sum) : [{ label: 'Spent', value: cmp(pSpent) }];
        return (
          <Card key={id || 'personal'} onPress={() => switchTo(id)} accessibilityLabel={`Switch to ${s?.name ?? 'Personal'}`} style={{ gap: sp.md, borderWidth: on ? 2 : 1, borderColor: on ? colors.ink : colors.border }}>
            <Row style={{ gap: sp.md }}>
              <Mono name={s?.name ?? 'Personal'} kind={s?.kind ?? 'personal'} />
              <View style={{ flex: 1 }}>
                <Text v="title" numberOfLines={1}>{s?.name ?? 'Personal'}</Text>
                <Text v="small" color={colors.textMuted}>{s ? KIND_INFO[s.kind].label : 'Everyday money'}</Text>
              </View>
              {on ? <Tag label="Active" tone="ink" /> : null}
              {s && pro ? (
                <Press onPress={() => setEditing(s)} accessibilityLabel={`Edit ${s.name}`} hitSlop={10} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }}>
                  <Icon name="edit" size={16} color={colors.textMuted} />
                </Press>
              ) : null}
            </Row>
            <Row style={{ gap: sp.lg }}>
              {row.map((x) => (
                <View key={x.label} style={{ flex: 1 }}>
                  <Text v="small" color={colors.textMuted}>{x.label}</Text>
                  <Text v="title" color={x.tone === 'bad' ? colors.expense : x.tone === 'good' ? colors.income : colors.text}>{x.value}</Text>
                </View>
              ))}
            </Row>
            {sum && sum.budgetUsedPct !== null ? (
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, sum.budgetUsedPct)}%`, height: 6, backgroundColor: sum.budgetUsedPct > 100 ? colors.expense : colors.primary }} />
              </View>
            ) : null}
            {s?.kind === 'side' && sum && sum.taxSetAside > 0 ? <Text v="small" color={colors.textMuted}>Keep aside about {cmp(sum.taxSetAside)} for tax{sum.margin !== null ? ` · ${sum.margin}% margin` : ''}</Text> : null}
          </Card>
        );
      })}

      <Text v="caps" color={colors.textMuted} style={{ marginTop: sp.sm }}>START A NEW SPACE</Text>
      <ProGate title="Spaces" body="Keep a side hustle, your home, a trip or a wedding apart from your personal money, each with its own totals, profit or budget.">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm }}>
          {(Object.keys(KIND_INFO) as SpaceKind[]).map((k) => (
            <Press key={k} onPress={() => startNew(k)} accessibilityLabel={`New ${KIND_INFO[k].label} space`}
              style={{ width: '48.5%', minHeight: 120, borderRadius: 20, padding: sp.md, gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: KIND_COLOR[k] }} />
              <Text v="title">{KIND_INFO[k].label}</Text>
              <Text v="small" color={colors.textMuted} numberOfLines={3}>{KIND_INFO[k].hint}</Text>
            </Press>
          ))}
        </View>
      </ProGate>

      <Modal visible={editing !== null} transparent animationType="none" onRequestClose={() => setEditing(null)}>
        <Sheet onClose={() => setEditing(null)}>
          {editing !== null ? <SpaceForm initial={editing === 'new' ? null : editing} kind0={newKind} existing={spaces} onSave={saveSpace} onDelete={editing !== 'new' ? () => remove(editing) : undefined} /> : null}
        </Sheet>
      </Modal>
      <ToastHost />
    </SubScreen>
  );
}
