-- Initial schema — users + sessions.
--
-- users: one row per Google account. We dedupe on `google_sub` (the
-- subject claim from the ID token), not on email — emails can change
-- ownership but `sub` is stable per Google account.
--
-- sessions: opaque session tokens; the cookie carries this id. We
-- could compute sessions HMACs only (stateless), but storing them
-- lets us invalidate on logout without waiting for the cookie to
-- expire. Each session is one device.

CREATE TABLE users (
  id              TEXT PRIMARY KEY,                -- our UUID
  google_sub      TEXT NOT NULL UNIQUE,            -- Google's stable user id
  email           TEXT NOT NULL,
  email_verified  INTEGER NOT NULL DEFAULT 0,      -- 0/1
  name            TEXT,
  picture_url     TEXT,
  created_at      INTEGER NOT NULL,                -- ms since epoch
  updated_at      INTEGER NOT NULL
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,                   -- the opaque token in the cookie
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL,                   -- ms since epoch
  user_agent   TEXT,                               -- first request's UA (debug only)
  ip_hash      TEXT                                -- sha256(ip+session_secret) for abuse signals
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
