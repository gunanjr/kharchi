import { parseSms } from './sms';
import type { ParseResult } from './types';

/** UPI / bank apps whose notifications we may parse (only when the user opts in). */
export const TRACKED_PACKAGES: Record<string, string> = {
  'com.google.android.apps.nbu.paisa.user': 'Google Pay',
  'com.phonepe.app': 'PhonePe',
  'net.one97.paytm': 'Paytm',
  'in.org.npci.upiapp': 'BHIM',
  'com.dreamplug.androidapp': 'CRED',
  'com.csam.icici.bank.imobile': 'ICICI iMobile',
  'com.snapwork.hdfc': 'HDFC Bank',
  'com.sbi.upi': 'SBI Pay',
  'com.axis.mobile': 'Axis Mobile',
  'com.infrasofttech.centralbankupi': 'Central UPI',
  'com.freecharge.android': 'Freecharge',
  'in.amazon.mShop.android.shopping': 'Amazon Pay',
};

export const isTrackedPackage = (pkg: string) => pkg in TRACKED_PACKAGES;

export function parseNotification(n: { title?: string; text?: string; pkg: string; postedAt?: number }): ParseResult {
  if (!isTrackedPackage(n.pkg)) return { ok: false, reason: 'not_financial' };
  const body = [n.title, n.text].filter(Boolean).join('. ').replace(/\.\s*\./g, '.');
  return parseSms(body, { sender: TRACKED_PACKAGES[n.pkg], receivedAt: n.postedAt });
}
