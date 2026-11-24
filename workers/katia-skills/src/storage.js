import { hashSkillFiles } from "./github.js";

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/i;
const MAX_OBJECT_BYTES = 384 * 1024;

function validateIdentity(skillId, version, digest) {
  if (typeof skillId !== "string" || !ID_PATTERN.test(skillId)) throw new TypeError("ID de Skill inválido.");
  if (typeof version !== "string" || !VERSION_PATTERN.test(version)) throw new TypeError("Versión de Skill inválida.");
  if (typeof digest !== "string" || !DIGEST_PATTERN.test(digest)) throw new TypeError("SHA-256 inválido.");
}

function packageKey(skillId, version, digest) {
  validateIdentity(skillId, version, digest);
  return "skills/" + skillId + "/" + version + "/" + digest.toLowerCase() + ".json";
}

function validateFiles(files) {
  if (!Array.isArray(files) || files.length < 1 || files.length > 50) {
    throw new TypeError("Lista de archivos inválida.");
  }
  const seen = new Set();
  for (const file of files) {
    if (!file || typeof file !== "object" || Array.isArray(file) ||
        typeof file.path !== "string" || !file.path || typeof file.content !== "string") {
      throw new TypeError("Archivo de Skill inválido.");
    }
    if (seen.has(file.path)) throw new TypeError("El paquete contiene rutas duplicadas.");
    seen.add(file.path);
  }
}

/**
 * Stores a declarative package as a bounded JSON object in R2.
 * The object key is content-addressed and immutable; no code is executed.
 */
export async function storeSkillPackage(bucket, input) {
  if (!bucket || typeof bucket.put !== "function" || typeof bucket.head !== "function") {
    throw new TypeError("El bucket R2 no está disponible.");
  }
  const key = packageKey(input?.skillId, input?.version, input?.packageSha256);
  validateFiles(input.files);
  const actualDigest = await hashSkillFiles(input.files);
  if (actualDigest.toLowerCase() !== input.packageSha256.toLowerCase()) {
    throw new Error("La huella del paquete no coincide con sus archivos.");
  }

  const orderedFiles = [...input.files].sort((a, b) => a.path.localeCompare(b.path));
  const serialized = JSON.stringify({
    format: "katia-skill-package-v1",
    skillId: input.skillId,
    version: input.version,
    packageSha256: actualDigest,
    files: orderedFiles
  });
  const bytes = new TextEncoder().encode(serialized);
  if (bytes.byteLength > MAX_OBJECT_BYTES) throw new Error("El paquete serializado supera el límite de almacenamiento.");

  const existing = await bucket.head(key);
  if (existing) {
    if (existing.customMetadata?.packageSha256 !== actualDigest) {
      throw new Error("Conflicto: el objeto R2 existente no coincide con su clave inmutable.");
    }
    return { key, created: false, size: existing.size };
  }

  const object = await bucket.put(key, serialized, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
    customMetadata: {
      skillId: input.skillId,
      version: input.version,
      packageSha256: actualDigest
    }
  });
  return { key, created: true, size: object?.size ?? bytes.byteLength };
}

/** Loads a package from R2 and verifies its identity and content digest. */
export async function readSkillPackage(bucket, input) {
  if (!bucket || typeof bucket.get !== "function") throw new TypeError("El bucket R2 no está disponible.");
  const key = packageKey(input?.skillId, input?.version, input?.packageSha256);
  const object = await bucket.get(key);
  if (!object) return null;
  if (object.size > MAX_OBJECT_BYTES) throw new Error("El objeto R2 supera el límite permitido.");

  const raw = await object.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_OBJECT_BYTES) {
    throw new Error("El objeto R2 supera el límite permitido.");
  }
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error("El objeto R2 no contiene JSON válido.");
  }
  if (!payload || payload.format !== "katia-skill-package-v1" ||
      payload.skillId !== input.skillId || payload.version !== input.version ||
      payload.packageSha256 !== input.packageSha256.toLowerCase()) {
    throw new Error("La identidad del paquete almacenado no coincide.");
  }
  validateFiles(payload.files);
  const actualDigest = await hashSkillFiles(payload.files);
  if (actualDigest !== payload.packageSha256) {
    throw new Error("La verificación SHA-256 del paquete almacenado falló.");
  }
  return { key, files: payload.files, packageSha256: actualDigest };
}
