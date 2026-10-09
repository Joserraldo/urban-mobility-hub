# UC03 — Ver catálogo de venta

| Campo               | Valor                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- |
| ID                  | UC03                                                                               |
| Actor principal     | Cliente (también navegable anónimo desde `/catalogo`)                              |
| Actores secundarios | Rastreador de buscador (SEO)                                                       |
| Requisito(s)        | RF-02; RNF-11                                                                      |
| Prioridad           | P2                                                                                 |
| Estimación          | 3 h (HU-03a)                                                                       |
| Diagramas           | maestro `../img/01-casos-de-uso.png`; cliente `../img/02-casos-de-uso-cliente.png` |
| Historias           | HU-03a                                                                             |

**Intención.** Mostrar los vehículos en modo venta disponibles, con precio COP, condición y hub de recolección, sin exigir sesión: VER es público y está pensada para indexarse; COMPRAR (UC04) es lo que se porta.

**Precondiciones.**

- Existe al menos un `vehicles` con `mode='sale'`.
- Ninguna sesión requerida para ver.

**Garantías (postcondiciones).**

- La lista incluye SOLO `mode='sale' AND status='available'`; un `'sold'` o `'offline'` no aparece.
- Cada ficha expone `model`, `kind`, `condition`, `price_cop` y el hub (nombre/zona) de recolección.
- La página se entrega renderizada en servidor (SSR) para que el rastreador la lea sin JavaScript (RNF-11).

### Flujo principal (camino feliz)

| #   | Actor → Sistema      | Acción / respuesta del sistema                 | Datos (tabla / endpoint)                                   |
| --- | -------------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| 1   | Cliente / rastreador | Abre `/catalogo`                               | `GET` de la página (SSR)                                   |
| 2   | Sistema              | Consulta el stock en venta disponible          | `SELECT vehicles WHERE mode='sale' AND status='available'` |
| 3   | Sistema              | Resuelve el hub de cada vehículo               | JOIN `hubs` por `hub_id`                                   |
| 4   | Sistema              | Pinta las tarjetas con precio COP y condición  | UI                                                         |
| 5   | Cliente              | Filtra por tipo (`kind`) o hub                 | `GET /api/vehicles?mode=sale&kind=..&hubId=..`             |
| 6   | Cliente              | Abre la ficha `catalogo/{slug}` de un vehículo | `GET /api/vehicles/{id}`                                   |

### Pasos alternos

- **1a.** Sin JavaScript (rastreador): `/catalogo` devuelve el HTML completo de la lista; los filtros son progresivos y no bloquean el indexado.
- **5a.** El cliente llega desde el mapa (UC06) tocando un marcador en venta: mismo SELECT, con el vehículo preseleccionado.

### Excepciones

- **E1.** `status='sold'` o `'offline'`: no se lista (un vehículo vendido no vuelve al catálogo por esta vía).
- **E2.** Ficha de un vehículo inexistente (`/api/vehicles/{id}`): 404 `NOT_FOUND`.
- **E3.** Inventario en venta vacío: se renderiza el estado vacío ("sin unidades disponibles"), nunca un error.

### Reglas de negocio

- VER catálogo no requiere sesión; COMPRAR (UC04) sí. El gate de identidad vive en UC04/UC02, no aquí.
- Precio SIEMPRE COP entero (`price_cop`), formateado con separadores de miles en el cliente.
- Solo `mode='sale'`; los de `mode='rent'` pertenecen a la flota del mapa (UC06).
- Condición admisible: `'nuevo'|'seminuevo'` (columna `condition`).

### Fuera de alcance de este caso

- El proceso de compra y el pago (UC04 → UC18).
- Alta / edición / baja del inventario en venta (UC13, RF-23).
