#pragma once
#include "settings.h"

// Intenta conectar a Wi-Fi con `s` (bloqueante, con tiempo máximo). Aplica los ajustes de baja latencia.
// lowLatency=false mantiene el ahorro de energía del modem: OBLIGATORIO mientras el Bluetooth está activo.
bool wifiConnect(const Settings& s, uint32_t timeoutMs, bool lowLatency = true);

// Modo configuración por Bluetooth: anuncia "NODO-CAM-XXXX", recibe credenciales del celular, las prueba, las
// guarda y reinicia. No vuelve nunca (reinicia al configurar o al agotar PROVISION_TIMEOUT_MS).
[[noreturn]] void runProvisioning(Settings current);
