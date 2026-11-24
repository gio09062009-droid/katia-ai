import test from "node:test";
import assert from "node:assert/strict";
import { registerSkillVersion, recordApprovedInstall } from "../src/registry.js";

function makeDb({ existing = null } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      return {
        sql,
        values: [],
        bind(...values) {
          this.values = values;
          return this;
        },
        async first() {
          calls.push({ kind: "first", sql: this.sql, values: this.values });
          return existing;
        },
        async run() {
          calls.push({ kind: "run", sql: this.sql, values: this.values });
          return { success: true };
        }
      };
    },
    async batch(statements) {
      calls.push({
        kind: "batch",
        statements: statements.map(statement => ({ sql: statement.sql, values: statement.values }))
      });
      return [{ success: true }, { success: true }];
    }
  };
}

const validVersion = {
  skillId: "sample-skill",
  version: "1.0.0",
  sourceOwner: "katia-test",
  sourceRepo: "sample-skill",
  sourceRef: "main",
  sourceCommitSha: "a".repeat(40),
  packageSha256: "b".repeat(64),
  manifest: { id: "sample-skill", version: "1.0.0" }
};

test("registers immutable version metadata", async () => {
  const db = makeDb();
  const result = await registerSkillVersion(db, validVersion);
  assert.deepEqual(result, { created: true, skillId: "sample-skill", version: "1.0.0" });
  assert.equal(db.calls.length, 2);
  assert.equal(db.calls[1].kind, "run");
  assert.match(db.calls[1].sql, /INSERT INTO skill_versions/);
});

test("same immutable version is idempotent when commit and digest match", async () => {
  const manifestJson = JSON.stringify(validVersion.manifest);
  const db = makeDb({ existing: {
    source_commit_sha: validVersion.sourceCommitSha,
    package_sha256: validVersion.packageSha256,
    manifest_json: manifestJson
  } });
  const result = await registerSkillVersion(db, validVersion);
  assert.equal(result.created, false);
  assert.equal(db.calls.length, 1);
});

test("rejects attempts to replace an existing immutable version", async () => {
  const db = makeDb({ existing: {
    source_commit_sha: "c".repeat(40),
    package_sha256: validVersion.packageSha256,
    manifest_json: JSON.stringify(validVersion.manifest)
  } });
  await assert.rejects(() => registerSkillVersion(db, validVersion), /versión inmutable/);
});

test("rejects malformed commit and package digests", async () => {
  await assert.rejects(
    () => registerSkillVersion(makeDb(), { ...validVersion, sourceCommitSha: "latest" }),
    /huella/
  );
  await assert.rejects(
    () => registerSkillVersion(makeDb(), { ...validVersion, packageSha256: "not-a-digest" }),
    /huella/
  );
});

test("records approved installation disabled with only the authenticated subject", async () => {
  const db = makeDb();
  const result = await recordApprovedInstall(db, {
    authenticatedUserId: "katia-user-subject-123",
    skillId: "sample-skill",
    version: "1.0.0",
    eventId: "audit-event-001",
    requestedPermissions: ["files.read", "documents.create"],
    grantedPermissions: ["files.read"]
  });
  assert.deepEqual(result, {
    installed: true, enabled: false, skillId: "sample-skill", version: "1.0.0"
  });
  assert.equal(db.calls.length, 1);
  assert.equal(db.calls[0].kind, "batch");
  assert.equal(db.calls[0].statements.length, 2);
  assert.match(db.calls[0].statements[0].sql, /'disabled'/);
  assert.equal(db.calls[0].statements[0].values[0], "katia-user-subject-123");
  assert.equal(db.calls[0].statements[1].values[1], "katia-user-subject-123");
});

test("rejects permission escalation beyond the requested permission set", async () => {
  const db = makeDb();
  await assert.rejects(() => recordApprovedInstall(db, {
    authenticatedUserId: "trusted-subject",
    skillId: "sample-skill",
    version: "1.0.0",
    eventId: "audit-event-002",
    requestedPermissions: ["files.read"],
    grantedPermissions: ["files.read", "files.write"]
  }), /no se pueden conceder permisos/i);
  assert.equal(db.calls.length, 0);
});

test("rejects a missing authenticated subject instead of accepting browser identity", async () => {
  const db = makeDb();
  await assert.rejects(() => recordApprovedInstall(db, {
    userId: "browser-controlled-user",
    skillId: "sample-skill",
    version: "1.0.0",
    eventId: "audit-event-003",
    requestedPermissions: [],
    grantedPermissions: []
  }), /identidad autenticada/i);
  assert.equal(db.calls.length, 0);
});

test("rejects duplicate and malformed permissions", async () => {
  await assert.rejects(() => recordApprovedInstall(makeDb(), {
    authenticatedUserId: "trusted-subject",
    skillId: "sample-skill",
    version: "1.0.0",
    eventId: "audit-event-004",
    requestedPermissions: ["files.read", "files.read"],
    grantedPermissions: ["files.read"]
  }), /permisos solicitados inválidos/i);
});
