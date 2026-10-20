import React, { useState } from 'react';
import { Modal } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SubScreen, Card, Text, Button, Field, Money } from '@/components/ui';
import { Sheet } from '@/components/Sheet';
import { ToastHost, toast } from '@/components/Toast';
import { SettleForm } from '@/features/groups/ui/SettleSheet';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { ensureSelf, friendBalances, listPeople, updatePerson } from '@/features/groups/repo';
import { isValidVpa } from '@/features/groups/upi';
import { scheduleReminder } from '@/features/groups/reminders';
import { formatMoney } from '@/domain/money';
import { BruhSheet } from '@/features/groups/ui/BruhSheet';
import type { NudgeInput } from '@/features/groups/nudge';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function Friend() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const { colors } = useTheme();
  const [settle, setSettle] = useState(false);
  const [bruh, setBruh] = useState<NudgeInput | null>(null);
  const [upi, setUpi] = useState<string | null>(null);
  const q = useQuery(async (d) => ({ me: await ensureSelf(d), people: await listPeople(d), fb: await friendBalances(d) }), [id]);
  const p = q.data?.people.find((x) => x.id === id);
  if (!q.data || !p) return <SubScreen title="Friend"><Text>Loading…</Text></SubScreen>;
  const net = q.data.fb.find((f) => f.person.id === id)?.net ?? 0;
  const me = q.data.me;

  return (
    <SubScreen title={p.name}>
      <Card tone="ink" style={{ gap: space.md }}>
        {net === 0 ? <Text v="h2" color={colors.onHero}>You’re settled up</Text> : (
          <>
            <Text v="caps" color={colors.onHeroMuted}>{net > 0 ? `${p.name.toUpperCase()} OWES YOU` : `YOU OWE ${p.name.toUpperCase()}`}</Text>
            <Money size="hero" color={net > 0 ? colors.onHero : colors.onHero} text={formatMoney(Math.abs(net), 'INR', { trimZeros: true })} />
          </>
        )}
        {net !== 0 && <Button title="Settle up" kind="accent" onPress={() => setSettle(true)} />}
        {net > 0 && <Button title="Bruh them" kind="primary" icon="send" onPress={() => setBruh({ amount: net, name: p.name })} />}
        {net > 0 && <Button title="Remind me to bruh them in 3 days" kind="secondary" icon="bell" onPress={async () => { const r = await scheduleReminder(p.name, formatMoney(net, 'INR', { trimZeros: true }), 3); toast(r === 'scheduled' ? 'Reminder set for 3 days from now' : r === 'denied' ? 'Allow notifications to use reminders' : 'Reminders work in the installed app (not Expo Go)'); }} />}
      </Card>
      <Card style={{ gap: space.md }}>
        <Field label="UPI ID" value={upi ?? p.upi_id ?? ''} onChangeText={setUpi} autoCapitalize="none" placeholder="name@okaxis" />
        {(() => {
          // Nothing to save until something real is typed; clearing a saved ID is a separate, explicit action.
          const typed = (upi ?? p.upi_id ?? '').trim();
          const saved = (p.upi_id ?? '').trim();
          if (!typed && saved) return <Button title="Remove UPI ID" kind="ghost" onPress={async () => { await updatePerson(db, id, { upi_id: null }); setUpi(null); bumpData(); toast('UPI ID removed'); }} />;
          return (
            <Button title="Save UPI ID" kind="secondary" disabled={!typed || typed === saved} onPress={async () => {
              if (!typed) return;
              if (!isValidVpa(typed)) return toast('That doesn’t look like a UPI ID. It looks like name@bank.');
              await updatePerson(db, id, { upi_id: typed });
              setUpi(null);
              bumpData();
              toast('UPI ID saved');
            }} />
          );
        })()}
      </Card>
      <Modal visible={settle} transparent animationType="none" onRequestClose={() => setSettle(false)}>
        <Sheet onClose={() => setSettle(false)}>
          <SettleForm groupId={null} from={net > 0 ? p : me} to={net > 0 ? me : p} amount={Math.abs(net)} currency="INR" onDone={() => setSettle(false)} />
        </Sheet>
      </Modal>
      <ToastHost />
      <BruhSheet input={bruh} onClose={() => setBruh(null)} />
    </SubScreen>
  );
}
