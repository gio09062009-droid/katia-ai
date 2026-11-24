# Katia Brain — Skills proxy integration

This directory contains source modules for the existing Katia Brain Worker. The deployed Worker is currently maintained in Cloudflare and is not yet imported from this repository.

## Modules
- `src/identity-assertion.js`: signs short-lived HMAC assertions for server-to-server use only.
- `src/skills-proxy.js`: validates device-bound actions, applies the existing CHAT_RATE_LIMITER binding, and proxies approved Skills operations to the isolated Katia Skills Worker.

## Required Brain bindings/secrets before activation
- `CHAT_RATE_LIMITER`: existing Cloudflare rate-limiting binding.
- `KATIA_SKILLS_URL`: HTTPS URL of the deployed Katia Skills Worker.
- `KATIA_SKILLS_API_TOKEN`: secret shared only with the Skills Worker.
- `KATIA_IDENTITY_SECRET`: HMAC secret shared only with the Skills Worker.

The Skills API token and HMAC assertions must never be returned to browser JavaScript. The browser holds only a non-exportable P-256 key in IndexedDB and signs one-use, action-bound challenges.

## Brain routes owned by the proxy
- `POST /identity/challenge`
- `GET /skills/catalog`
- `POST /skills/analyze`
- `GET /skills/package/:skillId/:version`
- `POST /skills/installed`
- `POST /skills/register`
- `POST /skills/install`
- `POST /skills/status`

The deployed Brain Worker has not been modified by these source modules yet. Do not publish until the proxy is integrated, secrets are configured on both Workers, D1 migration 0002 is applied, and end-to-end tests pass.
