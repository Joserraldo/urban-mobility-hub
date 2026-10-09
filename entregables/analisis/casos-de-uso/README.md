# Casos de uso descritos

Un archivo por caso (plantilla en `../plantillas/plantilla-caso-de-uso.md`). Cada documento es
implementable y testeable sin preguntas: los pasos citan tablas reales (`vehicles`,
`payments`, `deliveries`…) y endpoints (`/api/...`); los alternos y excepciones son la fuente
directa de los criterios de aceptación de `../historias-de-uso.md`.

| #    | Documento                                                              | Actor                   | RF           | Prioridad | Est | Historias |
| ---- | ---------------------------------------------------------------------- | ----------------------- | ------------ | --------- | --- | --------- |
| UC01 | [Registrarse y dar consentimiento](UC01-registrarse-consentimiento.md) | Compartido              | RF-20        | P1        | 4 h | HU-01a,b  |
| UC02 | [Iniciar o cerrar sesión](UC02-iniciar-cerrar-sesion.md)               | Compartido              | RF-21        | P1        | 4 h | HU-02a,b  |
| UC03 | [Ver catálogo de venta](UC03-ver-catalogo-venta.md)                    | Cliente                 | RF-02        | P2        | 3 h | HU-03a    |
| UC04 | [Comprar vehículo](UC04-comprar-vehiculo.md)                           | Cliente                 | RF-03        | P1        | 5 h | HU-04a,b  |
| UC05 | [Alquilar vehículo (hub o domicilio)](UC05-alquilar-vehiculo.md)       | Cliente                 | RF-05        | P1        | 6 h | HU-05a..c |
| UC06 | [Ver flota y mapa multicapa](UC06-ver-flota-mapa.md)                   | Cliente                 | RF-04, RF-08 | P1        | 5 h | HU-06a,b  |
| UC07 | [Ver detalle de hub](UC07-ver-detalle-hub.md)                          | Cliente                 | RF-07        | P2        | 2 h | HU-07a    |
| UC08 | [Desbloquear vehículo (QR + casco)](UC08-desbloquear-vehiculo.md)      | Cliente                 | RF-09        | P1        | 8 h | HU-08a..c |
| UC09 | [Desbloquear con rostro](UC09-desbloquear-rostro.md)                   | Cliente                 | RF-10, RF-22 | P2        | 5 h | HU-09a,b  |
| UC10 | [Ver KPIs y gemelos digitales](UC10-ver-kpis-gemelos.md)               | Operador                | RF-13, RF-14 | P1        | 3 h | HU-10a    |
| UC11 | [Simular evento IoT](UC11-simular-evento-iot.md)                       | Operador                | RF-15        | P1        | 2 h | HU-11a    |
| UC12 | [Revisar bitácora de alertas](UC12-revisar-bitacora-alertas.md)        | Operador                | RF-12        | P1        | 3 h | HU-12a    |
| UC13 | [Gestionar catálogo y hubs](UC13-gestionar-catalogo-hubs.md)           | Operador                | RF-23, RF-24 | P3        | 6 h | HU-13a,b  |
| UC14 | [Asignar entrega a domiciliario](UC14-asignar-entrega.md)              | Operador                | RF-25        | P2        | 5 h | HU-14a,b  |
| UC15 | [Ver entregas asignadas](UC15-ver-entregas-asignadas.md)               | Domiciliario            | RF-25        | P2        | 3 h | HU-15a    |
| UC16 | [Realizar entrega de vehículo](UC16-realizar-entrega-vehiculo.md)      | Domiciliario            | RF-25        | P2        | 6 h | HU-16a,b  |
| UC17 | [Marcar entrega tardía](UC17-marcar-entrega-tardia.md)                 | Domiciliario / cron     | RF-27        | P2        | 4 h | HU-17a,b  |
| UC18 | [Realizar pago](UC18-realizar-pago.md)                                 | Sistema (vía UC04/UC05) | RF-26        | P1        | 8 h | HU-18a..c |
| UC19 | [Notificar retraso por correo](UC19-notificar-retraso-correo.md)       | Sistema                 | RF-27        | P2        | 5 h | HU-19a..c |
| UC20 | [Reportar telemetría y alertas](UC20-reportar-telemetria-alertas.md)   | Vehículo IoT            | RF-08, RF-11 | P1        | 6 h | HU-20a,b  |

**Lectura rápida para la clase:** maestro en `../img/01-casos-de-uso.png` → este índice →
2 casos completos a elección del docente (sugeridos: UC08 desbloqueo y UC16/UC19 entrega+correo).
