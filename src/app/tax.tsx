import React, { useState } from 'react';
import { View } from 'react-native';
import { SubScreen, Card, Text, Row, Button, Money, Chip } from '@/components/ui';
import { SkeletonList } from '@/components/Feedback';
import { useQuery } from '@/db/provider';
import { listTransactions } from '@/features/tracker/repo';
import { currentFyStart, fyWindow, taxCsv, taxTotals } from '@/features/tax/tax';
import { shareTextFile } from '@/features/settings/files';
import { ProGate } from '@/features/pro/ProGate';
import { formatMoney } from '@/domain/money';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/** Tax-time totals (Pro): what you paid this financial year for the things a CA usually asks about. Totals only. */
export default function Tax() {
  const { colors } = useTheme();
  const start = currentFyStart(Date.now());
  const [fy, setFy] = useState(start);
  const w = fyWindow(fy);
  const q = useQuery((d) => listTransactions(d, { from: w.from, to: w.to - 1, type: 'expense', includeExcluded: true, allSpaces: true }), [fy]);
  const rows = q.data ? taxTotals(q.data, fy) : [];

  return (
    <SubScreen title="Tax-time totals">
      <ProGate title="Tax-time totals" body="Tag what you pay for investments, insurance, rent, donations or a home loan, and BruhMe totals it for each financial year so you can hand the numbers to your CA in one tap.">
        <Row style={{ gap: space.sm }}>{[start, start - 1, start - 2].map((y) => <Chip key={y} label={fyWindow(y).label} selected={fy === y} onPress={() => setFy(y)} />)}</Row>
        {!q.data ? <SkeletonList n={4} /> : (
          <>
            {rows.map((r) => (
              <View key={r.key} accessible accessibilityLabel={`${r.title}: ${formatMoney(r.total, 'INR')}`}>
                <Card style={{ gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between', gap: space.md }}>
                    <Text v="title" style={{ flex: 1 }}>{r.title}</Text>
                    <Money size="md" align="right" text={formatMoney(r.total, 'INR', { trimZeros: true })} />
                  </Row>
                  <Text v="small" color={colors.textMuted}>{r.count ? `${r.count} ${r.count === 1 ? 'entry' : 'entries'}` : r.hint}</Text>
                </Card>
              </View>
            ))}
            <Button title="Share as a spreadsheet" icon="share" onPress={() => shareTextFile(`bruhme-tax-${w.label.replace(/\s/g, '-')}.csv`, taxCsv(rows, w.label), 'text/csv')} />
            <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: space.md }}>
              <Text v="small" color={colors.textMuted}>Totals of what you recorded, for {w.label} (April to March). This is not tax advice and no limits or rules are applied; check with a tax professional.</Text>
            </View>
          </>
        )}
      </ProGate>
    </SubScreen>
  );
}
