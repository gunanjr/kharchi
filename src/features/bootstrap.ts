import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useDb, bumpData } from '@/db/provider';
import { materializeDue } from '@/features/tracker/recurring';
import { drainAndIngest } from '@/features/native/drain';
import { materializeSharedDue } from '@/features/groups/recurring';

/** Work at app start and every time the app returns to the foreground. */
export function useAppBootstrap() {
  const db = useDb();
  useEffect(() => {
    const run = async () => {
      try {
        const a = await materializeDue(db);
        const b = await materializeSharedDue(db);
        const c = await drainAndIngest(db);
        if (a + b + c.created + c.saved > 0) bumpData();
      } catch (e) {
        console.warn('bootstrap failed', e);
      }
    };
    run();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run());
    return () => sub.remove();
  }, [db]);
}
