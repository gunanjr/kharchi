import type { Db } from '@/db/types';
import { updateTransaction } from './repo';

/** Leave an entry out of (or put it back into) totals, budgets, insights and answers. Balances are unaffected. */
export const setExcluded = (db: Db, id: string, excluded: boolean) => updateTransaction(db, id, { excluded });
