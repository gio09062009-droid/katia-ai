# RFC: Anonymous device identity for Katia Skills

Status: **Proposed — not implemented and not enabled**

## Goal

Give Katia Skills a stable, privacy-limited subject for per-browser/device installations without pretending that the person has a Katia account. This identity is only an installation owner key; it is not authentication for payments, personal data, account recovery, or access to private user content.

## Recommended model

Use an origin-bound WebCrypto key pair:

- Algorithm: ECDSA P-256 with SHA-256.
- Generate the private key with `extractable: false`; persist the CryptoKey in IndexedDB, never localStorage.
- Export only the public key (SPKI) to register it.
- The server derives a pseudonymous subject from SHA-256(public-key-SPKI), for example `device:<base64url-digest>`.
- No name, email, phone number, IP address, or device fingerprint is part of the subject.
- No cross-device sync. Clearing browser/site data or losing the key means the device identity and its associated installs cannot be recovered. A different browser/device receives a different identity.

## Proof and token flow

1. The frontend asks Katia Brain to begin device registration or sign-in.
2. Brain asks the isolated Skills Worker for a one-time challenge. Challenge records are stored in D1 with a short expiry (5 minutes), a random nonce, the public-key digest, and a consumed flag.
3. The browser signs the challenge with its non-exportable private key and sends the public key plus signature to Brain.
4. Brain forwards the proof to Skills Worker over server-to-server HTTPS using the internal API token. The browser never receives that token or the HMAC identity secret.
5. Skills Worker validates the signature and consumes the challenge atomically (one use only). On first registration, it binds the public key to the derived subject; on later proofs it requires the same registered key.
6. Only after successful verification does Brain mint the existing short-lived HMAC assertion (`iss=katia-braine`, `aud=katia-skills`, `scope=skills:user`, maximum 5 minutes) using `KATIA_IDENTITY_SECRET`.
7. Brain uses that assertion only for server-to-server Skills calls. It must never forward it to the browser.

## Required protections

- Challenge entropy from `crypto.getRandomValues`; short expiry; one-time atomic consumption; bind challenge to the public-key digest and intended operation.
- Verify ECDSA signature server-side. Never trust a browser-provided subject or user ID.
- Enforce request-size limits, rate limits, strict CORS, HTTPS, and origin checks on the Brain-facing browser routes.
- Keep API token and HMAC secret in Worker secrets only; rotate them if exposed.
- Do not let the device key alone authorize high-impact actions. Skill installation still requires a separate explicit approval event, and a new install remains disabled.
- Add an unlink/reset path with a clear warning that local key deletion loses access to installs owned by that device.
- Document that XSS or a compromised browser session could still invoke the non-exportable key while the site is open; non-exportable does not mean immune to active page compromise.

## D1 data model (proposed)

- `device_identities`: subject, public_key_spki, public_key_sha256, created_at, last_seen_at, revoked_at.
- `device_challenges`: challenge_id, nonce, public_key_sha256, operation, expires_at, consumed_at.
- Add uniqueness constraints for subject and public-key digest. Consume challenges with a conditional update so concurrent replays cannot both succeed.

## Why not localStorage IDs or browser fingerprints?

A random ID in localStorage can be copied or edited and proves no possession of a secret. Fingerprinting is invasive, unstable, and unnecessary. A signed challenge proves possession of the registered private key while keeping the key itself on the device.

## Alternatives and tradeoffs

- **No identity:** safest and simplest, but cannot reliably scope installed Skills to a browser/device.
- **Anonymous device key (recommended):** per-browser continuity, no personal profile, but loss of browser storage means loss of that identity.
- **Real account login:** enables cross-device sync and recovery but requires a real authentication and account-recovery system; it is outside this phase.

## Release gates

Do not enable this in production until the Brain routes, D1 schema, atomic challenge-consumption tests, browser IndexedDB key persistence, ECDSA verification tests, origin/rate-limit controls, and end-to-end tests are complete. Do not modify or replace the existing chat route. Deploy the Skills Worker separately and keep the current live Brain behavior unchanged until rollback-tested.
