# Repaso de parcial — Ingeniería de Software II

### Especialización: documentación, gestión de proyectos y diagramas

**Proyecto base:** Plataforma Multimodal de Micromovilidad — UNAB
**Uso:** leer la sección 0 (10 min), luego las fichas de los diagramas que más caigan, y cerrar con el quiz de la sección 7.

---

## 0. Resumen de 10 minutos (si solo tienes una hora)

1. **UML se parte en dos**: diagramas **estructurales** (qué hay: clases, paquetes, componentes, nodos, objetos) y **de comportamiento** (qué pasa: casos de uso, secuencia, estados, actividad, comunicación). Si te preguntan "¿este diagrama es estático o dinámico?", esa es la respuesta.
2. **El proyecto tiene 27 diagramas**: 25 numerados (01–25) + 2 en `entregables/diseno/`. Cubren análisis (01–07), diseño (08–23, 25) y gestión (24).
3. **Frase comodín para casi cualquier diagrama**: _"Elegí este diagrama porque muestra [vista] y me deja verificar [propiedad: acoplamiento, orden de mensajes, estados válidos, despliegue físico]."_
4. **Los 5 errores que más regalan puntos en contra**: confundir `«include»` con `«extend»`, dibujar dependencia con flecha sólida, poner el triángulo de herencia al revés, usar el DFD como diagrama de flujo (las flechas son **datos**, no acciones) y olvidar el actor externo.
5. **Números del proyecto que pueden preguntar**: 20 casos de uso, 3 roles, 5 sistemas externos, 6 procesos y 5 almacenes en el DFD nivel 1, 12 tablas, 15 riesgos (RD1–RD15), 25,5 persona-mes (alcance original) y 34,6 (alcance ampliado).

---

## 1. Inventario completo de diagramas del proyecto

### 1.1 Tabla maestra

| #   | Diagrama                        | Tipo           | ¿UML?                 | Fase     | Pregunta que responde                                              | Fuente             | Imagen                                 |
| --- | ------------------------------- | -------------- | --------------------- | -------- | ------------------------------------------------------------------ | ------------------ | -------------------------------------- |
| 01  | Contexto del SRS                | DFD nivel 0    | No (Yourdon/DeMarco)  | Análisis | ¿Qué entra y sale del sistema y quién se comunica con él?          | `.py` (matplotlib) | `01-contexto-srs.png`                  |
| 02  | Casos de uso general            | Comportamiento | Sí                    | Análisis | ¿Quién usa el sistema y para qué, en un solo plano?                | `.py` (matplotlib) | `02-casos-de-uso-general.png`          |
| 03  | Casos de uso del Cliente        | Comportamiento | Sí                    | Análisis | ¿Qué hace el cliente?                                              | `.puml`            | `03-casos-de-uso-cliente.png`          |
| 04  | Casos de uso del Operador       | Comportamiento | Sí                    | Análisis | ¿Qué hace el operador?                                             | `.puml`            | `04-casos-de-uso-operador.png`         |
| 05  | Casos de uso del Domiciliario   | Comportamiento | Sí                    | Análisis | ¿Qué hace el domiciliario?                                         | `.puml`            | `05-casos-de-uso-domiciliario.png`     |
| 06  | DFD nivel 0                     | DFD            | No                    | Análisis | ¿Cuál es la frontera del sistema?                                  | `.puml`            | `06-dfd-nivel-0.png`                   |
| 07  | DFD nivel 1                     | DFD            | No                    | Análisis | ¿Qué procesos internos hay y dónde se guarda cada dato?            | `.puml`            | `07-dfd-nivel-1.png`                   |
| 08  | C4 contexto                     | C4 nivel 1     | No (C4)               | Diseño   | ¿Con quién se comunica el sistema?                                 | `.puml`            | `08-c4-contexto.png`                   |
| 09  | C4 contenedores                 | C4 nivel 2     | No (C4)               | Diseño   | ¿Cuáles son las piezas grandes desplegables?                       | `.puml`            | `09-c4-contenedores.png`               |
| 10  | Paquetes                        | Estructural    | Sí                    | Diseño   | ¿Cómo se agrupa el código y quién depende de quién?                | `.puml`            | `10-paquetes.png`                      |
| 11  | Componentes                     | Estructural    | Sí                    | Diseño   | ¿Qué piezas ofrecen y piden servicios?                             | `.puml`            | `11-componentes.png`                   |
| 12  | Nodos (despliegue)              | Estructural    | Sí                    | Diseño   | ¿Dónde corre cada cosa y cómo se comunican?                        | `.puml`            | `12-nodos.png`                         |
| 13  | Clases                          | Estructural    | Sí                    | Diseño   | ¿Qué entidades de negocio existen y cómo se relacionan?            | `.puml`            | `13-clases.png`                        |
| 14  | Modelo de datos / DER           | Estructural    | No (Chen/crow's foot) | Diseño   | ¿Qué se guarda en la base y con qué cardinalidad?                  | `.puml`            | `14-modelo-datos.png`                  |
| 15  | Secuencia registro/login/cierre | Comportamiento | Sí                    | Diseño   | ¿En qué orden colaboran los objetos al registrarse y cerrar viaje? | `.puml`            | `15-...png`                            |
| 16  | Secuencia compra y pago         | Comportamiento | Sí                    | Diseño   | ¿Qué pasa si el pago se rechaza?                                   | `.puml`            | `16-...png`                            |
| 17  | Secuencia alquiler y pago       | Comportamiento | Sí                    | Diseño   | ¿Cómo se cobra el valor base y luego el resto?                     | `.puml`            | `17-...png`                            |
| 18  | Secuencia desbloqueo            | Comportamiento | Sí                    | Diseño   | ¿Cómo se valida QR + casco (y rostro como alternativa)?            | `.puml`            | `18-...png`                            |
| 19  | Secuencia alerta                | Comportamiento | Sí                    | Diseño   | ¿Cómo llega una alerta al operador?                                | `.puml`            | `19-...png`                            |
| 20  | Secuencia entrega a domicilio   | Comportamiento | Sí                    | Diseño   | ¿Quién asigna, quién entrega y cuándo se avisa el retraso?         | `.puml`            | `20-...png`                            |
| 21  | Estados de la reserva           | Comportamiento | Sí                    | Diseño   | ¿Por qué estados pasa una reserva?                                 | `.puml`            | `21-...png`                            |
| 22  | Estados del vehículo            | Comportamiento | Sí                    | Diseño   | ¿Qué estados y subestados tiene un vehículo?                       | `.puml`            | `22-...png`                            |
| 23  | Estados de la entrega           | Comportamiento | Sí                    | Diseño   | ¿Cuándo una entrega es tardía?                                     | `.puml`            | `23-...png`                            |
| 24  | Matriz de riesgos               | Gestión        | No                    | Gestión  | ¿Qué riesgo se atiende primero?                                    | `.mmd` (Mermaid)   | `24-matriz-riesgos.png`                |
| 25  | Clases BCE (robustez)           | Estructural    | Sí                    | Diseño   | ¿Cómo se separan interfaz, control y entidad?                      | `.puml`            | `25-clases-bce.png`                    |
| D1  | Clases (robustez técnica)       | Estructural    | Sí                    | Diseño   | Igual que 25 pero con nombres del código                           | `.puml`            | `diseno/img/03-clases.png`             |
| D2  | Secuencia integral              | Comportamiento | Sí                    | Diseño   | Del landing a la tabla, punta a punta                              | `.puml`            | `diseno/img/19-secuencia-integral.png` |

### 1.2 Lo que **no** hicimos (para que no te confundas en el examen)

| Diagrama                | ¿Por qué no está?                                    | Cuándo sí se usaría                                                                 |
| ----------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Actividad               | El flujo se modeló con secuencias y estados          | Para mostrar un proceso con decisiones y paralelismo (ej. aprobación de una compra) |
| Comunicación            | La secuencia ya muestra el orden                     | Cuando importa más la estructura de colaboración que el orden temporal              |
| Objetos                 | Es una foto de instancias, poco útil para documentar | Para explicar un caso concreto con datos reales                                     |
| Tiempos (timing)        | No hay sistemas de tiempo real duro                  | Para protocolos con restricciones estrictas de tiempo                               |
| Perfiles / estereotipos | No se necesitó extender UML                          | Para dominios especializados (ej. sistemas embebidos)                               |

---

## 2. Reglas de oro de UML (aplican a todo)

### 2.1 Clasificación

```
ESTRUCTURALES (estáticos)          DE COMPORTAMIENTO (dinámicos)
├── Clases                         ├── Casos de uso
├── Objetos                        ├── Secuencia
├── Paquetes                       ├── Comunicación
├── Componentes                    ├── Estados
├── Nodos / despliegue             ├── Actividad
└── Perfiles                       └── Tiempos
```

### 2.2 Notación que hay que saber de memoria

| Símbolo                                | Significado                                     | Se usa en                     |
| -------------------------------------- | ----------------------------------------------- | ----------------------------- |
| Rectángulo con nombre                  | Clase / objeto / componente (según estereotipo) | Estructurales                 |
| Rectángulo con pestaña                 | Paquete                                         | Paquetes                      |
| Monigote                               | Actor                                           | Casos de uso                  |
| Óvalo                                  | Caso de uso                                     | Casos de uso                  |
| Rectángulo grande que encierra óvalos  | Frontera del sistema                            | Casos de uso                  |
| Línea continua                         | Asociación                                      | Clases, casos de uso          |
| Flecha sólida abierta                  | Dependencia / uso                               | Clases, paquetes, componentes |
| Flecha punteada abierta                | Dependencia o retorno                           | Paquetes, secuencia           |
| Triángulo hueco                        | Generalización / herencia                       | Clases, actores, casos de uso |
| Triángulo hueco + línea punteada       | Realización (implementa interfaz)               | Clases                        |
| Rombo hueco                            | Agregación (débil)                              | Clases                        |
| Rombo relleno                          | Composición (fuerte)                            | Clases                        |
| `+ − # ~`                              | Público, privado, protegido, paquete            | Clases                        |
| `«include»`                            | Obligatorio                                     | Casos de uso                  |
| `«extend»`                             | Opcional / alternativa                          | Casos de uso                  |
| Círculo lleno                          | Estado inicial                                  | Estados                       |
| Círculo con punto dentro               | Estado final                                    | Estados                       |
| Barra de activación                    | Objeto ejecutando algo                          | Secuencia                     |
| Rectángulo con etiqueta `alt/opt/loop` | Fragmento combinado                             | Secuencia                     |

### 2.3 Reglas de dirección (las que más se equivocan)

- **Herencia**: la flecha sale del **hijo** y apunta al **padre** (`Operador --|> Cliente`).
- **`«include»`**: la flecha sale del **caso base** y apunta al **caso incluido** (`Comprar ..> Pagar`).
- **`«extend»`**: la flecha sale del **caso que extiende** y apunta al **caso base** (`DesbloquearConRostro ..> Desbloquear`).
- **Dependencia**: la flecha sale del que **depende** y apunta al que **es dependido** (si cambia el destino, el origen se rompe).
- **Composición**: el rombo va en el **todo**, no en la parte.

---

## 3. Fichas de cada diagrama

> Formato: **Qué es → Para qué → Cómo se hace → En nuestro proyecto → Trampas de examen → Frase para responder.**

---

### Ficha 1 — Diagrama de contexto / DFD nivel 0 (#01, #06)

**Qué es.** El sistema completo dibujado como **una sola burbuja**, rodeada de las entidades externas con las que intercambia datos. Es el nivel más alto de un DFD.

**Para qué.** Fijar la **frontera** del sistema: qué está dentro y qué está afuera. Si un dato no aparece aquí, el sistema no lo maneja.

**Cómo se hace.**

1. Escribe el sistema en el centro (un círculo o rectángulo redondeado).
2. Lista quién le entrega datos y quién recibe datos: personas, áreas, otros sistemas.
3. Dibuja un rectángulo por cada entidad externa.
4. Traza una flecha por **cada flujo de datos** (no por cada acción) y escribe el dato en la flecha.
5. Verifica que ninguna entidad externa esté sin flujo y que ninguna flecha quede sin nombre.

**En nuestro proyecto.**

- Centro: _Plataforma de micromovilidad_.
- Entidades: Cliente, Operador, Domiciliario, Pasarela de pagos, Reconocimiento facial, Servicio de mapas, Servicio de correo (Brevo), Vehículos IoT.
- Flujos ejemplo: `Cliente → Sistema: datos de registro, compra, alquiler, QR, foto del casco`; `Sistema → Pasarela: orden de cobro`; `Vehículo → Sistema: posición, batería, alertas`.
- Se generó con Python/matplotlib (`fuentes/01-contexto-srs.py`), no con PlantUML, porque se quería control fino del layout.

**Trampas de examen.**

- Dibujar acciones ("el cliente compra") en vez de datos ("pedido de compra"). **Las flechas son datos.**
- Poner almacenes de datos: en nivel 0 **no van**.
- Numerar procesos: en nivel 0 hay **un solo** proceso (el sistema), sin número o con `0`.
- Olvidar los sistemas externos.

**Frase para responder.** _"El DFD nivel 0 no muestra cómo funciona el sistema por dentro: muestra la frontera y los flujos de datos que la cruzan."_

---

### Ficha 2 — DFD nivel 1 (#07)

**Qué es.** La burbuja del nivel 0 **abierta** en procesos, con sus almacenes de datos y los flujos entre ellos.

**Para qué.** Mostrar dónde se transforma y dónde se guarda cada dato, y hacer visible la responsabilidad de cada módulo.

**Cómo se hace.**

1. Descompón el proceso 0 en 4–7 procesos (ni 2 ni 15).
2. Numéralos `1`, `2`, `3`… y si un proceso se detalla, `1.1`, `1.2`.
3. Agrega los **almacenes** (cilindros o rectángulos abiertos) con nombre `A1`, `A2`…
4. **Balancea**: todo flujo que entra o sale del nivel 0 debe aparecer en el nivel 1, con el mismo nombre.
5. Cada proceso debe tener **al menos una entrada y una salida**. Un proceso sin salida es un error.

**En nuestro proyecto (numeración tal como está dibujada en #07).**

- Procesos: **P1** Vender y alquilar · **P2** Cobrar · **P3** Identificar y desbloquear · **P4** Seguir la flota y dar alertas · **P5** Administrar · **P6** Entregar a domicilio.
- Almacenes: **A1** Usuarios y permisos · **A2** Vehículos y hubs · **A3** Reservas y compras · **A4** Historial de alertas · **A5** Pagos, entregas y correos.
- Regla de negocio visible: `P4` registra la alerta en `A4` y avisa al operador en menos de 1 s; `A4` **solo crece**, nunca se edita ni se borra.
- Ojo, inconsistencia real del proyecto: el texto de `entregables/analisis/README.md` descompone el pago como **P1.1 Realizar pago** y renombra los procesos (P2 autenticación, P3 tracking, P4 seguridad). El dibujo y el documento no usan la misma numeración. **Si te preguntan, di la del diagrama y señala la discrepancia**: detectar eso es exactamente el tipo de hallazgo que vale en un parcial de documentación.

**Trampas de examen.**

- Desbalancear: un flujo del nivel 0 que desaparece en el nivel 1.
- Conectar dos almacenes directamente (los almacenes no hablan entre sí; siempre pasan por un proceso).
- Conectar dos entidades externas directamente (igualmente, siempre por un proceso).
- Confundir el DFD con un diagrama de flujo: aquí no hay decisiones, ni sí/no, ni paralelismo.

**Frase para responder.** _"El nivel 1 conserva la frontera del nivel 0 y la descompone en procesos y almacenes; si un flujo no se conserva, el modelo está desbalanceado."_

---

### Ficha 3 — Diagrama de casos de uso (#02, #03, #04, #05)

**Qué es.** Diagrama de comportamiento que muestra **quién** (actores) usa el sistema y **para qué** (casos de uso), sin decir cómo se implementa.

**Para qué.** Acordar el alcance con el cliente antes de diseñar. Es el puente entre requisitos y diseño.

**Cómo se hace.**

1. Identifica los **actores**: personas, roles y sistemas externos. Un actor es un **rol**, no una persona concreta.
2. Dibuja la **frontera del sistema** (rectángulo) y ponle nombre.
3. Lista los **casos de uso** como metas del actor ("Comprar un vehículo", no "Guardar en la tabla purchases").
4. Conecta con línea continua cada actor con sus casos.
5. Agrega relaciones entre casos:
   - `«include»` si el caso **siempre** ejecuta otro (Comprar → Pagar).
   - `«extend»` si el otro caso ocurre **solo a veces** y es una variante (Desbloquear con rostro → Desbloquear).
   - Generalización de actores si un rol **es un tipo de** otro.
6. Pon una leyenda de colores. En el examen, explica los símbolos al pie.

**En nuestro proyecto.**

- 20 casos: **UC01–UC20**.
- Actores humanos: **Cliente**, **Operador**, **Domiciliario**. Los dos últimos **heredan** del Cliente (triángulo hueco): también pueden registrarse, comprar, alquilar y desbloquear.
- Actores externos: Pasarela de pagos (Bold), Servicio facial, API de mapas (OpenStreetMap), API de correo (Brevo), Vehículo IoT.
- `UC04 Comprar` y `UC05 Alquilar` **incluyen** `UC18 Pagar`; `UC18` **incluye** `UC02 Iniciar sesión`.
- `UC09 Desbloquear con rostro` **extiende** `UC08 Desbloquear (QR + casco)`.
- `UC17 Marcar entrega tardía` **extiende** `UC16 Realizar entrega`; `UC19 Notificar retraso` **extiende** `UC17`.
- Existe un plano maestro (#02) y tres recortes por rol (#03, #04, #05): el maestro para alcance, los recortes para presentar sin saturar.

**Trampas de examen.**

- Invertir `include`/`extend` (el error más común).
- Poner `«include»` para algo opcional.
- Conectar un actor con otro actor con línea continua (eso es asociación, no herencia).
- Usar casos de uso como pasos internos ("Validar contraseña" no es un caso de uso: es un paso del flujo).
- Olvidar el sistema externo que participa.
- Poner flechas de flujo entre casos de uso (no existen en UML; solo asociación, include, extend y generalización).

**Frase para responder.** _"Un caso de uso es una meta observable del actor, no una función interna. `«include»` es obligatorio, `«extend»` es opcional y la flecha de `extend` va del caso que extiende al caso base."_

---

### Ficha 4 — C4: contexto y contenedores (#08, #09)

**Qué es.** Modelo de arquitectura de **Simon Brown** con 4 niveles: **1 Contexto**, **2 Contenedores**, **3 Componentes**, **4 Código**. No es UML, pero usa sus símbolos.

**Para qué.** Comunicar arquitectura a públicos distintos: negocio (nivel 1), técnicos (nivel 2–3), desarrolladores (nivel 4).

**Cómo se hace.**

1. **Nivel 1:** el sistema como una caja, las personas que lo usan y los sistemas externos. Una flecha por relación, con verbo.
2. **Nivel 2:** abre el sistema en **contenedores** desplegables: aplicación web, API, base de datos, servicio de eventos, simulador. No bajes a clases.
3. Nombra cada contenedor con **tecnología** si aplica.
4. Marca la diferencia entre lo **construido** y lo **previsto** con color o nota.

**En nuestro proyecto.**

- #08: sistema + Cliente/Operador/Domiciliario + Bold, OpenStreetMap, Brevo, Vehículos simulados.
- #09: cinco contenedores: **Sitio web**, **Servidor (API)**, **Canal en vivo (SSE)**, **Simulador de flota**, **Base de datos SQLite**.
- Nota honesta del diagrama: "hoy todo corre en el computador del equipo; la nube está prevista, no realizada".

**Trampas de examen.**

- Meter clases o tablas en el nivel 2 (eso ya es nivel 3 o 4).
- Confundir **contenedor** (pieza desplegable) con **componente** (pieza dentro de un contenedor).
- No etiquetar las relaciones con tecnología/protocolo.

**Frase para responder.** _"C4 es una forma de zoom: contexto para negocio, contenedores para operaciones, componentes para desarrollo y código para el detalle."_

---

### Ficha 5 — Diagrama de paquetes (#10)

**Qué es.** Diagrama **estructural** que agrupa elementos del modelo en **paquetes** (espacios de nombres) y muestra las **dependencias** entre ellos.

**Para qué.** Ver la arquitectura por capas y **controlar el acoplamiento**: si un paquete cambia, saber qué se rompe.

**Cómo se hace.**

1. Agrupa por **responsabilidad**, no por tipo de archivo.
2. Dibuja cada paquete como carpeta con nombre.
3. Anida paquetes si hay jerarquía.
4. Traza dependencias con **flecha punteada** desde el que usa hacia el usado.
5. Si necesitas forzar el orden visual sin que sea una relación real, usa `-[hidden]->` (truco de PlantUML, no es UML).

**En nuestro proyecto.**

- Ocho paquetes: **1** Lo que ve el usuario · **2** Servicios de movilidad (`domain`) · **3** Servicios de apoyo · **4** Inteligencia artificial (detección de casco) · **5** Datos · **6** Puerta de entrada (`api`) · **7** Compartido (`shared`) · **8** Externo (Bold, IoT).
- Regla estructural demostrada: **el navegador nunca importa `server/`** (lo impide `importProtection` de Vite). Es un diagrama que se puede verificar contra el código.
- Estereotipos posibles: `«import»` (incorpora elementos), `«access»` (usa sin incorporar), `«merge»` (fusión).

**Trampas de examen.**

- Dependencia con línea continua o punta cerrada.
- Paquetes por capa técnica (`controllers`, `models`) en vez de por dominio.
- Dependencias cíclicas entre paquetes (si aparecen, hay un problema de diseño).
- Dibujar clases dentro de los paquetes cuando el objetivo es ver la arquitectura.

**Frase para responder.** _"El diagrama de paquetes no muestra objetos: muestra fronteras de módulos y quién puede romper a quién."_

---

### Ficha 6 — Diagrama de componentes (#11)

**Qué es.** Diagrama **estructural** que muestra componentes (unidades modulares y reemplazables) y las **interfaces** por las que se conectan.

**Para qué.** Ver qué ofrece y qué necesita cada pieza, y qué se puede sustituir sin tocar el resto.

**Cómo se hace.**

1. Identifica piezas con responsabilidad clara y reemplazables.
2. Dibuja cada componente (rectángulo con icono o `«component»`).
3. Marca interfaces:
   - **Provista**: círculo (lollipop) unido por línea.
   - **Requerida**: semicírculo (socket) o flecha punteada hacia la interfaz.
   - **Ensamblado**: lollipop encajado en socket.
4. Conecta con dependencia (flecha punteada) o con el conector de ensamblado.

**En nuestro proyecto.**

- Paquete **navegador**: Landing, pantallas de la app, resultado del pago, conexión con datos (`DataSource`), detección de casco (ONNX).
- Paquete **servidor**: API REST, SSE, sesiones, reglas de negocio, simulador de flota, pagos Bold, webhook, correos, repositorios, SQLite.
- Paquete **fuera del servidor**: dispositivo IoT y Bold.
- Interfaces que permiten sustituir: `IDataSource` (datos de prueba ↔ API real), `IPago` (pasarela simulada ↔ real), `IEmail` (Brevo real ↔ simulado), `IRepositorio`.
- Convención del diagrama: **línea continua = usa**, **punteada = redirección o aviso externo**.

**Trampas de examen.**

- Confundir componente con clase (el componente es más grande y desplegable).
- Confundir componente con contenedor C4 (el contenedor es la unidad de despliegue; el componente vive dentro).
- Poner `«include»` en componentes (eso es de casos de uso).
- No mostrar las interfaces y luego decir "es débilmente acoplado" (sin interfaces no se demuestra).

**Frase para responder.** _"El diagrama de componentes demuestra el bajo acoplamiento: si la interfaz no cambia, puedo cambiar la implementación sin tocar a nadie."_

---

### Ficha 7 — Diagrama de nodos / despliegue (#12)

**Qué es.** Diagrama **estructural** que modela la **arquitectura física**: nodos (hardware o entornos de ejecución), artefactos instalados y vías de comunicación.

**Para qué.** Saber dónde corre cada cosa, qué protocolo usa y qué pasa si un nodo cae.

**Cómo se hace.**

1. Dibuja los **nodos** (cubo 3D o rectángulo).
2. Anota el entorno: `«device»` (hardware), `«execution environment»` (Node, navegador, contenedor).
3. Dentro de cada nodo, pon los **artefactos** (ejecutables, bundles, `.db`).
4. Une nodos con **líneas de comunicación** etiquetadas con protocolo (`HTTPS`, `SSE`, `SQL`).
5. Distingue **real** (línea continua) de **previsto** (punteada) si el sistema aún no está completo.

**En nuestro proyecto.**

- Dispositivos: celular del usuario, computador del usuario, celular del domiciliario, computador del operador, vehículo alquilado con su dispositivo IoT.
- Servidor: **VM Azure Ubuntu 24.04** → **Nginx (HTTPS 443, Let's Encrypt)** → **servicio `umh` (Node 24, puerto 8080)** → **SQLite `umh.db`**.
- Terceros: Bold (API de links + checkout), Brevo, OpenStreetMap, GitHub Actions (CI/CD).
- Regla del diagrama: _"los dispositivos nunca hablan con Bold ni con la base de datos; todo pasa por el servicio `umh`"_. Eso es una decisión de seguridad, no un detalle de dibujo.

**Trampas de examen.**

- Poner clases o casos de uso dentro de un nodo.
- Olvidar el protocolo en la línea.
- Dibujar la nube como si ya existiera cuando es "previsto" (aquí el diagrama lo aclara con nota y línea punteada).
- Confundir nodo con componente.

**Frase para responder.** _"El diagrama de despliegue es el único que responde dónde corre el software y por qué puerto habla."_

---

### Ficha 8 — Diagrama de clases (#13)

**Qué es.** Diagrama **estructural** central de UML: clases con atributos, operaciones y relaciones.

**Para qué.** Modelar el dominio y demostrar principios de POO.

**Cómo se hace.**

1. Identifica clases del **negocio** (sustantivos del SRS), no tablas ni pantallas.
2. Escribe atributos y métodos. Usa visibilidad `+ − # ~`.
3. Relaciona con:
   - **Asociación** (línea) + multiplicidad (`1`, `0..1`, `*`, `1..*`).
   - **Agregación** (rombo hueco): parte que puede vivir sin el todo.
   - **Composición** (rombo relleno): parte que no vive sin el todo.
   - **Herencia** (triángulo hueco).
   - **Realización** (triángulo hueco + punteado): implementa interfaz.
   - **Dependencia** (flecha punteada).
4. Agrupa en paquetes si hay muchas clases.

**En nuestro proyecto.**

- Paquetes: **0 Entrada** (Landing), **1 Personas** (Usuario, Consentimiento), **2 Flota** (Hub, Vehículo, DispositivoIoT, SesiónDesbloqueo), **3 Negocio** (Reserva, Compra, Entrega), **4 Pagos** (Pago, OrdenBold, `PasarelaDePagos` + `PasarelaBold`/`PasarelaSimulada`, `WebhookBold`), **5 Seguridad** (Alerta, `ReglaDeSeguridad` + SinCasco/Caída/SinGPS/BateríaBaja), **6 Acceso a datos** (`FuenteDeDatos` + DatosDePrueba/DatosDelServidor).
- Relaciones clave: `Hub "1" o-- "*" Vehiculo`; `Vehiculo "1" --> "0..1" DispositivoIoT`; `Reserva "1" --> "*" Pago`; `PasarelaDePagos <|.. PasarelaBold`.
- **Principios POO demostrados** (esto es lo que suele valer puntos):
  | Principio               | Dónde se ve                                        | Beneficio                  |
  | ----------------------- | -------------------------------------------------- | -------------------------- |
  | Abstracción             | `Vehiculo`, `Hub`, `Reserva` solo con lo relevante | Modelo entendible          |
  | Encapsulamiento         | `PlantillaFacial` expone `cifrar()`/`coincide()`   | RNF-03                     |
  | Interfaz + polimorfismo | `FuenteDeDatos` con dos implementaciones           | RNF-10, mitiga RD5         |
  | Herencia                | 4 reglas de seguridad, 2 pasarelas                 | Agregar sin tocar el resto |
  | Bajo acoplamiento       | Servicios dependen de interfaces                   | Pruebas con dobles         |

**Trampas de examen.**

- Poner métodos en la interfaz y atributos de implementación.
- Confundir agregación con composición (¿la parte sobrevive sin el todo?).
- Multiplicidad mal puesta (`1..*` vs `*`).
- Dibujar la base de datos como clases (para eso está el DER).
- Olvidar la dirección de la herencia.

**Frase para responder.** _"El diagrama de clases es del dominio, no del código: si una clase no tiene comportamiento ni regla asociada, probablemente es solo un atributo."_

---

### Ficha 9 — Clases BCE / análisis de robustez (#25, D1)

**Qué es.** Diagrama de clases con **tres estereotipos**: **Boundary** (interfaz), **Control** (regla) y **Entity** (dato). Proviene del análisis de robustez de Jacobson.

**Para qué.** Verificar que la separación de responsabilidades se cumple: la pantalla no toca la base de datos.

**Cómo se hace.**

1. Columna 1: **Boundary** = todo lo que ve o usa el actor (pantallas, APIs, interfaces con sistemas externos).
2. Columna 2: **Control** = casos de uso hechos clase; aquí viven las reglas.
3. Columna 3: **Entity** = lo que se guarda.
4. Dibuja las dependencias **siempre en ese orden**: boundary → control → entity.
5. Verifica la **regla de oro**: _una boundary nunca toca una entity directamente_.
6. Marca las interfaces con sistemas externos también como boundary.

**En nuestro proyecto.**

- #25 (lenguaje de negocio): `PantallaLanding`, `PantallaRegistroLogin`, `PantallaDesbloqueo`, `PanelOperador`, `BandejaDomiciliario` → `ControlAutenticacion`, `ControlPago`, `ControlDesbloqueo`, `ControlAlertas`, `ControlEntregas` → `Usuario`, `Reserva`, `Pago`, `Alerta`, `Entrega`…
- D1 (lenguaje del código): `Landing`, `AuthForm`, `UnlockFlow`, `AdminPanel` → `SessionService`, `PaymentController`, `UnlockService`, `SecurityTrigger` → `users`, `reservations`, `alert_log`…
- Ambos son el mismo modelo en dos audiencias: uno para el docente/cliente, otro para el equipo.

**Trampas de examen.**

- Poner una entity que conoce una pantalla (viola la dirección).
- Poner un control que dibuja (no debe).
- Confundir BCE con MVC (MVC es un patrón de implementación; BCE es análisis).
- Olvidar las interfaces con sistemas externos como boundary.

**Frase para responder.** _"En BCE la dirección es siempre interfaz → control → entidad. Si una pantalla consulta una tabla directamente, el diagrama está mal y el código también."_

---

### Ficha 10 — Modelo de datos / DER (#14)

**Qué es.** Diagrama **entidad-relación**: entidades, atributos, claves y cardinalidades. No es UML (aunque PlantUML lo dibuje).

**Para qué.** Diseñar la base de datos y verificar que el modelo soporta los casos de uso.

**Cómo se hace.**

1. Una entidad por tabla; nombre en singular o plural, pero consistente.
2. Marca la **PK** (subrayada) y las **FK**.
3. Define cardinalidad con notación **pata de gallo** (`||--o{`) o Chen (`1:N`).
4. Resuelve los **N:M** con una tabla intermedia.
5. Verifica que cada caso de uso pueda leer/escribir sin columnas inventadas.

**En nuestro proyecto.**

- 12 entidades: Usuario, Consentimiento, Plantilla facial, Hub, Vehículo, Reserva, Compra, Pago, Entrega, Alerta, Sesión de desbloqueo, Aviso por correo.
- Cardinalidades clave: `Usuario ||--o{ Consentimiento`; `Hub ||--o{ Vehiculo`; `Vehiculo ||--o| Compra`; `Reserva ||--o| Entrega`; `Reserva ||--o{ Pago`.
- Regla del negocio que se ve en el modelo: **el historial de alertas solo crece** (no se edita ni se borra).
- Se materializó en `src/server/db/schema.sql` (SQLite/D1).

**Trampas de examen.**

- Confundir DER con diagrama de clases (el DER no tiene métodos).
- Poner N:M sin tabla intermedia.
- Olvidar la FK.
- Modelar herencia de POO en tablas sin justificarlo.

**Frase para responder.** _"El DER y el diagrama de clases se parecen pero no son lo mismo: el primero es persistencia, el segundo es dominio con comportamiento."_

---

### Ficha 11 — Diagrama de secuencia (#15–#20, D2)

**Qué es.** Diagrama de **comportamiento** que muestra cómo colaboran los objetos **en orden temporal** para cumplir un caso de uso.

**Para qué.** Verificar el orden de los mensajes, las ramas alternativas y los casos de fallo.

**Cómo se hace.**

1. Una **línea de vida** por participante (actor, pantalla, servidor, base, externo). Ordena de izquierda a derecha según quién inicia.
2. Un mensaje por interacción, con verbo y dato.
3. Sólido con punta llena = **síncrono**; sólido con punta abierta = **asíncrono**; punteado con punta abierta = **retorno**.
4. Usa **fragmentos combinados**:
   - `alt` = si/sino (ramas excluyentes).
   - `opt` = opcional.
   - `loop` = repetición.
   - `par` = paralelo.
5. Marca la **activación** (barra) mientras el objeto trabaja.
6. Si un mensaje puede fallar, dibuja la rama de fallo. Un diagrama sin ramas de error es sospechoso.

**En nuestro proyecto (qué demuestra cada uno).**

| #   | Caso               | Lo que prueba                                                                                                                |
| --- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 15  | UC01, UC02, cierre | Sin aceptar el tratamiento de datos no hay cuenta; la contraseña nunca se guarda en claro; el costo se redondea hacia arriba |
| 16  | UC04 → UC18        | Si el pago se rechaza, el vehículo **no** se marca vendido                                                                   |
| 17  | UC05 → UC18        | Se cobra valor base ($10.000) al reservar y el resto por minuto al terminar                                                  |
| 18  | UC08, UC09         | Tres pasos: QR → casco (≥ 80 %) → iniciar; el rostro reemplaza al QR; sesión de desbloqueo de 2 min                          |
| 19  | UC20, UC12, UC11   | Alerta al operador en < 1 s; el historial no se borra; el simulador recorre el mismo camino                                  |
| 20  | UC14–UC17, UC19    | Máximo 5 entregas activas por domiciliario; si hay retraso se envía correo; si el correo falla, la app sigue                 |

**Trampas de examen.**

- Poner flechas entre líneas de vida sin mensaje (las líneas de vida no se conectan entre sí).
- Usar `alt` para cosas que no son excluyentes.
- Olvidar el retorno (deja al lector sin saber el resultado).
- Modelar llamadas internas como mensajes a uno mismo sin justificar.
- No incluir al actor externo que participa (pasarela, correo).

**Frase para responder.** _"La secuencia responde 'en qué orden'; si quieres mostrar 'qué estados', usa estados; si quieres 'qué piezas', usa componentes."_

---

### Ficha 12 — Diagrama de estados (#21, #22, #23)

**Qué es.** Diagrama de **comportamiento** que muestra los estados posibles de un objeto y las transiciones válidas entre ellos.

**Para qué.** Definir qué transiciones deben existir y, sobre todo, **cuáles no deben poder ocurrir**.

**Cómo se hace.**

1. Identifica el objeto con ciclo de vida (reserva, vehículo, entrega, pedido…).
2. Lista sus estados como rectángulos redondeados.
3. Estado inicial = círculo lleno; final = círculo con punto.
4. Cada transición: `origen --> destino : evento [guarda] / acción`.
5. Si un estado tiene subestados, dibújalo como estado compuesto.
6. Verifica que todo estado sea **alcanzable** y que todo estado tenga salida (salvo el final).

**En nuestro proyecto.**

- **Reserva (#21):** Solicitada → Activa → Completada (o Cancelada). Cancelar solo desde Solicitada o Activa; el operador puede cerrar por incidente.
- **Vehículo (#22):** Disponible, Reservado, En uso, Vendido, Fuera de servicio. `En uso` es **compuesto** con subestados: Sin novedad, Sin casco, Caída, Sin GPS, Batería baja (todos vuelven a Sin novedad).
- **Entrega (#23):** Asignada → En camino → Entregada; Asignada o En camino → Tardía; Tardía → Entregada.

**Trampas de examen.**

- Dibujar estados que en realidad son eventos ("pagar" no es un estado; "Pagada" sí).
- Poner transiciones sin evento.
- Olvidar el estado final.
- No modelar los subestados cuando el enunciado los insinúa.
- Poner una transición que el sistema no permite: **una transición no dibujada no debe ocurrir; si ocurre, es un defecto.**

**Frase para responder.** _"El diagrama de estados es una especificación negativa también: lo que no está dibujado está prohibido."_

---

### Ficha 13 — Matriz de riesgos (#24)

**Qué es.** Herramienta de **gestión** (no UML) que ubica cada riesgo en un plano **probabilidad × impacto**.

**Para qué.** Priorizar: no todos los riesgos se atienden igual ni al mismo tiempo.

**Cómo se hace.**

1. Lista los riesgos con ID (`RD1`…`RD15`).
2. Asígnale **probabilidad** (0–100 %) e **impacto** (1–5).
3. Calcula **puntaje = probabilidad × impacto** (desempate dentro del nivel).
4. Nivel: **Bajo** impacto ≤ 2 · **Medio** impacto = 3 · **Alto** impacto ≥ 4.
5. Ubícalo en el cuadrante:
   - Arriba-derecha: **atender ya**.
   - Arriba-izquierda: **vigilar**.
   - Abajo-derecha: **mitigar con pruebas**.
   - Abajo-izquierda: **aceptar**.
6. Para cada riesgo Alto define **SGR**: **S**upervisión (cómo lo monitoreo), **G**estión (plan de contingencia), **R**educción (cómo bajo la probabilidad o el impacto).

**En nuestro proyecto.**

- 15 riesgos (RD1–RD15). Los Altos: RD3 sobrecarga del equipo (70 % × 4), RD10 contratos de API (60 % × 4), RD5 acoplamiento UI–datos, RD9 desviación de estimación, RD13 cobertura de pruebas, RD7 falsos positivos del facial, RD12 integración MQTT, RD8 trigger de seguridad, RD11 datos biométricos.
- RD14 (plazos) tiene probabilidad **100 %** porque **ya se materializó** (el DFD se entregó un día tarde): un riesgo materializado es un **problema**.
- Se dibujó con Mermaid `quadrantChart` (`fuentes/24-matriz-riesgos.mmd`).

**Trampas de examen.**

- Multiplicar mal o no usar el puntaje como desempate.
- Poner "impacto alto" sin justificar en la escala 1–5.
- Confundir riesgo con problema (el riesgo es futuro; el problema es presente).
- Definir SGR genérico ("revisar") en vez de concreto y medible.
- Olvidar que la matriz **prioriza**, no elimina: todo riesgo debe tener dueño.

**Frase para responder.** _"La matriz no decide sola: ordena. La decisión es qué riesgo atiendo primero con el esfuerzo que tengo."_

---

## 4. Documentación (lo que suele caer junto con los diagramas)

### 4.1 SRS — qué debe tener

| Sección                   | Contenido                                     | En el proyecto                 |
| ------------------------- | --------------------------------------------- | ------------------------------ |
| 1. Introducción           | Propósito, alcance, definiciones              | SRS v1.1 → v1.2                |
| 2. Descripción general    | Funciones, usuarios, restricciones, supuestos | 3 roles, 5 externos            |
| 3. Requisitos específicos | **RF**, **RNF**, interfaces                   | RF-01 a RF-27, RNF-01 a RNF-10 |
| 4. Trazabilidad           | Requisito → caso → diseño → prueba            | matriz del §4                  |
| Apéndices                 | Glosario, referencias                         | —                              |

**RF vs RNF.**

- **RF**: qué hace el sistema ("el cliente puede comprar un vehículo").
- **RNF**: cómo de bien lo hace ("la alerta llega en menos de 1 s", "la contraseña se hashea").
- Un RNF mal escrito es una opinión ("debe ser rápido"). Un RNF bien escrito es **medible** ("≤ 1 s en el percentil 95").

**Trazabilidad.** Cada RF debe poder rastrearse a: un caso de uso, un proceso del DFD, un artefacto de diseño y una prueba. Si un requisito no tiene prueba, no está verificado; si una prueba no tiene requisito, sobra.

### 4.2 Caso de uso **descrito** (no el dibujo)

Plantilla que usaron (`plantillas/plantilla-caso-de-uso.md`):

```
UCxx — Nombre
Actor principal:
Actores secundarios:
Precondiciones:
Flujo principal (pasos numerados)
Flujos alternos (A1, A2…)
Excepciones (E1, E2…)
Postcondiciones:
Reglas de negocio (con constantes reales)
Requisitos: RF-xx, RNF-xx
```

**Regla de oro:** un caso de uso está bien escrito si un desarrollador puede implementarlo **sin hacer preguntas**. Los pasos citan datos reales, no "el sistema hace magia".

En el proyecto hay **20 casos descritos** (UC01–UC20), cada uno con flujo, alternos, excepciones y reglas numéricas.

### 4.3 Historias de uso

Formato: _"Como [rol], quiero [acción] para [beneficio]"_, con criterios de aceptación. Se usan para planificar en iteraciones. En el proyecto: matriz HU → caso padre → prioridad → horas → semana, con **99 h estimadas** frente a **96 h de capacidad**; por eso UC13 quedó _planificado_ y no ejecutado (decisión explícita, no olvido).

---

## 5. Gestión de proyectos (lo que suele caer)

### 5.1 Ciclo de vida y fases

| Fase         | % esfuerzo | Qué se produce                        |
| ------------ | ---------- | ------------------------------------- |
| Inicio       | 10 %       | SRS, riesgos, plan                    |
| Elaboración  | 30 %       | Arquitectura, casos de uso detallados |
| Construcción | 45 %       | Código, pruebas                       |
| Transición   | 15 %       | Despliegue, aceptación                |

> Es la distribución clásica de **RUP**. En el proyecto: 2,5 / 7,6 / 11,5 / 3,8 persona-mes sobre 25,5.

### 5.2 Puntos de función (PF)

1. Clasifica cada función: **ILF** (archivo lógico interno), **EIF** (archivo externo), **EI** (entrada), **EO** (salida), **EQ** (consulta).
2. Aplica pesos (complejidad promedio): ILF 10, EIF 7, EI 4, EO 5, EQ 4.
3. Suma → **PFSA**.
4. Calcula **VAF** = `0,65 + 0,01 × ΣFi`, con 14 factores de 0 a 5 (ΣFi entre 0 y 70).
5. **PFA = PFSA × VAF**.
6. Convierte a líneas: **SLOC = PFA × 50**.

**Números del proyecto.**

- Alcance original: 126 PF × 1,07 = **135 PFA** → **6.750 SLOC (6,75 KLOC)**.
- Alcance ampliado (v1.2): 166 PF × 1,07 = **178 PFA** → **8,9 KLOC**.

### 5.3 COCOMO básico semi-acoplado

```
E = 3,0 × KLOC^1,12      (esfuerzo en persona-mes)
T = 2,5 × E^0,35         (tiempo en meses)
P = E / T                (personas)
```

| Métrica  | Alcance original (6,75 KLOC) | Alcance ampliado (8,9 KLOC) |
| -------- | ---------------------------- | --------------------------- |
| Esfuerzo | **25,5 persona-mes**         | **34,6 persona-mes**        |
| Tiempo   | **7,8 meses**                | **8,6 meses**               |
| Personas | **3,3**                      | **4,0**                     |

**Capacidad real:** ~11,1 semanas ≈ 2,6 meses × 3 personas ≈ **7,8 persona-mes**, es decir **~30 %** del alcance original y **~22 %** del ampliado. Conclusión: **hay que recortar alcance por prioridad de riesgo**, no por orden de aparición.

> Si te piden "¿el proyecto es viable?", la respuesta correcta no es "sí" ni "no": es _"no con ese alcance; sí con recorte priorizado y estas condiciones"_.

### 5.4 Cronograma (hitos)

| Hito                               | Fecha       | Estado                                                      |
| ---------------------------------- | ----------- | ----------------------------------------------------------- |
| Cierre Inicio (SRS, riesgos, plan) | 16-sep-2026 | Completado                                                  |
| Cierre Elaboración (primer avance) | 15-sep-2026 | Completado                                                  |
| DFD del sistema (RF-19)            | 30-sep-2026 | **Vencido** (+1 día) → RD14                                 |
| Segundo avance                     | 21-oct-2026 | Portal funcional sobre API real                             |
| Tercer avance                      | 25-nov-2026 | Tiempo real, simulador, panel, cobertura ≥ 80 %, despliegue |
| Cierre y sustentación              | 2-dic-2026  | —                                                           |

### 5.5 Riesgos: definiciones rápidas

- **Riesgo** = evento futuro incierto con probabilidad e impacto.
- **Problema** = riesgo ya materializado.
- **SGR** = Supervisión / Gestión / Reducción (SEI).
- **Mitigación** = bajar probabilidad o impacto **antes** de que ocurra.
- **Contingencia** = qué hago **si** ocurre.
- Un riesgo sin dueño y sin indicador no se está gestionando: se está decorando el documento.

### 5.6 Gestión de configuración (GCS)

- **Línea base**: versión aprobada de un documento o del código.
- **Versionado**: SRS, Plan y Riesgos en `v1.x`; releases `v0.1`, `v0.2`, `v0.3`.
- **Control de cambios**: toda modificación de requisito entra por solicitud registrada, se evalúa impacto y se versiona.
- **Git**: `main` protegida, ramas `feature/*`, _commits_ convencionales, _tags_ de release.
- **CI**: lint → typecheck → test → build → Lighthouse en cada _push_. Una iteración no se cierra con pruebas pendientes en desbloqueo, seguridad ni tracking.

### 5.7 SQA y métricas

- **Revisiones**: SRS, diseño, código.
- **Registro de defectos** con severidad y estado.
- **Cobertura** ≥ 80 % en módulos críticos (desbloqueo, seguridad, tracking).
- **Métricas**: densidad de defectos por módulo, % de RF implementados y probados, desviación esfuerzo real vs. estimado, cumplimiento de cronograma.
- **Puerta de calidad** automática en CI: si baja la cobertura, no se integra.
- Evidencia del proyecto: **82 pruebas** unitarias/integración y **19 E2E** en verde, más 1 omitida por ser solo-móvil.

---

## 6. Chuleta final de símbolos

| Quiero mostrar…        | Uso…           | Y va…                              |
| ---------------------- | -------------- | ---------------------------------- |
| Quién usa el sistema   | Casos de uso   | Actor ↔ óvalo                      |
| Un paso obligatorio    | `«include»`    | Base → incluido                    |
| Una variante opcional  | `«extend»`     | Variante → base                    |
| Que un rol es otro rol | Generalización | Hijo → padre                       |
| Orden de mensajes      | Secuencia      | Línea de vida → línea de vida      |
| Estados válidos        | Estados        | Estado → estado                    |
| Módulos y acoplamiento | Paquetes       | Dependiente → dependido            |
| Piezas e interfaces    | Componentes    | Requerida → provista               |
| Dónde corre            | Nodos          | Nodo → nodo con protocolo          |
| Dominio y POO          | Clases         | Según relación                     |
| Persistencia           | DER            | Entidad → entidad con cardinalidad |
| Separación de capas    | BCE            | Boundary → Control → Entity        |
| Frontera de datos      | DFD 0/1        | Entidad ↔ proceso ↔ almacén        |
| Prioridad de riesgos   | Matriz         | Probabilidad × impacto             |

---

## 7. Quiz de parcial (con respuesta)

**1. ¿Cuál es la diferencia entre `«include»` y `«extend»`?**
`«include»` es obligatorio y va del caso base al incluido; `«extend»` es opcional y va del caso que extiende al caso base.

**2. ¿Por qué el Operador hereda del Cliente en el diagrama de casos de uso?**
Porque es un tipo de cliente: puede hacer todo lo que hace un cliente y además administrar. Se dibuja con triángulo hueco apuntando al padre.

**3. ¿Las flechas del DFD son acciones o datos?**
Datos. Si escribes "comprar vehículo" en una flecha, el diagrama está mal; debe ser "pedido de compra".

**4. ¿Qué diferencia hay entre DFD nivel 0 y nivel 1?**
El nivel 0 muestra el sistema como una sola burbuja y su frontera; el nivel 1 lo descompone en procesos y almacenes, conservando los mismos flujos externos (balanceo).

**5. ¿Qué es un contenedor en C4 y en qué se diferencia de un componente?**
El contenedor es una unidad desplegable (app web, API, base de datos); el componente es una pieza dentro de un contenedor (módulo con interfaz).

**6. ¿Qué demuestra un diagrama de componentes que no demuestra uno de clases?**
El acoplamiento por interfaces: qué ofrece y qué requiere cada pieza, y qué se puede sustituir sin tocar el resto.

**7. ¿Cuándo usaría composición en vez de agregación?**
Composición cuando la parte no tiene sentido sin el todo (el todo controla su ciclo de vida); agregación cuando puede existir independientemente.

**8. ¿Qué regla de oro cumple el diagrama BCE?**
Boundary → Control → Entity. Una interfaz nunca toca una entidad directamente.

**9. ¿Cómo se representa un N:M en el DER?**
Con una tabla intermedia con dos FKs y, si hace falta, atributos propios de la relación.

**10. En una secuencia, ¿qué significa `alt` y en qué se diferencia de `opt`?**
`alt` son ramas excluyentes (si/sino); `opt` es un fragmento que ocurre o no, sin rama alternativa.

**11. ¿Qué significa que una transición no dibujada en un diagrama de estados "no debe ocurrir"?**
Que el diagrama es también una especificación negativa: si el sistema permite una transición no modelada, es un defecto de implementación o del modelo.

**12. ¿Cómo se calcula el nivel de un riesgo?**
Por el impacto (Bajo ≤ 2, Medio = 3, Alto ≥ 4), con el puntaje probabilidad × impacto como desempate.

**13. ¿Qué es SGR?**
Supervisión, Gestión y Reducción: cómo monitoreo el riesgo, qué hago si ocurre y cómo bajo su probabilidad o impacto.

**14. Un riesgo con probabilidad 100 % ¿sigue siendo riesgo?**
No: ya se materializó, es un problema. Se registra y se trata como tal (en el proyecto, RD14).

**15. ¿Qué diferencia hay entre RF y RNF?**
El RF dice qué hace el sistema; el RNF dice cómo de bien lo hace y debe ser medible (ej. alerta en < 1 s).

**16. ¿Qué es una matriz de trazabilidad y para qué sirve?**
La tabla que relaciona cada requisito con su caso de uso, su proceso de DFD, su artefacto de diseño y su prueba. Sirve para demostrar cobertura y detectar huecos.

**17. ¿Qué fórmula usa COCOMO semi-acoplado?**
`E = 3,0 × KLOC^1,12`, `T = 2,5 × E^0,35`, `P = E / T`.

**18. Si la capacidad real es 7,8 persona-mes y la estimación 25,5, ¿qué se concluye?**
Que el alcance no cabe: hay que recortar por prioridad de riesgo y acordarlo, no "trabajar más rápido".

**19. ¿Qué es una línea base en gestión de configuración?**
Una versión aprobada y congelada de un artefacto, que solo cambia por control de cambios.

**20. ¿Por qué el proyecto tiene dos versiones del diagrama de clases BCE?**
Porque el mismo modelo se comunica a dos audiencias: #25 con lenguaje de negocio y D1 con nombres del código. Cambia el vocabulario, no la estructura.

---

## 8. Los 15 errores que más puntos cuestan

1. Invertir `«include»` y `«extend»`.
2. Dibujar dependencia con línea continua.
3. Poner el triángulo de herencia apuntando al hijo.
4. Usar el DFD como diagrama de flujo (acciones en vez de datos).
5. Desbalancear niveles del DFD.
6. Poner almacenes de datos en el nivel 0.
7. Conectar dos almacenes o dos entidades externas directamente.
8. Confundir agregación (rombo hueco) con composición (rombo relleno).
9. Poner métodos en las interfaces o atributos de implementación.
10. Modelar un N:M sin tabla intermedia.
11. Poner flechas entre líneas de vida en una secuencia.
12. Olvidar las ramas de error (`alt` de fallo) en una secuencia.
13. Dibujar estados que son eventos.
14. Confundir riesgo con problema.
15. Escribir un RNF no medible ("debe ser rápido", "debe ser seguro").

---

## 9. Cómo se generan los diagramas en este repo

```powershell
# Windows
powershell -File entregables\diagramas\generar.ps1

# Linux / macOS
sh entregables/diagramas/generar.sh
```

- Requiere **Java**, **Graphviz** y `plantuml.jar` en `entregables/_tools/`.
- Los diagramas **01 y 02** se generan con Python: `pip install matplotlib` y luego `python fuentes/01-contexto-srs.py` / `python fuentes/02-casos-de-uso-general.py`.
- El **24** se genera con **Mermaid** (`quadrantChart`).
- Los `.puml` usan `!include estilo.iuml` para la paleta y, en los que tienen muchas relaciones, `!pragma layout elk` para enrutar sin cruces.
- **Nunca edites el PNG a mano**: cambia la fuente y regenera. Eso es gestión de configuración aplicada.

### Índice de fuentes

```
entregables/diagramas/fuentes/
├── 01-contexto-srs.py
├── 02-casos-de-uso-general.py
├── 03..05-casos-de-uso-*.puml
├── 06-dfd-nivel-0.puml
├── 07-dfd-nivel-1.puml
├── 08-c4-contexto.puml
├── 09-c4-contenedores.puml
├── 10-paquetes.puml
├── 11-componentes.puml
├── 12-nodos.puml
├── 13-clases.puml
├── 14-modelo-datos.puml
├── 15..20-secuencia-*.puml
├── 21..23-estados-*.puml
├── 24-matriz-riesgos.mmd
├── 25-clases-bce.puml
└── estilo.iuml
```

---

## 10. Plan de estudio para esta noche (3 horas)

| Tiempo    | Qué hacer                                                                                                                                                      |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:30 | Leer sección 0, 1 y 2. Memorizar la tabla de símbolos y las direcciones de flechas.                                                                            |
| 0:30–1:15 | Fichas 1–6 (DFD, casos de uso, C4, paquetes, componentes, nodos). Dibujar de memoria el DFD 0 y el de casos de uso.                                            |
| 1:15–2:00 | Fichas 7–12 (clases, BCE, DER, secuencia, estados). Reescribir de memoria la secuencia de compra **con la rama de pago rechazado** y los estados del vehículo. |
| 2:00–2:30 | Secciones 4 y 5 (documentación y gestión). Memorizar COCOMO y la diferencia RF/RNF/trazabilidad.                                                               |
| 2:30–3:00 | Quiz de la sección 7 y repasar la lista de errores.                                                                                                            |

**Truco de examen:** si no recuerdas un diagrama exacto, dibuja el **esqueleto** (actores/entidades a la izquierda, sistema al centro, externos a la derecha) y escribe al lado _"este diagrama muestra X y verifica Y"_. La justificación vale tanto como el dibujo.
