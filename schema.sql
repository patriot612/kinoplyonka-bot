-- Kinoplyonka bot database schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  country TEXT NOT NULL,
  year TEXT NOT NULL,
  rating TEXT NOT NULL,
  description TEXT NOT NULL,
  poster_file_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  services TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_movies_code ON movies (code);
CREATE INDEX IF NOT EXISTS idx_movies_title ON movies (title);

CREATE TABLE IF NOT EXISTS users (
  telegram_id INTEGER PRIMARY KEY,
  first_seen INTEGER NOT NULL
);

-- Stores transient conversation state per user (admin wizards, "waiting for
-- code/title" prompts, etc). Workers are stateless between requests, so this
-- table is what lets a multi-step flow continue across separate messages.
CREATE TABLE IF NOT EXISTS sessions (
  telegram_id INTEGER PRIMARY KEY,
  state TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Tracks the message IDs of the last movie card / services message shown to
-- a user, so "Назад" can delete/restore the right message.
CREATE TABLE IF NOT EXISTS message_context (
  telegram_id INTEGER PRIMARY KEY,
  last_movie_card_message_id INTEGER,
  last_movie_id INTEGER,
  last_services_message_id INTEGER,
  updated_at INTEGER NOT NULL
);
