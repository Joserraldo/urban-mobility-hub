# Artefactos de análisis

Fase SDLC: **Análisis** (qué debe hacer el sistema, sin decir todavía cómo).
Los diagramas se escriben en Mermaid (`mmd/`) y se exportan a PNG (`img/`). Para regenerarlos: `sh ../_tools/render.sh`.

> Estado: el DFD (RF-19) y los casos de uso salen de los requisitos del SRS y no dependen del código. El modelo de datos concreto se confirma contra `src/shared/types` cuando el backend lo publique (ver `../diseno/README.md`).

**Cómo leer este documento:** cada artefacto trae tres bloques: *Qué es*, *Por qué existe* y *Cómo leerlo*. Si solo tienes 5 minutos, lee el DFD nivel 0 y el de casos de uso.

---

## 1. Diagrama de casos de uso

![Casos de uso](img/01-casos-de-uso.png)

**Qué es.** Un mapa de *quién* usa el sistema y *para qué*. Cada óvalo es algo que un actor quiere lograr.

**Por qué existe.** Antes de diseñar hay que ponerse de acuerdo en el alcance. Sirve para detectar funciones olvidadas: al armarlo aparecieron los casos de registro/consentimiento y de gestión de catálogo, que el SRS v1.1 presuponía pero no tenía como requisito (hallazgos H2 y H7, ver `../gestion/`).

**Cómo leerlo.**
- Personas a la izquierda (Usuario final, Operador, Vehículo IoT); sistemas externos a la derecha (Pasarela de pagos, Servicio facial).
- Línea continua: el actor inicia el caso de uso. Línea punteada hacia un externo: el caso de uso necesita ese servicio.
- `«include»`: el caso obligatoriamente usa a otro (comprar *incluye* iniciar sesión). `«extend»`: variante opcional (desbloquear con rostro *extiende* el desbloqueo normal; es el mecanismo alterno de RF-10).

| Caso de uso | Actor | Requisito |
|---|---|---|
| Registrarse y dar consentimiento | Usuario | RF-20 (propuesto), RNF-03/05, Ley 1581 |
| Iniciar sesión | Usuario | RF-21 (propuesto) |
| Ver catálogo de venta | Usuario | RF-02 |
| Comprar vehículo | Usuario, Pasarela | RF-03 |
| Ver flota y mapa multicapa | Usuario | RF-04, RF-06 |
| Alquilar (hub o domicilio) | Usuario, Pasarela | RF-05 |
| Desbloquear (QR + casco) | Usuario | RF-09 |
| Desbloquear con rostro | Usuario, Servicio facial | RF-10 |
| Ver detalle de hub | Usuario | RF-07 |
| Ver KPIs y gemelos digitales | Operador | RF-13, RF-14 |
| Simular evento IoT | Operador | RF-15 |
| Revisar log de alertas | Operador | RF-12, RNF-04 |
| Gestionar catálogo y hubs | Operador | RF-23, RF-24 (propuestos) |
| Reportar telemetría y alertas | Vehículo IoT | RF-08, RF-11, RF-16 |

---

## 2. DFD nivel 0 (diagrama de contexto) — RF-19

![DFD nivel 0](img/02-dfd-nivel-0.png)

**Qué es.** El sistema completo como **una sola burbuja** y todo lo que entra y sale de ella. Los rectángulos son quienes se comunican con el sistema (entidades externas) y las flechas son datos, no acciones.

**Por qué existe.** RF-19 exige un DFD que muestre cómo viaja la información entre usuarios, portal, tracking y seguridad IoT. El nivel 0 fija la frontera: qué datos cruzan hacia afuera y hacia adentro. Si un dato no aparece aquí, el sistema no lo maneja.

**Cómo leerlo.** Empieza por el Usuario: lo que envía (credenciales, compra, QR, fotos) y lo que recibe (catálogo, mapa, estado de desbloqueo). Luego el Operador, y por último los externos (pagos, facial, mapas, IoT). Las flechas del IoT son las únicas que llegan sin que nadie humano las dispare.

---

## 3. DFD nivel 1 — RF-19

![DFD nivel 1](img/03-dfd-nivel-1.png)

**Qué es.** La burbuja del nivel 0 abierta en cinco procesos, con los almacenes de datos (cilindros) donde se guarda la información.

**Por qué existe.** Muestra dónde se transforma y se guarda cada dato, que es lo que el SRS pide documentar. También hace visible la responsabilidad de cada módulo (RNF-09: módulos actualizables por separado) y qué almacén toca cada uno.

**Cómo leerlo.** Sigue un recorrido de punta a punta:
1. *Comprar o alquilar:* Usuario → **P1** → cobra con la Pasarela → escribe en **D3**.
2. *Desbloquear:* Usuario → **P2** → lee la reserva en D3, valida rostro con el Servicio facial usando la plantilla de **D1**, y envía el comando al vehículo.
3. *Ver el mapa:* Vehículo → **P3** → actualiza **D2** → el usuario ve la posición en ≤ 5 s (RNF-01).
4. *Alerta:* Vehículo → **P4** → registra en **D4** y notifica al Operador en < 1 s (RNF-02). **P5** puede inyectar el mismo evento desde el simulador (RF-15).

| Proceso / almacén | Qué hace o guarda | RF |
|---|---|---|
| P1 Portal de negocio | Catálogo, compra y alquiler | RF-01 a RF-07 |
| P2 Autenticación y desbloqueo | Registro, login, QR, casco, rostro | RF-09, RF-10, RF-20, RF-21 |
| P3 Tracking | Recibe telemetría y la publica al mapa | RF-08, RF-16, RF-17 |
| P4 Seguridad IoT | Evalúa 4 reglas, crea alertas | RF-11, RF-12 |
| P5 Administración y telemetría | KPIs, gemelos, simulador, CRUD | RF-13 a RF-15, RF-23, RF-24 |
| D1 | Usuarios, consentimientos, plantillas biométricas **cifradas** | RNF-03, RNF-05 |
| D2 | Flota y hubs (gemelos digitales) | RF-16, RF-17 |
| D3 | Reservas y compras | RF-03, RF-05 |
| D4 | Log de alertas auditable | RF-12, RNF-04 |

**Diccionario de datos (mínimo).**

| Flujo | Contenido |
|---|---|
| Telemetría | `vehicleId`, lat, lng, batería, marca de tiempo |
| Evento de alerta | `vehicleId`, tipo (`sin_casco`, `caida`, `perdida_gps`, `bateria_critica`), lat, lng, marca de tiempo |
| Comando de desbloqueo | `vehicleId`, acción, `reservationId` |
| Resultado de pago | referencia, estado (aprobado/rechazado), monto en COP |

---

## 4. Trazabilidad de los artefactos con los requisitos

| Requisito | Casos de uso | DFD | Diseño (ver `../diseno/`) |
|---|---|---|---|
| RF-01 a RF-07 | sí | P1, D2, D3 | componentes, clases |
| RF-08, RNF-01 | sí | P3, D2 | secuencia de alerta (rama "sin novedad") |
| RF-09, RF-10 | sí | P2, D1 | secuencia de desbloqueo |
| RF-11, RF-12, RNF-02, RNF-04 | sí | P4, D4 | secuencia de alerta, estados del vehículo |
| RF-13 a RF-17 | sí | P5, D2 | componentes, DER |
| RF-19 | — | este documento | — |

## 5. Supuestos y límites

- Los RF marcados *(propuesto)* (RF-20 a RF-24) no existen en el SRS v1.1; se proponen en `../gestion/SRS_v1.2.md`.
- El DFD no muestra el protocolo (MQTT, REST, WebSocket); eso se ve en `../diseno/`.
- La Pasarela de pagos y el Servicio facial son externos: en el entorno de demostración pueden estar simulados.
