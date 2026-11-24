# Katia Skills D1 migrations

Apply migrations only after the D1 database has been created and its binding has been added to `wrangler.toml`.

The first migration creates:
- `skill_versions`: immutable version metadata and package digest.
- `user_skill_installs`: per-user installation state and explicit permission grants.
- `skill_audit_events`: append-only lifecycle events.

Important:
- `user_id` must come from the authenticated Katia Brain server-to-server request. Never trust a browser-provided user ID.
- Requested permissions and granted permissions are stored separately.
- Install and status endpoints are implemented in the isolated Worker; new installs start disabled and require explicit approval.
- R2 is optional. D1 stores the immutable GitHub commit and package SHA-256 digest; an R2 object key is stored only when R2 is configured.
- Do not store API keys, access tokens, passwords, or other secrets in these tables.

After configuring the D1 binding, use Wrangler's local migration command first, inspect the local database, then apply remotely only after reviewing the migration.
\n\nMigration 0002 adds:\n- `device_identities`: public-key records with digest-derived anonymous subjects.\n- `device_challenges`: short-lived, one-use challenges consumed atomically after ECDSA proof verification.\n\nThe identity endpoints are internal-only and require `SKILLS_API_TOKEN`. The browser must call Katia Brain, which proxies requests server-to-server. Never expose the API token or HMAC identity secret to browser code.