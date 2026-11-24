-- Katia Skills registry schema, migration 0001.
-- user_id is an opaque authenticated subject supplied by katia-braine.
-- Never accept user_id directly from an untrusted browser request.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS skill_versions (
  skill_id TEXT NOT NULL,
  version TEXT NOT NULL,
  source_owner TEXT NOT NULL,
  source_repo TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  source_commit_sha TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  package_sha256 TEXT NOT NULL,
  package_r2_key TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (skill_id, version),
  CHECK (length(skill_id) BETWEEN 3 AND 64),
  CHECK (length(version) BETWEEN 1 AND 64),
  CHECK (length(package_sha256) = 64)
);

CREATE TABLE IF NOT EXISTS user_skill_installs (
  user_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'installed'
    CHECK (status IN ('installed', 'enabled', 'disabled')),
  requested_permissions_json TEXT NOT NULL DEFAULT '[]',
  granted_permissions_json TEXT NOT NULL DEFAULT '[]',
  installed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, skill_id),
  FOREIGN KEY (skill_id, version)
    REFERENCES skill_versions (skill_id, version)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (length(user_id) BETWEEN 1 AND 160)
);

CREATE TABLE IF NOT EXISTS skill_audit_events (
  event_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'analyzed', 'install_approved', 'installed', 'enabled',
    'disabled', 'permissions_changed', 'update_approved',
    'updated', 'uninstalled', 'install_rejected'
  )),
  skill_id TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (length(user_id) BETWEEN 1 AND 160)
);

CREATE INDEX IF NOT EXISTS idx_user_skill_installs_user_status
  ON user_skill_installs (user_id, status);

CREATE INDEX IF NOT EXISTS idx_skill_audit_user_created
  ON skill_audit_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_skill_audit_skill_created
  ON skill_audit_events (skill_id, created_at DESC);
