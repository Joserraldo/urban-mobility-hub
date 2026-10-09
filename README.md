# Urban Mobility Hub

[![CI](https://github.com/Joserraldo/urban-mobility-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/Joserraldo/urban-mobility-hub/actions/workflows/ci.yml)

Plataforma multimodal de micromovilidad, logística y venta de vehículos urbanos. El proyecto integra en una sola solución la **venta** y el **alquiler** de patinetas eléctricas, bicicletas y drones urbanos, con seguimiento de flota en tiempo real sobre un mapa interactivo y un sistema de seguridad IoT basado en gemelos digitales (_digital twins_).

> Proyecto académico — Ingeniería de Software II, Universidad Autónoma de Bucaramanga (UNAB).

## Estado actual

Este repositorio corresponde al **segundo avance**: portal web funcional con **backend real** (SQLite en desarrollo vía `npm run dev:api`; el plan de producción usa D1), roles de **cliente, operador y domiciliario**, pago con comprobante, entrega a domicilio con aviso de retraso por correo (Brevo) y flota **simulada mediante gemelos digitales** (a futuro, hardware IoT real con placas Raspberry Pi). No opera con vehículos físicos todavía.

## Funcionalidades

### Landing page (`/`)

Portal de negocio responsivo con SEO/GEO/AEO (SSR, JSON-LD, sitemap, llms.txt): servicios, tarifas reales leídas de la BD, sección de entrega a domicilio, seguridad IoT y CTA con cuentas de demostración. En móvil entra directo a la app de mapa (decisión en cliente, no daña el rastreo).

### App de usuario (`/app`)

- Control dual **Alquilar vs. Comprar** sobre el mapa.
- **Mapa interactivo multicapa** con la flota simulada: patinetas disponibles, hubs/puntos de recolección y stock de venta.
- Alquiler en estación o a domicilio; catálogo e-commerce en modo compra.
- Panel de detalle por hub: capacidad, vehículos disponibles para alquiler y venta.
- **Flujo de desbloqueo** (simulado): escáner QR → verificación de casco por cámara → inicio de viaje.

### Panel de telemetría / digital twin (`/admin`)

- Métricas de flota: vehículos activos, batería promedio, hubs operativos.
- Tabla de flota en vivo (ID, tipo, modo, batería, GPS/hub, alertas IoT).
- **Simulador de triggers**: sin casco, accidente/caída, pérdida de GPS, con alertas inmediatas.
- **Entregas (UC14/UC19)**: asignar reservas de domicilio a un domiciliario con deadline y bitácora de correos Brevo (`sent/simulated/failed`).

### Bandeja del domiciliario (`/entregas`)

Vista por rol (`courier`): entregas asignadas ordenadas por vencimiento, iniciar entrega, confirmarla y marcar retrasos (dispara el aviso por correo).

### Backend de desarrollo (`npm run dev:api`)

REST real `/api/*` sobre SQLite (`node:sqlite`) con los nombres de tabla citados en los diagramas: `users, consents, biometric_templates, hubs, vehicles, reservations, purchases, payments, deliveries, alert_log, unlock_sessions, notifications`. Incluye sesión firmada (httpOnly), RBAC por rol, SSE en vivo (`/api/stream`), pasarela de pagos simulada e integración Brevo por REST con modo `simulated` sin clave. Contrato publicado en `docs/api/openapi.yaml`.

La flota, los hubs y los vehículos se modelan como **gemelos digitales en SQLite**; mapa, panel y bandeja leen de la misma fuente.

## Stack técnico

| Capa            | Tecnología                                                                       |
| --------------- | -------------------------------------------------------------------------------- |
| Framework       | [TanStack Start](https://tanstack.com/start) (React 19, SSR, file-based routing) |
| Build           | Vite + Nitro (target Cloudflare)                                                 |
| UI              | Tailwind CSS 4 + [shadcn/ui](https://ui.shadcn.com)                              |
| Estado/servidor | TanStack Router + TanStack Query                                                 |
| Gráficas        | Recharts                                                                         |
| Animaciones     | Framer Motion                                                                    |
| Lenguaje        | TypeScript                                                                       |

## Cómo correr

Requiere [Bun](https://bun.sh) (recomendado, el repo usa `bun.lock`) o Node.js + npm.

```sh
git clone https://github.com/Joserraldo/urban-mobility-hub.git
cd urban-mobility-hub
bun install   # o: npm install

bun run dev        # portal en modo simulado (mock, sin backend) — http://localhost:8080
bun run dev:api    # ⭐ modo completo: backend SQLite + SSE + pasarela + Brevo (data/umh.db)
bun run build      # build de producción (.output/)
bun run preview    # previsualizar el build
bun run lint       # ESLint
bun run typecheck  # TypeScript sin emitir
bun run test       # unitarias + integración (Vitest)
bun run test:coverage  # umbral ≥ 80 % en módulos críticos (RNF-12)
bun run test:e2e   # Playwright (desktop + móvil, contra dev:api)
```

Cuentas de demostración (modo `dev:api`): `cliente@demo.co`, `operador@demo.co`, `domi1@demo.co` — contraseña `Demo1234!`.

## Estructura del proyecto

```
src/
├── routes/          # Rutas (TanStack Start, file-based): /, /app, /admin, /entregas, /catalogo, /hubs, /login, /registro, /mis-reservas, /faq, /guias
├── components/
│   ├── mobility/    # App de mapa, flujo de desbloqueo, dashboard de telemetría, bandeja del domiciliario, panel de entregas
│   ├── auth/        # Registro y login con consentimiento (Ley 1581)
│   ├── commerce/    # Diálogos de compra/reserva con referencia de pago
│   ├── Landing.tsx  # Portal de negocio
│   └── ui/          # Primitivas shadcn/ui
├── lib/
│   ├── data/        # Interfaz DataSource + adaptadores mock (demo sin backend) y api (REST real)
│   └── api-client.ts# Endpoints de entregas/notificaciones (v2)
├── server/
│   ├── db/          # schema.sql (12 tablas) + cliente SQLite + seed de demo
│   ├── repositories.ts  # únicos que escriben SQL
│   ├── services/    # sesiones firmadas, pasarela, Brevo, simulador de gemelos, SSE
│   ├── domain/      # reglas puras: desbloqueo, alertas, reservas, tracking
│   └── api/handlers.ts  # router REST /api/* del desarrollo
├── server.ts        # Entradas de servidor (wrapper SSR)
└── start.ts         # createStart + middlewares (CSRF en server functions)
entregables/         # TODA la documentación: análisis, diseño, gestión, SQA, GCS, interfaces, manual
docs/api/            # contrato OpenAPI
tests/               # unitarias, integración y e2e
```

## Documentación

Toda la documentación del proyecto **está versionada en este repo**, en `entregables/`:

| Dónde                         | Qué hay                                                                                                                                                                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entregables/analisis/`       | Diagrama de casos de uso (maestro + 3 planos por rol) con simbología UML estricta, DFD, **20 casos de uso descritos** (`casos-de-uso/`), plantillas (`plantillas/`) y **historias de usuario** planificadas (`historias-de-uso.md`) |
| `entregables/diseno/`         | C4 (contexto/contenedores), componentes, despliegue, clases, **6 secuencias con tablas reales**, DER v2, estados de reserva/vehículo/entrega                                                                                        |
| `entregables/gestion/`        | SRS v1.2 (con RF-25/26/27), Plan de desarrollo, Análisis de riesgos                                                                                                                                                                 |
| `entregables/sqa/`            | Plan SQA proactivo, revisiones de SRS/diseño/código, **registro de defectos**                                                                                                                                                       |
| `entregables/gcs/`            | Gestión de configuración y **plan de despliegue** (Cloudflare D1)                                                                                                                                                                   |
| `entregables/manual-tecnico/` | Manual técnico para quien mantenga el sistema                                                                                                                                                                                       |
| `entregables/interfaces/`     | **Compilación de interfaces**: captura real de cada pantalla con su requisito                                                                                                                                                       |
| `docs/api/openapi.yaml`       | Contrato REST `/api/*`                                                                                                                                                                                                              |

> Los diagramas se regeneran desde código: `powershell -File entregables/_tools/render-uml.ps1` (PlantUML) y `python entregables/_tools/casos_de_uso.py` (casos de uso). No edites los PNG a mano.
