# Artefactos de diseño

Fase SDLC: **Diseño** (cómo se organiza el sistema para cumplir lo definido en `../analisis/`).
Fuentes Mermaid en `mmd/`, PNG en `img/`. Regenerar: `sh ../_tools/render.sh`.

> **Estado y honestidad (1-oct-2026).** Los diagramas describen la arquitectura *decidida* en el plan maestro (D1–D8): contrato-first con `DataSource`, SQLite+Drizzle, WebSocket con respaldo SSE, MQTT con aedes. Los **tipos y métodos del cliente** (clases, estados, secuencia de desbloqueo) se alinearon con `src/lib/data/types.ts` y `datasource.ts` del repositorio, que hoy es lo único realmente publicado. Todavía **no existen** `src/shared/types` ni `docs/api` (backend), así que el lado servidor (`UnlockService`, `FleetRepository`, `SecurityTrigger`, tablas del DER) es **propuesto**; contrastarlo según el checklist del §11.

Cada artefacto trae *Qué es / Por qué existe / Cómo leerlo*.

---

## 1. Arquitectura C4 — nivel 1: Contexto

![C4 contexto](img/01-c4-contexto.png)

**Qué es.** El sistema como una caja azul rodeada de las personas y sistemas con los que habla. Es la vista más "alejada".
**Por qué existe.** Para que alguien nuevo entienda en 10 segundos qué es el sistema y de quién depende (pagos, facial, mapas, vehículos).
**Cómo leerlo.** Azul = lo que construimos. Gris = externos que no controlamos. Amarillo = personas. Las etiquetas de las flechas dicen el protocolo.

## 2. Arquitectura C4 — nivel 2: Contenedores

![C4 contenedores](img/02-c4-contenedores.png)

**Qué es.** La caja azul abierta: las piezas ejecutables o desplegables (portal, API, canal en tiempo real, broker MQTT, base de datos, simulador).
**Por qué existe.** Muestra dónde corre cada responsabilidad y por qué canal se hablan. Es el mapa para decidir dónde tocar al implementar un cambio.
**Cómo leerlo.** Dos caminos: *petición/respuesta* (Portal → API → Dominio → BD) y *flujo continuo* (Simulador → MQTT → Dominio → WebSocket → Portal). El portal solo conoce el `DataSource` (`src/lib/data`): por eso el simulador puede sustituirse por hardware real sin cambiar la UI (RNF-10, riesgo RD5).

## 3. Diagrama de componentes

![Componentes](img/08-componentes.png)

**Qué es.** Los módulos internos y quién depende de quién.
**Por qué existe.** Respalda RNF-09 (módulos Venta, Alquiler, Tracking y Seguridad se actualizan por separado) y RNF-08 (agregar hubs/vehículos sin cambiar estructura).
**Cómo leerlo.** De izquierda a derecha: pantallas → `DataSource` → rutas `/api/*` → módulos → `FleetRepository` → SQLite. Ningún componente de pantalla toca la base de datos ni MQTT directamente; esa regla es lo que se revisa en las inspecciones de arquitectura.

## 4. Diagrama de despliegue

![Despliegue](img/09-despliegue.png)

**Qué es.** Dónde corre cada pieza en producción y en desarrollo local.
**Por qué existe.** El plan 5.3 apunta a Cloudflare, pero no todo (WebSocket persistente, broker aedes) corre igual en un Worker. Queda marcado "por confirmar" hasta que el agente de Despliegue reporte limitaciones (riesgo RD15).
**Cómo leerlo.** Izquierda, el navegador; centro, el borde de Cloudflare; abajo, el entorno local con todo en un solo proceso Node.

## 5. Diagrama de clases (POO)

![Clases](img/03-clases.png)

**Qué es.** Las clases del dominio, sus atributos y relaciones.
**Por qué existe.** Es la vista orientada a objetos del sistema y la base de los tipos TypeScript compartidos. Hace explícitos los principios POO que sostienen los requisitos de mantenibilidad.
**Cómo leerlo.** Flecha continua con rombo/línea = asociación ("un usuario realiza muchas reservas"). Triángulo punteado = implementa una interfaz. Flecha punteada = depende de.

Principios POO presentes:

| Principio | Dónde se ve | Beneficio |
|---|---|---|
| **Abstracción** | `Vehicle`, `Hub`, `Reservation` modelan solo lo relevante del negocio | Modelo pequeño y entendible |
| **Encapsulamiento** | `BiometricTemplate` expone `encrypt()` y `matches()`; nadie ve el texto plano | Cumple RNF-03 |
| **Interfaz + polimorfismo** | `DataSource` con `MockDataSource` (en memoria) y `ApiDataSource` (REST) intercambiables; en el servidor, `FleetRepository` sobre SQLite | Cumple RNF-10, mitiga RD5 |
| **Herencia/implementación** | Cuatro `SecurityTrigger` (casco, caída, GPS, batería) | Agregar una regla sin tocar las otras (principio abierto/cerrado) |
| **Bajo acoplamiento** | `UnlockService` depende de interfaces, no de implementaciones | Se prueba con dobles de prueba (RD13) |

## 6. Secuencia: desbloqueo

![Secuencia de desbloqueo](img/04-secuencia-desbloqueo.png)

**Qué es.** El orden exacto de mensajes entre usuario, pantalla, API, servicios y vehículo durante el desbloqueo (RF-09, RF-10).
**Por qué existe.** Es el módulo más crítico (RD7) y el que más se presta a errores de orden: "Iniciar viaje" solo puede habilitarse si el casco fue verificado. La secuencia convierte esa regla en casos de prueba.
**Cómo leerlo.** De arriba abajo es el tiempo. El desbloqueo es una *sesión* (`UnlockSession`) que avanza por pasos `qr → helmet → ready` o termina en `denied`/`expired`; cada llamada es un método de `DataSource` real. `alt` = bifurcación (casco detectado o no). `opt` = camino opcional (rostro como alterno). Casos de prueba derivados: casco no detectado ⇒ botón deshabilitado; sesión vencida ⇒ `expired`; `startTrip` fuera del paso `ready` ⇒ rechazado; rostro con puntaje bajo ⇒ incidente registrado.

## 7. Secuencia: alerta de seguridad

![Secuencia de alerta](img/05-secuencia-alerta.png)

**Qué es.** El recorrido de un evento desde que el vehículo reporta hasta que el operador lo ve.
**Por qué existe.** Ancla dos requisitos medibles: posición ≤ 5 s (RNF-01) y alerta < 1 s (RNF-02), y el log auditable (RNF-04). Cada flecha es un punto donde medir latencia.
**Cómo leerlo.** El `alt` separa los dos finales: alerta (log + notificación) o sin novedad (solo posición). La nota final indica que el simulador del operador entra en el mismo camino, así una sola prueba cubre ambos orígenes.

## 8. Estados de la reserva

![Estados de reserva](img/06-estados-reserva.png)

**Qué es.** Los estados por los que pasa una reserva y qué evento provoca cada cambio.
**Por qué existe.** RF-05 define cuatro estados (solicitada, activa, completada, cancelada); aquí se fijan las transiciones válidas. Una transición no dibujada es un defecto (por ejemplo, completar una reserva cancelada).
**Cómo leerlo.** Círculo negro = inicio; círculo con anillo = fin. Cada flecha: *evento / condición*. En el código los estados son `requested | active | completed | cancelled` y los eventos de `transitionReservation` son `start | finish | cancel`. La transición "Activa → Cancelada por cierre del operador" es una **propuesta** nuestra: el SRS no la define y debe validarse.

## 9. Estados del vehículo

![Estados de vehículo](img/07-estados-vehiculo.png)

**Qué es.** El ciclo de vida del vehículo, con el estado de alerta anidado dentro de "En viaje".
**Por qué existe.** Separa dos cosas que suelen mezclarse: la disponibilidad del vehículo y su estado de alerta (RF-11). El SRS solo define las 4 alertas; "conducción indebida" (RD8 original) queda fuera de alcance (hallazgo H9).
**Cómo leerlo.** Estado exterior: Disponible, Reservado, En viaje, Cargando, Vendido. Interior de "En viaje": sin novedad y las cuatro alertas. Los estados *Reservado* y *Cargando* son una **propuesta de diseño**; el SRS no los nombra.

## 10. Modelo entidad–relación (DER)

![DER](img/10-der.png)

**Qué es.** Las tablas de la base de datos y sus relaciones (`PK` clave primaria, `FK` clave foránea, `UK` única).
**Por qué existe.** Es el contrato de persistencia (D2) y lo que Drizzle implementa. Cubre ILF del Plan: flota, hubs, reservas, usuarios, log de eventos, más compras, consentimientos y plantillas.
**Cómo leerlo.** `||--o{` = uno a muchos. `BIOMETRIC_TEMPLATE` guarda solo `cipher_text`, `iv` y `auth_tag` (AES-GCM): nunca la imagen. `ALERT_LOG` no se actualiza ni borra, solo se agrega (auditable). `occupied` del hub **no** es columna: se calcula contando vehículos (evita datos inconsistentes).

---

## 11. Checklist de verificación contra el código (pendiente)

Cuando existan `src/shared/types` y `docs/api`, comprobar:

- [x] (1-oct) Tipos del cliente (`Vehicle`, `Hub`, `Reservation`, `AlertEvent`, `UnlockSession`, `User`) alineados con `src/lib/data/types.ts`.
- [ ] Los de `src/shared/types` (backend) coinciden con los del cliente.
- [ ] Códigos de alerta del código (`no-helmet`, `crash`, `gps-lost`, `low-battery`) = las 4 alertas del SRS (sin_casco, caída, GPS, batería).
- [ ] Rutas `/api/*` y mensajes WebSocket reales (hoy el cliente solo tiene `MockDataSource`; `ApiDataSource` no existe aún).
- [ ] Esquema Drizzle coincide con el DER; ajustar el DER, no al revés, si hay diferencias justificadas.
- [ ] Topics MQTT: `umh/vehicle/{id}/telemetry` y `umh/vehicle/{id}/alert`.
