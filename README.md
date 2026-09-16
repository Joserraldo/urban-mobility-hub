# Urban Mobility Hub

Crea una Progressive Web App (PWA) completa en React utilizando Vite, Tailwind CSS, shadcn/ui, Lucide Icons y Framer Motion. El proyecto es un MVP para una plataforma multimodal de micromovilidad, logística, alquiler y venta de vehículos urbanos.

[1. DISEÑO Y UI/UX (Design System)]

Tema: Obligatoriamente Dark Mode. Diseño minimalista, premium y muy limpio (estilo Uber Black pero tecnológico).

Colores: Fondo negro profundo (bg-zinc-950), acentos en Azul Oscuro Vibrante / Azul Eléctrico (blue-600 a blue-400), y textos en blanco nítido.

Tipografía: Sans-serif moderna (Inter o similar).

Comportamiento Responsivo (CRÍTICO):

En Desktop (>768px): Muestra una Landing Page comercial completa con Navbar superior y botón "Ir a la Web App / Probar Demo".

En Mobile (<768px): Entra directamente a la "App" (Mapa interactivo). La info comercial ("Quiénes somos", "Servicios") se ubica en el menú hamburguesa lateral.

[2. VISTAS PRINCIPALES Y COMPONENTES]

A. Landing Page (Vista PC)

Hero Section: Título impactante sobre micromovilidad, alquiler por uso y venta de vehículos urbanos. Botón CTA principal.

Sección Servicios: Tarjetas para:

Alquiler Multimodal: Patinetas, Drones y Bicis (por minutos o a domicilio).

Venta Directa: Compra de vehículos nuevos y seminuevos de la flota.

Puntos de Servicio / Hubs: Red de estaciones físicas para recolección, devolución y recarga.

Sección Quiénes Somos: Explicación del backend IoT con Gemelos Digitales. Badge técnico: "Próximamente: App Nativa iOS/Android en Kotlin Multiplatform".

B. App / Interfaz de Usuario (Vista Mobile / Demo)

Control Superior Dual (Alquilar vs. Comprar):

Un Segmented Control / Toggle prominente en la parte superior del mapa que permite alternar la experiencia entre "Alquilar" y "Comprar".

Mapa Interactivo Multicapa:

En modo "Alquilar": Muestra dos sub-opciones ("En Punto / Estación" vs. "A Domicilio"). Muestra iconos de patinetas sueltas y de Puntos de Recolección (Hubs).

En modo "Comprar": El mapa destaca los Puntos de Recolección con stock de venta e incluye una pestaña inferior desplegable con un catálogo e-commerce (tarjetas de productos: precio, spec técnica y botón "Comprar / Reservar").

Puntos de Recolección (Hubs): Al hacer clic en un icono de Hub/Estación en el mapa, abre un panel que muestra: Nombre del punto (ej. "Hub Central"), Capacidad actual, Patinetas disponibles para alquiler y Vehículos disponibles para compra.

Bottom Sheet (Panel Inferior para Alquiler): Al seleccionar un vehículo individual, muestra Batería %, Tarifa por minuto y botón "Desbloquear".

C. Flujo de Desbloqueo y Seguridad (Simulación)

Al presionar "Desbloquear" en una patineta de alquiler:

Paso 1 - Scanner QR: Simulación de visor de cámara escaneando código QR en el vehículo. Incluir botón inactivo: "Desbloquear vía NFC / Wallet (Próximamente)".

Paso 2 - Helmet Check (IA): Cámara frontal simulada analizando rostro y presencia de casco. Mensaje: "Verificando uso de casco por seguridad...". Tras 3 segundos: Check verde de validación y botón "Iniciar Viaje".

D. Dashboard de Telemetría (Digital Twin / Vista Profesores)

Ruta accesible desde un icono de engranaje en /admin o /digital-twin.

Panel de Control IoT:

Métricas generales: Vehículos Activos, Batería Promedio, Puntos de Recolección Activos.

Tabla de Flota en vivo: ID, Tipo (Scooter/Dron), Modo (Alquiler/Venta), Estado de Batería, Ubicación GPS / Hub asignado, y Alertas IoT.

Simulador de Triggers: Botones interactivos para simular: "Usuario sin casco", "Accidente / Caída detectada", "Pérdida de señal GPS". Muestra un Toast alert rojo inmediato en pantalla.

[3. NOTAS TÉCNICAS]

Usa React Router para rutas (/, /admin).

Mockea un array de datos unificado que contenga tanto los Puntos de Recolección (Hubs) como los Vehículos (marcando si son para alquiler o venta), para que el Mapa y el Dashboard de profesores lean de la misma fuente.

Utiliza framer-motion para animaciones fluidas al cambiar entre la vista de mapa, compras y modales de seguridad.

## Development

Stack: TanStack Start (React 19) + Vite + Tailwind CSS 4 + shadcn/ui.

Se recomienda [Bun](https://bun.sh) como gestor de paquetes (el repo incluye `bun.lock`); `npm install` también funciona.

```sh
git clone <this-repository-url>
cd urban-mobility-hub
bun install   # o: npm install
bun run dev   # o: npm run dev
```
