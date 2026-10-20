import { formatMoney } from '@/domain/money';

/**
 * The "Bruh me" settle-up request: a ready-to-send message that asks a friend to pay back. It is only text handed to
 * the phone's share sheet (and, if the user saved their own UPI ID, a standard UPI link the friend can tap to open
 * their own payments app). BruhMe sends nothing, moves no money and marks nothing as paid.
 */
export type Tone = 'polite' | 'playful' | 'firm' | 'savage' | 'desi' | 'dramatic' | 'formal' | 'minimal';

export const TONES: { key: Tone; label: string; hint: string }[] = [
  { key: 'polite', label: 'Polite', hint: 'Soft, for a first reminder' },
  { key: 'playful', label: 'Playful', hint: 'Friendly, a little cheeky' },
  { key: 'desi', label: 'Desi', hint: 'Hinglish, like the group chat' },
  { key: 'minimal', label: 'Minimal', hint: 'Just the facts' },
  { key: 'dramatic', label: 'Dramatic', hint: 'Over the top, all in fun' },
  { key: 'firm', label: 'Firm', hint: 'Clear and direct' },
  { key: 'formal', label: 'Formal', hint: 'For a colleague or landlord' },
  { key: 'savage', label: 'Savage', hint: 'Dry humour, never rude' },
];

export interface NudgeInput {
  /** What the friend owes, in minor units. */
  amount: number;
  currency?: string;
  /** The friend's name (first name is used). */
  name?: string | null;
  /** The group or occasion, e.g. "Goa trip". */
  reason?: string | null;
  /** The biggest things behind the amount, e.g. ["Dinner", "Cab"]. Up to two are used. */
  items?: string[];
  /** How many days the oldest unpaid part has been waiting. */
  daysOwed?: number | null;
  /** The sender's own UPI ID (saved on this phone) and name, to add a tap-to-pay link. */
  upiId?: string | null;
  payeeName?: string | null;
}

const first = (n?: string | null) => (n ?? '').trim().split(/\s+/)[0];
const UPI_RE = /^[a-z0-9][a-z0-9._-]{1,63}@[a-z][a-z0-9]{1,30}$/i;
export const isUpiId = (v?: string | null) => !!v && UPI_RE.test(v.trim());

/** How firm to start: gentle at first, firmer as it gets older. The user can always pick another tone. */
export function suggestTone(daysOwed?: number | null): Tone {
  const d = daysOwed ?? 0;
  return d < 3 ? 'polite' : d < 10 ? 'playful' : d < 24 ? 'firm' : 'savage';
}

/** A standard UPI payment link (opens the friend's own UPI app). Null when the ID is not valid. */
export function upiLink(input: { upiId?: string | null; payeeName?: string | null; amount: number; note?: string | null }): string | null {
  if (!isUpiId(input.upiId)) return null;
  const rupees = (Math.max(0, Math.round(input.amount)) / 100).toFixed(2);
  const q = [
    ['pa', input.upiId!.trim()],
    ['pn', (input.payeeName ?? '').trim().slice(0, 40) || 'Payee'],
    ['am', rupees],
    ['cu', 'INR'],
    ['tn', (input.note ?? '').trim().slice(0, 40) || 'Settle up'],
  ];
  return 'upi://pay?' + q.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}

const days = (d: number) => `${d} day${d === 1 ? '' : 's'}`;

type Ctx = { hi: string; amt: string; what: string | null; forWhat: string; age: number | null; ago: string };
/** Every line names the amount and, when known, the person and what it was for. None threatens, shames or invents urgency. */
const LINES: Record<Tone, ((c: Ctx) => string)[]> = {
  polite: [
    (c) => `${c.hi}quick one: your share${c.forWhat} comes to ${c.amt}. Whenever you get a moment, thanks!`,
    (c) => `${c.hi}hope your week is going well. Just a gentle reminder about ${c.amt}${c.forWhat}. Thank you!`,
    (c) => `${c.hi}no rush at all, but ${c.amt}${c.forWhat} is pending from your side. Thanks a lot!`,
    (c) => `${c.hi}sending a small reminder for ${c.amt}${c.forWhat}. Thank you, really appreciate it.`,
    (c) => `${c.hi}whenever it suits you, could you send ${c.amt}${c.forWhat}? Thanks!`,
  ],
  playful: [
    (c) => `${c.hi}bruh me ${c.amt}${c.what ? `? I covered ${c.what}` : '?'}${c.ago} 😅`,
    (c) => `${c.hi}your half${c.what ? ` of ${c.what}` : ''} is ${c.amt}. Bruh me 🙏`,
    (c) => `${c.hi}${c.amt}${c.forWhat} is still floating around. Catch it and bruh me 🎣`,
    (c) => `${c.hi}friendly ping from your favourite person: ${c.amt}${c.forWhat} 👀`,
    (c) => `${c.hi}plot twist: you owe me ${c.amt}${c.forWhat}. Happy ending if you send it today ✨`,
    (c) => `${c.hi}${c.amt}${c.forWhat}. Pay now, flex later 😎`,
  ],
  desi: [
    (c) => `${c.hi}bhai ${c.amt} bhej de${c.what ? `, ${c.what} wala` : ''} 🙏`,
    (c) => `${c.hi}yaad hai na? ${c.amt}${c.forWhat}. Jab free ho, bhej dena 😄`,
    (c) => `${c.hi}hisaab clear karte hain: ${c.amt}${c.forWhat}. Bruh me yaar!`,
    (c) => `${c.hi}${c.amt}${c.forWhat} pending hai${c.ago}. Chai pe charcha baad mein, pehle payment ☕`,
    (c) => `${c.hi}dost hai toh ${c.amt}${c.forWhat} bhi hai 😌 Bruh me!`,
  ],
  minimal: [
    (c) => `${c.hi}${c.amt}${c.forWhat}.`,
    (c) => `${c.hi}pending: ${c.amt}${c.forWhat}.`,
    (c) => `${c.hi}${c.amt}${c.forWhat}. Thanks.`,
    (c) => `${c.hi}settle up: ${c.amt}${c.forWhat}.`,
  ],
  dramatic: [
    (c) => `${c.hi}they say money can't buy happiness, but ${c.amt}${c.forWhat} would make me very happy 🥲`,
    (c) => `${c.hi}every night I look at the stars and wonder about my ${c.amt}${c.forWhat} 🌌`,
    (c) => `${c.hi}breaking news: local friend still waiting for ${c.amt}${c.forWhat}${c.ago}. More at 9 📺`,
    (c) => `${c.hi}my wallet wrote you a letter. It just says "${c.amt}"${c.what ? ` and "${c.what}"` : ''} 💌`,
    (c) => `${c.hi}${c.amt}${c.forWhat}. The audience is on the edge of its seat 🍿`,
  ],
  firm: [
    (c) => `${c.hi}${c.amt}${c.forWhat} is still pending${c.age ? ` after ${days(c.age)}` : ''}. Please settle it today.`,
    (c) => `${c.hi}reminder: you owe ${c.amt}${c.forWhat}${c.age ? `, open for ${days(c.age)}` : ''}. Please send it across and tell me once done.`,
    (c) => `${c.hi}please clear ${c.amt}${c.forWhat} by this weekend.`,
    (c) => `${c.hi}following up on ${c.amt}${c.forWhat}. Let me know when it's sent.`,
  ],
  formal: [
    (c) => `Hi ${c.hi ? c.hi.replace(/, $/, '') : 'there'}, this is a reminder that ${c.amt} is outstanding${c.forWhat}. Kindly transfer it at your convenience. Thank you.`,
    (c) => `Hello ${c.hi ? c.hi.replace(/, $/, '') : ''}, as discussed, your share${c.forWhat} is ${c.amt}. Please let me know once it has been paid. Regards.`.replace('Hello ,', 'Hello,'),
    (c) => `Dear ${c.hi ? c.hi.replace(/, $/, '') : 'friend'}, a gentle reminder regarding ${c.amt}${c.forWhat}. Many thanks.`,
  ],
  savage: [
    (c) => `${c.hi}${c.amt}${c.forWhat}${c.age ? `, ${days(c.age)} old now` : ''}. At this point it's a long-term relationship. Bruh me.`,
    (c) => `${c.hi}I covered${c.what ? ` ${c.what}` : ' it'}, you covered nothing. ${c.amt}. The math is not mathing. Bruh me.`,
    (c) => `${c.hi}${c.amt}${c.forWhat}. I'd say take your time, but you already did.`,
    (c) => `${c.hi}your ${c.amt}${c.forWhat} has been on read longer than my texts. Bruh me.`,
    (c) => `${c.hi}${c.amt}${c.forWhat}. Even my plants grew faster than this payback 🌱`,
  ],
};

/** How many lines a tone has, for the left/right picker. */
export const linesIn = (tone: Tone) => LINES[tone].length;

export function nudgeMessage(input: NudgeInput, tone: Tone = 'playful', variant = 0): string {
  const amt = formatMoney(Math.abs(Math.round(input.amount)), input.currency ?? 'INR', { trimZeros: true });
  const nm = first(input.name);
  const items = (input.items ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 2);
  const what = items.length ? items.join(' + ') : input.reason?.trim() || null;
  const age = input.daysOwed && input.daysOwed >= 2 ? Math.round(input.daysOwed) : null;
  const ctx: Ctx = { hi: nm ? `${nm}, ` : '', amt, what, forWhat: what ? ` for ${what}` : '', age, ago: age ? ` (${days(age)} ago)` : '' };
  const list = LINES[tone] ?? LINES.playful;
  const v = ((variant % list.length) + list.length) % list.length;
  let text = list[v](ctx).replace(/\s+/g, ' ').trim();
  text = text.charAt(0).toUpperCase() + text.slice(1);
  const link = upiLink({ upiId: input.upiId, payeeName: input.payeeName, amount: input.amount, note: what });
  return link ? `${text}\n\nTap to pay: ${link}\nUPI ID: ${input.upiId!.trim()}` : text;
}
