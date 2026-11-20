// Contenido del documento "Análisis y diseño orientado a objetos" (entrega del 20-nov-2026).
import { existsSync } from "node:fs";
import path from "node:path";
import { ROOT, rel, dims, portada, documento, tocItem, AUTORES } from "./lib.mjs";

const D = (f) => `entregables/diagramas/img/${f}`;
let figN = 0;
const figs = []; // índice de figuras

/** Figura a página completa (vertical u horizontal según la proporción). */
async function figura(id, titulo, archivo, { tag = "", desc = "", land } = {}) {
  const { width, height } = await dims(archivo);
  const isLand = land ?? width / height > 1.12;
  const n = ++figN;
  figs.push({ id, n, titulo });
  // Alto disponible para la imagen descontando título y descripción.
  const maxH = isLand ? (desc ? 128 : 146) : desc ? 210 : 230;
  const svg = archivo.replace(/.png$/, ".svg");
  const src = existsSync(path.join(ROOT, svg)) ? svg : archivo;
  return `
<section class="fig-page ${isLand ? "land" : ""}" id="${id}">
  <div class="wrap">
    <div class="fig-head"><h3>${titulo}</h3><span class="tag">${tag} · <a href="#indice">↑ Índice</a></span></div>
    ${desc ? `<div class="fig-desc">${desc}</div>` : ""}
    <figure>
      <div class="frame"><img src="${rel(src)}" style="max-height:${maxH}mm;width:100%;object-fit:contain" alt="${titulo}"></div>
      <figcaption><b>Figura ${n}.</b> ${titulo}. Fuente: <code>${archivo.replace("/img/", "/fuentes/").replace(".png", archivo.includes("01-contexto") || archivo.includes("02-casos") ? ".py" : archivo.includes("24-") ? ".mmd" : ".puml")}</code></figcaption>
    </figure>
  </div>
</section>`;
}

/** Figura pequeña embebida en el texto (capturas de evidencia). */
function mini(archivo, cap) {
  const n = ++figN;
  return `<figure class="shot"><div class="frame" style="padding:2mm"><img src="${rel(archivo)}" style="max-height:92mm" alt="${cap}"></div><figcaption><b>Figura ${n}.</b> ${cap}</figcaption></figure>`;
}

const UCS = [
  ["UC01", "Registrarse y dar consentimiento", "Compartido", "RF-20", "P1", "15"],
  ["UC02", "Iniciar o cerrar sesión", "Compartido", "RF-21", "P1", "15"],
  ["UC03", "Ver catálogo de venta", "Cliente", "RF-02", "P2", "28"],
  ["UC04", "Comprar vehículo", "Cliente", "RF-03", "P1", "16"],
  ["UC05", "Alquilar vehículo (hub o domicilio)", "Cliente", "RF-05, RF-06", "P1", "17"],
  ["UC06", "Ver flota y mapa multicapa", "Cliente", "RF-04, RF-08", "P1", "28"],
  ["UC07", "Ver detalle de hub", "Cliente", "RF-07", "P2", "28"],
  ["UC08", "Desbloquear vehículo (QR + casco)", "Cliente", "RF-09", "P1", "18"],
  ["UC09", "Desbloquear con rostro", "Cliente («extend» UC08)", "RF-10, RF-22", "P2", "18"],
  ["UC10", "Ver KPIs y gemelos digitales", "Operador", "RF-13, RF-14", "P1", "29"],
  ["UC11", "Simular evento IoT", "Operador", "RF-15", "P1", "19"],
  ["UC12", "Revisar bitácora de alertas", "Operador", "RF-12", "P1", "19"],
  ["UC13", "Gestionar catálogo y hubs", "Operador", "RF-23, RF-24", "P3", "29"],
  ["UC14", "Asignar entrega a domiciliario", "Operador", "RF-25", "P2", "20"],
  ["UC15", "Ver entregas asignadas", "Domiciliario", "RF-25", "P2", "20"],
  ["UC16", "Realizar entrega de vehículo", "Domiciliario", "RF-25", "P2", "20"],
  ["UC17", "Marcar entrega tardía", "Domiciliario / sistema", "RF-27", "P2", "20"],
  ["UC18", "Realizar pago", "Sistema (vía UC04/UC05)", "RF-26", "P1", "16, 17"],
  ["UC19", "Notificar retraso por correo", "Sistema", "RF-27", "P2", "20"],
  ["UC20", "Reportar telemetría y alertas", "Vehículo IoT", "RF-08, RF-11", "P1", "19"],
];
const SEQ_ID = {
  15: "seq-15",
  16: "seq-16",
  17: "seq-17",
  18: "seq-18",
  19: "seq-19",
  20: "seq-20",
  28: "seq-28",
  29: "seq-29",
};
const seqLinks = (s) =>
  s
    .split(",")
    .map((x) => x.trim())
    .map((x) => `<a href="#${SEQ_ID[x]}">D-${x}</a>`)
    .join(", ");

// ------------------------------------------------------------------ casos de prueba
const CASOS = [
  {
    id: "CP0001_ALQUILER",
    anchor: "cp-01",
    nombre: "Alquilar un vehículo en hub y pagar el prepago",
    autor: AUTORES[0],
    uc: "UC05 Alquilar vehículo · UC18 Realizar pago («include»)",
    rf: "RF-05, RF-06, RF-26 · RNF-07 (máx. 3 pasos)",
    diag: `<a href="#seq-17">D-17 Secuencia alquilar y pagar</a> · <a href="#st-21">D-21 Estados de la reserva</a>`,
    objetivo:
      "Verificar que un cliente autenticado puede reservar un vehículo de alquiler disponible en un hub, que el sistema cobra el prepago base de $10.000 COP antes de habilitar el desbloqueo, y que las reglas de negocio de la reserva (una sola reserva abierta sin pagar, vehículo no disponible, rechazo del pago) se cumplen.",
    tecnica: "Caja negra · partición de equivalencias sobre el estado del vehículo y del pago · transición de estados de la reserva (requested → active).",
    pre: [
      "Aplicación desplegada (local con <code>sh scripts/demo-local.sh</code> o producción) con datos sembrados (<code>UMH_SEED_DEMO=1</code>).",
      "Cuenta <code>cliente@demo.co</code> / <code>Demo1234!</code> sin reservas abiertas.",
      "Vehículo de alquiler <code>SC-1042</code> (Volt S2) en estado <i>Disponible</i> en Hub Cabecera.",
      "Pasarela de pagos simulada (sin llaves de Bold) o Bold en modo sandbox.",
    ],
    datos: [
      ["Usuario", "cliente@demo.co / Demo1234!"],
      ["Vehículo válido", "SC-1042 · patineta eléctrica · modo alquiler · disponible"],
      ["Modalidad", "hub (recoger en el hub)"],
      ["Prepago esperado", "$10.000 COP (<code>BASE_PREPAY_COP</code>)"],
      ["Vehículo no válido", "Un vehículo en estado <i>reservado</i> o <i>en mantenimiento</i>"],
    ],
    pasos: [
      ["Iniciar sesión en <code>/login</code> con el usuario de prueba.", "Credenciales válidas", "Redirige a la app; la cabecera muestra el nombre del cliente.", "Conforme"],
      ["Abrir <code>/app</code>, modo <b>Alquilar</b>, y tocar el vehículo SC-1042 en el mapa.", "SC-1042", "Se abre la ficha con modelo, batería, tarifa por minuto y hub.", "Conforme"],
      ["Elegir <b>Recoger en hub</b> y confirmar la reserva (paso 2 y 3 de RNF-07).", "modality = hub", "<code>POST /api/reservations</code> → 201. Reserva en estado <i>Solicitada</i>; el vehículo pasa a <i>Reservado</i> y desaparece de los disponibles.", "Conforme"],
      ["Sin pagar, pulsar <b>Desbloquear</b> en la tarjeta de la reserva.", "—", "El sistema lo impide con 402: «Paga el prepago de esta reserva para desbloquear el vehículo» (con Bold: «Completa el pago del prepago en Bold…»).", "Conforme"],
      ["Pulsar <b>Pagar prepago</b> y completar el pago.", "$10.000 COP", "Se registra un pago <code>kind = base</code> aprobado con referencia; la tarjeta muestra «Prepago pagado ($10.000). Ya puedes desbloquearlo».", "Conforme"],
      ["Abrir <code>/mis-reservas</code>.", "—", "La reserva aparece con su referencia, vehículo, hub y estado del prepago.", "Conforme"],
    ],
    alternos: [
      ["A1", "Reservar un segundo vehículo sin haber pagado el primero.", "La reserva anterior sin pagar se cancela y su vehículo vuelve a <i>Disponible</i> (máx. 1 reserva abierta sin pagar).", "Conforme"],
      ["A2", "Reservar un vehículo que otro cliente acaba de reservar.", "409 «Ese vehículo no está disponible para alquiler»; no se crea reserva.", "Conforme"],
      ["A3", "Elegir <b>A domicilio</b> en un vehículo no apto para reparto.", "422 «Este vehículo no tiene entrega a domicilio; recógelo en su hub».", "Conforme"],
      ["A4", "Pago rechazado o pasarela sin respuesta (timeout).", "402 con el motivo; el pago queda <i>rechazado</i> y la reserva sigue sin habilitar el desbloqueo.", "Conforme"],
      ["A5", "Reserva sin pagar con más de 30 min.", "Se cancela automáticamente al listar las reservas y el vehículo se libera.", "Conforme"],
    ],
    post: "Existe una reserva <i>Solicitada</i> con prepago aprobado; el vehículo queda <i>Reservado</i> y el desbloqueo (UC08) está habilitado. En los alternos no queda ningún cambio de negocio parcial.",
    evidencia: [
      "<code>tests/integration/flujo-cliente.test.ts</code> — «sin pagar el prepago no hay desbloqueo (402); pagado, sí», «máximo una reserva abierta sin pagar…», «las solicitudes sin pagar de hace más de 30 min se cancelan al listar».",
      "<code>tests/integration/api-reglas.test.ts</code> — «RF-05: reserva a domicilio» (apto / no apto) y «UC18-E2: timeout de la pasarela».",
      "<code>tests/unit/pasarela.test.ts</code> y <code>tests/integration/bold.test.ts</code> — aprobación, rechazo y firma del webhook de Bold.",
      "<code>tests/e2e/reserva-desbloqueo.spec.ts</code> — recorrido en navegador: reservar, pagar, desbloquear, viajar y terminar.",
    ],
  },
  {
    id: "CP0002_DESBLOQUEO",
    anchor: "cp-02",
    nombre: "Desbloquear el vehículo con QR y verificación de casco",
    autor: AUTORES[1],
    uc: "UC08 Desbloquear vehículo (QR + casco) · «extend» UC09 rostro",
    rf: "RF-09 · RNF-07 (3 pasos) · R-10 del SRS (orden obligatorio)",
    diag: `<a href="#seq-18">D-18 Secuencia de desbloqueo</a> · <a href="#st-22">D-22 Estados del vehículo</a>`,
    objetivo:
      "Comprobar que el viaje solo inicia cuando, dentro de una sesión de desbloqueo de 120 s, el cliente escanea el QR que corresponde al vehículo reservado y el sistema detecta el casco con la confianza mínima exigida; y que cualquier fallo (QR equivocado, sin casco, orden alterado o sesión vencida) deja intactos la reserva y el vehículo.",
    tecnica: "Caja negra · máquina de estados (qr → helmet → ready, con denied / expired) · análisis de valores límite en la confianza del casco y en el tiempo de la sesión.",
    pre: [
      "Reserva del cliente en estado <i>Solicitada</i> con prepago aprobado (resultado de CP0001_ALQUILER).",
      "Vehículo SC-1042 en estado <i>Reservado</i> con el QR <code>UMH:SC-1042</code> (impreso desde <code>/admin/qr</code>).",
      "Cámara disponible: webcam del navegador o panel <b>Cámara del PC</b> del operador actuando como ESP32-CAM; servicio de visión <code>umh-vision</code> (YOLOv8n ONNX) en marcha.",
    ],
    datos: [
      ["QR válido", "<code>UMH:SC-1042</code> (o el código manual <code>SC-1042</code>)"],
      ["QR inválido", "<code>UMH:BK-2201</code> (otro vehículo) y un texto sin formato"],
      ["Casco", "Persona con casco puesto (confianza ≈ 0,9) y persona sin casco"],
      ["Tiempo", "Sesión de desbloqueo de 120 s (<code>UNLOCK_TTL_MS</code>)"],
    ],
    pasos: [
      ["En la tarjeta de la reserva pulsar <b>Desbloquear</b>.", "Reserva pagada", "<code>POST /api/unlock/sessions</code>: se abre una sesión en el paso <i>qr</i> con vencimiento a 120 s.", "Conforme"],
      ["Escanear el QR del manubrio con la cámara (o escribir el código).", "UMH:SC-1042", "El QR coincide con el vehículo de la reserva: la sesión avanza al paso <i>helmet</i>.", "Conforme"],
      ["Ponerse el casco frente a la cámara del vehículo.", "Con casco", "El servicio de visión devuelve «Con casco» con confianza ≥ al umbral; la sesión pasa a <i>ready</i>.", "Conforme"],
      ["Pulsar <b>Iniciar viaje</b>.", "—", "La reserva pasa a <i>Activa</i>, el vehículo a <i>En uso</i> y se emite el comando de desbloqueo; el mapa empieza a seguir la posición.", "Conforme"],
      ["Terminar el viaje.", "—", "Se calcula el cargo por minuto (<code>rate_per_min_cop</code>), se registra el pago del viaje y la reserva queda <i>Completada</i>.", "Conforme"],
    ],
    alternos: [
      ["A1", "Escanear el QR de otro vehículo.", "Sesión <i>denied</i>: «El código QR no corresponde a este vehículo». Reserva y vehículo sin cambios.", "Conforme"],
      ["A2", "Verificar sin casco (o confianza por debajo del umbral).", "Sesión <i>denied</i>; el viaje no inicia.", "Conforme"],
      ["A3", "Enviar la verificación de casco antes de escanear el QR.", "Error de orden («Primero escanea el código QR»); no hay cambio de estado.", "Conforme"],
      ["A4", "Dejar pasar más de 120 s antes de iniciar.", "Sesión <i>expired</i>; hay que abrir una nueva. A los 120 s exactos aún es válida.", "Conforme"],
      ["A5", "Intentar desbloquear un vehículo en mantenimiento.", "409 «Este vehículo está en mantenimiento y no se puede desbloquear».", "Conforme"],
      ["A6", "Identidad por rostro (UC09) con similitud 0,84 / 0,85.", "0,84 → <i>denied</i>; 0,85 → avanza a <i>helmet</i>. El rostro reemplaza al QR, nunca al casco.", "Conforme"],
    ],
    post: "Con el flujo completo: reserva <i>Activa</i> → <i>Completada</i> al terminar, vehículo <i>En uso</i> → <i>Disponible</i>, un pago de viaje registrado. En los alternos la reserva sigue <i>Solicitada</i> y el vehículo <i>Reservado</i>.",
    evidencia: [
      "<code>tests/unit/unlock.test.ts</code> — TC-UNL-01 a TC-UNL-18: flujo feliz, sin casco, límites de confianza (0,69 / 0,70), QR de otro vehículo, orden obligatorio, caducidad a 120 s y rostro (0,84 / 0,85 / sin consentimiento).",
      "<code>tests/unit/camera.test.ts</code>, <code>helmet-vision.test.ts</code>, <code>helmet-model.test.ts</code> — veredicto de la cámara del vehículo y postproceso YOLOv8.",
      "<code>tests/integration/mantenimiento.test.ts</code> — un vehículo en mantenimiento no se desbloquea.",
      "<code>tests/e2e/reserva-desbloqueo.spec.ts</code> — desbloqueo con código manual, viaje y fin en el navegador.",
    ],
  },
  {
    id: "CP0003_ENTREGA",
    anchor: "cp-03",
    nombre: "Realizar una entrega a domicilio y marcar una entrega tardía",
    autor: AUTORES[2],
    uc: "UC16 Realizar entrega · UC17 Marcar entrega tardía («extend») · UC19 Notificar retraso",
    rf: "RF-25, RF-27",
    diag: `<a href="#seq-20">D-20 Secuencia de entrega a domicilio</a> · <a href="#st-23">D-23 Estados de la entrega</a>`,
    objetivo:
      "Validar el ciclo de vida de una entrega a domicilio desde la bandeja del domiciliario (asignada → en camino → entregada) con cierre coherente de la reserva y el vehículo, y que el retraso se registra una sola vez, con causa obligatoria, y dispara el aviso por correo sin duplicados.",
    tecnica: "Caja negra · transición de estados de la entrega · pruebas negativas de autorización y de transiciones inválidas.",
    pre: [
      "Reserva a domicilio pagada de un cliente sobre un vehículo apto para reparto.",
      "El operador (<code>operador@demo.co</code>) asignó la entrega a <code>domi1@demo.co</code> desde <code>/admin</code> → Entregas (UC14).",
      "El domiciliario tiene menos de 5 entregas abiertas.",
      "Brevo configurado, o sin llave (el correo queda en estado <i>simulated</i>).",
    ],
    datos: [
      ["Domiciliario", "domi1@demo.co / Demo1234!"],
      ["Otro domiciliario", "domi2@demo.co (para la prueba de autorización)"],
      ["Causa de retraso", "«Tráfico en la Autopista a Floridablanca»"],
      ["Tope", "<code>MAX_ACTIVE_DELIVERIES = 5</code>"],
    ],
    pasos: [
      ["Iniciar sesión como domiciliario y abrir <code>/entregas</code>.", "domi1", "La bandeja lista la entrega asignada con dirección, cliente y cuenta atrás hasta el plazo.", "Conforme"],
      ["Pulsar <b>Iniciar</b>.", "action = start", "La entrega pasa de <i>Asignada</i> a <i>En camino</i>.", "Conforme"],
      ["Pulsar <b>Confirmar entrega</b>.", "action = deliver", "En una sola transacción: entrega <i>Entregada</i> con <code>delivered_at</code> del servidor, reserva <i>Activa</i> (el cliente ya tiene el vehículo) y vehículo <i>En uso</i>.", "Conforme"],
      ["En otra entrega en curso, pulsar <b>Marcar tardía</b> y escribir la causa.", "Causa de retraso", "La entrega pasa a <i>Tardía</i> con la causa guardada; se encola el correo al cliente y al operador.", "Conforme"],
      ["Revisar en <code>/admin</code> la bitácora de correos Brevo.", "—", "Aparecen los avisos con estado <i>sent</i> (o <i>simulated</i> sin llave) sin duplicados.", "Conforme"],
    ],
    alternos: [
      ["A1", "Marcar tardía sin escribir causa.", "422 «Escribe la causa del retraso».", "Conforme"],
      ["A2", "Marcar tardía una entrega que ya es tardía.", "409 «La entrega ya está marcada como tardía»; no se reenvía el correo.", "Conforme"],
      ["A3", "Confirmar una entrega tardía sin justificación.", "422 «Una entrega tardía se confirma con justificación».", "Conforme"],
      ["A4", "<code>domi2</code> intenta actuar sobre la entrega de <code>domi1</code>.", "403 «Solo tu entrega».", "Conforme"],
      ["A5", "Asignar una sexta entrega a un domiciliario con 5 abiertas.", "422: «ya tiene 5 entregas abiertas (máximo 5); elige otro».", "Conforme"],
      ["A6", "Vence el plazo sin acción del domiciliario.", "El barrido periódico del servidor marca la entrega como tardía con causa automática.", "Conforme"],
    ],
    post: "La entrega queda <i>Entregada</i> (o <i>Tardía</i> con su causa) y el estado de reserva y vehículo es coherente. Cada retraso genera como máximo un correo por destinatario.",
    evidencia: [
      "<code>tests/integration/api-reglas.test.ts</code> — «UC16/UC17: realizar entrega y marcarla tardía» (sin causa → 422; dos veces → 409; estado coherente al entregar) y «UC14-E2: tope de entregas por domiciliario».",
      "<code>tests/integration/backend-flows.test.ts</code> — «asignada → en camino → entregada con cierre atómico de reserva», «overdue detecta solo vencidas abiertas — base del cron UC17», UNIQUE de notificaciones.",
      "<code>tests/unit/brevo.test.ts</code> — UC19: <i>simulated</i> sin llave, anti-duplicado, 200 → <i>sent</i>, 500 → <i>failed</i> sin alterar la entrega.",
    ],
  },
];

// Campos de la plantilla de clase (Plantilla caso de prueba.docx) que no están en CASOS.
const PLANT = {
  CP0001_ALQUILER: {
    funcion: "Módulo de reservas y pagos del cliente: creación de la reserva de alquiler (<code>POST /api/reservations</code>) y cobro del prepago base (<code>POST /api/payments</code>, pasarela simulada o Bold). Casos de uso UC05 Alquilar vehículo y UC18 Realizar pago.",
    descripcion: "El caso recorre el alquiler de una patineta en un hub desde la app web: el cliente elige el vehículo en el mapa, selecciona la modalidad «Recoger en hub», confirma la reserva y paga el prepago de $10.000 COP. Se comprueba que antes del pago el desbloqueo está bloqueado y que después del pago queda habilitado, porque el prepago es la garantía del alquiler en el modelo de negocio de micromovilidad.",
    exito: [
      "La reserva se crea en estado <i>Solicitada</i> y el vehículo pasa a <i>Reservado</i> (deja de aparecer como disponible).",
      "Antes de pagar, el desbloqueo responde 402 y no se abre ninguna sesión de desbloqueo.",
      "El pago queda registrado como <code>kind = base</code>, <i>aprobado</i>, por $10.000 COP y con referencia de la pasarela.",
      "La tarjeta de la reserva muestra «Prepago pagado ($10.000). Ya puedes desbloquearlo» y aparece en <i>Mis reservas</i>.",
    ],
    falla: [
      "Se crea la reserva sobre un vehículo no disponible, o el vehículo no cambia a <i>Reservado</i>.",
      "Se permite desbloquear sin prepago aprobado.",
      "El monto cobrado es distinto de $10.000 COP, el pago no queda registrado o queda sin referencia.",
      "Un pago rechazado deja la reserva habilitada para desbloquear, o el sistema muestra un error no controlado (5xx).",
    ],
    perfil: "Cliente (rol <code>customer</code>) autenticado: <code>cliente@demo.co</code>.",
  },
  CP0002_DESBLOQUEO: {
    funcion: "Módulo de desbloqueo seguro: sesión de desbloqueo (<code>/api/unlock/sessions</code>), validación del QR, verificación de casco con visión por computador (YOLOv8n, cámara del vehículo) e inicio del viaje. Caso de uso UC08 Desbloquear vehículo (QR + casco).",
    descripcion: "El caso verifica la regla de seguridad central del negocio: un vehículo solo se desbloquea si quien lo reservó está frente a él (QR del manubrio) y lleva casco puesto. Se ejecuta el flujo completo de tres pasos —escanear QR, verificar casco e iniciar viaje— dentro de una sesión de 120 s, y se termina el viaje para comprobar el cobro por minuto.",
    exito: [
      "La sesión nace en el paso <i>qr</i> con vencimiento a 120 s.",
      "Con el QR <code>UMH:SC-1042</code> la sesión avanza a <i>helmet</i>; con el casco detectado avanza a <i>ready</i>.",
      "Al iniciar el viaje la reserva pasa a <i>Activa</i> y el vehículo a <i>En uso</i>; el mapa muestra el seguimiento.",
      "Al terminar se registra el cargo por minuto y la reserva queda <i>Completada</i>.",
    ],
    falla: [
      "El viaje inicia con un QR de otro vehículo, sin casco o con la sesión vencida.",
      "Se puede verificar el casco o iniciar el viaje sin haber escaneado el QR (orden de pasos alterado).",
      "Tras un rechazo cambia el estado de la reserva o del vehículo.",
      "Al terminar el viaje no se registra el cobro o la reserva no se cierra.",
    ],
    perfil: "Cliente (rol <code>customer</code>) autenticado y dueño de la reserva: <code>cliente@demo.co</code>.",
  },
  CP0003_ENTREGA: {
    funcion: "Módulo de logística a domicilio: bandeja del domiciliario (<code>/entregas</code>), transiciones de la entrega (<code>PATCH /api/deliveries/{id}</code>: start, deliver, late) y notificación de retraso por correo (Brevo). Casos de uso UC16 Realizar entrega, UC17 Marcar entrega tardía y UC19 Notificar retraso.",
    descripcion: "El caso valida el ciclo de vida de una entrega a domicilio desde el punto de vista del domiciliario: iniciar el recorrido, confirmar la entrega al cliente y, en otra entrega, reportar un retraso con su causa. Se comprueba que el cierre deja coherentes la entrega, la reserva y el vehículo, y que el retraso genera un único aviso por correo al cliente y al operador.",
    exito: [
      "La entrega pasa de <i>Asignada</i> a <i>En camino</i> y luego a <i>Entregada</i>, con hora de entrega fijada por el servidor.",
      "Al confirmar, la reserva queda <i>Activa</i> y el vehículo <i>En uso</i> en la misma transacción.",
      "Al marcar el retraso con causa, la entrega queda <i>Tardía</i> con la causa guardada.",
      "La bitácora de correos muestra un aviso por destinatario (<i>sent</i>, o <i>simulated</i> sin llave), sin duplicados.",
    ],
    falla: [
      "Se puede confirmar o marcar tardía una entrega de otro domiciliario.",
      "Se acepta un retraso sin causa o se marca dos veces como tardía.",
      "La entrega queda <i>Entregada</i> pero la reserva o el vehículo no cambian (estado incoherente).",
      "Se envía más de un correo por el mismo retraso, o una falla del correo cambia el estado de la entrega.",
    ],
    perfil: "Domiciliario (rol <code>courier</code>) autenticado: <code>domi1@demo.co</code>. El operador (<code>operador@demo.co</code>) prepara la precondición.",
  },
};

const casoHTML = (c) => {
  const p = PLANT[c.id];
  const pasos = c.pasos
    .map(([a, d, e], i) => `<tr><td class="np">${i + 1}</td><td>${a}${d && d !== "—" ? `<br><span class="small">Entrada: ${d}</span>` : ""}</td><td>${e}</td></tr>`)
    .join("");
  return `
<section class="tc wrap" id="${c.anchor}">
  <table class="plantilla">
    <tr><th colspan="4" class="pt-title">Caso de prueba</th></tr>
    <tr><th>Identificador caso de prueba</th><td colspan="3"><b>${c.id}</b> — ${c.nombre}</td></tr>
    <tr><th>Función a probar</th><td colspan="3">${p.funcion}</td></tr>
    <tr><th>Objetivo</th><td colspan="3">${c.objetivo}</td></tr>
    <tr><th>Descripción</th><td colspan="3">${p.descripcion}</td></tr>
    <tr><th>Criterios de éxito</th><td colspan="3"><ul>${p.exito.map((x) => `<li>${x}</li>`).join("")}</ul></td></tr>
    <tr><th>Criterios de falla</th><td colspan="3"><ul>${p.falla.map((x) => `<li>${x}</li>`).join("")}</ul></td></tr>
    <tr><th>Precondiciones</th><td colspan="3"><ul>${c.pre.map((x) => `<li>${x}</li>`).join("")}</ul></td></tr>
    <tr><th>Perfil del usuario</th><td colspan="3">${p.perfil}</td></tr>
    <tr><th>Necesidades para el caso de prueba</th><td colspan="3"><b>Datos de prueba:</b><ul>${c.datos.map(([a, b]) => `<li><b>${a}:</b> ${b}</li>`).join("")}</ul><b>Configuración:</b> ${c.env ?? "aplicación local (<code>sh scripts/demo-local.sh</code>, SQLite con <code>UMH_SEED_DEMO=1</code>) o producción (https://urbanmobility.duckdns.org); navegador Chromium; pasarela simulada o Bold sandbox; Brevo opcional."}</td></tr>
    <tr><th>Autor</th><td colspan="3">${c.autor}</td></tr>
    <tr><th>Fecha de creación</th><td colspan="3">20/11/2026</td></tr>
    <tr class="pt-flow"><th rowspan="${c.pasos.length + 1}">Flujo del caso de prueba</th><th class="np">No. paso</th><th style="width:62mm">Usuario del sistema</th><th>Sistema</th></tr>
    ${pasos}
    <tr><th>Post condiciones</th><td colspan="3">${c.post}</td></tr>
  </table>
  <div class="tc-extra">
    <h4>Información complementaria (fuera de la plantilla)</h4>
    <p class="small"><b>Caso de uso:</b> ${c.uc} · <b>Requisitos:</b> ${c.rf} · <b>Diagramas:</b> ${c.diag} · <b>Técnica:</b> ${c.tecnica}</p>
    <table class="t compact"><tr><th style="width:9mm">ID</th><th style="width:62mm">Variante negativa / alterna</th><th>Resultado esperado</th><th style="width:17mm">Resultado</th></tr>
    ${c.alternos.map(([id, a, e, o]) => `<tr><td>${id}</td><td>${a}</td><td>${e}</td><td><span class="pill ok">${o}</span></td></tr>`).join("")}</table>
    <p class="small"><b>Evidencia de ejecución (20-nov-2026, Vitest 156/156 aprobadas):</b></p>
    <ul class="small">${c.evidencia.map((x) => `<li>${x}</li>`).join("")}</ul>
  </div>
</section>`;
};

// ------------------------------------------------------------------ documento
export async function buildAnalisis() {
  figN = 0;
  figs.length = 0;

  // Las figuras se construyen primero para conocer su numeración.
  const F = {};
  F.uc02 = await figura("uc-general", "Diagrama de casos de uso general", D("02-casos-de-uso-general.png"), {
    tag: "UML · Casos de uso",
    desc: "<p>Plano maestro con los <b>20 casos de uso</b> y los tres roles. El Operador y el Domiciliario <b>heredan</b> del Cliente (generalización de actores). Se modelan como actores secundarios la pasarela de pagos, el servicio de mapas, el correo (Brevo) y el vehículo IoT.</p>",
  });
  F.uc03 = await figura("uc-cliente", "Casos de uso del Cliente", D("03-casos-de-uso-cliente.png"), {
    tag: "UML · Casos de uso",
    desc: "<p><code>Comprar</code> y <code>Alquilar</code> <b>«include»</b> <code>Pagar</code>, que a su vez exige sesión. <code>Desbloquear con rostro</code> <b>«extend»</b> <code>Desbloquear (QR + casco)</code>: solo ocurre cuando el QR no se puede leer y hay consentimiento biométrico.</p>",
  });
  F.uc04 = await figura("uc-operador", "Casos de uso del Operador", D("04-casos-de-uso-operador.png"), {
    tag: "UML · Casos de uso",
    desc: "<p>Supervisión de la flota (KPIs y gemelos digitales), simulación de eventos IoT, bitácora de alertas, catálogo de vehículos y hubs y asignación de entregas. La telemetría del vehículo (UC20) <b>«include»</b> el registro en la bitácora (UC12).</p>",
  });
  F.uc05 = await figura("uc-domiciliario", "Casos de uso del Domiciliario", D("05-casos-de-uso-domiciliario.png"), {
    tag: "UML · Casos de uso",
    desc: "<p><code>Marcar entrega tardía</code> <b>«extend»</b> <code>Realizar entrega</code> (solo si se vence el plazo) y <code>Notificar retraso por correo</code> <b>«extend»</b> la tardía.</p>",
  });
  F.c13 = await figura("clases-dominio", "Diagrama de clases — vista estática del dominio", D("13-clases.png"), {
    tag: "UML · Clases",
    desc: "<p>Entidades con atributos tipados, multiplicidades y navegabilidad. Incluye dos jerarquías de POO: la interfaz <code>FuenteDeDatos</code> (implementaciones <i>mock</i> y API real) y <code>ReglaDeSeguridad</code> (casco, caída, GPS y batería), además de <code>PasarelaDePagos</code> (simulada y Bold).</p>",
  });
  F.c25 = await figura("clases-bce", "Diagrama de clases de análisis BCE (Boundary–Control–Entity)", D("25-clases-bce.png"), {
    tag: "UML · Clases de análisis",
    desc: "<p>Tres capas: <b>«boundary»</b> (pantallas y servicios externos) → <b>«control»</b> (reglas de negocio) → <b>«entity»</b> (datos). Una interfaz nunca accede a una entidad directamente.</p>",
  });
  F.c14 = await figura("modelo-datos", "Modelo de datos persistente", D("14-modelo-datos.png"), {
    tag: "Entidad–relación",
    desc: "<p>Proyección del modelo de clases sobre SQLite (<code>src/server/db/schema.sql</code>): cardinalidades 1:N y 1:0..1; la bitácora de alertas es de solo inserción (no se borra).</p>",
  });
  const SEQ = [
    [15, "15-secuencia-registro-login-cierre.png", "Registro, inicio de sesión y fin del viaje", "UC01, UC02", "<p>Sin aceptar el tratamiento de datos (Ley 1581) no se crea la cuenta; la contraseña se guarda con <code>scrypt</code> y sal; ante credenciales erradas no se revela cuál dato falló. Al cerrar el viaje se cobra el valor por minuto.</p>"],
    [16, "16-secuencia-compra-pago.png", "Comprar un vehículo (incluye Pagar)", "UC04 → UC18", "<p>La compra nace <i>pendiente</i>; solo con pago aprobado el vehículo queda <i>vendido</i>. Si el pago se rechaza, el vehículo <b>no</b> cambia de estado.</p>"],
    [17, "17-secuencia-alquiler-pago.png", "Alquilar un vehículo y pagar el prepago", "UC05 → UC18", "<p>Reserva <i>solicitada</i>, cobro del valor base de $10.000 y vehículo <i>reservado</i>; el resto se cobra por minuto al terminar. Base del caso de prueba <a href=\"#cp-01\">CP0001_ALQUILER</a>.</p>"],
    [18, "18-secuencia-desbloqueo.png", "Desbloquear el vehículo (QR + casco, alterno con rostro)", "UC08, UC09", "<p>Tres pasos dentro de una sesión de 120 s: QR, casco y «Iniciar viaje». El rostro reemplaza al QR, nunca al casco. Base del caso de prueba <a href=\"#cp-02\">CP0002_DESBLOQUEO</a>.</p>"],
    [19, "19-secuencia-alerta.png", "Telemetría y alerta de un vehículo", "UC20, UC12, UC11", "<p>Cada lectura se evalúa contra las reglas en orden de gravedad; si hay incidente se guarda en la bitácora y llega al panel en menos de 1 s por SSE. El operador puede simular el evento (origen <i>simulator</i>).</p>"],
    [20, "20-secuencia-entrega-domicilio.png", "Entrega a domicilio y retraso", "UC14–UC17, UC19", "<p>Máximo 5 entregas activas por domiciliario; confirmación atómica; si hay retraso (manual o por barrido) se envía correo una sola vez. Base del caso de prueba <a href=\"#cp-03\">CP0003_ENTREGA</a>.</p>"],
    [28, "28-secuencia-consultas-cliente.png", "Consultas del Cliente: catálogo, mapa y detalle de hub", "UC03, UC06, UC07", "<p>Catálogo público indexable, mapa multicapa con posiciones en vivo cada 2 s por SSE (marcadas «sin señal» si superan 5 s) y detalle de ocupación de un hub.</p>"],
    [29, "29-secuencia-operador-kpis-catalogo.png", "Operador: KPIs, gemelos digitales, catálogo, hubs y mantenimiento", "UC10, UC13", "<p>Control de rol en cada operación; los vehículos no se borran (cambian de estado); un hub con vehículos no se da de baja (RF-24); un vehículo en viaje no pasa a mantenimiento.</p>"],
  ];
  F.seq = [];
  for (const [n, f, t, uc, d] of SEQ)
    F.seq.push(await figura(`seq-${n}`, `D-${n} · ${t}`, D(f), { tag: `Secuencia · ${uc}`, desc: d }));
  F.st = [];
  for (const [n, f, t, d] of [
    [21, "21-estados-reserva.png", "Estados de la reserva", "<p>Solicitada → Activa → Completada, o Cancelada desde Solicitada o Activa.</p>"],
    [22, "22-estados-vehiculo.png", "Estados del vehículo", "<p>Estado compuesto <i>En uso</i> con sub-estados de alerta; <i>En mantenimiento</i> no es visible para el cliente y no admite viajes.</p>"],
    [23, "23-estados-entrega.png", "Estados de la entrega", "<p>Asignada → En camino → Entregada; Tardía por plazo vencido o por aviso del domiciliario.</p>"],
  ])
    F.st.push(await figura(`st-${n}`, `D-${n} · ${t}`, D(f), { tag: "UML · Máquina de estados", desc: d }));
  F.p10 = await figura("paquetes", "Diagrama de paquetes", D("10-paquetes.png"), {
    tag: "UML · Paquetes",
    desc: "<p>Agrupación del código fuente por responsabilidad y sus dependencias «import». Las dependencias van siempre hacia abajo: interfaz → servicios → dominio → datos; el dominio no conoce HTTP ni SQL.</p>",
  });
  F.k11 = await figura("componentes", "Diagrama de componentes", D("11-componentes.png"), {
    tag: "UML · Componentes",
    desc: "<p>Componentes del navegador y del servidor con interfaces <b>provistas</b> (círculo) y <b>requeridas</b> (semicírculo): REST <code>/api</code>, canal SSE, pagos Bold, correo Brevo, ingesta IoT <code>POST /api/ingest</code> y base SQLite.</p>",
  });
  F.k26 = await figura("c4-componentes", "C4 nivel 3 — Componentes del contenedor «Servidor (API)»", D("26-c4-componentes.png"), {
    tag: "C4 · Componentes",
  });
  F.n12 = await figura("nodos", "Diagrama de nodos (despliegue)", D("12-nodos.png"), {
    tag: "UML · Despliegue",
    desc: "<p>Dispositivos cliente, VM Azure (Ubuntu 24.04) con Nginx + Let's Encrypt, servicio systemd <code>umh</code> (Node 24), sidecar <code>umh-vision</code> y SQLite; terceros Bold, Brevo, OpenStreetMap y GitHub. Línea continua = operativo; punteada = previsto.</p>",
  });
  F.c08 = await figura("c4-contexto", "C4 nivel 1 — Contexto del sistema", D("08-c4-contexto.png"), { tag: "C4 · Contexto" });
  F.c09 = await figura("c4-contenedores", "C4 nivel 2 — Contenedores", D("09-c4-contenedores.png"), { tag: "C4 · Contenedores" });
  F.c27 = await figura("c4-codigo", "C4 nivel 4 — Código: de la ingesta IoT a la alerta", D("27-c4-codigo.png"), { tag: "C4 · Código" });

  const ev1 = mini("entregables/entrega-final/capturas-nuevas/n01-admin-monitoreo.png", "Panel del operador: KPIs, simulador de eventos IoT y mapa de flota (local, 20-nov-2026).");
  const ev2 = mini("entregables/entrega-final/capturas-nuevas/n12-app-viaje-activo.png", "App del cliente: mapa de flota con «Mis reservas» y el botón Desbloquear.");
  const ev3 = mini("entregables/entrega-final/capturas-nuevas/n02-admin-mantenimiento.png", "Nuevo módulo de mantenimiento: órdenes abiertas e historial.");

  const toc = `
<section class="toc wrap" id="indice">
  <h2>Tabla de contenido</h2>
  <p class="small">Todas las entradas son enlaces: haga clic para ir a la sección. Cada figura tiene un enlace «↑ Índice» en su encabezado.</p>
  <ol>
    <li class="toc-group">Productos solicitados</li>
    ${tocItem("cap-1", "Presentación de la entrega")}
    ${tocItem("cap-2", "1. Diagrama de casos de uso")}
    ${tocItem("uc-general", "Diagrama general (20 casos de uso)", 2)}
    ${tocItem("uc-cliente", "Casos de uso del Cliente", 2)}
    ${tocItem("uc-operador", "Casos de uso del Operador", 2)}
    ${tocItem("uc-domiciliario", "Casos de uso del Domiciliario", 2)}
    ${tocItem("uc-catalogo", "Catálogo de casos de uso", 2)}
    ${tocItem("cap-3", "2. Diagrama de clases UML — vista estática")}
    ${tocItem("clases-dominio", "Diagrama de clases del dominio", 2)}
    ${tocItem("clases-bce", "Diagrama de clases de análisis BCE", 2)}
    ${tocItem("modelo-datos", "Modelo de datos persistente", 2)}
    ${tocItem("cap-4", "3. Diagramas de secuencia de los casos de uso")}
    ${SEQ.map(([n, , t]) => tocItem(`seq-${n}`, `D-${n} · ${t}`, 2)).join("")}
    ${tocItem("st-21", "Diagramas de estados complementarios (D-21 a D-23)", 2)}
    ${tocItem("cap-5", "4. Diagrama de paquetes")}
    ${tocItem("paquetes", "Diagrama de paquetes", 2)}
    ${tocItem("cap-6", "5. Diagrama de componentes")}
    ${tocItem("componentes", "Diagrama de componentes UML", 2)}
    ${tocItem("c4-componentes", "Componentes del servidor (C4 nivel 3)", 2)}
    ${tocItem("cap-7", "6. Diagrama de nodos")}
    ${tocItem("nodos", "Diagrama de nodos (despliegue)", 2)}
    ${tocItem("cap-9", "7. Casos de prueba (uno por integrante, plantilla de clase)")}
    ${tocItem("cp-01", `CP0001_ALQUILER · Alquilar y pagar el prepago — ${AUTORES[0]}`, 2)}
    ${tocItem("cp-02", `CP0002_DESBLOQUEO · Desbloquear con QR y casco — ${AUTORES[1]}`, 2)}
    ${tocItem("cp-03", `CP0003_ENTREGA · Entrega a domicilio y retraso — ${AUTORES[2]}`, 2)}
    <li class="toc-group">Anexos</li>
    ${tocItem("anexo-a", "Anexo A. Arquitectura y tecnologías")}
    ${tocItem("cap-8", "Anexo B. Vistas arquitectónicas C4")}
    ${tocItem("cap-10", "Anexo C. Avance técnico del desarrollo")}
    ${tocItem("cap-11", "Anexo D. Matriz de trazabilidad")}
    ${tocItem("cap-12", "Anexo E. Índice de figuras y regeneración")}
  </ol>
</section>`;

  const cap1 = `
<section class="chapter wrap" id="cap-1">
  <div class="eyebrow">Presentación</div>
  <h2>Presentación de la entrega</h2>
  <h3>Propósito</h3>
  <p class="lead">Este documento reúne el <b>análisis y diseño orientado a objetos</b> de <b>Urban Mobility Hub</b> (marca de producto <b>NODO Mobility</b>), el proyecto de desarrollo de software del curso Ingeniería de Software II. Contiene los modelos UML exigidos —casos de uso, clases, secuencia, paquetes, componentes y nodos—, un caso de prueba por integrante sobre casos de uso representativos del dominio, y el estado técnico del software construido y desplegado.</p>
  <h3>Descripción del sistema</h3>
  <p>Urban Mobility Hub es una plataforma web multimodal de micromovilidad para Bucaramanga: <b>venta y alquiler</b> de patinetas eléctricas, bicicletas y drones urbanos, con <b>mapa de flota en tiempo real</b>, <b>entrega a domicilio</b> por domiciliarios propios y <b>seguridad IoT basada en gemelos digitales</b>. El desbloqueo de un vehículo exige escanear su QR y verificar que el usuario lleva casco mediante un modelo de visión por computador (YOLOv8n en ONNX) que procesa la imagen de la cámara del vehículo (ESP32-CAM) o del navegador. Los pagos se procesan con Bold (sandbox) y las notificaciones por correo con Brevo. Tres roles usan el sistema: <b>Cliente</b>, <b>Operador</b> y <b>Domiciliario</b>.</p>
  <div class="grid3" style="margin:4mm 0">
    <div class="kpi"><div class="v">20</div><div class="l">casos de uso especificados</div></div>
    <div class="kpi"><div class="v">29</div><div class="l">diagramas (UML, C4, DFD)</div></div>
    <div class="kpi"><div class="v">156/156</div><div class="l">pruebas automatizadas aprobadas (20-nov-2026)</div></div>
    <div class="kpi"><div class="v">≈22 k</div><div class="l">líneas de TypeScript en <code>src/</code></div></div>
    <div class="kpi"><div class="v">77</div><div class="l">commits en el repositorio</div></div>
    <div class="kpi"><div class="v">100</div><div class="l">Lighthouse accesibilidad, buenas prácticas y SEO (producción)</div></div>
  </div>
  <h3 id="cap-1-3">Correspondencia con los productos solicitados</h3>
  <table class="t">
    <tr><th>Producto solicitado</th><th>Dónde está en este documento</th><th>Diagramas</th></tr>
    <tr><td>Diagrama de casos de uso</td><td><a href="#cap-2">Capítulo 1</a></td><td>General + 3 por actor + catálogo de 20 UC</td></tr>
    <tr><td>Diagrama de clases UML — vista estática</td><td><a href="#cap-3">Capítulo 2</a></td><td>Clases del dominio, BCE y modelo de datos</td></tr>
    <tr><td>Diagramas de secuencia de los casos de uso</td><td><a href="#cap-4">Capítulo 3</a></td><td>8 diagramas que cubren los 20 UC (+3 de estados)</td></tr>
    <tr><td>Diagrama de paquetes</td><td><a href="#cap-5">Capítulo 4</a></td><td>Paquetes y dependencias</td></tr>
    <tr><td>Diagrama de componentes</td><td><a href="#cap-6">Capítulo 5</a></td><td>Componentes UML + C4 nivel 3</td></tr>
    <tr><td>Diagrama de nodos</td><td><a href="#cap-7">Capítulo 6</a></td><td>Despliegue en VM Azure y demo local</td></tr>
    <tr><td>Caso de prueba por integrante</td><td><a href="#cap-9">Capítulo 7</a></td><td>CP0001_ALQUILER, CP0002_DESBLOQUEO y CP0003_ENTREGA (ninguno de login o registro)</td></tr>
    <tr><td>Pantallazos de la página y del software</td><td>Documento aparte: <b>Entrega_Pantallazos_UrbanMobilityHub.pdf</b></td><td>Más de 30 figuras con tabla de contenido enlazada</td></tr>
  </table>
  </section>
`;
  const anexoA = `
<section class="chapter wrap" id="anexo-a">
  <div class="eyebrow">Anexo A</div>
  <h2>Arquitectura y tecnologías</h2>
  <h3 id="cap-1-4"><span class="num">A.1</span>Stack por capa</h3>
  <table class="t">
    <tr><th style="width:36mm">Capa</th><th>Tecnología</th><th style="width:58mm">Ubicación en el código</th></tr>
    <tr><td>Interfaz web (SPA + SSR)</td><td>React 19, TanStack Start / Router / Query, Tailwind CSS 4, shadcn/ui (Radix), Leaflet + OpenStreetMap, Recharts, Framer Motion</td><td><code>src/routes/</code>, <code>src/components/</code></td></tr>
    <tr><td>Capa de datos del cliente</td><td>Interfaz <code>DataSource</code> con dos implementaciones (mock y API REST); hooks de TanStack Query</td><td><code>src/lib/data/</code></td></tr>
    <tr><td>Servidor</td><td>Node 24 + Nitro (Vite 8), router REST propio, SSE para tiempo real, WebSocket para la cámara</td><td><code>src/server/api/handlers.ts</code>, <code>src/server/services/</code></td></tr>
    <tr><td>Dominio (reglas puras)</td><td>Desbloqueo, alertas, máquina de estados de reservas, seguimiento</td><td><code>src/server/domain/</code></td></tr>
    <tr><td>Persistencia</td><td>SQLite (<code>node:sqlite</code>), repositorios como único punto de SQL, migraciones y seeders</td><td><code>src/server/db/</code>, <code>src/server/repositories.ts</code></td></tr>
    <tr><td>Seguridad</td><td>Sesión HMAC-SHA256 en cookie httpOnly/Secure (24 h), RBAC por rol, contraseñas <code>scrypt</code>, CSRF en server functions, HTTPS + HSTS</td><td><code>src/server/services/sessions.ts</code>, <code>deploy/</code></td></tr>
    <tr><td>Visión por computador</td><td>YOLOv8n ONNX (detección de casco) en <code>onnxruntime-web</code> y en el sidecar <code>umh-vision</code></td><td><code>vision-service/</code>, <code>models/</code>, <code>src/lib/helmet-model.ts</code></td></tr>
    <tr><td>IoT</td><td>Firmware ESP32-CAM (aprovisionamiento Wi-Fi por Bluetooth), ingesta <code>POST /api/ingest</code>, gemelos digitales simulados</td><td><code>firmware/esp32cam-helmet/</code>, <code>src/server/services/fleet-sim.ts</code></td></tr>
    <tr><td>Integraciones</td><td>Bold (checkout embebido + webhook firmado HMAC), Brevo (correo transaccional)</td><td><code>src/server/services/bold.ts</code>, <code>brevo.ts</code></td></tr>
    <tr><td>Calidad</td><td>Vitest (unitarias + integración), Playwright (E2E), Lighthouse CI, ESLint, commitlint + Husky, GitHub Actions</td><td><code>tests/</code>, <code>.github/workflows/</code></td></tr>
    <tr><td>Despliegue</td><td>VM Azure Ubuntu 24.04, systemd, Nginx, Let's Encrypt, DuckDNS</td><td><code>deploy/</code></td></tr>
  </table>
  <h3><span class="num">A.2</span>Convenciones de notación</h3>
  <p>Los diagramas UML se escribieron como código en <b>PlantUML</b> (con un estilo común en <code>estilo.iuml</code>) y se versionan junto al software; los diagramas 01 y 02 se generan con Python y la matriz de riesgos con Mermaid. Los mensajes de los diagramas de secuencia usan lenguaje de negocio («guarda la reserva», «cobra el valor base») en lugar de SQL o rutas HTTP; el detalle técnico está en el contrato <code>docs/api/openapi.yaml</code> (OpenAPI, 44 rutas y 48 operaciones) y en <code>src/server/db/schema.sql</code>. Se conservan las reglas cuantitativas (sesión de desbloqueo de 120 s, prepago de $10.000, alerta en menos de 1 s, máximo 5 entregas por domiciliario) y la notación UML estándar: <code>«include»</code>, <code>«extend»</code>, generalización, fragmentos <code>alt</code>/<code>opt</code>/<code>loop</code>/<code>group</code>, interfaces provistas y requeridas y estereotipos BCE.</p>
</section>`;

  const cap2 = `
<section class="chapter wrap" id="cap-2">
  <div class="eyebrow">Producto 1</div>
  <h2><span class="num">1</span>Diagrama de casos de uso</h2>
  <p class="lead">El modelo de casos de uso describe <b>qué</b> hace el sistema desde el punto de vista de sus actores. Se presenta un diagrama general y tres vistas por actor para mantener la legibilidad. Cada caso tiene una especificación completa (precondiciones, garantías, flujo principal, alternos, excepciones y reglas de negocio) en <code>entregables/analisis/casos-de-uso/UC01…UC20.md</code>.</p>
  <h3>Actores</h3>
  <table class="t">
    <tr><th style="width:34mm">Actor</th><th>Tipo</th><th>Responsabilidad</th></tr>
    <tr><td><b>Cliente</b></td><td>Primario, humano</td><td>Consulta el catálogo y el mapa, compra o alquila, paga, desbloquea y usa vehículos.</td></tr>
    <tr><td><b>Operador</b></td><td>Primario, humano (hereda de Cliente)</td><td>Supervisa la flota y los gemelos digitales, atiende alertas, administra catálogo, hubs y mantenimiento, asigna entregas.</td></tr>
    <tr><td><b>Domiciliario</b></td><td>Primario, humano (hereda de Cliente)</td><td>Ejecuta las entregas a domicilio y reporta retrasos.</td></tr>
    <tr><td><b>Vehículo IoT</b></td><td>Primario, sistema</td><td>Reporta telemetría (posición, batería, impacto, casco) y recibe el comando de desbloqueo.</td></tr>
    <tr><td>Pasarela de pagos · Mapas · Correo</td><td>Secundarios, sistemas externos</td><td>Bold / pasarela simulada, OpenStreetMap, Brevo.</td></tr>
  </table>
</section>
${F.uc02}${F.uc03}${F.uc04}${F.uc05}
<section class="chapter wrap" id="uc-catalogo">
  <h3>Catálogo de casos de uso</h3>
  <p>La última columna enlaza el diagrama de secuencia que realiza cada caso de uso (capítulo 3).</p>
  <table class="t compact">
    <tr><th>ID</th><th>Caso de uso</th><th>Actor principal</th><th>Requisitos</th><th>Prioridad</th><th>Secuencia</th></tr>
    ${UCS.map(([id, n, a, rf, p, s]) => `<tr><td><b>${id}</b></td><td>${n}</td><td>${a}</td><td>${rf}</td><td>${p}</td><td>${seqLinks(s)}</td></tr>`).join("")}
  </table>
  <div class="callout"><p><b>Casos representativos del problema.</b> Los casos de prueba del capítulo 7 se escogieron sobre UC05/UC18 (alquiler y pago), UC08 (desbloqueo con QR y casco) y UC16/UC17 (entrega a domicilio y retraso): son el núcleo del negocio de micromovilidad y no casos transversales como registro o inicio de sesión.</p></div>
</section>`;

  const cap3 = `
<section class="chapter wrap" id="cap-3">
  <div class="eyebrow">Producto 2</div>
  <h2><span class="num">2</span>Diagrama de clases UML — vista estática</h2>
  <p class="lead">La vista estática describe la estructura del sistema: las clases del dominio con sus atributos y operaciones, las relaciones (asociación, composición, generalización y realización) y sus multiplicidades.</p>
  <h3>Clases principales</h3>
  <table class="t compact">
    <tr><th style="width:34mm">Clase</th><th>Responsabilidad</th><th style="width:52mm">Relaciones clave</th></tr>
    <tr><td><b>Usuario</b></td><td>Identidad, rol (cliente, operador, domiciliario) y credenciales con hash.</td><td>1 — 0..* Consentimiento, Reserva, Compra; 1 — 0..* Entrega (como domiciliario)</td></tr>
    <tr><td><b>Consentimiento</b></td><td>Autorización explícita de datos personales y biometría (Ley 1581), revocable.</td><td>* — 1 Usuario</td></tr>
    <tr><td><b>Hub</b></td><td>Estación física con capacidad, carga y ubicación.</td><td>1 — 0..* Vehículo</td></tr>
    <tr><td><b>Vehículo</b></td><td>Gemelo digital: tipo, modo (venta/alquiler), estado, batería, posición, tarifa por minuto y QR.</td><td>* — 0..1 Hub; 1 — 0..* Alerta, Orden de mantenimiento</td></tr>
    <tr><td><b>Reserva</b></td><td>Alquiler con modalidad hub/domicilio y máquina de estados.</td><td>* — 1 Usuario, Vehículo; 1 — 0..* Pago; 1 — 0..1 Entrega</td></tr>
    <tr><td><b>Compra</b></td><td>Venta de un vehículo.</td><td>1 — 0..* Pago</td></tr>
    <tr><td><b>Pago</b></td><td>Comprobante (base, cargo de viaje o compra) con referencia de la pasarela.</td><td>* — 1 Reserva o Compra</td></tr>
    <tr><td><b>SesionDesbloqueo</b></td><td>Estado del desbloqueo (qr → helmet → ready / denied / expired) con vencimiento a 120 s.</td><td>* — 1 Reserva</td></tr>
    <tr><td><b>Entrega</b></td><td>Reparto a domicilio con plazo, estado y causa de retraso.</td><td>0..1 — 1 Reserva; * — 1 Domiciliario</td></tr>
    <tr><td><b>Alerta</b></td><td>Incidente de seguridad (sin casco, caída, sin GPS, batería crítica); solo inserción.</td><td>* — 1 Vehículo</td></tr>
  </table>
  <h3>Abstracciones y principios de diseño OO</h3>
  <ul>
    <li><b>Polimorfismo por interfaz:</b> <code>PasarelaDePagos</code> tiene dos realizaciones (simulada determinista y Bold); el servidor elige una según la configuración, sin cambiar el caso de uso (patrón <i>Strategy</i>).</li>
    <li><b>Inversión de dependencias:</b> la interfaz <code>FuenteDeDatos</code> (<code>DataSource</code>) desacopla los componentes de React del origen de los datos (<i>mock</i> o API REST).</li>
    <li><b>Reglas como objetos:</b> <code>ReglaDeSeguridad</code> se especializa en casco, caída, GPS y batería, evaluadas en orden de gravedad por <code>evaluateTelemetry</code>.</li>
    <li><b>Encapsulamiento de la persistencia:</b> los repositorios son el único punto que escribe SQL (patrón <i>Repository</i>); el dominio es puro y se prueba sin base de datos.</li>
  </ul>
</section>
${F.c13}${F.c25}${F.c14}`;

  const cap4 = `
<section class="chapter wrap" id="cap-4">
  <div class="eyebrow">Producto 3</div>
  <h2><span class="num">3</span>Diagramas de secuencia de los casos de uso</h2>
  <p class="lead">Cada diagrama de secuencia realiza uno o varios casos de uso y muestra el intercambio de mensajes en el tiempo entre actor, interfaz, servidor, servicios externos y base de datos, con los fragmentos combinados <code>alt</code>, <code>opt</code>, <code>loop</code> y <code>group</code> para los flujos alternos y las excepciones. Los diagramas D-28 y D-29 se añadieron en esta entrega para que <b>los 20 casos de uso</b> tengan su secuencia.</p>
  <h3>Cobertura de casos de uso</h3>
  <table class="t compact">
    <tr><th>Diagrama</th><th>Casos de uso que realiza</th><th>Regla de negocio destacada</th></tr>
    <tr><td><a href="#seq-15">D-15</a></td><td>UC01, UC02</td><td>Sin consentimiento no hay cuenta; contraseña con hash</td></tr>
    <tr><td><a href="#seq-16">D-16</a></td><td>UC04, UC18</td><td>Pago rechazado ⇒ el vehículo no se vende</td></tr>
    <tr><td><a href="#seq-17">D-17</a></td><td>UC05, UC18</td><td>Prepago base de $10.000; resto por minuto</td></tr>
    <tr><td><a href="#seq-18">D-18</a></td><td>UC08, UC09</td><td>QR + casco en sesión de 120 s; rostro como alterno</td></tr>
    <tr><td><a href="#seq-19">D-19</a></td><td>UC20, UC12, UC11</td><td>Alerta en el panel en menos de 1 s; historial no se borra</td></tr>
    <tr><td><a href="#seq-20">D-20</a></td><td>UC14, UC15, UC16, UC17, UC19</td><td>Máx. 5 entregas activas; correo de retraso sin duplicados</td></tr>
    <tr><td><a href="#seq-28">D-28</a></td><td>UC03, UC06, UC07</td><td>Posición en vivo cada 2 s; «sin señal» si supera 5 s</td></tr>
    <tr><td><a href="#seq-29">D-29</a></td><td>UC10, UC13</td><td>RBAC; hub con vehículos no se borra (RF-24)</td></tr>
  </table>
</section>
${F.seq.join("")}${F.st.join("")}`;

  const cap5 = `
<section class="chapter wrap" id="cap-5">
  <div class="eyebrow">Producto 4</div>
  <h2><span class="num">4</span>Diagrama de paquetes</h2>
  <p class="lead">El diagrama de paquetes organiza el código en unidades cohesivas y hace explícitas sus dependencias, lo que permite razonar sobre acoplamiento y sobre el impacto de un cambio.</p>
  <table class="t compact">
    <tr><th style="width:44mm">Paquete</th><th>Contenido</th><th style="width:52mm">Carpeta</th></tr>
    <tr><td>Experiencia de usuario (UX)</td><td>Rutas, páginas y componentes de React por rol</td><td><code>src/routes</code>, <code>src/components</code></td></tr>
    <tr><td>Servicios de movilidad</td><td>Reservas, desbloqueo, flota, entregas, mantenimiento</td><td><code>src/server/api</code>, <code>services</code></td></tr>
    <tr><td>Servicios de apoyo</td><td>Pagos (Bold / simulada), correo (Brevo), SSE, sesiones</td><td><code>src/server/services</code></td></tr>
    <tr><td>Inteligencia artificial</td><td>Detección de casco YOLOv8 (navegador y sidecar)</td><td><code>src/lib/helmet-model.ts</code>, <code>vision-service</code></td></tr>
    <tr><td>Dominio</td><td>Reglas puras sin HTTP ni SQL</td><td><code>src/server/domain</code></td></tr>
    <tr><td>Datos</td><td>Esquema, migraciones, seeders y repositorios</td><td><code>src/server/db</code>, <code>repositories.ts</code></td></tr>
    <tr><td>Compartido</td><td>Tipos del dominio usados por cliente y servidor</td><td><code>src/shared/types</code></td></tr>
  </table>
  <div class="callout"><p><b>Regla de dependencias.</b> Interfaz → servicios → dominio → datos. Ningún componente de interfaz importa la base de datos ni los datos de prueba directamente (se accede siempre por <code>DataSource</code>), y el dominio no depende de ningún otro paquete, por eso se prueba de forma aislada con Vitest.</p></div>
</section>
${F.p10}`;

  const cap6 = `
<section class="chapter wrap" id="cap-6">
  <div class="eyebrow">Producto 5</div>
  <h2><span class="num">5</span>Diagrama de componentes</h2>
  <p class="lead">El diagrama de componentes muestra las piezas ejecutables reemplazables del sistema y los contratos entre ellas. Se complementa con el nivel 3 del modelo C4, que detalla los componentes internos del servidor.</p>
  <table class="t compact">
    <tr><th style="width:44mm">Interfaz</th><th>Provee</th><th>Requiere</th><th>Protocolo</th></tr>
    <tr><td>API REST <code>/api/*</code></td><td>Servidor</td><td>Sitio web, panel, app del domiciliario</td><td>HTTPS + JSON, cookie de sesión</td></tr>
    <tr><td>Canal en vivo <code>/api/stream</code></td><td>Servidor (SSE)</td><td>Mapa y panel del operador</td><td>Server-Sent Events</td></tr>
    <tr><td>Ingesta IoT <code>/api/ingest</code></td><td>Servidor</td><td>Vehículo / ESP32-CAM</td><td>HTTPS + clave <code>x-ingest-key</code></td></tr>
    <tr><td>Veredicto de casco</td><td><code>umh-vision</code> (127.0.0.1:8090)</td><td>Servidor</td><td>HTTP interno + WebSocket de cámara</td></tr>
    <tr><td>Pagos</td><td>Bold / pasarela simulada</td><td>Servidor</td><td>Checkout embebido + webhook HMAC</td></tr>
    <tr><td>Correo</td><td>Brevo</td><td>Servidor</td><td>REST (fetch)</td></tr>
    <tr><td>Persistencia</td><td>SQLite</td><td>Repositorios</td><td><code>node:sqlite</code></td></tr>
  </table>
</section>
${F.k11}${F.k26}`;

  const cap7 = `
<section class="chapter wrap" id="cap-7">
  <div class="eyebrow">Producto 6</div>
  <h2><span class="num">6</span>Diagrama de nodos</h2>
  <p class="lead">El diagrama de nodos (despliegue) asigna los artefactos de software a los nodos físicos y de ejecución, con los protocolos de comunicación entre ellos.</p>
  <table class="t compact">
    <tr><th style="width:42mm">Nodo</th><th>Entorno de ejecución</th><th>Artefactos</th></tr>
    <tr><td>Celular / PC del usuario</td><td>Navegador moderno (Chromium, Safari)</td><td>SPA de React, <code>onnxruntime-web</code> con el modelo de casco</td></tr>
    <tr><td>Vehículo IoT</td><td>ESP32-CAM (firmware Arduino)</td><td>Captura de fotogramas y telemetría hacia <code>/api/camera/frame</code> e <code>/api/ingest</code></td></tr>
    <tr><td>VM Azure (2 vCPU, Ubuntu 24.04)</td><td>Nginx (TLS Let's Encrypt, HSTS) → systemd <code>umh</code> (Node 24) en :8080</td><td><code>.output/server/index.mjs</code>, <code>umh-vision</code> en :8090, <code>/var/lib/umh/umh.db</code></td></tr>
    <tr><td>Servicios de terceros</td><td>SaaS</td><td>Bold (pagos), Brevo (correo), OpenStreetMap (teselas), GitHub (código y CI)</td></tr>
  </table>
  <div class="callout"><p><b>Topología de demostración local.</b> Para la presentación, el mismo artefacto corre en el portátil del equipo (<code>sh scripts/demo-local.sh</code>): servidor y web en :8080, visión en :8090, un túnel <code>cloudflared</code> con HTTPS para abrir la app desde el celular, y la webcam del PC haciendo de ESP32-CAM. El procedimiento está en <code>docs/LANZAMIENTO.md</code>.</p></div>
</section>
${F.n12}`;

  const cap8 = `
<section class="chapter wrap" id="cap-8">
  <div class="eyebrow">Anexo B</div>
  <h2>Vistas arquitectónicas C4</h2>
  <p class="lead">El modelo C4 describe la arquitectura con cuatro niveles de zoom: contexto, contenedores, componentes y código. Complementa los diagramas UML anteriores; el nivel 3 está en el <a href="#c4-componentes">capítulo 5</a>.</p>
</section>
${F.c08}${F.c09}${F.c27}`;

  const cap9 = `
<section class="chapter wrap" id="cap-9">
  <div class="eyebrow">Producto 7</div>
  <h2><span class="num">7</span>Casos de prueba</h2>
  <p class="lead">Cada integrante elaboró un caso de prueba funcional sobre un caso de uso representativo del problema de micromovilidad. Ninguno corresponde a casos transversales (registro, inicio de sesión o similares).</p>
  <table class="t">
    <tr><th>ID</th><th>Caso de prueba</th><th>Caso de uso</th><th>Responsable</th></tr>
    ${CASOS.map((c) => `<tr><td><a href="#${c.anchor}"><b>${c.id}</b></a></td><td>${c.nombre}</td><td>${c.uc.split("·")[0]}</td><td>${c.autor}</td></tr>`).join("")}
  </table>
  <h3>Formato</h3>
  <p>Los casos siguen la <b>plantilla de caso de prueba indicada en clase</b>: identificador <code>CP####_xxxxxxxx</code>, función a probar, objetivo, descripción, criterios de éxito y de falla, precondiciones, perfil del usuario, necesidades (datos y configuración), autor, fecha de creación, flujo del caso de prueba (No. paso · usuario del sistema · sistema) y postcondiciones. Debajo de cada plantilla se agrega, como información complementaria, la trazabilidad con casos de uso y diagramas, las variantes negativas probadas y la evidencia de ejecución automatizada.</p>
</section>
${CASOS.map(casoHTML).join("")}`;

  const cap10 = `
<section class="chapter wrap" id="cap-10">
  <div class="eyebrow">Anexo C</div>
  <h2>Avance técnico del desarrollo</h2>
  <h3><span class="num">C.1</span>Cronología</h3>
  <table class="t compact">
    <tr><th style="width:24mm">Fecha</th><th>Hito</th></tr>
    <tr><td>01-oct-2026</td><td>SRS v1.2 y plan de aseguramiento de calidad (SQA).</td></tr>
    <tr><td>08-oct-2026</td><td>20 casos de uso especificados; pruebas unitarias, de integración y E2E; contrato OpenAPI v0.2; revisiones SQA de diseño y código con registro de defectos; manual técnico.</td></tr>
    <tr><td>09-oct-2026</td><td>Detección de casco con YOLOv8n-ONNX en el navegador; landing con fotos reales.</td></tr>
    <tr><td>21-oct-2026</td><td>Diagramas de paquetes, componentes y nodos; investigación UML.</td></tr>
    <tr><td>26-oct-2026</td><td>Auditoría de brechas de RF, RNF y casos de uso.</td></tr>
    <tr><td>05-nov-2026</td><td>Despliegue en producción con HTTPS; API en el build de producción; accesibilidad de la landing de 80 a 100.</td></tr>
    <tr><td>06-nov-2026</td><td>Ronda de QA con 5 usuarios y correcciones.</td></tr>
    <tr><td>09-nov-2026</td><td>Casco verificado por la cámara ESP32-CAM del vehículo; escaneo real de QR; WebSocket de cámara.</td></tr>
    <tr><td>10-nov-2026</td><td>Pagos con Bold: link de pago, checkout embebido con firma de integridad y página de resultado.</td></tr>
    <tr><td>13–16-nov-2026</td><td>Migración a VM nueva; seeder de datos de demostración; confirmación de reserva por correo con Brevo.</td></tr>
    <tr><td>17-nov-2026</td><td>Integración de la cámara de casco, QR por vehículo y modelo fp32 en la VM; diagramas C4 niveles 3 y 4.</td></tr>
    <tr><td>19–20-nov-2026</td><td>Módulo de mantenimiento con telemetría histórica, panel de cámara del PC, hoja de QR imprimible, tarjetas de reserva; diagramas D-28 y D-29; guía de lanzamiento.</td></tr>
  </table>
  <h3><span class="num">C.2</span>Estado de verificación</h3>
  <table class="t compact">
    <tr><th>Verificación</th><th>Resultado</th><th>Fecha</th></tr>
    <tr><td>Tipado estático (<code>tsc --noEmit</code>)</td><td><span class="pill ok">0 errores</span></td><td>20-nov-2026</td></tr>
    <tr><td>Pruebas unitarias + integración (Vitest, 20 archivos)</td><td><span class="pill ok">156 / 156</span></td><td>20-nov-2026</td></tr>
    <tr><td>Pruebas E2E (Playwright, Chromium escritorio + Pixel 7)</td><td><span class="pill ok">19 aprobadas, 1 omitida</span></td><td>06-nov-2026</td></tr>
    <tr><td>Smoke de API (13 pasos, login a RBAC)</td><td><span class="pill ok">13 / 13</span></td><td>08-oct-2026</td></tr>
    <tr><td>Cobertura del dominio (<code>src/server/domain</code>)</td><td><span class="pill ok">100 % líneas · 90,9 % ramas</span></td><td>último reporte</td></tr>
    <tr><td>Lighthouse producción <code>/</code> (rend./acc./BP/SEO)</td><td><span class="pill ok">92 / 100 / 100 / 100</span></td><td>05-nov-2026</td></tr>
    <tr><td>Lighthouse producción <code>/catalogo</code></td><td><span class="pill ok">100 / 100 / 100 / 100</span></td><td>05-nov-2026</td></tr>
    <tr><td>Revisión de código SQA</td><td><span class="pill info">0 críticos · 0 altos · 2 medios</span></td><td>08-oct-2026</td></tr>
  </table>
  <h3><span class="num">C.3</span>Evidencia del software en ejecución</h3>
  <p>El documento de pantallazos contiene el recorrido completo; aquí se incluyen tres evidencias de las funciones más recientes.</p>
  ${ev1}${ev2}${ev3}
  <h3><span class="num">C.4</span>Decisiones técnicas relevantes</h3>
  <ul>
    <li><b>El servidor decide la seguridad.</b> El veredicto de casco que vale es el de la cámara del vehículo procesado en el servidor (si el fotograma tiene menos de 5 s), no el del navegador; la clave de ingesta nunca llega al cliente.</li>
    <li><b>Prepago obligatorio.</b> No hay desbloqueo sin un pago base aprobado (402), y un cliente tiene como máximo una reserva abierta sin pagar.</li>
    <li><b>Atomicidad.</b> Cerrar una entrega actualiza entrega, reserva y vehículo en una sola transacción; un rechazo de pago no cambia el negocio.</li>
    <li><b>Historial inmutable.</b> Las alertas y los vehículos no se borran: cambian de estado, para conservar la auditoría.</li>
    <li><b>Integraciones degradables.</b> Sin llaves, Bold se reemplaza por la pasarela simulada y Brevo deja los correos en estado <i>simulated</i>; la demo nunca depende de un tercero.</li>
  </ul>
  <h3><span class="num">C.5</span>Pendientes conocidos</h3>
  <table class="t compact">
    <tr><th>Pendiente</th><th>Impacto</th><th>Plan</th></tr>
    <tr><td>Biometría facial real (plantilla cifrada AES-GCM)</td><td>El desbloqueo facial funciona en modo demostración</td><td>Enrolamiento con consentimiento desde la cuenta y plantilla cifrada en servidor</td></tr>
    <tr><td>Broker MQTT real para comandos al vehículo</td><td>Los gemelos digitales están simulados</td><td>Broker gestionado y topics <code>umh/vehicle/{id}/*</code></td></tr>
    <tr><td>Alinear el umbral de casco en la documentación</td><td>El código usa 0,70; D-18 y UC08 indican 0,80</td><td>Fijar un único valor tras la calibración del modelo</td></tr>
    <tr><td>Guardas de ruta en <code>/admin</code> y <code>/entregas</code> en el cliente</td><td>Bajo: la API ya exige el rol</td><td>Redirección en el router</td></tr>
  </table>
</section>`;

  const cap11 = `
<section class="chapter wrap" id="cap-11">
  <div class="eyebrow">Anexo D</div>
  <h2>Matriz de trazabilidad</h2>
  <p class="lead">Relación entre requisitos, casos de uso, diagramas de diseño y pruebas.</p>
  <table class="t compact">
    <tr><th>Req.</th><th>Caso de uso</th><th>Secuencia / estados</th><th>Clases / componentes</th><th>Pruebas</th></tr>
    <tr><td>RF-02, RF-03</td><td>UC03, UC04</td><td>D-28, D-16</td><td>Vehículo, Compra, Pago</td><td>e2e reserva-desbloqueo (compra)</td></tr>
    <tr><td>RF-04, RF-08</td><td>UC06, UC20</td><td>D-28, D-19</td><td>Vehículo, SSE, fleet-sim</td><td>tracking, alerts, geo</td></tr>
    <tr><td>RF-05, RF-06</td><td>UC05</td><td>D-17, D-21</td><td>Reserva, Hub</td><td><b>CP0001_ALQUILER</b>, flujo-cliente, api-reglas</td></tr>
    <tr><td>RF-07</td><td>UC07</td><td>D-28</td><td>Hub</td><td>backend-flows</td></tr>
    <tr><td>RF-09</td><td>UC08</td><td>D-18, D-22</td><td>SesionDesbloqueo, ReglaDeSeguridad</td><td><b>CP0002_DESBLOQUEO</b>, unlock, camera, helmet-*</td></tr>
    <tr><td>RF-10, RF-22</td><td>UC09</td><td>D-18</td><td>Consentimiento, SesionDesbloqueo</td><td>unlock (TC-UNL-10..13, 18)</td></tr>
    <tr><td>RF-11, RF-12</td><td>UC20, UC12</td><td>D-19</td><td>Alerta, ReglaDeSeguridad</td><td>alerts, api-reglas (R2)</td></tr>
    <tr><td>RF-13 a RF-15</td><td>UC10, UC11</td><td>D-29, D-19</td><td>KPIs, simulador</td><td>backend-flows (KPIs)</td></tr>
    <tr><td>RF-20, RF-21</td><td>UC01, UC02</td><td>D-15</td><td>Usuario, Consentimiento, sesiones</td><td>sessions, smoke e2e, qa-usuarios</td></tr>
    <tr><td>RF-23, RF-24</td><td>UC13</td><td>D-29, D-22</td><td>Vehículo, Hub, mantenimiento</td><td>backend-flows (RF-24), mantenimiento</td></tr>
    <tr><td>RF-25</td><td>UC14–UC16</td><td>D-20, D-23</td><td>Entrega</td><td><b>CP0003_ENTREGA</b>, api-reglas, backend-flows</td></tr>
    <tr><td>RF-26</td><td>UC18</td><td>D-16, D-17</td><td>Pago, PasarelaDePagos</td><td>pasarela, bold, api-reglas (timeout)</td></tr>
    <tr><td>RF-27</td><td>UC17, UC19</td><td>D-20, D-23</td><td>Entrega, Notificación</td><td><b>CP0003_ENTREGA</b>, brevo</td></tr>
  </table>
</section>`;

  const anexo = `
<section class="chapter wrap" id="cap-12">
  <div class="eyebrow">Anexo E</div>
  <h2>Índice de figuras y regeneración</h2>
  <table class="t compact">
    <tr><th style="width:16mm">Figura</th><th>Título</th></tr>
    ${figs.map((f) => `<tr><td>${f.n}</td><td><a href="#${f.id}">${f.titulo}</a></td></tr>`).join("")}
  </table>
  <h3>Cómo regenerar los diagramas y este documento</h3>
  <table class="t compact">
    <tr><th>Tarea</th><th>Comando (Git Bash, desde la raíz del repositorio)</th></tr>
    <tr><td>Diagramas PlantUML (requiere Java)</td><td><code>sh entregables/diagramas/generar.sh</code></td></tr>
    <tr><td>Dependencias del generador de PDF</td><td><code>npm --prefix entregables/entrega-final/tools install</code></td></tr>
    <tr><td>Este documento y el de pantallazos</td><td><code>node entregables/entrega-final/tools/build.mjs</code></td></tr>
    <tr><td>Pruebas</td><td><code>npm run typecheck</code> · <code>npm test</code> · <code>npm run test:e2e</code></td></tr>
  </table>
</section>`;

  const cover = portada({
    kicker: "Entrega del proyecto del curso",
    titulo: "Análisis y diseño orientado a objetos",
    subtitulo: "Casos de uso, clases, secuencias, paquetes, componentes y nodos · casos de prueba por integrante · avance técnico del software",
    extra: `<div class="cover-chips">${["UML 2.5", "PlantUML", "C4", "React 19", "Node 24", "SQLite", "YOLOv8n ONNX", "ESP32-CAM", "Bold", "Brevo", "Azure"].map((c) => `<span class="chip">${c}</span>`).join("")}</div>`,
  });

  return documento(
    "Urban Mobility Hub — Análisis y diseño orientado a objetos",
    cover + toc + cap1 + cap2 + cap3 + cap4 + cap5 + cap6 + cap7 + cap9 + anexoA + cap8 + cap10 + cap11 + anexo,
  );
}
