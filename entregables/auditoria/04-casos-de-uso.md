# 04 · Casos de uso e historias de usuario

Los 20 casos de uso están descritos con flujos, alternos y excepciones. Este documento verifica
**cuáles de esos caminos existen en el código**, incluidos los alternos y las excepciones, que es
donde suele estar la brecha.

## 1. Tablero de casos de uso

| UC    | Caso de uso                              | RF            | Veredicto | Qué falta o se desvía                                                                 |
| ----- | ---------------------------------------- | ------------- | --------- | ------------------------------------------------------------------------------------- |
| UC01  | Registrarse y dar consentimiento         | RF-20         | 🟡 Parcial | Un solo checkbox para datos personales y biometría; no se guarda la finalidad biométrica |
| UC02  | Iniciar o cerrar sesión                  | RF-21         | ✅ Cumple  | —                                                                                     |
| UC03  | Ver catálogo de venta                    | RF-02         | ✅ Cumple  | —                                                                                     |
| UC04  | Comprar vehículo                         | RF-03         | ✅ Cumple  | Sin bloqueo de compra concurrente del mismo vehículo (observación, no excepción del UC) |
| UC05  | Alquilar vehículo (hub o domicilio)      | RF-05         | 🟡 Parcial | No se exige `deliverable` para la modalidad domicilio                                 |
| UC06  | Ver flota y mapa multicapa               | RF-04, RF-08  | ✅ Cumple  | —                                                                                     |
| UC07  | Ver detalle de hub                       | RF-07         | ✅ Cumple  | —                                                                                     |
| UC08  | Desbloquear vehículo (QR + casco)        | RF-09         | ✅ Cumple  | —                                                                                     |
| UC09  | Desbloquear con rostro                   | RF-10, RF-22  | ❌ No cumple | El enrolamiento falla en modo API; el score lo calcula el cliente                     |
| UC10  | Ver KPIs y gemelos digitales             | RF-13, RF-14  | ✅ Cumple  | —                                                                                     |
| UC11  | Simular evento IoT                       | RF-15         | ✅ Cumple  | —                                                                                     |
| UC12  | Revisar bitácora de alertas              | RF-12         | ✅ Cumple  | —                                                                                     |
| UC13  | Gestionar catálogo y hubs                | RF-23, RF-24  | 🟡 Parcial | Alta y baja sí; **edición no tiene pantalla**                                         |
| UC14  | Asignar entrega a domiciliario           | RF-25         | 🟡 Parcial | E2 (tope de 5 entregas activas → 422) **no implementada**                              |
| UC15  | Ver entregas asignadas                   | RF-25         | ✅ Cumple  | —                                                                                     |
| UC16  | Realizar entrega de vehículo             | RF-25         | 🟡 Parcial | Cierre no atómico; estado final incoherente                                           |
| UC17  | Marcar entrega tardía                    | RF-27         | 🟡 Parcial | E2 (409 si ya está tardía) y E3 (422 sin motivo) no se aplican                        |
| UC18  | Realizar pago                            | RF-26         | 🟡 Parcial | E2 (timeout 10 s) no modelada                                                         |
| UC19  | Notificar retraso por correo             | RF-27         | ✅ Cumple  | Solo verificable en `simulated` (sin `BREVO_API_KEY`)                                 |
| UC20  | Reportar telemetría y alertas            | RF-08, RF-11  | 🟡 Parcial | E2 (posición stale) y E3 (reintento si falla la BD) no implementadas                  |

**Recuento: 11 ✅ · 8 🟡 · 1 ❌.**

## 2. Excepciones que el papel promete y el código no ejecuta

Esta es la parte más útil de la comparación: un caso de uso “feliz” puede funcionar y, aun así, no
cumplir lo que el propio documento exige en sus excepciones.

| UC    | Excepción prometida                                                       | Realidad                                                                                      |
| ----- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| UC14  | **E2.** Domiciliario con 5 entregas activas → 422 con repartidores disponibles | No existe el tope: `POST /api/deliveries` valida rol pero no carga; un courier puede acumular entregas sin límite |
| UC16  | **E1.** Confirmación atómica (entrega + reserva + vehículo)               | Cuatro escrituras separadas sin transacción (`handlers.ts:616-623`)                            |
| UC17  | **E2.** Manual sobre entrega ya `late` → 409; **E3.** Sin `reason` → 422  | `markLate` no distingue `late` y el handler pone un motivo por defecto; no hay 409 ni 422      |
| UC18  | **E2.** Timeout → `rejected` con `reason='timeout'`, negocio intacto      | La pasarela no tiene camino de timeout; siempre resuelve `approved`/`rejected`                 |
| UC20  | **E2.** Posición vieja (> 5 s) se marca stale; **E3.** Reintento si falla el log | `isPositionFresh()` existe en el dominio pero **no se usa en la ingesta**; no hay reintento ni marca `stale` |
| UC01  | Consentimiento **separado** y revocable                                   | Un checkbox; no hay endpoint ni pantalla de revocatoria                                        |
| UC09  | Plantilla cifrada, `face-api.js` en el navegador, score ≥ 0,85            | Vector 16×16 en claro; no se usa `face-api.js`; el score se acepta del cliente                 |

## 3. Historias de usuario

Las 38 HU de `historias-de-uso.md` se planificaron por semanas. Este es su estado real:

| Estado                  | HU                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| ✅ Cumplen (23)         | HU-01a, 02a, 03a, 04a, 05a, 05c, 06a, 06b, 07a, 08a, 08b, 08c, 10a, 11a, 12a, 14a, 15a, 16a, 17a, 18a, 18c, 19a, 19c |
| 🟡 Parciales (13)       | HU-01b, 02b, 04b, 05b, 09b, 13a, 13b, 14b, 16b, 17b, 18b, 20a, 20b                                 |
| ❌ No cumple (1)        | HU-09a                                                                                            |
| ⚪ No verificable (1)   | HU-19b (envío real por Brevo, requiere clave)                                                     |

### 3.1 Las brechas de HU que importan

| HU      | Promesa                                                                 | Realidad                                                                                                   |
| ------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| HU-09a  | “Enrolar/**revocar** plantilla biométrica (RF-22)”                      | El enrolamiento en modo API devuelve 422; no hay botón ni endpoint expuesto de revocatoria                |
| HU-01b  | “Consentimiento biométrico **separado y revocable**”                    | Checkbox único; nunca se envía `biometric: true`; no hay revocatoria                                       |
| HU-02b  | “Cerrar sesión e **invalidar token**”                                   | El logout borra la cookie; el token firmado sigue siendo válido hasta su expiración (24 h)                  |
| HU-13a  | “**CRUD** de vehículos desde `/admin`”                                  | Alta y baja; sin edición (el estado “planificado” ya no describe la realidad: hay más de lo que dice)      |
| HU-13b  | “**CRUD** de hubs con bloqueo de borrado”                               | Alta y baja con 409; sin edición                                                                           |
| HU-14b  | “Crear cuenta domiciliario y ver carga de trabajo”                      | Se ve la carga (`/api/couriers`), pero no se aplica el tope de 5 entregas                                  |
| HU-16b  | “Confirmar entrega cierra todo en **una transacción**”                  | No hay transacción                                                                                          |
| HU-17b  | “Domiciliario marca tardía **con causa**”                               | La causa es opcional (se rellena un texto por defecto)                                                      |
| HU-18b  | “Rechazo **y timeout** no cambian el negocio”                           | Rechazo sí; timeout no existe                                                                               |
| HU-20a  | “Ingesta actualiza gemelo (**≤ 5 s**)”                                  | El simulador emite cada 2 s, pero no hay prueba de latencia extremo a extremo                              |
| HU-20b  | “Reglas de alerta (**< 1 s**)”                                          | Sin instrumentación; además el estado se autolimpia en 2 s (R2)                                            |

### 3.2 La deriva del estado “planificado”

`historias-de-uso.md` cierra con: “UC13 (P3, 11 h) se queda como **planificado**”. El código ya
tiene alta y baja de vehículos y hubs, con guardia de borrado. Es decir:

- **No es cierto que UC13 esté sin hacer**: está hecho en un ~70 %.
- **Sí es cierto que no está completo**: falta la edición.
- El HANDOFF repite “UC13 quedó planificado (P3) — tiene endpoints, falta UI”, que **ya no es
  exacto**: la UI existe; lo que falta es el formulario de edición.

Este tipo de desfase es el que hace que un evaluador desconfíe del resto del estado declarado. No
hace falta “inflar” nada: basta con actualizar la frase a “alta/baja hechas, edición pendiente”.

## 4. Cobertura de los caminos por rol

| Rol             | Casos                   | Estado                                                                                      |
| --------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| Cliente         | UC01–UC09               | Completo salvo UC01 (consentimiento separado), UC05 (aptitud de entrega) y UC09 (biometría) |
| Operador        | UC10–UC14, UC12         | Completo salvo UC13 (edición) y UC14-E2 (tope de carga)                                     |
| Domiciliario    | UC15–UC17               | Completo salvo excepciones de UC17 y atomicidad de UC16                                     |
| Sistema / IoT   | UC18–UC20               | Pago sin timeout; ingesta sin frescura ni reintento                                         |

## 5. Conclusión

Los casos de uso **describen el sistema que se quería construir y, en su mayoría, el que se
construyó**. La diferencia está concentrada en tres patrones:

1. **Excepciones de borde no implementadas** (UC14-E2, UC17-E2/E3, UC18-E2, UC20-E2/E3). Son
   justamente las que un evaluador elige para probar “si el equipo pensó en lo que sale mal”.
2. **Garantías de atomicidad y de privacidad** que el texto exige con palabras fuertes
   (“transacción”, “cifrada”, “revocable”) y el código resuelve con escrituras sueltas o con un
   literal de demo.
3. **Estados documentales desactualizados**: UC13 aparece como planificado cuando está casi hecho;
   HU-09a aparece como planificada/cumplida cuando es inalcanzable en modo API.

Ninguno de los tres patrones exige rehacer un caso de uso completo; los tres exigen **cerrar los
bordes** y **decir la verdad sobre el estado**.
