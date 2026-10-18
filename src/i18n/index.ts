import { useSettings } from '@/store/settings';
import { en } from './en';
import { hi } from './hi';

export type Key = keyof typeof en;
const dicts = { en, hi } as const;

export function translate(lang: 'en' | 'hi', key: Key, vars?: Record<string, string | number>): string {
  let s: string = (dicts[lang] as Record<string, string>)[key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export function useT() {
  const lang = useSettings((s) => s.lang);
  return (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars);
}
