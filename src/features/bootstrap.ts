import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useDb, bumpData } from '@/db/provider';
import { materializeDue } from '@/features/tracker/recurring';
import { drainAndIngest } from '@/features/native/drain';
import { materializeSharedDue } from '@/features/groups/recurring';
import { consumeShared } from '@/features/native/share';
import { useRouter } from 'expo-router';
import { toast } from '@/components/Toast';
import { useSettings } from '@/store/settings';
import { syncNativeSettings } from '@/features/native/sync';

/** Work at app start and every time the app returns to the foreground. */
export function useAppBootstrap() {
  const db = useDb();
  const router = useRouter();
  useEffect(() => {
    const run = async () => {
      try {
        const a = await materializeDue(db);
        const b = await materializeSharedDue(db);
        syncNativeSettings();
        const c = await drainAndIngest(db);
        const sh = await consumeShared(db);
        if (a + b + c.created + c.saved + (sh?.status === 'created' ? 1 : 0) > 0) bumpData();
        // a shared message opens its review screen straight away, whether the app was closed or already running
        if (!useSettings.getState().onboarded) return;
        if (sh?.status === 'created') router.push({ pathname: '/import-review', params: { id: sh.pendingId } });
        else if (sh?.status === 'duplicate') toast('Already captured');
        else if (sh) toast('That does not look like a transaction. You can add it by hand.');
      } catch (e) {
        console.warn('bootstrap failed', e);
      }
    };
    run();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run());
    return () => sub.remove();
  }, [db, router]);
}
