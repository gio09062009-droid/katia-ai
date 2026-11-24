import { createKatiaIdentityAssertion } from "./identity-assertion.js";

const MAX_BODY_BYTES = 8 * 1024;
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function response(respond, data, status = 200) {
  return respond(data, status);
}

async function readJsonBounded(request) {
  const declared = request.headers.get("Content-Length");
  if (declared !== null) {
    if (!/^\d+$/.test(declared)) return { error: "Longitud de solicitud inválida.", status: 400 };
    if (Number(declared) > MAX_BODY_BYTES) return { error: "Solicitud demasiado grande.", status: 413 };
  }
  const reader = request.body?.getReader();
  const chunks = [];
  let total = 0;
  try {
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_BODY_BYTES) {
          await reader.cancel();
          return { error: "Solicitud demasiado grande.", status: 413 };
        }
        chunks.push(value);
      }
    }
  } catch {
    return { error: "No se pudo leer la solicitud.", status: 400 };
  } finally {
    reader?.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: "El cuerpo debe ser un objeto JSON.", status: 400 };
    }
    return { value: parsed };
  } catch {
    return { error: "JSON inválido.", status: 400 };
  }
}

async function rateLimit(request, env, bucket) {
  const limiter = env.CHAT_RATE_LIMITER;
  if (!limiter || typeof limiter.limit !== "function") return false;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  try {
    const result = await limiter.limit({ key: bucket + ":" + ip });
    return result?.success === true;
  } catch {
    return false;
  }
}

function skillsConfig(env) {
  const base = String(env.KATIA_SKILLS_URL || "").trim().replace(/\/+$/, "");
  const token = env.KATIA_SKILLS_API_TOKEN;
  const identitySecret = env.KATIA_IDENTITY_SECRET;
  if (!base || !/^https:\/\//i.test(base) || !token || typeof token !== "string" ||
      token.length < 24 || !identitySecret || typeof identitySecret !== "string" ||
      identitySecret.length < 32) {
    return null;
  }
  return { base, token, identitySecret };
}

async function callSkills(config, path, method = "GET", body = undefined, identity = undefined) {
  const headers = {
    Authorization: "Bearer " + config.token,
    Accept: "application/json"
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (identity) headers["X-Katia-Identity"] = identity;
  try {
    const upstream = await fetch(config.base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(12000)
    });
    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); }
    catch { data = { ok: false, error: "El servicio de Skills devolvió una respuesta inválida." }; }
    return { status: upstream.status, data };
  } catch {
    return {
      status: 502,
      data: { ok: false, error: "No se pudo conectar de forma segura con Katia Skills." }
    };
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const result = {};
    for (const key of Object.keys(value).sort()) result[key] = canonicalize(value[key]);
    return result;
  }
  return value;
}

async function actionContextHash(path, payload) {
  const canonical = JSON.stringify({
    method: "POST",
    path,
    payload: canonicalize(payload)
  });
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical)));
  return Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("");
}

function validDeviceProof(proof) {
  return proof && typeof proof === "object" && !Array.isArray(proof) &&
    typeof proof.challengeId === "string" &&
    typeof proof.publicKeySpki === "string" && proof.publicKeySpki.length <= 1024 &&
    typeof proof.signature === "string" && proof.signature.length <= 256;
}

async function authorizeDevice(config, proof, contextHash) {
  if (!validDeviceProof(proof)) return { error: "Falta una prueba de dispositivo válida.", status: 401 };
  const verified = await callSkills(config, "/v1/identity/verify", "POST", { ...proof, contextHash });
  const subject = verified.data?.subject;
  if (verified.status !== 200 || verified.data?.ok !== true ||
      typeof subject !== "string" || !/^device:[A-Za-z0-9_-]{43}$/.test(subject)) {
    return { error: "No se pudo verificar la identidad de este navegador.", status: 401 };
  }
  try {
    const assertion = await createKatiaIdentityAssertion(subject, config.identitySecret);
    return { assertion, subject };
  } catch {
    return { error: "No se pudo emitir una autorización interna segura.", status: 503 };
  }
}

/**
 * Verifies the one-use proof for the read-only installed-Skills lookup.
 * The resulting Brain assertion stays inside this Worker.
 */
export async function getInstalledSkillsForChat(env, proof) {
  if (!proof || typeof proof !== "object") return null;
  const config = skillsConfig(env);
  if (!config) return null;
  try {
    const contextHash = await actionContextHash("/skills/installed", {});
    const auth = await authorizeDevice(config, proof, contextHash);
    if (auth.error) return null;
    const upstream = await callSkills(config, "/v1/skills/installed", "GET", undefined, auth.assertion);
    if (upstream.status !== 200 || upstream.data?.ok !== true ||
        !Array.isArray(upstream.data.skills)) return null;
    return upstream.data.skills;
  } catch {
    return null;
  }
}

/** Fetches one immutable, digest-verified package from the Skills Worker. */
export async function getSkillPackageForChat(env, skillId, version) {
  if (typeof skillId !== "string" || !/^[a-z0-9][a-z0-9._-]{2,63}$/.test(skillId) ||
      typeof version !== "string" ||
      !/^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(-[0-9A-Za-z.-]+)?$/.test(version)) {
    return null;
  }
  const config = skillsConfig(env);
  if (!config) return null;
  const upstream = await callSkills(config, "/v1/skills/package/" + skillId + "/" + version);
  if (upstream.status !== 200 || upstream.data?.ok !== true ||
      !Array.isArray(upstream.data.files)) return null;
  return upstream.data;
}

/**
 * Brain-side server-to-server proxy for the isolated Skills Worker.
 * Returns null for routes this module does not own.
 */
export async function handleSkillsRoute(request, env, path, respond) {
  const challengeRoute = path === "/identity/challenge";
  const catalogRoute = path === "/skills/catalog";
  const analyzeRoute = path === "/skills/analyze";
  const registerRoute = path === "/skills/register";
  const installedRoute = path === "/skills/installed";
  const installRoute = path === "/skills/install";
  const statusRoute = path === "/skills/status";
  const packageMatch = path.match(/^\/skills\/package\/([a-z0-9][a-z0-9._-]{2,63})\/(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/);
  if (!challengeRoute && !catalogRoute && !analyzeRoute && !registerRoute &&
      !installedRoute && !installRoute && !statusRoute && !packageMatch) return null;

  const expectedMethod = challengeRoute || analyzeRoute || registerRoute || installRoute || statusRoute
    ? "POST"
    : catalogRoute || packageMatch ? "GET" : "POST";
  if (request.method !== expectedMethod) {
    return response(respond, { ok: false, error: "Método no permitido." }, 405);
  }

  if (!(await rateLimit(request, env, "katia-skills"))) {
    return response(respond, { ok: false, error: "Servicio temporalmente ocupado. Intentá más tarde." }, 429);
  }

  const config = skillsConfig(env);
  if (!config) {
    return response(respond, { ok: false, error: "La conexión segura con Katia Skills todavía no está configurada." }, 503);
  }

  if (challengeRoute) {
    const parsed = await readJsonBounded(request);
    if (parsed.error) return response(respond, { ok: false, error: parsed.error }, parsed.status);
    const targetPath = parsed.value.targetPath;
    const payload = parsed.value.payload;
    const allowedTargets = ["/skills/installed", "/skills/install", "/skills/status", "/skills/register"];
    if (typeof parsed.value.publicKeySpki !== "string" || parsed.value.publicKeySpki.length > 1024 ||
        !allowedTargets.includes(targetPath) || !payload || typeof payload !== "object" || Array.isArray(payload)) {
      return response(respond, { ok: false, error: "La clave o la acción solicitada no es válida." }, 400);
    }
    if (targetPath === "/skills/register" && payload.approved !== true) {
      return response(respond, { ok: false, error: "El registro requiere aprobación explícita." }, 400);
    }
    const contextHash = await actionContextHash(targetPath, payload);
    const upstream = await callSkills(config, "/v1/identity/challenge", "POST", {
      publicKeySpki: parsed.value.publicKeySpki,
      contextHash
    });
    return response(respond, upstream.data, upstream.status);
  }

  if (catalogRoute) {
    const upstream = await callSkills(config, "/v1/skills/catalog");
    return response(respond, upstream.data, upstream.status);
  }

  if (packageMatch) {
    const upstream = await callSkills(
      config,
      "/v1/skills/package/" + packageMatch[1] + "/" + packageMatch[2] + "." + packageMatch[3] + "." + packageMatch[4] + (packageMatch[5] || "")
    );
    return response(respond, upstream.data, upstream.status);
  }

  const parsed = await readJsonBounded(request);
  if (parsed.error) return response(respond, { ok: false, error: parsed.error }, parsed.status);
  const input = parsed.value;

  if (analyzeRoute) {
    const upstream = await callSkills(config, "/v1/skills/analyze", "POST", input);
    return response(respond, upstream.data, upstream.status);
  }

  if (registerRoute && input.approved !== true) {
    return response(respond, { ok: false, error: "El registro requiere aprobación explícita." }, 400);
  }
  if (registerRoute || installedRoute || installRoute || statusRoute) {
    const forwarded = { ...input };
    delete forwarded.deviceProof;
    const contextHash = await actionContextHash(path, forwarded);
    const auth = await authorizeDevice(config, input.deviceProof, contextHash);
    if (auth.error) return response(respond, { ok: false, error: auth.error }, auth.status);

    if (installedRoute) {
      const upstream = await callSkills(config, "/v1/skills/installed", "GET", undefined, auth.assertion);
      return response(respond, upstream.data, upstream.status);
    }

    const target = registerRoute ? "/v1/skills/register" :
      installRoute ? "/v1/skills/install" : "/v1/skills/status";
    const upstream = await callSkills(config, target, "POST", forwarded, auth.assertion);
    return response(respond, upstream.data, upstream.status);
  }

  return response(respond, { ok: false, error: "Ruta de Skills no disponible." }, 404);
}
