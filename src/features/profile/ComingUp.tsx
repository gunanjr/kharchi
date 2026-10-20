import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Row, SectionHeader, Text, Money } from '@/components/ui';
import { useQuery } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { viewAll } from '@/features/dues/dues';
import { findRepeating } from '@/features/radar/radar';
import { useIsPro } from '@/features/pro/store';
import { useSettings } from '@/store/settings';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, layout, space } from '@/theme/tokens';

const DAY = 86_400_000;
const when = (d: number) => (d < 0 ? `Overdue by ${-d} ${d === -1 ? 'day' : 'days'}` : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`);
const sod = (t: number) => { const x = new Date(t); x.setHours(0, 0, 0, 0); return x.getTime(); };

/** Pro on Home: bills due and subscriptions renewing in the next 7 days, from Due dates and Subscription radar. */
export function ComingUp() {
  const pro = useIsPro();
  const router = useRouter();
  const { colors } = useTheme();
  const dues = useSettings((s) => s.dueItems);
  const radarState = useSettings((s) => s.radarState);
  const now = Date.now();
  const q = useQuery(async (d) => findRepeating(await listTransactions(d, { from: now - 400 * DAY, to: now + 1 }), now), []);
  if (!pro || !q.data) return null;
  const rows = [
    ...viewAll(dues, now).filter((v) => v.status !== 'paid' && v.inDays <= 7).map((v) => ({ key: `d${v.id}`, name: v.name, sub: 'Due', inDays: v.inDays, at: v.due, amount: v.amount })),
    ...q.data.filter((r) => r.status === 'active' && !radarState[r.key]?.cancelledAt).map((r) => ({ r, inDays: Math.round((sod(r.nextExpected) - sod(now)) / DAY) }))
      .filter((x) => x.inDays >= 0 && x.inDays <= 7).map(({ r, inDays }) => ({ key: `r${r.key}`, name: r.name, sub: 'Renews', inDays, at: r.nextExpected, amount: r.amount as number | null })),
  ].sort((a, b) => a.inDays - b.inDays).slice(0, 4);
  if (!rows.length) return null;
  const total = rows.reduce((a, r) => a + (r.amount ?? 0), 0);
  return (
    <View style={{ paddingHorizontal: layout.gutter, gap: space.xs }}>
      <SectionHeader title="Bills this week" action="Due dates" onAction={() => router.push('/dues')} />
      <Card style={{ gap: space.md }}>
        {rows.map((r) => (
          <Row key={r.key} style={{ gap: space.md }}>
            <View style={{ width: 44, paddingVertical: 4, borderRadius: 12, backgroundColor: r.inDays < 0 ? colors.expense : r.inDays <= 1 ? colors.ink : colors.surfaceAlt, alignItems: 'center' }}>
              <Text style={{ fontFamily: fonts.brandBlack, fontSize: 17, lineHeight: 20, color: r.inDays <= 1 ? colors.onInk : colors.text }}>{new Date(r.at).getDate()}</Text>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 10, lineHeight: 12, color: r.inDays <= 1 ? colors.onInk : colors.textMuted }}>{new Date(r.at).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text v="title" numberOfLines={1}>{r.name}</Text>
              <Text v="small" color={r.inDays <= 1 ? colors.expense : colors.textMuted}>{r.sub} · {when(r.inDays)}</Text>
            </View>
            {r.amount ? <Money size="sm" align="right" text={formatMoney(r.amount, 'INR', { trimZeros: true })} /> : null}
          </Row>
        ))}
        {total ? <Text v="small" color={colors.textMuted}>About {formatMoney(total, 'INR', { trimZeros: true })} going out in the next 7 days</Text> : null}
      </Card>
    </View>
  );
}
