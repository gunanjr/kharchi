import { native } from '@/features/native/module';
import { groupIntoRows } from './rows';
import { parseBillRows } from './parse';
import type { OcrLine, ParsedBill } from './types';

export const canScanBills = () => !!native?.recognizeText;

/** Photo -> on-device OCR -> table rows -> parsed bill. Nothing leaves the phone. */
export async function scanBillPhoto(path: string): Promise<ParsedBill> {
  if (!native?.recognizeText) throw new Error('Scanning needs the installed app (not Expo Go)');
  const json = await native.recognizeText(path);
  const { lines } = JSON.parse(json) as { lines: OcrLine[] };
  return parseBillRows(groupIntoRows(lines));
}

/** For Expo Go / manual fallback: parse text the user pasted (one bill row per line). */
export function parsePastedBill(text: string): ParsedBill {
  return parseBillRows(text.split(/\r?\n/));
}
