# ESTADO FINAL del ciclo de mejora (actualizado 8-oct-2026, madrugada)

## Verde ahora mismo (todo ejecutado y confirmado)

- `tsc --noEmit` 0 · `eslint src` 0 errores (7 warnings shadcn preexistentes)
- Vitest 76/76 · cobertura dominio 94 % (umbral 80 ✓ RNF-12)
- `smoke-api.ps1` 13/13 (login→reserva→pago→desbloqueo→viaje→compra→domicilio→asignación→tardía→Brevo simulated→KPIs→RBAC)
- Playwright 13/14 (1 skip a propósito: redirección móvil no puede probarse con webdriver=true; cubierto por captura 02)
- OpenAPI validado con js-yaml (39 paths; era YAML inválido desde v0.1 → D-17 en registro)
- **Lighthouse sobre build de producción** (`node .output` + `lhci`): `/` perf 96 · a11y 96 · BP 100 · SEO 100 (LCP 1,2 s); `/catalogo` 97/98/100/100 → metas RNF-11 cumplidas (evidencia en `sqa/04` §5)
- **DFD nivel 0 y 1 regenerados v2** (PlantUML, mismo nombre de imagen): ya dibujan P1.1 pago, P6 entregas, D5 y Brevo; trazabilidad RF-20–27 completada
- Diagramas v2 + 14 capturas de interfaces + READMEs/manual/SRS/registro al día

## Pendientes reales (lo que sigue, en orden de valor)

1. **Publicar** Cloudflare Pages/Workers + D1 (plan en `gcs/despliegue.md`; el `/api/*` dev es un plugin Vite — en prod replicar como server routes con el MISMO `schema.sql`).
2. **Clave Brevo**: el usuario la pone como `BREVO_API_KEY` en `.env` local/secret de CF; sin ella todo corre en `simulated` (por diseño).
3. Backlog abierto del registro: D-11 (guards de ruta UI), D-14 (catch amplio en `notifications.ensure`), D-15 (cobertura de services).
4. UC13 gestión catálogo/hubs quedó **planificado** (P3) — tiene endpoints, falta UI.

## Cómo demo para la clase (3 min)

```
npm run dev:api            # SQLite se solo-siembra; si quieres la historia de entregas:
powershell -File entregables/_tools/seed-capture.ps1
```

1. `/` landing → tarifas, domicilio, cuentas demo
2. login `cliente@demo.co / Demo1234!` → `/app`: reservar con prepago → comprobante visible
3. QR `UMH:<id>` + "casco" → viajar → "terminar" → cargo por minuto
4. login `operador@demo.co` → `/admin`: simulador de alertas + **Asignar entrega** (UC14)
5. login `domi1@demo.co` → `/entregas`: iniciar → **marcar tardía** → el aviso Brevo aparece en `/admin` (`simulated`)
6. Recargar todo: los datos persisten (SQLite) → argumento SQA: docs = diagramas = tablas = pantallas

## Reglas para no repetir errores de esta sesión (también en MANUAL-TECNICO §8)

- No usar `-replace` de PS 5.1 sobre JSON/YAML/`.env` (rompió package.json y openapi; UTF-8+BOM).
- tsconfig: `exactOptionalPropertyTypes` + `noPropertyAccessFromIndexSignature` → spreads condicionales y `env["X"]`.
- `?raw` no sobrevive al bundling del config Vite → leer schema.sql con fs.
- Playwright rellena ANTES de hidratar → `waitForLoadState("networkidle")` en formularios.
- Validar OpenAPI con js-yaml en CI (hoy manual; añadir a `ci.yml` cuando toque).
