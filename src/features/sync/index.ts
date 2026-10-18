/**
 * Sync-ready, sync-off.
 * Every table already carries id (uuid), created_at, updated_at, deleted_at, dirty. When a backend is configured
 * (EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY) a real engine can be plugged in here; today the
 * no-op engine is always selected so the app has ZERO network dependency.
 */
export interface ChangeSet {
  table: string;
  rows: Record<string, unknown>[];
}

export interface RemoteRepository {
  /** Upsert rows (including tombstones with deleted_at set). Returns the server watermark. */
  push(changes: ChangeSet[]): Promise<{ watermark: number }>;
  /** Everything changed on the server since `watermark`. */
  pull(watermark: number): Promise<{ changes: ChangeSet[]; watermark: number }>;
}

export interface SyncEngine {
  readonly enabled: boolean;
  /** Push dirty rows, pull remote changes, last-write-wins on updated_at. */
  syncNow(): Promise<{ pushed: number; pulled: number }>;
  start(): void;
  stop(): void;
}

export class NoopSyncEngine implements SyncEngine {
  readonly enabled = false;
  async syncNow() {
    return { pushed: 0, pulled: 0 };
  }
  start() {}
  stop() {}
}

export const backendConfigured = !!(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export function createSyncEngine(): SyncEngine {
  // A Supabase-backed engine would be constructed here when backendConfigured is true.
  return new NoopSyncEngine();
}
