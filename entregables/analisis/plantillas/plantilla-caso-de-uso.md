# Plantilla — Descripción de caso de uso

> Cómo se usa: copia este archivo a `casos-de-uso/UCnn-nombre-corto.md`, rellena **todas** las
> secciones y borra las notas en cursiva. Un caso de uso describe UNA intención de UN actor;
> si sientes que hay dos intenciones, son dos casos.
> Convenciones del proyecto: los pasos citan tablas reales (`reservations`, `payments`…) y
> endpoints (`POST /api/...`); las pruebas se derivan de los pasos alternos y excepciones.

---

## UCnn — Nombre del caso (verbo + objeto)

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| ID                  | UCnn                                                                  |
| Actor principal     | (quién logra la intención)                                            |
| Actores secundarios | (sistemas externos: Pasarela, Brevo, API de Mapas, Vehículo…)         |
| Requisito(s)        | (RF-xx del SRS)                                                       |
| Prioridad           | P1 / P2 / P3                                                          |
| Estimación          | (horas; suma de las historias de usuario asociadas)                   |
| Diagramas           | maestro `img/01-casos-de-uso.png`; secuencia `../diseno/img/xx-….png` |
| Historias           | HU-xx, HU-xx (ver `historias-de-uso.md`)                              |

**Intención.** (Una frase: qué logra el actor y por qué le importa.)

**Precondiciones.** (Qué debe ser verdadero ANTES; ej.: sesión iniciada (UC02); el vehículo existe en `vehicles` con `status='available'`.)

**Garantías (postcondiciones).** (Qué queda verdadero al terminar, pase lo que pase; ej.: todo `payments` insertado tiene `reference` de la pasarela.)

### Flujo principal (camino feliz)

| #   | Actor → Sistema | Acción / respuesta del sistema | Datos (tabla / endpoint) |
| --- | --------------- | ------------------------------ | ------------------------ |
| 1   | Actor           | …                              | `POST /api/...`          |
| 2   | Sistema         | …                              | `SELECT/INSERT/UPDATE …` |

### Pasos alternos (otro camino válido)

- **2a.** (en el paso 2, si…) → … y el caso termina/continúa en …

### Excepciones (algo sale mal)

- **E1.** (fallo externo o de datos) → el sistema … y el actor ve … (estado final).

### Reglas de negocio

- (validaciones, umbrales del código: `HELMET_MIN_CONFIDENCE = 0.80`, TTL 120 s, ceil de minutos…)

### Fuera de alcance de este caso

- (lo que otro caso hace; evita que un documento "se coma" a otro.)

---

_Criterio de calidad del documento: otro miembro del equipo podría implementar y probar este caso sin preguntar nada. Si hay que preguntar, falta un paso alterno o una regla._
