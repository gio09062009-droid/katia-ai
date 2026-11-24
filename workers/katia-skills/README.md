# Katia Skills Worker

This is an isolated Cloudflare Worker. It does not replace `katia-braine` and has not been deployed.

## Internal API

All non-health routes require the server-side `SKILLS_API_TOKEN`. Browser origins are denied unless explicitly allowlisted; the default configuration allows none. User-scoped routes additionally require a short-lived HMAC identity assertion signed by Katia Brain using a separate shared secret.

- `GET /health` — reports whether the D1 binding is present.
- `POST /v1/skills/analyze` — accepts `{"owner":"OWNER","repo":"REPOSITORY","ref":"main"}`, reads a bounded GitHub repository and validates its declarative Skill package. Returns an immutable commit SHA and package digest; does not install or execute the package.
- `POST /v1/skills/register` — requires `approved: true`, the previously analyzed commit SHA and package digest. Re-fetches that exact commit, revalidates it, then registers immutable metadata in D1. If R2 is configured, it also stores a content-addressed package snapshot there; without R2, the exact GitHub commit and SHA-256 digest remain the package source. Packages with warnings or validation errors are not automatically registered.
- `GET /v1/skills/catalog` — lists registered immutable Skill versions and their manifests for authenticated server-to-server callers.
- `GET /v1/skills/package/:skillId/:version` — re-fetches the exact pinned Git commit, recalculates SHA-256, revalidates the declarative package, and returns its bounded text files only when the stored digest matches.
- `GET /v1/skills/installed` — lists installs for the authenticated subject inside the signed `X-Katia-Identity` assertion.
- `POST /v1/skills/install` — records an explicitly approved install. Requested permissions must exactly match the stored manifest; granted permissions must be a subset. New installs start disabled.
- `POST /v1/skills/status` — enables or disables an installed Skill for the authenticated subject and records the change in the audit log.

User-scoped routes accept only `X-Katia-Identity`: a short-lived HMAC-SHA256 assertion with issuer `katia-braine`, audience `katia-skills`, subject, `skills:user` scope, issue/expiry timestamps (maximum five-minute lifetime), and a unique token ID. The separate `KATIA_IDENTITY_SECRET` must be shared only between the two Workers. `X-Katia-User-Id` is ignored and never trusted. The existing Brain has no general authenticated user session yet, so token issuance and Brain integration remain intentionally disabled until a trustworthy user identity exists.

## Storage

- D1 database: `katia-skills-registry`, bound as `DB` in `wrangler.toml`.
- D1 tables: `skill_versions`, `user_skill_installs`, and `skill_audit_events`.
- `src/storage.js` implements optional content-addressed immutable R2 storage and verifies SHA-256 on reads.
- No-billing development mode: D1 stores the immutable GitHub owner/repository/commit and package digest. R2 is optional and can be enabled later; registration does not require a payment method or R2 subscription.

## Local checks

Requires Node.js 20 or newer:

```sh
npm test
```

## Worker secrets

Before deployment, configure a strong random `SKILLS_API_TOKEN` and a separate random `KATIA_IDENTITY_SECRET` (at least 32 bytes) on this Worker. Katia Brain must receive the same identity secret as a Worker secret only after a verified user identity mechanism is implemented. Never expose either secret in browser code. Configure the API token as follows:

```sh
npx wrangler secret put SKILLS_API_TOKEN
npx wrangler secret put KATIA_IDENTITY_SECRET
```

`KATIA_IDENTITY_SECRET` must be a separate random secret of at least 32 bytes. The same value may be configured on Katia Brain only after Brain has a trustworthy authenticated subject to assert. Do not configure or issue identity assertions before that prerequisite is met.

Optionally configure a GitHub token to improve API rate limits:

```sh
npx wrangler secret put GITHUB_TOKEN
```

Do not place either secret in `index.html`, browser JavaScript, local storage, or the public repository. The future frontend must call Katia Brain; Brain will call this Worker server-to-server. The catalog and package endpoints are internal-only and require the server API token; they do not expose a public browser API.

## Safety and limits

- Public GitHub repositories only in this first version.
- At most 50 files, 64 KiB per file and 256 KiB total.
- Only UTF-8 Markdown, JSON and text files are read.
- Executable, binary, archive and unsupported file types are rejected.
- Repository content is untrusted data; no package code is evaluated or executed.
- Registration pins the exact Git commit and SHA-256 package digest.
- No production Worker deployment or frontend activation has occurred.
