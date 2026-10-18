import { aaToMessage, MockAccountAggregator } from '../index';
import { parseSms } from '@/features/parser/sms';

test('AA rows round-trip through the SMS parser', async () => {
  const rows = await new MockAccountAggregator().fetchTransactions();
  for (const r of rows) {
    const p = parseSms(aaToMessage(r));
    expect(p.ok && p.tx.amount).toBe(r.amountMinor);
    expect(p.ok && p.tx.direction).toBe(r.direction);
    expect(p.ok && p.tx.accountLast4).toBe(r.accountMask);
  }
});
