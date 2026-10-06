# Urban Mobility Hub

[![CI](https://github.com/Joserraldo/urban-mobility-hub/actions/workflows/ci.yml/badge.svg)](https://github.com/Joserraldo/urban-mobility-hub/actions/workflows/ci.yml)

Plataforma multimodal de micromovilidad, logística y venta de vehículos urbanos. El proyecto integra en una sola solución la **venta** y el **alquiler** de patinetas eléctricas, bicicletas y drones urbanos, con seguimiento de flota en tiempo real sobre un mapa interactivo y un sistema de seguridad IoT basado en gemelos digitales (*digital twins*).

> Proyecto académico — Ingeniería de Software II, Universidad Autónoma de Bucaramanga (UNAB).

## Estado actual

Este repositorio corresponde al **primer avance** del proyecto: el portal de negocio y la aplicación web (PWA) donde la flota se **simula mediante gemelos digitales** (a futuro, hardware IoT real con placas Raspberry Pi). No opera con vehículos físicos todavía.

## Funcionalidades

### Landing page (`/`)
Portal de negocio responsivo: en desktop muestra la landing comercial completa (servicios, "Quiénes somos", CTA hacia la demo); en móvil entra directo a la app de mapa, con la info comercial en el menú lateral.

### App de usuario (`/app`)
- Control dual **Alquilar vs. Comprar** sobre el mapa.
- **Mapa interactivo multicapa** con la flota simulada: patinetas disponibles, hubs/puntos de recolección y stock de venta.
- Alquiler en estación o a domicilio; catálogo e-commerce en modo compra.
- Panel de detalle por hub: capacidad, vehículos disponibles para alquiler y venta.
- **Flujo de desbloqueo** (simulado): escáner QR → verificación de casco por cámara → inicio de viaje.

### Panel de telemetría / digital twin (`/admin`)
- Métricas de flota: vehículos activos, batería promedio, hubs operativos.
- Tabla de flota en vivo (ID, tipo, modo, batería, GPS/hub, alertas IoT).
- **Simulador de triggers**: sin casco, accidente/caída, pérdida de GPS, con alertas inmediatas.

La flota, los hubs y los vehículos se modelan con **datos simulados en memoria** compartidos entre el mapa y el dashboard, para que ambas vistas lean de la misma fuente.

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, SSR, file-based routing) |
| Build | Vite + Nitro (target Cloudflare) |
| UI | Tailwind CSS 4 + [shadcn/ui](https://ui.shadcn.com) |
| Estado/servidor | TanStack Router + TanStack Query |
| Gráficas | Recharts |
| Animaciones | Framer Motion |
| Lenguaje | TypeScript |

## Cómo correr

Requiere [Bun](https://bun.sh) (recomendado, el repo usa `bun.lock`) o Node.js + npm.

```sh
git clone https://github.com/Joserraldo/urban-mobility-hub.git
cd urban-mobility-hub
bun install

bun run dev       # servidor de desarrollo en http://localhost:8080
bun run build     # build de producción (.output/)
bun run preview   # previsualizar el build
bun run lint      # ESLint
```

## Estructura del proyecto

```
src/
├── routes/          # Rutas (TanStack Start, file-based): /, /app, /admin
├── components/
│   ├── mobility/    # App de mapa, flujo de desbloqueo, dashboard de telemetría
│   ├── Landing.tsx  # Portal de negocio
│   └── ui/          # Primitivas shadcn/ui
├── lib/             # Datos simulados de flota/hubs y utilidades
├── server.ts        # Entradas de servidor (wrapper SSR)
└── start.ts         # createStart + middlewares (CSRF en server functions)
```

## Documentación

La especificación de requisitos (SRS) y el análisis de riesgos del proyecto se mantienen en la carpeta `Documents/` del curso (no versionada en este repo por estar en revisión activa con el docente).
