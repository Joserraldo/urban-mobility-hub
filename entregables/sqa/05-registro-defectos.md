# 05 · Registro de defectos

Cómo leerlo (en simple): un **defecto** es algo que el sistema hace distinto a lo que el requisito pide. Cada fila dice *dónde está, cómo reproducirlo, qué esperábamos, qué pasó, quién lo arregla y en qué fase debió atraparse*. Anotar los defectos **no es malo**: es la evidencia de que el SQA funciona.

Severidad: **Crítica** (riesgo de seguridad/legal o rompe el flujo principal) · **Alta** · **Media** · **Baja**.
Fase de origen = en qué fase del SDLC nació el defecto (para medir proactividad: si nació en *Requisitos* y lo atrapamos allí, no llegó al código).

## A. Defectos de la línea base (prototipo `main`, commit `7fe8a41`) — hallados por inspección + ejecución

| ID | Req. | Sev. | Título | Pasos para reproducir | Esperado | Obtenido | Evidencia | Dueño | Origen | Estado |
|---|---|---|---|---|---|---|---|---|---|---|
| D-01 | RF-09, RD8 | **Crítica** | El chequeo de casco **siempre aprueba** | `/app` → Alquilar → elegir vehículo → Desbloquear → "Simular escaneo" → esperar 3 s | Solo se habilita "Iniciar viaje" si la cámara confirma el casco; si no hay casco, queda bloqueado | Un `setTimeout` de 3 s pasa a "ready" siempre; no existe la rama de fallo | `UnlockFlow.tsx:16` | frontend + backend | Requisitos (R-08) | Abierto en baseline → ver §B |
| D-02 | RF-09 | Alta | No hay validación de orden ni caducidad del desbloqueo | Llamar a "iniciar" sin QR (no hay API) | El servidor exige QR → casco → inicio y caduca a los 120 s | Todo vive en el estado del navegador; nada impide saltarse pasos | `UnlockFlow.tsx` | backend | Diseño (R-10) | Abierto → §B |
| D-03 | RF-03, RF-05 | Alta | "Comprar" y "Reservar" solo muestran un *toast*; no hay compra ni reserva | `/app` → Comprar → "Comprar / Reservar" | Se registra la compra/reserva (estado, usuario, stock) y persiste tras recargar | Aparece "reservado" y al recargar no existe nada | `MobilityApp.tsx:262,353` | backend + frontend | Requisitos (R-16, R-17) | Abierto → §B |
| D-04 | RF-12, RNF-04 | Alta | El log de alertas se pierde al recargar y guarda solo 12 | `/admin` → disparar 13 alertas → recargar | Log persistente, auditable, con coordenadas | Memoria del navegador, `slice(0,12)`, sin lat/lng | `TelemetryDashboard.tsx:74` | backend | Requisitos (R-13) | Abierto → §B |
| D-05 | RF-15 | Media | El simulador elige el vehículo **al azar** | `/admin` → "Caída" varias veces | El operador escoge el vehículo | Siempre aleatorio: prueba no repetible | `TelemetryDashboard.tsx:62` | frontend | Requisitos (R-15) | Abierto → §B |
| D-06 | RF-13 | Media | KPI "Batería media" incluye vehículos **en venta** (100 %) | `/admin` | Promedio solo de la flota en alquiler | Promedia los 11 vehículos | `TelemetryDashboard.tsx:83` | frontend/backend | Requisitos (R-14) | Abierto → §B |
| D-07 | RF-08, RNF-01 | Alta | La posición **nunca se actualiza** | `/app` observar 30 s | Marcadores se mueven con la telemetría | Coordenadas estáticas (`x`,`y` fijos) | `fleet-data.ts` | backend + frontend | Diseño | Abierto → §B |
| D-08 | RF-11 | Media | Rótulo "Batería baja" ≠ "batería crítica" y 19 % ya es alerta | `/admin` ver SC-1120 | Alerta solo con batería ≤ 15 % | Alerta a 19 %; sin umbral definido | `fleet-data.ts` (SC-1120) | backend | Requisitos (R-06) | Abierto → §B |
| D-09 | RF-21, R-04 | **Crítica** | `/admin` es accesible sin sesión ni rol | Abrir `/admin` sin iniciar sesión | Solo el operador autenticado | Cualquiera ve el panel y dispara alertas | `routes/admin.tsx` | backend + frontend | Requisitos (falta RF, H2) | Abierto → §B |
| D-10 | RF-01 | Media | `/` en móvil **no redirige** a `/app`: renderiza la app en la misma URL; la decisión depende de `useIsMobile` (cliente) y causa parpadeo/hidratación | Abrir `/` con ancho 390 px | URL final `/app` | URL sigue `/` | `routes/index.tsx:33` | frontend | Requisitos (R-05) | Abierto → §B |

> Estos 10 defectos están **todos en el prototipo original**, antes de que el equipo reconstruyera los módulos. Es la línea base contra la que se mide la mejora.

## B. Estado tras la reconstrucción (se actualiza con cada ejecución de la suite)
> Se completa en `04-informe-ejecucion.md` con resultados reales. Resumen en la sección C.

## C. Métricas de defectos (se actualizan)
| Métrica | Valor |
|---|---|
| Defectos línea base | 10 (2 críticos, 4 altos, 4 medios) |
| Defectos con origen en **Requisitos** | 8 de 10 (80 %) → confirma que revisar el SRS primero previene la mayoría |
| Defectos con origen en Diseño | 2 de 10 |
