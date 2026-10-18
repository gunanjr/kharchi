export const DAY = 86_400_000;

export const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
export const startOfMonth = (t: number, offset = 0) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth() + offset, 1).getTime();
};
export const endOfMonth = (t: number, offset = 0) => startOfMonth(t, offset + 1) - 1;
export const daysInMonth = (t: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
};
export const startOfWeek = (t: number) => {
  const d = new Date(startOfDay(t));
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return d.getTime() - day * DAY;
};
export const addMonths = (t: number, n: number) => {
  const d = new Date(t);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes());
  target.setDate(Math.min(day, daysInMonth(target.getTime())));
  return target.getTime();
};
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthLabel = (t: number) => `${MONTHS[new Date(t).getMonth()]} ${new Date(t).getFullYear()}`;

export function formatDay(t: number, ref = Date.now()): string {
  const diff = Math.round((startOfDay(ref) - startOfDay(t)) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  const d = new Date(t);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
  return d.getFullYear() === new Date(ref).getFullYear() ? base : `${base} ${d.getFullYear()}`;
}
export function formatTime(t: number): string {
  const d = new Date(t);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}
