import React from 'react';
import { Linking } from 'react-native';
import Constants from 'expo-constants';
import { SubScreen, Card, Text, Button } from '@/components/ui';
import { appConfig } from '@/config/app';
import { appVariant } from '@/features/native/module';
import { space } from '@/theme/tokens';

const storeBuild = !!Constants.expoConfig?.extra?.storeBuild;

const POINTS: [string, string][] = [
  ['On your phone', 'Everything lives in a database on this device. There are no accounts and no servers.'],
  [
    'No network',
    storeBuild
      ? 'This build does not even have permission to use the internet, so your data physically cannot leave your phone. There are no ads, no analytics and no tracking.'
      : 'Nothing in the app sends data anywhere. There are no ads, no analytics and no tracking.',
  ],
  [
    'Messages',
    appVariant === 'full'
      ? 'Only bank and UPI transaction messages are read, on-device. OTPs, promotions and personal chats are discarded immediately and never stored or logged.'
      : 'The app never reads your messages in the background. A message is only looked at when you paste or share it in, and its text is not kept.',
  ],
  ['What is kept', 'The amount, merchant, account last-4, date, your notes and categories, and a one-way hash used to avoid duplicates.'],
  ['You are in control', 'Export a backup, import a CSV, or erase everything with Delete all my data (Settings → Export & backup).'],
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
      <Button title="Read the full privacy policy" kind="secondary" onPress={() => Linking.openURL(appConfig.privacyPolicyUrl).catch(() => {})} />
      <Button title="Contact support" kind="ghost" onPress={() => Linking.openURL(`mailto:${appConfig.supportEmail}?subject=${encodeURIComponent(appConfig.appName + ' support')}`).catch(() => {})} />
    </SubScreen>
  );
}
