import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { create } from 'zustand';
import type { Db } from './types';
import { openExpoDb } from './expoDb';
import { migrate } from './migrate';
import { seedDefaults } from '@/features/tracker/repo';
import { useSettings } from '@/store/settings';

const DbCtx = createContext<Db | null>(null);

/** Bumped after every write so screens re-query. Cheap and simple for a local-first app. */
export const useDataVersion = create<{ v: number; bump: () => void }>((set) => ({
  v: 0,
  bump: () => set((s) => ({ v: s.v + 1 })),
}));
export const bumpData = () => useDataVersion.getState().bump();

let singleton: Promise<Db> | null = null;
export function getDb(): Promise<Db> {
  singleton ??= (async () => {
    const db = await openExpoDb();
    await migrate(db);
    await seedDefaults(db);
    await useSettings.getState().load(db);
    return db;
  })();
  return singleton;
}

export function DbProvider({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const [db, setDb] = useState<Db | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    getDb().then(setDb, setError);
  }, []);
  if (error) throw error;
  if (!db) return <>{fallback}</>;
  return <DbCtx.Provider value={db}>{children}</DbCtx.Provider>;
}

export function useDb(): Db {
  const db = useContext(DbCtx);
  if (!db) throw new Error('useDb outside DbProvider');
  return db;
}

/** Run an async query against the DB; re-runs when data changes. */
export function useQuery<T>(fn: (db: Db) => Promise<T>, deps: React.DependencyList = []) {
  const db = useDb();
  const version = useDataVersion((s) => s.v);
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const run = useCallback(async () => {
    try {
      setData(await fnRef.current(db));
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, ...deps]);
  useEffect(() => {
    run();
  }, [run, version]);
  return useMemo(() => ({ data, error, loading, refetch: run }), [data, error, loading, run]);
}
