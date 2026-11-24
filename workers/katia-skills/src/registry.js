const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/;
const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/i;
const PERMISSION_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9_-]*)+$/;

function requireString(value, label, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) {
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

function sameSet(left, right) {
  return left.length === right.length && left.every(value => right.includes(value));
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
  if (!input.manifest || typeof input.manifest !== "object" || Array.isArray(input.manifest) ||
      input.manifest.id !== skillId || input.manifest.version !== version) {
    throw new TypeError("El manifiesto no coincide con el ID y la versión registrados.");
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


/** Returns the registered, immutable catalog metadata for Katia Brain. */
export async function listSkillVersions(db) {
  requireDatabase(db);
  const result = await db.prepare(
    "SELECT skill_id, version, source_owner, source_repo, source_ref, source_commit_sha, manifest_json, package_sha256, created_at FROM skill_versions ORDER BY skill_id ASC, created_at DESC"
  ).all();
  return (result.results || []).map(row => ({
    skillId: row.skill_id,
    version: row.version,
    source: {
      owner: row.source_owner,
      repo: row.source_repo,
      ref: row.source_ref,
      commitSha: row.source_commit_sha
    },
    manifest: JSON.parse(row.manifest_json),
    packageSha256: row.package_sha256,
    registeredAt: row.created_at
  }));
}

/** Looks up one exact immutable catalog version. */
export async function getSkillVersion(db, skillId, version) {
  requireDatabase(db);
  const id = requireString(skillId, "ID de Skill", 64);
  const ver = requireString(version, "Versión", 64);
  if (!ID_PATTERN.test(id) || !VERSION_PATTERN.test(ver)) throw new TypeError("Skill o versión inválidos.");
  const row = await db.prepare(
    "SELECT skill_id, version, source_owner, source_repo, source_ref, source_commit_sha, manifest_json, package_sha256, created_at FROM skill_versions WHERE skill_id = ? AND version = ?"
  ).bind(id, ver).first();
  if (!row) return null;
  return {
    skillId: row.skill_id,
    version: row.version,
    source: {
      owner: row.source_owner,
      repo: row.source_repo,
      ref: row.source_ref,
      commitSha: row.source_commit_sha
    },
    manifest: JSON.parse(row.manifest_json),
    packageSha256: row.package_sha256,
    registeredAt: row.created_at
  };
}

/**
 * Records a user-approved installation. The caller MUST supply the subject
 * established by katia-braine authentication, never a browser-provided user ID.
 * The requested permissions are checked against the stored manifest, grants
 * must be a subset, and the install starts disabled.
 */
export async function recordApprovedInstall(db, input) {
  requireDatabase(db);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Solicitud de instalación inválida.");

  const authenticatedUserId = requireString(input.authenticatedUserId, "Identidad autenticada", 160);
  const skillId = requireString(input.skillId, "ID de Skill", 64);
  const version = requireString(input.version, "Versión", 64);
  const approvalEventId = requireString(input.approvalEventId, "ID de aprobación", 100);
  const installedEventId = requireString(input.installedEventId, "ID de auditoría", 100);
  if (!ID_PATTERN.test(skillId) || !VERSION_PATTERN.test(version)) throw new TypeError("Skill o versión inválidos.");
  if (approvalEventId === installedEventId) throw new TypeError("Los IDs de auditoría deben ser diferentes.");
  if (input.approved !== true) throw new Error("La instalación requiere aprobación explícita del usuario.");

  const requested = requirePermissions(input.requestedPermissions, "Permisos solicitados");
  const granted = requirePermissions(input.grantedPermissions, "Permisos concedidos");
  const versionRow = await db.prepare(
    "SELECT manifest_json FROM skill_versions WHERE skill_id = ? AND version = ?"
  ).bind(skillId, version).first();
  if (!versionRow) throw new Error("La versión de Skill no está registrada.");

  let manifest;
  try {
    manifest = JSON.parse(versionRow.manifest_json);
  } catch {
    throw new Error("El manifiesto almacenado no es válido.");
  }
  const manifestPermissions = requirePermissions(manifest.permissions, "Permisos del manifiesto");
  if (manifest.id !== skillId || manifest.version !== version || !sameSet(requested, manifestPermissions)) {
    throw new Error("Los permisos o la versión no coinciden con el manifiesto registrado.");
  }

  const requestedSet = new Set(requested);
  if (granted.some(permission => !requestedSet.has(permission))) {
    throw new TypeError("No se pueden conceder permisos que la Skill no solicitó.");
  }

  const details = JSON.stringify({
    version,
    requestedPermissions: requested,
    grantedPermissions: granted,
    initialStatus: "disabled"
  });
  const statements = [
    db.prepare(
      "INSERT INTO user_skill_installs (user_id, skill_id, version, status, requested_permissions_json, granted_permissions_json) VALUES (?, ?, ?, 'disabled', ?, ?) ON CONFLICT(user_id, skill_id) DO UPDATE SET version = excluded.version, status = 'disabled', requested_permissions_json = excluded.requested_permissions_json, granted_permissions_json = excluded.granted_permissions_json, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"
    ).bind(authenticatedUserId, skillId, version, JSON.stringify(requested), JSON.stringify(granted)),
    db.prepare(
      "INSERT INTO skill_audit_events (event_id, user_id, action, skill_id, details_json) VALUES (?, ?, 'install_approved', ?, ?)"
    ).bind(approvalEventId, authenticatedUserId, skillId, details),
    db.prepare(
      "INSERT INTO skill_audit_events (event_id, user_id, action, skill_id, details_json) VALUES (?, ?, 'installed', ?, ?)"
    ).bind(installedEventId, authenticatedUserId, skillId, details)
  ];

  await db.batch(statements);
  return { installed: true, enabled: false, skillId, version };
}

/** Lists only the authenticated user's installed Skills. */
export async function listUserSkills(db, authenticatedUserId) {
  requireDatabase(db);
  const userId = requireString(authenticatedUserId, "Identidad autenticada", 160);
  const result = await db.prepare(
    "SELECT i.skill_id, i.version, i.status, i.requested_permissions_json, i.granted_permissions_json, i.installed_at, i.updated_at, v.manifest_json, v.package_sha256 FROM user_skill_installs i INNER JOIN skill_versions v ON v.skill_id = i.skill_id AND v.version = i.version WHERE i.user_id = ? ORDER BY i.installed_at DESC"
  ).bind(userId).all();
  return (result.results || []).map(row => ({
    skillId: row.skill_id,
    version: row.version,
    status: row.status,
    requestedPermissions: JSON.parse(row.requested_permissions_json),
    grantedPermissions: JSON.parse(row.granted_permissions_json),
    installedAt: row.installed_at,
    updatedAt: row.updated_at,
    manifest: JSON.parse(row.manifest_json),
    packageSha256: row.package_sha256
  }));
}

/** Enables or disables an installed Skill; it never grants additional permissions. */
export async function setUserSkillStatus(db, input) {
  requireDatabase(db);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Solicitud de estado inválida.");
  const userId = requireString(input.authenticatedUserId, "Identidad autenticada", 160);
  const skillId = requireString(input.skillId, "ID de Skill", 64);
  const status = input.status;
  const eventId = requireString(input.eventId, "ID de auditoría", 100);
  if (!ID_PATTERN.test(skillId) || !["enabled", "disabled"].includes(status)) {
    throw new TypeError("Skill o estado inválidos.");
  }

  const installed = await db.prepare(
    "SELECT 1 AS installed FROM user_skill_installs WHERE user_id = ? AND skill_id = ?"
  ).bind(userId, skillId).first();
  if (!installed) throw new Error("La Skill no está instalada para este usuario.");

  const action = status === "enabled" ? "enabled" : "disabled";
  await db.batch([
    db.prepare(
      "UPDATE user_skill_installs SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE user_id = ? AND skill_id = ?"
    ).bind(status, userId, skillId),
    db.prepare(
      "INSERT INTO skill_audit_events (event_id, user_id, action, skill_id, details_json) VALUES (?, ?, ?, ?, ?)"
    ).bind(eventId, userId, action, skillId, JSON.stringify({ status }))
  ]);

  return { skillId, status };
}
