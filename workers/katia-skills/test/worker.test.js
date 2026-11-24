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
