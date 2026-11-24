-- Anonymous per-browser identity and one-use proof challenges.
-- The subject is a digest-derived pseudonym, not a personal account.

CREATE TABLE IF NOT EXISTS device_identities (
  subject TEXT NOT NULL PRIMARY KEY,
  public_key_spki TEXT NOT NULL,
  public_key_sha256 TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_seen_at INTEGER NOT NULL DEFAULT (unixepoch()),
  revoked_at INTEGER,
  CHECK (length(subject) BETWEEN 10 AND 160),
  CHECK (length(public_key_sha256) BETWEEN 40 AND 64)
);

CREATE TABLE IF NOT EXISTS device_challenges (
  challenge_id TEXT NOT NULL PRIMARY KEY,
  nonce TEXT NOT NULL,
  public_key_sha256 TEXT NOT NULL,
  context_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK (length(challenge_id) BETWEEN 20 AND 40),
  CHECK (length(public_key_sha256) BETWEEN 40 AND 64)
);

CREATE INDEX IF NOT EXISTS idx_device_challenges_expiry
  ON device_challenges (expires_at, consumed_at);
