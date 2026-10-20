import React, { useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { SubScreen, Card, Text, Row, Button, Field, Chip, Money, IconTile, Press } from '@/components/ui';
import { Sheet } from '@/components/Sheet';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { accountBalance, addAccount, archiveAccount, listAccounts } from '@/features/tracker/repo';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import type { AccountType } from '@/domain/types';
import { accountGlyph } from '@/components/glyphs';
import { Glyph } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

const TYPES: { t: AccountType; icon: string; label: string }[] = [{ t: 'cash', icon: '💵', label: 'Cash' }, { t: 'bank', icon: '🏦', label: 'Bank' }, { t: 'upi', icon: '📲', label: 'UPI' }, { t: 'card', icon: '💳', label: 'Card' }, { t: 'wallet', icon: '👛', label: 'Wallet' }];
const label = (t: AccountType) => TYPES.find((x) => x.t === t)?.label ?? t;

function NewAccount({ onDone }: { onDone: () => void }) {
  const db = useDb();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [open, setOpen] = useState('');
  const [last4, setLast4] = useState('');
  return (
    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 620 }} contentContainerStyle={{ gap: space.lg, padding: space.lg }}>
      <Text v="h2">Add account</Text>
      <Field label="Name" value={name} onChangeText={setName} placeholder="HDFC Salary" autoFocus />
      <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{TYPES.map((x) => <Chip key={x.t} label={x.label} glyph={accountGlyph(x.t)} selected={type === x.t} onPress={() => setType(x.t)} />)}</Row>
      <Field label="Opening balance (₹)" value={open} onChangeText={(t) => setOpen(t.replace(/[^\d.-]/g, ''))} keyboardType="decimal-pad" />
      <Field label="Last 4 digits (helps match bank messages)" value={last4} onChangeText={(t) => setLast4(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" />
      <Button title="Add account" kind="accent" onPress={async () => {
        if (!name.trim()) return toast('Give it a name');
        await addAccount(db, { name: name.trim(), type, opening_balance: parseAmountToMinor(open) ?? 0, last4: last4 || null, icon: TYPES.find((x) => x.t === type)?.icon });
        bumpData(); toast('Added'); onDone();
      }} />
    </ScrollView>
  );
}

/** Accounts: balances at a glance; tap one to archive it; New adds another. */
export default function Accounts() {
  const db = useDb();
  const { colors } = useTheme();
  const [creating, setCreating] = useState(false);
  const q = useQuery(async (d) => {
    const list = await listAccounts(d);
    return Promise.all(list.map(async (a) => ({ a, bal: await accountBalance(d, a.id) })));
  }, []);
  const total = (q.data ?? []).reduce((s, x) => s + x.bal, 0);
  function archive(id: string, name: string) {
    Alert.alert(`Archive ${name}?`, 'Its entries stay. It just stops showing as an account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: async () => { await archiveAccount(db, id); bumpData(); } },
    ]);
  }
  return (
    <SubScreen title="Accounts" right={<Button title="New" size="sm" icon="plus" onPress={() => setCreating(true)} />}>
      {q.data?.length ? (
        <Card tone="ink" style={{ gap: 6 }}>
          <Text v="caps" color={colors.onHeroMuted}>ALL ACCOUNTS</Text>
          <Text style={{ fontFamily: fonts.brandBlack, fontSize: 30, lineHeight: 36, color: colors.onHero }}>{formatMoney(total, 'INR', { compact: true })}</Text>
          <Text v="small" color={colors.onHeroMuted}>Balances from your opening amount and every entry since. Tap an account to archive it.</Text>
        </Card>
      ) : null}
      {q.data?.length ? (
        <Card pad={false} style={{ paddingHorizontal: space.lg }}>
          {q.data.map(({ a, bal }, i, all) => (
            <Press key={a.id} onPress={() => archive(a.id, a.name)} accessibilityLabel={`${a.name}, ${formatMoney(bal, a.currency)}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, borderBottomWidth: i === all.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
              <IconTile size={42} tone="ink"><Glyph name={accountGlyph(a.type)} size={20} color={colors.onHero} /></IconTile>
              <View style={{ flex: 1 }}>
                <Text v="title" numberOfLines={1}>{a.name}</Text>
                <Text v="small" color={colors.textMuted}>{label(a.type)}{a.last4 ? ` · •${a.last4}` : ''}</Text>
              </View>
              <Money size="md" align="right" color={bal < 0 ? colors.expense : colors.text} text={formatMoney(bal, a.currency, { trimZeros: true })} />
            </Press>
          ))}
        </Card>
      ) : null}
      <Modal visible={creating} transparent animationType="none" onRequestClose={() => setCreating(false)}>
        <Sheet onClose={() => setCreating(false)}><NewAccount onDone={() => setCreating(false)} /></Sheet>
      </Modal>
      <ToastHost />
    </SubScreen>
  );
}
