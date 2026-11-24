const MAX_FILES = 50;
const MAX_FILE_BYTES = 64 * 1024;
const MAX_TOTAL_BYTES = 256 * 1024;
const TEXT_EXTENSIONS = new Set([".md", ".json", ".txt"]);

function getExtension(path) {
  const name = path.split("/").pop() || "";
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
}

function validSegment(value) {
  return typeof value === "string" && /^[A-Za-z0-9_.-]{1,100}$/.test(value) &&
    value !== "." && value !== "..";
}

export function validateRepositoryInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("El cuerpo debe ser un objeto JSON.");
  }
  const { owner, repo } = input;
  const ref = input.ref ?? "main";
  if (!validSegment(owner) || !validSegment(repo)) {
    throw new Error("Repositorio inválido. Usa owner y repo de GitHub.");
  }
  if (typeof ref !== "string" || ref.length > 200 || ref.startsWith("-") ||
      !/^[A-Za-z0-9._/-]+$/.test(ref) || ref.includes("..") || ref.startsWith("/")) {
    throw new Error("Referencia Git inválida.");
  }
  return { owner, repo, ref };
}

async function githubJson(url, env) {
  const headers = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Katia-Skills-Analyzer"
  };
  if (env.GITHUB_TOKEN) headers.Authorization = "Bearer " + env.GITHUB_TOKEN;
  const response = await fetch(url, { headers, redirect: "error" });
  if (!response.ok) {
    if (response.status === 404) throw new Error("No se encontró el repositorio o la referencia solicitada.");
    if (response.status === 403 || response.status === 429) throw new Error("GitHub limitó temporalmente la consulta. Intenta más tarde.");
    throw new Error("GitHub no pudo entregar los archivos del repositorio.");
  }
  return response.json();
}

function decodeBase64Utf8(value) {
  const clean = value.replace(/\\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function hashSkillFiles(files) {
  const ordered = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const canonical = ordered.map(file => file.path + "\\0" + file.content).join("\\0");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function readSkillRepository(input, env) {
  const { owner, repo, ref } = validateRepositoryInput(input);
  const base = "https://api.github.com/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo);

  // Resolve the requested branch/tag to an immutable commit before reading its tree.
  const commit = await githubJson(base + "/commits/" + encodeURIComponent(ref), env);
  const commitSha = commit.sha;
  const treeSha = commit.commit && commit.commit.tree && commit.commit.tree.sha;
  if (typeof commitSha !== "string" || !/^[a-f0-9]{40}$/i.test(commitSha) ||
      typeof treeSha !== "string" || !/^[a-f0-9]{40}$/i.test(treeSha)) {
    throw new Error("GitHub devolvió una referencia de commit inválida.");
  }

  const tree = await githubJson(base + "/git/trees/" + treeSha + "?recursive=1", env);
  if (tree.truncated) throw new Error("El repositorio es demasiado grande para analizarlo de forma segura.");
  const entries = (tree.tree || []).filter(entry => entry.type === "blob");
  if (entries.length === 0) throw new Error("El repositorio no contiene archivos.");
  if (entries.length > MAX_FILES) throw new Error("El paquete supera el límite de 50 archivos.");

  let totalBytes = 0;
  for (const entry of entries) {
    if (!Number.isInteger(entry.size) || entry.size < 0 || typeof entry.path !== "string") {
      throw new Error("GitHub devolvió metadatos de archivo inválidos.");
    }
    if (entry.size > MAX_FILE_BYTES) throw new Error("Archivo demasiado grande: " + entry.path);
    totalBytes += entry.size;
  }
  if (totalBytes > MAX_TOTAL_BYTES) throw new Error("El paquete supera el límite total de 256 KiB.");

  const files = await Promise.all(entries.map(async entry => {
    const ext = getExtension(entry.path);
    if (!TEXT_EXTENSIONS.has(ext)) return { path: entry.path, content: "" };
    const blob = await githubJson(base + "/git/blobs/" + encodeURIComponent(entry.sha), env);
    if (blob.encoding !== "base64" || typeof blob.content !== "string") {
      throw new Error("Formato de archivo no compatible: " + entry.path);
    }
    let content;
    try {
      content = decodeBase64Utf8(blob.content);
    } catch {
      throw new Error("El archivo no es texto UTF-8 válido: " + entry.path);
    }
    if (new TextEncoder().encode(content).length !== entry.size) {
      throw new Error("La longitud del archivo no coincide: " + entry.path);
    }
    return { path: entry.path, content };
  }));

  return {
    repository: { owner, repo, ref, commitSha },
    files,
    fileCount: files.length,
    totalBytes,
    packageSha256: await hashSkillFiles(files)
  };
}
