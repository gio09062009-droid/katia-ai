import test from "node:test";
import assert from "node:assert/strict";
import { validateRepositoryInput } from "../src/github.js";

test("accepts a normal public repository", () => {
  assert.deepEqual(validateRepositoryInput({ owner: "octocat", repo: "hello-world" }), {
    owner: "octocat", repo: "hello-world", ref: "main"
  });
});

test("accepts a named branch with slashes", () => {
  assert.equal(validateRepositoryInput({ owner: "octocat", repo: "hello-world", ref: "feature/new-skill" }).ref, "feature/new-skill");
});

test("rejects owner and repository path injection", () => {
  assert.throws(() => validateRepositoryInput({ owner: "../other", repo: "hello" }));
  assert.throws(() => validateRepositoryInput({ owner: "octocat", repo: "hello/../../other" }));
});

test("rejects unsafe Git references", () => {
  assert.throws(() => validateRepositoryInput({ owner: "octocat", repo: "hello", ref: "../main" }));
  assert.throws(() => validateRepositoryInput({ owner: "octocat", repo: "hello", ref: "-main" }));
});

test("rejects non-object input", () => {
  assert.throws(() => validateRepositoryInput("octocat/hello"));
});

import { hashSkillFiles } from "../src/github.js";

test("package digest is independent of file ordering", async () => {
  const a = [
    { path: "z.md", content: "last" },
    { path: "a.md", content: "first" }
  ];
  const b = [...a].reverse();
  assert.equal(await hashSkillFiles(a), await hashSkillFiles(b));
});

test("package digest changes when file content changes", async () => {
  const a = [{ path: "a.md", content: "first" }];
  const b = [{ path: "a.md", content: "changed" }];
  assert.notEqual(await hashSkillFiles(a), await hashSkillFiles(b));
});
