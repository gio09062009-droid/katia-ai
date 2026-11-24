const encoder = new TextEncoder();
const ISSUER = "katia-braine";
const AUDIENCE = "katia-skills";
const MAX_TTL_SECONDS = 300;
const CLOCK_SKEW_SECONDS = 30;

function decodeBase64Url(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new TypeError("Token de identidad inválido.");
  }
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function validSubject(value) {
  return typeof value === "string" &&
    value.length >= 3 &&
    value.length <= 160 &&
    /^[A-Za-z0-9][A-Za-z0-9._:@-]*$/.test(value);
}

async function importHmacKey(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("La clave de identidad entre Workers no está configurada correctamente.");
  }
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

/**
 * Verifies a short-lived identity assertion signed only by Katia Brain.
 * A browser-provided X-Katia-User-Id is deliberately never accepted.
 */
export async function verifyKatiaIdentity(request, env, nowSeconds = Math.floor(Date.now() / 1000)) {
  const token = request.headers.get("X-Katia-Identity") || "";
  if (!token || token.length > 4096 || token.split(".").length !== 2) return null;
  if (!env?.KATIA_IDENTITY_SECRET) return null;

  try {
    const [payloadPart, signaturePart] = token.split(".");
    const payloadBytes = decodeBase64Url(payloadPart);
    const signature = decodeBase64Url(signaturePart);
    if (signature.byteLength !== 32) return null;

    const key = await importHmacKey(env.KATIA_IDENTITY_SECRET);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(payloadPart)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    if (payload.iss !== ISSUER || payload.aud !== AUDIENCE) return null;
    if (!validSubject(payload.sub)) return null;
    if (!Array.isArray(payload.scope) || !payload.scope.includes("skills:user")) return null;
    if (typeof payload.jti !== "string" || !/^[A-Za-z0-9_-]{12,100}$/.test(payload.jti)) return null;
    if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)) return null;
    if (payload.iat > nowSeconds + CLOCK_SKEW_SECONDS) return null;
    if (payload.exp <= nowSeconds || payload.exp <= payload.iat) return null;
    if (payload.exp - payload.iat > MAX_TTL_SECONDS) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
