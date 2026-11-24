# Katia Brain — Skills integration

This directory contains the Brain-side modules staged for the existing Katia Brain Worker. The original chat, Tutor, document, video, and provider behavior remains preserved in the staged Worker source.

## Modules
- `src/identity-assertion.js`: signs short-lived HMAC assertions inside Brain only.
- `src/skills-proxy.js`: rate-limits and proxies requests to the isolated Skills Worker; verifies one-use device proofs before user-scoped actions.
- `src/skill-selector.js`: conservatively maps clear user intent to Skill capabilities and prefers the least-privileged enabled Skill.
- `src/skill-runtime.js`: loads only enabled, user-installed Skills, re-fetches immutable packages, checks their digest, and passes only the manifest entrypoint as untrusted reference data.

## Chat integration

The staged Brain version verifies a one-use proof for the read-only installed-Skills lookup, derives the device identity from the verified P-256 public key, and signs a short-lived internal assertion. It then:
1. Reads Skills installed for that device.
2. Selects at most three enabled Skills that match a clear capability.
3. Prefers fewer granted permissions.
4. Re-fetches the immutable package and checks its registered SHA-256 digest.
5. Adds only the declared entrypoint to the existing untrusted reference context.

A missing proof, unavailable service, or package error never blocks normal chat. Skill text is reference data, not executable code or privileged instructions. The first version does not execute arbitrary Skill code or grant permissions to tools.

## Required Brain bindings/secrets before activation
- `CHAT_RATE_LIMITER`: existing Cloudflare rate-limiting binding.
- `KATIA_SKILLS_URL`: HTTPS URL of the Skills Worker.
- `KATIA_SKILLS_API_TOKEN`: secret shared only with the Skills Worker.
- `KATIA_IDENTITY_SECRET`: HMAC secret shared only with the Skills Worker.

The Skills API token and HMAC assertions must never be returned to browser JavaScript. The browser stores a non-exportable P-256 private key in IndexedDB and exports only its public key.

## Brain routes owned by the proxy
- `POST /identity/challenge`
- `GET /skills/catalog`
- `POST /skills/analyze`
- `GET /skills/package/:skillId/:version`
- `POST /skills/installed`
- `POST /skills/register`
- `POST /skills/install`
- `POST /skills/status`

## Deployment state (2026-11-24)
- Brain version 34 is staged in Cloudflare with the proxy and runtime modules; it is not deployed to production.
- Skills Worker version 2 is staged; version 1 is currently deployed.
- D1 migration 0002 is applied and both device identity tables are present.
- The four server-side secret bindings are not configured yet. Activation and publication are blocked until they are added and end-to-end checks pass.
- GitHub PR #2 remains the review/integration path. Do not merge or route the live website to the new runtime before validation.
