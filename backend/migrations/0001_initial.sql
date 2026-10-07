PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  email TEXT DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('admin','facility')),
  active INTEGER NOT NULL DEFAULT 1,
  password_hash TEXT,
  password_salt TEXT,
  password_cipher TEXT,
  password_iv TEXT,
  must_change INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  reporter TEXT NOT NULL,
  reporter_email TEXT DEFAULT '',
  location TEXT NOT NULL,
  category TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('laag','normaal','hoog','spoed')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  can_continue TEXT NOT NULL DEFAULT 'ja',
  photo_data TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','progress','wait','done')),
  assignee_id TEXT,
  internal_note TEXT DEFAULT '',
  mail_reporter_on_complete INTEGER NOT NULL DEFAULT 0,
  completion_mail_sent_at TEXT,
  FOREIGN KEY (assignee_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ticket_history (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  at TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT NOT NULL,
  type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS routing (
  category TEXT PRIMARY KEY,
  account_id TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS invites (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('create','reset')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  ticket_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read_at TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at);
CREATE INDEX IF NOT EXISTS idx_notifications_account ON notifications(account_id, read_at, created_at);
