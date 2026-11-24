# Katia Skills Worker

This is an isolated Cloudflare Worker. It does not replace `katia-braine`. Version 1 is deployed with D1; version 2 contains the latest tested code and is staged but not deployed.

## Internal API

All non-health routes require the server-side `SKILLS_API_TOKEN`. Browser origins are denied unless explicitly allowlisted; the default configuration allows none. User-scoped routes additionally require a short-lived HMAC identity assertion signed by Katia Brain using a separate shared secret.

- `GET /health` — reports whether the D1 binding is present.\n- `POST /v1/identity/challenge` — internal Brain-only endpoint that creates a five-minute one-use challenge bound to a supplied P-256 public key.\n- `POST /v1/identity/verify` — internal Brain-only endpoint that verifies an ECDSA proof, atomically consumes the challenge, and returns a digest-derived anonymous device subject. The browser must never call these routes directly or receive the internal API token.
- `POST /v1/skills/analyze` — accepts `{"owner":"OWNER","repo":"REPOSITORY","ref":"main"}`, reads a bounded GitHub repository and validates its declarative Skill package. Returns an immutable commit SHA and package digest; does not install or execute the package.
- `POST /v1/skills/register` — requires `approved: true`, the previously analyzed commit SHA and package digest. Re-fetches that exact commit, revalidates it, then registers immutable metadata in D1. If R2 is configured, it also stores a content-addressed package snapshot there; without R2, the exact GitHub commit and SHA-256 digest remain the package source. Packages with warnings or validation errors are not automatically registered.
- `GET /v1/skills/catalog` — lists registered immutable Skill versions and their manifests for authenticated server-to-server callers.
- `GET /v1/skills/package/:skillId/:version` — re-fetches the exact pinned Git commit, recalculates SHA-256, revalidates the declarative package, and returns its bounded text files only when the stored digest matches.
- `GET /v1/skills/installed` — lists installs for the authenticated subject inside the signed `X-Katia-Identity` assertion.
- `POST /v1/skills/install` — records an explicitly approved install. Requested permissions must exactly match the stored manifest; granted permissions must be a subset. New installs start disabled.
- `POST /v1/skills/status` — enables or disables an installed Skill for the authenticated subject and records the change in the audit log.

User-scoped routes accept only `X-Katia-Identity`: a short-lived HMAC-SHA256 assertion with issuer `katia-braine`, audience `katia-skills`, subject, `skills:user` scope, issue/expiry timestamps (maximum five-minute lifetime), and a unique token ID. The separate `KATIA_IDENTITY_SECRET` must be shared only between the two Workers. `X-Katia-User-Id` is ignored and never trusted. Katia Brain verifies the browser's one-use P-256 proof before it signs an assertion. The browser never receives the internal token or HMAC assertion.

## Storage

- D1 database: `katia-skills-registry`, bound as `DB` in `wrangler.toml`.
- D1 tables: `skill_versions`, `user_skill_installs`, `skill_audit_events`, `device_identities`, and `device_challenges`. Migration 0002 has been applied to the connected database.
- `src/storage.js` implements optional content-addressed immutable R2 storage and verifies SHA-256 on reads.
- No-billing development mode: D1 stores the immutable GitHub owner/repository/commit and package digest. R2 is optional and can be enabled later; registration does not require a payment method or R2 subscription.

## Local checks

Requires Node.js 20 or newer:

```sh
npm test
```

## Worker secrets

Before activation, configure a strong random `SKILLS_API_TOKEN` and a separate random `KATIA_IDENTITY_SECRET` (at least 32 bytes) on this Worker. Katia Brain must receive the matching values as Worker secrets. Neither secret may be sent to the browser. Never expose either secret in browser code. Configure the API token as follows:

```sh
npx wrangler secret put SKILLS_API_TOKEN
npx wrangler secret put KATIA_IDENTITY_SECRET
```

`KATIA_IDENTITY_SECRET` must be a separate random secret of at least 32 bytes. The same value is used only by the Brain and Skills Workers to sign and verify short-lived assertions after the browser proof is validated.

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
- Skills Worker version 1 is deployed; version 2 is staged pending secret configuration and final integration checks.\n- The live Katia Brain and GitHub Pages site have not been updated with the staged runtime.


## Runtime design proposal

The secure Skill selection and runtime flow is documented in [`docs/SKILL_RUNTIME_DESIGN.md`](./docs/SKILL_RUNTIME_DESIGN.md). It is design-only: Brain does not yet select or inject Skills into live chats, and no Skill instruction is currently executed.

## Device identity proposal

A privacy-preserving anonymous device identity is documented in [`docs/DEVICE_IDENTITY_DESIGN.md`](./docs/DEVICE_IDENTITY_DESIGN.md). The Skills Worker now contains isolated challenge/proof endpoints. Each one-use challenge stores a SHA-256 context hash for the exact requested action and payload; the proof cannot be reused for a different operation. Migration 0002 creates the anonymous device identity and challenge tables. The Brain proxy and browser IndexedDB client are being developed on the same feature branch. None of these changes are deployed or enabled.
\n\n## Current activation blocker\n\nThe four Worker secret bindings (`SKILLS_API_TOKEN` and `KATIA_IDENTITY_SECRET` on Skills; `KATIA_SKILLS_API_TOKEN` and `KATIA_IDENTITY_SECRET` on Brain) are not configured. The deployment tool rejected the automated secret-write operation, so no secrets were created. Add them through Cloudflare's Worker settings before deploying the staged versions.\n