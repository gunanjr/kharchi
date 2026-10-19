import type { Db } from "@/db/types";
import type { PendingTx } from "@/domain/types";
import { insertRow, updateRow } from "@/db/rows";
import { hash } from "@/lib/id";
import { parseSms, looksLikeFinancialSender } from "@/features/parser/sms";
import { parseNotification } from "@/features/parser/notification";
import {
  fingerprint,
  isDuplicate,
  DEDUPE_WINDOW_MS,
} from "@/features/parser/dedupe";
import type { ParsedTx, ParseResult } from "@/features/parser/types";
import {
  suggestCategory,
  learnMerchant,
  setAlwaysCategorize,
  merchantKey,
} from "@/features/parser/merchants";
import { addTransaction } from "@/features/tracker/repo";

export type Origin = PendingTx["origin"];

export interface IngestInput {
  origin: Origin;
  /** SMS body, or notification text */
  body: string;
  sender?: string | null;
  title?: string;
  pkg?: string;
  receivedAt?: number;
  /** from settings.senderAllowlist */
  allowlist?: string[];
}

export type IngestResult =
  | { status: "created"; pendingId: string; parsed: ParsedTx }
  | { status: "duplicate" }
  | { status: "rejected"; reason: string };

function senderAllowed(sender: string | null | undefined, allowlist: string[]) {
  if (!allowlist.length) return true;
  const s = (sender ?? "").toUpperCase();
  return allowlist.some((a) => a && s.includes(a.toUpperCase()));
}

/** The one pipeline all sources share: parse -> filter -> dedupe -> pending row. The raw body is never stored (only a hash). */
export async function ingest(
  db: Db,
  input: IngestInput,
): Promise<IngestResult> {
  if (input.origin === "sms" || input.origin === "simulated") {
    if (input.origin === "sms" && !looksLikeFinancialSender(input.sender))
      return { status: "rejected", reason: "sender" };
    if (!senderAllowed(input.sender, input.allowlist ?? []))
      return { status: "rejected", reason: "allowlist" };
  }
  const r: ParseResult =
    input.origin === "notification" && input.pkg
      ? parseNotification({
          title: input.title,
          text: input.body,
          pkg: input.pkg,
          postedAt: input.receivedAt,
        })
      : parseSms(input.body, {
          sender: input.sender,
          receivedAt: input.receivedAt,
        });
  if (!r.ok) return { status: "rejected", reason: r.reason };
  const p = r.tx;
  const fp = fingerprint(p);

  if (await findDuplicate(db, p)) return { status: "duplicate" };

  const sug = await suggestCategory(db, p.merchant ?? p.vpa);
  let id: string;
  try {
    id = await insertRow(db, "pending_transactions", {
      amount: p.amount,
      direction: p.direction,
      currency: p.currency,
      account_last4: p.accountLast4,
      merchant: p.merchant,
      upi_ref: p.upiRef,
      occurred_at: p.occurredAt,
      balance: p.balance,
      sender: input.sender ?? input.pkg ?? null,
      origin: input.origin,
      raw_hash: hash(input.body),
      fingerprint: fp,
      suggested_category_id: sug.categoryId,
      status: "pending",
    });
  } catch (e) {
    if (/UNIQUE constraint/i.test(String((e as Error).message)))
      return { status: "duplicate" };
    throw e;
  }
  return { status: "created", pendingId: id, parsed: p };
}

/** Looks at pending items and real transactions inside the window. */
export async function findDuplicate(db: Db, p: ParsedTx): Promise<boolean> {
  const fp = fingerprint(p);
  const same = await db.get(
    `SELECT 1 x FROM pending_transactions WHERE fingerprint=? AND deleted_at IS NULL`,
    [fp],
  );
  if (same) return true;
  const from = p.occurredAt - DEDUPE_WINDOW_MS;
  const to = p.occurredAt + DEDUPE_WINDOW_MS;
  const cands = await db.all<PendingTx>(
    `SELECT * FROM pending_transactions WHERE deleted_at IS NULL AND amount=? AND occurred_at BETWEEN ? AND ?`,
    [p.amount, from, to],
  );
  const asCmp = (c: PendingTx) => ({
    amount: c.amount,
    direction: c.direction,
    accountLast4: c.account_last4,
    upiRef: c.upi_ref,
    occurredAt: c.occurred_at,
  });
  if (cands.some((c) => isDuplicate(p, asCmp(c)))) return true;
  // already-saved transactions that came from this pipeline (fingerprint) or match fuzzily
  const txs = await db.all<{
    amount: number;
    type: string;
    occurred_at: number;
    fingerprint: string | null;
  }>(
    `SELECT amount, type, occurred_at, fingerprint FROM transactions WHERE deleted_at IS NULL AND amount=? AND occurred_at BETWEEN ? AND ? AND source IN ('sms','notification','share')`,
    [p.amount, from, to],
  );
  return txs.some(
    (t) =>
      t.fingerprint === fp ||
      (t.type === (p.direction === "debit" ? "expense" : "income") &&
        Math.abs(t.occurred_at - p.occurredAt) <= DEDUPE_WINDOW_MS),
  );
}

export const listPending = (db: Db) =>
  db.all<PendingTx>(
    `SELECT * FROM pending_transactions WHERE status='pending' AND deleted_at IS NULL ORDER BY occurred_at DESC`,
  );

export interface ConfirmResult {
  txId: string;
  /** set when the user has now confirmed the same merchant->category AUTO_AFTER times */
  offerAlways: { merchant: string; categoryId: string } | null;
}

/** User said what it was for: create the real transaction and learn the merchant. */
export async function confirmPending(
  db: Db,
  id: string,
  opts: {
    categoryId: string | null;
    note?: string | null;
    accountId?: string | null;
    /** Corrections made on the review screen; the parsed values are used when omitted. */
    amount?: number;
    merchant?: string | null;
  },
): Promise<ConfirmResult> {
  const p = await db.get<PendingTx>(
    `SELECT * FROM pending_transactions WHERE id=?`,
    [id],
  );
  if (!p) throw new Error("pending item not found");
  if (p.status === "saved") throw new Error("already saved");
  const txId = await addTransaction(db, {
    type: p.direction === "debit" ? "expense" : "income",
    amount: opts.amount ?? p.amount,
    currency: p.currency,
    category_id: opts.categoryId,
    account_id: opts.accountId ?? null,
    merchant: opts.merchant !== undefined ? opts.merchant : p.merchant,
    note: opts.note ?? null,
    occurred_at: p.occurred_at,
    payment_method: p.upi_ref ? "upi" : null,
    source:
      p.origin === "notification"
        ? "notification"
        : p.origin === "share"
          ? "share"
          : "sms",
    fingerprint: p.fingerprint,
  });
  await updateRow(db, "pending_transactions", id, { status: "saved" });
  let offerAlways: ConfirmResult["offerAlways"] = null;
  const learnFrom = (opts.merchant !== undefined ? opts.merchant : p.merchant) ?? opts.note ?? null;
  if (opts.categoryId && learnFrom && merchantKey(learnFrom)) {
    const l = await learnMerchant(db, learnFrom, opts.categoryId);
    if (l.offerAlways)
      offerAlways = { merchant: learnFrom, categoryId: opts.categoryId };
  }
  return { txId, offerAlways };
}

export const skipPending = (db: Db, id: string) =>
  updateRow(db, "pending_transactions", id, { status: "skipped" });
/** "This isn't mine": remembered so the same payment is never re-offered. */
export const markNotMine = (db: Db, id: string) =>
  updateRow(db, "pending_transactions", id, { status: "not_mine" });
export { setAlwaysCategorize };
