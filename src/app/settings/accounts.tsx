import React, { useState } from 'react';
import { SubScreen, Card, Text, Row, Button, Field, Chip, MoneyText } from '@/components/ui';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { accountBalance, addAccount, archiveAccount, listAccounts } from '@/features/tracker/repo';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import type { AccountType } from '@/domain/types';
import { space } from '@/theme/tokens';
import { View } from 'react-native';

const TYPES: { t: AccountType; icon: string }[] = [{ t: 'cash', icon: '💵' }, { t: 'bank', icon: '🏦' }, { t: 'upi', icon: '📲' }, { t: 'card', icon: '💳' }, { t: 'wallet', icon: '👛' }];

export default function Accounts() {
  const db = useDb();
  const q = useQuery(async (d) => {
    const list = await listAccounts(d);
    return Promise.all(list.map(async (a) => ({ a, bal: await accountBalance(d, a.id) })));
  }, []);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [open, setOpen] = useState('');
  const [last4, setLast4] = useState('');

  return (
    <SubScreen title="Accounts">
      {q.data?.map(({ a, bal }) => (
        <Card key={a.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row><Text style={{ fontSize: 24 }}>{a.icon ?? '🏦'}</Text><View><Text v="title">{a.name}</Text><Text v="small">{a.type}{a.last4 ? ` · •${a.last4}` : ''}</Text></View></Row>
            <MoneyText>{formatMoney(bal, a.currency)}</MoneyText>
          </Row>
          <Button title="Archive" kind="ghost" onPress={async () => { await archiveAccount(db, a.id); bumpData(); }} />
        </Card>
      ))}
      <Card style={{ gap: space.md }}>
        <Text v="h2">Add account</Text>
        <Field label="Name" value={name} onChangeText={setName} placeholder="HDFC Salary" />
        <Row style={{ flexWrap: 'wrap', gap: space.sm }}>{TYPES.map((x) => <Chip key={x.t} label={x.t} icon={x.icon} selected={type === x.t} onPress={() => setType(x.t)} />)}</Row>
        <Field label="Opening balance (₹)" value={open} onChangeText={setOpen} keyboardType="decimal-pad" />
        <Field label="Last 4 digits (helps match bank messages)" value={last4} onChangeText={(t) => setLast4(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" />
        <Button title="Add" onPress={async () => {
          if (!name.trim()) return toast('Give it a name');
          await addAccount(db, { name: name.trim(), type, opening_balance: parseAmountToMinor(open) ?? 0, last4: last4 || null, icon: TYPES.find((x) => x.t === type)?.icon });
          setName(''); setOpen(''); setLast4(''); bumpData(); toast('Added');
        }} />
      </Card>
      <ToastHost />
    </SubScreen>
  );
}
