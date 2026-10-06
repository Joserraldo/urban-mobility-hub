// Preguntas frecuentes en formato pregunta → respuesta directa (AEO). Se reutilizan en la página /faq
// y en el JSON-LD FAQPage. Las respuestas empiezan con la afirmación y luego dan el detalle.

export type FaqItem = { q: string; a: string };

export const FAQ: FaqItem[] = [
  {
    q: "¿Qué es NODO Mobility?",
    a: "NODO Mobility es una plataforma web que une tres servicios en uno: alquiler por minuto de patinetas eléctricas, bicicletas eléctricas y drones de carga; venta de vehículos urbanos nuevos y seminuevos; y una red de hubs (puntos físicos) donde se recogen, devuelven y cargan los vehículos. Opera en Bucaramanga, Santander (Colombia).",
  },
  {
    q: "¿Cuánto cuesta alquilar una patineta eléctrica?",
    a: "Una patineta eléctrica se alquila desde 450 COP por minuto; los modelos Pro cuestan 520 COP por minuto. Una bicicleta eléctrica cuesta 380 COP por minuto y un dron de carga 1.200 COP por minuto. El valor final es el número de minutos redondeado hacia arriba por la tarifa del vehículo.",
  },
  {
    q: "¿Cómo desbloqueo un vehículo?",
    a: "El desbloqueo se hace en tres pasos: (1) escaneas el código QR del vehículo, (2) la cámara verifica que llevas casco y (3) se habilita el botón «Iniciar viaje». Si prefieres, puedes usar el reconocimiento facial como alternativa al QR después de registrar tu rostro en tu cuenta.",
  },
  {
    q: "¿Qué pasa si no llevo casco?",
    a: "No podrás iniciar el viaje. El botón «Iniciar viaje» solo se activa cuando la verificación del casco es exitosa. Si durante el viaje el sistema detecta que dejaste de usarlo, se genera una alerta «Sin casco» que ve el operador.",
  },
  {
    q: "¿Puedo pedir que me entreguen el vehículo en mi casa?",
    a: "Sí, para los vehículos marcados como aptos para entrega. En la aplicación eliges la modalidad «A domicilio», escribes tu dirección y confirmas la reserva. También puedes recogerlo y devolverlo en un hub (modalidad estación a estación).",
  },
  {
    q: "¿Cómo compro un vehículo?",
    a: "Entra al catálogo, elige el vehículo y pulsa «Comprar». Debes iniciar sesión; la compra queda registrada en tu cuenta y el vehículo se recoge en el hub donde está disponible. Cada ficha indica precio en pesos colombianos, condición (nuevo o seminuevo) y especificaciones.",
  },
  {
    q: "¿Qué alertas de seguridad monitorea la plataforma?",
    a: "La plataforma monitorea cuatro alertas: sin casco, caída o impacto, pérdida de señal GPS y batería crítica. Cada alerta muestra el tipo, el vehículo y sus coordenadas, y queda guardada en un registro auditable con fecha y hora.",
  },
  {
    q: "¿Qué hace la plataforma con mis datos biométricos?",
    a: "Tu plantilla facial se guarda cifrada, nunca en texto plano, y solo si aceptas expresamente el tratamiento de datos al registrarte, conforme a la Ley 1581 de 2012 de Colombia. El reconocimiento facial es opcional: siempre puedes desbloquear con QR.",
  },
  {
    q: "¿Qué es un gemelo digital?",
    a: "Un gemelo digital es una réplica virtual de un vehículo o hub que muestra en vivo los mismos datos que el objeto real: posición GPS, batería, ocupación y alertas. En NODO Mobility el panel del operador y el mapa leen del mismo gemelo, por lo que siempre muestran lo mismo.",
  },
  {
    q: "¿Con qué frecuencia se actualiza la posición en el mapa?",
    a: "La posición de cada vehículo se actualiza en el mapa en menos de 5 segundos desde que se genera, y una alerta aparece en el panel del operador en menos de 1 segundo.",
  },
  {
    q: "¿Es un servicio comercial real?",
    a: "No todavía: NODO Mobility es un proyecto académico de Ingeniería de Software II de la Universidad Autónoma de Bucaramanga. Opera en fase de simulación con gemelos digitales (sin vehículos físicos) y no está certificado para operar con vehículos reales hasta completar las validaciones de seguridad.",
  },
];
