# 01 · Plan de Aseguramiento de Calidad (SQA) PROACTIVO

Proyecto: Plataforma Multimodal de Micromovilidad (Urban Mobility Hub) · Ing. de Software II · UNAB
Versión 1.0 · Responsable: rol QA · Fecha: 2026-10-01

## 1. ¿Qué es esto y por qué existe? (en simple)

**SQA** (Software Quality Assurance) = "asegurar la calidad del software".

Hay dos maneras de cuidar la calidad:

|                   | Reactivo (lo que NO queremos)                   | **Proactivo (lo que hacemos)**                                                                  |
| ----------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Cuándo            | Al final, probando el producto terminado        | **En cada fase**, desde el primer documento                                                     |
| Qué busca         | Errores que ya están metidos en el código       | **Evitar** que el error se meta                                                                 |
| Costo de un error | Alto (hay que rehacer código, diseño y pruebas) | Bajo (se corrige una frase del SRS)                                                             |
| Ejemplo           | "La demo falló: el casco nunca se verifica"     | "Al revisar el SRS vimos que 'verificar casco' no dice _cómo_; lo definimos antes de programar" |

> Idea clave: **un defecto encontrado en requisitos cuesta ~1x; en código ~10x; en producción ~100x** (regla clásica de Boehm). Por eso revisamos _antes_ de construir.

El plan sigue el ciclo de vida (SDLC): **Requisitos → Diseño → Código → Pruebas → Despliegue**. En cada fase hay _actividades de prevención_, _responsables_, _métricas_ y una _compuerta de calidad_ (si no se cumple, no se pasa a la siguiente fase).

## 2. Mapa de riesgos → qué actividad los previene

Los riesgos vienen del documento _Análisis de Riesgos_ del equipo. QA convierte cada riesgo de calidad en una actividad concreta:

| Riesgo     | Qué podría pasar                                                                                        | Actividad proactiva que lo previene                                                                   | Fase                |
| ---------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------- |
| RD7        | Reconocimiento facial deja pasar a quien no debe (falso positivo) o bloquea a quien sí (falso negativo) | Umbral definido en el SRS (0.85) + pruebas de límites (0.84 / 0.85 / 0.86)                            | Req → Pruebas       |
| RD8        | El trigger de seguridad no detecta caída o falta de casco                                               | Los 4 triggers se especifican con **umbral numérico** y se prueban cada uno por separado y combinados | Req → Código        |
| RD5 / RD10 | UI acoplada a datos mock; frontend y backend no se ponen de acuerdo                                     | Contrato de API/tipos primero (`src/shared/types`) + prueba de contrato                               | Diseño              |
| RD11       | Datos biométricos mal tratados (Ley 1581)                                                               | Checklist de seguridad en diseño + prueba "la plantilla biométrica nunca está en texto plano"         | Diseño → Pruebas    |
| RD12       | Mensajes MQTT/ingest mal formados o perdidos                                                            | Pruebas de integración de `/api/ingest` con payload válido e inválido                                 | Código → Pruebas    |
| RD13       | Poca cobertura de pruebas en módulos críticos                                                           | Umbral de cobertura ≥ 80 % que **bloquea el CI**                                                      | Código → Despliegue |
| RD1 / RD2  | Cambio de alcance / SRS ≠ lo simulado                                                                   | Matriz de trazabilidad viva (RF ↔ prueba ↔ resultado)                                                 | Todas               |

## 3. Plan por fase del ciclo de vida

### 3.1 Fase de REQUISITOS

**Objetivo:** que cada requisito sea claro, único, medible y verificable _antes_ de diseñar.

| Actividad                            | Cómo se hace                                                                           | Responsable                 | Evidencia                          | Métrica                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------- | -------------------------------------------------------- |
| Revisión formal del SRS (inspección) | Checklist IEEE 830: ¿ambiguo? ¿duplicado? ¿medible? ¿probado? ¿falta algo?             | QA (líder) + Planner + docs | `02-revision-srs.md`               | N.º de hallazgos por severidad; % de hallazgos resueltos |
| Revisión de verificabilidad          | Cada RF/RNF debe poder escribirse como un caso de prueba con "resultado esperado"      | QA                          | Matriz `03-matriz-trazabilidad.md` | % de requisitos con ≥1 caso de prueba (meta 100 %)       |
| Criterios de aceptación              | Cada requisito ambiguo recibe un criterio numérico (p. ej. "batería crítica = ≤ 15 %") | QA + Planner                | Sección "Propuesta" del doc 02     | N.º de ambigüedades convertidas en criterio              |
| Análisis de riesgos de calidad       | Vincular RD7, RD8, RD11, RD13 a requisitos                                             | QA + Planner                | Tabla §2                           | Riesgos altos con actividad asignada (meta 100 %)        |

**Compuerta R:** no se arranca el diseño del módulo si sus requisitos tienen hallazgos _Alta_ sin resolver.

### 3.2 Fase de DISEÑO

| Actividad                        | Cómo se hace                                                                                            | Responsable                 | Evidencia                                   | Métrica                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------- | ---------------------------------------------- |
| Revisión de arquitectura         | ¿La UI solo habla con una interfaz (DataSource/REST)? (RD5, RNF-10)                                     | QA + Backend                | Acta en `05-registro-defectos.md`           | Nº de acoplamientos UI↔datos detectados        |
| Contrato primero                 | Tipos compartidos y OpenAPI antes de programar                                                          | Backend (dueño) · QA revisa | Nota `contrato-pruebas`, `src/shared/types` | Nº de cambios de contrato después de congelado |
| Diseño para testear              | Lógica de negocio en **funciones puras** (reciben `now`, sin red/DB), así se prueba sin mocks complejos | Backend + QA                | `src/server/domain/*`                       | % de lógica crítica en funciones puras         |
| Checklist de seguridad           | Cifrado AES-GCM biometría, hash de contraseñas, consentimiento Ley 1581                                 | Backend + QA                | Checklist §5                                | Ítems cumplidos / total                        |
| Revisión de UML/DFD              | Consistencia entre casos de uso, secuencia y requisitos                                                 | Docs + QA                   | Artefactos en `entregables/diseno`          | Requisitos sin elemento de diseño asociado     |
| `data-testid` en el diseño de UI | La UI nace "testeable"                                                                                  | Frontend + QA               | Nota `contrato-testids`                     | % de elementos críticos con testid             |

**Compuerta D:** contrato de API publicado y revisado; sin acoplamientos UI↔mock en módulos críticos.

### 3.3 Fase de CÓDIGO (construcción)

| Actividad                                  | Cómo se hace                                                               | Responsable           | Evidencia           | Métrica                                           |
| ------------------------------------------ | -------------------------------------------------------------------------- | --------------------- | ------------------- | ------------------------------------------------- |
| Análisis estático                          | ESLint + `tsc --noEmit` en cada commit (pre-commit + CI)                   | CI                    | Salida del pipeline | Errores de lint/tipos = 0                         |
| Revisión por pares (Pull Request)          | Nadie fusiona a `main` su propio código; checklist §6                      | Los 3 integrantes     | PR en GitHub        | % de PRs revisados (meta 100 %); hallazgos por PR |
| TDD / test-first en módulos críticos       | QA escribe las pruebas desde el contrato **antes** de que exista el código | QA                    | `tests/unit/*`      | N.º de pruebas escritas antes del código          |
| Pruebas unitarias                          | Vitest sobre `src/server/domain`                                           | QA + dueño del módulo | `npm run test`      | Cobertura de líneas/ramas ≥ 80 % en críticos      |
| Commits convencionales y ramas `feature/*` | Trazabilidad cambio ↔ requisito                                            | CI/GCS                | Historial Git       | % de commits con referencia a RF                  |

**Compuerta C:** lint + typecheck + unit tests verdes y cobertura ≥ 80 % en módulos críticos.

### 3.4 Fase de PRUEBAS

| Actividad                      | Cómo se hace                                                          | Responsable   | Evidencia                 | Métrica                                              |
| ------------------------------ | --------------------------------------------------------------------- | ------------- | ------------------------- | ---------------------------------------------------- |
| Pruebas de integración         | Vitest: `/api/ingest` → regla de alerta → log → `/api/alerts`         | QA + Backend  | `tests/integration/*`     | Casos pasados / total                                |
| Pruebas E2E                    | Playwright (Chromium): flujos reales de usuario en navegador          | QA            | `tests/e2e/*`, capturas   | Flujos críticos verdes (meta 100 %)                  |
| Pruebas de rendimiento ligeras | RNF-01 (≤ 5 s posición) y RNF-02 (< 1 s alerta) medidas               | QA            | Informe de ejecución      | ms medidos vs umbral                                 |
| Pruebas de seguridad básicas   | Texto plano vs cifrado; consentimiento obligatorio                    | QA            | Casos TC-SEC-*            | Casos pasados                                        |
| Pruebas de accesibilidad/SEO   | Lighthouse (lo corre CI)                                              | CI + Frontend | Reporte Lighthouse        | SEO ≥ 95, A11y ≥ 90, Perf ≥ 85                       |
| Gestión de defectos            | Cada fallo = registro con pasos, esperado, obtenido, severidad, dueño | QA            | `05-registro-defectos.md` | Defectos abiertos por severidad; densidad (def/KLOC) |
| Regresión                      | La suite completa corre en cada push                                  | CI            | GitHub Actions            | % de ejecuciones verdes                              |

**Compuerta P:** 0 defectos de severidad Alta/Crítica abiertos en módulos críticos (criterio del Plan de Desarrollo §5.x).

### 3.5 Fase de DESPLIEGUE

| Actividad                        | Cómo se hace                                                                                                  | Responsable     | Evidencia                                  | Métrica                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------ | --------------------------------- |
| Smoke test post-despliegue       | 5 comprobaciones rápidas contra la URL pública: `/api/health`, landing, `/app`, `/admin`, un ingest de alerta | QA + Despliegue | `tests/e2e/smoke.spec.ts` (env `BASE_URL`) | Smoke verde                       |
| Revisión de configuración        | Variables de entorno, claves, DB, robots/sitemap                                                              | Despliegue + QA | Checklist §7                               | Ítems cumplidos                   |
| Disponibilidad (RNF-06 ≥ 95 %)   | Monitoreo simple de `/api/health` durante pruebas                                                             | Despliegue      | Registro de chequeos                       | % de disponibilidad               |
| Línea base y etiqueta de versión | `git tag v0.x` solo si pasaron las compuertas                                                                 | CI/GCS          | Tag en GitHub                              | Releases con compuertas cumplidas |
| Retro de calidad                 | ¿Qué defecto escapó y en qué fase debió atraparse?                                                            | Todos           | Sección final de `04-informe-ejecucion.md` | Defectos escapados por fase       |

**Compuerta Z (release):** compuertas R, D, C, P cumplidas + smoke verde.

## 4. Definition of Done (DoD) — "terminado" significa…

Una tarea/historia NO está terminada hasta que:

1. Tiene criterio de aceptación escrito y referencia a un RF/RNF.
2. Tiene pruebas automatizadas (unitarias y/o E2E) que pasan.
3. Lint y typecheck sin errores.
4. Revisada por al menos otra persona (PR aprobado).
5. Cobertura del módulo crítico ≥ 80 %.
6. Matriz de trazabilidad actualizada.
7. Sin defectos de severidad Alta abiertos.
8. Documentación mínima (qué hace, cómo se usa) actualizada.

## 5. Checklist de seguridad y cumplimiento (diseño)

- [ ] Consentimiento explícito Ley 1581 antes de capturar datos biométricos.
- [ ] Plantilla biométrica cifrada (AES-GCM); nunca texto plano (RNF-03).
- [ ] Contraseñas con hash (PBKDF2/bcrypt), tokens no en claro (RNF-05).
- [ ] Log de alertas auditable con id, tipo, fecha, coordenadas (RNF-04).
- [ ] Mensajes de error que no revelan datos internos.
- [ ] Sin claves en el repositorio.

## 6. Checklist de revisión de código (PR)

- [ ] ¿Cumple el requisito referenciado? ¿Hay criterio de aceptación?
- [ ] ¿La UI usa la interfaz de datos y no el mock directo? (RD5)
- [ ] ¿Valores "mágicos" (15 %, 5 s) están en constantes con nombre?
- [ ] ¿Hay prueba para el caso normal, el límite y el error?
- [ ] ¿Hay estados de carga/error/vacío en la UI?
- [ ] ¿Hay `data-testid` en lo que QA necesita?
- [ ] ¿Cobertura no baja?

## 7. Checklist de despliegue

- [ ] Variables de entorno definidas y no versionadas.
- [ ] `/api/health` responde 200.
- [ ] `robots.txt`, `sitemap.xml`, `llms.txt` accesibles.
- [ ] HTTPS activo.
- [ ] Smoke test verde contra la URL pública.

## 8. Roles y responsabilidades (RACI simplificado)

| Actividad                                                  | QA  | Backend | Frontend    | Planner | CI  | Despliegue | Docs |
| ---------------------------------------------------------- | --- | ------- | ----------- | ------- | --- | ---------- | ---- |
| Revisión SRS                                               | R   | C       | C           | A       | –   | –          | C    |
| Contrato API                                               | C   | R/A     | C           | I       | –   | –          | I    |
| Pruebas unit/integración                                   | R   | C       | C           | I       | I   | –          | –    |
| E2E                                                        | R   | I       | C (testids) | I       | I   | –          | I    |
| Pipeline CI y compuertas                                   | C   | –       | –           | I       | R/A | –          | –    |
| Smoke post-deploy                                          | R   | –       | –           | I       | C   | A          | –    |
| (R = ejecuta, A = responde, C = consultado, I = informado) |

## 9. Métricas de calidad (cuadro de mando)

| Métrica                                | Fórmula                        | Meta                               | Dónde se mide           |
| -------------------------------------- | ------------------------------ | ---------------------------------- | ----------------------- |
| Cobertura requisitos                   | RF/RNF con ≥1 prueba ÷ total   | 100 %                              | Matriz (doc 03)         |
| RF implementados                       | RF con prueba en verde ÷ 19    | Creciente por avance               | Matriz                  |
| Cobertura de código (módulos críticos) | líneas/ramas cubiertas         | ≥ 80 %                             | `npm run test:coverage` |
| Densidad de defectos                   | defectos ÷ KLOC                | Decreciente                        | Registro (doc 05)       |
| Defectos detectados temprano           | hallados en Req+Diseño ÷ total | ≥ 40 % (indicador de proactividad) | Docs 02 y 05            |
| Defectos Alta abiertos                 | conteo                         | 0 en release                       | Registro                |
| Tasa de éxito del CI                   | ejecuciones verdes ÷ total     | ≥ 90 %                             | GitHub Actions          |
| Tiempo de ciclo de defecto             | fecha cierre − fecha hallazgo  | < 1 iteración                      | Registro                |

## 10. Cronograma frente a las entregas del curso

- **2.º avance (21-oct-2026):** plan SQA, revisión SRS, matriz, suite unit+integración de alertas/desbloqueo/reservas, primer informe real.
- **3.er avance (25-nov-2026):** E2E completos, cobertura ≥ 80 %, Lighthouse en CI, smoke público.
- **Entrega final (2-dic-2026):** informe final, matriz 100 %, retro de calidad.

## 11. Qué _no_ cubre este plan (honestidad)

- No hay hardware real (Raspberry Pi/cámaras): se prueba contra el simulador y el endpoint `/api/ingest`.
- Reconocimiento facial real no se valida con personas; se valida la **lógica de decisión por umbral**.
- Pasarela de pagos real fuera de alcance: se prueba la reserva/compra interna.
