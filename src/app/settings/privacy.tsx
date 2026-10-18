import React from 'react';
import { SubScreen, Card, Text } from '@/components/ui';
import { space } from '@/theme/tokens';

const POINTS = [
  ['On your phone', 'Everything lives in a database on this device. There are no accounts and no servers.'],
  ['Messages', 'Only bank and UPI transaction messages are read, on-device. OTPs, promotions and personal chats are discarded immediately and never stored or logged.'],
  ['What is kept', 'The amount, merchant, account last-4, date and a one-way hash of the message. The message text itself is thrown away after parsing.'],
  ['Nothing uploaded', 'Messages are never uploaded. If you ever connect a backend, only the transactions you choose to sync would leave the phone.'],
  ['You are in control', 'Revoke SMS access any time in Android Settings, restrict which senders are read, or use Delete all my data.'],
];

export default function Privacy() {
  return (
    <SubScreen title="Privacy">
      {POINTS.map(([h, b]) => (
        <Card key={h} style={{ gap: space.xs }}>
          <Text v="title">{h}</Text>
          <Text>{b}</Text>
        </Card>
      ))}
    </SubScreen>
  );
}
