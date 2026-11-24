import test from "node:test";
import assert from "node:assert/strict";
import { createKatiaIdentityAssertion } from "../../katia-braine/src/identity-assertion.js";
import { verifyKatiaIdentity } from "../src/identity.js";

const secret = "test-identity-secret-with-at-least-32-bytes";

function requestWith(token) {
  return new Request("https://skills.example/v1/skills/installed", {
    headers: { "X-Katia-Identity": token }
  });
}

test("Brain signer creates a short-lived assertion accepted by Skills verifier", async () => {
  const token = await createKatiaIdentityAssertion("device:abc_DEF-123", secret, 2_000_000_000);
  assert.equal(
    await verifyKatiaIdentity(requestWith(token), { KATIA_IDENTITY_SECRET: secret }, 2_000_000_010),
    "device:abc_DEF-123"
  );
});

test("Brain signer rejects invalid subjects and weak secrets", async () => {
  await assert.rejects(() => createKatiaIdentityAssertion("browser-controlled id", secret));
  await assert.rejects(() => createKatiaIdentityAssertion("device:valid-subject", "short"));
});
