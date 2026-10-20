import React, { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useDb, bumpData } from '@/db/provider';
import { pickTextFile } from '@/features/settings/files';
import { toast } from '@/components/Toast';
import { VaultError } from '../crypto';
import { adoptRecoveryCode, readBackupText, restoreFromText } from '../service';
import { CodePrompt } from './CodePrompt';

/**
 * One restore flow for every place that offers it (Export & backup, Vault, the welcome screen on a new phone).
 * Handles plain backups and Vault files: asks for the recovery code only when this phone does not already have it,
 * shows what is inside, asks to confirm, and restores all or nothing.
 */
export function useRestoreFlow(onRestored?: () => void) {
  const db = useDb();
  const [askCode, setAskCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const pending = useRef<string | null>(null);

  async function proceed(text: string, typed?: string) {
    let read;
    try {
      read = await readBackupText(text, typed);
    } catch (e) {
      if (e instanceof VaultError && e.message === 'NEEDS_CODE') { pending.current = text; setCodeError(null); setAskCode(true); return; }
      if (typed) { setCodeError((e as Error).message); return; }
      Alert.alert('Can’t restore this file', (e as Error).message);
      return;
    }
    setAskCode(false);
    const { summary, plain, vault } = read;
    const when = summary.exportedAt ? new Date(summary.exportedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'an unknown date';
    Alert.alert(
      'Replace everything with this backup?',
      `${vault ? 'Vault backup' : 'Backup'} from ${when}: ${summary.entries} entries, ${summary.groups} groups, ${summary.people} people. It replaces all data on this phone. If anything goes wrong, nothing changes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', style: 'destructive', onPress: async () => {
          try {
            const r = await restoreFromText(db, plain);
            if (vault && typed) await adoptRecoveryCode(typed).catch(() => {});
            bumpData();
            toast(r.skipped ? `Restored. ${r.skipped} damaged rows were skipped.` : 'Backup restored');
            onRestored?.();
          } catch (e) {
            Alert.alert('Restore stopped', `${(e as Error).message} Your current data was not changed.`);
          }
        } },
      ],
    );
  }

  async function start() {
    const f = await pickTextFile(['application/json', 'application/octet-stream', '*/*']).catch(() => null);
    if (!f) return;
    await proceed(f.text);
  }

  const element = (
    <CodePrompt
      visible={askCode}
      error={codeError}
      onCancel={() => { setAskCode(false); pending.current = null; }}
      onSubmit={(code) => { if (pending.current) proceed(pending.current, code); }}
    />
  );
  return { start, element };
}
