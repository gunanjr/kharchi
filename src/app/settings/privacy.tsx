import React from 'react';
import { Linking, View } from 'react-native';
import { SubScreen, Card, Text, Button } from '@/components/ui';
import { Emblem } from '@/components/Emblem';
import { useTheme } from '@/theme/ThemeProvider';
import { appConfig } from '@/config/app';
import { space } from '@/theme/tokens';

const POINTS: [string, string][] = [
  ['On your phone', 'Everything lives in a database in the app’s private storage on this device, which other apps cannot read. It is not encrypted on the phone itself, so for extra privacy turn on App lock and Hide from screenshots. There are no accounts and no servers.'],
  ['Nothing sent to us', 'BruhMe uses the internet only to talk to Google Play for purchases and to save Vault backups to the folder you pick. Your entries are never sent to us. No ads, no analytics, no tracking. If you export, back up or share something, it goes where you choose, and we cannot take it back from there.'],
  ['Messages', 'The app never reads your messages in the background. A message is only looked at when you paste or share it in, and its text is not kept.'],
  ['Screenshots', 'Turn on Hide from screenshots in Settings to block screenshots and blank BruhMe in the recent-apps screen.'],
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
