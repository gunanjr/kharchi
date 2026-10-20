/** Ordered migrations. Every table carries sync columns: id, created_at, updated_at, deleted_at, dirty. */
const SYNC = `created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, dirty INTEGER NOT NULL DEFAULT 1`;

export const migrations: string[] = [
  /* 1: core */ `
CREATE TABLE settings (id TEXT PRIMARY KEY, value TEXT, ${SYNC});
CREATE TABLE accounts (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'INR',
  opening_balance INTEGER NOT NULL DEFAULT 0, last4 TEXT, color TEXT, icon TEXT, archived INTEGER NOT NULL DEFAULT 0, ${SYNC});
CREATE TABLE categories (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT NOT NULL, color TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'expense', sort INTEGER NOT NULL DEFAULT 0, builtin INTEGER NOT NULL DEFAULT 0, ${SYNC});
CREATE TABLE transactions (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, amount INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'INR',
  category_id TEXT, account_id TEXT, to_account_id TEXT, merchant TEXT, note TEXT,
  occurred_at INTEGER NOT NULL, payment_method TEXT, tags TEXT, receipt_uri TEXT,
  source TEXT NOT NULL DEFAULT 'manual', fingerprint TEXT, group_expense_id TEXT, recurring_id TEXT, ${SYNC});
CREATE INDEX idx_tx_time ON transactions(occurred_at);
CREATE INDEX idx_tx_cat ON transactions(category_id);
CREATE INDEX idx_tx_fp ON transactions(fingerprint);
CREATE TABLE budgets (
  id TEXT PRIMARY KEY, category_id TEXT, amount INTEGER NOT NULL, alert_pct INTEGER NOT NULL DEFAULT 80, ${SYNC});
CREATE TABLE recurring (
  id TEXT PRIMARY KEY, template TEXT NOT NULL, frequency TEXT NOT NULL, next_due INTEGER NOT NULL,
  scope TEXT NOT NULL DEFAULT 'personal', active INTEGER NOT NULL DEFAULT 1, ${SYNC});
CREATE TABLE pending_transactions (
  id TEXT PRIMARY KEY, amount INTEGER NOT NULL, direction TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'INR',
  account_last4 TEXT, merchant TEXT, upi_ref TEXT, occurred_at INTEGER NOT NULL, balance INTEGER,
  sender TEXT, origin TEXT NOT NULL DEFAULT 'sms', raw_hash TEXT, fingerprint TEXT NOT NULL,
  suggested_category_id TEXT, status TEXT NOT NULL DEFAULT 'pending', ${SYNC});
CREATE INDEX idx_pending_status ON pending_transactions(status);
CREATE UNIQUE INDEX idx_pending_fp ON pending_transactions(fingerprint);
CREATE TABLE merchant_rules (
  id TEXT PRIMARY KEY, merchant_key TEXT NOT NULL UNIQUE, category_id TEXT NOT NULL,
  confirm_count INTEGER NOT NULL DEFAULT 1, auto INTEGER NOT NULL DEFAULT 0, ${SYNC});
CREATE TABLE ai_messages (
  id TEXT PRIMARY KEY, role TEXT NOT NULL, text TEXT NOT NULL, payload TEXT, ${SYNC});
`,
  /* 2: groups */ `
CREATE TABLE people (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, upi_id TEXT, is_self INTEGER NOT NULL DEFAULT 0,
  remote_user_id TEXT, ${SYNC});
CREATE TABLE groups_ (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'INR', icon TEXT, kind TEXT,
  simplify INTEGER NOT NULL DEFAULT 1, ${SYNC});
CREATE TABLE group_members (id TEXT PRIMARY KEY, group_id TEXT NOT NULL, person_id TEXT NOT NULL, ${SYNC});
CREATE INDEX idx_gm_group ON group_members(group_id);
CREATE TABLE group_expenses (
  id TEXT PRIMARY KEY, group_id TEXT, description TEXT NOT NULL, amount INTEGER NOT NULL, currency TEXT NOT NULL,
  rate REAL NOT NULL DEFAULT 1, category_id TEXT, occurred_at INTEGER NOT NULL, split_type TEXT NOT NULL,
  note TEXT, receipt_uri TEXT, created_by TEXT, recurring_id TEXT, ${SYNC});
CREATE INDEX idx_ge_group ON group_expenses(group_id);
CREATE TABLE expense_payers (id TEXT PRIMARY KEY, expense_id TEXT NOT NULL, person_id TEXT NOT NULL, amount INTEGER NOT NULL, ${SYNC});
CREATE TABLE expense_shares (
  id TEXT PRIMARY KEY, expense_id TEXT NOT NULL, person_id TEXT NOT NULL, amount INTEGER NOT NULL, input_value REAL, ${SYNC});
CREATE INDEX idx_ep_exp ON expense_payers(expense_id);
CREATE INDEX idx_es_exp ON expense_shares(expense_id);
CREATE TABLE settlements (
  id TEXT PRIMARY KEY, group_id TEXT, from_person TEXT NOT NULL, to_person TEXT NOT NULL, amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR', method TEXT, note TEXT, occurred_at INTEGER NOT NULL, ${SYNC});
CREATE TABLE activity (
  id TEXT PRIMARY KEY, group_id TEXT, actor_id TEXT, kind TEXT NOT NULL, entity_id TEXT, summary TEXT NOT NULL,
  payload TEXT, ${SYNC});
CREATE TABLE comments (id TEXT PRIMARY KEY, expense_id TEXT NOT NULL, person_id TEXT, body TEXT NOT NULL, ${SYNC});
`,
  /* 3: scanned bills (photo stays on the device; only parsed fields are stored, never the raw OCR text) */ `
CREATE TABLE bills (
  id TEXT PRIMARY KEY, photo_path TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new',
  store TEXT, total INTEGER, items TEXT, bill_date INTEGER, group_expense_id TEXT, ${SYNC});
CREATE INDEX idx_bills_status ON bills(status);
`,
  /* 4: savings goals */ `
CREATE TABLE goals (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT NOT NULL DEFAULT 'target', color TEXT NOT NULL DEFAULT '#FF8106',
  target INTEGER NOT NULL, deadline INTEGER, achieved_at INTEGER, ${SYNC});
CREATE TABLE goal_entries (
  id TEXT PRIMARY KEY, goal_id TEXT NOT NULL, amount INTEGER NOT NULL, note TEXT, occurred_at INTEGER NOT NULL, ${SYNC});
CREATE INDEX idx_goal_entries ON goal_entries(goal_id);
`,
  /* 5: user feedback kept on the phone */ `
CREATE TABLE feedback (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, message TEXT NOT NULL, include_info INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'saved', sent_at INTEGER, ${SYNC});
`,
  /* 6: leave a transaction out of totals */ `
ALTER TABLE transactions ADD COLUMN excluded INTEGER NOT NULL DEFAULT 0;
`,
  /* 7: repair. Databases built before the migrations were renumbered may lack tables that a later numbering adds. Safe to repeat. */ `
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY, photo_path TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new',
  store TEXT, total INTEGER, items TEXT, bill_date INTEGER, group_expense_id TEXT, ${SYNC});
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT NOT NULL DEFAULT 'target', color TEXT NOT NULL DEFAULT '#FF8106',
  target INTEGER NOT NULL, deadline INTEGER, achieved_at INTEGER, ${SYNC});
CREATE TABLE IF NOT EXISTS goal_entries (
  id TEXT PRIMARY KEY, goal_id TEXT NOT NULL, amount INTEGER NOT NULL, note TEXT, occurred_at INTEGER NOT NULL, ${SYNC});
CREATE INDEX IF NOT EXISTS idx_goal_entries ON goal_entries(goal_id);
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, message TEXT NOT NULL, include_info INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'saved', sent_at INTEGER, ${SYNC});
`,
  /* 8: trip mode (optional dates and a daily budget on a group) */ `
ALTER TABLE groups_ ADD COLUMN trip_start INTEGER;
ALTER TABLE groups_ ADD COLUMN trip_end INTEGER;
ALTER TABLE groups_ ADD COLUMN daily_budget INTEGER;
`,
];
