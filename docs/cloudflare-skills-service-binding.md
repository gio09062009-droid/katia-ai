# Katia Brain → Skills: Service Binding y diagnóstico seguro

## Alcance

Este documento prepara el cambio para el módulo desplegado `skills-proxy.js`. El módulo está actualmente dentro del Worker `katia-braine` y no existe como archivo fuente independiente en la rama `main` de este repositorio; por eso este PR documenta el parche exacto y la configuración necesaria, pero **no modifica ni despliega Workers**.

## 1. Configuración requerida en Cloudflare

En el Worker **katia-braine**, agregar un Service Binding:

- Binding name: `SKILLS_SERVICE`
- Service: `katia-skills`
- Environment: producción (el entorno al que pertenece el Worker de Skills).

No eliminar ni cambiar `KATIA_SKILLS_URL`, `KATIA_SKILLS_API_TOKEN` ni `KATIA_IDENTITY_SECRET`. La URL queda como respaldo para entornos sin binding. No copiar secretos al código ni al repositorio.

La forma equivalente en Wrangler es:

```toml
[[services]]
binding = "SKILLS_SERVICE"
service = "katia-skills"
```

## 2. Parche para `skills-proxy.js`

En `skillsConfig(env)`, conservar todas las validaciones actuales y ampliar el objeto devuelto para incluir el binding opcional:

```js
return {
  base,
  token,
  identitySecret,
  service: env.SKILLS_SERVICE || null
};
```

Reemplazar el cuerpo actual de `callSkills` por esta implementación. Mantiene Authorization, identidad interna, timeout y respaldo HTTP; el binding se prefiere cuando está configurado:

```js
async function callSkills(config, path, method = "GET", body = undefined, identity = undefined) {
  const headers = {
    Authorization: "Bearer " + config.token,
    Accept: "application/json"
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (identity) headers["X-Katia-Identity"] = identity;

  try {
    const outbound = new Request(config.base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(12000)
    });

    const upstream = config.service &&
      typeof config.service.fetch === "function"
        ? await config.service.fetch(outbound)
        : await fetch(outbound);

    const contentType = upstream.headers.get("content-type") || null;
    const text = await upstream.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        status: 502,
        data: {
          ok: false,
          error: "El servicio de Skills devolvió una respuesta no JSON.",
          diagnostic: {
            upstreamStatus: upstream.status,
            contentType
          }
        }
      };
    }

    return { status: upstream.status, data };
  } catch {
    return {
      status: 502,
      data: {
        ok: false,
        error: "No se pudo conectar de forma segura con Katia Skills."
      }
    };
  }
}
```

La respuesta de diagnóstico expone únicamente estado HTTP y Content-Type. No devuelve el cuerpo HTML, encabezados de autenticación, tokens ni secretos.

## 3. Validaciones antes de producción

1. Confirmar que el binding `SKILLS_SERVICE` apunta exactamente a `katia-skills`.
2. Probar el catálogo sin registros: debe devolver `200` y `{ "ok": true, "count": 0, "skills": [] }`.
3. Probar una ruta protegida con credenciales incorrectas en un entorno de prueba: debe devolver JSON 401, nunca filtrar secretos.
4. Probar el fallback HTTP solo en un entorno donde esté permitido.
5. Verificar que `/identity/challenge`, instalación, estado, paquetes y selección automática en chat sigan funcionando.
6. Revisar logs y trazas sin registrar valores de Authorization o identidad.

## 4. Seguridad y despliegue

- Este PR no cambia producción.
- No rotar secretos como parte de este arreglo.
- No quitar autenticación Bearer ni la aserción de identidad.
- No fusionar ni desplegar hasta revisar el diff, configurar el binding y ejecutar las pruebas.
- Si luego se incorpora el código fuente de los Workers al repositorio, mover el módulo real y su configuración Wrangler a esa estructura para que el cambio sea reproducible por CI.
