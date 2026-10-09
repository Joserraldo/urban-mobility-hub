# Plan de despliegue en Cloudflare (Plan 5.3)

Estado: **plan listo, nada publicado**. No se han creado cuentas ni recursos externos. Autor: agente Despliegue. Fecha: 2026-10-01.

## 1. Idea en lenguaje simple

Cloudflare Workers ejecuta nuestra app (TanStack Start) en servidores de Cloudflare, sin que administremos un servidor propio. La base de datos es **D1** (SQLite administrado). Para el tiempo real se usan **Durable Objects (DO)**: un "mini-servidor" con memoria propia que mantiene abiertas las conexiones de los usuarios y les reenvía la telemetría y las alertas.

## 2. Arquitectura de despliegue

| Pieza                     | Servicio Cloudflare                             | Notas                                                                          |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| Portal SSR + API `/api/*` | Worker (`@cloudflare/vite-plugin` + `wrangler`) | TanStack Start tiene soporte oficial; `wrangler deploy` lo detecta.            |
| Base de datos             | D1 (binding `DB`)                               | Drizzle con driver `drizzle-orm/d1`; migraciones con `wrangler d1 migrations`. |
| Tiempo real               | Durable Object `FleetHub` (binding `FLEET_HUB`) | WebSocket Hibernation API; difunde telemetría y alertas.                       |
| Archivos estáticos        | Assets del Worker                               | Incluye `sitemap.xml`, `robots.txt`, `llms.txt`.                               |
| Secretos                  | `wrangler secret put`                           | Nunca en el repo.                                                              |

Entornos: `dev` (local con `wrangler dev`/Vite, D1 local), `staging` (`env.staging`, URL workers.dev) y `prod` (`env.production`, dominio propio opcional).

## 3. ¿WebSocket requiere Durable Objects? ¿Basta SSE?

- **WebSocket**: un Worker _puede_ aceptar un WebSocket, pero cada petición puede caer en una instancia distinta que no comparte memoria. Para que un publicador (simulador/IoT) llegue a todos los navegadores suscritos, hace falta un punto único de coordinación: **un Durable Object**. Respuesta: _sí, para difusión real entre clientes._ DO con almacenamiento SQLite está disponible también en el plan gratuito.
- **SSE**: funciona en Workers (respuesta en streaming), pero tiene el mismo problema de no compartir estado entre instancias, y las conexiones largas pueden cortarse. Solo basta si cada cliente consulta D1 periódicamente o si el stream lo sirve también un DO. Es el **fallback** correcto (D3), no un reemplazo sin DO.
- **Último recurso**: _polling_ cada 3–5 s a `/api/telemetry/latest` sobre D1 (cumple RNF-01 ≤5 s, pero no RNF-02 <1 s para alertas).

Recomendación: DO `FleetHub` con WebSocket (hibernación) + endpoint SSE servido por el mismo DO + polling como tercer nivel.

## 4. Limitaciones que afectan al plan maestro

1. **Simulador MQTT con `aedes` (D4) no corre en Workers** (no hay sockets TCP de escucha ni procesos largos). Alternativa: el broker MQTT corre **solo en local/demo** (Node) y un _puente_ publica por HTTP `POST /api/ingest` (o WebSocket) al DO; en producción los "Raspberry Pi" simulados hacen directamente ese POST. Conserva los topics `umh/vehicle/{id}/telemetry|alert` como nombres lógicos.
2. **Hash de contraseñas (D5)**: `argon2` nativo no funciona en Workers. Usar `bcryptjs`/`scrypt` en WASM o PBKDF2 con WebCrypto (nativo). Cifrado AES-GCM sí está disponible vía WebCrypto.
3. **Node APIs**: activar `nodejs_compat`; evitar librerías con binarios nativos (p. ej. `better-sqlite3` solo en dev; en Workers usar D1).
4. **Límites**: tamaño del Worker (3 MB comprimido en plan gratuito, 10 MB de pago), CPU por petición (10 ms gratis / 30 s de pago), D1 ~5 GB y 100 mil escrituras/día gratis. Suficiente para la demo; la telemetría debe muestrearse (no guardar cada punto).
5. **D1 vs SQLite local**: mantener el esquema Drizzle compatible con ambos (sin extensiones). Las transacciones interactivas de D1 son limitadas: usar `db.batch()`.
6. **Reconocimiento facial** corre en el navegador (D5), no afecta al despliegue; los modelos se sirven como assets estáticos.
7. **SEO (D6)**: SSR en Workers funciona; las páginas públicas pueden prerenderizarse en build. No redirigir por user-agent en el servidor.

Alternativas si Cloudflare resultara inviable: Fly.io/Render (Node completo con aedes y SQLite en volumen), o Vercel (sin WebSocket persistente). Cloudflare sigue siendo la mejor opción para el Plan 5.3.

## 5. Plantilla de configuración (borrador, a validar con la versión mínima)

`wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "urban-mobility-hub",
  "compatibility_date": "2026-10-01",
  "compatibility_flags": ["nodejs_compat"],
  "main": "src/server-entry.ts", // entrypoint propio: handler de TanStack Start + export del DO
  "observability": { "enabled": true },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "umh-db",
      "database_id": "<PENDIENTE>",
      "migrations_dir": "drizzle",
    },
  ],
  "durable_objects": { "bindings": [{ "name": "FLEET_HUB", "class_name": "FleetHub" }] },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["FleetHub"] }],
  "vars": { "APP_ENV": "dev", "PUBLIC_SITE_URL": "http://localhost:8080" },
  "env": {
    "staging": { "vars": { "APP_ENV": "staging" } },
    "production": { "vars": { "APP_ENV": "production", "PUBLIC_SITE_URL": "https://<dominio>" } },
  },
}
```

(En `env.*` hay que repetir los bindings `d1_databases` y `durable_objects`, porque no se heredan.)

`vite.config.ts`: añadir `cloudflare({ viteEnvironment: { name: "ssr" } })` antes de `tanstackStart()`.

### Variables y secretos

| Nombre            | Tipo    | Uso                                               |
| ----------------- | ------- | ------------------------------------------------- |
| `APP_ENV`         | var     | dev / staging / production                        |
| `PUBLIC_SITE_URL` | var     | canonical, sitemap, OG                            |
| `SESSION_SECRET`  | secreto | firma de sesiones                                 |
| `BIOMETRIC_KEY`   | secreto | clave AES-GCM (plantillas biométricas, RNF-03/05) |
| `INGEST_TOKEN`    | secreto | autentica a los publicadores IoT simulados        |

Local: `.dev.vars` (en `.gitignore`) más `.dev.vars.example` versionado.

## 6. Pasos de despliegue (runbook)

1. `npm i -D wrangler @cloudflare/vite-plugin` y `wrangler login` (**acción del usuario**).
2. `wrangler d1 create umh-db` → copiar `database_id` (**crea recurso: requiere confirmación**).
3. `wrangler d1 migrations apply umh-db --local`, luego `--remote` en staging.
4. `wrangler secret put SESSION_SECRET` (y los demás) por entorno.
5. `npm run build && wrangler deploy --env staging`; ejecutar _smoke tests_ (`/api/health`, login, WebSocket).
6. Tras aprobación explícita del usuario: `wrangler deploy --env production`.

## 7. Rollback y observabilidad

- **Rollback**: `wrangler rollback` (versión anterior del Worker) o `wrangler versions deploy`; despliegues graduales posibles. Migraciones D1 solo _aditivas_ (expand/contract) para que el rollback del código sea seguro; D1 Time Travel permite restaurar la base (acción destructiva: confirmar).
- **Health check**: `GET /api/health` → `{status, version, db: ok, hub: ok}`.
- **Logs**: `observability.enabled` + `wrangler tail`; logs estructurados JSON (nivel, requestId).
- **CI/CD** (GCS D8): GitHub Actions: lint + typecheck + test + build → deploy a staging en `main`; producción por tag `v*` con aprobación manual. Requiere secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` en GitHub (los crea el usuario).

## 8. Pendiente / dependencias

- Esperar versión mínima de frontend y backend para validar el entrypoint (`src/server-entry.ts`) y las migraciones Drizzle.
- Backend: exponer `POST /api/ingest`, `GET /api/health`, y el DO `FleetHub`.
- RF-20..RF-24 aprobados (P1 registro/login/consentimiento y desbloqueo/alertas; P2 reservas/compras y tiempo real; P3 catálogo/hubs): impacto en despliegue = tablas de usuarios/consentimientos en las migraciones D1, `SESSION_SECRET` y `BIOMETRIC_KEY` obligatorios en staging/prod, y despliegue inicial limitado a P1+P2 si P3 no alcanza (se documenta como "planificado").
- Regla npm: solo ci ejecuta `npm install`; yo no instalo (`wrangler` y `@cloudflare/vite-plugin` se agregarán a package.json y se pedirán a ci cuando haya versión mínima).
- Confirmación del usuario antes de: crear cuenta/token Cloudflare, crear D1, cualquier `deploy`.

## Fuentes

- [Cloudflare: TanStack Start en Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)
- [Cloudflare Workers changelog](https://developers.cloudflare.com/changelog/product/workers/4/)
- [Alchemy: TanStack Start + Cloudflare](https://alchemy.run/providers/cloudflare/tanstack-start)
- Límites y precios: verificar en la documentación vigente de Cloudflare antes de la entrega (las cifras de la sección 4 son aproximadas).
