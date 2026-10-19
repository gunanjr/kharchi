import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { SubScreen, Card, Text, Button, Field, Chip } from '@/components/ui';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, bumpData } from '@/db/provider';
import { SAMPLES } from '@/features/parser/samples';
import { ingest } from '@/features/pending/service';
import { seedDemoData } from '@/features/dev/seed';
import { seedGroupDemo } from '@/features/dev/seedGroups';
import { hasAnyData, loadCompleteDemo } from '@/features/dev/loadDemo';
import { parseSms } from '@/features/parser/sms';
import { appVariant, isNativeAvailable, isExpoGo } from '@/features/native/module';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function Developer() {
  const db = useDb();
  const { colors } = useTheme();
  const allow = useSettings((s) => s.senderAllowlist);
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
      <Card style={{ gap: space.md }}>
        <Text v="h2">Demo data</Text>
        <Button title="Load complete demo (every screen)" icon="play" onPress={async () => {
          const go = async () => { await loadCompleteDemo(db); bumpData(); toast('Complete demo loaded'); };
          if (!(await hasAnyData(db))) return go();
          Alert.alert('Add sample data?', 'This adds demo entries on top of what you already have. Use Delete all my data afterwards to clear them.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Add', onPress: go }]);
        }} />
        <Button title="Generate 6 months of spending" kind="secondary" onPress={async () => { const n = await seedDemoData(db); bumpData(); toast(`Added ${n} transactions`); }} />
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
