# Diagramas del proyecto

Todos los diagramas del proyecto están en esta carpeta. Van en orden de lectura: primero **qué**
hace el sistema (análisis) y después **cómo** está construido (diseño).

| Carpeta        | Contenido                                                            |
| -------------- | -------------------------------------------------------------------- |
| `img/`         | Las imágenes listas para el documento o la presentación (PNG y SVG)  |
| `fuentes/`     | El código de cada diagrama (`.puml` PlantUML, `.py` y `.mmd`)        |
| `_anteriores/` | Versiones viejas o reemplazadas; se guardan solo como historial      |

**Criterio de redacción.** Los diagramas usan lenguaje del negocio ("guarda la reserva", "cobra el
valor base") en lugar de SQL, rutas HTTP o nombres de archivos. Se conservan la notación UML,
las ramas alternativas (`alt`, `opt`), las reglas con números (casco ≥ 80 %, sesión de desbloqueo
de 2 minutos, valor base de $10.000) y las relaciones `«include»`/`«extend»`. El detalle técnico
(tablas, endpoints) queda en `docs/api/openapi.yaml` y `src/server/db/schema.sql`.

---

## Análisis: qué hace el sistema

| #   | Diagrama                                                       | Qué muestra                                                                                     |
| --- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 01  | [Contexto del SRS](img/01-contexto-srs.png)                    | El sistema como una caja, con quién intercambia datos y qué archivos maneja (puntos de función) |
| 02  | [Casos de uso general](img/02-casos-de-uso-general.png)        | Los 20 casos de uso y los tres roles en un solo plano                                           |
| 03  | [Casos de uso del Cliente](img/03-casos-de-uso-cliente.png)    | Comprar, alquilar, ver el mapa, desbloquear y pagar                                             |
| 04  | [Casos de uso del Operador](img/04-casos-de-uso-operador.png)  | Indicadores, simulación, historial de alertas, catálogo y asignación de entregas                |
| 05  | [Casos de uso del Domiciliario](img/05-casos-de-uso-domiciliario.png) | Ver y realizar entregas; marcar retrasos y avisar por correo                             |
| 06  | [DFD nivel 0](img/06-dfd-nivel-0.png)                          | Qué datos entran y salen del sistema                                                            |
| 07  | [DFD nivel 1](img/07-dfd-nivel-1.png)                          | Los seis procesos internos y los cinco almacenes de datos                                       |

**Cómo leer los casos de uso.** Monigote = actor; óvalo = caso de uso; línea = el actor lo usa;
`«include»` = siempre ocurre (comprar siempre incluye pagar); `«extend»` = ocurre solo a veces
(desbloquear con el rostro es una alternativa); triángulo hueco = herencia (el Operador y el
Domiciliario también son Clientes).

**Cómo leer los DFD.** Las flechas son **datos**, no acciones. Rectángulo = alguien de afuera;
óvalo = proceso; cilindro = lugar donde se guarda información.

## Diseño: cómo está construido

### Arquitectura

| #   | Diagrama                                        | Qué muestra                                                                                                    |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 08  | [C4 contexto](img/08-c4-contexto.png)           | El sistema, sus tres tipos de usuario y los servicios externos (pagos, mapas, correo)                          |
| 09  | [C4 contenedores](img/09-c4-contenedores.png)   | Las cinco piezas grandes: sitio web, servidor, canal en vivo, simulador y base de datos                         |
| 10  | [Paquetes](img/10-paquetes.png)                 | Cómo se agrupan las carpetas del código y quién depende de quién                                               |
| 11  | [Componentes](img/11-componentes.png)           | Las piezas de la app y los servicios que se ofrecen entre sí (círculo = lo que ofrece, flecha = lo que pide)    |
| 12  | [Nodos](img/12-nodos.png)                       | Dónde corre cada parte; línea continua = funciona hoy, punteada = previsto                                     |

### Estructura de los datos

| #   | Diagrama                                    | Qué muestra                                                                                                        |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 13  | [Clases](img/13-clases.png)                 | Las entidades del negocio y dos ejemplos de POO: la interfaz de datos (prueba o real) y las cuatro reglas de seguridad |
| 14  | [Modelo de datos](img/14-modelo-datos.png)  | Lo que se guarda en la base de datos y cómo se relaciona (uno a muchos, uno a uno)                                 |
| 25  | [Clases BCE](img/25-clases-bce.png)         | Las clases en tres capas verticales: **Interfaces** (pantallas y servicios externos) → **Controladores** (reglas) → **Entidades** (datos). Una interfaz nunca toca una entidad directamente |

### Comportamiento: secuencias (quién le habla a quién y en qué orden)

| #   | Diagrama                                                                 | Caso de uso     | Lo importante                                                                 |
| --- | ------------------------------------------------------------------------ | --------------- | ----------------------------------------------------------------------------- |
| 15  | [Registro, sesión y fin del viaje](img/15-secuencia-registro-login-cierre.png) | UC01, UC02  | Sin aceptar el uso de datos no hay cuenta; la contraseña nunca se guarda en claro |
| 16  | [Comprar y pagar](img/16-secuencia-compra-pago.png)                      | UC04 → UC18     | Si el pago se rechaza, el vehículo **no** queda vendido                        |
| 17  | [Alquilar y pagar](img/17-secuencia-alquiler-pago.png)                   | UC05 → UC18     | Se cobra un valor base al reservar y el resto por minuto al terminar           |
| 18  | [Desbloquear](img/18-secuencia-desbloqueo.png)                           | UC08, UC09      | Tres pasos: QR, casco (≥ 80 %) e iniciar; el rostro reemplaza al QR            |
| 19  | [Alerta de un vehículo](img/19-secuencia-alerta.png)                     | UC20, UC12, UC11 | Las alertas llegan al operador en menos de 1 s y el historial no se borra     |
| 20  | [Entrega a domicilio](img/20-secuencia-entrega-domicilio.png)            | UC14–UC17, UC19 | Máximo 5 entregas activas por domiciliario; si hay retraso se envía correo     |

### Comportamiento: estados (por qué etapas pasa algo)

| #   | Diagrama                                         | Estados                                                                 |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| 21  | [Reserva](img/21-estados-reserva.png)            | Solicitada → Activa → Completada (o Cancelada)                          |
| 22  | [Vehículo](img/22-estados-vehiculo.png)          | Disponible, Reservado, En uso (con sus alertas), Vendido, Fuera de servicio |
| 23  | [Entrega](img/23-estados-entrega.png)            | Asignada → En camino → Entregada; Tardía si pasa la hora límite         |

Una transición que no esté dibujada no debe poder ocurrir en el sistema: si ocurre, es un defecto.

## Gestión

| #   | Diagrama                                       | Qué muestra                                        |
| --- | ---------------------------------------------- | -------------------------------------------------- |
| 24  | [Matriz de riesgos](img/24-matriz-riesgos.png) | Los riesgos ubicados por probabilidad e impacto    |

---

## Cómo regenerar las imágenes

Requiere Java, Graphviz (`sudo apt install graphviz`) y `plantuml.jar` dentro de esta carpeta (no se sube a git):

```sh
curl -Lo entregables/diagramas/plantuml.jar https://github.com/plantuml/plantuml/releases/download/v1.2025.4/plantuml-1.2025.4.jar
sh entregables/diagramas/generar.sh            # Linux / macOS
powershell -File entregables\diagramas\generar.ps1   # Windows
```

Los diagramas 01 y 02 se generan con Python (`pip install matplotlib`, luego
`python fuentes/01-contexto-srs.py` y `python fuentes/02-casos-de-uso-general.py`), y el 24 con
Mermaid (ver `generar.sh`). No edites los PNG a mano: cambia la fuente y vuelve a generar.
