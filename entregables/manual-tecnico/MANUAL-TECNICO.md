# Manual técnico — Urban Mobility Hub

Para quien entra al proyecto por primera vez y no quiere perderse. LÉELO EN ORDEN; cada sección responde una pregunta.
Estado del documento: **8-oct-2026 (v2), escrito leyendo el repositorio tras el ciclo de mejora backend + documentación.** Lo que aún no existe está marcado **[PENDIENTE]**; no lo des por hecho.

## 1. ¿Qué es el sistema?

Una plataforma web (PWA) para **vender y alquilar** patinetas eléctricas, bicicletas y drones, con mapa en tiempo real y **alertas de seguridad IoT**. No hay vehículos físicos: la flota se simula con _gemelos digitales_ (copias virtuales con los mismos datos que tendría el vehículo real). Proyecto académico UNAB, Ingeniería de Software II. Requisitos en `gestion/SRS_v1.2.md` (propuesto) y el SRS v1.1 original.

Mapa mental en una frase: **la pantalla pide datos a una interfaz (`DataSource`); detrás hay dos implementaciones reales e intercambiables: `mock` (en memoria, `npm run dev`) y `api` (REST + SQLite, `npm run dev:api`)**.

## 2. Mapa de documentos (dónde mirar qué)

| Pregunta                                    | Documento                                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| ¿Quién usa el sistema y para qué?           | `analisis/README.md` §1 (casos de uso)                                                                                     |
| ¿Cómo viajan los datos?                     | `analisis/README.md` §2–3 (DFD 0 y 1)                                                                                      |
| ¿Cómo está armado?                          | `diseno/README.md` (C4, componentes, despliegue)                                                                           |
| ¿Cómo se desbloquea / cómo sale una alerta? | `diseno/README.md` §6–7                                                                                                    |
| ¿Qué riesgos hay?                           | `gestion/Riesgos_v1.2.md`                                                                                                  |
| ¿Cómo se versiona y se cambia algo?         | `gcs/GCS_Gestion_de_Configuracion.md`                                                                                      |
| ¿Cómo se despliega?                         | `gcs/despliegue.md`                                                                                                        |
| ¿Cómo se prueba?                            | `sqa/01-plan-sqa-proactivo.md` + `sqa/03-revision-diseno.md` + `sqa/04-revision-codigo.md` + `sqa/05-registro-defectos.md` |
| ¿Qué pantallas hay?                         | `interfaces/README.md` (14 capturas reales con su requisito y su flujo)                                                    |
| ¿Qué hace cada caso de uso y cuánto cuesta? | `analisis/casos-de-uso/` (20 docs) y `analisis/historias-de-uso.md`                                                        |

## 3. Cómo correrlo

Requisitos: Node 22 y npm (el repo trae `bun.lock`; Bun es opcional y no está instalado en el entorno del equipo).

```sh
git clone https://github.com/Joserraldo/urban-mobility-hub.git
cd urban-mobility-hub
npm install
npm run dev        # http://localhost:8080 modo simulado (mock en localStorage)
npm run dev:api    # ⭐ modo completo: SQLite (data/umh.db) + REST /api/* + SSE + pasarela + Brevo
npm run typecheck  # TypeScript sin emitir
npm run lint       # ESLint
npm run test       # Vitest: unitarias + integración (76 pruebas)
npm run test:coverage  # umbral ≥ 80 % en módulos críticos (RNF-12)
npm run test:e2e   # Playwright desktop + móvil contra dev:api
npm run build      # build de producción (preset Nitro cloudflare-module)
```

Scripts verificados en `package.json`: `dev, dev:api, build, build:dev, preview, lint, format, typecheck, test, test:watch, test:coverage, test:e2e`.

Variables de entorno:

- `VITE_DATA_SOURCE` = `mock` (por defecto) o `api`. `dev:api` carga `.env.api` con `api` activa.
- `VITE_SSR_API_BASE`: base que usa el **SSR** para llamar al API propio (en el navegador basta la ruta relativa).
- `BREVO_API_KEY` / `BREVO_SENDER`: correo real; **sin clave el envío queda `simulated`** y la demo no se rompe (RF-27).
- `UMH_SESSION_SECRET` / `UMH_DATA_KEY` / `UMH_DB_PATH`: secretos y ruta de BD del backend de desarrollo (valores default SOLO para demo local).

## 4. Estructura del repositorio

```
src/
├─ routes/            Rutas por archivo (TanStack Start): /, /app, /admin, /entregas, /catalogo/*, /hubs/*, /login, /registro, /mis-reservas, /faq, /guias. __root.tsx es el marco
├─ routeTree.gen.ts   Autogenerado. No editar a mano
├─ components/
│  ├─ Landing.tsx     Landing comercial (SSR, con tarifas de la BD y cuentas demo)
│  ├─ auth/           AuthForm: registro con consentimiento + login (redirect por rol)
│  ├─ mobility/       MobilityApp (mapa), UnlockFlow (desbloqueo), TelemetryDashboard, CourierApp (/entregas), DeliveriesPanel (/admin)
│  ├─ commerce/       Diálogos de compra/reserva con comprobante de pago
│  ├─ catalog/        VehicleCard
│  ├─ common/         Estados de carga/error/vacío
│  └─ ui/             Primitivas shadcn/ui
├─ lib/
│  ├─ data/           ★ Frontera con los datos: types.ts, datasource.ts, mock.ts, api.ts, queries.ts, index.ts
│  ├─ api-client.ts   Hooks de los endpoints v2 (entregas, couriers, notificaciones)
│  ├─ site.ts         SEO: meta, canonical/hreflang, JSON-LD (Organization, Product, Offer, FAQ, llms)
│  ├─ helmet-model.ts Detección de casco: YOLOv8n-ONNX + onnxruntime-web (carga, pre/postproceso NMS)
│  └─ camera.ts / format.ts / …  utilidades
├─ content/           Textos de FAQ y guías (SEO/AEO)
├─ server/
│  ├─ db/             schema.sql (12 tablas) + index.ts (node:sqlite) + seed.ts
│  ├─ repositories.ts ÚNICO archivo que escribe SQL
│  ├─ services/       sessions (firma), pasarela, brevo, fleet-sim (gemelos + cron), stream (SSE)
│  ├─ domain/         reglas puras: unlock.ts, alerts.ts, reservations.ts, tracking.ts (las prueban las unitarias)
│  ├─ api/handlers.ts router REST del desarrollo
│  └─ dev-api-plugin.ts plugin Vite (solo serve) que monta /api/* sobre el dev server
├─ shared/types/      contrato de dominio (dueño: backend; espejo del OpenAPI)
├─ server.ts          Envoltura SSR con página de error
└─ start.ts           createStart + middlewares
docs/api/             Contrato OpenAPI
entregables/          Análisis, diseño, gestión, SQA, GCS, interfaces, manual (+ _tools: render-uml, casos_de_uso.py, capturar.mjs, smoke-api.ps1, seed-capture.ps1)
tests/  .github/  .husky/  lighthouserc.json  (calidad e integración continua)
```

**Regla de oro:** los componentes **nunca** importan datos de `mock.ts` ni de `fleet-data.ts` directamente; usan los _hooks_ de `src/lib/data/queries.ts` (`useVehicles`, `useHubs`, `useFleetLive`, …). Así se cumple RNF-10 y se mitiga RD5.

## 5. Ideas clave de arquitectura

1. **Contrato primero.** `src/lib/data/datasource.ts` define la interfaz `DataSource` (catálogo, alertas, cuenta, reservas, compra, desbloqueo, administración). `types.ts` define los tipos. Cambiar de simulado a real = escribir otra implementación, no tocar pantallas.
2. **Una sola fuente de verdad (RF-17).** Mapa y panel leen de la misma caché de TanStack Query (`keys.vehicles`, `keys.alerts`); `useFleetLive` aplica los eventos en vivo (`position`, `vehicle`, `alert`) a esa caché.
3. **SSR + SEO.** Las páginas públicas se renderizan en servidor; la redirección móvil de RF-01 es **en el cliente** (`routes/index.tsx`, `useMobileRedirect`), ignorando bots, para no dañar el rastreo.
4. **Desbloqueo como sesión.** `UnlockSession` avanza `qr → helmet → ready` (o `denied`/`expired`); `startTrip` solo vale en `ready`.
5. **Detección de casco real (RD7).** `detectHelmet` (camera.ts) intenta el modelo **YOLOv8n-ONNX** (`src/lib/helmet-model.ts`) sobre la cámara con `onnxruntime-web`; si no hay cámara/modelo o falla, cae en el modo simulado (la demo nunca se rompe). El modelo y el runtime están en `public/models` y `public/ort` (estáticos, sin CDN); en dev Vite los sirve `umhOrtPlugin` (resuelve `?import`).
6. **Tiempo real, IoT y persistencia: EXISTEN en el backend de desarrollo.** SQLite con las 12 tablas del DER v2 (`server/db/schema.sql`; en producción → D1 con el mismo esquema, `gcs/despliegue.md`), REST `/api/*` (`server/api/handlers.ts`), tiempo real por SSE (`/api/stream`; WebSocket con Durable Objects queda **[PENDIENTE de despliegue]**), gemelos digitales simulados por intervalo con los topics lógicos `umh/vehicle/{id}/telemetry|alert|unlock` (broker externo: **[PENDIENTE]**). Las secuencias de `diseno/img/` describen exactamente estas rutas y tablas.
7. **Reglas puras en `domain/`.** `verifyHelmet`, `evaluateTelemetry`, `transition` y `rentalCost` no conocen la BD ni HTTP: por eso las unitarias las cubren sin servidor. El API solo las orquesta.
8. **Notificación como efecto lateral (RF-27).** Brevo se llama con `fetch` desde `services/brevo.ts`; el resultado se registra en `notifications` (`sent/failed/simulated`) y jamás cambia el estado del negocio.

### Vistas UML (v3)

Paquetes (`diseno/img/16-paquetes.png`), componentes (`17-componentes.png`) y nodos (`18-nodos.png`); fuentes PlantUML en `entregables/diseno/src/`. Regenerar: `powershell -File entregables/_tools/render-uml.ps1` (requiere Java y `entregables/_tools/plantuml.jar`, ignorado por git; se baja de https://github.com/plantuml/plantuml/releases).

## 6. Glosario mínimo

| Término        | Significado                                                 |
| -------------- | ----------------------------------------------------------- |
| Hub            | Punto físico donde se recogen, devuelven y cargan vehículos |
| Gemelo digital | Copia virtual de un vehículo con posición, batería y alerta |
| Trigger        | Regla que detecta un evento peligroso y crea una alerta     |
| Alertas        | `no-helmet`, `crash`, `gps-lost`, `low-battery` (más `ok`)  |
| RF / RNF       | Requisito funcional / no funcional del SRS                  |
| RDn            | Riesgo de desarrollo n (Análisis de Riesgos)                |

## 7. Cómo hacer un cambio sin romper nada

1. Rama `feature/<tema>` desde `main` (nunca directo a `main`).
2. Si cambia un requisito, abre una _solicitud de cambio_ (plantilla en `.github/ISSUE_TEMPLATE/solicitud-cambio.yml`).
3. _Commits_ convencionales (`feat:`, `fix:`, `docs:`…); `commitlint` los valida con Husky.
4. Antes del PR: `npm run lint && npm run typecheck && npm run build`.
5. El PR usa la plantilla `.github/pull_request_template.md`; CI debe quedar en verde (`.github/workflows/ci.yml`).
   Detalle completo en `gcs/GCS_Gestion_de_Configuracion.md`.

## 8. Trampas conocidas

- `src/routeTree.gen.ts` se regenera solo; no lo edites.
- `helmet-model.ts` importa `onnxruntime-web` (solo cliente): el runtime WASM está en `public/ort/`; en dev Vite devuelve 500 a `/ort/*.mjs?import` si falta `umhOrtPlugin` (ya montado en `vite.config.ts`).
- `UnlockFlow.tsx` ya pasa por `DataSource` (no por `fleet-data`, que fue eliminado como código muerto el 8-oct).
- El backend de desarrollo solo se monta con `npm run dev:api` (en `npm run dev` los `/api/*` dan 404 SSR: es el modo mock, no un fallo).
- En SSR no existe `window`: el adaptador `api` arma la URL con `VITE_SSR_API_BASE`; si ves `Failed to parse URL`, es que falta esa base.
- `PATCH /api/deliveries/:id` también acepta `POST` con `{action}` (alias para clientes/herramientas sin PATCH).
- Reset de la demo: borrar `data/umh.db` (el seed reaparece solo); para la historia de capturas usa `powershell -File entregables/_tools/seed-capture.ps1`.
- Los avisos de codificación (tildes rotas) en algunos archivos al leerlos con PowerShell son del visor, no del archivo: están en UTF-8.
- Bun no está instalado: usa npm. Si el lockfile cambia, coordina con CI.
- El puerto de desarrollo es 8080, no 3000.
- Windows + PowerShell 5.1: no uses `-replace` sobre `package.json`/`.env` con backticks (rompe JSON); edita con herramientas de archivo.

## 9. Estado de este manual

- [x] `ApiDataSource`, rutas `/api/*`, SSE y topics lógicos documentados (§5 y `diseno/README.md` §6-§14).
- [x] Comandos de pruebas (`npm test`, `test:coverage`, `test:e2e`) y su umbral.
- [x] Compilación de interfaces: `interfaces/` generada con `_tools/capturar.mjs`.
- [ ] Sección de despliegue con la URL pública **[PENDIENTE: publicar en Cloudflare Pages/Workers]**.
- [ ] WebSocket con Durable Objects + broker MQTT real (ver `gcs/despliegue.md` §3-4 al migrar de D1).
- [x] Revisión final contra el código (checklist en `diseno/README.md` §15; hallazgos en `sqa/03` y `sqa/04`).
