import { useSettings } from '@/store/settings';
import { en } from './en';

export type Key = keyof typeof en;
const dicts = { en } as const; // English only (international app)

export function translate(lang: 'en', key: Key, vars?: Record<string, string | number>): string {
  let s: string = (dicts[lang] as Record<string, string> | undefined)?.[key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export function useT() {
  const lang = useSettings((s) => s.lang);
  return (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars);
}
