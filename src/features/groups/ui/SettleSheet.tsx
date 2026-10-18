import React, { useState } from 'react';
import { Linking } from 'react-native';
import { Button, Chip, Field, Row, Text } from '@/components/ui';
import { toast } from '@/components/Toast';
import { useDb, bumpData } from '@/db/provider';
import { recordSettlement } from '../repo';
import { upiLink } from '../upi';
import { formatMoney, parseAmountToMinor } from '@/domain/money';
import type { Person } from '@/domain/types';
import { space } from '@/theme/tokens';
import { haptic } from '@/lib/haptics';

/** Record a cash/UPI payment between two people, or open the payer's UPI app pre-filled. */
export function SettleForm({ groupId, from, to, amount, currency, onDone }: {
  groupId: string | null; from: Person; to: Person; amount: number; currency: string; onDone: () => void;
}) {
  const db = useDb();
  const [text, setText] = useState(String(amount / 100));
  const [method, setMethod] = useState<'cash' | 'upi'>(to.upi_id ? 'upi' : 'cash');
  const minor = parseAmountToMinor(text, currency) ?? 0;

  async function record() {
    try {
      await recordSettlement(db, { groupId, from: from.id, to: to.id, amount: minor, currency, method });
      haptic.success();
      bumpData();
      toast(`Recorded ${formatMoney(minor, currency, { trimZeros: true })}`);
      onDone();
    } catch (e) {
      toast((e as Error).message);
    }
  }
  async function payUpi() {
    if (!to.upi_id) return toast(`Add ${to.name}’s UPI ID first (Friends → ${to.name})`);
    const url = upiLink({ vpa: to.upi_id, name: to.name, amountMinor: minor, note: 'Settle up' });
    try {
      await Linking.openURL(url);
    } catch {
      toast('No UPI app found on this phone');
    }
  }

  return (
    <>
      <Text v="h2">{from.is_self ? 'You pay' : `${from.name} pays`} {to.is_self ? 'you' : to.name}</Text>
      <Field label="Amount" value={text} onChangeText={(t) => setText(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" />
      <Row><Chip label="Cash" selected={method === 'cash'} onPress={() => setMethod('cash')} /><Chip label="UPI" selected={method === 'upi'} onPress={() => setMethod('upi')} /></Row>
      <Row style={{ gap: space.sm, flexWrap: 'wrap' }}>
        {from.is_self && currency === 'INR' && <Button title="Pay with UPI app" kind="secondary" onPress={payUpi} />}
        <Button title="Record payment" onPress={record} disabled={minor <= 0} />
      </Row>
    </>
  );
}
