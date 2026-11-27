# Parche backend: Katia Malvada

Este parche está preparado para el Worker existente `katia-braine`. **No reemplaza el Worker completo** y no se debe desplegar hasta integrar y revisar los tres puntos indicados.

## 1. Añadir estas funciones antes de `export default`

```js
const KATIA_MALVADA_PROMPT = `
PERSONALIDAD ALTERNATIVA: KATIA MALVADA
- Conservá la identidad y la honestidad de Katia, pero usá un tono más ácido, sarcástico, irónico y directo.
- Permití humor negro moderado, humor absurdo, respuestas mordaces y lenguaje coloquial cuando encaje.
- No conviertas tragedias reales, sufrimiento de personas ni experiencias traumáticas en blanco de burla.
- No humilles al usuario ni ataques a personas por características protegidas.
- No inventes hechos, fuentes, recuerdos, capacidades ni resultados.
- Mantené límites de seguridad: no facilites autolesiones, daño real, armas, ataques, abuso, explotación, odio dirigido ni actividades peligrosas.
- En asuntos sensibles, respondé con franqueza y contexto, sin sermones innecesarios.
- Esta personalidad cambia el estilo, no elimina las protecciones de seguridad.
`;

function malvadaEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function malvadaDecode(value) {
  const base = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base + "=".repeat((4 - base.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function malvadaKey(env) {
  if (typeof env.KATIA_MALVADA_SIGNING_KEY !== "string" ||
      env.KATIA_MALVADA_SIGNING_KEY.length < 32) {
    throw new Error("MALVADA_SIGNING_KEY_NOT_CONFIGURED");
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.KATIA_MALVADA_SIGNING_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function malvadaPasswordMatches(input, expected) {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(input)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected))
  ]);
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

async function malvadaCreateToken(env) {
  const payload = {
    sub: "katia-malvada",
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
  };
  const encoded = malvadaEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await malvadaKey(env);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
  return encoded + "." + malvadaEncode(new Uint8Array(signature));
}

async function malvadaVerifyToken(env, token) {
  if (typeof token !== "string" || token.length > 2048) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  try {
    const key = await malvadaKey(env);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      malvadaDecode(parts[1]),
      new TextEncoder().encode(parts[0])
    );
    if (!valid) return false;
    const payload = JSON.parse(new TextDecoder().decode(malvadaDecode(parts[0])));
    return payload?.sub === "katia-malvada" &&
      Number.isFinite(payload.exp) &&
      payload.exp > Math.floor(Date.now() / 1000);
  } catch (error) {
    return false;
  }
}
```

## 2. Añadir una ruta de autenticación dentro de `fetch`

Ubicá estas líneas existentes:

```js
const url = new URL(request.url);
const path = url.pathname.replace(/\/+$/, "") || "/";
```

Inmediatamente después, antes de `handleSkillsRoute`, insertá:

```js
if (path === "/malvada/auth") {
  if (request.method !== "POST") {
    return respond({ error: "Utiliza POST." }, 405);
  }
  if (typeof env.KATIA_MALVADA_PASSWORD !== "string" ||
      !env.KATIA_MALVADA_PASSWORD ||
      typeof env.KATIA_MALVADA_SIGNING_KEY !== "string" ||
      env.KATIA_MALVADA_SIGNING_KEY.length < 32) {
    return respond({ error: "El acceso privado todavía no está configurado." }, 503);
  }

  const rate = await checkRateLimit(env, "CHAT_RATE_LIMITER", request, "katia-malvada-auth");
  if (!rate.allowed) {
    return respond({ error: "Demasiados intentos. Esperá un momento." }, 429);
  }

  let authBody;
  try {
    authBody = await readJson(request, 12000);
  } catch (error) {
    return respond({ error: "Solicitud inválida." }, 400);
  }

  const password = typeof authBody?.password === "string" ? authBody.password : "";
  if (!password || password.length > 200 ||
      !(await malvadaPasswordMatches(password, env.KATIA_MALVADA_PASSWORD))) {
    return respond({ error: "Contraseña incorrecta." }, 401);
  }

  try {
    const token = await malvadaCreateToken(env);
    return respond({ ok: true, token, expiresIn: 28800 });
  } catch (error) {
    console.error("Katia Malvada auth:", error?.message || error);
    return respond({ error: "No se pudo iniciar la sesión privada." }, 503);
  }
}
```

## 3. Validar el token y añadir la personalidad al chat

Buscá la línea existente:

```js
const task = TASKS.includes(body.task) ? body.task : "chat";
```

Inmediatamente después, insertá:

```js
let malvadaEnabled = false;
if (task === "chat" && body.malvadaToken) {
  if (!(await malvadaVerifyToken(env, body.malvadaToken))) {
    return respond({
      error: "La sesión privada venció. Volvé a ingresar la contraseña.",
      code: "MALVADA_TOKEN_INVALID"
    }, 401);
  }
  malvadaEnabled = true;
}
if (malvadaEnabled) {
  context += "\n\n" + KATIA_MALVADA_PROMPT;
}
```

El contexto se añade del lado del Worker, después de validar la firma. Un usuario no puede activar el modo enviando solamente un indicador desde el navegador.

## 4. Secretos necesarios en Cloudflare

Crear estos dos secretos en el Worker `katia-braine`:

- `KATIA_MALVADA_PASSWORD`: la contraseña privada elegida. Como se escribió en un chat, es recomendable reemplazarla por otra nueva antes de publicarla.
- `KATIA_MALVADA_SIGNING_KEY`: una clave aleatoria larga (mínimo 32 caracteres), distinta de la contraseña.

Nunca poner los valores en HTML, JavaScript del navegador, archivos GitHub ni mensajes de error. La clave de firma debe ser diferente de la contraseña.

## 5. Comportamiento esperado

- El frontend envía la contraseña una sola vez a `/malvada/auth`.
- El Worker devuelve un token firmado que caduca a las 8 horas.
- El navegador guarda únicamente el token en `sessionStorage`, no la contraseña.
- El token se adjunta solamente a las solicitudes de chat.
- Al cerrar la pestaña, el almacenamiento de sesión se elimina; si el token vence antes, se vuelve a pedir la contraseña.
- Sin token válido, Katia conserva su personalidad habitual.
- No se modifica la ruta de documentos, Tutor, Skills, video ni los proveedores de IA.

**Estado:** parche documentado para revisión. No se ha cambiado ni desplegado el Worker de producción.
