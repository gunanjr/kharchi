import type { Db } from '@/db/types';
import { insertRow, softDelete, updateRow } from '@/db/rows';
import type { BillItem, ParsedBill } from './types';
import { addGroupExpense, type NewGroupExpense } from '@/features/groups/repo';
import { suggestCategory } from '@/features/parser/merchants';
import { native } from '@/features/native/module';

export interface Bill {
  id: string;
  photo_path: string;
  status: 'new' | 'split';
  store: string | null;
  total: number | null;
  items: string | null; // JSON BillItem[]
  bill_date: number | null;
  group_expense_id: string | null;
  created_at: number;
  deleted_at: number | null;
}

export const addBill = (db: Db, photoPath: string) => insertRow(db, 'bills', { photo_path: photoPath, status: 'new' });

/** A demo bill with no photo (for Expo Go, where scanning is unavailable): the review/assign screen works the same. */
export async function addSampleBill(db: Db, parsed: ParsedBill): Promise<string> {
  const id = await addBill(db, '');
  await saveParsed(db, id, parsed);
  return id;
}

export const listBills = (db: Db, status: Bill['status'] = 'new') =>
  db.all<Bill>(`SELECT * FROM bills WHERE deleted_at IS NULL AND status=? ORDER BY created_at DESC`, [status]);

export const getBill = (db: Db, id: string) => db.get<Bill>(`SELECT * FROM bills WHERE id=?`, [id]);

export const countNewBills = async (db: Db) =>
  (await db.get<{ n: number }>(`SELECT COUNT(*) n FROM bills WHERE deleted_at IS NULL AND status='new'`))?.n ?? 0;

/** Cache what was read from the photo (parsed fields only, never the raw OCR text). */
export const saveParsed = (db: Db, id: string, p: ParsedBill) =>
  updateRow(db, 'bills', id, { store: p.store, total: p.total, items: JSON.stringify(p.items), bill_date: p.date });

export const parsedFromBill = (b: Bill): ParsedBill | null =>
  b.items ? { store: b.store, total: b.total, date: b.bill_date, items: JSON.parse(b.items) as BillItem[], warnings: [] } : null;

export async function deleteBill(db: Db, id: string) {
  const b = await getBill(db, id);
  if (b) native?.deleteBillPhoto?.(b.photo_path);
  await softDelete(db, 'bills', id);
}

/** Turn a reviewed bill into a group expense (itemised split) and mark the bill as split. */
export async function finishBill(db: Db, billId: string, e: Omit<NewGroupExpense, 'receiptUri' | 'categoryId'> & { categoryId?: string | null }, photoPath: string) {
  const cat = e.categoryId ?? (await suggestCategory(db, e.description)).categoryId ?? 'cat_groceries';
  const expenseId = await addGroupExpense(db, { ...e, categoryId: cat, receiptUri: photoPath });
  await updateRow(db, 'bills', billId, { status: 'split', group_expense_id: expenseId });
  return expenseId;
}
