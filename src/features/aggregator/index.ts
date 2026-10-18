/**
 * RBI Account Aggregator (AA) is the regulated, consent-based way to pull bank transactions without reading SMS.
 * Real access needs an FIU registration / a licensed AA gateway partner. Until then `MockAccountAggregator` returns
 * deterministic sample data so the import flow can be built and demoed. Results feed the SAME pending pipeline
 * as SMS, so dedupe, learning and "What was this for?" all apply.
 */
export interface AaTransaction {
  accountMask: string; // last 4
  amountMinor: number;
  direction: 'debit' | 'credit';
  narration: string;
  occurredAt: number;
  reference?: string;
}

export interface AccountAggregator {
  readonly name: string;
  /** Start the consent journey; resolves with a consent handle once the user approves in the AA app. */
  requestConsent(opts: { fromMs: number; toMs: number }): Promise<{ consentId: string }>;
  fetchTransactions(consentId: string): Promise<AaTransaction[]>;
  revokeConsent(consentId: string): Promise<void>;
}

export class MockAccountAggregator implements AccountAggregator {
  readonly name = 'Mock AA (sample data)';
  async requestConsent() {
    return { consentId: 'mock-consent' };
  }
  async fetchTransactions(): Promise<AaTransaction[]> {
    const now = Date.now();
    return [
      { accountMask: '1234', amountMinor: 45000, direction: 'debit', narration: 'UPI/P2M/629415370122/SWIGGY', occurredAt: now - 3_600_000, reference: '629415370122' },
      { accountMask: '1234', amountMinor: 8500000, direction: 'credit', narration: 'NEFT-ACME CORP-SALARY', occurredAt: now - 5 * 86_400_000 },
    ];
  }
  async revokeConsent() {}
}

/** Convert an AA row into a synthetic bank-style message so it can go through the shared parser/pending pipeline. */
export function aaToMessage(t: AaTransaction): string {
  const amt = (t.amountMinor / 100).toFixed(2);
  const when = new Date(t.occurredAt);
  const d = `${String(when.getDate()).padStart(2, '0')}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getFullYear()).slice(2)}`;
  return t.direction === 'debit'
    ? `Rs.${amt} debited from a/c XX${t.accountMask} on ${d}. Info: ${t.narration}${t.reference ? ` UPI Ref ${t.reference}` : ''}`
    : `Rs.${amt} credited to a/c XX${t.accountMask} on ${d}. Info: ${t.narration}`;
}
