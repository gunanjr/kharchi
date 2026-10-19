import React, { useState } from 'react';
import { Pressable, ScrollView, View , Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Header, Text, Card, Row, Button, Enter, Field, Chip, MoneyText } from '@/components/ui';
import { EmptyState, SkeletonList } from '@/components/Feedback';
import { Sheet } from '@/components/Sheet';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { addPerson, createGroup, ensureSelf, friendBalances, groupSummary, listGroups, listPeople } from '@/features/groups/repo';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const ICONS = ['👥', '✈️', '🏠', '🍽️', '🎉', '💼', '🏖️', '🎬'];

function BalanceLabel({ net, currency = 'INR' }: { net: number; currency?: string }) {
  const { colors } = useTheme();
  if (net === 0) return <Text v="small" color={colors.textMuted}>settled up</Text>;
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Text v="caps" color={net > 0 ? colors.income : colors.expense}>{net > 0 ? 'YOU ARE OWED' : 'YOU OWE'}</Text>
      <MoneyText color={net > 0 ? colors.income : colors.expense}>{formatMoney(Math.abs(net), currency, { trimZeros: true })}</MoneyText>
    </View>
  );
}

export default function Groups() {
  const router = useRouter();
  const db = useDb();
  const { colors } = useTheme();
  const [newGroup, setNewGroup] = useState(false);
  const [newFriend, setNewFriend] = useState(false);
  const q = useQuery(async (d) => {
    await ensureSelf(d);
    const groups = await listGroups(d);
    const sums = await Promise.all(groups.map((g) => groupSummary(d, g.id)));
    const friends = await friendBalances(d);
    return { sums: sums.filter((s) => !!s), friends };
  }, []);

  return (
    <Screen>
      <Header title="Groups" right={<Row style={{ gap: 4 }}><Button title="📷" accessibilityLabel="Scan a bill" kind="secondary" onPress={() => router.push('/scan-bill')} style={{ paddingHorizontal: space.md }} /><Button title="+ Friend" kind="ghost" onPress={() => setNewFriend(true)} /><Button title="+ Group" onPress={() => setNewGroup(true)} /></Row>} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 100 }}>
        {q.loading && !q.data ? <SkeletonList n={3} /> : null}
        {q.data && q.data.sums.length === 0 && (
          <EmptyState art="group" title="Split anything, with anyone" body="Create a group for a trip, flat or dinner. Unlimited groups, friends and expenses. No paywall." action="Create a group" onAction={() => setNewGroup(true)} />
        )}
        {q.data?.sums.map((s, i) => s && (
          <Enter key={s.group.id} i={i}>
            <Card onPress={() => router.push(`/group/${s.group.id}`)} accessibilityLabel={`${s.group.name}, ${s.members.length} people`}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ flex: 1 }}>
                  <Text style={{ fontSize: 30 }}>{s.group.icon}</Text>
                  <View style={{ flex: 1 }}><Text v="title" numberOfLines={1}>{s.group.name}</Text><Text v="small" color={colors.textMuted}>{s.members.length} people · {formatMoney(s.totalSpent, s.group.currency, { compact: true })} spent</Text></View>
                </Row>
                <BalanceLabel net={s.myBalance} currency={s.group.currency} />
              </Row>
            </Card>
          </Enter>
        ))}
        {q.data && q.data.friends.length > 0 && (
          <View style={{ gap: space.sm, marginTop: space.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text v="h2">Friends</Text>
              <Button title="Split with a friend" kind="ghost" onPress={() => router.push('/group-expense')} />
            </Row>
            {q.data.friends.map((f) => (
              <Pressable key={f.person.id} accessibilityRole="button" onPress={() => router.push(`/friend/${f.person.id}`)} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Row><View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Text v="title" color={colors.primary}>{f.person.name[0]?.toUpperCase()}</Text></View><Text v="title">{f.person.name}</Text></Row>
                <BalanceLabel net={f.net} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <ToastHost />
      <NewGroupModal visible={newGroup} onClose={() => setNewGroup(false)} onCreated={(id) => { setNewGroup(false); router.push(`/group/${id}`); }} />
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
        <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{ICONS.map((i) => <Chip key={i} label="" icon={i} selected={icon === i} onPress={() => setIcon(i)} />)}</Row>
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
