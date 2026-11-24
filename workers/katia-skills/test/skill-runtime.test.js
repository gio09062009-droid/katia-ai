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
