const ALLOWED_PERMISSIONS = new Set([
  "network.read", "network.write", "files.read", "files.write",
  "documents.create", "documents.modify", "github.read", "github.write",
  "device.open_app", "messages.draft", "messages.send", "user.profile.read"
]);

const ALLOWED_TEXT_EXTENSIONS = new Set([".md", ".json", ".txt"]);
const BLOCKED_EXTENSIONS = new Set([
  ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".pyc",
  ".sh", ".bash", ".ps1", ".bat", ".cmd", ".exe", ".dll", ".so",
  ".wasm", ".jar", ".class", ".apk", ".html", ".htm", ".svg",
  ".zip", ".tar", ".gz", ".7z", ".rar", ".pdf", ".docm", ".xlsm"
]);

const MAX_FILES = 50;
const MAX_FILE_BYTES = 64 * 1024;
const MAX_TOTAL_BYTES = 256 * 1024;
const MAX_MANIFEST_BYTES = 16 * 1024;

function byteLength(value) {
  return new TextEncoder().encode(value).length;
}

function extension(path) {
  const name = path.split("/").pop() || "";
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

function validatePath(path) {
  if (typeof path !== "string" || !path || path.length > 240) return false;
  if (path.startsWith("/") || path.includes("\\") || path.includes("\0")) return false;
  const parts = path.split("/");
  return parts.every(part => part && part !== "." && part !== "..") &&
    !parts.some(part => part.startsWith(".") && part !== ".well-known");
}

function validSemver(value) {
  return typeof value === "string" &&
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/.test(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateManifest(manifest, filePaths) {
  const errors = [];
  if (!isPlainObject(manifest)) return ["El manifiesto debe ser un objeto JSON."];

  const allowedKeys = new Set([
    "manifest_version", "id", "name", "version", "description", "publisher",
    "minimum_katia_version", "categories", "capabilities", "permissions",
    "dependencies", "entrypoint", "integrity", "homepage", "license"
  ]);
  for (const key of Object.keys(manifest)) {
    if (!allowedKeys.has(key)) errors.push("Campo no reconocido: " + key);
  }

  const required = ["manifest_version", "id", "name", "version", "description", "publisher", "capabilities", "permissions", "entrypoint"];
  for (const key of required) if (!(key in manifest)) errors.push("Falta el campo obligatorio: " + key);

  if (manifest.manifest_version !== "1.0") errors.push("Versión de manifiesto no compatible.");
  if (typeof manifest.id !== "string" || !/^[a-z0-9][a-z0-9._-]{2,63}$/.test(manifest.id)) errors.push("ID de Skill inválido.");
  if (typeof manifest.name !== "string" || manifest.name.length < 2 || manifest.name.length > 80) errors.push("Nombre de Skill inválido.");
  if (!validSemver(manifest.version)) errors.push("Versión semántica inválida.");
  if (typeof manifest.description !== "string" || manifest.description.length < 10 || manifest.description.length > 500) errors.push("Descripción inválida.");

  if (!isPlainObject(manifest.publisher) || typeof manifest.publisher.name !== "string" ||
      !manifest.publisher.name.trim() || manifest.publisher.name.length > 100) {
    errors.push("Editor/publicador inválido.");
  } else {
    for (const key of Object.keys(manifest.publisher)) {
      if (!["name", "url", "repository"].includes(key)) errors.push("Campo de publicador no reconocido: " + key);
    }
    if (manifest.publisher.url !== undefined &&
        (typeof manifest.publisher.url !== "string" || !/^https:\/\//i.test(manifest.publisher.url))) {
      errors.push("La URL del publicador debe usar HTTPS.");
    }
    if (manifest.publisher.repository !== undefined &&
        (typeof manifest.publisher.repository !== "string" ||
         !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(manifest.publisher.repository))) {
      errors.push("Repositorio del publicador inválido.");
    }
  }

  if (manifest.minimum_katia_version !== undefined &&
      (typeof manifest.minimum_katia_version !== "string" || manifest.minimum_katia_version.length > 32)) {
    errors.push("Versión mínima de Katia inválida.");
  }

  if (manifest.categories !== undefined &&
      (!Array.isArray(manifest.categories) || manifest.categories.length > 12 ||
       manifest.categories.some(x => typeof x !== "string" || !/^[a-z0-9-]{2,32}$/.test(x)) ||
       new Set(manifest.categories).size !== manifest.categories.length)) {
    errors.push("Categorías inválidas.");
  }

  if (!Array.isArray(manifest.capabilities) || manifest.capabilities.length < 1 || manifest.capabilities.length > 30 ||
      manifest.capabilities.some(x => typeof x !== "string" || !/^[a-z][a-z0-9]*(\.[a-z][a-z0-9_-]*)+$/.test(x)) ||
      new Set(manifest.capabilities).size !== manifest.capabilities.length) {
    errors.push("Lista de capacidades inválida.");
  }

  if (!Array.isArray(manifest.permissions) || manifest.permissions.length > 20) {
    errors.push("Lista de permisos inválida.");
  } else {
    for (const permission of manifest.permissions) {
      if (!ALLOWED_PERMISSIONS.has(permission)) errors.push("Permiso desconocido o no permitido: " + String(permission));
    }
    if (new Set(manifest.permissions).size !== manifest.permissions.length) errors.push("Hay permisos duplicados.");
  }

  if (!isPlainObject(manifest.entrypoint) || manifest.entrypoint.type !== "declarative" ||
      typeof manifest.entrypoint.path !== "string" ||
      Object.keys(manifest.entrypoint).some(key => !["type", "path"].includes(key))) {
    errors.push("El punto de entrada debe ser declarativo y no contener campos adicionales.");
  } else {
    const entry = manifest.entrypoint.path;
    if (!validatePath(entry) || !/\.(md|json)$/i.test(entry)) errors.push("Ruta de punto de entrada no permitida.");
    else if (!filePaths.has(entry)) errors.push("No se encontró el archivo de instrucciones declarado.");
  }

  if (manifest.dependencies !== undefined) {
    if (!Array.isArray(manifest.dependencies) || manifest.dependencies.length > 20) errors.push("Dependencias inválidas.");
    else {
      const ids = new Set();
      for (const dep of manifest.dependencies) {
        if (!isPlainObject(dep) || Object.keys(dep).some(key => !["id", "version"].includes(key)) ||
            typeof dep.id !== "string" || !/^[a-z0-9][a-z0-9._-]{2,63}$/.test(dep.id) ||
            typeof dep.version !== "string" || dep.version.length > 64 || ids.has(dep.id)) {
          errors.push("Dependencia mal formada o duplicada.");
        } else ids.add(dep.id);
      }
    }
  }

  if (manifest.integrity !== undefined &&
      (!isPlainObject(manifest.integrity) ||
       Object.keys(manifest.integrity).some(key => key !== "sha256") ||
       (manifest.integrity.sha256 !== undefined && !/^[a-fA-F0-9]{64}$/.test(manifest.integrity.sha256)))) {
    errors.push("Metadatos de integridad inválidos.");
  }

  if (manifest.homepage !== undefined &&
      (typeof manifest.homepage !== "string" || !/^https:\/\//i.test(manifest.homepage))) {
    errors.push("La página del Skill debe usar HTTPS.");
  }
  if (manifest.license !== undefined &&
      (typeof manifest.license !== "string" || manifest.license.length > 64)) {
    errors.push("Licencia inválida.");
  }

  return errors;
}
function inspectText(path, content) {
  const warnings = [];
  const lower = content.toLowerCase();
  const patterns = [
    ["Instrucción para ignorar reglas o políticas", /ignore (all )?(previous |prior )?(instructions|rules|policies)|ignora (todas las |las )?(instrucciones|reglas)/],
    ["Solicitud de secretos o credenciales", /(api[_ -]?key|password|secret|token).{0,40}(send|share|reveal|exfiltrat|envia|compartir|revelar)/],
    ["Intento de descargar o ejecutar código", /(curl|wget|powershell|bash|npm install|pip install).{0,60}(https?:|exec|run|install)/],
    ["Solicitud de acciones externas automáticas", /(send messages automatically|delete files automatically|envía mensajes automáticamente|borra archivos automáticamente)/]
  ];
  for (const [label, regex] of patterns) if (regex.test(lower)) warnings.push(label);
  return warnings;
}

/**
 * Analyze a bounded set of repository text files.
 * Input: [{ path: string, content: string, type?: "file" }]
 * This function never evaluates or executes package content.
 */
export function analyzeSkillPackage(inputFiles) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(inputFiles) || inputFiles.length === 0) {
    return { ok: false, status: "rejected", errors: ["No se recibieron archivos."], warnings: [], summary: null };
  }
  if (inputFiles.length > MAX_FILES) {
    return { ok: false, status: "rejected", errors: ["El paquete supera el límite de 50 archivos."], warnings: [], summary: null };
  }

  const seen = new Set();
  let totalBytes = 0;
  const normalized = [];

  for (const item of inputFiles) {
    if (!isPlainObject(item) || !validatePath(item.path) || typeof item.content !== "string") {
      errors.push("Archivo con ruta o contenido inválido.");
      continue;
    }
    if (seen.has(item.path)) {
      errors.push("Ruta duplicada: " + item.path);
      continue;
    }
    seen.add(item.path);
    const ext = extension(item.path);
    if (BLOCKED_EXTENSIONS.has(ext)) {
      errors.push("Tipo de archivo bloqueado: " + item.path);
      continue;
    }
    if (!ALLOWED_TEXT_EXTENSIONS.has(ext)) {
      errors.push("Tipo de archivo no admitido: " + item.path);
      continue;
    }
    const size = byteLength(item.content);
    if (size > MAX_FILE_BYTES) {
      errors.push("Archivo demasiado grande: " + item.path);
      continue;
    }
    totalBytes += size;
    normalized.push(item);
  }

  if (totalBytes > MAX_TOTAL_BYTES) errors.push("El paquete supera el límite total de 256 KiB.");
  const manifestFile = normalized.find(file => file.path === "katia.skill.json");
  if (!manifestFile) errors.push("Falta katia.skill.json.");
  else if (byteLength(manifestFile.content) > MAX_MANIFEST_BYTES) errors.push("El manifiesto supera 16 KiB.");

  if (errors.length) return { ok: false, status: "rejected", errors, warnings, summary: null };

  let manifest;
  try {
    manifest = JSON.parse(manifestFile.content);
  } catch {
    return { ok: false, status: "rejected", errors: ["katia.skill.json no contiene JSON válido."], warnings, summary: null };
  }

  for (const message of validateManifest(manifest, new Set(normalized.map(file => file.path)))) errors.push(message);

  for (const file of normalized) {
    if (file.path !== "katia.skill.json") {
      for (const warning of inspectText(file.path, file.content)) warnings.push(file.path + ": " + warning);
    }
  }

  const ok = errors.length === 0;
  return {
    ok,
    status: ok ? (warnings.length ? "needs_review" : "valid") : "rejected",
    errors,
    warnings,
    summary: ok ? {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      publisher: manifest.publisher.name,
      capabilities: manifest.capabilities,
      requestedPermissions: manifest.permissions,
      fileCount: normalized.length,
      totalBytes
    } : null
  };
}
