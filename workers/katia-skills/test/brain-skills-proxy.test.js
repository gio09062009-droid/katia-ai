import test from "node:test";
import assert from "node:assert/strict";
import { handleSkillsRoute } from "../../katia-braine/src/skills-proxy.js";
import { verifyKatiaIdentity } from "../src/identity.js";

const secret = "test-identity-secret-with-at-least-32-bytes";
const token = "test-skills-api-token-with-more-than-24";
const base = "https://katia-skills.example";

function env(overrides = {}) {
  return {
    KATIA_SKILLS_URL: base,
    KATIA_SKILLS_API_TOKEN: token,
    KATIA_IDENTITY_SECRET: secret,
    CHAT_RATE_LIMITER: { async limit() { return { success: true }; } },
    ...overrides
  };
}

function respond(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function request(path, method = "POST", body = {}) {
  return new Request("https://katia-braine.example" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.5"
    },
    body: method === "GET" ? undefined : JSON.stringify(body)
  });
}

test("identity challenge is proxied server-to-server without exposing the API token", async () => {
  const originalFetch = globalThis.fetch;
  let received;
  globalThis.fetch = async (url, options) => {
    received = { url: String(url), options };
    return new Response(JSON.stringify({
      ok: true, challengeId: "challenge-1234567890123456",
      nonce: "nonce", message: "katia-skills-device-v1:challenge:nonce",
      expiresAt: 2_000_000_300
    }), { status: 201 });
  };
  try {
    const response = await handleSkillsRoute(
      request("/identity/challenge", "POST", { publicKeySpki: "public-key-data" }),
      env(), "/identity/challenge", respond
    );
    assert.equal(response.status, 201);
    assert.equal(received.url, base + "/v1/identity/challenge");
    assert.equal(received.options.headers.Authorization, "Bearer " + token);
    assert.equal(JSON.parse(received.options.body).publicKeySpki, "public-key-data");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("installed Skills request verifies device proof and forwards only a Brain assertion", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/v1/identity/verify")) {
      return new Response(JSON.stringify({ ok: true, subject: "device:" + "A".repeat(43) }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true, skills: [] }), { status: 200 });
  };
  try {
    const response = await handleSkillsRoute(
      request("/skills/installed", "POST", {
        deviceProof: {
          challengeId: "challenge-1234567890123456",
          publicKeySpki: "public-key-data",
          signature: "signature-data"
        }
      }),
      env(), "/skills/installed", respond
    );
    assert.equal(response.status, 200);
    const responseBody = await response.json();
    assert.equal(responseBody.ok, true);
    assert.equal(calls.length, 2);
    assert.ok(calls[0].url.endsWith("/v1/identity/verify"));
    assert.ok(calls[1].url.endsWith("/v1/skills/installed"));
    assert.equal(calls[1].options.method, "GET");
    assert.equal(calls[1].options.headers.Authorization, "Bearer " + token);
    const assertion = calls[1].options.headers["X-Katia-Identity"];
    assert.equal(typeof assertion, "string");
    assert.equal(
      await verifyKatiaIdentity(new Request("https://skills.example", {
        headers: { "X-Katia-Identity": assertion }
      }), { KATIA_IDENTITY_SECRET: secret }),
      "device:" + "A".repeat(43)
    );
    assert.equal(JSON.stringify(responseBody).includes(assertion), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("registration requires explicit approval before any upstream call", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response("{}", { status: 200 });
  };
  try {
    const response = await handleSkillsRoute(
      request("/skills/register", "POST", { approved: false }),
      env(), "/skills/register", respond
    );
    assert.equal(response.status, 400);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("unknown routes are not handled by the Skills proxy", async () => {
  const result = await handleSkillsRoute(request("/not-a-skills-route"), env(), "/not-a-skills-route", respond);
  assert.equal(result, null);
});

test("Skills proxy fails closed when the rate limiter is unavailable", async () => {
  const response = await handleSkillsRoute(
    request("/identity/challenge", "POST", { publicKeySpki: "public-key-data" }),
    env({ CHAT_RATE_LIMITER: undefined }), "/identity/challenge", respond
  );
  assert.equal(response.status, 429);
});
