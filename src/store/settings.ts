import { create } from 'zustand';
import type { Db } from '@/db/types';
import { now } from '@/lib/id';

export type Settings = {
  theme: 'system' | 'light' | 'dark';
  lang: 'en'; // English only
  currency: string;
  onboarded: boolean;
  biometricLock: boolean;
  smsDisclosureAccepted: boolean;
  notifListenerEnabled: boolean;
  senderAllowlist: string; // comma separated; empty = all financial senders
  hapticsEnabled: boolean;
  weeklySummary: boolean;
  accent: 'marigold' | 'teal' | 'rose' | 'indigo';
  myUpi: string; // the user's own UPI ID, added to settle-up messages as a tap-to-pay link; stays on the phone
  merchantIcons: Record<string, string>; // merchant key -> private photo path the user chose as its icon
  vaultUri: string; // the folder the user picked for Vault backups ('' = Vault off)
  vaultLastAt: number;
  vaultLastHash: string;
  radarState: Record<string, { cancelledAt?: number; remind?: boolean }>; // subscription radar choices
  dueItems: import('@/features/dues/dues').DueItem[]; // bills with due dates (Pro)
  hideAmounts: boolean; // masks every amount (for public places); the eye on Home
};

export const defaultSettings: Settings = {
  theme: 'light',
  lang: 'en',
  currency: 'INR',
  onboarded: false,
  biometricLock: false,
  smsDisclosureAccepted: false,
  notifListenerEnabled: false,
  senderAllowlist: '',
  hapticsEnabled: true,
  weeklySummary: false,
  accent: 'marigold',
  hideAmounts: false,
  myUpi: '',
  merchantIcons: {},
  vaultUri: '',
  vaultLastAt: 0,
  vaultLastHash: '',
  radarState: {},
  dueItems: [],
};

type Store = Settings & {
  hydrated: boolean;
  load: (db: Db) => Promise<void>;
  set: <K extends keyof Settings>(db: Db, key: K, value: Settings[K]) => Promise<void>;
};

export const useSettings = create<Store>((set) => ({
  ...defaultSettings,
  hydrated: false,
  async load(db) {
    const rows = await db.all<{ id: string; value: string }>('SELECT id, value FROM settings WHERE deleted_at IS NULL');
    const patch: Partial<Settings> = {};
    for (const r of rows) {
      if (r.id in defaultSettings) (patch as any)[r.id] = JSON.parse(r.value);
    }
    set({ ...patch, hydrated: true });
  },
  async set(db, key, value) {
    const t = now();
    await db.run(
      `INSERT INTO settings (id, value, created_at, updated_at, dirty) VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(id) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at, dirty=1`,
      [key, JSON.stringify(value), t, t],
    );
    set({ [key]: value } as Partial<Settings>);
  },
}));
