// Contenido del documento "Pantallazos de la página web y del software".
import { segments, portada, documento, tocItem, dims } from "./lib.mjs";

const C = (f) => `docs/capturas/${f}`; // producción, 13-nov-2026
const I = (f) => `entregables/interfaces/img/${f}`; // local, Playwright
const N = (f) => `entregables/entrega-final/capturas-nuevas/${f}`; // local, 20-nov-2026

// [módulo, id, título, archivo, ruta, rol, UC, componente, descripción, fuente]
const P = [
  ["Sitio público", "p-landing", "Landing — página de inicio (escritorio)", I("01-landing-escritorio.png"), "/", "Visitante", "—", "src/components/Landing.tsx", "Propuesta de valor, flota con fotos reales, servicios, entrega a domicilio, tarifas en COP, seguridad IoT, hubs, preguntas frecuentes y cuentas de demostración. Animaciones de aparición al desplazarse; accesibilidad 100 en Lighthouse.", "Local"],
  ["Sitio público", "p-landing-movil", "Landing en móvil", I("02-landing-movil.png"), "/", "Visitante", "—", "src/components/Landing.tsx", "Diseño adaptable a 390 px de ancho, sin desbordamiento horizontal (verificado por la prueba E2E landing.spec.ts).", "Local"],
  ["Sitio público", "p-catalogo", "Catálogo público de venta", C("03-catalogo.png"), "/catalogo", "Visitante / Cliente", "UC03", "src/routes/catalogo.index.tsx", "Vehículos en venta con foto, precio en COP, condición y hub. Página indexable (SEO 100) con ficha por vehículo en /catalogo/$slug.", "Producción"],
  ["Sitio público", "p-hubs", "Listado de hubs", I("06-hubs.png"), "/hubs", "Visitante / Cliente", "UC07", "src/routes/hubs.index.tsx", "Estaciones de recogida con capacidad y ocupación.", "Local"],
  ["Sitio público", "p-hub-detalle", "Detalle de un hub", I("07-hub-detalle.png"), "/hubs/HUB-01", "Cliente", "UC07", "src/routes/hubs.$hubId.tsx", "Capacidad, vehículos ocupados, en carga y disponibles en el hub.", "Local"],
  ["Sitio público", "p-faq", "Preguntas frecuentes", I("11-faq.png"), "/faq", "Visitante", "—", "src/routes/faq.tsx", "Preguntas sobre alquiler, pagos, seguridad y datos personales, con datos estructurados para buscadores (AEO).", "Local"],
  ["Sitio público", "p-guias", "Guías de uso", I("12-guias.png"), "/guias", "Visitante", "—", "src/routes/guias.index.tsx", "Artículos de ayuda para cada flujo del cliente.", "Local"],
  ["Autenticación", "p-registro", "Registro con consentimiento explícito", I("08-registro.png"), "/registro", "Visitante", "UC01", "src/components/auth/AuthForm.tsx", "Formulario de cuenta con aceptación obligatoria del tratamiento de datos (Ley 1581) y consentimiento biométrico opcional. Sin consentimiento el servidor responde 422.", "Local"],
  ["Autenticación", "p-login", "Inicio de sesión", C("02-login.png"), "/login", "Todos", "UC02", "src/components/auth/AuthForm.tsx", "Correo y contraseña; la sesión se firma con HMAC-SHA256 en una cookie httpOnly y Secure. Los errores no revelan cuál dato falló.", "Producción"],
  ["Cliente", "p-app-alquilar", "App — mapa en modo alquiler", I("03-app-alquilar.png"), "/app", "Cliente", "UC06, UC05", "src/components/mobility/MobilityApp.tsx, FleetMap.tsx", "Mapa Leaflet + OpenStreetMap con vehículos disponibles y hubs; las posiciones llegan en vivo por SSE. Colores por nivel de batería.", "Local"],
  ["Cliente", "p-app-comprar", "App — modo compra", I("04-app-comprar.png"), "/app", "Cliente", "UC04", "src/components/mobility/MobilityApp.tsx", "Stock en venta por hub con precio y condición; la compra incluye el pago (UC18).", "Local"],
  ["Cliente", "p-mapa-flota", "Mapa de flota y hubs", C("04-mapa-flota.png"), "/app", "Cliente", "UC06", "src/components/mobility/FleetMap.tsx", "Vista del cliente en producción: capas de vehículos y hubs, leyenda de batería y acceso a reservar.", "Producción"],
  ["Cliente", "p-reservas-app", "Mis reservas en el mapa y botón Desbloquear", N("n12-app-viaje-activo.png"), "/app", "Cliente", "UC05, UC08", "src/components/mobility/MyOpenReservations.tsx, ReservationCard.tsx", "Tarjetas de reserva con estado del prepago («Prepago pagado ($10.000). Ya puedes desbloquearlo»), ubicación del vehículo, Desbloquear, Cómo llegar y Cancelar.", "Local · 20-nov"],
  ["Cliente", "p-mis-reservas", "Historial de reservas y compras", C("05-mis-reservas.png"), "/mis-reservas", "Cliente", "UC05, UC18", "src/routes/mis-reservas.tsx", "Reservas, compras y pagos del cliente con su referencia y estado.", "Producción"],
  ["Cliente", "p-pago", "Resultado del pago con Bold", C("09-pago-bold-resultado.png"), "/pago/resultado", "Cliente", "UC18", "src/routes/pago.resultado.tsx", "Retorno del checkout embebido de Bold (sandbox). El estado definitivo lo confirma el webhook firmado con HMAC.", "Producción"],
  ["Cliente", "p-movil-app", "App del cliente en el celular", N("n15-movil-app.png"), "/app", "Cliente", "UC05, UC08", "src/components/mobility/MobileNav.tsx", "Versión móvil: modos Alquilar / Comprar, reserva activa con Desbloquear y mapa a pantalla completa.", "Local · 20-nov"],
  ["Operador", "p-admin-monitoreo", "Panel del operador — Monitoreo", N("n01-admin-monitoreo.png"), "/admin", "Operador", "UC10, UC11", "src/components/mobility/TelemetryDashboard.tsx", "KPIs de flota (vehículos conectados, hubs activos, batería media, alertas activas, en mantenimiento), simulador de eventos IoT (sin casco, caída, pérdida de GPS, batería crítica) y mapa de flota en vivo.", "Local · 20-nov"],
  ["Operador", "p-admin-completo", "Panel del operador — vista completa en producción", C("06-admin-panel.png"), "/admin", "Operador", "UC10, UC12, UC14, UC19", "src/components/mobility/TelemetryDashboard.tsx", "Tabla de gemelos digitales, bitácora de alertas, entregas y bitácora de correos Brevo.", "Producción"],
  ["Operador", "p-admin-mant", "Mantenimiento de vehículos", N("n02-admin-mantenimiento.png"), "/admin → Mantenimiento", "Operador", "UC13 (ext.)", "src/components/mobility/MaintenancePanel.tsx", "Abrir una orden con motivo y notas, órdenes abiertas e historial. Un vehículo en mantenimiento desaparece de la app del cliente y no se puede desbloquear.", "Local · 20-nov"],
  ["Operador", "p-admin-catalogo", "Gestión de catálogo y hubs", N("n03-admin-catalogo.png"), "/admin → Catálogo", "Operador", "UC13", "src/components/mobility/AdminCatalog.tsx", "Alta y edición de vehículos (tipo, modo, precio, batería, hub, condición) y de hubs (zona, capacidad, coordenadas). Un hub con vehículos no se puede dar de baja (RF-24).", "Local · 20-nov"],
  ["Operador", "p-admin-entregas", "Asignación de entregas y bitácora de correos", N("n04-admin-entregas.png"), "/admin → Entregas", "Operador", "UC14, UC19", "src/components/mobility/DeliveriesPanel.tsx", "Reservas a domicilio esperando asignación (con el domiciliario y el plazo), entregas en curso con su estado tardío y bitácora de correos Brevo (sent / simulated / failed).", "Local · 20-nov"],
  ["Operador", "p-admin-camara", "Cámara del PC como ESP32-CAM", N("n05-admin-camara-pc.png"), "/admin → Cámara PC", "Operador", "UC08", "src/components/mobility/PcCameraPanel.tsx", "Demostración del casco: la webcam del PC envía fotogramas al servidor, que los reenvía al servicio de visión YOLOv8n y publica el veredicto «Con casco / Sin casco» con su confianza.", "Local · 20-nov"],
  ["Operador", "p-admin-qr", "Hoja de QR imprimible por vehículo", N("n10-admin-qr.png"), "/admin/qr", "Operador", "UC08", "src/routes/admin_.qr.tsx", "QR <code>UMH:&lt;id&gt;</code> de cada vehículo con código manual, modelo, hub y estado, filtrable por hub y tipo, listo para imprimir y pegar en el manubrio.", "Local · 20-nov"],
  ["Domiciliario", "p-entregas-bandeja", "Bandeja de entregas del domiciliario", I("13-entregas-bandeja.png"), "/entregas", "Domiciliario", "UC15, UC16, UC17", "src/components/mobility/CourierApp.tsx", "Entrega asignada con dirección, cliente y cuenta atrás hasta el plazo; acciones Iniciar, Confirmar entrega y Marcar tardía (con causa obligatoria).", "Local"],
  ["Domiciliario", "p-entregas-prod", "Entregas del domiciliario en producción", C("07-entregas-domiciliario.png"), "/entregas", "Domiciliario", "UC15", "src/routes/entregas.tsx", "Vista en producción de la bandeja del domiciliario.", "Producción"],
  ["Correos", "p-correo", "Correo de entrega tardía (plantilla Brevo)", C("08-correo-entrega-tardia.png"), "correo", "Cliente / Operador", "UC19", "src/server/services/brevo.ts", "Plantilla HTML del aviso de retraso enviada por Brevo; se envía una sola vez por entrega y destinatario.", "Render de plantilla"],
];

export async function buildPantallazos() {
  let n = 0;
  const rows = [];
  const bodies = [];
  const modules = [...new Set(P.map((p) => p[0]))];
  for (const [mod, id, titulo, file, ruta, rol, uc, comp, desc, fuente] of P) {
    const segs = await segments(file);
    const { width } = await dims(file);
    const movil = width < 800;
    const ns = segs.map(() => ++n);
    rows.push({ mod, id, titulo, ruta, rol, uc, ns });
    segs.forEach((src, i) => {
      const part = segs.length > 1 ? ` (parte ${i + 1} de ${segs.length})` : "";
      bodies.push(`
<section class="fig-page wrap" ${i === 0 ? `id="${id}"` : ""}>
  <div class="fig-head"><h3>Figura ${ns[i]}. ${titulo}${part}</h3><span class="tag">${mod} · <a href="#indice">↑ Índice</a></span></div>
  ${
    i === 0
      ? `<table class="kv"><tr><th>Ruta</th><td><code>${ruta}</code></td><th style="width:22mm">Rol</th><td>${rol}</td></tr>
  <tr><th>Caso de uso</th><td>${uc}</td><th>Origen</th><td>${fuente}</td></tr>
  <tr><th>Implementación</th><td colspan="3"><code>${comp}</code></td></tr></table>
  <p class="fig-desc">${desc}</p>`
      : ""
  }
  <figure class="shot"><div class="frame" style="padding:2mm"><img src="${src}" style="max-height:${i === 0 ? 182 : 228}mm;${movil ? "max-width:80mm" : ""}" alt="${titulo}"></div>
  <figcaption><b>Figura ${ns[i]}.</b> ${titulo}${part}.</figcaption></figure>
</section>`);
    });
  }

  const toc = `
<section class="toc wrap" id="indice">
  <h2>Tabla de contenido</h2>
  <p class="small">Cada entrada es un enlace a la pantalla correspondiente; cada pantalla tiene un enlace «↑ Índice» en su encabezado.</p>
  <ol>
    ${tocItem("intro", "Introducción y cuentas de demostración")}
    ${modules
      .map(
        (m) =>
          `<li class="toc-l1"><a><span class="t">${m}</span></a></li>` +
          rows
            .filter((r) => r.mod === m)
            .map((r) => tocItem(r.id, `Figura ${r.ns[0]}${r.ns.length > 1 ? `–${r.ns.at(-1)}` : ""} · ${r.titulo}`, 2))
            .join(""),
      )
      .join("")}
    ${tocItem("resumen", "Anexo. Tabla resumen de pantallas")}
  </ol>
</section>`;

  const intro = `
<section class="chapter wrap" id="intro">
  <div class="eyebrow">Introducción</div>
  <h2>Recorrido visual del software</h2>
  <p class="lead">Este documento presenta los principales pantallazos de la página web pública y de la aplicación de <b>Urban Mobility Hub · NODO Mobility</b>, organizados por módulo y por rol de usuario. Cada pantalla indica su ruta, el rol que la usa, el caso de uso que implementa y el componente del código fuente que la construye.</p>
  <h3>Origen de las capturas</h3>
  <table class="t compact">
    <tr><th>Origen</th><th>Descripción</th></tr>
    <tr><td><b>Producción</b></td><td>https://urbanmobility.duckdns.org (VM Azure, HTTPS), capturadas el 13-nov-2026.</td></tr>
    <tr><td><b>Local</b></td><td>Aplicación con backend SQLite en http://localhost:8080, capturadas con Playwright (<code>entregables/_tools/capturar.mjs</code>).</td></tr>
    <tr><td><b>Local · 20-nov</b></td><td>Funciones nuevas capturadas el 20-nov-2026 con datos de demostración (<code>entregables/entrega-final/tools/capturar-nuevas.mjs</code>).</td></tr>
  </table>
  <h3>Cuentas de demostración</h3>
  <table class="t compact">
    <tr><th>Rol</th><th>Usuario</th><th>Contraseña</th><th>Qué ver</th></tr>
    <tr><td>Cliente</td><td><code>cliente@demo.co</code></td><td><code>Demo1234!</code></td><td>Mapa, reserva, pago, desbloqueo, historial</td></tr>
    <tr><td>Cliente con viajes</td><td><code>viajero@demo.co</code></td><td><code>Demo1234!</code></td><td>Tres alquileres en curso</td></tr>
    <tr><td>Operador</td><td><code>operador@demo.co</code></td><td><code>Demo1234!</code></td><td>Panel, mantenimiento, catálogo, entregas, cámara, QR</td></tr>
    <tr><td>Domiciliario</td><td><code>domi1@demo.co</code></td><td><code>Demo1234!</code></td><td>Bandeja de entregas</td></tr>
  </table>
  <div class="grid3" style="margin-top:4mm">
    <div class="kpi"><div class="v">${P.length}</div><div class="l">pantallas documentadas</div></div>
    <div class="kpi"><div class="v">${n}</div><div class="l">figuras</div></div>
    <div class="kpi"><div class="v">3</div><div class="l">roles: cliente, operador, domiciliario</div></div>
  </div>
</section>`;

  const resumen = `
<section class="chapter wrap" id="resumen">
  <div class="eyebrow">Anexo</div>
  <h2>Tabla resumen de pantallas</h2>
  <table class="t compact">
    <tr><th>Fig.</th><th>Pantalla</th><th>Ruta</th><th>Rol</th><th>UC</th></tr>
    ${rows.map((r) => `<tr><td><a href="#${r.id}">${r.ns[0]}</a></td><td>${r.titulo}</td><td><code>${r.ruta}</code></td><td>${r.rol}</td><td>${r.uc}</td></tr>`).join("")}
  </table>
</section>`;

  const cover = portada({
    kicker: "Entrega del proyecto del curso",
    titulo: "Pantallazos de la página web y del software",
    subtitulo: "Recorrido por módulo y por rol: sitio público, cliente, operador, domiciliario y correos transaccionales",
  });
  return documento("Urban Mobility Hub — Pantallazos", cover + toc + intro + bodies.join("") + resumen);
}
