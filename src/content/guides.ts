// Guías editoriales (contenido citable para GEO/AEO). Cada guía: resumen directo + secciones con H2.

export type Guide = {
  slug: string;
  title: string;
  summary: string;
  published: string; // ISO
  readingMinutes: number;
  sections: { heading: string; paragraphs: string[]; list?: string[] }[];
};

export const GUIDES: Guide[] = [
  {
    slug: "como-alquilar-patineta-electrica",
    title: "Cómo alquilar una patineta eléctrica en 3 pasos",
    summary:
      "Para alquilar una patineta eléctrica en NODO Mobility inicias sesión, eliges un vehículo en el mapa y lo desbloqueas escaneando su QR y verificando el casco. Todo el proceso toma menos de un minuto.",
    published: "2026-09-20",
    readingMinutes: 3,
    sections: [
      {
        heading: "Antes de empezar",
        paragraphs: [
          "Necesitas una cuenta. El registro pide tu nombre, correo y contraseña, y una autorización expresa para el tratamiento de tus datos (Ley 1581 de 2012).",
          "También necesitas un casco: sin él no se habilita el viaje.",
        ],
      },
      {
        heading: "Los 3 pasos",
        paragraphs: ["El flujo completo es corto y siempre sigue el mismo orden:"],
        list: [
          "Elige: abre el mapa, toca una patineta disponible o un hub y revisa batería y tarifa por minuto.",
          "Verifica: escanea el código QR del manubrio y deja que la cámara confirme que llevas casco.",
          "Viaja: pulsa «Iniciar viaje». La tarifa corre por minuto hasta que finalizas el viaje.",
        ],
      },
      {
        heading: "¿Cuánto cuesta?",
        paragraphs: [
          "Las patinetas Volt S2 cuestan 450 COP por minuto y las Volt Pro 520 COP por minuto. El total se calcula redondeando los minutos hacia arriba.",
        ],
      },
      {
        heading: "Al terminar",
        paragraphs: [
          "Devuelve la patineta en un hub (estación a estación) y finaliza el viaje desde «Mis reservas». La reserva pasa a estado «Completada» y verás el costo total.",
        ],
      },
    ],
  },
  {
    slug: "verificacion-de-casco-con-camara",
    title: "Cómo funciona la verificación de casco con cámara",
    summary:
      "La verificación de casco es el segundo paso del desbloqueo: la cámara del teléfono comprueba que llevas casco puesto antes de habilitar el viaje, y si falla, el vehículo permanece bloqueado.",
    published: "2026-09-24",
    readingMinutes: 3,
    sections: [
      {
        heading: "Por qué existe",
        paragraphs: [
          "El casco reduce la gravedad de las lesiones en caídas. Verificarlo antes de arrancar convierte una recomendación en una condición del servicio.",
        ],
      },
      {
        heading: "Qué ocurre en pantalla",
        paragraphs: ["Tras escanear el QR se abre la cámara y se analiza una imagen:"],
        list: [
          "Si se detecta casco con confianza suficiente (80 % o más), se habilita «Iniciar viaje».",
          "Si no se detecta, el acceso se deniega y puedes reintentar.",
          "Los pasos no se pueden saltar: sin QR no hay verificación y sin verificación no hay viaje.",
        ],
      },
      {
        heading: "Qué pasa durante el viaje",
        paragraphs: [
          "Además, el vehículo reporta si el casco sigue puesto. Si deja de detectarse, se genera una alerta «Sin casco» para el operador, con el vehículo y sus coordenadas.",
        ],
      },
    ],
  },
  {
    slug: "patineta-bicicleta-o-dron",
    title: "Patineta, bicicleta eléctrica o dron: ¿cuál elegir?",
    summary:
      "Elige patineta eléctrica para trayectos cortos y rápidos, bicicleta eléctrica para distancias medias con esfuerzo asistido, y dron de carga para enviar paquetes de hasta 5 kg.",
    published: "2026-09-28",
    readingMinutes: 4,
    sections: [
      {
        heading: "Comparativa rápida",
        paragraphs: ["Estas son las diferencias principales entre los vehículos de la flota:"],
        list: [
          "Patineta eléctrica: autonomía de 32 a 45 km y hasta 30 km/h. Ideal para trayectos de última milla.",
          "Bicicleta eléctrica: pedaleo asistido y hasta 60 km de autonomía. Ideal para recorridos largos y con carga ligera.",
          "Dron de carga: transporta hasta 5 kg y vuela unos 22 minutos. Ideal para logística de última milla entre hubs.",
        ],
      },
      {
        heading: "¿Alquilar o comprar?",
        paragraphs: [
          "Si lo usarás ocasionalmente, alquila por minuto. Si lo usas a diario, la compra se paga sola: el catálogo incluye modelos nuevos y seminuevos que ya operaron en la flota, con ficha técnica y hub de recogida.",
        ],
      },
    ],
  },
  {
    slug: "que-es-un-gemelo-digital-en-micromovilidad",
    title: "¿Qué es un gemelo digital en micromovilidad?",
    summary:
      "Un gemelo digital es la copia virtual de un vehículo o hub que se actualiza con datos reales (GPS, batería, alertas); permite al operador monitorear la flota y probar escenarios sin riesgo.",
    published: "2026-09-30",
    readingMinutes: 3,
    sections: [
      {
        heading: "Definición simple",
        paragraphs: [
          "Imagina una ficha virtual de cada vehículo que siempre muestra dónde está, cuánta batería tiene y si hay una alerta. Esa ficha es su gemelo digital.",
        ],
      },
      {
        heading: "Para qué sirve",
        paragraphs: ["En NODO Mobility los gemelos digitales permiten:"],
        list: [
          "Ver la flota en el mapa con posición actualizada en menos de 5 segundos.",
          "Recibir alertas de seguridad en menos de 1 segundo.",
          "Simular eventos (caída, pérdida de GPS, batería crítica, sin casco) para probar la reacción del sistema.",
        ],
      },
      {
        heading: "Una sola fuente de verdad",
        paragraphs: [
          "El mapa del usuario y el panel del operador leen del mismo gemelo. Por eso, si una alerta se dispara en el panel, también se refleja en el mapa.",
        ],
      },
    ],
  },
];
