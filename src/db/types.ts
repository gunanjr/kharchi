export type SqlValue = string | number | null;

/** Minimal async DB surface. Implemented by expo-sqlite (app) and node:sqlite (tests). */
export interface Db {
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T = Record<string, any>>(sql: string, params?: SqlValue[]): Promise<T[]>;
  get<T = Record<string, any>>(sql: string, params?: SqlValue[]): Promise<T | undefined>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}
