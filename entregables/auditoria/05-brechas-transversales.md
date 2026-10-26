# 05 · Brechas transversales

Lo que sigue no pertenece a un RF concreto: son decisiones de arquitectura, proceso y
documentación que afectan a varios requisitos a la vez y que explican por qué el tablero de
`01-veredicto-global.md` no es todo verde.

## 1. Stack y arquitectura: lo prometido frente a lo construido

### 1.1 Tabla de sustitución

| Pieza prometida (Plan v1.2 §7, SRS §3.4) | Lo que hay realmente                                        | Consecuencia                                                       |
| ---------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| SQLite **con Drizzle**                   | `node:sqlite` directo (`DatabaseSync`) + SQL a mano           | Sin ORM, sin migraciones tipadas; `schema.sql` se ejecuta completo |
| **WebSocket** para posición y alertas    | **SSE** (`/api/stream`, `text/event-stream`)                  | Unidireccional; no se puede enviar nada del cliente al servidor     |
| **SSE de respaldo**                      | SSE es el único canal                                        | El “respaldo” es en realidad el mecanismo principal                 |
| **MQTT** con broker `aedes` y topics `umh/vehicle/{id}/telemetry` | `setInterval` cada 2 s que llama a `applyTelemetry()` | No hay broker, ni topics, ni publicadores; el contrato MQTT no existe en código |
| **Cloudflare D1 + Durable Objects**      | Nada: no hay `wrangler`, ni `@cloudflare/*`, ni configuración | El despliegue es un plan, no una implementación                     |
| TanStack Start + React 19 + Tailwind 4   | ✅ Exactamente eso                                            | —                                                                   |

**Lectura.** La arquitectura del SRS v1.2 §1.2 describe un sistema con tiempo real bidireccional y
broker MQTT. El código implementa una variante **más simple y funcional** (SSE + simulador en
proceso), que es defendible como decisión de alcance, pero **no está declarada como tal en el SRS**:
el SRS sigue prometiendo WebSocket y MQTT. El único documento que lo dice claro es
`gcs/despliegue.md` (“no hay MQTT/aedes, SSE only, D1/DO pendiente”). Esa frase debería estar en el
SRS, no escondida en el plan de despliegue.

### 1.2 El build de producción no sirve la API

`vite.config.ts` registra el plugin del backend **solo en modo `serve` y solo si
`VITE_DATA_SOURCE=api`**:

```ts
...(command === "serve" && env["VITE_DATA_SOURCE"] === "api" ? [umhApiPlugin()] : []),
```

El servidor de producción (`src/server.ts`) solo delega en TanStack Start; **no enruta `/api/*`**.

Verificación ejecutada:

```
NITRO_PRESET=node_server npm run build
node .output/server/index.mjs
GET /            → 200 (78 198 bytes, HTML completo)
GET /catalogo    → 200 (20 069 bytes)
GET /api/health  → 404
```

**Impacto.** El artefacto que se despliega sirve la interfaz, pero **no los datos**. Cualquier
despliegue con `VITE_DATA_SOURCE=api` queda con una aplicación que renderiza y luego falla en cada
llamada. Es el hallazgo que más invalida la frase “backend real”: el backend real existe **solo en
el servidor de desarrollo**.

**Qué haría falta.** Rutas de servidor reales (TanStack Start server routes o un Worker) que
importen `handle()` y se enlacen a D1; y un `preview` que arranque ese servidor, no solo el SSR.

### 1.3 Contrato OpenAPI desalineado

`docs/api/openapi.yaml` declara **39 rutas**; el router implementa **35**. Faltan:

| Ruta declarada                    | Estado                                                        |
| --------------------------------- | ------------------------------------------------------------- |
| `WS /api/ws`                      | No existe (no hay WebSocket)                                  |
| `GET /api/map/config`             | No existe (la config del mapa se resuelve en el cliente)      |
| `GET /api/realtime/config`        | No existe                                                      |
| `POST /api/reservations/{id}/finish` | No existe; el cierre real es `POST /api/trips/{id}/end`    |

Además, el contrato declara `PATCH /api/deliveries/{id}` y el código acepta `POST` como alias no
documentado. En un proyecto “contract-first” (RNF-10), esto es una brecha de contrato: un cliente
generado desde el OpenAPI llamaría a rutas que devuelven 404.

## 2. Despliegue

`entregables/gcs/despliegue.md` es honesto: **“plan listo, nada publicado”**. Se confirma:

- no hay cuentas ni recursos Cloudflare;
- no hay `wrangler.toml` ni dependencia `wrangler`;
- no hay dominio, ni D1, ni Durable Objects, ni secretos configurados;
- el CI define un job de Lighthouse que construye con `NITRO_PRESET=node_server`, lo que confirma
  que el equipo ya sabía que el preset por defecto no sirve para previsualizar.

**Consecuencias sobre requisitos:**

| Requisito | Efecto                                                                 |
| --------- | ---------------------------------------------------------------------- |
| RNF-06    | No hay periodo de pruebas en producción → disponibilidad no medible     |
| RNF-11    | Lighthouse se midió sobre local, no sobre el dominio público           |
| RF-27     | Brevo nunca se ejecutó con clave real                                  |
| GCS       | No hay tag `v0.2` desplegado ni release verificable                    |

No es un “defecto de código”, pero sí una brecha grande frente a lo que el Plan llama “entrega
final”.

## 3. SQA

### 3.1 Artefactos prometidos que no existen

El plan SQA (`01-plan-sqa-proactivo.md`) cita dos artefactos que **no están en el directorio**:

| Artefacto prometido              | Dónde se promete                    | Estado   |
| -------------------------------- | ----------------------------------- | -------- |
| `03-matriz-trazabilidad.md`      | §3 (matriz viva RF → prueba → resultado) | **Ausente** |
| `04-informe-ejecucion.md`        | §3 y §5 (resultados, latencias, retro)   | **Ausente** |

Lo que sí existe es `03-revision-diseno.md` y `04-revision-codigo.md`, que son **revisiones**, no la
matriz ni el informe de ejecución. La numeración además colisiona: el plan habla de `03` y `04` con
otro contenido. Un evaluador que busque la matriz de trazabilidad no la va a encontrar.

### 3.2 Pruebas: el número declarado no coincide con el ejecutable

| Afirmación           | Realidad                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| “Vitest 76/76”       | **82/82** (mejor de lo declarado, pero el documento está desactualizado)  |
| “Playwright 13/14”   | 3 specs, **10** llamadas `test()`; no se pudieron ejecutar (sin navegadores) |
| “smoke-api 13/13”    | Script presente; no se ejecutó en esta auditoría                          |
| “Cobertura 94 %”     | Cierto, pero sobre 52 sentencias de `domain/` (ver RNF-12)                |
| “Pruebas de rendimiento ligeras RNF-01/RNF-02” | **No existen**; no hay ninguna prueba de latencia         |

### 3.3 Registro de defectos: correcto en forma, incompleto en seguimiento

`05-registro-defectos.md` documenta D-01…D-19 con severidad, reproducción y fase de origen: es uno
de los mejores artefactos del proyecto. Pero:

- 3 defectos siguen abiertos (D-11 guards de ruta UI, D-14 catch amplio, D-15 cobertura);
- el registro no incluye los hallazgos de esta auditoría (biometría, accesibilidad, atomicidad,
  timeout, tope de carga); un registro que no crece con las pruebas deja de ser evidencia;
- la fila “Línea base cerrados 10/10” convive con 3 abiertos nuevos, lo que se lee como “todo
  cerrado” si no se mira la segunda tabla.

### 3.4 Lo que el SQA sí logró

- Revisiones de SRS, diseño y código con hallazgos concretos (H1–H13, D-01–D-19).
- Pruebas unitarias de dominio con casos límite, no solo caminos felices.
- Un pipeline CI bien pensado (calidad, commits, build, auditoría, E2E, Lighthouse).

El problema no es el diseño del SQA; es que **la ejecución y el reporte se quedaron a mitad de
camino**.

## 4. Gestión de la configuración

El GCS promete un modelo de ramas, tags y líneas base. La copia entregada **no permite verificarlo**:

| Promesa del GCS                                        | Evidencia en la copia                     |
| ------------------------------------------------------ | ----------------------------------------- |
| `main` protegida, sin push directo, solo PR             | No hay `.git`, ni remoto, ni PRs          |
| Ramas `feature/*`, `fix/*`, `docs/*`                    | No hay ramas                              |
| Tags `v0.1`, `v0.2`, `v0.3` y releases                  | No hay tags ni historial                  |
| Líneas base LB-0…LB-3 con documentos coherentes         | No hay tags que las materialicen          |
| Copia de documentos de referencia en `docs/`            | `docs/` solo contiene `api/openapi.yaml`  |
| Quality gates en `main`                                 | El CI existe, pero no hay ejecución registrada |

**No se puede concluir que el equipo no hizo GCS**: el ZIP simplemente no trae el historial. Lo que
sí se puede concluir es que **la entrega no es reproducible ni auditable desde el artefacto**. Para
la evaluación, un `git log` vale más que un documento que describe ramas.

Recomendación mínima: entregar el repositorio con `.git` (o un enlace al remoto) y crear los tags
`v0.1` (primer avance) y `v0.2` (segundo avance, aunque sea retroactivo), con su release.

## 5. Deriva documental

Afirmaciones que ya no coinciden con el código. No se corrigieron aquí (fuera de alcance); se listan
para que el equipo decida si las actualiza o las convierte en deuda.

| Documento                          | Afirmación                                                      | Realidad                                                     |
| ---------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| `HANDOFF.md`                       | “Vitest 76/76”                                                   | 82/82                                                        |
| `HANDOFF.md`                       | “Playwright 13/14”                                               | 10 `test()`; no ejecutable en esta copia                     |
| `HANDOFF.md`                       | “Lighthouse `/` a11y 96 … metas RNF-11 cumplidas”                | a11y **80**; el gate falla                                   |
| `HANDOFF.md`                       | “UC13 quedó planificado, falta UI”                               | La UI de alta/baja existe; falta edición                    |
| `README.md`                        | “El repositorio corresponde al segundo avance…”                   | Correcto, pero el SRS v1.2 ya incluye RF-25/26/27             |
| `SRS v1.2` §1.2                    | WebSocket + broker MQTT                                           | SSE + `setInterval`                                          |
| `SRS v1.2` §3.4                    | Comunicación vehículo–servidor por MQTT                           | No hay MQTT                                                  |
| `Plan v1.2` §7                     | SQLite con Drizzle                                                | `node:sqlite` sin ORM                                        |
| `Plan v1.2` §7                     | CI con Lighthouse en cada push                                    | El job existe, pero hoy fallaría por accesibilidad           |
| `GCS` §5                            | Tags `v0.2` al 21-oct                                             | La copia no tiene tags                                       |
| `historias-de-uso.md`              | “UC13 se queda como planificado”                                  | Está implementado en ~70 %                                   |
| `AuthForm.tsx` (texto al usuario)  | “La plantilla se guarda cifrada… puedo revocar”                   | No se cifra y no hay revocatoria                             |
| `SRS v1.1` / README                | “PWA”                                                             | Hay manifest, **no hay service worker** (no es offline)       |

## 6. Seguridad y cumplimiento (más allá de los RNF)

| Tema                            | Estado                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Secretos por defecto            | `UMH_SESSION_SECRET` y `UMH_DATA_KEY` tienen valores conocidos si no se configuran               |
| Cookie de sesión                | `HttpOnly; SameSite=Lax`, **sin `Secure`**                                                       |
| Revocación de sesión            | El logout no invalida el token en servidor (stateless, 24 h)                                     |
| Fuerza bruta en login           | Sin límite de intentos ni retardo progresivo                                                     |
| CSRF                            | `SameSite=Lax` mitiga; no hay token CSRF explícito                                               |
| Datos biométricos               | Sin cifrado, sin borrado real, consentimiento no separado                                        |
| Auditoría de cambios de admin   | No hay log de altas/bajas de catálogo ni de asignaciones                                         |
| `data/` y base local            | Ignorada por git (correcto); el seed solo corre si la BD está vacía                              |

Ninguno de estos puntos es un “hack” grave para una demo académica, pero dos son de nivel
productivo: **secretos por defecto** y **biometría sin cifrar**. El primero se corrige con una
validación al arranque (“si `NODE_ENV=production` y no hay secret, no arrancar”); el segundo, con la
decisión de implementar AES-GCM o de retirar la promesa biométrica del alcance.

## 7. Riesgos del análisis que se materializan

| Riesgo | Descripción                                              | Evidencia en esta auditoría                          |
| ------ | -------------------------------------------------------- | ---------------------------------------------------- |
| RD5    | Acoplamiento de la UI a datos mock                        | **Mitigado**: contrato `DataSource` con dos adaptadores |
| RD7    | Falsos positivos/negativos del reconocimiento facial      | **Materializado**: no hay reconocimiento real; el score es del cliente |
| RD8    | Fallo del trigger de seguridad                            | **Parcial**: reglas correctas, pero las alertas se autolimpian (R2) |
| RD11   | Tratamiento insuficiente de datos biométricos             | **Materializado**: sin cifrado, sin revocatoria, consentimiento mezclado |
| RD13   | Cobertura insuficiente de pruebas                         | **Parcial**: dominio bien cubierto, servicios y API fuera             |
| RD15   | Limitaciones de WebSocket/MQTT en Cloudflare              | **Evitado por omisión**: se usó SSE, pero el SRS no lo declara        |

## 8. Conclusión

Las brechas transversales se resumen en una frase: **el proyecto documenta un sistema más ambicioso
que el que entrega y entrega un sistema más completo que el que su propio HANDOFF reconoce**. Ese
desfase, más que la falta de features, es lo que hay que cerrar antes de la sustentación: un
documento que diga exactamente lo que hay, un build que sirva lo que promete y un paquete de pruebas
que se pueda ejecutar desde la copia entregada.
