#pragma once
// Ajustes persistentes (NVS). Lo guardado por Bluetooth manda; secrets.h solo da valores por defecto.
#include <Arduino.h>
#include <Preferences.h>

#include "config.h"

struct Settings {
  String ssid, pass, host, key, dev;
  uint16_t port = SERVER_PORT;
  bool tls = USE_TLS;
  bool hasWifi() const { return ssid.length() > 0; }
};

static inline void settingsLoad(Settings& s) {
  Preferences p;
  p.begin("nodo", true);
  s.ssid = p.getString("ssid", WIFI_SSID);
  s.pass = p.getString("pass", WIFI_PASS);
  s.host = p.getString("host", SERVER_HOST);
  s.key = p.getString("key", INGEST_KEY);
  s.dev = p.getString("dev", DEVICE_ID);
  s.port = p.getUShort("port", SERVER_PORT);
  s.tls = p.getBool("tls", USE_TLS);
  p.end();
}

static inline void settingsSave(const Settings& s) {
  Preferences p;
  p.begin("nodo", false);
  p.putString("ssid", s.ssid);
  p.putString("pass", s.pass);
  p.putString("host", s.host);
  p.putString("key", s.key);
  p.putString("dev", s.dev);
  p.putUShort("port", s.port);
  p.putBool("tls", s.tls);
  p.end();
}

static inline void settingsClear() {
  Preferences p;
  p.begin("nodo", false);
  p.clear();
  p.end();
}
