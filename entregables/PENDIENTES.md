# Aviso al equipo — pendientes tras el despliegue

**Fecha:** 5-nov-2026 · **Responsable del despliegue:** José Tellez
**Producción:** <https://urbanmobility.duckdns.org> (HTTP redirige a HTTPS)
**Estado:** app desplegada y verificada. Este documento lista lo que **falta o está incompleto**, para que nadie lo dé por terminado sin revisar.

---

## 1. Lo que sí quedó verificado en producción

- `/` y `/api/health` responden 200 (`sqlite`, `/var/lib/umh/umh.db`).
- Login, `/api/me`, catálogo, reserva, prepago, QR, casco (IA + simulación), inicio/fin de viaje, cargo por minuto, KPIs de operador, alertas simuladas, entregas y SSE.
- Lighthouse: `/` 92/100/100/100 · `/catalogo` 100/100/100/100 (perf/a11y/BP/SEO).
- HTTPS con Let's Encrypt válido hasta 2027-02-04 y renovación automática (`certbot.timer`).
- Bloqueador **P0-3** de la auditoría cerrado: el build de producción monta `/api/*`.
- Accesibilidad **B4** cerrada (landing de 80 → 100).

Guía de operación y redeploy: [`deploy/README.md`](../deploy/README.md).

---

## 2. Prioridad alta — reconocimiento facial / biometría

Hoy el flujo **funciona en demo**, pero no es biometría real. Tres brechas concretas:

### 2.1 Las cuentas demo no pueden enrolar el rostro

- **Síntoma:** con `cliente@demo.co`, “Registrar mi rostro” devuelve
  `422 Falta el consentimiento biométrico explícito (RF-20/RF-22)`.
- **Causa:** el seed solo inserta consentimiento `datos_personales` para las cuentas demo
  (`src/server/db/seed.ts`). El consentimiento `biometria` solo se otorga al registrarse
  marcando la casilla (`src/components/auth/AuthForm.tsx`).
- **Impacto:** quien pruebe la demo con las cuentas publicadas no puede mostrar el
  reconocimiento facial.
- **Opciones:** (a) permitir otorgar el consentimiento biométrico después del registro
  desde la pantalla de desbloqueo (recomendado, conserva el consentimiento explícito);
  (b) sembrar el consentimiento solo en cuentas demo (rápido, pero simula un consentimiento
  que nadie dio).
- **Archivos:** `src/server/db/seed.ts`, `src/server/api/handlers.ts` (`/api/auth/face`),
  `src/components/mobility/UnlockFlow.tsx`.

### 2.2 La plantilla facial no es real ni cifrada

- **Cómo está hoy:** se captura una miniatura de 16×16 en grises, se compara por coseno
  (umbral 0.85) **en el navegador** y se guarda en `localStorage` **en texto plano**
  (`src/lib/camera.ts`).
- **Servidor:** solo recibe `{ enrolled: true }` y guarda un blob de relleno
  `plantilla-demo-no-biometria-real` en `biometric_templates`
  (`src/server/repositories.ts`, `src/lib/data/api.ts`). La plantilla real nunca sale del
  dispositivo.
- **Consecuencias:**
  - No funciona si la persona entra desde otro dispositivo o navegador.
  - No hay revocación real desde la UI (el endpoint acepta borrar, pero el flujo no lo expone).
  - El FAQ afirma “se guarda cifrada, nunca en texto plano”
    (`src/content/faq.ts`): **la afirmación no corresponde al código actual**.
- **Propuesta:** subir la plantilla por TLS, cifrarla con AES-GCM usando `UMH_DATA_KEY` y
  almacenarla en `biometric_templates` (columnas `cipher_text`, `iv`, `auth_tag` ya existen);
  comparar en el servidor o descargar el blob cifrado; agregar “Eliminar mi rostro” y
  actualizar el FAQ.
- **Criterio de aceptación:** la misma cuenta desbloquea con rostro en dos dispositivos
  distintos, la plantilla no aparece en `localStorage` en claro y existe revocación verificable.

### 2.3 El modo demo aprueba el rostro sin cámara

- **Síntoma:** en el build de producción `VITE_DEMO_TOOLS` no está definido, así que
  `DEMO_TOOLS` vale `true` (`src/lib/camera.ts`). Si no hay plantilla local, el score se
  fuerza a `0.95` y el desbloqueo pasa **sin verificar nada**
  (`src/components/mobility/UnlockFlow.tsx`).
- **Riesgo:** en una demo o evaluación se puede “aprobar” el rostro sin cámara y sin
  parecido real.
- **Propuesta:** compilar producción con `VITE_DEMO_TOOLS=false` y dejar la simulación
  explícita (checkbox “modo demo”) solo en desarrollo; añadir prueba de que en producción
  el score simulado no se usa.
- **Criterio de aceptación:** con `VITE_DEMO_TOOLS=false`, rostro sin cámara/plantilla →
  `denied`; nunca `0.95` automático.

---

## 3. Prioridad media

| #   | Pendiente                                                                                                                                                                                             | Archivos / notas                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| M-1 | **Clave real de Brevo.** Sin `BREVO_API_KEY`, las notificaciones quedan en `simulated` (por diseño).                                                                                                  | `.env`, `src/server/services/brevo.ts`                                   |
| M-2 | **E2E contra producción.** `tests/e2e/helmet-ai.spec.ts` importa `/src/lib/helmet-model.ts` (solo dev), por eso 2 pruebas fallan contra el sitio desplegado. El modelo sí responde 200 en producción. | Mover el cargador a un módulo compartido o marcar el spec como dev-only. |
| M-3 | **D-11** — guards de ruta UI en `/admin` y `/entregas` (el API sí protege).                                                                                                                           | `src/routes/admin.tsx`, `src/routes/entregas.tsx`                        |
| M-4 | **D-14** — `notifications.ensure()` usa `try/catch` amplio; filtrar `SQLITE_CONSTRAINT_UNIQUE`.                                                                                                       | `src/server/services/notifications.ts`                                   |
| M-5 | **D-15** — cobertura ≥ 80 % mide solo `src/server/domain/**`; ampliar a `services/` y `api/`.                                                                                                         | `vitest.config.ts`                                                       |
| M-6 | **UC13** — gestión de catálogo/hubs: endpoints listos, falta UI de administración.                                                                                                                    | backlog P3                                                               |

---

## 4. Reglas para el equipo

- **No subir** `vmingsoftwareiijose_key.pem` (ya está en `.gitignore`). Los secretos viven en
  `/etc/umh/umh.env` en la VM, no en el repo.
- Los redeploys se hacen con el runbook de `deploy/README.md` (build local, subir `.output`),
  no compilando en la VM: tiene 2 vCPU / 887 MB y solo 2 GB de swap.
- Si se cambia el esquema, actualizar `src/server/db/schema.sql` **y** probar el arranque
  contra la base existente de `/var/lib/umh/umh.db`.
- Antes de cerrar cualquier ítem de este documento: `npm run typecheck`, `npm run lint`,
  `npm test` y el smoke de `deploy/README.md`.

---

## 5. Historial de commits de esta entrega

- `dfeef4c` — API en build de producción + guía de VM.
- `5a5d49a` — accesibilidad de la landing a 100 y cookie segura en producción.
- Commit de este aviso — documentación de pendientes.
