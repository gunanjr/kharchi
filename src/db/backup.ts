import type { Db } from './types';
import { isValidMinor } from '@/domain/money';
import { isValidDate } from '@/lib/date';

const SKIP = new Set(['_meta']);
/** Backup format version written by this build. Older versions restore; newer ones are refused with a clear message. */
export const BACKUP_VERSION = 1;
const MAX_BYTES = 30 * 1024 * 1024; // a decade of heavy use is a few MB; anything this big is not ours
const MAX_ROWS = 500_000;
const APP_IDS = new Set(['bruhme', 'kharchi']); // 'kharchi' = files made before the rename

async function tableNames(db: Db) {
  const rows = await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite%'");
  return rows.map((r) => r.name).filter((n) => !SKIP.has(n));
}
async function columnsOf(db: Db, table: string) {
  return new Set((await db.all<{ name: string }>(`PRAGMA table_info(${table})`)).map((c) => c.name));
}

export interface BackupFile {
  app: string;
  version: number;
  exportedAt: number;
  /** FNV-1a of JSON.stringify(tables): catches files that were cut short or edited. Absent in very old files. */
  checksum?: string;
  tables: Record<string, Record<string, unknown>[]>;
}

/** Small, dependency-free 32-bit FNV-1a hash (integrity check, not security). */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export async function exportBackup(db: Db): Promise<BackupFile> {
  const tables: BackupFile['tables'] = {};
  for (const t of await tableNames(db)) tables[t] = await db.all(`SELECT * FROM ${t}`);
  // Vault's own state (folder, last save) belongs to this phone only: never carried to another phone.
  if (tables.settings) tables.settings = tables.settings.filter((r) => !String(r.id ?? '').startsWith('vault'));
  return { app: 'bruhme', version: BACKUP_VERSION, exportedAt: Date.now(), checksum: fnv1a(JSON.stringify(tables)), tables };
}

export class BackupError extends Error {}

export interface BackupSummary { exportedAt: number | null; entries: number; groups: number; people: number; rows: number }

/**
 * Read a picked file and decide, before touching any data, whether it is a real BruhMe backup. Refuses anything that is
 * too big, not JSON, not ours, from a newer app, cut short or edited (checksum), or shaped wrongly. Returns what is in it
 * so the user can confirm.
 */
export function inspectBackup(text: string): { file: BackupFile; summary: BackupSummary } {
  if (typeof text !== 'string' || text.length === 0) throw new BackupError('That file is empty.');
  if (text.length > MAX_BYTES) throw new BackupError('That file is far too large to be a BruhMe backup.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('That file is not a BruhMe backup, or it was cut short while saving or copying.');
  }
  const f = raw as Partial<BackupFile>;
  if (!f || typeof f !== 'object' || Array.isArray(f) || !APP_IDS.has(String(f.app))) throw new BackupError('That file is not a BruhMe backup.');
  if (typeof f.version !== 'number' || !Number.isInteger(f.version) || f.version < 1) throw new BackupError('That backup is damaged (unknown version).');
  if (f.version > BACKUP_VERSION) throw new BackupError('That backup was made by a newer BruhMe. Update the app, then restore it.');
  if (!f.tables || typeof f.tables !== 'object' || Array.isArray(f.tables)) throw new BackupError('That backup is damaged (no data inside).');
  if (f.checksum !== undefined && f.checksum !== fnv1a(JSON.stringify(f.tables))) throw new BackupError('That backup was changed or cut short after it was made, so it is not safe to restore.');
  let rows = 0;
  for (const [t, list] of Object.entries(f.tables)) {
    if (!/^[a-z_0-9]+$/.test(t)) throw new BackupError('That backup is damaged (bad table name).');
    if (!Array.isArray(list)) throw new BackupError('That backup is damaged (bad table).');
    rows += list.length;
    if (rows > MAX_ROWS) throw new BackupError('That backup has far more rows than BruhMe would ever make.');
  }
  const alive = (t: string) => (f.tables![t] ?? []).filter((r) => r && typeof r === 'object' && !(r as { deleted_at?: unknown }).deleted_at).length;
  return {
    file: f as BackupFile,
    summary: { exportedAt: typeof f.exportedAt === 'number' && isValidDate(f.exportedAt) ? f.exportedAt : null, entries: alive('transactions'), groups: alive('groups_'), people: alive('people'), rows },
  };
}

const PLAIN = (v: unknown) => v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
const TX_TYPES = new Set(['expense', 'income', 'transfer']);
/** Rows that would break the app are skipped rather than restored. */
function rowIsSane(table: string, row: Record<string, unknown>): boolean {
  if (typeof row.id !== 'string' || row.id.length === 0 || row.id.length > 200) return false;
  if (table === 'transactions') {
    if (!TX_TYPES.has(String(row.type))) return false;
    if (!isValidMinor(row.amount)) return false;
    if (typeof row.occurred_at !== 'number' || !isValidDate(row.occurred_at)) return false;
  }
  return true;
}

export interface RestoreResult { restored: number; skipped: number }

/**
 * Replace everything on the phone with a backup, all or nothing: inside one transaction, so a failure part-way leaves
 * the current data exactly as it was. Columns this build does not know (from an older or newer layout) are dropped,
 * values must be plain text or numbers, and broken rows are skipped and counted.
 */
export async function restoreBackup(db: Db, input: BackupFile | string): Promise<RestoreResult> {
  const file = typeof input === 'string' ? inspectBackup(input).file : inspectBackup(JSON.stringify(input)).file;
  const known = new Set(await tableNames(db));
  let restored = 0;
  let skipped = 0;
  await db.transaction(async () => {
    for (const t of known) await db.run(`DELETE FROM ${t}`);
    for (const [t, rows] of Object.entries(file.tables)) {
      if (!known.has(t)) continue;
      const cols = await columnsOf(db, t);
      for (const row of rows) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) { skipped++; continue; }
        const keys = Object.keys(row).filter((k) => cols.has(k));
        if (!keys.length || !keys.every((k) => PLAIN(row[k])) || !rowIsSane(t, row)) { skipped++; continue; }
        try {
          await db.run(`INSERT OR REPLACE INTO ${t} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, keys.map((k) => row[k] as never));
          restored++;
        } catch {
          skipped++;
        }
      }
    }
    if (restored === 0) throw new BackupError('Nothing in that backup could be restored, so your current data was kept.');
  });
  return { restored, skipped };
}

/** "Delete all my data": wipes every table. */
export async function wipeAll(db: Db): Promise<void> {
  await db.transaction(async () => {
    for (const t of await tableNames(db)) await db.run(`DELETE FROM ${t}`);
  });
}
