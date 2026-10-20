import { randomBytes } from 'crypto';

// --- in-memory stand-ins for the phone: secure mockKeystore, random bytes, and the user's picked folder ---
const mockKeystore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mockKeystore.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => void mockKeystore.set(k, v),
}));
jest.mock('expo-crypto', () => ({ getRandomBytes: (n: number) => new Uint8Array(require('crypto').randomBytes(n)), randomUUID: () => require('crypto').randomUUID() }));
const mockFolders = new Map<string, Map<string, string>>();
jest.mock('expo-file-system', () => {
  class File {
    mDir: string;
    name: string;
    constructor(d: string, n: string) { this.mDir = d; this.name = n; }
    get dir() { return this.mDir; }
    get exists() { return mockFolders.get(this.dir)?.has(this.name) ?? false; }
    write(t: string) { mockFolders.get(this.dir)!.set(this.name, t); }
    delete() { mockFolders.get(this.dir)!.delete(this.name); }
  }
  class Directory {
    uri: string;
    constructor(u: string) { this.uri = u; }
    static pickDirectoryAsync = async () => { mockFolders.set('content://drive/BruhMe', mockFolders.get('content://drive/BruhMe') ?? new Map()); return new Directory('content://drive/BruhMe'); };
    list() { return [...(mockFolders.get(this.uri) ?? new Map()).keys()].map((n) => new File(this.uri, n)); }
    createFile(name: string) { const f = new File(this.uri, name); f.write(''); return f; }
  }
  return { File, Directory, Paths: { cache: '/cache', document: '/doc' } };
});

import { createTestDb } from '@/db/testDb';
import { exportBackup } from '@/db/backup';
import { seedDefaults, addTransaction, listTransactions } from '@/features/tracker/repo';
import { useSettings } from '@/store/settings';
import { useProStore } from '@/features/pro/store';
import { backupNow, autoBackup, chooseVaultFolder, readBackupText, restoreFromText, adoptRecoveryCode, getRecoveryCode, listVaultFiles } from '../service';

async function phone() {
  const db = await createTestDb();
  await seedDefaults(db);
  await addTransaction(db, { type: 'expense', amount: 45000, merchant: 'Chai', occurred_at: Date.now() - 1000, source: 'manual' });
  return db;
}
const H = 3600_000;

beforeEach(() => {
  mockKeystore.clear();
  mockFolders.clear();
  useSettings.setState({ vaultUri: '', vaultLastAt: 0, vaultLastHash: '' });
  useProStore.setState({ devPro: true, entitlement: { pro: false, productId: null, source: 'none' } });
});

test('off until a folder is picked; locked without Pro', async () => {
  const db = await phone();
  expect(await backupNow(db)).toEqual({ status: 'off' });
  await chooseVaultFolder(db);
  useProStore.setState({ devPro: false });
  expect(await backupNow(db)).toEqual({ status: 'locked' });
});

test('saves encrypted files, skips when nothing changed, keeps the last 7', async () => {
  const db = await phone();
  await chooseVaultFolder(db);
  const first = await backupNow(db, false, 1_000_000_000_000);
  expect(first.status).toBe('saved');
  const files = mockFolders.get('content://drive/BruhMe')!;
  const text = [...files.values()][0];
  expect(text).toContain('bruhme-vault');
  expect(text).not.toContain('Chai'); // encrypted
  expect((await backupNow(db, false, 1_000_000_000_000 + H)).status).toBe('unchanged');
  for (let i = 1; i <= 9; i++) await backupNow(db, true, 1_000_000_000_000 + i * 60_000 * 61);
  expect(listVaultFiles('content://drive/BruhMe')).toHaveLength(7);
});

test('automatic backups wait 6 hours and need a change', async () => {
  const db = await phone();
  await chooseVaultFolder(db);
  const t0 = 1_000_000_000_000;
  await autoBackup(db, t0);
  expect(listVaultFiles('content://drive/BruhMe')).toHaveLength(1);
  await addTransaction(db, { type: 'expense', amount: 9000, merchant: 'Auto', occurred_at: Date.now() - 500, source: 'manual' });
  await autoBackup(db, t0 + 2 * H); // too soon
  expect(listVaultFiles('content://drive/BruhMe')).toHaveLength(1);
  await autoBackup(db, t0 + 7 * H);
  expect(listVaultFiles('content://drive/BruhMe')).toHaveLength(2);
});

test('same phone restores without asking; a new phone needs the code; a wrong code is refused', async () => {
  const db = await phone();
  await chooseVaultFolder(db);
  await backupNow(db, true);
  const fileText = [...mockFolders.get('content://drive/BruhMe')!.values()][0];
  const code = (await getRecoveryCode())!;

  // same phone: the mockKeystore has the code
  expect((await readBackupText(fileText)).summary.entries).toBe(1);

  // new phone: empty mockKeystore and empty app
  mockKeystore.clear();
  await expect(readBackupText(fileText)).rejects.toThrow('NEEDS_CODE');
  await expect(readBackupText(fileText, 'ABCD-EFGH-JKMN-PQRS-TVWX-YZ01-234')).rejects.toThrow();
  const read = await readBackupText(fileText, code.toLowerCase().replace(/-/g, ' '));
  const fresh = await createTestDb();
  await restoreFromText(fresh, read.plain);
  await adoptRecoveryCode(code.toLowerCase());
  expect((await listTransactions(fresh)).map((t) => t.merchant)).toEqual(['Chai']);
  expect(await getRecoveryCode()).toBe(code); // the new phone keeps using the same code
});

test('plain backups still restore through the same flow', async () => {
  const db = await phone();
  const plain = JSON.stringify(await exportBackup(db));
  const r = await readBackupText(plain);
  expect(r.vault).toBe(false);
  expect(r.summary.entries).toBe(1);
});

void randomBytes;
