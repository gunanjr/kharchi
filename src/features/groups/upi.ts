/** UPI deep link (https://www.npci.org.in/ UPI linking spec). Opens the user's UPI app pre-filled. */
export function upiLink(p: { vpa: string; name: string; amountMinor: number; note?: string; currency?: string }): string {
  const q = [
    ['pa', p.vpa],
    ['pn', p.name],
    ['am', (p.amountMinor / 100).toFixed(2)],
    ['cu', p.currency ?? 'INR'],
    ['tn', p.note ?? 'Settle up'],
  ];
  return `upi://pay?${q.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}

export const isValidVpa = (v: string) => /^[a-z0-9._-]{2,}@[a-z][a-z0-9]{1,}$/i.test(v.trim());
