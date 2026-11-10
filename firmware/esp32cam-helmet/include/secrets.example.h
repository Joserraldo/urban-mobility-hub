// Copia este archivo a secrets.h. secrets.h está en .gitignore (no se sube al repositorio).
// Todo esto son VALORES POR DEFECTO: lo que se configure por Bluetooth desde el celular (se guarda en la
// memoria de la placa) tiene prioridad. Con WIFI_SSID vacío la placa arranca directo en modo Bluetooth.
#pragma once

#define WIFI_SSID ""
#define WIFI_PASS ""

// IP (o dominio) del equipo donde corre el backend. En desarrollo: la IP LAN de tu PC (ipconfig).
// npm run dev escucha en 8080 en toda la red; permite el puerto 8080 en el Firewall de Windows (red privada).
#define SERVER_HOST "192.168.1.50"
#define SERVER_PORT 8080
// 1 = HTTPS (producción). En HTTP plano la clave viaja sin cifrar: úsalo solo en la red del laboratorio.
#define USE_TLS 0

// Mismo valor que la variable INGEST_KEY del backend (por defecto en desarrollo: dev-ingest-key).
#define INGEST_KEY "dev-ingest-key"

// Id del vehículo (tabla vehicles) al que está montada esta cámara.
#define DEVICE_ID "SC-1042"
