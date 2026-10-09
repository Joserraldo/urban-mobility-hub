# Plantilla — Historia de usuario

> Cómo se usa: copia a `historias-de-uso.md` (todas van en un solo archivo, ordenadas por caso de
> uso padre). Un caso de uso puede tener VARIAS historias; una historia es la unidad que se
> desarrolla y se prueba en un día o menos. Si una historia necesita más de un día, se parte.

---

## HU-nn — Título (acción + objeto, en voz del actor)

- **Caso de uso padre:** UCnn — Nombre
- **Como** (rol: cliente / operador / domiciliario) **quiero** (acción concreta) **para** (beneficio observable).
- **Prioridad:** P1 / P2 / P3 · **Estimación:** n h · **Semana del plan:** s1/s2
- **Criterios de aceptación** (Given–When–Then, se copian casi literales a Playwright/Vitest):

  1. **Given** (estado inicial con datos concretos) **When** (acción del usuario) **Then** (resultado medible + tabla que cambia).
  2. …
  3. (el paso alterno y cada excepción del caso de uso deben aparecer aquí o en otra historia hermana)

- **Fuera de esta historia:** (lo que explícitamente NO se toca; evita alcance arrastrado.)
- **Verificación:** prueba `tests/…` o captura `interfaces/…` (dónde se ve que quedó hecho).

---

_Reglas del proyecto: 1 historia = 1 rama del árbol del caso de uso. La estimación es de la persona que construye, no del que pide. "Terminado" = criterio verificado + prueba que pasa + documento actualizado._
