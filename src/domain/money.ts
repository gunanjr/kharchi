/** All money is integer minor units (paise for INR). Never floats. */
export type Minor = number;

export const CURRENCIES: Record<string, { symbol: string; decimals: number; name: string }> = {
  INR: { symbol: '₹', decimals: 2, name: 'Indian Rupee' },
  USD: { symbol: '$', decimals: 2, name: 'US Dollar' },
  EUR: { symbol: '€', decimals: 2, name: 'Euro' },
  GBP: { symbol: '£', decimals: 2, name: 'Pound Sterling' },
  AED: { symbol: 'AED ', decimals: 2, name: 'UAE Dirham' },
  SGD: { symbol: 'S$', decimals: 2, name: 'Singapore Dollar' },
  JPY: { symbol: '¥', decimals: 0, name: 'Japanese Yen' },
};

const dec = (c: string) => CURRENCIES[c]?.decimals ?? 2;
const sym = (c: string) => CURRENCIES[c]?.symbol ?? `${c} `;

/** Parse "1,299.50" / "1299.5" / "₹ 450" to minor units. Returns null if invalid. */
/** Largest single amount the app accepts (₹10,000 crore in paise): far beyond any real entry, safely inside exact integer range. */
export const MAX_MINOR = 1e12;
export const isValidMinor = (n: unknown): n is Minor => typeof n === 'number' && Number.isSafeInteger(n) && n > 0 && n <= MAX_MINOR;

export function parseAmountToMinor(input: string, currency = 'INR'): Minor | null {
  if (/\d\s*e\s*[+-]?\d/i.test(input)) return null; // "1e30" is not 130
  const cleaned = input.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;
  const d = dec(currency);
  // strip thousands separators (commas); keep the last '.' as decimal point
  const noCommas = cleaned.replace(/,/g, '');
  const parts = noCommas.split('.');
  if (parts.length > 2) return null;
  const whole = parts[0] || '0';
  let frac = (parts[1] ?? '').slice(0, d);
  frac = frac.padEnd(d, '0');
  const n = Number(whole) * 10 ** d + (d ? Number(frac) : 0);
  return Number.isFinite(n) && n <= MAX_MINOR ? n : null;
}

/** Indian digit grouping for INR (12,34,567), western for others. */
function group(whole: string, currency: string): string {
  if (currency === 'INR') {
    if (whole.length <= 3) return whole;
    const last3 = whole.slice(-3);
    const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return `${rest},${last3}`;
  }
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatMoney(
  minor: Minor,
  currency = 'INR',
  opts: { showSymbol?: boolean; compact?: boolean; trimZeros?: boolean; sign?: boolean } = {},
): string {
  const { showSymbol = true, compact = false, trimZeros = false, sign = false } = opts;
  const d = dec(currency);
  const neg = minor < 0;
  const abs = Math.abs(minor);
  const base = 10 ** d;
  let body: string;
  if (compact && abs >= 100000 * base && currency === 'INR') {
    body = `${trim((abs / base / 100000).toFixed(2))}L`;
  } else if (compact && abs >= 1000 * base) {
    body = `${trim((abs / base / 1000).toFixed(1))}k`;
  } else {
    const whole = Math.floor(abs / base);
    const frac = abs % base;
    body = group(String(whole), currency);
    if (d > 0 && !(trimZeros && frac === 0)) body += `.${String(frac).padStart(d, '0')}`;
  }
  const s = showSymbol ? sym(currency) : '';
  const prefix = neg ? '-' : sign && minor > 0 ? '+' : '';
  return `${prefix}${s}${body}`;
}

function trim(s: string) {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

/** Convert using a stored rate (units of `to` per 1 unit of `from`), half-up rounding. */
export function convertMinor(minor: Minor, rate: number, fromCur = 'INR', toCur = 'INR'): Minor {
  const factor = 10 ** (dec(toCur) - dec(fromCur));
  return Math.round(minor * rate * factor);
}

/**
 * Split `total` into parts proportional to `weights` with no rounding loss
 * (largest-remainder method). Parts always sum to exactly `total`.
 */
export function allocate(total: Minor, weights: number[]): Minor[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0) return [];
  if (sum <= 0) {
    const even = Math.floor(total / weights.length);
    const out = weights.map(() => even);
    let rem = total - even * weights.length;
    for (let i = 0; rem > 0; i = (i + 1) % out.length, rem--) out[i]++;
    return out;
  }
  const raw = weights.map((w) => (total * w) / sum);
  const floor = raw.map(Math.floor);
  let rem = total - floor.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rem > 0; k = (k + 1) % order.length, rem--) floor[order[k].i]++;
  return floor;
}
