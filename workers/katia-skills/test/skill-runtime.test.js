import test from "node:test";
import assert from "node:assert/strict";
import { buildSkillsRuntimeContext } from "../../katia-braine/src/skill-runtime.js";

test("chat Skill runtime does not load anything without a device proof", async () => {
  const context = await buildSkillsRuntimeContext(
    {},
    null,
    { task: "chat", messages: [{ role: "user", content: "Explicame qué es una variable." }] }
  );
  assert.equal(context, "");
});

test("chat Skill runtime stays idle when the request has no clear capability match", async () => {
  const context = await buildSkillsRuntimeContext(
    {},
    { challengeId: "not-used" },
    { task: "chat", messages: [{ role: "user", content: "Hola Katia" }] }
  );
  assert.equal(context, "");
});

test("chat runtime loads only a verified enabled Skill entrypoint", async () => {
  const originalFetch = globalThis.fetch;
  const subject = "device:" + "A".repeat(43);
  const installed = [{
    skillId: "hello-world",
    version: "1.0.0",
    status: "enabled",
    manifest: {
      capabilities: ["conversation.explain"],
      permissions: [],
      entrypoint: { type: "declarative", path: "instructions/skill.md" }
    },
    grantedPermissions: [],
    packageSha256: "a".repeat(64)
  }];
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const target = new URL(url);
    calls.push({ path: target.pathname, method: options.method || "GET", headers: options.headers || {} });
    if (target.pathname === "/v1/identity/verify") {
      return new Response(JSON.stringify({ ok: true, subject }), { status: 200 });
    }
    if (target.pathname === "/v1/skills/installed") {
      return new Response(JSON.stringify({ ok: true, skills: installed }), { status: 200 });
    }
    if (target.pathname === "/v1/skills/package/hello-world/1.0.0") {
      return new Response(JSON.stringify({
        ok: true,
        packageSha256: "a".repeat(64),
        files: [{
          path: "instructions/skill.md",
          content: "Answer in the user's language. Keep the explanation clear."
        }]
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: false }), { status: 404 });
  };

  try {
    const context = await buildSkillsRuntimeContext({
      KATIA_SKILLS_URL: "https://skills.example",
      KATIA_SKILLS_API_TOKEN: "test-token-".repeat(5),
      KATIA_IDENTITY_SECRET: "test-identity-secret-".repeat(3)
    }, {
      challengeId: "challenge_123456789012345678",
      publicKeySpki: "public-key",
      signature: "signature"
    }, {
      task: "chat",
      messages: [{ role: "user", content: "Explicame qué es una variable." }]
    });

    assert.match(context, /BEGIN_UNTRUSTED_KATIA_SKILL_DATA/);
    assert.match(context, /Answer in the user's language/);
    assert.equal(calls.some(call => call.path === "/v1/identity/verify"), true);
    assert.equal(calls.some(call => call.path === "/v1/skills/installed"), true);
    assert.equal(calls.some(call => call.path === "/v1/skills/package/hello-world/1.0.0"), true);
    const installedCall = calls.find(call => call.path === "/v1/skills/installed");
    assert.equal(typeof installedCall.headers["X-Katia-Identity"], "string");
    assert.equal(installedCall.headers.Authorization.startsWith("Bearer "), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
