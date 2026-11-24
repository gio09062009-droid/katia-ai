const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const VERSION_PATTERN = /^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(-[0-9A-Za-z.-]+)?$/;
const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/i;
const PERMISSION_PATTERN = /^[a-z][a-z0-9]*(\\.[a-z][a-z0-9_-]*)+$/;

function requireString(value, label, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\\u0000-\\u001f\\u007f]/.test(value)) {
    throw new TypeError(label + " inválido.");
  }
  return value.trim();
}

function requirePermissions(value, label) {
  if (!Array.isArray(value) || value.length > 20 ||
      value.some(item => typeof item !== "string" || !PERMISSION_PATTERN.test(item)) ||
      new Set(value).size !== value.length) {
    throw new TypeError(label + " inválidos.");
  }
  return value;
}

function requireDatabase(db) {
  if (!db || typeof db.prepare !== "function" || typeof db.batch !== "function") {
    throw new TypeError("La conexión D1 no está disponible.");
  }
}

/**
 * Persists metadata for an analyzed immutable Skill version.
 * Re-registering the same version is idempotent only when commit and digest match.
 * This function stores metadata only; package bytes belong in R2.
 */
export async function registerSkillVersion(db, input) {
  requireDatabase(db);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Metadatos de Skill inválidos.");

  const skillId = requireString(input.skillId, "ID de Skill", 64);
  const version = requireString(input.version, "Versión", 64);
  const sourceOwner = requireString(input.sourceOwner, "Propietario GitHub", 39);
  const sourceRepo = requireString(input.sourceRepo, "Repositorio GitHub", 100);
  const sourceRef = requireString(input.sourceRef, "Referencia Git", 120);
  const sourceCommitSha = requireString(input.sourceCommitSha, "Commit SHA", 40);
  const packageSha256 = requireString(input.packageSha256, "SHA-256 del paquete", 64);

  if (!ID_PATTERN.test(skillId)) throw new TypeError("ID de Skill inválido.");
  if (!VERSION_PATTERN.test(version)) throw new TypeError("Versión semántica inválida.");
  if (!/^[A-Za-z0-9_.-]+$/.test(sourceOwner) || !/^[A-Za-z0-9_.-]+$/.test(sourceRepo)) {
    throw new TypeError("Repositorio GitHub inválido.");
  }
  if (!SHA_PATTERN.test(sourceCommitSha) || !DIGEST_PATTERN.test(packageSha256)) {
    throw new TypeError("La huella del paquete o el commit no es válida.");
  }
  if (!input.manifest || typeof input.manifest !== "object" || Array.isArray(input.manifest)) {
    throw new TypeError("Manifiesto inválido.");
  }
  const manifestJson = JSON.stringify(input.manifest);
  if (new TextEncoder().encode(manifestJson).byteLength > 16 * 1024) {
    throw new TypeError("El manifiesto supera 16 KiB.");
  }
  const packageR2Key = input.packageR2Key == null ? null : requireString(input.packageR2Key, "Clave R2", 512);

  const existing = await db.prepare(
    "SELECT source_commit_sha, package_sha256, manifest_json FROM skill_versions WHERE skill_id = ? AND version = ?"
  ).bind(skillId, version).first();

  if (existing) {
    if (existing.source_commit_sha !== sourceCommitSha ||
        existing.package_sha256 !== packageSha256 ||
        existing.manifest_json !== manifestJson) {
      throw new Error("Conflicto de versión inmutable: ese ID y versión ya existen con otro contenido.");
    }
    return { created: false, skillId, version };
  }

  await db.prepare(
    "INSERT INTO skill_versions (skill_id, version, source_owner, source_repo, source_ref, source_commit_sha, manifest_json, package_sha256, package_r2_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(skillId, version, sourceOwner, sourceRepo, sourceRef, sourceCommitSha, manifestJson, packageSha256, packageR2Key).run();

  return { created: true, skillId, version };
}

/**
 * Records a user-approved installation. The caller MUST supply the subject
 * established by katia-braine authentication, never a browser-provided user ID.
 * A new install is disabled by default and does not execute package content.
 */
export async function recordApprovedInstall(db, input) {
  requireDatabase(db);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Solicitud de instalación inválida.");

  const authenticatedUserId = requireString(input.authenticatedUserId, "Identidad autenticada", 160);
  const skillId = requireString(input.skillId, "ID de Skill", 64);
  const version = requireString(input.version, "Versión", 64);
  const eventId = requireString(input.eventId, "ID de auditoría", 100);
  if (!ID_PATTERN.test(skillId) || !VERSION_PATTERN.test(version)) throw new TypeError("Skill o versión inválidos.");

  const requested = requirePermissions(input.requestedPermissions, "Permisos solicitados");
  const granted = requirePermissions(input.grantedPermissions, "Permisos concedidos");
  const requestedSet = new Set(requested);
  if (granted.some(permission => !requestedSet.has(permission))) {
    throw new TypeError("No se pueden conceder permisos que la Skill no solicitó.");
  }

  const statements = [
    db.prepare(
      "INSERT INTO user_skill_installs (user_id, skill_id, version, status, requested_permissions_json, granted_permissions_json) VALUES (?, ?, ?, 'disabled', ?, ?) ON CONFLICT(user_id, skill_id) DO UPDATE SET version = excluded.version, status = 'disabled', requested_permissions_json = excluded.requested_permissions_json, granted_permissions_json = excluded.granted_permissions_json, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"
    ).bind(authenticatedUserId, skillId, version, JSON.stringify(requested), JSON.stringify(granted)),
    db.prepare(
      "INSERT INTO skill_audit_events (event_id, user_id, action, skill_id, details_json) VALUES (?, ?, 'installed', ?, ?)"
    ).bind(eventId, authenticatedUserId, skillId, JSON.stringify({ version, requestedPermissions: requested, grantedPermissions: granted, initialStatus: "disabled" }))
  ];

  await db.batch(statements);
  return { installed: true, enabled: false, skillId, version };
}
