import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';
import { SubScreen, Card, Text, Row, Button, Money, Chip, Press, Field } from '@/components/ui';
import { EmptyState, SkeletonList } from '@/components/Feedback';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, useQuery, bumpData } from '@/db/provider';
import { listTransactions, updateTransaction } from '@/features/tracker/repo';
import { useCategories } from '@/features/tracker/hooks';
import { readTags } from '@/features/tracker/tags';
import { claimCsv, claimHtml, claimRows, CLAIMED_TAG } from '@/features/reimburse/reimburse';
import { shareTextFile } from '@/features/settings/files';
import { ProGate } from '@/features/pro/ProGate';
import { formatMoney } from '@/domain/money';
import { formatDay } from '@/lib/date';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const inr = (n: number) => formatMoney(n, 'INR', { trimZeros: true });

/** Work reimbursements (Pro): everything tagged #work in a month, with receipts, as a PDF or spreadsheet to send. */
export default function Reimburse() {
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const { byId } = useCategories();
  const [off, setOff] = useState(0);
  const [showClaimed, setShowClaimed] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const now = new Date();
  const m = new Date(now.getFullYear(), now.getMonth() - off, 1);
  const from = m.getTime(), to = new Date(m.getFullYear(), m.getMonth() + 1, 1).getTime();
  const period = m.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const q = useQuery((d) => listTransactions(d, { from, to: to - 1, type: 'expense', includeExcluded: true, allSpaces: true }), [from, to]);
  const catName = (id: string | null) => (id ? byId.get(id)?.name ?? 'Other' : 'Uncategorised');
  const all = q.data ? claimRows(q.data, from, to, catName) : [];
  const rows = showClaimed ? all : all.filter((r) => !r.claimed);
  const total = rows.reduce((a, r) => a + r.amount, 0);

  async function images() {
    const out: Record<string, string> = {};
    for (const r of rows) {
      if (!r.receipt || /\.pdf$/i.test(r.receipt)) continue;
      try { out[r.receipt] = `data:image/jpeg;base64,${await new File(r.receipt).base64()}`; } catch { /* receipt moved or deleted: list it without the picture */ }
    }
    return out;
  }
  async function pdf() {
    setBusy(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: claimHtml(rows, { name: name.trim() || undefined, period, images: await images() }) });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Expense claim ${period}` });
    } catch { toast('Couldn’t create the PDF'); } finally { setBusy(false); }
  }
  async function markAllClaimed() {
    for (const r of rows) {
      const tx = q.data?.find((t) => t.id === r.id);
      if (!tx) continue;
      const tags = readTags(tx.tags);
      if (!tags.map((g) => g.toLowerCase()).includes(CLAIMED_TAG)) await updateTransaction(db, tx.id, { tags: [...tags, CLAIMED_TAG] });
    }
    bumpData();
    q.refetch();
    toast('Marked as claimed');
  }

  return (
    <SubScreen title="Reimbursements">
      <ProGate title="Work reimbursements" body="Tag work spends with #work and attach the bill photo. BruhMe lists them by month and makes a clean PDF claim with the receipts, or a spreadsheet, to send to your company.">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {Array.from({ length: 12 }, (_, i) => i).map((i) => { const x = new Date(now.getFullYear(), now.getMonth() - i, 1); return <Chip key={i} label={i === 0 ? 'This month' : x.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })} selected={off === i} onPress={() => setOff(i)} />; })}
        </ScrollView>
        {!q.data ? <SkeletonList n={3} /> : all.length === 0 ? (
          <EmptyState art="wallet" title="No work spends this month" body="Add the tag work to an expense (in the tags field when you add it) and it shows up here, ready to claim." action="Add an expense" onAction={() => router.push('/add')} />
        ) : (
          <>
            <Card tone="ink" style={{ gap: 4 }}>
              <Text v="small" color={colors.onHeroMuted}>{period} · {rows.length} to claim{all.some((r) => r.claimed) ? ` · ${all.filter((r) => r.claimed).length} claimed` : ''}</Text>
              <Money size="xl" color={colors.onHero} text={inr(total)} />
            </Card>
            <Row style={{ gap: space.sm }}>
              <Chip label="Not claimed yet" selected={!showClaimed} onPress={() => setShowClaimed(false)} />
              <Chip label="Everything" selected={showClaimed} onPress={() => setShowClaimed(true)} />
            </Row>
            <Card pad={false} style={{ paddingHorizontal: space.lg }}>
              {rows.map((r, i) => (
                <Press key={r.id} onPress={() => router.push(`/tx/${r.id}`)} accessibilityLabel={`${r.merchant} ${inr(r.amount)}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                  <View style={{ flex: 1 }}>
                    <Text v="title" numberOfLines={1}>{r.merchant}</Text>
                    <Text v="small" color={colors.textMuted}>{formatDay(r.date)} · {r.category}{r.receipt ? ' · receipt ✓' : ' · no receipt'}{r.claimed ? ' · claimed' : ''}</Text>
                  </View>
                  <Money size="md" align="right" text={inr(r.amount)} />
                </Press>
              ))}
            </Card>
            <Field label="Your name on the claim (optional)" value={name} onChangeText={setName} placeholder="Asha Rao" maxLength={60} />
            <Row style={{ gap: space.sm }}>
              <Button title="PDF with receipts" icon="download" onPress={pdf} loading={busy} disabled={!rows.length} style={{ flex: 1 }} />
              <Button title="Spreadsheet" kind="secondary" onPress={() => shareTextFile(`bruhme-claim-${m.getFullYear()}-${m.getMonth() + 1}.csv`, claimCsv(rows), 'text/csv')} disabled={!rows.length} style={{ flex: 1 }} />
            </Row>
            {rows.some((r) => !r.claimed) ? <Button title="Mark these as claimed" kind="ghost" onPress={markAllClaimed} /> : null}
            <Text v="small" color={colors.textSubtle} style={{ textAlign: 'center' }}>Made on your phone. It goes only where you send it.</Text>
          </>
        )}
      </ProGate>
      <ToastHost />
    </SubScreen>
  );
}
