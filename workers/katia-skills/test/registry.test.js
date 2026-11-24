import test from "node:test";
import assert from "node:assert/strict";
import {
  registerSkillVersion,
  recordApprovedInstall,
  listUserSkills,
  setUserSkillStatus
} from "../src/registry.js";

const manifest = {
  id: "sample-skill",
  version: "1.0.0",
  permissions: ["files.read", "documents.create"]
};

function makeDb({ firstResults = [], allResults = [], updateChanges = 1 } = {}) {
  const calls = [];
  let firstIndex = 0;
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
          return firstResults[firstIndex++] ?? null;
        },
        async all() {
          calls.push({ kind: "all", sql: this.sql, values: this.values });
          return { results: allResults };
        },
        async run() {
          calls.push({ kind: "run", sql: this.sql, values: this.values });
          return { success: true, meta: { changes: updateChanges } };
        }
      };
    },
    async batch(statements) {
      calls.push({
        kind: "batch",
        statements: statements.map(statement => ({ sql: statement.sql, values: statement.values }))
      });
      return statements.map(() => ({ success: true }));
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
  manifest
};

const installInput = {
  authenticatedUserId: "katia-user-subject-123",
  skillId: "sample-skill",
  version: "1.0.0",
  approvalEventId: "audit-approval-001",
  installedEventId: "audit-installed-001",
  approved: true,
  requestedPermissions: ["files.read", "documents.create"],
  grantedPermissions: ["files.read"]
};

test("registers immutable version metadata", async () => {
  const db = makeDb();
  const result = await registerSkillVersion(db, validVersion);
  assert.deepEqual(result, { created: true, skillId: "sample-skill", version: "1.0.0" });
  assert.equal(db.calls.length, 2);
  assert.equal(db.calls[1].kind, "run");
  assert.match(db.calls[1].sql, /INSERT INTO skill_versions/);
});

test("rejects a manifest whose identity differs from the registry key", async () => {
  await assert.rejects(
    () => registerSkillVersion(makeDb(), { ...validVersion, manifest: { ...manifest, id: "other-skill" } }),
    /no coincide/
  );
});

test("same immutable version is idempotent when commit and digest match", async () => {
  const db = makeDb({ firstResults: [{
    source_commit_sha: validVersion.sourceCommitSha,
    package_sha256: validVersion.packageSha256,
    manifest_json: JSON.stringify(validVersion.manifest)
  }] });
  const result = await registerSkillVersion(db, validVersion);
  assert.equal(result.created, false);
  assert.equal(db.calls.length, 1);
});

test("rejects attempts to replace an existing immutable version", async () => {
  const db = makeDb({ firstResults: [{
    source_commit_sha: "c".repeat(40),
    package_sha256: validVersion.packageSha256,
    manifest_json: JSON.stringify(validVersion.manifest)
  }] });
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

test("records explicitly approved installation disabled and audits both stages", async () => {
  const db = makeDb({ firstResults: [{ manifest_json: JSON.stringify(manifest) }] });
  const result = await recordApprovedInstall(db, installInput);
  assert.deepEqual(result, {
    installed: true, enabled: false, skillId: "sample-skill", version: "1.0.0"
  });
  assert.equal(db.calls.length, 2);
  assert.equal(db.calls[1].kind, "batch");
  assert.equal(db.calls[1].statements.length, 3);
  assert.match(db.calls[1].statements[0].sql, /'disabled'/);
  assert.equal(db.calls[1].statements[0].values[0], "katia-user-subject-123");
  assert.match(db.calls[1].statements[1].sql, /install_approved/);
  assert.match(db.calls[1].statements[2].sql, /installed/);
});

test("rejects installation without explicit approval", async () => {
  await assert.rejects(
    () => recordApprovedInstall(makeDb(), { ...installInput, approved: false }),
    /aprobación explícita/
  );
});

test("rejects a version that is not registered", async () => {
  await assert.rejects(
    () => recordApprovedInstall(makeDb(), installInput),
    /no está registrada/
  );
});

test("rejects permissions that differ from the registered manifest", async () => {
  const db = makeDb({ firstResults: [{ manifest_json: JSON.stringify(manifest) }] });
  await assert.rejects(
    () => recordApprovedInstall(db, { ...installInput, requestedPermissions: ["files.read"] }),
    /no coinciden/
  );
});

test("rejects permission escalation beyond the requested permission set", async () => {
  const db = makeDb({ firstResults: [{ manifest_json: JSON.stringify(manifest) }] });
  await assert.rejects(
    () => recordApprovedInstall(db, { ...installInput, grantedPermissions: ["files.read", "files.write"] }),
    /no se pueden conceder permisos/i
  );
  assert.equal(db.calls.length, 1);
});

test("rejects a missing authenticated subject instead of accepting browser identity", async () => {
  await assert.rejects(
    () => recordApprovedInstall(makeDb(), {
      userId: "browser-controlled-user",
      skillId: "sample-skill",
      version: "1.0.0",
      approvalEventId: "audit-approval-002",
      installedEventId: "audit-installed-002",
      approved: true,
      requestedPermissions: [],
      grantedPermissions: []
    }),
    /identidad autenticada/i
  );
});

test("lists only rows returned for the authenticated subject", async () => {
  const db = makeDb({ allResults: [{
    skill_id: "sample-skill",
    version: "1.0.0",
    status: "disabled",
    requested_permissions_json: '["files.read"]',
    granted_permissions_json: '["files.read"]',
    installed_at: "2026-11-24T00:00:00Z",
    updated_at: "2026-11-24T00:00:00Z",
    manifest_json: JSON.stringify({ ...manifest, name: "Sample Skill" }),
    package_sha256: "b".repeat(64)
  }] });
  const rows = await listUserSkills(db, "trusted-user");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].skillId, "sample-skill");
  assert.equal(db.calls[0].values[0], "trusted-user");
  assert.match(db.calls[0].sql, /WHERE i.user_id = \?/);
});

test("enables an installed Skill and writes an audit event", async () => {
  const db = makeDb({ firstResults: [{ installed: 1 }] });
  const result = await setUserSkillStatus(db, {
    authenticatedUserId: "trusted-user",
    skillId: "sample-skill",
    status: "enabled",
    eventId: "audit-enable-001"
  });
  assert.deepEqual(result, { skillId: "sample-skill", status: "enabled" });
  assert.equal(db.calls.length, 2);
  assert.match(db.calls[0].sql, /SELECT 1 AS installed/);
  assert.equal(db.calls[1].kind, "batch");
  assert.equal(db.calls[1].statements.length, 2);
  assert.match(db.calls[1].statements[0].sql, /UPDATE user_skill_installs/);
  assert.match(db.calls[1].statements[1].sql, /INSERT INTO skill_audit_events/);
});

test("does not enable a Skill that is not installed", async () => {
  const db = makeDb();
  await assert.rejects(
    () => setUserSkillStatus(db, {
      authenticatedUserId: "trusted-user",
      skillId: "sample-skill",
      status: "enabled",
      eventId: "audit-enable-002"
    }),
    /no está instalada/
  );
  assert.equal(db.calls.length, 1);
});
