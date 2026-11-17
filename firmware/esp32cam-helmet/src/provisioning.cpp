/*
 * Configuración de Wi-Fi por Bluetooth (BLE GATT). El celular (public/provision.html, Web Bluetooth, o la
 * app nRF Connect) escribe en la característica CONFIG líneas "clave=valor" con el valor codificado en
 * porcentaje (%XX) y termina con una línea vacía:
 *
 *   ssid=Mi%20Red\npass=clave\nhost=192.168.1.50\nport=8080\nkey=dev-ingest-key\ndev=SC-1042\ntls=0\n\n
 *
 * Solo `ssid` es obligatorio; lo omitido conserva el valor actual. La placa prueba la conexión y avisa por la
 * característica STATUS: "ready" · "connecting" · "ok:<ip>" · "ok-noserver:<ip>" · "fail:wifi" · "fail:data".
 * Se acepta en cualquier fragmento de escritura (MTU pequeño o grande): se acumula hasta la línea vacía.
 */
#include "provisioning.h"

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <BLEUtils.h>
#include <WiFi.h>
#include <esp_wifi.h>

static BLECharacteristic* statusChr = nullptr;
static String rx;
static volatile bool cfgReady = false;
static String cfgText;
static volatile bool connected = false;

bool wifiConnect(const Settings& s, uint32_t timeoutMs, bool lowLatency) {
  if (WiFi.status() == WL_CONNECTED) return true;
  WiFi.mode(WIFI_STA);
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);
  WiFi.setHostname("nodo-cam");
  WiFi.begin(s.ssid.c_str(), s.pass.c_str());
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < timeoutMs) delay(100);
  if (WiFi.status() != WL_CONNECTED) return false;
  if (lowLatency) {
    WiFi.setSleep(false);  // sin modem-sleep: latencia baja y estable (no permitido con BLE activo)
    esp_wifi_set_ps(WIFI_PS_NONE);
  }
  WiFi.setTxPower(WIFI_POWER_19_5dBm);
  return true;
}

static void notify(const String& msg) {
  Serial.printf("[ble] estado: %s\n", msg.c_str());
  if (!statusChr) return;
  statusChr->setValue((uint8_t*)msg.c_str(), msg.length());
  if (connected) statusChr->notify();
}

static String urlDecode(const String& in) {
  String out;
  out.reserve(in.length());
  for (size_t i = 0; i < in.length(); i++) {
    char c = in[i];
    if (c == '%' && i + 2 < in.length() && isxdigit(in[i + 1]) && isxdigit(in[i + 2])) {
      out += (char)strtol(in.substring(i + 1, i + 3).c_str(), nullptr, 16);
      i += 2;
    } else {
      out += c;
    }
  }
  return out;
}

// Aplica el texto recibido sobre `s`. false si falta ssid o hay valores fuera de rango.
static bool parseConfig(const String& text, Settings& s) {
  bool gotSsid = false;
  int pos = 0;
  while (pos < (int)text.length()) {
    int nl = text.indexOf('\n', pos);
    if (nl < 0) nl = text.length();
    String line = text.substring(pos, nl);
    pos = nl + 1;
    line.trim();
    int eq = line.indexOf('=');
    if (eq <= 0) continue;
    String k = line.substring(0, eq);
    String v = urlDecode(line.substring(eq + 1));
    if (k == "ssid") { s.ssid = v; gotSsid = v.length() > 0 && v.length() <= 32; }
    else if (k == "pass") s.pass = v;
    else if (k == "host") s.host = v;
    else if (k == "key") s.key = v;
    else if (k == "dev") s.dev = v;
    else if (k == "port") { long p = v.toInt(); if (p > 0 && p < 65536) s.port = (uint16_t)p; }
    else if (k == "tls") s.tls = (v == "1" || v == "true");
  }
  return gotSsid && s.pass.length() <= 63;
}

class ServerCb : public BLEServerCallbacks {
  void onConnect(BLEServer*) override { connected = true; }
  void onDisconnect(BLEServer* srv) override {
    connected = false;
    rx = "";
    srv->startAdvertising();  // permitir que el celular reintente
  }
};

class ConfigCb : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) override {
    auto v = c->getValue();
    if (cfgReady) return;  // ya hay una configuración pendiente de procesar
    rx += String(v.c_str());
    if (rx.length() > 600) { rx = ""; return; }  // protección: valores desmesurados
    if (rx.indexOf("\n\n") >= 0) {
      cfgText = rx;
      rx = "";
      cfgReady = true;  // se procesa en el bucle principal (no bloquear la tarea BLE)
    }
  }
};

[[noreturn]] void runProvisioning(Settings s) {
  char name[24];
  snprintf(name, sizeof(name), "NODO-CAM-%04X", (uint16_t)(ESP.getEfuseMac() >> 32));
  Serial.printf("[ble] modo configuración: busca \"%s\" desde el celular\n", name);

  BLEDevice::init(name);
  BLEServer* srv = BLEDevice::createServer();
  srv->setCallbacks(new ServerCb());
  BLEService* svc = srv->createService(BLE_SERVICE_UUID);
  BLECharacteristic* cfg = svc->createCharacteristic(BLE_CONFIG_UUID, BLECharacteristic::PROPERTY_WRITE);
  cfg->setCallbacks(new ConfigCb());
  statusChr = svc->createCharacteristic(BLE_STATUS_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  statusChr->addDescriptor(new BLE2902());
  svc->start();
  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(BLE_SERVICE_UUID);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
  notify("ready");

  uint32_t t0 = millis();
  for (;;) {
    if (cfgReady) {
      Settings next = s;
      String text = cfgText;
      if (!parseConfig(text, next)) {
        notify("fail:data");
      } else {
        notify("connecting");
        WiFi.disconnect(true);
        if (wifiConnect(next, 20000, false)) {
          String ip = WiFi.localIP().toString();
          // ¿se ve el backend desde esta red? (solo informativo: se guarda igual)
          WiFiClient probe;
          bool server = probe.connect(next.host.c_str(), next.port, 3000);
          probe.stop();
          settingsSave(next);
          notify((server ? "ok:" : "ok-noserver:") + ip);
          delay(2500);  // dar tiempo a que la notificación llegue al celular
          ESP.restart();
        }
        notify("fail:wifi");
      }
      cfgReady = false;
      t0 = millis();
    }
    if (millis() - t0 > PROVISION_TIMEOUT_MS) ESP.restart();  // reintentar con lo guardado
    delay(50);
  }
}
