# Katia Malvada — estado de integración

> **No aplicar el parche histórico de este archivo.** La lógica de autenticación, validación del token y selección de Venice ya está integrada en el Worker de producción `katia-braine`.

## Estado verificado

- Worker activo: versión **44**, con el **100 % del tráfico** asignado a esa versión.
- Bindings presentes en esa versión: `KATIA_MALVADA_PASSWORD`, `KATIA_MALVADA_SIGNING_KEY` y `VENICE_API_KEY` (todos como secretos; sus valores no se muestran ni se guardan en este repositorio).
- La ruta `/malvada/auth` valida la contraseña en el servidor y entrega un token firmado con vencimiento de 8 horas.
- El chat verifica ese token en el Worker y, si es válido, enruta la conversación a Venice y añade el prompt de personalidad alternativa.
- El frontend propuesto está en la rama `feature/open-knowledge-toggle`; este PR todavía no publica ese botón en GitHub Pages.

## Pendiente antes de considerarlo terminado

1. **Validar el modelo de Venice.** El Worker tiene un identificador de modelo escrito directamente en el código. La documentación de Venice recomienda consultar `GET /models` porque los identificadores disponibles pueden cambiar. La existencia de la API key y del endpoint no demuestra que el modelo configurado siga disponible.
2. Probar el inicio de sesión desde el sitio y una conversación real, verificando que la respuesta indique `provider: Venice`.
3. Probar que, al desactivar el botón 😈, las conversaciones vuelven al proveedor normal.
4. No fusionar ni publicar el frontend hasta completar la revisión y recibir autorización.

## Seguridad y alcance

- La contraseña y la clave de firma permanecen en secretos del Worker; nunca deben incluirse en HTML, JavaScript del navegador ni GitHub.
- El navegador guarda solamente el token temporal en `sessionStorage`.
- El modo cambia el estilo de respuesta, pero no elimina las protecciones: no debe dar instrucciones operativas para crear, desplegar u ocultar malware ni para atacar sistemas.
- Si el token vence, el usuario debe volver a autenticarse.

Este archivo es una nota de estado y revisión, no un parche para volver a desplegar.
