# Manual técnico — Urban Mobility Hub

Para quien entra al proyecto por primera vez y no quiere perderse. Léelo en orden; cada sección responde una pregunta.
Estado del documento: **1-oct-2026**, escrito leyendo el repositorio (`main` + cambios locales de frontend). Lo que aún no existe está marcado **[PENDIENTE]**; no lo des por hecho.

## 1. ¿Qué es el sistema?

Una plataforma web (PWA) para **vender y alquilar** patinetas eléctricas, bicicletas y drones, con mapa en tiempo real y **alertas de seguridad IoT**. No hay vehículos físicos: la flota se simula con *gemelos digitales* (copias virtuales con los mismos datos que tendría el vehículo real). Proyecto académico UNAB, Ingeniería de Software II. Requisitos en `gestion/SRS_v1.2.md` (propuesto) y el SRS v1.1 original.

Mapa mental en una frase: **la pantalla pide datos a una interfaz (`DataSource`); detrás hay una versión simulada (hoy) y otra real por REST [PENDIENTE]**.

## 2. Mapa de documentos (dónde mirar qué)

| Pregunta | Documento |
|---|---|
| ¿Quién usa el sistema y para qué? | `analisis/README.md` §1 (casos de uso) |
| ¿Cómo viajan los datos? | `analisis/README.md` §2–3 (DFD 0 y 1) |
| ¿Cómo está armado? | `diseno/README.md` (C4, componentes, despliegue) |
| ¿Cómo se desbloquea / cómo sale una alerta? | `diseno/README.md` §6–7 |
| ¿Qué riesgos hay? | `gestion/Riesgos_v1.2.md` |
| ¿Cómo se versiona y se cambia algo? | `gcs/GCS_Gestion_de_Configuracion.md` |
| ¿Cómo se despliega? | `gcs/despliegue.md` |
| ¿Cómo se prueba? | `sqa/01-plan-sqa-proactivo.md` |
| ¿Qué pantallas hay? | `interfaces/` **[PENDIENTE: requiere app corriendo]** |

## 3. Cómo correrlo

Requisitos: Node 22 y npm (el repo trae `bun.lock`; Bun es opcional y no está instalado en el entorno del equipo).

```sh
git clone https://github.com/Joserraldo/urban-mobility-hub.git
cd urban-mobility-hub
npm install
npm run dev        # http://localhost:8080 (puerto fijado en vite.config.ts)
npm run typecheck  # TypeScript sin emitir
npm run lint       # ESLint
npm run build      # build de producción (preset Nitro cloudflare-module)
```

Scripts verificados en `package.json`: `dev, build, build:dev, preview, lint, format, typecheck`. No hay script `test` todavía **[PENDIENTE: lo agrega QA]**.

Variable de entorno: `VITE_DATA_SOURCE` = `mock` (por defecto) o `api`. Hoy ambas opciones devuelven el adaptador *mock* (`src/lib/data/index.ts`); el adaptador `api` **[PENDIENTE]**.

## 4. Estructura del repositorio

```
src/
├─ routes/            Rutas por archivo (TanStack Start). __root.tsx es el marco; index.tsx = /, app.tsx = /app, admin.tsx = /admin
├─ routeTree.gen.ts   Autogenerado. No editar a mano
├─ components/
│  ├─ Landing.tsx     Landing comercial
│  ├─ mobility/       MobilityApp (mapa), UnlockFlow (desbloqueo), TelemetryDashboard (/admin)
│  ├─ catalog/        VehicleCard
│  ├─ common/         Estados de carga/error/vacío
│  └─ ui/             Primitivas shadcn/ui
├─ lib/
│  ├─ data/           ★ Frontera con los datos: types.ts, datasource.ts, mock.ts, queries.ts, index.ts
│  ├─ site.ts         SEO: metadatos y JSON-LD
│  └─ fleet-data.ts   Datos mock antiguos (se está migrando a lib/data)
├─ content/           Textos de FAQ y guías (SEO/AEO)
├─ server.ts          Envoltura SSR con página de error
└─ start.ts           createStart + middlewares
docs/api/             Contrato OpenAPI [vacío: lo publica backend]
tests/  scripts/  .github/  .husky/  lighthouserc.json  (calidad e integración continua)
```

**Regla de oro:** los componentes **nunca** importan datos de `mock.ts` ni de `fleet-data.ts` directamente; usan los *hooks* de `src/lib/data/queries.ts` (`useVehicles`, `useHubs`, `useFleetLive`, …). Así se cumple RNF-10 y se mitiga RD5.

## 5. Ideas clave de arquitectura

1. **Contrato primero.** `src/lib/data/datasource.ts` define la interfaz `DataSource` (catálogo, alertas, cuenta, reservas, compra, desbloqueo, administración). `types.ts` define los tipos. Cambiar de simulado a real = escribir otra implementación, no tocar pantallas.
2. **Una sola fuente de verdad (RF-17).** Mapa y panel leen de la misma caché de TanStack Query (`keys.vehicles`, `keys.alerts`); `useFleetLive` aplica los eventos en vivo (`position`, `vehicle`, `alert`) a esa caché.
3. **SSR + SEO.** Las páginas públicas se renderizan en servidor; la redirección móvil de RF-01 es **en el cliente** (`routes/index.tsx`, `useMobileRedirect`), ignorando bots, para no dañar el rastreo.
4. **Desbloqueo como sesión.** `UnlockSession` avanza `qr → helmet → ready` (o `denied`/`expired`); `startTrip` solo vale en `ready`.
5. **Tiempo real, IoT y persistencia: [PENDIENTE]** (decisiones D2–D4: SQLite+Drizzle, WebSocket/SSE, MQTT con aedes). Los diagramas de `diseno/` los describen como arquitectura objetivo.

## 6. Glosario mínimo

| Término | Significado |
|---|---|
| Hub | Punto físico donde se recogen, devuelven y cargan vehículos |
| Gemelo digital | Copia virtual de un vehículo con posición, batería y alerta |
| Trigger | Regla que detecta un evento peligroso y crea una alerta |
| Alertas | `no-helmet`, `crash`, `gps-lost`, `low-battery` (más `ok`) |
| RF / RNF | Requisito funcional / no funcional del SRS |
| RDn | Riesgo de desarrollo n (Análisis de Riesgos) |

## 7. Cómo hacer un cambio sin romper nada

1. Rama `feature/<tema>` desde `main` (nunca directo a `main`).
2. Si cambia un requisito, abre una *solicitud de cambio* (plantilla en `.github/ISSUE_TEMPLATE/solicitud-cambio.yml`).
3. *Commits* convencionales (`feat:`, `fix:`, `docs:`…); `commitlint` los valida con Husky.
4. Antes del PR: `npm run lint && npm run typecheck && npm run build`.
5. El PR usa la plantilla `.github/pull_request_template.md`; CI debe quedar en verde (`.github/workflows/ci.yml`).
Detalle completo en `gcs/GCS_Gestion_de_Configuracion.md`.

## 8. Trampas conocidas

- `src/routeTree.gen.ts` se regenera solo; no lo edites.
- `UnlockFlow.tsx` aún simula el escaneo y la verificación con temporizador (3 s) y usa `lib/fleet-data`: todavía no pasa por `DataSource` **[en curso en FE-1]**.
- Los avisos de codificación (tildes rotas) en algunos archivos al leerlos con PowerShell son del visor, no del archivo: están en UTF-8.
- Bun no está instalado: usa npm. Si el lockfile cambia, coordina con CI.
- El puerto de desarrollo es 8080, no 3000.

## 9. Pendientes para cerrar este manual

- [ ] Documentar `ApiDataSource`, rutas `/api/*`, WebSocket y topics MQTT cuando backend publique el contrato.
- [ ] Añadir comando de pruebas (`npm test`) y de cobertura.
- [ ] Añadir sección de despliegue con la URL pública.
- [ ] Revisión final contra el código de la entrega (checklist en `diseno/README.md` §11).
