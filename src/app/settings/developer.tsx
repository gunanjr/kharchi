import React, { useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { SubScreen, Card, Text, Button, Field, Chip, Row } from '@/components/ui';
import { useProStore } from '@/features/pro/store';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, bumpData } from '@/db/provider';
import { SAMPLES } from '@/features/parser/samples';
import { ingest } from '@/features/pending/service';
import { seedDemoData } from '@/features/dev/seed';
import { seedGroupDemo } from '@/features/dev/seedGroups';
import { hasAnyData, loadCompleteDemo } from '@/features/dev/loadDemo';
import { wipeAll } from '@/db/backup';
import { parseSms } from '@/features/parser/sms';
import { appVariant, isNativeAvailable, isExpoGo } from '@/features/native/module';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function Developer() {
  const db = useDb();
  const { colors } = useTheme();
  const allow = useSettings((s) => s.senderAllowlist);
  const setSetting = useSettings((s) => s.set);
  const devPro = useProStore((s) => s.devPro);
  const setDevPro = useProStore((s) => s.setDevPro);
  const [sender, setSender] = useState('AX-HDFCBK');
  const [body, setBody] = useState(SAMPLES[0].body);
  const [result, setResult] = useState('');

  async function simulate(b = body, s = sender) {
    const parsed = parseSms(b, { sender: s });
    const r = await ingest(db, { origin: 'simulated', body: b, sender: s, allowlist: allow.split(',').map((x) => x.trim()).filter(Boolean) });
    setResult(`${r.status}${'reason' in r ? ` (${r.reason})` : ''}\n${JSON.stringify(parsed.ok ? parsed.tx : parsed, null, 1)}`);
    if (r.status === 'created') { bumpData(); toast('Check Home → Needs your input'); }
  }

  return (
    <SubScreen title="Developer">
      <Card style={{ gap: space.xs }}>
        <Text v="title">Environment</Text>
        <Text v="small" color={colors.textMuted}>Variant: {appVariant} · Native module: {isNativeAvailable ? 'present' : 'absent'} · {isExpoGo ? 'Expo Go' : 'standalone/dev build'}</Text>
      </Card>
      {__DEV__ ? (
        <Card style={{ gap: space.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text v="title">Pro features (development only)</Text>
              <Text v="small" color={colors.textMuted}>Shows every Pro screen in Expo Go. This switch does not exist in Play Store builds.</Text>
            </View>
            <Switch value={devPro} onValueChange={setDevPro} accessibilityLabel="Pro features in development" />
          </Row>
        </Card>
      ) : null}
      <Card style={{ gap: space.md }}>
        <Text v="h2">Demo data</Text>
        <Button title="Load complete demo (every screen)" icon="play" onPress={async () => {
          const go = async () => { await loadCompleteDemo(db); bumpData(); toast('Complete demo loaded'); };
          if (!(await hasAnyData(db))) return go();
          Alert.alert('Add sample data?', 'This adds demo entries on top of what you already have. Use Delete all my data afterwards to clear them.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Add', onPress: go }]);
        }} />
        <Button title="Reset to the latest demo" kind="secondary" icon="repeat" onPress={() => Alert.alert('Replace everything with the latest demo?', 'Deletes every entry, group and setting on this phone, then loads the current demo (12 months, about 80 merchants, groups, goals). Use this after pulling new code so you see what everyone else sees.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: async () => { await wipeAll(db); await loadCompleteDemo(db); await setSetting(db, 'onboarded', true); bumpData(); toast('Latest demo loaded'); } }])} />
        <Button title="Generate 12 months of spending" kind="secondary" onPress={async () => { const n = await seedDemoData(db); bumpData(); toast(`Added ${n} transactions`); }} />
        <Button title="Generate demo groups" kind="secondary" onPress={async () => { await seedGroupDemo(db); bumpData(); toast('Groups added'); }} />
      </Card>
      <Card style={{ gap: space.md }}>
        <Text v="h2">{appVariant === 'full' ? 'Simulate incoming bank SMS' : 'Try a bank message'}</Text>
        <Text v="small" color={colors.textMuted}>Same reading step as “Paste a copied message”: parse, filter, dedupe, then a card on Home asks “What was this for?”. Nothing is sent anywhere.</Text>
        <Field label="Sender" value={sender} onChangeText={setSender} autoCapitalize="characters" />
        <Field label="Message" value={body} onChangeText={setBody} multiline style={{ minHeight: 110, textAlignVertical: 'top', paddingTop: 12 }} />
        <Button title="Send to pipeline" onPress={() => simulate()} />
        {result ? <Text v="small" style={{ fontFamily: 'monospace' }}>{result}</Text> : null}
        <Text v="caps" color={colors.textMuted}>SAMPLES ({SAMPLES.length})</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {SAMPLES.map((s) => (
            <Chip key={s.name} label={s.name} onPress={() => { setBody(s.body); setSender(s.sender); }} />
          ))}
        </View>
      </Card>
      <ToastHost />
    </SubScreen>
  );
}
