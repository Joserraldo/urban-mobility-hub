# Auditoría de brechas — Urban Mobility Hub

Documento de trabajo que contrasta **lo que prometen los entregables** (SRS, Plan, casos de uso,
historias de usuario, GCS, SQA, HANDOFF) contra **lo que realmente hace el código** de este
repositorio, verificado por ejecución.

- Fecha de la auditoría: **26 de octubre de 2026**
- Artefacto auditado: copia ZIP de `github.com/Joserraldo/urban-mobility-hub`, rama `main`
  (sin historial Git; ver §5)
- Estado del código al iniciar: commit local `ed9b49c` (importación del ZIP prístino)
- Entorno: Windows, Node.js 24.22.1, npm 11.19.1, navegador Edge (canal del sistema)

> **Alcance de esta auditoría:** solo se **documentan** brechas. No se corrigió código, ni
> documentación previa, ni se reescribieron afirmaciones desactualizadas. Cada brecha se
> convierte en una acción del backlog priorizado (`06-backlog-priorizado.md`).

---

## 1. Pregunta que responde

> ¿Qué prometieron los documentos del proyecto y qué falta para que el sistema cumpla
> literalmente esas promesas?

Se responde requisito por requisito (RF-01…RF-27, RNF-01…RNF-12), caso de uso por caso de uso
(UC01…UC20 y sus historias de usuario) y, además, por proceso (arquitectura, SQA, GCS,
despliegue y coherencia documental).

## 2. Fuentes contrastadas

| Fuente                                     | Qué se tomó de ella                                             |
| ------------------------------------------ | --------------------------------------------------------------- |
| `entregables/gestion/SRS_v1.2.md`          | RF-20…RF-27, cambios de RNF, alcance 1.2                        |
| `entregables/SRS_v1.1_con_diagrama_contexto.docx` | RF-01…RF-19 y RNF-01…RNF-10 (texto base que la v1.2 no repite) |
| `entregables/gestion/Plan_v1.2.md`         | hitos, stack comprometido, CI, capacidad real                   |
| `entregables/gestion/Riesgos_v1.2.md`      | riesgos RD5, RD7, RD8, RD11, RD13, RD15                         |
| `entregables/analisis/casos-de-uso/UC01…UC20*.md` | flujos, excepciones y garantías por caso de uso          |
| `entregables/analisis/historias-de-uso.md` | HU, prioridad, semana y estado “planificado”                    |
| `entregables/sqa/01-plan-sqa-proactivo.md` | artefactos y métricas SQA comprometidos                         |
| `entregables/sqa/05-registro-defectos.md`  | D-01…D-19 y su estado                                           |
| `entregables/gcs/GCS_Gestion_de_Configuracion.md` | ramas, tags, líneas base LB-0…LB-3, protección de `main` |
| `entregables/gcs/despliegue.md`            | arquitectura Cloudflare, D1, Durable Objects, MQTT, SSE         |
| `entregables/HANDOFF.md`                   | estado declarado y pendientes reales                            |
| `docs/api/openapi.yaml`                    | contrato de 39 rutas                                            |
| `Urban_Mobility_Hub - Informe y recomendaciones.docx` | hallazgos R1…R9 previos (informe del 26-oct)     |

## 3. Método

1. **Lectura estática** de los documentos y del código (`src/`, `tests/`, `docs/`, `.github/`).
2. **Ejecución real** de la aplicación en los dos modos:
   - modo mock (`npm run dev`), sin backend;
   - modo API (`npm run dev:api`, SQLite + SSE) en `http://localhost:8080`.
3. **Puertas de calidad locales**, ejecutadas en esta máquina:

   | Comando                | Resultado                                                        |
   | ---------------------- | ---------------------------------------------------------------- |
   | `npm run typecheck`    | 0 errores                                                        |
   | `npm run lint`         | 0 errores, 7 warnings (shadcn preexistentes)                     |
   | `npm test`             | 82/82 pruebas en 9 archivos                                      |
   | `npm run test:coverage`| 94,23 % sentencias · 92,85 % ramas · 100 % funciones · 100 % líneas |
   | `npm run build`        | OK                                                               |
   | `NITRO_PRESET=node_server npm run build` + `node .output/server/index.mjs` | SSR responde 200; `/api/health` responde **404** |
   | `npx lhci autorun`     | `/` perf 90 · **a11y 80** · BP 100 · SEO 100                     |

4. **Verificación funcional** de los flujos: registro/login, compra, alquiler, pago, desbloqueo
   (QR + casco + rostro), viaje, cierre, panel de operador, alertas IoT y entregas UC14–UC19.
5. **Detección de casco por IA**: modelo YOLOv8n ONNX servido localmente; estado `ready`,
   confianza 0,7974 en la imagen de prueba, inferencia en caliente ≈ 0,7–0,9 s, sin CDN.
6. **Contraste de afirmaciones**: cada número declarado en los documentos se intentó reproducir
   con el comando o la pantalla que el propio documento indica.

## 4. Escala de veredicto

| Veredicto             | Significado                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------- |
| ✅ **Cumple**         | Implementado y verificado con evidencia reproducible.                                          |
| 🟡 **Cumple parcial** | Existe, pero se desvía del texto del requisito en un punto concreto (se indica cuál).          |
| ❌ **No cumple**      | El documento lo promete y en el código no está, o la medición falla.                           |
| 📋 **Planificado**    | Declarado explícitamente como fuera del avance actual; no es un incumplimiento, es deuda.      |
| ⚪ **No verificable** | Requiere un recurso que esta copia no tiene (producción, clave Brevo, navegadores E2E, hardware). |

Una misma fila puede ser 🟡 y ⚪ a la vez cuando una parte se verificó y otra no; en ese caso se
elige el veredicto más conservador y se explica en la columna de brecha.

## 5. Limitaciones de la evidencia

Estas limitaciones afectan la fuerza de las conclusiones y se repiten donde aplican:

1. **No hay historial Git en la copia entregada.** El ZIP no incluye `.git`; por tanto no existen
   ramas, tags, PRs, releases ni ejecuciones de CI verificables *en este artefacto*. Para poder
   versionar esta auditoría se inicializó un repositorio local (`git init -b main`) con el estado
   prístino como commit `ed9b49c`. Ese repositorio **no** es el del proyecto.
2. **No hay despliegue público.** `entregables/gcs/despliegue.md` lo declara (“plan listo, nada
   publicado”) y no se crearon cuentas ni recursos Cloudflare. Todo lo relativo a D1, Durable
   Objects, `wrangler`, disponibilidad y correo real es ⚪ no verificable.
3. **Playwright no se pudo ejecutar.** Los navegadores de Playwright no están instalados
   (`npx playwright install` requerido) y el `playwright.config.ts` intenta reutilizar un Chromium
   de Puppeteer que no existe en esta máquina. Los E2E quedan como ⚪ no verificables.
4. **Brevo corre en `simulated`.** Sin `BREVO_API_KEY`, el envío real no se puede probar; sí se
   verificó el registro `simulated` y la robustez ante fallo.
5. **La IA de casco se verificó con una imagen fija de prueba**, no con cámara física ni con un
   conjunto etiquetado de casos. La precisión (falsos positivos/negativos) no está medida.
6. **Lighthouse** se ejecutó con Edge de escritorio contra el build `node_server`; el número de
   accesibilidad puede variar con otro navegador, pero el fallo es de marcado (contraste, listas,
   `dl`), no de entorno.

## 6. Índice de documentos

| Archivo                                                    | Contenido                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------- |
| [`01-veredicto-global.md`](01-veredicto-global.md)         | Veredicto, tablero de madurez, top de brechas y estado de R1–R9 |
| [`02-requisitos-funcionales.md`](02-requisitos-funcionales.md) | RF-01…RF-27 uno por uno, con evidencia y brecha            |
| [`03-requisitos-no-funcionales.md`](03-requisitos-no-funcionales.md) | RNF-01…RNF-12, con las mediciones de Lighthouse y cobertura |
| [`04-casos-de-uso.md`](04-casos-de-uso.md)                 | UC01…UC20 e historias de usuario: hecho, parcial y planificado  |
| [`05-brechas-transversales.md`](05-brechas-transversales.md) | Arquitectura, SQA, GCS, despliegue y deriva documental        |
| [`06-backlog-priorizado.md`](06-backlog-priorizado.md)     | Acciones P0/P1/P2 con requisito, esfuerzo y criterio de cierre  |

## 7. Cómo reproducir

```powershell
# Dependencias y puertas de calidad
npm ci
npm run typecheck
npm run lint
npm run test:coverage

# Modo API (SQLite + SSE) en http://localhost:8080
npm run dev:api

# Build y verificación del SSR
$env:NITRO_PRESET = "node_server"; npm run build
node .output/server/index.mjs   # / responde 200 · /api/health responde 404

# Lighthouse (requiere un Chrome/Edge; en Windows se puede apuntar al de Edge)
$env:CHROME_PATH = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
npx lhci autorun --config=lighthouserc.json
```

Cuentas de demostración del modo API: `cliente@demo.co`, `operador@demo.co`, `domi1@demo.co`,
contraseña `Demo1234!`. En modo mock las cuentas son otras (`usuario@nodo.co` / `Usuario123!`,
`operador@nodo.co` / `Operador123!`); ver brecha R3 en `01-veredicto-global.md`.
