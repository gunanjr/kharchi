import React, { useState } from 'react';
import { Modal, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SubScreen, Card, Text, Row, Button, Field, MoneyText } from '@/components/ui';
import { Sheet } from '@/components/Sheet';
import { ToastHost, toast } from '@/components/Toast';
import { SettleForm } from '@/features/groups/ui/SettleSheet';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { ensureSelf, friendBalances, listPeople, updatePerson } from '@/features/groups/repo';
import { isValidVpa } from '@/features/groups/upi';
import { scheduleReminder } from '@/features/groups/reminders';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function Friend() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const { colors } = useTheme();
  const [settle, setSettle] = useState(false);
  const [upi, setUpi] = useState<string | null>(null);
  const q = useQuery(async (d) => ({ me: await ensureSelf(d), people: await listPeople(d), fb: await friendBalances(d) }), [id]);
  const p = q.data?.people.find((x) => x.id === id);
  if (!q.data || !p) return <SubScreen title="Friend"><Text>Loading…</Text></SubScreen>;
  const net = q.data.fb.find((f) => f.person.id === id)?.net ?? 0;
  const me = q.data.me;

  return (
    <SubScreen title={p.name}>
      <Card style={{ gap: space.sm }}>
        {net === 0 ? <Text v="h2">You’re settled up</Text> : (
          <>
            <Text v="caps" color={colors.textMuted}>{net > 0 ? `${p.name.toUpperCase()} OWES YOU` : `YOU OWE ${p.name.toUpperCase()}`}</Text>
            <MoneyText v="hero" color={net > 0 ? colors.income : colors.expense}>{formatMoney(Math.abs(net), 'INR', { trimZeros: true })}</MoneyText>
          </>
        )}
        {net !== 0 && <Button title="Settle up" onPress={() => setSettle(true)} />}
        {net > 0 && <Button title="Remind me to ask in 3 days" kind="secondary" onPress={async () => toast((await scheduleReminder(p.name, formatMoney(net, 'INR', { trimZeros: true }), 3)) ? 'Reminder set' : 'Allow notifications to use reminders')} />}
      </Card>
      <Card style={{ gap: space.md }}>
        <Field label="UPI ID" value={upi ?? p.upi_id ?? ''} onChangeText={setUpi} autoCapitalize="none" placeholder="name@okaxis" />
        <Button title="Save UPI ID" kind="secondary" onPress={async () => { const v = (upi ?? '').trim(); if (v && !isValidVpa(v)) return toast('That doesn’t look like a UPI ID'); await updatePerson(db, id, { upi_id: v || null }); bumpData(); toast('Saved'); }} />
      </Card>
      <Modal visible={settle} transparent animationType="none" onRequestClose={() => setSettle(false)}>
        <Sheet onClose={() => setSettle(false)}>
          <SettleForm groupId={null} from={net > 0 ? p : me} to={net > 0 ? me : p} amount={Math.abs(net)} currency="INR" onDone={() => setSettle(false)} />
        </Sheet>
      </Modal>
      <ToastHost />
    </SubScreen>
  );
}
