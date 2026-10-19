import type { Minor } from '@/domain/money';

/** One line of recognised text with its box in image pixels (from on-device OCR). */
export interface OcrLine {
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface BillItem {
  id: string;
  name: string;
  amount: Minor; // the whole line amount (qty x rate already applied)
  qty: number | null;
  rate: Minor | null;
}

export interface ParsedBill {
  store: string | null;
  date: number | null;
  items: BillItem[];
  /** bill total as printed (net payable), minor units, or null if not found */
  total: Minor | null;
  warnings: string[];
}
