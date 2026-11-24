import { analyzeSkillPackage } from "./analyzer.js";
import { readSkillRepository } from "./github.js";
import {
  listUserSkills,
  recordApprovedInstall,
  setUserSkillStatus
} from "./registry.js";

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
    "access-control-allow-headers": "Authorization, Content-Type, X-Katia-User-Id",
    "vary": "Origin"
  };
}

function trustedUserId(request) {
  const value = request.headers.get("X-Katia-User-Id") || "";
  if (!value || value.length > 160 || /[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

async function readJsonBody(request) {
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    return { error: json({ ok: false, error: "Solicitud demasiado grande." }, 413) };
  }
  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return { error: json({ ok: false, error: "No se pudo leer la solicitud." }, 400) };
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    return { error: json({ ok: false, error: "Solicitud demasiado grande." }, 413) };
  }
  try {
    return { value: JSON.parse(rawBody) };
  } catch {
    return { error: json({ ok: false, error: "JSON inválido." }, 400) };
  }
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
      return json({ ok: true, service: "katia-skills", version: "0.2.0", status: "d1-connected" }, 200, cors || {});
    }

    const allowedRoute =
      (request.method === "POST" && [
        "/v1/skills/analyze",
        "/v1/skills/install",
        "/v1/skills/status"
      ].includes(url.pathname)) ||
      (request.method === "GET" && url.pathname === "/v1/skills/installed");
    if (!allowedRoute) {
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

    if (url.pathname === "/v1/skills/installed" ||
        url.pathname === "/v1/skills/install" ||
        url.pathname === "/v1/skills/status") {
      if (!env.DB) return json({ ok: false, error: "La base D1 no está vinculada." }, 503, cors || {});
      const userId = trustedUserId(request);
      if (!userId) return json({ ok: false, error: "Falta la identidad autenticada enviada por Katia Brain." }, 401, cors || {});

      try {
        if (request.method === "GET") {
          const skills = await listUserSkills(env.DB, userId);
          return json({ ok: true, skills }, 200, cors || {});
        }

        const parsed = await readJsonBody(request);
        if (parsed.error) return new Response(parsed.error.body, parsed.error);
        const input = parsed.value;
        if (!input || typeof input !== "object" || Array.isArray(input)) {
          return json({ ok: false, error: "El cuerpo debe ser un objeto JSON." }, 400, cors || {});
        }

        if (url.pathname === "/v1/skills/install") {
          const result = await recordApprovedInstall(env.DB, {
            authenticatedUserId: userId,
            skillId: input.skillId,
            version: input.version,
            approvalEventId: input.approvalEventId,
            installedEventId: input.installedEventId,
            approved: input.approved,
            requestedPermissions: input.requestedPermissions,
            grantedPermissions: input.grantedPermissions
          });
          return json({ ok: true, ...result }, 201, cors || {});
        }

        const result = await setUserSkillStatus(env.DB, {
          authenticatedUserId: userId,
          skillId: input.skillId,
          status: input.status,
          eventId: input.eventId
        });
        return json({ ok: true, ...result }, 200, cors || {});
      } catch (error) {
        return json({ ok: false, error: error instanceof Error ? error.message : "No se pudo completar la operación." }, 400, cors || {});
      }
    }

    const parsed = await readJsonBody(request);
    if (parsed.error) return new Response(parsed.error.body, parsed.error);
    try {
      const repository = await readSkillRepository(parsed.value, env);
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
