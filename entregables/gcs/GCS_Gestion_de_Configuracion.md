# Gestión de la Configuración del Software (GCS)

Proyecto: Plataforma Multimodal de Micromovilidad (`urban-mobility-hub`) · UNAB, Ingeniería de Software II
Versión del documento: 1.0 · Responde al Plan de Desarrollo, sección 6.1, y a la decisión D8 del plan maestro.

---

## 1. ¿Qué es la GCS, explicado simple?

Imagina que 3 personas escriben el mismo trabajo a la vez. Sin reglas, alguien pisa el trabajo de otro, nadie sabe cuál es la versión "buena" y no se puede volver atrás si algo se rompe.

La **Gestión de la Configuración** son las reglas que evitan eso. Responde 4 preguntas:

| Pregunta                                         | Nuestra respuesta                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| ¿Qué cosas controlamos? (ítems de configuración) | Código, documentos (SRS, Plan, Riesgos), scripts de CI, base de datos de ejemplo |
| ¿Cómo guardamos el historial?                    | Git + GitHub (cada cambio queda registrado: quién, cuándo, por qué)              |
| ¿Cómo sabemos qué versión es "la buena"?         | Ramas protegidas + etiquetas (tags) `v0.1`, `v0.2`, `v0.3`                       |
| ¿Cómo se cambia algo sin romper todo?            | Pull Request + revisión + CI en verde (control de cambios)                       |

Relación con SQA: la GCS es **prevención**. Un cambio no llega a `main` si no pasó lint, tipos, pruebas y build.

---

## 2. Ítems de configuración (qué se versiona)

| Ítem                                               | Dónde vive                            | Cómo se versiona                                      |
| -------------------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| Código fuente (`src/`)                             | Repo `urban-mobility-hub`             | Git: ramas, commits, tags                             |
| Pipeline de CI, hooks, plantillas                  | Repo (`.github/`, `.husky/`)          | Git (mismo flujo que el código)                       |
| Contrato de API (OpenAPI, tipos compartidos)       | Repo (`docs/api`, `src/shared/types`) | Git; cambios de contrato = PR con etiqueta `contrato` |
| SRS, Plan de Desarrollo, Análisis de Riesgos       | Carpeta del curso                     | Numeración `v1.x` + **líneas base** (sección 6)       |
| Entregables (interfaces, manual técnico, SQA, UML) | `entregables/`                        | Línea base en cada avance                             |

---

## 3. Estrategia de ramas

```
main  ●────────●─────────────●──────────●───▶   (siempre estable, protegida)
       \      / \           /  \        /
feature/xyz ●─●   \  fix/abc ●   docs/uml ●
                   \
                    release: tags v0.1 · v0.2 · v0.3 sobre main
```

- **`main`**: siempre funciona. Nadie hace push directo. Solo entra código por Pull Request.
- **`feature/<tema>`**: una funcionalidad (ej. `feature/desbloqueo-qr`).
- **`fix/<tema>`**: corrección de un defecto (ej. `fix/alerta-bateria`).
- **`docs/<tema>`**: solo documentación.
- **`chore/<tema>`**: tareas técnicas (CI, dependencias).
- Ramas cortas (idealmente < 3 días) y se borran al fusionar.

**Protección de `main` (configurar en GitHub → Settings → Branches):**

1. Exigir Pull Request antes de fusionar.
2. Exigir que pasen los checks de CI: `quality`, `build`, `lighthouse`.
3. Exigir rama actualizada con `main`.
4. Prohibir force-push y borrado de `main`.
5. Fusionar con _squash_ para historial limpio.

> Nota: estos ajustes los hace el dueño del repo en GitHub; no se pueden dejar "en código".

---

## 4. Commits convencionales

Formato: `tipo(alcance): resumen corto en imperativo`

| Tipo             | Cuándo                                        |
| ---------------- | --------------------------------------------- |
| `feat`           | Nueva funcionalidad                           |
| `fix`            | Corrección de defecto                         |
| `docs`           | Solo documentación                            |
| `test`           | Agregar o mejorar pruebas                     |
| `refactor`       | Cambiar estructura sin cambiar comportamiento |
| `ci`             | Pipeline, hooks, automatización               |
| `chore`          | Mantenimiento (dependencias, config)          |
| `perf` / `style` | Rendimiento / formato                         |

Ejemplos:

```
feat(unlock): agregar desbloqueo por QR como alterno al facial (RF-10)
fix(alerts): disparar alerta de batería baja por debajo del 15% (RF-12)
docs(gcs): definir línea base LB-1
```

Por qué: el historial se lee como un cuaderno, y permite generar el _changelog_ automáticamente. Un hook (`commit-msg`) rechaza mensajes que no cumplan el formato. Recomendado citar el requisito (`RF-xx`) para **trazabilidad**.

---

## 5. Versionado y releases (tags)

Usamos versionado semántico simplificado `vMAYOR.MENOR`, uno por entrega académica:

| Tag    | Entrega       | Fecha                        | Contenido esperado                                                |
| ------ | ------------- | ---------------------------- | ----------------------------------------------------------------- |
| `v0.1` | Primer avance | ya entregado / base del repo | Prototipo inicial                                                 |
| `v0.2` | 2.º avance    | **21-oct-2026**              | Portal funcional + SEO + API/persistencia base + primeras pruebas |
| `v0.3` | 3.º avance    | **25-nov-2026**              | Tiempo real, IoT simulado, alertas, SQA completo                  |
| `v1.0` | Entrega final | **2-dic-2026**               | Versión estable final                                             |

Cómo se crea un release (lo hace el integrante responsable tras tener CI verde en `main`):

```
git checkout main && git pull
git tag -a v0.2 -m "Segundo avance: portal funcional + SEO"
git push origin v0.2          # requiere confirmación del equipo
```

Un flujo (`release.yml`) crea automáticamente el Release en GitHub con notas generadas desde los commits.

---

## 6. Líneas base de documentos

Una **línea base** es una versión "congelada y aprobada": solo se cambia con control de cambios (sección 7).

| Línea base | Momento                    | Contenido congelado                                                                           | Etiqueta  |
| ---------- | -------------------------- | --------------------------------------------------------------------------------------------- | --------- |
| **LB-0**   | Entrega inicial            | SRS v1.1, Análisis de Riesgos v1.1, Plan de Desarrollo v1.0                                   | `doc-LB0` |
| **LB-1**   | Cierre 2.º avance (21-oct) | SRS v1.2, Plan v1.1 (COCOMO recalculado, hallazgos H1–H9), Riesgos v1.2, DFD, UML de análisis | `v0.2`    |
| **LB-2**   | Cierre 3.º avance (25-nov) | Manual técnico, diseño, plan y resultados SQA, trazabilidad RF→pruebas                        | `v0.3`    |
| **LB-3**   | Entrega final (2-dic)      | Todo lo anterior consolidado                                                                  | `v1.0`    |

Cada documento lleva una **tabla de historial** al inicio: versión · fecha · autor · qué cambió · solicitud de cambio (CR) asociada.
Los entregables `.docx/.pdf` se guardan en `entregables/` y el repo guarda la versión de referencia en `docs/` con el tag correspondiente, de modo que cada tag contiene código **y** documentos coherentes entre sí.

---

## 7. Control de cambios (cómo se pide y aprueba un cambio)

```
1. Solicitud (Issue "Solicitud de cambio")
        ↓
2. Evaluación: ¿impacto en alcance, riesgos, cronograma, pruebas?
        ↓
3. Decisión: aprobar / rechazar / posponer (responsable del área + docente si toca requisitos)
        ↓
4. Implementación en rama feature/fix + Pull Request
        ↓
5. Verificación: CI verde + revisión de otra persona + pruebas actualizadas
        ↓
6. Fusión a main + actualización de documentos afectados (nueva versión)
```

Clasificación rápida:

- **Menor** (typo, estilo, refactor interno): PR + 1 revisión.
- **Mayor** (cambia un requisito, el contrato de API, un módulo crítico de seguridad): requiere Issue de cambio aprobado **antes** del código y actualizar SRS/trazabilidad.

La plantilla del formulario está en `.github/ISSUE_TEMPLATE/solicitud-cambio.yml` (en el repo) y su equivalente en texto abajo.

### Plantilla de Solicitud de Cambio (CR)

| Campo                                         | Contenido                        |
| --------------------------------------------- | -------------------------------- |
| ID                                            | CR-001                           |
| Fecha / solicitante                           |                                  |
| Ítem afectado                                 | (código, SRS, API, riesgo…)      |
| Descripción del cambio                        |                                  |
| Motivo                                        |                                  |
| Impacto (alcance / tiempo / riesgo / pruebas) |                                  |
| Requisitos afectados                          | RF-xx / RNF-xx                   |
| Decisión                                      | Aprobado / Rechazado / Pospuesto |
| Versión resultante                            |                                  |

---

## 8. Quality gates (lo que un cambio debe pasar para entrar a `main`)

| Gate                                       | Herramienta                | Dónde corre                    |
| ------------------------------------------ | -------------------------- | ------------------------------ |
| Formato de commit                          | commitlint                 | hook `commit-msg` + CI (en PR) |
| Lint (estilo y errores comunes)            | ESLint                     | hook `pre-commit` + CI         |
| Tipos                                      | `tsc --noEmit`             | hook `pre-push` + CI           |
| Pruebas unitarias/integración              | Vitest                     | CI (y `pre-push` rápido)       |
| Cobertura ≥ 80 % en módulos críticos       | Vitest coverage            | CI                             |
| Build de producción                        | `build`                    | CI                             |
| Auditoría de dependencias                  | `npm audit` (alto/crítico) | CI                             |
| Lighthouse: SEO ≥ 95, A11y ≥ 90, Perf ≥ 85 | Lighthouse CI              | CI                             |
| Revisión humana                            | Pull Request, 1 aprobación | GitHub                         |

**Definición de "Hecho" (DoD) para un PR:** pasa todos los gates, tiene pruebas del requisito, cita el RF, y actualiza documentación si cambia comportamiento.

---

## 9. Respaldo y recuperación

GitHub es la copia remota. Cada integrante tiene un clon local completo. Para volver a una versión: `git checkout v0.2`. Para deshacer un cambio ya fusionado: `git revert <commit>` (nunca reescribir `main`).

## 10. Roles

| Rol                       | Responsabilidad GCS                                      |
| ------------------------- | -------------------------------------------------------- |
| Dueño del repo            | Proteger `main`, crear tags/releases                     |
| Cada integrante           | Trabajar por ramas, commits convencionales, PRs pequeños |
| Revisor (otro integrante) | Aprobar PR siguiendo la checklist                        |
| Docente                   | Valida líneas base en cada corte                         |
