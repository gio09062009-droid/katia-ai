import test from "node:test";
import assert from "node:assert/strict";
import {
  getOrCreateDeviceIdentity,
  clearDeviceIdentity,
  requestProtectedSkills,
  getSkillsCatalog,
  analyzeSkillRepository,
  getSkillPackage,
  mayUseSkill
} from "../../../src/device-identity-client.js";

test("browser identity client exposes only the intended public operations", () => {
  for (const fn of [
    getOrCreateDeviceIdentity,
    clearDeviceIdentity,
    requestProtectedSkills,
    getSkillsCatalog,
    analyzeSkillRepository,
    getSkillPackage
  ]) assert.equal(typeof fn, "function");
});

test("browser requests a device proof only for clear Skill-capable intents", () => {
  assert.equal(mayUseSkill({
    task: "chat",
    messages: [{ role: "user", content: "¿Podés resumir este texto?" }]
  }), true);
  assert.equal(mayUseSkill({
    task: "chat",
    messages: [{ role: "user", content: "Explicame qué es una variable." }]
  }), true);
  assert.equal(mayUseSkill({
    task: "chat",
    messages: [{ role: "user", content: "Hola Katia" }]
  }), false);
  assert.equal(mayUseSkill({ task: "document_create", messages: [] }), true);
});
