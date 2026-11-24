import test from "node:test";
import assert from "node:assert/strict";
import { verifyKatiaIdentity, createKatiaIdentityAssertion } from "../src/identity.js";

const secret = "test-identity-secret-with-at-least-32-bytes";
const encoder = new TextEncoder();

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
}

async function signPayload(payload, signingSecret = secret) {
  const payloadPart = base64url(encoder.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadPart));
  return payloadPart + "." + base64url(new Uint8Array(signature));
}

function claims(overrides = {}, now = 2_000_000_000) {
  return {
    iss: "katia-braine",
    aud: "katia-skills",
    sub: "device-user-123",
    scope: ["skills:user"],
    iat: now,
    exp: now + 120,
    jti: "jti-test-unique-12345",
    ...overrides
  };
}

function requestWith(token) {
  return new Request("https://skills.example/v1/skills/installed", {
    headers: token ? { "X-Katia-Identity": token } : {}
  });
}

test("accepts a valid signed, short-lived Brain identity", async () => {
  const token = await signPayload(claims());
  assert.equal(await verifyKatiaIdentity(requestWith(token), { KATIA_IDENTITY_SECRET: secret }, 2_000_000_010), "device-user-123");
});

test("rejects a modified signature", async () => {
  const token = await signPayload(claims());
  const [payload, signature] = token.split(".");
  const changed = (signature[0] === "A" ? "B" : "A") + signature.slice(1);
  assert.equal(await verifyKatiaIdentity(requestWith(payload + "." + changed), { KATIA_IDENTITY_SECRET: secret }, 2_000_000_010), null);
});

test("rejects an expired assertion", async () => {
  const token = await signPayload(claims({ exp: 2_000_000_000 }));
  assert.equal(await verifyKatiaIdentity(requestWith(token), { KATIA_IDENTITY_SECRET: secret }, 2_000_000_001), null);
});

test("rejects an assertion with the wrong audience", async () => {
  const token = await signPayload(claims({ aud: "other-service" }));
  assert.equal(await verifyKatiaIdentity(requestWith(token), { KATIA_IDENTITY_SECRET: secret }, 2_000_000_010), null);
});

test("rejects an assertion with excessive lifetime", async () => {
  const token = await signPayload(claims({ exp: 2_000_000_301 }));
  assert.equal(await verifyKatiaIdentity(requestWith(token), { KATIA_IDENTITY_SECRET: secret }, 2_000_000_010), null);
});

test("rejects a missing or undersized signing secret", async () => {
  const token = await signPayload(claims());
  assert.equal(await verifyKatiaIdentity(requestWith(token), {}, 2_000_000_010), null);
  assert.equal(await verifyKatiaIdentity(requestWith(token), { KATIA_IDENTITY_SECRET: "short" }, 2_000_000_010), null);
});

test("rejects a raw browser user ID without a signed assertion", async () => {
  const request = new Request("https://skills.example/v1/skills/installed", {
    headers: { "X-Katia-User-Id": "spoofed-user" }
  });
  assert.equal(await verifyKatiaIdentity(request, { KATIA_IDENTITY_SECRET: secret }, 2_000_000_010), null);
});

test("Brain assertion signer creates a short-lived token accepted by the verifier", async () => {
  const token = await createKatiaIdentityAssertion("device:abc_DEF-123", secret, 2_000_000_000);
  assert.equal(
    await verifyKatiaIdentity(requestWith(token), { KATIA_IDENTITY_SECRET: secret }, 2_000_000_010),
    "device:abc_DEF-123"
  );
});

test("Brain assertion signer refuses invalid subjects and weak secrets", async () => {
  await assert.rejects(() => createKatiaIdentityAssertion("browser-controlled id", secret));
  await assert.rejects(() => createKatiaIdentityAssertion("device:valid-subject", "short"));
});
