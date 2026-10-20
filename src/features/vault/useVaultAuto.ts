import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useDb } from '@/db/provider';
import { useSettings } from '@/store/settings';
import { autoBackup } from './service';

/** Saves a Vault backup quietly when the app opens or returns to the foreground (at most every 6 hours, only if data changed). */
export function useVaultAuto() {
  const db = useDb();
  const ready = useSettings((s) => s.hydrated && s.onboarded);
  const uri = useSettings((s) => s.vaultUri);
  useEffect(() => {
    if (!ready || !uri) return;
    autoBackup(db);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') autoBackup(db); });
    return () => sub.remove();
  }, [db, ready, uri]);
}
