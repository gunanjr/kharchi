import React, { useEffect, useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as LocalAuthentication from 'expo-local-authentication';
import { SubScreen, Card, Text, Button, Row } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ToastHost, toast } from '@/components/Toast';
import { useDb } from '@/db/provider';
import { useSettings } from '@/store/settings';
import { useIsPro } from '@/features/pro/store';
import { backupNow, chooseVaultFolder, ensureRecoveryCode, getRecoveryCode, listVaultFiles, turnOffVault } from '@/features/vault/service';
import { useRestoreFlow } from '@/features/vault/ui/useRestoreFlow';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, space } from '@/theme/tokens';

/** A readable name for the picked folder, from its storage URI. */
function folderLabel(uri: string) {
  try {
    const last = decodeURIComponent(uri).split(/[/:]/).filter(Boolean).pop() ?? 'Chosen folder';
    return last.length > 40 ? `${last.slice(0, 40)}…` : last;
  } catch {
    return 'Chosen folder';
  }
}
const when = (t: number) => (t ? new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'never');

async function confirmIdentity(): Promise<boolean> {
  try {
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return true;
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Show your recovery code' });
    return r.success;
  } catch {
    return true;
  }
}

function CodeCard({ code, onSaved }: { code: string; onSaved?: () => void }) {
  const { colors } = useTheme();
  const share = () => Share.share({ message: `My BruhMe Vault recovery code:\n\n${code}\n\nKeep it private. I need it to restore my BruhMe backup on a new phone.` }).then(onSaved).catch(() => {});
  return (
    <Card style={{ gap: space.md }}>
      <Text v="caps" color={colors.textMuted}>YOUR RECOVERY CODE</Text>
      <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12 }}>
        <Text selectable style={{ fontFamily: fonts.bold, fontSize: 19, letterSpacing: 1, textAlign: 'center', color: colors.text }}>{code}</Text>
      </View>
      <Text v="small" color={colors.textMuted}>On a new phone this code opens your backups. Save it somewhere you will find it: your notes, a password manager, an email to yourself or a screenshot. You can see it here again any time while you have this phone.</Text>
      <Row style={{ gap: space.sm }}>
        <Button title="Save code" icon="share" onPress={share} style={{ flex: 1 }} />
        <Button title="Copy" kind="secondary" onPress={async () => { await Clipboard.setStringAsync(code); toast('Code copied'); onSaved?.(); }} style={{ flex: 1 }} />
      </Row>
    </Card>
  );
}

export default function Vault() {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const pro = useIsPro();
  const uri = useSettings((s) => s.vaultUri);
  const lastAt = useSettings((s) => s.vaultLastAt);
  const [setupCode, setSetupCode] = useState<string | null>(null);
  const [shownCode, setShownCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(0);
  const restore = useRestoreFlow();

  useEffect(() => { setCount(uri ? listVaultFiles(uri).length : 0); }, [uri, lastAt]);

  async function turnOn() {
    const ok = await chooseVaultFolder(db);
    if (!ok) return;
    setSetupCode(await ensureRecoveryCode());
  }
  async function finishSetup() {
    setBusy(true);
    try {
      const r = await backupNow(db, true);
      setSetupCode(null);
      toast(r.status === 'saved' ? 'Vault is on. First backup saved.' : 'Vault is on');
    } catch {
      Alert.alert('Could not save to that folder', 'Pick another folder, or check that the cloud app is signed in.');
    } finally {
      setBusy(false);
    }
  }
  async function saveNow() {
    setBusy(true);
    try {
      const r = await backupNow(db, true);
      toast(r.status === 'saved' ? 'Backup saved' : 'Nothing new to save');
    } catch {
      Alert.alert('Could not save to the Vault folder', 'The folder may have been moved or removed. Choose it again.');
    } finally {
      setBusy(false);
    }
  }
  async function reveal() {
    if (!(await confirmIdentity())) return;
    setShownCode(await getRecoveryCode());
  }

  return (
    <SubScreen title="Vault">
      <Card tone="ink" style={{ gap: space.sm }}>
        <Row style={{ gap: space.md }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Icon name="lock" size={22} color={colors.onPrimary} /></View>
          <View style={{ flex: 1 }}>
            <Text v="h3" color={colors.onHero}>Never lose your money history</Text>
            <Text v="small" color={colors.onHeroMuted}>Encrypted backups saved automatically to your own Google Drive, OneDrive or any folder you pick.</Text>
          </View>
        </Row>
      </Card>

      {!pro ? (
        <Card style={{ gap: space.md }}>
          <Text v="title">Vault is part of BruhMe Pro</Text>
          <Text v="small" color={colors.textMuted}>Automatic encrypted backups, a recovery code for a new phone, and the last 7 versions kept in your folder. Your manual backup in Export & backup stays free.</Text>
          <Button title="See Pro" kind="accent" onPress={() => router.push('/pro')} />
        </Card>
      ) : setupCode ? (
        <>
          <CodeCard code={setupCode} />
          <Button title={busy ? 'Saving…' : 'I’ve saved my code, turn Vault on'} onPress={finishSetup} loading={busy} />
        </>
      ) : !uri ? (
        <Card style={{ gap: space.md }}>
          {[
            ['1', 'Pick a folder', 'Android shows its own folder picker: choose Google Drive, OneDrive, Downloads or any folder. BruhMe can write only there.'],
            ['2', 'Save your recovery code', 'A 27-character code that opens your backups on a new phone. No password to remember.'],
            ['3', 'That’s it', 'BruhMe saves an encrypted backup when something changes, at most every 6 hours, and keeps the last 7.'],
          ].map(([n, t, d]) => (
            <Row key={n} style={{ gap: space.md, alignItems: 'flex-start' }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Text v="small" color={colors.link} style={{ fontFamily: fonts.bold }}>{n}</Text></View>
              <View style={{ flex: 1, gap: 2 }}><Text v="title">{t}</Text><Text v="small" color={colors.textMuted}>{d}</Text></View>
            </Row>
          ))}
          <Button title="Pick a folder" icon="download" onPress={turnOn} />
        </Card>
      ) : (
        <>
          <Card style={{ gap: space.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text v="title">Vault is on</Text>
              <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}><Text v="small" color={colors.income} style={{ fontFamily: fonts.semibold }}>Protected</Text></View>
            </Row>
            <Text v="small" color={colors.textMuted}>Folder: {folderLabel(uri)}</Text>
            <Text v="small" color={colors.textMuted}>Last backup: {when(lastAt)} · {count} {count === 1 ? 'backup' : 'backups'} kept</Text>
            <Row style={{ gap: space.sm }}>
              <Button title="Back up now" onPress={saveNow} loading={busy} style={{ flex: 1 }} />
              <Button title="Change folder" kind="secondary" onPress={async () => { if (await chooseVaultFolder(db)) saveNow(); }} style={{ flex: 1 }} />
            </Row>
          </Card>
          {shownCode ? <CodeCard code={shownCode} /> : <Button title="Show my recovery code" kind="secondary" icon="eye" onPress={reveal} />}
          <Button title="Turn off Vault" kind="ghost" onPress={() => Alert.alert('Turn off Vault?', 'New backups stop. Backups already in your folder stay there and still open with your recovery code.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Turn off', style: 'destructive', onPress: () => turnOffVault(db) }])} />
        </>
      )}

      <Card style={{ gap: space.sm }}>
        <Text v="title">New phone?</Text>
        <Text v="small" color={colors.textMuted}>Pick a Vault file from your folder and enter your recovery code. Plain backup files from Export & backup work here too.</Text>
        <Button title="Restore from a backup" kind="secondary" onPress={restore.start} />
      </Card>
      {restore.element}
      <ToastHost />
    </SubScreen>
  );
}
