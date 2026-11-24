const MAX_SELECTED_SKILLS = 3;
const MAX_SKILL_CONTEXT_BYTES = 12 * 1024;

function lastUserMessage(messages) {
  if (!Array.isArray(messages)) return "";
  for (let index = messages.length - 1; index >= 0; index--) {
    const item = messages[index];
    if (item && item.role === "user" && typeof item.content === "string") {
      return item.content.slice(0, 20000);
    }
  }
  return "";
}

/** Conservative intent mapping. No match means no Skill is injected. */
export function inferRequiredCapabilities(input = {}) {
  const task = typeof input.task === "string" ? input.task : "chat";
  if (task === "document_analyze" || task === "document_question") return ["documents.analyze"];
  if (task === "document_modify") return ["documents.modify"];
  if (task === "document_create") return ["documents.create"];

  const message = lastUserMessage(input.messages).toLowerCase();
  if (/\b(resum\w*|sintetiz\w*|summary|summari[sz]e)\b/.test(message)) {
    return ["conversation.summarize"];
  }
  if (/\b(explic[aá]|expl[ií]came|qu[eé] es|c[oó]mo funciona|how does|explain)\b/.test(message)) {
    return ["conversation.explain"];
  }
  return [];
}

function validGrantedPermissions(skill) {
  const requested = Array.isArray(skill.manifest?.permissions) ? skill.manifest.permissions : [];
  const granted = Array.isArray(skill.grantedPermissions) ? skill.grantedPermissions : [];
  const requestedSet = new Set(requested);
  return granted.every(permission => typeof permission === "string" && requestedSet.has(permission));
}

/**
 * Selects only enabled, manifest-backed Skills matching a clear capability.
 * Least privilege wins; ties are deterministic.
 */
export function selectEnabledSkills(installedSkills, requiredCapabilities, limit = MAX_SELECTED_SKILLS) {
  if (!Array.isArray(installedSkills) || !Array.isArray(requiredCapabilities) ||
      requiredCapabilities.length === 0) return [];
  const required = new Set(requiredCapabilities);
  const candidates = installedSkills.filter(skill =>
    skill && skill.status === "enabled" &&
    skill.manifest && typeof skill.manifest === "object" &&
    Array.isArray(skill.manifest.capabilities) &&
    validGrantedPermissions(skill) &&
    skill.manifest.capabilities.some(capability => required.has(capability))
  );
  candidates.sort((left, right) => {
    const leftPermissions = Array.isArray(left.grantedPermissions) ? left.grantedPermissions.length : 0;
    const rightPermissions = Array.isArray(right.grantedPermissions) ? right.grantedPermissions.length : 0;
    if (leftPermissions !== rightPermissions) return leftPermissions - rightPermissions;
    return String(left.skillId).localeCompare(String(right.skillId));
  });
  const maximum = Number.isInteger(limit) ? Math.max(0, Math.min(limit, MAX_SELECTED_SKILLS)) : MAX_SELECTED_SKILLS;
  return candidates.slice(0, maximum).map(skill => ({
    skillId: skill.skillId,
    version: skill.version,
    capabilities: skill.manifest.capabilities.filter(capability => required.has(capability)),
    grantedPermissions: [...(skill.grantedPermissions || [])],
    packageSha256: skill.packageSha256
  }));
}

/**
 * Package instructions are serialized as untrusted data, never executable code.
 * The caller must place this block in a lower-priority context and retain the
 * system instruction that explicitly marks it untrusted.
 */
export function formatUntrustedSkillContext(skills) {
  if (!Array.isArray(skills) || skills.length === 0) return "";
  const bounded = [];
  let bytes = 0;
  for (const skill of skills) {
    if (!skill || typeof skill.skillId !== "string" || typeof skill.instructions !== "string") continue;
    const entry = {
      skillId: skill.skillId,
      version: String(skill.version || ""),
      capability: Array.isArray(skill.capabilities) ? skill.capabilities : [],
      instructions: skill.instructions.slice(0, 6000)
    };
    const encoded = JSON.stringify(entry);
    const size = new TextEncoder().encode(encoded).byteLength;
    if (bytes + size > MAX_SKILL_CONTEXT_BYTES) break;
    bounded.push(entry);
    bytes += size;
  }
  if (!bounded.length) return "";
  return "BEGIN_UNTRUSTED_KATIA_SKILL_DATA\n" +
    JSON.stringify(bounded) +
    "\nEND_UNTRUSTED_KATIA_SKILL_DATA";
}
