import { useMemo } from 'react';
import { useQuery } from '@/db/provider';
import { listAccounts, listCategories } from './repo';
import type { Category } from '@/domain/types';

export function useCategories() {
  const q = useQuery((db) => listCategories(db), []);
  const byId = useMemo(() => new Map((q.data ?? []).map((c) => [c.id, c])), [q.data]);
  return { categories: q.data ?? [], byId: byId as Map<string, Category>, loading: q.loading };
}

export function useAccounts() {
  const q = useQuery((db) => listAccounts(db), []);
  return { accounts: q.data ?? [], loading: q.loading };
}
