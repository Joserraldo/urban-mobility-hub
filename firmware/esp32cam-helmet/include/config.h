#pragma once
#include "secrets.h"

#define STR_(x) #x
#define STR(x) STR_(x)

// ---- Cámara ----------------------------------------------------------------
// VGA 640x480: suficiente para ver cabeza+casco a 1-2 m y el modelo trabaja a 640 px.
// Subir a FRAMESIZE_SVGA solo si el modelo falla por distancia; cuesta ~1,6x en bytes.
#define CAM_FRAME_SIZE FRAMESIZE_VGA
// 0-63, menor = más calidad y más bytes. 12 ≈ 25-35 KB en VGA: buen punto entre detalle y ancho de banda.
#define CAM_JPEG_QUALITY 12

// ---- Ritmo de envío --------------------------------------------------------
// El servidor manda `n` (ms hasta el próximo fotograma). Estos son los límites de seguridad.
#define MIN_INTERVAL_MS 80
#define MAX_INTERVAL_MS 5000
#define DEFAULT_INTERVAL_MS 1000

// ---- Red -------------------------------------------------------------------
#define HTTP_TIMEOUT_MS 4000
#define WIFI_CONNECT_TIMEOUT_MS 20000
// Sin ningún ack en este tiempo → se reinicia el Wi-Fi; el doble → se reinicia el chip.
#define STALL_RECONNECT_MS 30000
#define STALL_REBOOT_MS 120000

// ---- LED rojo de la placa (GPIO33, activo en bajo): encendido = casco confirmado
#define PIN_STATUS_LED 33
// ---- Flash blanco (GPIO4): se mantiene apagado
#define PIN_FLASH 4

// ---- Configuración por Bluetooth (BLE) ---------------------------------------
// La placa se anuncia como "NODO-CAM-XXXX" cuando no tiene Wi-Fi guardado o no logra conectarse.
// UUIDs que usa la página public/provision.html (si los cambias, cámbialos también allí).
#define BLE_SERVICE_UUID "6e0d0001-b5a3-f393-e0a9-e50e24dcca9e"
#define BLE_CONFIG_UUID "6e0d0002-b5a3-f393-e0a9-e50e24dcca9e"  // escritura: ssid, pass, host, port, key, dev, tls
#define BLE_STATUS_UUID "6e0d0003-b5a3-f393-e0a9-e50e24dcca9e"  // lectura/notificación: estado de la conexión
// Si nadie configura nada en este tiempo, la placa reinicia y reintenta con lo último guardado.
#define PROVISION_TIMEOUT_MS 300000
