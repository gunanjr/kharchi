import React, { useMemo, useState } from 'react';
import { ScrollView, View, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Header, Text, Card, Row, Button, Enter, Field, Chip, GlyphPick, Money, IconTile, Segmented, RoundButton, Press } from '@/components/ui';
import { EmptyState, SkeletonList } from '@/components/Feedback';
import { Sheet } from '@/components/Sheet';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { addPerson, createGroup, ensureSelf, friendBalances, groupSummary, listGroups, listPeople } from '@/features/groups/repo';
import { memberLine, overview, sortByOutstanding } from '@/features/groups/overview';
import { BruhSheet } from '@/features/groups/ui/BruhSheet';
import type { NudgeInput } from '@/features/groups/nudge';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { GROUP_ICONS, groupGlyph } from '@/components/glyphs';
import { Glyph, Icon } from '@/components/Icon';
import { radius, space, layout } from '@/theme/tokens';
import { ProStrip } from '@/features/pro/ProStrip';

const ICONS = ['👥', '✈️', '🏠', '🍽️', '🎉', '💼', '🏖️', '🎬'];

/** Overlapping initials, up to four people and a "+n". */
function Faces({ names, size = 28 }: { names: string[]; size?: number }) {
  const { colors } = useTheme();
  const shown = names.slice(0, 4);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {shown.map((n, i) => (
        <View key={i} style={{ width: size, height: size, borderRadius: size / 2, marginLeft: i ? -size * 0.3 : 0, backgroundColor: colors.surfaceAlt, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Text v="caps" color={colors.link} style={{ letterSpacing: 0, fontSize: size * 0.4 }}>{(n[0] ?? '?').toUpperCase()}</Text>
        </View>
      ))}
      {names.length > shown.length ? <Text v="small" color={colors.textMuted} style={{ marginLeft: 6 }}>+{names.length - shown.length}</Text> : null}
    </View>
  );
}

/** One line that says where a balance stands, in words and colour. */
function Status({ net, currency = 'INR', align = 'right' }: { net: number; currency?: string; align?: 'left' | 'right' }) {
  const { colors } = useTheme();
  if (net === 0) return <Text v="small" color={colors.textMuted} style={{ textAlign: align }}>All settled</Text>;
  const owed = net > 0;
  return (
    <View style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <Text v="small" color={owed ? colors.income : colors.expense} style={{ fontFamily: 'Geist_600SemiBold' }}>{owed ? 'You are owed' : 'You owe'}</Text>
      <Money size="md" align={align} color={owed ? colors.income : colors.expense} text={formatMoney(Math.abs(net), currency, { trimZeros: true })} />
    </View>
  );
}

export default function Groups() {
  const router = useRouter();
  const { colors } = useTheme();
  const [bruh, setBruh] = useState<NudgeInput | null>(null);
  const [newGroup, setNewGroup] = useState(false);
  const [newFriend, setNewFriend] = useState(false);
  const [view, setView] = useState<'groups' | 'friends'>('groups');
  const q = useQuery(async (d) => {
    const me = await ensureSelf(d);
    const groups = await listGroups(d);
    const sums = (await Promise.all(groups.map((g) => groupSummary(d, g.id)))).filter((s): s is NonNullable<typeof s> => !!s);
    const friends = await friendBalances(d);
    return { me, sums, friends };
  }, []);
  const o = useMemo(() => overview(q.data?.friends ?? []), [q.data]);
  const sums = useMemo(() => sortByOutstanding(q.data?.sums ?? []), [q.data]);
  const friends = useMemo(() => [...(q.data?.friends ?? [])].sort((a, b) => Math.abs(b.net) - Math.abs(a.net)), [q.data]);
  const has = !!q.data && (q.data.sums.length > 0 || q.data.friends.length > 0);

  return (
    <Screen>
      <Header title="Groups" right={<Row style={{ gap: space.sm }}><RoundButton icon="scan" label="Scan a bill" onPress={() => router.push('/scan-bill')} size={44} /><RoundButton icon="personAdd" label="Add a friend" onPress={() => setNewFriend(true)} size={44} /><Button title="Group" size="sm" icon="plus" onPress={() => setNewGroup(true)} /></Row>} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingTop: space.sm, gap: space.lg, paddingBottom: 168 }}>
        {q.loading && !q.data ? <SkeletonList n={3} /> : null}

        {q.data && !has ? (
          <EmptyState art="group" title="Split anything, with anyone" body="Make a group for a trip, the flat or dinner. Add what each person paid and see who owes who. No limits on groups or friends." action="Make a group" onAction={() => setNewGroup(true)} />
        ) : null}

        {has ? (
          <>
            <Enter>
              <Card tone="ink" style={{ gap: space.md }}>
                <Text v="caps" color={colors.onHeroMuted}>ACROSS ALL YOUR FRIENDS</Text>
                {o.net === 0 && o.owed === 0 ? (
                  <Text v="h2" color={colors.onHero}>Nobody owes anybody. Nice.</Text>
                ) : (
                  <>
                    <Text v="small" color={colors.onHeroMuted}>{o.net >= 0 ? 'Overall you are owed' : 'Overall you owe'}</Text>
                    <Money size="xl" color={colors.onHero} text={formatMoney(Math.abs(o.net), 'INR', { trimZeros: true })} />
                  </>
                )}
                <View style={{ flexDirection: 'row', gap: space.lg, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.onHeroLine }}>
                  {([
                    { icon: 'arrowDown' as const, label: o.owedBy ? `Owed to you by ${o.owedBy}` : 'Owed to you', v: o.owed },
                    { icon: 'arrowUp' as const, label: o.oweTo ? `You owe ${o.oweTo}` : 'You owe', v: o.owe },
                  ]).map((x) => (
                    <View key={x.icon} style={{ flex: 1, flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={x.icon} size={15} color={colors.onHero} />
                      </View>
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text v="small" color={colors.onHeroMuted} numberOfLines={1}>{x.label}</Text>
                        <Money size="md" color={colors.onHero} text={formatMoney(x.v, 'INR', { trimZeros: true })} />
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            </Enter>

            <Segmented options={[{ key: 'groups', label: `Groups ${sums.length}` }, { key: 'friends', label: `Friends ${friends.length}` }]} value={view} onChange={setView} />

            {view === 'groups' ? (
              <View style={{ gap: space.md }}>
                {sums.map((s, i) => {
                  const others = s.members.filter((m) => !m.is_self).map((m) => m.name.split(' ')[0]);
                  return (
                    <Enter key={s.group.id} i={i}>
                      <Card onPress={() => router.push(`/group/${s.group.id}`)} accessibilityLabel={`${s.group.name}, ${s.members.length} people`} style={{ gap: space.md }}>
                        <Row style={{ gap: space.md }}>
                          <IconTile size={52} tone="ink"><Glyph name={groupGlyph(s.group.icon)} size={24} color={colors.onInk} /></IconTile>
                          <View style={{ flex: 1 }}>
                            <Text v="h3" numberOfLines={1}>{s.group.name}</Text>
                            <Text v="small" color={colors.textMuted} numberOfLines={1}>{memberLine(others)}</Text>
                          </View>
                          <Icon name="chevron" color={colors.textSubtle} size={18} />
                        </Row>
                        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.border }}>
                          <View style={{ gap: 6 }}>
                            <Faces names={s.members.map((m) => (m.is_self ? 'You' : m.name))} />
                            <Text v="small" color={colors.textMuted}>{formatMoney(s.totalSpent, s.group.currency, { compact: true })} spent in total</Text>
                          </View>
                          <Status net={s.myBalance} currency={s.group.currency} />
                        </Row>
                      </Card>
                    </Enter>
                  );
                })}
                <Press accessibilityLabel="Make a group" onPress={() => setNewGroup(true)} style={{ borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, minHeight: 76, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space.sm }}>
                  <Icon name="plus" color={colors.link} size={20} />
                  <Text v="title" color={colors.link}>Make a group</Text>
                </Press>
              </View>
            ) : (
              <View style={{ gap: space.md }}>
                {friends.length === 0 ? <EmptyState art="group" title="No friends yet" body="Add the people you split with, then nudge them when they owe you." action="Add a friend" onAction={() => setNewFriend(true)} /> : null}
                {friends.map((f, i) => (
                  <Enter key={f.person.id} i={i}>
                    <Card onPress={() => router.push(`/friend/${f.person.id}`)} accessibilityLabel={f.person.name} style={{ gap: space.md }}>
                      <Row style={{ gap: space.md }}>
                        <IconTile size={44} tone="plain"><Text v="title" color={colors.link}>{(f.person.name[0] ?? '?').toUpperCase()}</Text></IconTile>
                        <View style={{ flex: 1 }}>
                          <Text v="title" numberOfLines={1}>{f.person.name}</Text>
                          <Text v="small" color={f.net > 0 ? colors.income : f.net < 0 ? colors.expense : colors.textMuted} numberOfLines={1}>
                            {f.net > 0 ? 'owes you' : f.net < 0 ? 'you owe them' : 'all settled'}
                          </Text>
                        </View>
                        {f.net !== 0 ? <Money size="md" align="right" color={f.net > 0 ? colors.income : colors.expense} text={formatMoney(Math.abs(f.net), 'INR', { trimZeros: true })} /> : null}
                      </Row>
                      {f.net > 0 ? (
                        <Button title="Bruh them" size="sm" icon="send" onPress={() => setBruh({ amount: f.net, name: f.person.name })} style={{ alignSelf: 'flex-start' }} />
                      ) : null}
                    </Card>
                  </Enter>
                ))}
                <Button title="Split with a friend" kind="secondary" icon="plus" onPress={() => router.push('/group-expense')} />
              </View>
            )}
          </>
        ) : null}
        {has ? (
          <ProStrip tab="groups" title="Pro tools" />
        ) : null}
      </ScrollView>
      <ToastHost />
      <NewGroupModal visible={newGroup} onClose={() => setNewGroup(false)} onCreated={(id) => { setNewGroup(false); router.push(`/group/${id}`); }} />
      <BruhSheet input={bruh} onClose={() => setBruh(null)} />
      <NewFriendModal visible={newFriend} onClose={() => setNewFriend(false)} />
    </Screen>
  );
}

function NewFriendModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const db = useDb();
  const [name, setName] = useState('');
  const [upi, setUpi] = useState('');
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Sheet onClose={onClose}>
        <Text v="h2">Add a friend</Text>
        <Field label="Name" value={name} onChangeText={setName} autoFocus />
        <Field label="UPI ID (optional, for settle-up)" value={upi} onChangeText={setUpi} autoCapitalize="none" placeholder="name@okaxis" />
        <Button title="Add" disabled={!name.trim()} onPress={async () => { await addPerson(db, { name, upi_id: upi.trim() || null }); setName(''); setUpi(''); bumpData(); toast('Friend added'); onClose(); }} />
      </Sheet>
    </Modal>
  );
}

function NewGroupModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const db = useDb();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [currency, setCurrency] = useState('INR');
  const [sel, setSel] = useState<string[]>([]);
  const [fresh, setFresh] = useState('');
  const people = useQuery((d) => listPeople(d), []);
  const friends = (people.data ?? []).filter((p) => !p.is_self);
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Sheet onClose={onClose}>
        <Text v="h2">New group</Text>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Goa trip" autoFocus />
        <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{ICONS.map((i) => <GlyphPick key={i} label={GROUP_ICONS.find((g) => g.value === i)?.label ?? 'Icon'} glyph={groupGlyph(i)} selected={icon === i} onPress={() => setIcon(i)} />)}</Row>
        <Row>{['INR', 'USD', 'EUR', 'AED'].map((c) => <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />)}</Row>
        <Text v="caps">MEMBERS</Text>
        <Row style={{ flexWrap: 'wrap', gap: space.sm }}>
          {friends.map((f) => <Chip key={f.id} label={f.name} selected={sel.includes(f.id)} onPress={() => setSel(sel.includes(f.id) ? sel.filter((x) => x !== f.id) : [...sel, f.id])} />)}
        </Row>
        <Row>
          <View style={{ flex: 1 }}><Field value={fresh} onChangeText={setFresh} placeholder="Add someone new" accessibilityLabel="New member name" /></View>
          <Button title="Add" kind="secondary" disabled={!fresh.trim()} onPress={async () => { const id = await addPerson(db, { name: fresh }); setSel([...sel, id]); setFresh(''); bumpData(); }} />
        </Row>
        <Button title="Create group" disabled={!name.trim()} onPress={async () => { const id = await createGroup(db, { name, currency, icon, memberIds: sel }); setName(''); setSel([]); bumpData(); onCreated(id); }} />
      </Sheet>
    </Modal>
  );
}
