import { analyzeSkillPackage } from "./analyzer.js";
import { readSkillRepository } from "./github.js";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const MAX_REQUEST_BYTES = 8 * 1024;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

async function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b))
  ]);
  const x = new Uint8Array(left);
  const y = new Uint8Array(right);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return {};
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return null;
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Authorization, Content-Type",
    "vary": "Origin"
  };
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (cors === null) return json({ ok: false, error: "Origen no autorizado." }, 403);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors || {} });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "katia-skills", version: "0.1.0", status: "foundation" }, 200, cors || {});
    }
    if (request.method !== "POST" || url.pathname !== "/v1/skills/analyze") {
      return json({ ok: false, error: "Ruta no encontrada." }, 404, cors || {});
    }
    if (!env.SKILLS_API_TOKEN) {
      return json({ ok: false, error: "El servicio todavía no está configurado." }, 503, cors || {});
    }

    const authorization = request.headers.get("Authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!(await constantTimeEqual(token, env.SKILLS_API_TOKEN))) {
      return json({ ok: false, error: "No autorizado." }, 401, cors || {});
    }

    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > MAX_REQUEST_BYTES) {
      return json({ ok: false, error: "Solicitud demasiado grande." }, 413, cors || {});
    }

    let rawBody;
    try {
      rawBody = await request.text();
    } catch {
      return json({ ok: false, error: "No se pudo leer la solicitud." }, 400, cors || {});
    }
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return json({ ok: false, error: "Solicitud demasiado grande." }, 413, cors || {});
    }

    let input;
    try {
      input = JSON.parse(rawBody);
    } catch {
      return json({ ok: false, error: "JSON inválido." }, 400, cors || {});
    }

    try {
      const repository = await readSkillRepository(input, env);
      const analysis = analyzeSkillPackage(repository.files);
      return json({
        ok: analysis.ok,
        repository: repository.repository,
        package: {
          sha256: repository.packageSha256,
          fileCount: repository.fileCount,
          totalBytes: repository.totalBytes
        },
        analysis
      }, analysis.ok ? 200 : 422, cors || {});
    } catch (error) {
      return json({ ok: false, error: error instanceof Error ? error.message : "No se pudo analizar el repositorio." }, 400, cors || {});
    }
  }
};
