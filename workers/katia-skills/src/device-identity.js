const encoder = new TextEncoder();
const MAX_PUBLIC_KEY_BYTES = 512;
const CHALLENGE_TTL_SECONDS = 300;

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\\+/g, "-").replace(/\\//g, "_");
}

function decodeBase64Url(value, maxLength = 2048) {
  if (typeof value !== "string" || value.length > maxLength ||
      !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new TypeError("Dato base64url inválido.");
  }
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function publicKeyDetails(publicKeySpki) {
  const bytes = decodeBase64Url(publicKeySpki, 1024);
  if (bytes.byteLength < 64 || bytes.byteLength > MAX_PUBLIC_KEY_BYTES) {
    throw new TypeError("La clave pública tiene un tamaño inválido.");
  }
  const key = await crypto.subtle.importKey(
    "spki",
    bytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return { bytes, key, digest: encodeBase64Url(digest), subject: "device:" + encodeBase64Url(digest) };
}

function requireDb(db) {
  if (!db || typeof db.prepare !== "function") {
    throw new TypeError("La conexión D1 no está disponible.");
  }
}

/** Creates a five-minute, one-use challenge bound to one P-256 public key. */
export async function createDeviceChallenge(db, publicKeySpki, nowSeconds = Math.floor(Date.now() / 1000)) {
  requireDb(db);
  const details = await publicKeyDetails(publicKeySpki);
  const challengeId = encodeBase64Url(crypto.getRandomValues(new Uint8Array(18)));
  const nonce = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = nowSeconds + CHALLENGE_TTL_SECONDS;

  await db.prepare(
    "INSERT INTO device_challenges (challenge_id, nonce, public_key_sha256, expires_at) VALUES (?, ?, ?, ?)"
  ).bind(challengeId, nonce, details.digest, expiresAt).run();

  return {
    challengeId,
    nonce,
    message: "katia-skills-device-v1:" + challengeId + ":" + nonce,
    expiresAt
  };
}

/**
 * Verifies possession of the non-exportable private key and atomically consumes
 * the challenge. The subject is derived only from the verified public key.
 */
export async function verifyDeviceProof(db, input, nowSeconds = Math.floor(Date.now() / 1000)) {
  requireDb(db);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Prueba de dispositivo inválida.");
  }
  if (typeof input.challengeId !== "string" || !/^[A-Za-z0-9_-]{20,40}$/.test(input.challengeId)) {
    throw new TypeError("Identificador de desafío inválido.");
  }

  const details = await publicKeyDetails(input.publicKeySpki);
  const signature = decodeBase64Url(input.signature, 256);
  if (signature.byteLength !== 64) throw new TypeError("La firma ECDSA tiene un formato inválido.");

  const challenge = await db.prepare(
    "SELECT nonce, public_key_sha256, expires_at, consumed_at FROM device_challenges WHERE challenge_id = ?"
  ).bind(input.challengeId).first();

  if (!challenge || challenge.consumed_at !== null && challenge.consumed_at !== undefined ||
      challenge.expires_at <= nowSeconds ||
      challenge.public_key_sha256 !== details.digest) {
    throw new Error("El desafío no existe, venció o no corresponde a esta clave.");
  }

  const message = "katia-skills-device-v1:" + input.challengeId + ":" + challenge.nonce;
  const valid = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    details.key,
    signature,
    encoder.encode(message)
  );
  if (!valid) throw new Error("La firma del dispositivo no es válida.");

  const consumed = await db.prepare(
    "UPDATE device_challenges SET consumed_at = ? WHERE challenge_id = ? AND public_key_sha256 = ? AND expires_at > ? AND consumed_at IS NULL"
  ).bind(nowSeconds, input.challengeId, details.digest, nowSeconds).run();
  if ((consumed?.meta?.changes ?? 0) !== 1) {
    throw new Error("El desafío ya fue utilizado o venció.");
  }

  await db.prepare(
    "INSERT OR IGNORE INTO device_identities (subject, public_key_spki, public_key_sha256) VALUES (?, ?, ?)"
  ).bind(details.subject, input.publicKeySpki, details.digest).run();

  const identity = await db.prepare(
    "SELECT subject, public_key_sha256, revoked_at FROM device_identities WHERE public_key_sha256 = ?"
  ).bind(details.digest).first();

  if (!identity || identity.subject !== details.subject ||
      identity.public_key_sha256 !== details.digest || identity.revoked_at !== null && identity.revoked_at !== undefined) {
    throw new Error("La identidad del dispositivo no está activa.");
  }

  await db.prepare(
    "UPDATE device_identities SET last_seen_at = ? WHERE subject = ? AND revoked_at IS NULL"
  ).bind(nowSeconds, details.subject).run();

  return { subject: details.subject };
}
