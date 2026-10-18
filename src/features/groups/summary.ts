import { formatMoney } from '@/domain/money';
import type { GroupSummary } from './repo';

/** Plain-text group summary for sharing (WhatsApp etc). */
export function groupSummaryText(s: GroupSummary, appName = 'Kharchi'): string {
  const name = new Map(s.members.map((m) => [m.id, m.name]));
  const cur = s.group.currency;
  const lines = [`${s.group.icon ?? ''} ${s.group.name}`.trim(), `Total spent: ${formatMoney(s.totalSpent, cur, { trimZeros: true })}`, ''];
  if (!s.transfers.length) lines.push('Everyone is settled up ✅');
  else {
    lines.push(s.group.simplify ? 'To settle up:' : 'Who owes whom:');
    for (const t of s.transfers) lines.push(`• ${name.get(t.from) ?? '?'} → ${name.get(t.to) ?? '?'}: ${formatMoney(t.amount, cur, { trimZeros: true })}`);
  }
  lines.push('', `Shared from ${appName}`);
  return lines.join('\n');
}
