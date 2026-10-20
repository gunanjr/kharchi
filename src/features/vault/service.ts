import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Directory, File } from 'expo-file-system';
import type { Db } from '@/db/types';
import { exportBackup, inspectBackup, restoreBackup, fnv1a, type BackupSummary, type RestoreResult } from '@/db/backup';
import { useSettings } from '@/store/settings';
import { isProNow } from '@/features/pro/store';
import { formatCode, isVaultText, newRecoveryCode, openVault, parseRecoveryCode, sealVault, VaultError } from './crypto';

/**
 * BruhMe Vault: automatic encrypted backups written to a folder the user picked with Android's own folder picker
 * (Google Drive, OneDrive, Downloads...). No storage permission, no Google sign-in, no BruhMe server.
 * The recovery code lives in the phone's secure keystore; the backup files live in the user's folder and survive
 * uninstalling the app.
 */

const CODE_KEY = 'bruhme_vault_recovery_code';
const PREFIX = 'BruhMe-Vault-';
const KEEP = 7;
const MIN_GAP_MS = 6 * 3600_000; // automatic saves at most every 6 hours, and only when something changed

const rnd = (n: number) => Crypto.getRandomBytes(n);

export async function getRecoveryCode(): Promise<string | null> {
  try { return await SecureStore.getItemAsync(CODE_KEY); } catch { return null; }
}

/** The existing code, or a new one saved to the keystore. */
export async function ensureRecoveryCode(): Promise<string> {
  const existing = await getRecoveryCode();
  if (existing) return existing;
  const code = newRecoveryCode(rnd);
  await SecureStore.setItemAsync(CODE_KEY, code);
  return code;
}

/** Let the user pick (or create) a folder. Returns false if they backed out. */
export async function chooseVaultFolder(db: Db): Promise<boolean> {
  const dir = await Directory.pickDirectoryAsync().catch(() => null);
  if (!dir?.uri) return false;
  await useSettings.getState().set(db, 'vaultUri', dir.uri);
  return true;
}

export async function turnOffVault(db: Db) {
  const s = useSettings.getState();
  await s.set(db, 'vaultUri', '');
  await s.set(db, 'vaultLastHash', '');
}

const stamp = (t: number) => {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

export function listVaultFiles(uri: string): File[] {
  try {
    return new Directory(uri).list().filter((f): f is File => f instanceof File && f.name.startsWith(PREFIX)).sort((a, b) => (a.name < b.name ? 1 : -1));
  } catch {
    return [];
  }
}

export type BackupOutcome = { status: 'saved'; name: string } | { status: 'unchanged' } | { status: 'off' } | { status: 'locked' };

/** Write an encrypted backup now. `force` saves even when nothing changed. */
export async function backupNow(db: Db, force = false, now = Date.now()): Promise<BackupOutcome> {
  const s = useSettings.getState();
  if (!s.vaultUri) return { status: 'off' };
  if (!isProNow()) return { status: 'locked' };
  const plain = JSON.stringify(await exportBackup(db));
  // The fingerprint ignores the export time, so an unchanged app does not create new files.
  const hash = fnv1a(plain.replace(/"exportedAt":\d+,/, ''));
  if (!force && hash === s.vaultLastHash) return { status: 'unchanged' };
  const code = await ensureRecoveryCode();
  const sealed = sealVault(plain, code, rnd, now);
  const dir = new Directory(s.vaultUri);
  const name = `${PREFIX}${stamp(now)}.bruhme`;
  const file = dir.createFile(name, 'application/octet-stream');
  file.write(sealed);
  for (const old of listVaultFiles(s.vaultUri).slice(KEEP)) { try { old.delete(); } catch { /* the user may have moved it */ } }
  await s.set(db, 'vaultLastAt', now);
  await s.set(db, 'vaultLastHash', hash);
  return { status: 'saved', name };
}

/** Called when the app opens or comes back to the foreground. Quiet: never throws, never nags. */
export async function autoBackup(db: Db, now = Date.now()): Promise<void> {
  const s = useSettings.getState();
  if (!s.vaultUri || !isProNow()) return;
  if (now - s.vaultLastAt < MIN_GAP_MS) return;
  try { await backupNow(db, false, now); } catch { /* folder removed or offline cloud app: try again next time */ }
}

/** Read a picked backup (plain or Vault). For a Vault file the recovery code is needed; on the same phone it is found automatically. */
export async function readBackupText(text: string, typedCode?: string): Promise<{ plain: string; summary: BackupSummary; vault: boolean }> {
  if (isVaultText(text)) {
    const code = typedCode?.trim() || (await getRecoveryCode());
    if (!code) throw new VaultError('NEEDS_CODE');
    const { plain } = openVault(text, code);
    return { plain, summary: inspectBackup(plain).summary, vault: true };
  }
  return { plain: text, summary: inspectBackup(text).summary, vault: false };
}

export async function restoreFromText(db: Db, plain: string): Promise<RestoreResult> {
  return restoreBackup(db, plain);
}

/** After restoring a Vault file on a new phone, keep using the same recovery code so old and new backups open with one code. */
export async function adoptRecoveryCode(code: string) {
  parseRecoveryCode(code); // throws if invalid
  const clean = code.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V');
  await SecureStore.setItemAsync(CODE_KEY, formatCode(clean));
}
