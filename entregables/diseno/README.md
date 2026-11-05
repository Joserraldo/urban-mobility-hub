# Artefactos de diseño

Fase SDLC: **Diseño** (cómo se organiza el sistema para cumplir lo definido en `../analisis/`).

> **Los diagramas se movieron a [`../diagramas/`](../diagramas/README.md)** (del 08 al 23): C4,
> paquetes, componentes, nodos, clases, modelo de datos, secuencias y estados. Allí está cada imagen
> con una explicación corta de qué muestra y cómo leerla.

| Vista              | Diagramas                                                          |
| ------------------ | ------------------------------------------------------------------ |
| Arquitectura       | 08 C4 contexto · 09 C4 contenedores · 10 paquetes · 11 componentes · 12 nodos |
| Estructura         | 13 clases · 14 modelo de datos                                     |
| Secuencias         | 15 registro/sesión/cierre · 16 compra · 17 alquiler · 18 desbloqueo · 19 alerta · 20 entrega |
| Estados            | 21 reserva · 22 vehículo · 23 entrega                              |

Lo que hoy funciona corre en el computador del equipo (servidor de desarrollo + SQLite + simulador
de flota con eventos en vivo por SSE). La publicación en Cloudflare es arquitectura **prevista**
(ver `../gcs/despliegue.md`).

## Principios de POO en el diagrama de clases

**Qué es.** Clases del dominio, atributos y relaciones.
**Por qué existe.** Vista orientada a objetos; base de los tipos TypeScript compartidos.
**Cómo leerlo.** Rombo = composición; triángulo punteado = implementa interfaz; flecha punteada = depende de.

Principios POO presentes:

| Principio                   | Dónde se ve                                                                               | Beneficio                             |
| --------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------- |
| **Abstracción**             | `Vehicle`, `Hub`, `Reservation` modelan solo lo relevante                                 | Modelo pequeño y entendible           |
| **Encapsulamiento**         | `BiometricTemplate` expone `encrypt()`/`matches()`; nadie ve el texto plano               | RNF-03                                |
| **Interfaz + polimorfismo** | `DataSource` con implementaciones `mock`/`api`; en el servidor, repositorios sobre SQLite | RNF-10, mitiga RD5                    |
| **Herencia/implementación** | Cuatro `SecurityTrigger` (casco, caída, GPS, batería); `PaymentGateway` simulada y real   | Agregar una regla sin tocar las otras |
| **Bajo acoplamiento**       | `UnlockService` depende de interfaces, no de implementaciones                             | Pruebas con dobles (RD13)             |

## Checklist de verificación contra el código

- [x] (1-oct) Tipos del cliente alineados con `src/lib/data/types.ts`.
- [x] (8-oct) Nombres de enums alineados a `src/shared/types/domain.ts` (`VehicleStatus`, `UnlockSession.reservationId`, `AlertEvent.source`, `PaymentMethod`).
- [x] (8-oct) Tablas del DER materializadas: `src/server/db/schema.sql` (SQLite/D1-compatible; Drizzle queda opcional para prod).
- [x] (8-oct) `payments`, `deliveries`, `notifications` y rol `courier` implementados + UI (`/entregas`, panel `/admin`).
- [x] (8-oct) Rutas `/api/*` publicadas en el backend de desarrollo (`server/api/handlers.ts`); `docs/api/openapi.yaml` v0.2.0 extendido y **validado con js-yaml** (antes era YAML inválido, D-17).
- [ ] Topics MQTT reales con broker (hoy no hay MQTT: `fleet-sim` en proceso + SSE; ingresa por `POST /api/ingest`).
- [x] `services/brevo.ts` con clave por env/secret, fallback `simulated`, y prueba unitaria de la rama de fallo (`brevo.test.ts`).
- [ ] Esquema replicado en D1 con `wrangler d1 migrations` al publicar (mismo `schema.sql`).
- [x] (21-oct) Diagramas UML de paquetes, componentes y nodos (16-18) contrastados con `src/`. Verificación: `npm run typecheck`, `npm test` (82 pruebas) y `npm run test:e2e` (19 ok, 1 omitida solo-móvil) en verde.
