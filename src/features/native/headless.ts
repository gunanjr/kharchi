import { AppRegistry } from 'react-native';
import { getDb, bumpData } from '@/db/provider';
import { drainAndIngest } from './drain';

/**
 * Registered at JS startup. Android's DrainTaskService starts this task (headless, no UI) after the user
 * replies to a transaction notification, so the entry is saved even if the app is never opened.
 */
AppRegistry.registerHeadlessTask('KharchiDrain', () => async () => {
  try {
    await drainAndIngest(await getDb());
    bumpData();
  } catch (e) {
    console.warn('headless drain failed', e);
  }
});
