import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { SubScreen, Card, Text, Row, Button, Money, Press, Field, Chip } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { EmptyState } from '@/components/Feedback';
import { Sheet } from '@/components/Sheet';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, bumpData } from '@/db/provider';
import { useSettings } from '@/store/settings';
import { ProGate } from '@/features/pro/ProGate';
import { addTransaction } from '@/features/tracker/repo';
import { calendarMonth, monthSummary, reminderAt, togglePaid, validateDue, viewAll, viewOf, type DueItem, type DueKind, type DueView } from '@/features/dues/dues';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import { formatDay, monthLabel } from '@/lib/date';
import { notifyAt, notifyMessage } from '@/lib/notify';
import { uuid } from '@/lib/id';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

const KINDS: { key: DueKind; label: string; icon: IconName; category: string | null }[] = [
  { key: 'card', label: 'Credit card', icon: 'cash', category: null }, // paying a card bill is a transfer, never a second expense
  { key: 'rent', label: 'Rent', icon: 'home', category: 'cat_rent' },
  { key: 'emi', label: 'EMI or loan', icon: 'calendar', category: 'cat_other' },
  { key: 'bill', label: 'Bill', icon: 'bolt', category: 'cat_bills' },
  { key: 'other', label: 'Other', icon: 'flag', category: 'cat_other' },
];
const kindOf = (k: DueKind) => KINDS.find((x) => x.key === k)!;
const inr = (n: number) => formatMoney(n, 'INR', { trimZeros: true });

function statusText(v: DueView) {
  if (v.status === 'paid') return `Paid for ${monthLabel(v.due).split(' ')[0]}`;
  if (v.status === 'overdue') return `Overdue by ${-v.inDays} ${v.inDays === -1 ? 'day' : 'days'} · was due ${formatDay(v.due)}`;
  if (v.status === 'today') return 'Due today';
  return `Due ${formatDay(v.due)} · in ${v.inDays} ${v.inDays === 1 ? 'day' : 'days'}`;
}

function DueForm({ initial, onSave, onDelete }: { initial: DueItem | null; onSave: (d: DueItem) => void; onDelete?: () => void }) {
  const { colors } = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<DueKind>(initial?.kind ?? 'card');
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount / 100) : '');
  const [day, setDay] = useState(initial?.day ?? 5);
  const [remind, setRemind] = useState<0 | 1 | 3>(initial?.remindBefore ?? 1);
  const save = () => {
    const err = validateDue({ name, day });
    if (err) return toast(err);
    const minor = amount.trim() ? parseAmountToMinor(amount, 'INR') : null;
    if (amount.trim() && !minor) return toast('That amount doesn’t look right. Leave it empty if it changes every month.');
    onSave({ id: initial?.id ?? uuid(), name: name.trim(), kind, amount: minor, day, remindBefore: remind, paid: initial?.paid ?? [], remindedFor: initial?.remindedFor });
  };
  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 620 }} contentContainerStyle={{ gap: space.lg, padding: space.lg }}>
      <Text v="h2">{initial ? 'Edit due date' : 'Add a due date'}</Text>
      <Field label="Name" value={name} onChangeText={setName} placeholder="HDFC card, Rent, Electricity" maxLength={40} />
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
        {KINDS.map((k) => <Chip key={k.key} label={k.label} selected={kind === k.key} onPress={() => setKind(k.key)} />)}
      </Row>
      <Field label="Amount (optional, leave empty if it changes)" value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="e.g. 22000" />
      <View style={{ gap: space.sm }}>
        <Text v="caps" color={colors.textMuted}>DUE ON DAY {day} OF EVERY MONTH</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <Press key={d} onPress={() => { setDay(d); haptic.tap(); }} accessibilityLabel={`Day ${d}`} accessibilityState={{ selected: d === day }}
              style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: d === day ? colors.ink : colors.surfaceAlt }}>
              <Text v="small" color={d === day ? colors.onInk : colors.text} style={{ fontFamily: fonts.semibold }}>{d}</Text>
            </Press>
          ))}
        </View>
        {day > 28 ? <Text v="small" color={colors.textMuted}>In shorter months it is due on the last day.</Text> : null}
      </View>
      <View style={{ gap: space.sm }}>
        <Text v="caps" color={colors.textMuted}>REMIND ME</Text>
        <Row style={{ gap: space.sm }}>
          {([[0, 'On the day'], [1, '1 day before'], [3, '3 days before']] as [0 | 1 | 3, string][]).map(([k, l]) => <Chip key={k} label={l} selected={remind === k} onPress={() => setRemind(k)} />)}
        </Row>
      </View>
      <Button title="Save" onPress={save} />
      {onDelete ? <Button title="Delete" kind="ghost" onPress={onDelete} /> : null}
    </ScrollView>
  );
}

/** Due dates (Pro): card, rent, EMI and bills on a calendar, with reminders so nothing is paid late. */
export default function Dues() {
  const db = useDb();
  const { colors } = useTheme();
  const items = useSettings((s) => s.dueItems);
  const set = useSettings((s) => s.set);
  const [editing, setEditing] = useState<DueItem | null | 'new'>(null);
  const now = Date.now();
  const views = viewAll(items, now);
  const sum = monthSummary(items, now);
  const d = new Date(now);
  const year = d.getFullYear(), month = d.getMonth();
  const cal = calendarMonth(items, year, month);

  const save = (list: DueItem[]) => set(db, 'dueItems', list);

  /** Set a reminder for the shown due date, once per due date. `ask` = the user just acted, so permission may be requested. */
  async function scheduleFor(item: DueItem, ask: boolean): Promise<DueItem> {
    const v = viewOf(item, Date.now());
    const when = reminderAt(v, Date.now());
    if (!when || item.remindedFor === v.due) return item;
    if (!ask && item.remindedFor === undefined) return item;
    const r = await notifyAt(when, v.status === 'today' || v.remindBefore === 0 ? `${item.name} is due today` : `${item.name} is due ${v.remindBefore === 1 ? 'tomorrow' : `in ${v.remindBefore} days`}`, item.amount ? `${inr(item.amount)} due on ${formatDay(v.due)}. Pay it on time and skip the late fee.` : `Due on ${formatDay(v.due)}. Pay it on time and skip the late fee.`);
    if (ask) toast(notifyMessage(r));
    return r === 'scheduled' ? { ...item, remindedFor: v.due } : item;
  }

  // Quietly re-arm next month's reminders for bills that already had one (permission was given before).
  useEffect(() => {
    (async () => {
      let changed = false;
      const next = await Promise.all(items.map(async (i) => { const u = await scheduleFor(i, false); if (u !== i) changed = true; return u; }));
      if (changed) save(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upsert(item: DueItem) {
    const withReminder = await scheduleFor({ ...item, remindedFor: item.remindedFor }, true);
    const list = items.some((i) => i.id === item.id) ? items.map((i) => (i.id === item.id ? withReminder : i)) : [...items, withReminder];
    await save(list);
    setEditing(null);
  }
  function markPaid(v: DueView) {
    const item = items.find((i) => i.id === v.id)!;
    const apply = async (addExpense: boolean) => {
      if (addExpense && item.amount) {
        await addTransaction(db, { type: 'expense', amount: item.amount, category_id: kindOf(item.kind).category, merchant: item.name, note: 'Paid on time', occurred_at: Date.now(), source: 'manual' });
        bumpData();
      }
      const toggled = togglePaid(item, v.month);
      const armed = await scheduleFor(toggled, false);
      await save(items.map((i) => (i.id === item.id ? armed : i)));
      haptic.success();
      toast(`${item.name} marked paid`);
    };
    if (v.status === 'paid') return save(items.map((i) => (i.id === item.id ? togglePaid(item, v.month) : i)));
    if (item.amount && kindOf(item.kind).category) {
      Alert.alert(`Mark ${item.name} paid?`, `Also add ${inr(item.amount)} to your spending?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Just mark paid', onPress: () => apply(false) },
        { text: 'Add and mark paid', onPress: () => apply(true) },
      ]);
    } else apply(false);
  }

  return (
    <SubScreen title="Due dates" right={<Button title="Add" size="sm" icon="plus" onPress={() => setEditing('new')} />}>
      <ProGate title="Due dates" body="Keep every card bill, rent, EMI and bill on one calendar. BruhMe reminds you before each one, shows what is overdue, and adds it to your spending when you mark it paid.">
        <Card tone="ink" style={{ gap: space.md }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ gap: 2 }}>
              <Text v="small" color={colors.onHeroMuted}>{monthLabel(sum.month)}</Text>
              <Money size="lg" color={colors.onHero} text={sum.due ? inr(sum.due) : `${sum.count} ${sum.count === 1 ? 'bill' : 'bills'}`} />
            </View>
            <Text v="small" color={colors.onHeroMuted}>{sum.paidCount} of {sum.count} paid</Text>
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {cal.map((c) => (
              <View key={c.day} style={{ width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: c.day === d.getDate() ? colors.primary : c.count ? 'rgba(255,255,255,0.18)' : 'transparent' }}>
                <Text style={{ fontSize: 10, fontFamily: fonts.semibold, color: c.day === d.getDate() ? colors.onPrimary : c.count ? colors.onHero : colors.onHeroMuted }}>{c.day}</Text>
              </View>
            ))}
          </View>
        </Card>
        {views.length === 0 ? (
          <EmptyState art="wallet" title="No due dates yet" body="Add your credit card, rent, EMI or electricity bill and get a reminder before each one." action="Add a due date" onAction={() => setEditing('new')} />
        ) : views.map((v) => {
          const k = kindOf(v.kind);
          const tone = v.status === 'overdue' ? colors.expense : v.status === 'today' || v.status === 'soon' ? colors.link : v.status === 'paid' ? colors.income : colors.textMuted;
          return (
            <Card key={v.id} style={{ gap: space.md }}>
              <Press onPress={() => setEditing(items.find((i) => i.id === v.id) ?? null)} accessibilityLabel={`Edit ${v.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}><Icon name={k.icon} size={20} color={colors.text} /></View>
                <View style={{ flex: 1 }}>
                  <Text v="title" numberOfLines={1}>{v.name}</Text>
                  <Text v="small" color={tone}>{statusText(v)}</Text>
                </View>
                {v.amount ? <Money size="md" align="right" text={inr(v.amount)} /> : null}
              </Press>
              <Button title={v.status === 'paid' ? 'Undo paid' : 'Mark paid'} kind={v.status === 'paid' ? 'ghost' : v.status === 'overdue' || v.status === 'today' ? 'accent' : 'secondary'} size="sm" icon={v.status === 'paid' ? undefined : 'check'} onPress={() => markPaid(v)} style={{ alignSelf: 'flex-start' }} />
            </Card>
          );
        })}
        <Text v="small" color={colors.textSubtle} style={{ textAlign: 'center' }}>Reminders are notifications on this phone. BruhMe never pays anything for you.</Text>
      </ProGate>
      <Modal visible={editing !== null} transparent animationType="none" onRequestClose={() => setEditing(null)}>
        <Sheet onClose={() => setEditing(null)}>
          {editing !== null ? (
            <DueForm
              initial={editing === 'new' ? null : editing}
              onSave={upsert}
              onDelete={editing !== 'new' ? () => Alert.alert(`Delete ${editing.name}?`, undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await save(items.filter((i) => i.id !== editing.id)); setEditing(null); } }]) : undefined}
            />
          ) : null}
        </Sheet>
      </Modal>
      <ToastHost />
    </SubScreen>
  );
}
