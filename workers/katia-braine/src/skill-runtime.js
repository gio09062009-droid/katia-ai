import {
  inferRequiredCapabilities,
  selectEnabledSkills,
  formatUntrustedSkillContext
} from "./skill-selector.js";
import {
  getInstalledSkillsForChat,
  getSkillPackageForChat
} from "./skills-proxy.js";

function safeEntrypointPath(value) {
  return typeof value === "string" &&
    value.length <= 180 &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value.split("/").some(part => !part || part === "." || part === "..") &&
    /\\.(md|json)$/i.test(value);
}

/**
 * Loads only enabled Skills belonging to the verified browser identity.
 * Packages are re-fetched by immutable version and digest; only the manifest
 * entrypoint is passed to the model as untrusted reference data.
 */
export async function buildSkillsRuntimeContext(env, deviceProof, input = {}) {
  const required = inferRequiredCapabilities(input);
  if (!required.length || !deviceProof) return "";

  try {
    const installed = await getInstalledSkillsForChat(env, deviceProof);
    if (!Array.isArray(installed) || installed.length === 0) return "";

    const selected = selectEnabledSkills(installed, required);
    if (!selected.length) return "";

    const contexts = [];
    for (const selectedSkill of selected) {
      const record = installed.find(item =>
        item.skillId === selectedSkill.skillId &&
        item.version === selectedSkill.version
      );
      const entrypoint = record?.manifest?.entrypoint?.path;
      if (!record || !safeEntrypointPath(entrypoint)) continue;

      const pack = await getSkillPackageForChat(env, selectedSkill.skillId, selectedSkill.version);
      if (!pack || pack.packageSha256 !== selectedSkill.packageSha256 ||
          !Array.isArray(pack.files)) continue;

      const file = pack.files.find(item =>
        item && item.path === entrypoint && typeof item.content === "string"
      );
      if (!file) continue;

      contexts.push({
        skillId: selectedSkill.skillId,
        version: selectedSkill.version,
        capabilities: selectedSkill.capabilities,
        instructions: file.content.slice(0, 6000)
      });
    }

    return formatUntrustedSkillContext(contexts);
  } catch {
    // Skill runtime failures never interrupt normal chat.
    return "";
  }
}
