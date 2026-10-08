PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requester TEXT NOT NULL,
  department TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('hardware', 'software', 'rede', 'acesso')),
  priority TEXT NOT NULL CHECK (priority IN ('alta', 'media', 'baixa')),
  status TEXT NOT NULL CHECK (status IN ('aberto', 'em_andamento', 'resolvido')),
  resolution TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS ticket_events (
  id TEXT PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('create', 'edit', 'status', 'comment')),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_events_ticket ON ticket_events(ticket_id);
