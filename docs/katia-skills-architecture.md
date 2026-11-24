# Katia Skills — Initial Architecture

## Goal

Add a safe extension system without replacing or destabilizing the existing `katia-braine` Worker or chat flow.

## Components

1. **GitHub source adapter** — reads public repository metadata and bounded text files through the authorized GitHub integration.
2. **Manifest validator** — validates `katia.skill.json` against `skills/manifest.schema.json`.
3. **Package inspector** — inventories files, rejects path traversal and unsupported file types, checks declared entrypoints and dependencies, and records integrity hashes.
4. **Policy gate** — maps each requested permission to a known capability adapter. Unknown permissions are rejected.
5. **Skill registry** — stores skill ID, version, source, manifest digest, status, requested permissions, granted permissions and timestamps.
6. **Installer / lifecycle API** — supports preview, install, enable, disable, update and uninstall.
7. **Katia UI** — presents the analysis and permission explanation, then asks for explicit confirmation before installation.

## Data flow

```text
User request
   |
   v
Skill discovery (GitHub / Katia catalog)
   |
   v
Bounded package fetch
   |
   v
Manifest + file validation
   |
   v
Security and compatibility review
   |
   v
User-facing preview and permission request
   |
   | explicit approval
   v
Registry + package storage
   |
   v
Allowlisted capability adapter
```

## Storage plan

- **D1**: skill registry, versions, install state, permission grants, audit events and per-user ownership.
- **R2**: immutable package snapshots and metadata, addressed by content digest.
- **Worker**: a separate `katia-skills` service, isolated from `katia-braine`.

The current Cloudflare account inspection found no D1 database and R2 is not enabled. Create these resources only after confirming the dashboard setup and naming.

## API outline (proposed; not deployed)

- `POST /v1/skills/analyze` — inspect a repository and return a report; no installation.
- `POST /v1/skills/install` — install a previously analyzed exact revision after user approval.
- `GET /v1/skills` — list the current user's installed skills.
- `POST /v1/skills/:id/enable` — enable an installed skill within its approved permissions.
- `POST /v1/skills/:id/disable` — disable without deleting data.
- `DELETE /v1/skills/:id` — uninstall.
- `POST /v1/skills/:id/update-preview` — inspect an update before applying it.

Every endpoint must authenticate the user, authorize ownership, validate input, enforce size/time limits, and rate-limit requests. State-changing requests need CSRF/origin protection where browser cookies are used and idempotency where appropriate.

## Threat model and non-goals for v1

Treat repository content, manifests, README files and instructions as untrusted input. Never execute downloaded code, package scripts, shell commands, macros, or remote URLs embedded in a Skill. Do not allow a Skill to grant itself permissions. The user must approve the requested permissions, and high-impact actions need action-time confirmation.

V1 intentionally excludes arbitrary code execution, unrestricted network access, background device control, and automatic message sending.

## Rollout plan

1. Agree on manifest and package contract.
2. Add schema validation and deterministic package inspection tests.
3. Implement the separate Worker and D1 registry.
4. Enable R2 and add immutable package storage.
5. Connect the existing Skills UI to preview and lifecycle endpoints.
6. Run staging tests, then request review before production deployment.
