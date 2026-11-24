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
