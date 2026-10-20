import React from 'react';
import { Linking , View } from 'react-native';
import Constants from 'expo-constants';
import { SubScreen, Card, Text, Button } from '@/components/ui';
import { Emblem } from '@/components/Emblem';
import { useTheme } from '@/theme/ThemeProvider';
import { appConfig } from '@/config/app';
import { appVariant } from '@/features/native/module';
import { space } from '@/theme/tokens';

const storeBuild = !!Constants.expoConfig?.extra?.storeBuild;

const POINTS: [string, string][] = [
  ['On your phone', 'Everything lives in a database on this device. There are no accounts and no servers.'],
  [
    'No network',
    storeBuild
      ? 'This build does not have permission to use the internet, so the app cannot send your entries anywhere. It has no ads, no analytics and no tracking. If you export, back up or share something, it goes where you choose, and we cannot take it back from there.'
      : 'The app does not send your entries anywhere. It has no ads, no analytics and no tracking. If you export, back up or share something, it goes where you choose.',
  ],
  [
    'Messages',
    appVariant === 'full'
      ? 'Only bank and UPI transaction messages are read, on-device. OTPs, promotions and personal chats are discarded immediately and never stored or logged.'
      : 'The app never reads your messages in the background. A message is only looked at when you paste or share it in, and its text is not kept.',
  ],
  ['What is kept', 'The amount, merchant, account last-4, date, your notes and categories, and a one-way hash used to avoid duplicates.'],
  ['You are in control', 'Export a backup, import a CSV, or erase the app’s data with Delete everything (Settings, Export & backup). That removes what is stored in the app; copies you exported or shared elsewhere stay where you put them.'],
];

export default function Privacy() {
  const { colors } = useTheme();
  return (
    <SubScreen title="Privacy">
      <View style={{ alignItems: 'center', paddingVertical: space.sm }}><Emblem icon="shield" size={150} /></View>
      {POINTS.map(([h, b]) => (
        <Card key={h} style={{ gap: space.xs }}>
          <Text v="title">{h}</Text>
          <Text color={colors.textMuted}>{b}</Text>
        </Card>
      ))}
      <Button title="Read the full privacy policy" kind="secondary" onPress={() => Linking.openURL(appConfig.privacyPolicyUrl).catch(() => {})} />
      <Button title="Contact support" kind="ghost" onPress={() => Linking.openURL(`mailto:${appConfig.supportEmail}?subject=${encodeURIComponent(appConfig.appName + ' support')}`).catch(() => {})} />
    </SubScreen>
  );
}
