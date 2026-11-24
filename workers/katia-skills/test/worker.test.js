import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const env = { SKILLS_API_TOKEN: "test-secret", ALLOWED_ORIGINS: "" };

test("health endpoint reports the isolated service", async () => {
  const response = await worker.fetch(new Request("https://skills.example/health"), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.service, "katia-skills");
  assert.equal(body.status, "foundation");
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
