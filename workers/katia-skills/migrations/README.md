# Katia Skills D1 migrations

Apply migrations only after the D1 database has been created and its binding has been added to `wrangler.toml`.

The first migration creates:
- `skill_versions`: immutable version metadata and package digest.
- `user_skill_installs`: per-user installation state and explicit permission grants.
- `skill_audit_events`: append-only lifecycle events.

Important:
- `user_id` must come from the authenticated Katia Brain server-to-server request. Never trust a browser-provided user ID.
- Requested permissions and granted permissions are stored separately.
- No install endpoint is implemented yet; the schema is groundwork only.
- Package bytes belong in R2; D1 stores the immutable R2 object key and SHA-256 digest.
- Do not store API keys, access tokens, passwords, or other secrets in these tables.

After configuring the D1 binding, use Wrangler's local migration command first, inspect the local database, then apply remotely only after reviewing the migration.
