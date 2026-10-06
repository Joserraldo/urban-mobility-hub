# 02 · Revisión (inspección) del SRS v1.1 — fase de REQUISITOS

Documento revisado: *SRS_Plataforma_Micromovilidad* v1.1 (19 RF, 10 RNF). Revisor: QA. Fecha: 2026-10-01.
Método: inspección con checklist IEEE 830 — cada requisito debe ser **Claro, Único, Medible, Verificable, Completo, Consistente**.

## 1. ¿Para qué sirve esta revisión? (en simple)
Un requisito ambiguo es como una receta que dice "hornear un rato": cada persona la interpreta distinto y el pastel sale mal. Aquí buscamos esas frases **antes de programar**, porque corregir una frase cuesta casi nada y corregir código ya hecho cuesta mucho. Esto es calidad **proactiva**: prevenir el defecto en la fase de requisitos.

Severidad: **A** = puede producir un defecto grave o hace imposible probar; **M** = genera retrabajo/confusión; **B** = mejora de redacción.

## 2. Resumen
| Severidad | Cantidad | IDs |
|---|---|---|
| Alta (A) | 14 | R-01, 03, 04, 06, 07, 08, 09, 10, 13, 16, 17, 18, 24, 25 |
| Media (M) | 13 | R-02, 05, 11, 12, 14, 15, 19, 20, 21, 22, 23, 26, 27 |
| Baja (B) | 3 | R-28, 29, 30 |
| **Total** | **30** | |

Por tipo: requisitos faltantes (R-01, 04, 16, 18, 27), ambigüedades no medibles (R-05..R-11, 14, 15, 19..23), duplicados/contradicciones (R-02, 03, 12, 26), incorrecciones técnicas (R-24, 25), otros (R-28..30).

Los hallazgos **H2, H5, H6, H7** reportados por el planner fueron **verificados contra el texto del SRS y se confirman** (R-01, R-02, R-03, R-04). Se añaden 26 hallazgos nuevos.

## 3. Hallazgos (tabla maestra)

| ID | Req. | Hallazgo (qué está mal) | ¿Por qué importa? | Propuesta de corrección | Sev. | Prueba asociada |
|---|---|---|---|---|---|---|
| **R-01** (=H2) | RF-10, RNF-03, RNF-05, §3.6 | **Faltan RF de registro, login, consentimiento y gestión de usuarios**, pero RF-10 habla de "usuario registrado" y §3.6 de la Ley 1581 (consentimiento). Verificado: ningún RF crea cuentas. | Sin esto el reconocimiento facial y el cifrado de credenciales no tienen dónde ocurrir; riesgo legal (RD11). | Agregar RF-20 Registro con consentimiento explícito; RF-21 Login/Logout; RF-22 Ver/rectificar/eliminar datos y biometría (habeas data). | A | TC-AUTH-01..04 |
| **R-02** (=H5) | RF-08 / RNF-01 | **Duplicados**: ambos dicen "posición actualizada en ≤ 5 s desde su generación". | Se cuenta dos veces; una prueba "cubre" dos requisitos y confunde el avance. | Dejar RF-08 como *comportamiento* ("el mapa se actualiza con la telemetría") y RNF-01 como *umbral* (≤ 5 s), referenciándose entre sí. | M | TC-TRK-01..03 |
| **R-03** (=H6) | RF-09 / RNF-07 | RF-09 ya usa **3 pasos** (QR, casco, "Iniciar viaje"). RNF-07 pide que **compra, alquiler y desbloqueo** quepan en ≤ 3 pasos. Alquilar exige además elegir modalidad y vehículo ⇒ no cabe. Verificado en el prototipo: ≥ 6 interacciones. | Requisito imposible de cumplir y de probar; discusión segura en la demo. | Definir "paso" = pantalla/acción del usuario y separar: *Desbloqueo ≤ 3 pasos*, *Alquiler (desde selección de vehículo hasta viaje) ≤ 5 pasos*, *Compra ≤ 4 pasos*. | A | TC-UX-01..03 |
| **R-04** (=H7) | §2.3, §2.2 | El SRS dice que el operador **gestiona catálogo y hubs**, pero no hay RF (alta/edición/baja de vehículo y hub). | RNF-08 (agregar hub/vehículo) no puede probarse sin esa función; defectos de alcance (RD1). | Agregar RF-23 CRUD de vehículos del catálogo y RF-24 CRUD de hubs (solo rol operador). | A | TC-ADM-01..03 |
| R-05 | RF-01, §2.2 | Contradicción: §2.2 dice "**redirige** a /app" y RF-01 "**ingresa directamente**"; "móvil" no define ancho (¿<768 px?). El prototipo no redirige: pinta la app en `/`. Además redirigir por dispositivo puede dañar el SEO. | Dos lecturas válidas ⇒ dos implementaciones; riesgo SEO. | Redactar: "En viewport < 768 px la ruta `/` redirige en cliente a `/app`; en ≥ 768 px muestra la landing completa. El rastreo (bots) siempre recibe la landing." | M | TC-LAND-01..02 |
| R-06 | RF-11, RF-15, §1.3 | Los 4 triggers **no tienen umbrales**: "batería crítica" (¿≤ 15 %? ¿≤ 20 %?), "caída/impacto" (¿qué aceleración?), "pérdida GPS" (¿cuántos segundos?), "sin casco" (¿solo en viaje?). El prototipo marca `low-battery` a 19 % de forma arbitraria y el rótulo dice "Batería **baja**" (no "crítica"). | Núcleo de la seguridad (RD8). Sin umbrales no hay "esperado" para probar. | Fijar: batería ≤ 15 %; impacto ≥ 3 g; sin fix GPS ≥ 10 s; sin casco = viaje activo y casco no detectado. Documentar en tabla y constantes. | A | TC-ALR-01..12 |
| R-07 | RF-11 | "Cada vehículo reporta **uno** de los estados": no define qué pasa si ocurren **dos a la vez** (caída + sin casco). | Resultado no determinista; alerta más grave puede ocultarse. | Definir prioridad: caída > sin casco > GPS > batería. Alternativa: lista de alertas simultáneas. | A | TC-ALR-09 |
| R-08 | RF-09 (paso 2) | "Verificar casco mediante cámara": no hay **criterio de éxito** (confianza mínima), ni **qué pasa si falla**, ni reintentos, ni tiempo límite. El prototipo simula con un temporizador de 3 s que **siempre aprueba** (defecto D-01). | RD7/RD8: se puede iniciar viaje sin casco. | Criterio: confianza ≥ 0,80 ⇒ ok; si no, "denegado" con 3 reintentos; la sesión de desbloqueo caduca a 120 s. | A | TC-UNL-04..09 |
| R-09 | RF-10 | "Alterno" ambiguo: ¿reemplaza solo el QR o también el casco? Reconocimiento facial **no** reemplaza el chequeo de casco. No hay umbral de coincidencia ni comportamiento ante fallo (RD7: falsos +/−). | Falsos positivos = persona no autorizada desbloquea. | Umbral de similitud ≥ 0,85 y usuario con consentimiento; sustituye **solo** el QR; el casco sigue obligatorio. Si falla 3 veces ⇒ volver a QR. | A | TC-UNL-10..13 |
| R-10 | RF-09 | El paso 3 "habilitar Iniciar viaje" es una **consecuencia**, no una verificación; no se exige el **orden** (¿puedo saltar al paso 2?). | Se podría llamar a "iniciar" sin QR (si la API no valida). | Exigir validación en servidor del orden QR → casco → inicio. | A | TC-UNL-03, TC-UNL-14 |
| R-11 | RF-09, RF-11, RF-15 | Los **drones** están en el modelo, pero casco/QR/caída no aplican igual a un dron. El simulador permite "sin casco" sobre un dron. | Casos absurdos en demo; pruebas confusas. | Declarar qué triggers y flujo de desbloqueo aplican a cada tipo (patineta/bici/dron). | M | TC-ALR-13 |
| R-12 | RF-12 | "Notificación **inmediata**" sin cifra; RNF-02 dice < 1 s. Además RF-12(b) y RNF-04 piden **lo mismo** (log auditable) con campos distintos (RF-12: marca de tiempo; RNF-04: id, tipo, hora; **sin coordenadas**). | Duplicado e inconsistente; el prototipo no guarda GPS en el log. | RF-12 referencia RNF-02 para el tiempo; unificar campos del log: id, vehículo, tipo, **lat/lng**, fecha-hora; el log no se edita ni se borra (solo se agrega). | M | TC-ALR-14..17 |
| R-13 | RF-12, RNF-04 | "Log **auditable**" no define retención, inmutabilidad ni límite. El prototipo conserva solo las últimas 12 en memoria. | No hay auditoría real. | Persistir en BD; mínimo 90 días; solo inserción. | A | TC-ALR-16 |
| R-14 | RF-13 | "Batería promedio de la flota": ¿incluye el stock **en venta** (100 %)? "Vehículos conectados": ¿todos o solo alquiler? El prototipo promedia **todos**, lo que infla el KPI. | KPI engañoso para el operador. | Definir: promedio solo de vehículos en modo alquiler; "conectado" = reportó telemetría en los últimos 30 s. | M | TC-ADM-04..06 |
| R-15 | RF-15 | "Disparar alerta sobre **un vehículo** de la flota": no dice quién lo elige. El prototipo lo elige **al azar**; el operador no controla. | Prueba no repetible. | El operador selecciona el vehículo (o "aleatorio" como opción explícita). | M | TC-ADM-07 |
| R-16 | RF-03 | "Confirmar su compra": no define pago, inventario (¿baja del stock?), comprobante ni estados de la compra. Prototipo: solo un *toast* "reservado" (no persiste). Además §2.5 supone pasarela de pagos sin RF. | La compra no existe de verdad; no hay qué probar. | RF: la compra cambia el stock a "vendido", genera comprobante y registro; pagos simulados con estado (pendiente/aprobado/rechazado). | A | TC-BUY-01..04 |
| R-17 | RF-05 | Estados de reserva listados sin **transiciones** (¿se puede pasar de completada a activa?), ni quién las dispara, ni qué pasa con cancelaciones. "Aptos para entrega" y dirección de entrega no se definen. | Estados inconsistentes y bugs de negocio. | Máquina de estados: solicitada→activa, solicitada→cancelada, activa→completada, activa→cancelada; el resto prohibido. | A | TC-RES-01..08 |
| R-18 | RF-04, RF-05 | **Falta el fin del viaje**: no hay RF de finalizar/devolver el vehículo ni de **calcular y cobrar** (tarifa por minuto: ¿cuándo empieza y termina el conteo? ¿se redondea?). | Sin "finalizar" no existe estado *completada*. | RF-25 Finalizar viaje; RF-26 Costo = minutos (redondeo hacia arriba) × tarifa. | A | TC-RES-09..11 |
| R-19 | RF-06, RF-07 | Semántica de hub: ¿`ocupados` incluye `en carga`? ¿Un hub **inactivo** (HUB-04) aparece en el mapa, acepta devoluciones? Plazas libres = ? | KPIs de capacidad sin sentido (p. ej. ocupados + en carga > capacidad). | Definir: libres = capacidad − ocupados; en carga ⊆ ocupados; hub inactivo se muestra en gris y no ofrece vehículos. | M | TC-HUB-01..04 |
| R-20 | RF-08, RNF-01 | "≤ 5 s **desde su generación**": no define el punto de medición (¿timestamp del dispositivo? ¿reloj?) ni la frecuencia de actualización. El prototipo tiene coordenadas **estáticas** (no cumple). | No es verificable tal cual. | Medir `renderedAt − telemetry.ts`; frecuencia de emisión 1 Hz; reloj del servidor. | M | TC-TRK-01..03 |
| R-21 | RNF-02 | "< 1 s" sin definir inicio/fin ni condición de red. | No reproducible. | Desde clic en el simulador hasta que la fila aparece en el log, en red local. | M | TC-PERF-02 |
| R-22 | RNF-06 | "95 % de disponibilidad durante el periodo de pruebas": sin periodo, sin método de medición. 95 % de 30 días ≈ 36 h de caída permitidas. | No medible. | Periodo = 7 días previos a cada entrega; medición por `/api/health` cada 5 min. | M | TC-OPS-01 |
| R-23 | RNF-08, RNF-09, RNF-10 | "Sin cambios estructurales", "actualizarse de manera independiente", "sin cambios en presentación": **no son medibles**. | Sin método de verificación. | Convertir en pruebas: (a) agregar un hub/vehículo solo con datos y verlo en mapa/panel; (b) la UI pasa los mismos tests con la fuente *mock* y la *real* (prueba de contrato); (c) los módulos se compilan/prueban por separado. | M | TC-ARQ-01..03 |
| R-24 | RNF-05 | **Error técnico**: "credenciales cifradas". Las contraseñas **no se cifran, se *hashean*** (hash con sal, no reversible); los tokens se firman o se guardan como hash. | Cifrar contraseñas es mala práctica (reversible). | Redactar: "Las contraseñas se almacenan con hash salado (PBKDF2/bcrypt); los tokens de sesión firmados y con expiración." | A | TC-SEC-03..04 |
| R-25 | RNF-03, §3.6 | §3.6 habla de **imágenes**; RNF-03 de **plantillas**. No dice si la imagen original se guarda, cuánto tiempo, ni cómo se borra. | Riesgo Ley 1581 (RD11). | La imagen se descarta tras extraer la plantilla; la plantilla se cifra (AES-GCM) y se elimina a solicitud. | A | TC-SEC-01..02 |
| R-26 | §3.4 vs §1.2/§2.4 | **Contradicción de alcance**: el SRS dice datos *mock en memoria* y a la vez exige REST + WebSocket + MQTT + pasarela. El plan de equipo ya los implementa (D1–D5). | Genera confusión sobre qué es "terminado" en cada avance. | Marcar cada interfaz como [Av.1 mock] / [Av.2 real] / [Av.3 real]. | M | TC-ARQ-01 |
| R-27 | Faltantes RNF | No hay RNF de **accesibilidad**, **compatibilidad de navegadores/dispositivos**, **tiempos de carga**, **HTTPS** ni **SEO/visibilidad**. | Estos aspectos se miden en CI (Lighthouse) y en la demo. | Agregar RNF-11 Accesibilidad AA (Lighthouse ≥ 90), RNF-12 Rendimiento (≥ 85), RNF-13 SEO (≥ 95), RNF-14 HTTPS. | M | TC-NFR-01..03 |
| R-28 | RF-18, RF-19 | Son **entregables de proceso/documentación**, no funciones del software; no se pueden probar con software. Además el DFD (RF-19) ya venció (30-sep). | Inflan el conteo "RF implementados". | Reclasificarlos como "Requisitos de proyecto" (RP-01, RP-02) y excluirlos del cálculo de % software. | B | N/A (revisión documental) |
| R-29 | §2.3 | "Docente evaluador" no es un actor del sistema. | Ruido en casos de uso. | Moverlo a "Partes interesadas". | B | N/A |
| R-30 | General | Sin **prioridad** por requisito (MoSCoW) ni **criterios de aceptación** ni historial de cambios. | Dificulta planificar el avance. | Añadir columna Prioridad y Criterio de aceptación. | B | N/A |


## 4. Impacto si NO se corrige (ejemplos reales ya observados)
- **R-08** → el prototipo de `main` ya tiene el defecto D-01: *el casco nunca se verifica de verdad*.
- **R-06** → el prototipo marca "Batería baja" con 19 % y el SRS pide "crítica": nadie sabe cuál es el valor correcto.
- **R-16** → "Comprar" solo muestra un mensaje; no existe compra.
Estos defectos de código **nacieron en el requisito**: es la prueba de por qué revisar el SRS primero.

## 5. Resumen de acciones recomendadas para el planner/docs (SRS v1.2)
1. Agregar RF-20..26 (registro/login, habeas data, CRUD catálogo y hubs, finalizar viaje, costo).
2. Fijar umbrales numéricos en RF-09/10/11 y en una tabla anexa.
3. Resolver duplicados RF-08/RNF-01 y RF-12/RNF-04.
4. Reescribir RNF-05 (hash, no cifrado) y hacer medibles RNF-06, 08, 09, 10.
5. Reclasificar RF-18/19 como requisitos de proyecto.
6. Congelar SRS v1.2 como **línea base** y cualquier cambio posterior por control de cambios (GCS).

## 6. Estado
| Hallazgo | Estado al 2026-10-01 |
|---|---|
| R-06, R-07, R-08, R-09, R-10, R-17 | **Resueltos en la práctica** como contrato de pruebas (nota `contrato-pruebas`): backend implementa umbrales; falta actualizar el SRS (docs) |
| Resto | Abiertos — pendiente de SRS v1.2 (docs/planner) |
