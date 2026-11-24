import test from "node:test";
import assert from "node:assert/strict";
import {
  inferRequiredCapabilities,
  selectEnabledSkills,
  formatUntrustedSkillContext
} from "../../katia-braine/src/skill-selector.js";

test("infers only explicit conversation and document capabilities", () => {
  assert.deepEqual(
    inferRequiredCapabilities({ messages: [{ role: "user", content: "¿Podés resumir este texto?" }] }),
    ["conversation.summarize"]
  );
  assert.deepEqual(
    inferRequiredCapabilities({ messages: [{ role: "user", content: "Explicame qué es una variable." }] }),
    ["conversation.explain"]
  );
  assert.deepEqual(inferRequiredCapabilities({ messages: [{ role: "user", content: "Hola Katia" }] }), []);
  assert.deepEqual(inferRequiredCapabilities({ task: "document_create" }), ["documents.create"]);
});

test("selects only enabled matching Skills and prefers fewer permissions", () => {
  const installed = [
    {
      skillId: "high-permission", version: "1.0.0", status: "enabled",
      manifest: { capabilities: ["conversation.explain"], permissions: ["network.read"] },
      grantedPermissions: ["network.read"], packageSha256: "a".repeat(64)
    },
    {
      skillId: "least-privilege", version: "1.0.0", status: "enabled",
      manifest: { capabilities: ["conversation.explain"], permissions: [] },
      grantedPermissions: [], packageSha256: "b".repeat(64)
    },
    {
      skillId: "disabled", version: "1.0.0", status: "disabled",
      manifest: { capabilities: ["conversation.explain"], permissions: [] },
      grantedPermissions: [], packageSha256: "c".repeat(64)
    },
    {
      skillId: "overgrant", version: "1.0.0", status: "enabled",
      manifest: { capabilities: ["conversation.explain"], permissions: [] },
      grantedPermissions: ["network.write"], packageSha256: "d".repeat(64)
    }
  ];
  const selected = selectEnabledSkills(installed, ["conversation.explain"]);
  assert.equal(selected.length, 2);
  assert.equal(selected[0].skillId, "least-privilege");
  assert.equal(selected[1].skillId, "high-permission");
});

test("does not select Skills when there is no clear capability match", () => {
  const installed = [{
    skillId: "helper", version: "1.0.0", status: "enabled",
    manifest: { capabilities: ["conversation.explain"], permissions: [] },
    grantedPermissions: []
  }];
  assert.deepEqual(selectEnabledSkills(installed, []), []);
  assert.deepEqual(selectEnabledSkills(installed, ["messages.send"]), []);
});

test("formats bounded Skill instructions as untrusted data", () => {
  const block = formatUntrustedSkillContext([{
    skillId: "helper", version: "1.0.0",
    capabilities: ["conversation.explain"],
    instructions: "Explain in simple steps."
  }]);
  assert.match(block, /^BEGIN_UNTRUSTED_KATIA_SKILL_DATA/);
  assert.match(block, /Explain in simple steps/);
  assert.match(block, /END_UNTRUSTED_KATIA_SKILL_DATA$/);
  assert.equal(formatUntrustedSkillContext([]), "");
});
