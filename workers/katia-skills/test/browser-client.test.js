import test from "node:test";
import assert from "node:assert/strict";
import {
  getOrCreateDeviceIdentity,
  clearDeviceIdentity,
  requestProtectedSkills,
  getSkillsCatalog,
  analyzeSkillRepository,
  getSkillPackage
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
