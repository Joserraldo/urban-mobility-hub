# 06 · Backlog priorizado

Este documento convierte las brechas de `01`–`05` en acciones. **No se ejecutó ninguna**: es una
propuesta de plan. La prioridad no sigue el orden de los requisitos, sino tres criterios:

1. **Riesgo**: legal/seguridad (biometría, secretos) y de demostración (alertas, accesibilidad).
2. **Bloqueo**: lo que impide que el sistema funcione fuera del servidor de desarrollo.
3. **Costo de oportunidad**: lo que un evaluador va a probar primero y hoy falla.

Escala de esfuerzo: **S** ≤ 4 h · **M** 5–8 h · **L** 9–16 h · **XL** > 16 h (estimación gruesa para
3 personas; no es un compromiso).

## 1. Resumen

| Prioridad | Cuántas acciones | Esfuerzo estimado | Cuándo                                              |
| --------- | ---------------- | ----------------- | --------------------------------------------------- |
| **P0**    | 6                | 32–50 h           | Antes del 3.er avance (25-nov); varias antes de mostrar |
| **P1**    | 8                | 25–35 h           | Antes del cierre (2-dic)                            |
| **P2**    | 10               | 30–60 h           | Solo si sobra tiempo; varias son “actualizar el documento” |

Con 3 personas × 16 h/semana = **48 h/semana**, entre el 26-oct y el 25-nov hay ~4,3 semanas
(≈ 206 h). P0 + P1 caben con margen; P2 es opcional.

---

## 2. P0 · Antes de la próxima demostración

### P0-1 · Cerrar la brecha biométrica (o retirar la promesa)

| Campo            | Valor                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| Requisitos       | RNF-03, RF-20, RF-22, UC01, UC09, RD11                                                                      |
| Brecha           | Plantilla falsa en BD; vector 16×16 en `localStorage`; consentimiento no separado; sin revocatoria          |
| Acción mínima    | (a) checkbox biométrico separado y `POST /api/consents` para otorgar/revocar; (b) cifrar la plantilla con AES-256-GCM usando `dataKey()` y `iv`/`auth_tag` reales; (c) borrar la plantilla al revocar; (d) dejar de guardar el vector en `localStorage` (o guardarlo cifrado con clave derivada del servidor) |
| Esfuerzo         | **L** (10–14 h)                                                                                              |
| Criterio de cierre | Prueba: usuario nuevo → consiente biometría → enrola → `cipher_text` no contiene texto plano → revoca → `hasFace=false` y `localStorage` limpio. Sin el consentimiento, `/api/auth/face` sigue devolviendo 422. |
| Alternativa      | Si no se alcanza: **retirar** el rostro del alcance de la demo y quitar del SRS/consentimiento toda promesa de cifrado y revocatoria. Es peor dejar el texto legal afirmando algo falso. |

### P0-2 · Llevar la accesibilidad al umbral (RNF-11)

| Campo            | Valor                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Requisitos       | RNF-11, HU-03a                                                                            |
| Brecha           | `/` = 80 < 90; el gate de Lighthouse falla                                                |
| Acción           | Corregir contraste de tokens; reemplazar `<dl>` mal formados por `dl>dt+dd`; asegurar que toda `<li>` esté dentro de `<ul>/<ol>`; corregir orden de encabezados en `/catalogo` |
| Esfuerzo         | **M** (4–6 h)                                                                             |
| Criterio de cierre | `npx lhci autorun` termina con código 0; `/` y `/catalogo` con accesibilidad ≥ 90. Adjuntar los 4 reportes nuevos a `.lighthouseci/`. |
| Nota             | No requiere rediseño; son cambios de marcado y de variables de color. Es el mejor retorno por hora del backlog. |

### P0-3 · Hacer que el build sirva la API

| Campo            | Valor                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Requisitos       | RNF-10, despliegue, RF-03/05/25/26                                                         |
| Brecha           | `/api/health` → 404 en `node .output/server/index.mjs`                                     |
| Acción           | Exponer `handle()` como ruta de servidor (TanStack Start server route o Worker), registrar el plugin también en `build`, y añadir `preview:node` que construya con el preset correcto |
| Esfuerzo         | **XL** (12–20 h)                                                                           |
| Criterio de cierre | Build + arranque → `GET /api/health` 200; login, reserva y pago funcionan contra el servidor construido; `/api/*` aparece en el bundle de producción. |
| Riesgo           | Es la acción con más incertidumbre técnica (Nitro/TanStack Start). Si no cabe, declarar explícitamente que la demo es `dev:api` y **no** prometer producción. |

### P0-4 · Modelar el timeout del pago

| Campo            | Valor                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Requisitos       | RF-26, UC18-E2, HU-18b                                                                     |
| Brecha           | La pasarela no tiene camino de timeout                                                     |
| Acción           | Añadir `timeoutMs` a `PaymentGateway.charge`; si expira, devolver `rejected` con `reason='timeout'`; registrar el intento y dejar la compra `pending`; prueba unitaria del caso |
| Esfuerzo         | **S** (2–4 h)                                                                              |
| Criterio de cierre | Prueba: pasarela que nunca responde → pago `rejected`/`timeout`, compra `pending`, vehículo sigue `available`. |

### P0-5 · Cierre atómico de la entrega

| Campo            | Valor                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Requisitos       | RF-25, UC16-E1, HU-16b                                                                     |
| Brecha           | Cuatro escrituras sueltas; reserva `completed` + vehículo `in_use`                         |
| Acción           | Envolver entrega + reserva + vehículo en una transacción (`BEGIN … COMMIT` / `db.exec`); usar `transition()`; definir el estado final correcto (probablemente reserva `active` y vehículo `in_use` hasta que el viaje termine) |
| Esfuerzo         | **M** (5–8 h)                                                                              |
| Criterio de cierre | Prueba de integración con fallo inyectado en la segunda escritura: no queda entrega `delivered` con reserva inconsistente. Prueba feliz: estados coherentes al final. |

### P0-6 · Evitar que las alertas se autolimpien

| Campo            | Valor                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Requisitos       | RF-11, RF-12, RNF-04, UC12, R2                                                            |
| Brecha           | `moveFleet()` reevalúa con telemetría sana y vuelve `alert_state` a `ok` cada 2 s          |
| Acción           | Separar “actualizar posición/batería” de “evaluar alerta”; en `moveFleet()` no tocar `alert_state`; solo la acción explícita de “limpiar” lo devuelve a `ok` |
| Esfuerzo         | **S** (1–2 h)                                                                              |
| Criterio de cierre | Disparar una alerta desde el simulador → sigue activa > 10 s; el KPI de alertas activas no cae a 0; la bitácora conserva el evento. |

---

## 3. P1 · Antes del cierre (2-dic)

### P1-1 · Edición de catálogo y hubs (RF-23/24)
- **Brecha:** alta y baja existen; falta formulario de edición.
- **Acción:** reutilizar el formulario de alta en modo edición (precargar valores + `PUT/POST` al mismo endpoint).
- **Esfuerzo:** M (4–6 h).
- **Cierre:** editar precio de un vehículo y capacidad de un hub desde `/admin`; el cambio se refleja en catálogo y mapa.

### P1-2 · Excepciones de UC14/UC17/UC20
- **UC14-E2:** rechazar asignación si el courier ya tiene 5 entregas activas (422 con lista).
- **UC17-E2/E3:** 409 si ya está `late`; 422 si falta `reason` en la marca manual.
- **UC20-E2/E3:** usar `isPositionFresh()` en la ingesta y marcar `stale`; reintentar la escritura del log antes del SSE.
- **Esfuerzo:** M (6–8 h).
- **Cierre:** una prueba por excepción, con el código de estado esperado.

### P1-3 · Completar los artefactos SQA
- **Brecha:** faltan `03-matriz-trazabilidad.md` y `04-informe-ejecucion.md`.
- **Acción:** matriz RF/RNF → UC/HU → prueba → resultado (usar los datos de esta auditoría como insumo) e informe con latencias medidas, cobertura real y defectos escapados.
- **Esfuerzo:** M (6–8 h).
- **Cierre:** los dos archivos existen, citan pruebas ejecutables y no contradicen el registro de defectos.

### P1-4 · Repositorio y líneas base (GCS)
- **Brecha:** la copia no tiene historial, tags ni releases.
- **Acción:** entregar `.git`; crear `v0.1` (retroactivo) y `v0.2`; proteger `main`; copiar SRS/Plan/Riesgos a `docs/` o corregir la promesa del GCS.
- **Esfuerzo:** S (2–3 h).
- **Cierre:** `git tag` muestra v0.1/v0.2; un clon limpio reproduce el build.

### P1-5 · Hacer ejecutables los E2E
- **Brecha:** sin navegadores; 10 `test()` y no 14; el `playwright.config.ts` depende de un Chromium de Puppeteer.
- **Acción:** `npx playwright install --with-deps chromium`; eliminar el *fallback* o documentarlo; correr en CI y adjuntar el reporte.
- **Esfuerzo:** S (3–5 h).
- **Cierre:** `npm run test:e2e` local y en CI, con el número real de pruebas.

### P1-6 · Endurecer sesión y secretos
- **Brecha:** secretos por defecto; cookie sin `Secure`; sin límite de intentos.
- **Acción:** fallar al arrancar si `NODE_ENV=production` y falta `UMH_SESSION_SECRET`; añadir `Secure` cuando `https`; limitar intentos de login.
- **Esfuerzo:** S (3–4 h).
- **Cierre:** servidor de producción sin secret → no arranca; cookie incluye `Secure`; 6.º intento fallido → 429.

### P1-7 · Exigir `deliverable` en la reserva a domicilio
- **Brecha:** RF-05.
- **Acción:** `if (modality === "delivery" && !v.deliverable) → 409/422`.
- **Esfuerzo:** S (1 h).
- **Cierre:** reserva a domicilio de un vehículo no apto → rechazo; la UI no ofrece la modalidad.

### P1-8 · Pasada de verdad documental
- **Brecha:** HANDOFF, SRS §1.2/§3.4, README, GCS e historias describen otro estado.
- **Acción:** publicar un “SRS v1.3” o una nota de alcance que diga **SSE, no WebSocket; simulador, no MQTT; `node:sqlite`, no Drizzle**; actualizar HANDOFF (82 pruebas, a11y real, UC13 real, E2E real); corregir el estado de HU-09a y UC13.
- **Esfuerzo:** M (4–6 h).
- **Cierre:** ninguna afirmación de los documentos contradice una medición de esta auditoría.

---

## 4. P2 · Si sobra tiempo

| ID    | Acción                                                                 | Requisito     | Esf. | Por qué queda en P2                                     |
| ----- | ---------------------------------------------------------------------- | ------------- | ---- | ------------------------------------------------------- |
| P2-1  | Verificación del casco en el servidor (no confiar en `confidence` del cliente) | RF-09, R7 | L | Requiere re-inferencia o firma; costoso                  |
| P2-2  | Reconocimiento facial real (`face-api.js` o servicio) y score server-side | RF-10, R7  | XL   | Depende de P0-1 y de una decisión de alcance             |
| P2-3  | WebSocket real para posición/alertas                                    | SRS §3.4      | L    | SSE ya cumple el efecto; el SRS es lo que hay que corregir |
| P2-4  | Broker MQTT `aedes` + publicadores simulados                            | Plan §7       | L    | Solo aporta si se simula hardware; el SRS puede declararlo fuera |
| P2-5  | Migrar a Drizzle + D1                                                   | Plan §7       | XL   | Bloqueado por P0-3 y por el despliegue                   |
| P2-6  | Unicidad de compra por vehículo (evitar doble venta)                    | RF-03         | S    | Caso borde; no lo pide el SRS explícitamente             |
| P2-7  | Ampliar `coverage.include` a `services/` y `api/`                       | RNF-12, D-15  | M    | El umbral actual ya se cumple                            |
| P2-8  | Evitar el reinicio de cámara QR→casco (R8)                              | RF-09         | S    | Molestia de UX, no fallo funcional                       |
| P2-9  | Alinear credenciales demo mock/API (R3) y guía sin reserva (R5)          | UX            | S    | Cosmético                                                |
| P2-10 | Service worker real si se mantiene la etiqueta “PWA”                    | README        | M    | No hay requisito que lo exija                            |

---

## 5. Orden recomendado (2 semanas)

Si solo hay dos semanas antes del 25-nov, este es el orden que maximiza el puntaje de la
sustentación:

**Semana A (26-oct → 1-nov)**

1. P0-6 (alertas, 1–2 h) — efecto visible inmediato en la demo.
2. P0-2 (accesibilidad, 4–6 h) — convierte un gate rojo en verde.
3. P0-4 (timeout, 2–4 h) — cierra una excepción de UC18.
4. P0-1 (biometría, 10–14 h) — la brecha legal; empezar por el consentimiento separado y el cifrado.

**Semana B (2-nov → 8-nov)**

5. P0-5 (atomicidad, 5–8 h).
6. P1-1 (edición catálogo, 4–6 h).
7. P1-2 (excepciones UC14/17/20, 6–8 h).
8. P1-5 (E2E, 3–5 h).

**Semanas C–D (9-nov → 25-nov)**

9. P0-3 (API en producción, 12–20 h) — el más riesgoso; reservarle tiempo.
10. P1-3 (artefactos SQA, 6–8 h).
11. P1-4 (tags/GCS, 2–3 h).
12. P1-6 + P1-7 (sesión y `deliverable`, 4–5 h).
13. P1-8 (verdad documental, 4–6 h).

**Cierre (26-nov → 2-dic):** solo P2 de bajo costo (P2-9, P2-8) y congelar. No empezar P2-3/P2-5:
son reescrituras de arquitectura que no se terminan en una semana y ponen en riesgo lo que sí
funciona.

---

## 6. Definición de “hecho” (para no volver a inflar el estado)

Una acción se cierra solo si cumple las cuatro condiciones que el propio plan SQA exige:

1. **Prueba que pasa** (unitaria, integración o E2E) y que falla si se revierte el cambio.
2. **Medición reproducible** cuando el requisito es numérico (Lighthouse, cobertura, latencia).
3. **Documento actualizado** en el mismo commit o en uno inmediatamente posterior.
4. **Captura o reporte** adjunto para la sustentación.

Si no se cumplen las cuatro, la acción queda “en progreso”, no “hecha”. El desfase que originó esta
auditoría se produjo justamente por marcar como hechas cosas que solo estaban “casi”.

## 7. Lo que **no** hay que hacer

- **No** reescribir el SRS desde cero: basta una nota de alcance con las tres sustituciones (SSE,
  simulador, `node:sqlite`) y el estado real de RF-22.
- **No** cambiar de stack a estas alturas: Drizzle/D1/WebSocket/MQTT son P2 y no aportan al puntaje
  si el resto sigue en rojo.
- **No** “arreglar” la accesibilidad ocultando elementos o subiendo el umbral: el gate debe quedar en
  90 y pasar de verdad.
- **No** borrar el registro de defectos abiertos ni el HANDOFF anterior: sirven como evidencia de
  que el equipo auditó su propio trabajo.
