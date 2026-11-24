import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { hashSkillFiles } from "../src/github.js";

const API_TOKEN = "catalog-test-secret";
const manifest = {
  manifest_version: "1.0",
  id: "catalog-skill",
  name: "Catalog Skill",
  version: "1.2.0",
  description: "A safe catalog package for the worker integration tests.",
  publisher: { name: "Katia Tests" },
  capabilities: ["conversation.explain"],
  permissions: [],
  entrypoint: { type: "declarative", path: "instructions/skill.md" }
};
const files = [
  { path: "katia.skill.json", content: JSON.stringify(manifest) },
  { path: "instructions/skill.md", content: "# Catalog Skill\nExplain concepts clearly." }
];

function db() {
  const row = {
    skill_id: "catalog-skill",
    version: "1.2.0",
    source_owner: "katia-tests",
    source_repo: "catalog-skill",
    source_ref: "main",
    source_commit_sha: "a".repeat(40),
    manifest_json: JSON.stringify(manifest),
    package_sha256: "",
    created_at: "2026-11-24T00:00:00Z"
  };
  return {
    prepare(sql) {
      return {
        values: [],
        bind(...values) { this.values = values; return this; },
        async all() { return { results: [row] }; },
        async first() {
          if (sql.includes("WHERE skill_id = ? AND version = ?")) {
            return this.values[0] === row.skill_id && this.values[1] === row.version ? row : null;
          }
          return null;
        }
      };
    }
  };
}

function authorizedRequest(path) {
  return new Request("https://skills.example" + path, {
    headers: { Authorization: "Bearer " + API_TOKEN }
  });
}

test("catalog endpoint requires the internal API token", async () => {
  const response = await worker.fetch(new Request("https://skills.example/v1/skills/catalog"), {
    DB: db(), SKILLS_API_TOKEN: API_TOKEN
  });
  assert.equal(response.status, 401);
});

test("catalog endpoint returns only registered immutable metadata", async () => {
  const database = db();
  const response = await worker.fetch(authorizedRequest("/v1/skills/catalog"), {
    DB: database, SKILLS_API_TOKEN: API_TOKEN
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.count, 1);
  assert.equal(body.skills[0].skillId, "catalog-skill");
  assert.equal(body.skills[0].source.commitSha, "a".repeat(40));
});

test("package endpoint re-fetches the pinned commit and verifies its digest", async () => {
  const originalFetch = globalThis.fetch;
  const digest = await hashSkillFiles(files);
  const database = db();
  const row = {
    skill_id: "catalog-skill",
    version: "1.2.0",
    source_owner: "katia-tests",
    source_repo: "catalog-skill",
    source_ref: "main",
    source_commit_sha: "a".repeat(40),
    manifest_json: JSON.stringify(manifest),
    package_sha256: digest,
    created_at: "2026-11-24T00:00:00Z"
  };
  const originalPrepare = database.prepare;
  database.prepare = sql => {
    const statement = originalPrepare(sql);
    statement.first = async () => row;
    return statement;
  };
  const blobIds = { "katia.skill.json": "manifest-blob", "instructions/skill.md": "instructions-blob" };
  globalThis.fetch = async url => {
    const value = String(url);
    if (value.endsWith("/commits/" + "a".repeat(40))) {
      return new Response(JSON.stringify({ sha: "a".repeat(40), commit: { tree: { sha: "b".repeat(40) } } }));
    }
    if (value.includes("/git/trees/")) {
      return new Response(JSON.stringify({
        truncated: false,
        tree: files.map(file => ({
          path: file.path, type: "blob",
          size: new TextEncoder().encode(file.content).length,
          sha: blobIds[file.path]
        }))
      }));
    }
    for (const file of files) {
      if (value.endsWith("/git/blobs/" + blobIds[file.path])) {
        return new Response(JSON.stringify({
          encoding: "base64",
          content: btoa(file.content)
        }));
      }
    }
    return new Response("not found", { status: 404 });
  };

  try {
    const response = await worker.fetch(authorizedRequest("/v1/skills/package/catalog-skill/1.2.0"), {
      DB: database, SKILLS_API_TOKEN: API_TOKEN
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.packageSha256, digest);
    assert.equal(body.files.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("package endpoint rejects unregistered versions", async () => {
  const database = {
    prepare() {
      return { bind() { return this; }, async first() { return null; } };
    }
  };
  const response = await worker.fetch(authorizedRequest("/v1/skills/package/catalog-skill/1.2.0"), {
    DB: database, SKILLS_API_TOKEN: API_TOKEN
  });
  assert.equal(response.status, 404);
});
