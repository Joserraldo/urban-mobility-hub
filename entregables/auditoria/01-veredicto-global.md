# 01 · Veredicto global

## 1. Veredicto en una frase

El sistema **funciona**: los 27 requisitos funcionales tienen implementación real y los flujos de
punta a punta se ejecutan. Las brechas no están en “faltan pantallas”, sino en **profundidad**:
operaciones que el SRS pide y la interfaz no expone (editar, revocar), garantías que el SRS exige y
el código no cumple (transacción atómica, timeout de pago), **privacidad biométrica** que el propio
texto legal de la pantalla declara pero el código no hace, **accesibilidad** por debajo del umbral
documentado y una **arquitectura de producción que no existe** en el artefacto entregado.

## 2. Tablero de madurez

| Dimensión                          | Lo que promete el documento                              | Lo que hay                                      | Veredicto |
| ---------------------------------- | -------------------------------------------------------- | ----------------------------------------------- | --------- |
| Requisitos funcionales (27)        | RF-01…RF-27 implementados y verificados                   | 19 cumplen · 7 parciales · 1 no cumple           | 🟡 Alto   |
| Requisitos no funcionales (12)     | RNF-01…RNF-12 medidos                                     | 7 cumplen · 2 parciales · 2 fallan · 1 sin medir | 🟡 Medio  |
| Casos de uso (20)                  | UC01…UC20 con flujos, alternos y excepciones              | 18 verificables · 2 con excepciones no modeladas | 🟡 Alto   |
| Arquitectura objetivo              | REST + WebSocket + MQTT + SQLite/D1                       | REST + SSE + SQLite en dev; sin WS/MQTT/D1       | ❌ Bajo   |
| Despliegue                         | Cloudflare Workers/Pages + D1 + Durable Objects           | Nada publicado; el build no sirve `/api/*`       | ❌ Nulo   |
| SQA                                | Plan proactivo + matriz de trazabilidad + informe         | Plan y revisiones; faltan 2 artefactos           | 🟡 Medio  |
| Gestión de configuración           | Ramas, tags v0.1–v0.3, LB-0…LB-3, `main` protegida         | Sin `.git` en la copia; sin tags ni PRs          | ❌ Nulo   |
| Coherencia documental              | Documentos = diagramas = tablas = pantallas               | Varias cifras y estados ya no coinciden          | 🟡 Medio  |
| Calidad ejecutable local           | Lint, tipos, 82 pruebas, cobertura ≥ 80 %, build           | Todo verde                                       | ✅ Alto   |

Lectura honesta del tablero: **lo construido es más de lo que la documentación admite y menos de lo
que la documentación promete**. El HANDOFF describe un estado anterior y más optimista; el SRS v1.2
describe un objetivo que el código aún no alcanza.

## 3. Las diez brechas que más pesan

Ordenadas por riesgo para la entrega, no por facilidad de arreglo.

| #   | Brecha                                                                                                                           | Requisito        | Evidencia                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| B1  | **La plantilla biométrica no está cifrada ni es una plantilla.** El servidor guarda el literal `"plantilla-demo-no-biometria-real"`; el navegador guarda un vector 16×16 en `localStorage` en texto plano. | RNF-03, RF-22    | `src/server/repositories.ts:315-321`, `src/lib/camera.ts:43-75`                                   |
| B2  | **No se puede enrolar el rostro en modo API.** El registro solo crea consentimiento `datos_personales`; el endpoint exige `biometria` y responde 422. No hay forma de otorgarlo desde la interfaz. | RF-20, RF-22     | `AuthForm.tsx:37,51,110-125`; prueba real: `POST /api/auth/face` → **422**                        |
| B3  | **El veredicto de casco y el score facial los calcula el cliente y el servidor los acepta.** Un cliente manipulado puede enviar `confidence: 1` o `score: 1`. | RF-09, RF-10, RNF-03 | `UnlockFlow.tsx:108-133`; `handlers.ts:350-388`                                              |
| B4  | **La accesibilidad no llega al umbral.** Lighthouse sobre build de producción: `/` = **80** (< 90 exigido por RNF-11); causas: contraste, `definition-list`/`dlitem`, `list`/`listitem`. | RNF-11           | `.lighthouseci/lhr-*.json`; `lighthouserc.json`                                                   |
| B5  | **El build de producción no sirve la API.** `umhApiPlugin` solo se registra con `command === "serve"`; el servidor Node arranca y sirve SSR (200), pero `/api/health` → **404**. | RNF-10, despliegue | `vite.config.ts:47`; prueba: `node .output/server/index.mjs` → `/api/health` 404                  |
| B6  | **La confirmación de entrega no es atómica.** Son tres escrituras separadas (entrega, reserva, vehículo) sin transacción; además la reserva pasa a `completed` de inmediato y el vehículo queda `in_use`. | RF-25            | `handlers.ts:616-623`                                                                             |
| B7  | **No existe el camino de timeout del pago.** La pasarela simulada solo devuelve `approved`/`rejected`; UC18-E2 exige `rejected` con `reason='timeout'` y negocio intacto. | RF-26, UC18      | `src/server/services/pasarela.ts:24-34`; `handlers.ts:684-707`                                    |
| B8  | **Las alertas activas se borran solas cada 2 s.** El simulador reevalúa con telemetría “sana” y devuelve `alert_state` a `ok`; el KPI de alertas activas cae a 0 aunque el evento quede en la bitácora. | RF-11, RF-12     | `src/server/services/fleet-sim.ts:27-50,62-66`                                                    |
| B9  | **Los artefactos SQA prometidos no existen.** El plan cita `03-matriz-trazabilidad.md` y `04-informe-ejecucion.md`; el directorio solo tiene 01, 02, 03, 04-revisión y 05. | Plan SQA §3       | `entregables/sqa/`                                                                                |
| B10 | **La configuración prometida no es verificable.** La copia no trae `.git`: no hay ramas, tags `v0.1…v0.3`, LB-0…LB-3, PRs ni CI ejecutado. | GCS §3, §5, §6   | ZIP sin `.git`; `git log` vacío antes de `ed9b49c`                                                |

## 4. Lo que sí está sólido (para no equilibrar mal el juicio)

- **Cobertura funcional real.** Compra, alquiler en dos modalidades, pago con comprobante, viaje,
  desbloqueo en tres pasos, alertas, KPIs, gemelos, entregas con domiciliario y aviso de retraso
  funcionan de punta a punta en modo API y en modo mock.
- **La IA de casco es real, no un mock.** YOLOv8n exportado a ONNX, ejecutado en el navegador con
  `onnxruntime-web` servido localmente (sin CDN): estado `ready`, confianza 0,7974 en la imagen de
  prueba, ~0,7–0,9 s en caliente. El *fallback* simulado se declara en pantalla
  (`helmetSource`), no se disfraza de IA.
- **Separación por `DataSource`.** `mock` y `api` implementan el mismo contrato; el cambio de fuente
  no toca componentes (RNF-10 bien resuelto, con la salvedad del build).
- **Dominio desacoplado y probado.** `src/server/domain/*` concentra la lógica crítica y alcanza
  90–100 % de cobertura; las pruebas incluyen casos límite, no solo caminos felices.
- **Seguridad básica del servidor.** Contraseñas con `scrypt` + sal, comparación en tiempo constante,
  sesión firmada con HMAC y expiración, RBAC verificado en API (401/403), *cookies* `httpOnly`.
- **CI bien diseñado.** `.github/workflows/ci.yml` contempla lint, tipos, cobertura, build, auditoría
  de dependencias, Playwright y Lighthouse con el preset correcto. El diseño del pipeline es mejor
  que el estado del repositorio.

## 5. Estado de los hallazgos previos (R1–R9)

El informe del 26-oct ya había señalado nueve mejoras. Este es su estado real tras inspeccionar el
código, no lo que el HANDOFF dice de ellas.

| ID  | Hallazgo previo                                   | Estado ahora | Evidencia / motivo                                                                                         |
| --- | ------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------- |
| R1  | Unificar umbrales de confianza del casco          | ❌ Abierto   | El modelo detecta desde `0.4` (`helmet-model.ts:11`) y el servidor acepta desde `0.8` (`unlock.ts:5,54`). La UI puede mostrar “casco detectado” y el servidor rechazarlo. |
| R2  | Evitar que las alertas IoT se borren solas        | ❌ Abierto   | Confirmado: `moveFleet()` cada 2 s reescribe `alert_state='ok'` (`fleet-sim.ts:27-50`).                     |
| R3  | Alinear credenciales demo entre modos             | 🟡 Parcial   | El recuadro aclara “backend: npm run dev:api”, pero en mock las cuentas siguen siendo `usuario@nodo.co` / `operador@nodo.co` y no se muestran. |
| R4  | Comando de previsualización del build             | 🟡 Parcial   | `preview:node` existe, pero el preset por defecto es `cloudflare-module`: sin `NITRO_PRESET=node_server` falla; y el build no expone `/api/*`. |
| R5  | Guiar al desbloquear sin reserva                  | 🟡 Parcial   | Hay guía para sesión ausente/401 (`UnlockFlow.tsx:216-229`), pero no un mensaje explícito “primero reserva este vehículo”. |
| R6  | Devolver 404 en rutas dinámicas inexistentes      | ✅ Cerrado   | `catalogo.$slug`, `guias.$slug` y `hubs.$hubId` lanzan `notFound()` y tienen `notFoundComponent`.           |
| R7  | Reforzar la confianza en el veredicto del casco   | ❌ Abierto   | El servidor confía en `helmetDetected` y `confidence` enviados por el navegador; no hay re-inferencia ni firma. |
| R8  | Evitar el reinicio de cámara entre QR y casco     | ❌ Abierto   | `useCamera` depende de `[enabled, facing]`; al pasar de `environment` (QR) a `user` (casco) el efecto limpia el stream y llama otra vez a `getUserMedia` (`camera.ts:13-38`). |
| R9  | Mantenimiento de dependencias y pruebas E2E       | ❌ Abierto   | Playwright no se puede ejecutar en esta copia (sin navegadores; el *fallback* a Chromium de Puppeteer no existe). Ver §7. |

Resultado: **1 cerrado, 3 parciales, 5 abiertos**. El HANDOFF afirmaba que R1–R9 estaban resueltos
salvo los pendientes de despliegue y Brevo; no es así.

## 6. Delta entre lo declarado y lo reproducible

| Afirmación del HANDOFF / documentos                  | Realidad medida                                                                                     |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| “Vitest 76/76”                                       | **82/82** (9 archivos). La cifra quedó corta, no inflada.                                            |
| “Playwright 13/14”                                   | No reproducible: no hay navegadores instalados. En el código hay **10** llamadas `test()` en 3 specs. |
| “Lighthouse `/` a11y 96”                             | **80** con el mismo `lhci` y build de producción. El umbral de 90 **falla**.                         |
| “Cobertura dominio 94 % (umbral 80 ✓ RNF-12)”         | Cierto en el número, pero el umbral solo cubre `src/server/domain/**` (52 sentencias). Servicios y API quedan fuera (D-15). |
| “UC13 quedó planificado, falta UI”                   | La UI de catálogo/hubs **existe** (`AdminCatalog.tsx`): alta y baja de vehículos y hubs. Lo que falta es **editar**. |
| “HU-13a/b planificadas”                              | Implementadas parcialmente (sin edición).                                                           |
| “`smoke-api.ps1` 13/13”                              | No se ejecutó en esta auditoría; los flujos equivalentes se probaron a mano y con la suite.          |
| “`main` protegida, ramas feature/*, tags v0.2”        | No verificable: la copia no incluye historial Git.                                                  |
| “Plan listo, nada publicado”                         | Confirmado. Es el único documento que no exagera el estado.                                          |

## 7. Riesgo de la evidencia faltante (E2E)

Las pruebas E2E son el eslabón más débil de la verificación:

- `playwright.config.ts` busca Chromium en `~/.cache/puppeteer/chrome`; en esta máquina no existe.
- `npx playwright install` no se ejecutó (descarga de navegadores).
- Por tanto, **los 3 specs (`landing`, `smoke`, `helmet-ai`) no se corrieron**. La afirmación
  “13/14” no se puede sostener ni refutar aquí; solo se puede decir que el número de `test()`
  declarados es 10 y que hay 2 proyectos configurados.
- Consecuencia para el informe: todo lo marcado como “verificado” en `02` y `04` proviene de
  ejecución manual + pruebas unitarias/integración, **no** de E2E automatizado.

## 8. Conclusión

El proyecto está en un punto intermedio-real: **el 2.º avance está esencialmente cumplido** en
funcionalidad, y el 3.er avance (tiempo real, IoT simulado, panel completo, cobertura, despliegue)
está cumplido **a medias**: hay SSE en lugar de WebSocket, simulador en lugar de MQTT, panel
completo pero con alertas que se autolimpian, cobertura sobre un perímetro estrecho y despliegue
inexistente.

Lo que impide declarar el sistema “listo para la entrega final” no es la falta de features, sino
cuatro cosas concretas y acotadas:

1. la **biometría** (B1, B2, B3), que además es un riesgo legal declarado (RD11);
2. la **accesibilidad** (B4), que es una meta numérica ya escrita en el SRS;
3. las **garantías transaccionales** de pago y entrega (B6, B7);
4. la **arquitectura de producción** (B5, B10).

Las cuatro son abordables en el tiempo que queda (25-nov y 2-dic) si se priorizan como en
`06-backlog-priorizado.md`, y ninguna exige rehacer el producto.
