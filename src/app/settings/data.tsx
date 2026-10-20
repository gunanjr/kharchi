import React from 'react';
import { Alert } from 'react-native';
import { SubScreen, Card, Text, Button } from '@/components/ui';
import { ToastHost, toast } from '@/components/Toast';
import { useDb, bumpData } from '@/db/provider';
import { exportBackup, wipeAll } from '@/db/backup';
import { useRestoreFlow } from '@/features/vault/ui/useRestoreFlow';
import { listTransactions, listCategories, listAccounts, addTransaction , seedDefaults } from '@/features/tracker/repo';
import { importCsv, toCsv } from '@/features/tracker/csv';
import { pickTextFile, shareTextFile } from '@/features/settings/files';
import { space } from '@/theme/tokens';

export default function DataScreen() {
  const db = useDb();

  async function exportCsv() {
    const [tx, cats, accs] = await Promise.all([listTransactions(db, { includeExcluded: true, allSpaces: true }), listCategories(db), listAccounts(db)]);
    await shareTextFile(`bruhme-transactions-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(tx, cats, Object.fromEntries(accs.map((a) => [a.id, a.name]))), 'text/csv');
  }
  async function importFromCsv() {
    const f = await pickTextFile(['text/csv', 'text/comma-separated-values', 'text/plain', '*/*']);
    if (!f) return;
    const { rows, skipped } = importCsv(f.text);
    if (!rows.length) return toast(`No usable rows found (${skipped} skipped)`);
    const cats = await listCategories(db);
    const byName = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]));
    await db.transaction(async () => {
      for (const r of rows)
        await addTransaction(db, {
          type: r.type, amount: r.amount, currency: r.currency, occurred_at: r.occurred_at, merchant: r.merchant, note: r.note,
          category_id: byName.get(r.categoryName.toLowerCase()) ?? null, source: 'import', excluded: r.excluded,
        });
    });
    bumpData();
    toast(`Imported ${rows.length} transactions${skipped ? `, skipped ${skipped}` : ''}`);
  }
  async function backup() {
    await shareTextFile(`bruhme-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await exportBackup(db)), 'application/json');
  }
  const restoreFlow = useRestoreFlow();
  const restore = restoreFlow.start;
  function wipe() {
    Alert.alert('Delete all my data?', 'This permanently erases every transaction, group, budget and setting on this phone. Export a backup first if unsure.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete everything', style: 'destructive', onPress: async () => { await wipeAll(db); await seedDefaults(db); bumpData(); toast('All data deleted'); } },
    ]);
  }

  return (
    <SubScreen title="Export & backup">
      <Card style={{ gap: space.md }}>
        <Text v="h2">Spreadsheet</Text>
        <Button title="Export transactions (CSV)" kind="secondary" onPress={exportCsv} />
        <Button title="Import CSV or bank statement" kind="secondary" onPress={importFromCsv} />
      </Card>
      <Card style={{ gap: space.md }}>
        <Text v="h2">Full backup</Text>
        <Text v="small">One file with everything: transactions, groups, budgets, settings. Keep it somewhere safe.</Text>
        <Button title="Create backup file" kind="secondary" onPress={backup} />
        <Button title="Restore from backup" kind="secondary" onPress={restore} />
      </Card>
      <Card style={{ gap: space.md }}>
        <Text v="h2">Delete all my data</Text>
        <Button title="Delete everything" kind="danger" onPress={wipe} />
      </Card>
      {restoreFlow.element}
      <ToastHost />
    </SubScreen>
  );
}
