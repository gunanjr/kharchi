import type { Db } from '@/db/types';
import { insertRow, softDelete, updateRow } from '@/db/rows';

export type FeedbackKind = 'problem' | 'idea' | 'praise';
export type FeedbackStatus = 'saved' | 'sent';
export interface FeedbackRow { id: string; kind: FeedbackKind; message: string; include_info: number; status: FeedbackStatus; sent_at: number | null; created_at: number }

export const MIN_LEN = 5;
export const MAX_LEN = 2000;

export const KIND_LABEL: Record<FeedbackKind, string> = { problem: 'Something is wrong', idea: 'An idea', praise: 'Something I like' };

/** The reply shown straight after a message is sent. It promises only what is true: the team reads what arrives. */
export const THANKS: Record<FeedbackKind, string> = {
  problem: 'Thank you for telling us. Problems you report are how we find what to fix first, and we read every message.',
  idea: 'Thank you for the suggestion. We keep improving Kharchi based on ideas like yours, and nothing sent to us goes unread.',
  praise: 'Thank you, that really helps. We will keep the things you like working well.',
};

export const cleanMessage = (m: string) => m.replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);

export async function saveFeedback(db: Db, kind: FeedbackKind, message: string, includeInfo: boolean): Promise<string> {
  const msg = cleanMessage(message);
  if (msg.length < MIN_LEN) throw new Error('Please write a few words so we can understand.');
  return insertRow(db, 'feedback', { kind, message: msg, include_info: includeInfo ? 1 : 0, status: 'saved' });
}
export const markSent = (db: Db, id: string) => updateRow(db, 'feedback', id, { status: 'sent', sent_at: Date.now() });
export const listFeedback = (db: Db) => db.all<FeedbackRow>(`SELECT * FROM feedback WHERE deleted_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 50`);
export const removeFeedback = (db: Db, id: string) => softDelete(db, 'feedback', id);

export interface AppInfo { app: string; version: string; os: string; osVersion: string }

/** Builds the email. It contains the user's words and, if they allow it, app and phone type only. Never any transactions. */
export function buildMail(kind: FeedbackKind, message: string, includeInfo: boolean, info: AppInfo, to: string) {
  const subject = `${info.app} ${kind === 'problem' ? 'problem report' : kind === 'idea' ? 'suggestion' : 'feedback'}`;
  const body = `${cleanMessage(message)}\n\n${includeInfo ? `--\nApp ${info.version} on ${info.os} ${info.osVersion}\n` : ''}`;
  return { to, subject, body, url: `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
}

/** Crash reports contain the error's name and message only, shortened. Never data from the database. */
export function buildCrashMail(error: Error, info: AppInfo, to: string) {
  const msg = `${error.name}: ${error.message}`.replace(/\s+/g, ' ').slice(0, 300);
  return buildMail('problem', `The app showed an error screen.\n\n${msg}`, true, info, to);
}
