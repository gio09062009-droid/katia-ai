const encoder = new TextEncoder();
const ISSUER = "katia-braine";
const AUDIENCE = "katia-skills";

function validSubject(value) {
  return typeof value === "string" &&
    value.length >= 3 &&
    value.length <= 160 &&
    /^[A-Za-z0-9][A-Za-z0-9._:@-]*$/.test(value);
}

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Runs only inside Katia Brain after the browser's device proof is verified.
 * Never return this assertion to browser JavaScript.
 */
export async function createKatiaIdentityAssertion(subject, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!validSubject(subject)) throw new TypeError("Identidad de dispositivo inválida.");
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("La clave de identidad entre Workers no está configurada correctamente.");
  }
  const payload = {
    iss: ISSUER,
    aud: AUDIENCE,
    sub: subject,
    scope: ["skills:user"],
    iat: nowSeconds,
    exp: nowSeconds + 120,
    jti: encodeBase64Url(crypto.getRandomValues(new Uint8Array(18)))
  };
  const payloadPart = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadPart));
  return payloadPart + "." + encodeBase64Url(new Uint8Array(signature));
}
