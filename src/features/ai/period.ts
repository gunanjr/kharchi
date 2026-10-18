import { DAY, MONTHS, endOfMonth, startOfDay, startOfMonth, startOfWeek } from '@/lib/date';

export interface Period { from: number; to: number; label: string; explicit: boolean }

const NUM_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10, fourteen: 14, fifteen: 15, thirty: 30 };

export function parsePeriod(text: string, now: number): Period {
  const t = text.toLowerCase();
  const d = new Date(now);
  const end = (x: number) => x + DAY - 1;
  const month = (off: number, label: string): Period => ({ from: startOfMonth(now, off), to: endOfMonth(now, off), label, explicit: true });

  if (/\btoday\b/.test(t)) return { from: startOfDay(now), to: end(startOfDay(now)), label: 'today', explicit: true };
  if (/\byesterday\b/.test(t)) return { from: startOfDay(now) - DAY, to: startOfDay(now) - 1, label: 'yesterday', explicit: true };
  const lastN = t.match(/(?:last|past|previous)\s+(\d+|[a-z]+)\s+days?/);
  if (lastN) {
    const n = /^\d+$/.test(lastN[1]) ? Number(lastN[1]) : NUM_WORDS[lastN[1]];
    if (n) return { from: startOfDay(now) - (n - 1) * DAY, to: end(startOfDay(now)), label: `the last ${n} days`, explicit: true };
  }
  const lastW = t.match(/(?:last|past)\s+(\d+)\s+weeks?/);
  if (lastW) return { from: startOfDay(now) - (Number(lastW[1]) * 7 - 1) * DAY, to: end(startOfDay(now)), label: `the last ${lastW[1]} weeks`, explicit: true };
  if (/last week/.test(t)) return { from: startOfWeek(now) - 7 * DAY, to: startOfWeek(now) - 1, label: 'last week', explicit: true };
  if (/this week/.test(t)) return { from: startOfWeek(now), to: end(startOfDay(now)), label: 'this week', explicit: true };
  if (/last month|previous month/.test(t)) return month(-1, 'last month');
  if (/this month|current month/.test(t)) return month(0, 'this month');
  if (/last year|previous year/.test(t)) return { from: new Date(d.getFullYear() - 1, 0, 1).getTime(), to: new Date(d.getFullYear(), 0, 1).getTime() - 1, label: 'last year', explicit: true };
  if (/this year|so far this year|year to date|ytd/.test(t)) return { from: new Date(d.getFullYear(), 0, 1).getTime(), to: end(startOfDay(now)), label: 'this year', explicit: true };
  if (/last quarter/.test(t)) {
    const q = Math.floor(d.getMonth() / 3);
    const from = new Date(d.getFullYear(), (q - 1) * 3, 1).getTime();
    return { from, to: new Date(d.getFullYear(), q * 3, 1).getTime() - 1, label: 'last quarter', explicit: true };
  }
  for (let i = 0; i < 12; i++) {
    const full = MONTHS[i].toLowerCase();
    const re = new RegExp(`\\b(${full}|${full.slice(0, 3)}${full === 'may' ? '' : '\\b'})(?:\\s+(\\d{4}))?`);
    const m = t.match(re);
    if (m && (m[1] === full || m[1] === full.slice(0, 3))) {
      let year = m[2] ? Number(m[2]) : d.getFullYear();
      if (!m[2] && i > d.getMonth()) year -= 1; // "September" asked in March means last September
      return { from: new Date(year, i, 1).getTime(), to: new Date(year, i + 1, 1).getTime() - 1, label: `${MONTHS[i]}${m[2] || year !== d.getFullYear() ? ` ${year}` : ''}`, explicit: true };
    }
  }
  return { ...month(0, 'this month'), explicit: false };
}
