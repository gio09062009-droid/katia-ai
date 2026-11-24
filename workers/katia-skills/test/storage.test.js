import test from "node:test";
import assert from "node:assert/strict";
import { storeSkillPackage, readSkillPackage } from "../src/storage.js";
import { hashSkillFiles } from "../src/github.js";

function memoryBucket() {
  const objects = new Map();
  return {
    objects,
    async head(key) {
      const item = objects.get(key);
      return item ? { size: new TextEncoder().encode(item.body).byteLength, customMetadata: item.customMetadata } : null;
    },
    async put(key, body, options) {
      const customMetadata = options?.customMetadata || {};
      objects.set(key, { body: String(body), customMetadata });
      return { size: new TextEncoder().encode(String(body)).byteLength };
    },
    async get(key) {
      const item = objects.get(key);
      if (!item) return null;
      return {
        size: new TextEncoder().encode(item.body).byteLength,
        async text() { return item.body; }
      };
    }
  };
}

const files = [
  { path: "katia.skill.json", content: '{"id":"sample-skill","version":"1.0.0"}' },
  { path: "instructions/skill.md", content: "# Sample Skill\nExplain topics clearly." }
];

async function inputFor(filesValue = files) {
  return {
    skillId: "sample-skill",
    version: "1.0.0",
    packageSha256: await hashSkillFiles(filesValue),
    files: filesValue
  };
}

test("stores package at a content-addressed immutable R2 key", async () => {
  const bucket = memoryBucket();
  const input = await inputFor();
  const result = await storeSkillPackage(bucket, input);
  assert.equal(result.created, true);
  assert.match(result.key, /^skills\/sample-skill\/1\.0\.0\/[a-f0-9]{64}\.json$/);
});

test("does not rewrite an already stored identical package", async () => {
  const bucket = memoryBucket();
  const input = await inputFor();
  const first = await storeSkillPackage(bucket, input);
  const second = await storeSkillPackage(bucket, input);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(bucket.objects.size, 1);
});

test("rejects a digest that does not match the files", async () => {
  await assert.rejects(
    () => storeSkillPackage(memoryBucket(), {
      skillId: "sample-skill", version: "1.0.0",
      packageSha256: "a".repeat(64), files
    }),
    /no coincide/
  );
});

test("reads and verifies stored package contents", async () => {
  const bucket = memoryBucket();
  const input = await inputFor();
  await storeSkillPackage(bucket, input);
  const loaded = await readSkillPackage(bucket, input);
  assert.equal(loaded.packageSha256, input.packageSha256);
  assert.deepEqual(loaded.files, [...files].sort((a, b) => a.path.localeCompare(b.path)));
});

test("rejects tampered R2 package contents", async () => {
  const bucket = memoryBucket();
  const input = await inputFor();
  const stored = await storeSkillPackage(bucket, input);
  const item = bucket.objects.get(stored.key);
  const tampered = JSON.parse(item.body);
  tampered.files[1].content = "changed after storage";
  item.body = JSON.stringify(tampered);
  await assert.rejects(() => readSkillPackage(bucket, input), /SHA-256/);
});

test("returns null for an unknown package key", async () => {
  const bucket = memoryBucket();
  const input = await inputFor();
  assert.equal(await readSkillPackage(bucket, input), null);
});
