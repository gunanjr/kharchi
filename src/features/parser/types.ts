export type RejectReason =
  | 'otp'
  | 'promo'
  | 'balance_only'
  | 'failed'
  | 'reversed'
  | 'card_payment'
  | 'not_financial';

export interface ParsedTx {
  amount: number; // minor units
  currency: string;
  direction: 'debit' | 'credit';
  accountLast4: string | null;
  merchant: string | null;
  vpa: string | null;
  upiRef: string | null;
  occurredAt: number;
  balance: number | null;
  instrument: 'upi' | 'card' | 'atm' | 'account';
  bank: string | null;
}

export type ParseResult = { ok: true; tx: ParsedTx } | { ok: false; reason: RejectReason };
