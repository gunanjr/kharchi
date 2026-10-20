import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState } from '@/components/Feedback';
import { SubScreen, Text } from '@/components/ui';
import { ToastHost, toast } from '@/components/Toast';
import { DraftEditor, type Draft } from '@/features/capture/DraftEditor';
import { useDb, bumpData } from '@/db/provider';
import { confirmPending, skipPending } from '@/features/pending/service';
import { suggestCategory } from '@/features/parser/merchants';
import { deleteTransaction } from '@/features/tracker/repo';
import type { PendingTx } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';
import { haptic } from '@/lib/haptics';

/** Opens straight after a bank message is shared into the app: review, correct, then save or discard. */
export default function ImportReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDb();
  const router = useRouter();
  const { colors } = useTheme();
  const [p, setP] = useState<PendingTx | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState(false);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  useEffect(() => {
    (async () => {
      // opened without a message (or a stale link): show the "nothing to review" state instead of loading forever
      const row = id ? await db.get<PendingTx>(`SELECT * FROM pending_transactions WHERE id=?`, [id]).catch(() => null) : null;
      setP(row ?? null);
      if (!row) return;
      const s = await suggestCategory(db, row.merchant);
      setDraft({ type: row.direction === 'debit' ? 'expense' : 'income', amount: row.amount, description: row.merchant ?? '', categoryId: row.suggested_category_id ?? s.categoryId, source: row.suggested_category_id || s.categoryId ? (s.source === 'none' ? 'keyword' : s.source) : 'none', occurredAt: row.occurred_at });
    })();
  }, [db, id]);

  async function save() {
    if (!p || !draft?.amount || saved) return;
    setSaved(true); // blocks a double tap
    try {
      const r = await confirmPending(db, p.id, { categoryId: draft.categoryId, amount: draft.amount, merchant: draft.description.trim() || null });
      haptic.success();
      bumpData();
      toast('Saved', { label: 'Undo', run: async () => { await deleteTransaction(db, r.txId); await db.run(`UPDATE pending_transactions SET status='pending' WHERE id=?`, [p.id]); bumpData(); } });
      close();
    } catch (e) {
      setSaved(false);
      toast((e as Error).message);
    }
  }

  return (
    <SubScreen title="Review message">
      {p === undefined ? <Text color={colors.textMuted}>Loading…</Text> : null}
      {p === null ? <EmptyState art="inbox" title="Nothing to review" body="This message is no longer waiting. It may already be saved." action="Back" onAction={close} /> : null}
      {p && p.status !== 'pending' ? <Text color={colors.textMuted}>This message was already handled.</Text> : null}
      {p && p.status === 'pending' && draft ? (
        <>
          <Text color={colors.textMuted}>Read from the message you shared. Nothing is saved until you tap Save, and the message text itself is not kept.</Text>
          <DraftEditor draft={draft} saved={saved} onChange={setDraft} onSave={save} onDiscard={async () => { await skipPending(db, p.id); bumpData(); close(); }} note={p.account_last4 ? `Account •${p.account_last4}` : undefined} />
        </>
      ) : null}
      <ToastHost />
    </SubScreen>
  );
}
