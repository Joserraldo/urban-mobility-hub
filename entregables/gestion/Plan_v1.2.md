# Plan de Desarrollo de Software — v1.2 (PROPUESTA)

Plataforma Multimodal de Micromovilidad · UNAB · Ingeniería de Software II
Fecha de la propuesta: 1 de octubre de 2026

> Archivo nuevo. `Plan_Desarrollo_Software_Plataforma_Micromovilidad.docx` (v1.0) no se modificó. Se mantienen sin cambios las secciones 1, 3 (organización) y 6.6–7. Aquí se corrige y actualiza lo que sigue. La v1.0 prevé revisiones al cierre de cada iteración (§2.4); esta es la primera.

## 0. Cambios respecto a v1.0

| Hallazgo | Cambio |
|---|---|
| H1 | Se corrige la aritmética de COCOMO (§4.1.3) y se propaga a presupuesto y conclusiones. |
| H8 | El DFD (30-sep) no se entregó a tiempo; se registra y se replanifica (§4.2.4). |
| H2, H7 | Los RF nuevos (RF-20 a RF-24) ampliaron el tamaño: se re-estima (§4.1.4). |
| D1–D8 | Se actualizan herramientas, infraestructura y calidad (§5, §6). |

## 4. Proceso de gestión

### 4.1 Estimación del proyecto

#### 4.1.1–4.1.2 (sin cambios para el alcance original)
PFSA = 126 PF; VAF = 0,65 + 0,01 × 42 = 1,07; PFA = 126 × 1,07 ≈ 135 PF; 135 × 50 = 6.750 SLOC (6,75 KLOC).

#### 4.1.3 Corrección de COCOMO básico semi-acoplado **[CAMBIO H1]**

Fórmulas (sin cambio): E = 3,0 × KLOC^1,12 · T = 2,5 × E^0,35 · P = E / T.

| Métrica | Valor en v1.0 | Valor correcto (KLOC = 6,75) |
|---|---|---|
| Esfuerzo E | 24,2 persona-mes | **25,5 persona-mes** (3,0 × 6,75^1,12 = 3,0 × 8,487) |
| Tiempo T | 7,4 meses | **7,8 meses** (2,5 × 25,5^0,35) |
| Personas P | 3,3 | **3,3** (25,5 / 7,8; el cociente coincide) |

*Cómo se verifica:* `node -e "const E=3*6.75**1.12;console.log(E,2.5*E**0.35)"` imprime 25,46 y 7,76. La conclusión de v1.0 se mantiene: la estimación converge en un equipo de ≈ 3 personas durante 7 a 8 meses.

#### 4.1.4 Re-estimación con el alcance de SRS v1.2 *(propuesta)*

El SRS v1.2 agrega funciones que v1.0 no contaba. Cambios en el conteo:

| Componente | v1.0 | v1.2 | Motivo |
|---|---|---|---|
| ILF (10 PF c/u) | 5 | 7 | + compras, + consentimientos y plantillas biométricas |
| EIF (7 PF) | 3 | 3 | sin cambio |
| EI (4 PF) | 6 | 11 | + registrar usuario, iniciar sesión, enrolar rostro, gestionar catálogo, gestionar hubs |
| EO (5 PF) | 3 | 3 | sin cambio |
| EQ (4 PF) | 4 | 4 | sin cambio |

PFSA = 70 + 21 + 44 + 15 + 16 = **166 PF** · PFA = 166 × 1,07 ≈ **178 PF** · tamaño = 178 × 50 ≈ **8,9 KLOC**.

| Métrica | Resultado v1.2 |
|---|---|
| E = 3,0 × 8,88^1,12 | **34,6 persona-mes** |
| T = 2,5 × 34,6^0,35 | **8,6 meses** |
| P = E / T | **4,0 personas** |

Los supuestos (complejidad promedio, VAF = 1,07 y 50 SLOC/PF) siguen sin calibrar y deben recalibrarse con datos reales (riesgo RD9).

#### 4.1.5 Capacidad real frente a la estimación *(nuevo)*

Entre el cierre del primer avance (15-sep) y la sustentación (2-dic) hay ≈ 11,1 semanas ≈ 2,6 meses. Con 3 personas: 3 × 2,6 ≈ **7,8 persona-mes** disponibles, aproximadamente **30 %** de los 25,5 persona-mes del alcance original y **22 %** de los 34,6 del alcance ampliado. Esto no invalida el plan (los 25,5 incluyen el trabajo ya hecho de Inicio y Elaboración, 40 % según §4.2.6), pero confirma que **el alcance debe recortarse por prioridad de riesgo** y no por orden de aparición. Referencia para priorizar: primero desbloqueo, alertas, persistencia y consentimiento; después extras.

*Cómo se calculó:* semanas = (2-dic − 15-sep) / 7 = 11,1; meses ≈ semanas / 4,3.

### 4.2 Plan del proyecto

#### 4.2.4 Cronograma actualizado **[CAMBIO H8]**

| Hito | Fecha | Estado |
|---|---|---|
| Cierre Inicio (SRS, riesgos, plan) | 16-sep-2026 | Completado |
| Cierre Elaboración (primer avance) | 15-sep-2026 | Completado |
| **DFD del sistema (RF-19)** | 30-sep-2026 | **Vencido.** Artefacto elaborado el 1-oct-2026 (+1 día) en `entregables/analisis`; falta entrega formal. Registrado como riesgo RD14. |
| Segundo avance | 21-oct-2026 | Pendiente |
| Tercer avance | 25-nov-2026 | Pendiente |
| Cierre y sustentación final | 2-dic-2026 | Pendiente |

Objetivos por iteración, actualizados:

| Iteración | Objetivo v1.2 |
|---|---|
| Segundo avance | Portal funcional sobre API real: registro con consentimiento, catálogo, compra y alquiler con persistencia, flujo de desbloqueo con casco y rostro/QR, SEO, CI y primeras pruebas automatizadas de módulos críticos. |
| Tercer avance | Tiempo real (WebSocket/SSE), simulador MQTT con las 4 alertas, panel de operador completo, cobertura ≥ 80 % en módulos críticos, despliegue público. |

#### 4.2.6 Presupuesto **[CAMBIO H1]**
Esfuerzo total del alcance original: **25,5 persona-mes** (no 24,2), repartido Inicio 10 % (2,5) · Elaboración 30 % (7,6) · Construcción 45 % (11,5) · Transición 15 % (3,8). Para el alcance ampliado: 34,6 persona-mes.

### 4.4 Monitoreo y control

- **Medición (4.4.6)** — se agregan: densidad de defectos por módulo, cobertura de pruebas en módulos críticos, % de RF implementados y probados, desviación de esfuerzo real vs. estimado.
- **Control de calidad (4.4.4)** — una iteración no se cierra con pruebas pendientes en desbloqueo, seguridad ni tracking. La puerta de calidad se aplica automáticamente en CI.

## 5. Procesos técnicos

### 5.2 Métodos, herramientas y técnicas **[CAMBIO D1–D8]**

| Ámbito | v1.2 |
|---|---|
| Control de versiones | Git/GitHub; rama `main` protegida; ramas `feature/*`; *commits* convencionales; *tags* de release |
| Lenguaje y framework | TanStack Start, React 19, TypeScript, Tailwind 4, shadcn/ui |
| Persistencia | SQLite con Drizzle |
| Tiempo real e IoT | WebSocket (SSE de respaldo); broker MQTT aedes con publicadores simulados |
| Calidad | ESLint, Prettier, Vitest (unitarias e integración), Playwright (E2E), Lighthouse |
| Integración continua | GitHub Actions: lint, typecheck, test, build, Lighthouse en cada *push* |
| Documentación | Markdown + Mermaid con PNG exportados |

### 5.3 Infraestructura
Desarrollo con **Node 22 y npm** (la v1.0 menciona Bun; no está instalado en el entorno del equipo). Producción orientada a Cloudflare, sujeta a las limitaciones de WebSocket/MQTT que reporte el responsable de despliegue (riesgo RD15).

## 6. Procesos de soporte

### 6.1 Gestión de configuración **[CAMBIO D8]**
Además de la v1.0: *tags* de release (v0.1 primer avance, v0.2 segundo, v0.3 tercero), líneas base de los documentos (SRS, Plan y Riesgos v1.x), y plantilla de control de cambios para los requisitos. Detalle en `entregables/gcs`.

### 6.3 Documentación
La v1.0 dice que los documentos no se versionan dentro del repositorio. Se propone **reconsiderarlo**: versionar la documentación en `docs/` del repositorio permite trazabilidad de cambios y revisión de pares; decisión pendiente del equipo y del docente.

### 6.4 Aseguramiento de calidad (SQA proactivo)
Ver plan SQA en `entregables/sqa`. Resumen: se previenen defectos en cada fase del ciclo de vida: revisión del SRS (ambigüedades H2, H5, H6, H7, H9), inspección del diseño (contrato de API, arquitectura), revisión del código (PR + CI), pruebas por riesgo (RD7, RD8, RD11, RD13) y métricas.

## 8. Anexos
Anexo A: `SRS_v1.2.md` · Anexo B: `Riesgos_v1.2.md` · Anexo C: repositorio · Anexo D: `entregables/analisis` (DFD) y `entregables/diseno`.
