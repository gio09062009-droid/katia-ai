import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const env = { SKILLS_API_TOKEN: "test-secret", ALLOWED_ORIGINS: "", DB: registryDb() };

test("health endpoint reports the isolated service", async () => {
  const response = await worker.fetch(new Request("https://skills.example/health"), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.service, "katia-skills");
  assert.equal(body.status, "d1-connected");
});

test("unknown routes return 404", async () => {
  const response = await worker.fetch(new Request("https://skills.example/not-real"), env);
  assert.equal(response.status, 404);
});

test("analyze endpoint rejects missing credentials", async () => {
  const response = await worker.fetch(new Request("https://skills.example/v1/skills/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ owner: "octocat", repo: "hello" })
  }), env);
  assert.equal(response.status, 401);
});

test("analyze endpoint refuses to run without server secret configuration", async () => {
  const response = await worker.fetch(new Request("https://skills.example/v1/skills/analyze", {
    method: "POST",
    body: "{}"
  }), {});
  assert.equal(response.status, 503);
});

test("browser origins are denied unless explicitly allowlisted", async () => {
  const response = await worker.fetch(new Request("https://skills.example/health", {
    headers: { Origin: "https://untrusted.example" }
  }), env);
  assert.equal(response.status, 403);
});

test("declared oversized request is rejected before JSON parsing", async () => {
  const response = await worker.fetch(new Request("https://skills.example/v1/skills/analyze", {
    method: "POST",
    headers: {
      "Authorization": "Bearer test-secret",
      "Content-Length": "9000"
    },
    body: "{}"
  }), env);
  assert.equal(response.status, 413);
});

test("analyze endpoint returns a validated report pinned to a commit and digest", async () => {
  const originalFetch = globalThis.fetch;
  const manifest = {
    manifest_version: "1.0",
    id: "sample-skill",
    name: "Sample Skill",
    version: "1.0.0",
    description: "A safe sample package used for the Worker integration test.",
    publisher: { name: "Katia Test" },
    capabilities: ["conversation.explain"],
    permissions: [],
    entrypoint: { type: "declarative", path: "instructions/skill.md" }
  };
  const contents = {
    "katia.skill.json": JSON.stringify(manifest),
    "instructions/skill.md": "# Sample Skill\\nExplain the topic in plain language."
  };
  const blobIds = {
    "katia.skill.json": "blobmanifest",
    "instructions/skill.md": "blobinstructions"
  };
  globalThis.fetch = async url => {
    const value = String(url);
    if (value.endsWith("/commits/main")) {
      return new Response(JSON.stringify({
        sha: "a".repeat(40),
        commit: { tree: { sha: "b".repeat(40) } }
      }), { status: 200 });
    }
    if (value.includes("/git/trees/") && value.includes("?recursive=1")) {
      return new Response(JSON.stringify({
        truncated: false,
        tree: Object.entries(contents).map(([path, content]) => ({
          path, type: "blob", size: new TextEncoder().encode(content).length,
          sha: blobIds[path]
        }))
      }), { status: 200 });
    }
    for (const [path, content] of Object.entries(contents)) {
      if (value.endsWith("/git/blobs/" + blobIds[path])) {
        return new Response(JSON.stringify({
          encoding: "base64",
          content: btoa(content)
        }), { status: 200 });
      }
    }
    return new Response("not found", { status: 404 });
  };

  try {
    const response = await worker.fetch(new Request("https://skills.example/v1/skills/analyze", {
      method: "POST",
      headers: {
        "Authorization": "Bearer test-secret",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ owner: "katia-test", repo: "sample-skill" })
    }), env);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.analysis.status, "valid");
    assert.equal(body.repository.commitSha, "a".repeat(40));
    assert.match(body.package.sha256, /^[a-f0-9]{64}$/);
    assert.equal(body.package.fileCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


function registryDb() {
  const manifest = {
    id: "sample-skill",
    version: "1.0.0",
    permissions: ["files.read"]
  };
  return {
    async batch(statements) {
      return statements.map(() => ({ success: true }));
    },
    prepare(sql) {
      return {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          if (this.sql.includes("SELECT manifest_json")) {
            return { manifest_json: JSON.stringify(manifest) };
          }
          if (this.sql.includes("SELECT 1 AS installed")) return { installed: 1 };
          return null;
        },
        async all() {
          return { results: [{
            skill_id: "sample-skill",
            version: "1.0.0",
            status: "disabled",
            requested_permissions_json: '["files.read"]',
            granted_permissions_json: '["files.read"]',
            installed_at: "2026-11-24T00:00:00Z",
            updated_at: "2026-11-24T00:00:00Z",
            manifest_json: JSON.stringify(manifest),
            package_sha256: "b".repeat(64)
          }] };
        },
        async run() {
          return { success: true, meta: { changes: 1 } };
        }
      };
    }
  };
}

test("installed Skills endpoint requires the trusted Brain user identity", async () => {
  const response = await worker.fetch(new Request("https://skills.example/v1/skills/installed", {
    headers: { Authorization: "Bearer test-secret" }
  }), { ...env, DB: registryDb() });
  assert.equal(response.status, 401);
});

test("installed Skills endpoint returns only the user-scoped registry", async () => {
  const response = await worker.fetch(new Request("https://skills.example/v1/skills/installed", {
    headers: {
      Authorization: "Bearer test-secret",
      "X-Katia-User-Id": "authenticated-user-01"
    }
  }), { ...env, DB: registryDb() });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.skills.length, 1);
  assert.equal(body.skills[0].skillId, "sample-skill");
});

test("install endpoint requires explicit approval and records disabled install", async () => {
  const response = await worker.fetch(new Request("https://skills.example/v1/skills/install", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-secret",
      "X-Katia-User-Id": "authenticated-user-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      skillId: "sample-skill",
      version: "1.0.0",
      approvalEventId: "approval-event-01",
      installedEventId: "installed-event-01",
      approved: true,
      requestedPermissions: ["files.read"],
      grantedPermissions: ["files.read"]
    })
  }), { ...env, DB: registryDb() });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.installed, true);
  assert.equal(body.enabled, false);
});

test("status endpoint requires the authenticated Brain identity", async () => {
  const response = await worker.fetch(new Request("https://skills.example/v1/skills/status", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-secret",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ skillId: "sample-skill", status: "enabled", eventId: "status-event-01" })
  }), { ...env, DB: registryDb() });
  assert.equal(response.status, 401);
});

test("status endpoint enables an installed Skill for the authenticated user", async () => {
  const response = await worker.fetch(new Request("https://skills.example/v1/skills/status", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-secret",
      "X-Katia-User-Id": "authenticated-user-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ skillId: "sample-skill", status: "enabled", eventId: "status-event-02" })
  }), { ...env, DB: registryDb() });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "enabled");
});
