export type LegalSection = { h: string; p: string[] };

export const REPO_ISSUES = "https://github.com/Joserraldo/urban-mobility-hub/issues";

export const TERMINOS: LegalSection[] = [
  {
    h: "1. Qué es NODO Mobility",
    p: [
      "NODO Mobility es un proyecto académico de Ingeniería de Software II de la Universidad Autónoma de Bucaramanga (UNAB). Opera en fase de simulación: no existen vehículos físicos ni se mueve dinero real.",
      "Los precios, reservas, pagos y entregas que ves son un gemelo digital para demostrar el funcionamiento del sistema.",
    ],
  },
  {
    h: "2. Pagos y prepago",
    p: [
      "El alquiler exige un prepago de $ 10.000 COP al reservar y un cobro final por minuto de uso. En esta fase todos los pagos son simulados y no generan cargo en ninguna tarjeta ni cuenta.",
      "Si un servicio comercial real llegara a operar, el prepago se descontaría del cobro final y se informaría antes de confirmar cada reserva.",
    ],
  },
  {
    h: "3. Cancelaciones",
    p: [
      "Puedes cancelar una reserva desde «Mis reservas» mientras no hayas iniciado el viaje. La reserva solicitada vence si no se desbloquea el vehículo a tiempo.",
      "Como los pagos son simulados, no hay reembolsos monetarios en esta fase.",
    ],
  },
  {
    h: "4. Uso del vehículo",
    p: [
      "Debes usar casco durante todo el viaje y respetar las normas de tránsito. El sistema verifica el casco antes de iniciar el viaje.",
    ],
  },
  {
    h: "5. Cuentas",
    p: [
      "Eres responsable de la confidencialidad de tu contraseña. Las cuentas de prueba publicadas en la pantalla de ingreso son solo para demostración.",
    ],
  },
];

export const PRIVACIDAD: LegalSection[] = [
  {
    h: "1. Responsable del tratamiento",
    p: [
      "El equipo de estudiantes de NODO Mobility (UNAB, Bucaramanga) es el responsable de los datos. Puedes escribirnos desde la página de contacto.",
    ],
  },
  {
    h: "2. Datos que tratamos y para qué",
    p: [
      "Nombre, correo y contraseña (almacenada con hash) para crear tu cuenta; historial de reservas, pagos simulados y viajes para prestar el servicio; telemetría del vehículo (posición, batería) durante el viaje.",
      "Tratamos tus datos conforme a la Ley 1581 de 2012 de Colombia. No los vendemos ni los compartimos con terceros distintos al servicio de correo que envía avisos de entrega.",
    ],
  },
  {
    h: "3. Dato biométrico (rostro), opcional",
    p: [
      "Solo si lo autorizas de forma expresa en un recuadro separado, usamos una representación reducida de tu rostro para desbloquear vehículos sin escanear el QR. Es un dato sensible y puedes no autorizarlo: siempre puedes usar el QR.",
      "En esta versión de demostración la comparación se hace en tu propio dispositivo y la plantilla no se envía al servidor. Aún no está cifrada con una clave del servidor ni se puede usar desde otro dispositivo.",
    ],
  },
  {
    h: "4. Tus derechos",
    p: [
      "Puedes conocer, actualizar, rectificar y suprimir tus datos, y revocar tu autorización en cualquier momento, escribiéndonos por la página de contacto. Responderemos en un máximo de 15 días hábiles.",
    ],
  },
  {
    h: "5. Conservación y cookies",
    p: [
      "Conservamos tus datos mientras tu cuenta esté activa. Usamos una única cookie de sesión necesaria para mantenerte conectado; no usamos cookies de publicidad ni de seguimiento.",
    ],
  },
];
