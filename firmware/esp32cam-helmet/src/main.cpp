/*
 * NODO / Urban Mobility Hub — cámara de casco (ESP32-CAM AI-Thinker)
 *
 * Esta placa NO detecta nada: captura JPEG y los manda al backend (POST /api/camera/frame), que ejecuta el
 * modelo de cascos y decide. Diseño para el menor coste de red y CPU:
 *   - Una sola conexión TCP keep-alive reutilizada (sin handshake por fotograma, sin TLS salvo USE_TLS=1).
 *   - Cuerpo = JPEG crudo (sin base64 ni multipart) y cabecera construida de una sola vez.
 *   - Doble buffer en PSRAM + CAMERA_GRAB_LATEST: el driver captura por DMA mientras se transmite el anterior,
 *     y siempre se envía el fotograma MÁS RECIENTE (nunca uno viejo en cola).
 *   - El buffer se devuelve al driver en cuanto termina la escritura, antes de leer la respuesta.
 *   - El servidor responde {"ok":1,"h":0|1,"c":0-100,"n":ms}: `n` es el intervalo hasta el próximo fotograma
 *     (rápido solo mientras un usuario espera el casco; lento en reposo). La placa lo obedece.
 *   - Wi-Fi sin ahorro de energía (latencia mínima) y vigilante que reconecta o reinicia si se atasca.
 */
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_camera.h>

#include "config.h"
#include "provisioning.h"
#include "settings.h"

// El transporte (HTTP o HTTPS) se elige en tiempo de ejecución según lo configurado por Bluetooth.
static WiFiClient plainNet;
static WiFiClientSecure tlsNet;
static Client* net = &plainNet;
static Settings cfg;

// ---- Pines AI-Thinker ESP32-CAM ---------------------------------------------------------------
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

struct Ack {
  bool valid = false;
  int status = 0;
  int helmet = 0;
  int conf = 0;
  uint32_t nextMs = DEFAULT_INTERVAL_MS;
};

static uint32_t lastAckAt = 0;
static uint32_t nextSendAt = 0;
static int camFailures = 0;
static bool softJpeg = false;  // sensor sin JPEG por hardware: se captura RGB565 y se comprime en el ESP32

// Estadísticas (se imprimen cada 5 s)
static uint32_t stFrames = 0, stBytes = 0, stRttSum = 0, stErrors = 0, stSince = 0;

// ---- Cámara -----------------------------------------------------------------------------------
static bool initCamera() {
  camera_config_t c = {};
  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM;
  c.pin_d1 = Y3_GPIO_NUM;
  c.pin_d2 = Y4_GPIO_NUM;
  c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM;
  c.pin_d5 = Y7_GPIO_NUM;
  c.pin_d6 = Y8_GPIO_NUM;
  c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk = XCLK_GPIO_NUM;
  c.pin_pclk = PCLK_GPIO_NUM;
  c.pin_vsync = VSYNC_GPIO_NUM;
  c.pin_href = HREF_GPIO_NUM;
  c.pin_sccb_sda = SIOD_GPIO_NUM;
  c.pin_sccb_scl = SIOC_GPIO_NUM;
  c.pin_pwdn = PWDN_GPIO_NUM;
  c.pin_reset = RESET_GPIO_NUM;
  c.xclk_freq_hz = 20000000;
  c.pixel_format = PIXFORMAT_JPEG;  // el sensor comprime por hardware: cero CPU del ESP32
  c.frame_size = CAM_FRAME_SIZE;
  c.jpeg_quality = CAM_JPEG_QUALITY;
  c.fb_count = 2;  // doble buffer: captura y transmisión se solapan
  c.fb_location = CAMERA_FB_IN_PSRAM;
  c.grab_mode = CAMERA_GRAB_LATEST;  // siempre el fotograma más reciente

  if (!psramFound()) {
    // Sin PSRAM no caben 2 buffers VGA: degradar en vez de fallar.
    c.frame_size = FRAMESIZE_QVGA;
    c.fb_count = 1;
    c.fb_location = CAMERA_FB_IN_DRAM;
    c.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  }

  esp_err_t err = esp_camera_init(&c);
  if (err == ESP_ERR_NOT_SUPPORTED) {
    // Este módulo trae un sensor sin compresión JPEG (p. ej. clones OV7670/GC0308): RGB565 + JPEG por software.
    Serial.println("[cam] el sensor no tiene JPEG por hardware: usando RGB565 + compresion por software");
    esp_camera_deinit();
    c.pixel_format = PIXFORMAT_RGB565;
    c.xclk_freq_hz = 10000000;  // sin comprimir el bus va justo: reloj más lento evita perder líneas (EV-EOF-OVF)
    framesize_t tries[] = {CAM_FRAME_SIZE, FRAMESIZE_QVGA};
    for (framesize_t fs : tries) {
      c.frame_size = fs;
      err = esp_camera_init(&c);
      if (err != ESP_OK) {
        esp_camera_deinit();
        continue;
      }
      camera_fb_t* probe = esp_camera_fb_get();  // prueba real: ¿llegan fotogramas completos?
      if (probe) {
        Serial.printf("[cam] RGB565 %ux%u ok\n", probe->width, probe->height);
        esp_camera_fb_return(probe);
        softJpeg = true;
        break;
      }
      Serial.println("[cam] fotogramas incompletos, probando resolucion menor");
      esp_camera_deinit();
      err = ESP_FAIL;
    }
  }
  if (err != ESP_OK) {
    Serial.printf("[cam] error de init 0x%x\n", err);
    return false;
  }
  sensor_t* s = esp_camera_sensor_get();
  if (s) {
    if (s->set_brightness) s->set_brightness(s, 0);
    if (s->set_whitebal) s->set_whitebal(s, 1);
    if (s->set_exposure_ctrl) s->set_exposure_ctrl(s, 1);
    if (s->set_gain_ctrl) s->set_gain_ctrl(s, 1);
    if (s->set_aec2) s->set_aec2(s, 1);       // exposición automática mejorada: mejor con contraluz (cielo/calle)
    if (s->set_lenc) s->set_lenc(s, 1);
    if (s->set_dcw) s->set_dcw(s, 1);
  }
  // Descartar los primeros fotogramas (exposición aún sin estabilizar)
  for (int i = 0; i < 3; i++) {
    camera_fb_t* fb = esp_camera_fb_get();
    if (fb) esp_camera_fb_return(fb);
  }
  return true;
}

// ---- Red --------------------------------------------------------------------------------------
static bool openSocket() {
  if (net->connected()) return true;
  net->stop();
  bool ok;
  if (cfg.tls) {
    net = &tlsNet;
    tlsNet.setInsecure();  // laboratorio. En producción: tlsNet.setCACert(...) con la CA del servidor.
    ok = tlsNet.connect(cfg.host.c_str(), cfg.port, 4000);
    if (ok) tlsNet.setNoDelay(true);
  } else {
    net = &plainNet;
    ok = plainNet.connect(cfg.host.c_str(), cfg.port, 3000);
    if (ok) plainNet.setNoDelay(true);  // sin Nagle: el ack llega sin esperar
  }
  if (ok) net->setTimeout(HTTP_TIMEOUT_MS);
  return ok;
}

// ---- Protocolo --------------------------------------------------------------------------------
// Extrae un entero de un JSON plano {"k":123,...} sin reservar memoria. -1 si no está.
static long jsonInt(const char* body, const char* key) {
  char pat[8];
  snprintf(pat, sizeof(pat), "\"%s\":", key);
  const char* p = strstr(body, pat);
  return p ? strtol(p + strlen(pat), nullptr, 10) : -1;
}

static bool readAck(Ack& ack) {
  String line = net->readStringUntil('\n');
  if (line.length() < 12) {
    Serial.printf("[net] respuesta vacia (%u)\n", (unsigned)line.length());
    return false;
  }  // sin respuesta (conexión cerrada por el servidor)
  ack.status = line.substring(9, 12).toInt();
  int contentLength = 0;
  bool close = false;
  for (;;) {
    line = net->readStringUntil('\n');
    if (line.length() == 0) return false;
    if (line == "\r") break;
    line.toLowerCase();
    if (line.startsWith("content-length:")) contentLength = line.substring(15).toInt();
    else if (line.startsWith("connection:") && line.indexOf("close") > 0) close = true;
  }
  char body[160] = {0};
  if (contentLength > 0) {
    size_t n = net->readBytes(body, min<int>(contentLength, sizeof(body) - 1));
    for (int left = contentLength - (int)n; left > 0; left--) net->read();  // drenar lo que sobre
  }
  if (close) net->stop();
  if (ack.status == 200) {
    long h = jsonInt(body, "h"), c = jsonInt(body, "c"), n = jsonInt(body, "n");
    if (h >= 0 && n > 0) {
      ack.helmet = (int)h;
      ack.conf = (int)max(c, 0L);
      ack.nextMs = constrain((uint32_t)n, MIN_INTERVAL_MS, MAX_INTERVAL_MS);
      ack.valid = true;
    }
  } else {
    Serial.printf("[srv] HTTP %d %s\n", ack.status, body);
  }
  return true;
}

// Escribe TODO el buffer en trozos: WiFiClientSecure puede devolver escrituras parciales con buffers grandes.
static bool writeAll(const uint8_t* buf, size_t len) {
  size_t off = 0;
  uint32_t stall = millis();
  while (off < len) {
    size_t n = min<size_t>(len - off, 1436);
    int w = net->write(buf + off, n);
    if (w > 0) {
      off += w;
      stall = millis();
    } else {
      if (!net->connected() || millis() - stall > 3000) return false;
      delay(2);
    }
  }
  return true;
}

// Escribe cabecera + JPEG en el socket. false = fallo de red.
static bool writeFrame(const uint8_t* buf, size_t len) {
  char head[384];
  int hl = snprintf(head, sizeof(head),
                    "POST /api/camera/frame HTTP/1.1\r\n"
                    "Host: %s:%u\r\n"
                    "x-ingest-key: %s\r\n"
                    "x-device-id: %s\r\n"
                    "Content-Type: image/jpeg\r\n"
                    "Content-Length: %u\r\n"
                    "Connection: keep-alive\r\n\r\n",
                    cfg.host.c_str(), (unsigned)cfg.port, cfg.key.c_str(), cfg.dev.c_str(), (unsigned)len);
  if (hl <= 0 || hl >= (int)sizeof(head)) return false;
  return writeAll((const uint8_t*)head, hl) && writeAll(buf, len);
}

// ---- Arranque / bucle -------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  pinMode(PIN_FLASH, OUTPUT);
  digitalWrite(PIN_FLASH, LOW);
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, HIGH);  // apagado (activo en bajo)
  settingsLoad(cfg);
  Serial.printf("\n[nodo-cam] %s -> %s:%u%s\n", cfg.dev.c_str(), cfg.host.c_str(), cfg.port, cfg.tls ? " (TLS)" : "");

  // Sin Wi-Fi guardado, o sin poder conectar: modo Bluetooth (la cámara ni se inicia, para dejar la memoria al BLE).
  if (!cfg.hasWifi() || !wifiConnect(cfg, WIFI_CONNECT_TIMEOUT_MS)) {
    Serial.println("[wifi] sin conexion -> configuracion por Bluetooth");
    runProvisioning(cfg);
  }
  Serial.printf("[wifi] conectado %s  RSSI %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());

  if (!initCamera()) {
    Serial.println("[cam] fallo de camara, reiniciando en 5 s");
    delay(5000);
    ESP.restart();
  }
  lastAckAt = millis();
  stSince = millis();
}

void loop() {
  uint32_t now = millis();

  // Vigilante: sin ningún ack válido durante mucho tiempo → reconectar, y si persiste, reiniciar.
  if (now - lastAckAt > STALL_REBOOT_MS) ESP.restart();
  if (now - lastAckAt > STALL_RECONNECT_MS && WiFi.status() == WL_CONNECTED) {
    Serial.println("[wd] sin respuesta, reconectando Wi-Fi");
    net->stop();
    WiFi.disconnect();
    lastAckAt = now - STALL_RECONNECT_MS + 5000;
  }
  if (WiFi.status() != WL_CONNECTED) {
    // setAutoReconnect ya lo intenta; pasado 1 min se reinicia: si sigue sin red arrancará en modo Bluetooth.
    net->stop();
    if (now - lastAckAt > 60000) ESP.restart();
    delay(200);
    return;
  }

  // Comando por serie para borrar la configuración guardada:  wifi-reset
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "wifi-reset") {
      settingsClear();
      Serial.println("[cfg] configuracion borrada, reiniciando");
      delay(200);
      ESP.restart();
    }
  }

  // Respetar el intervalo que pidió el servidor (medido de inicio a inicio de envío).
  int32_t wait = (int32_t)(nextSendAt - now);
  if (wait > 0) {
    delay(wait > 50 ? 50 : wait);  // troceado para poder atender el vigilante
    return;
  }

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    if (++camFailures >= 10) ESP.restart();
    delay(50);
    return;
  }
  camFailures = 0;

  const uint8_t* jbuf = fb->buf;
  size_t frameLen = fb->len;
  uint8_t* conv = nullptr;
  if (softJpeg) {
    // Comprimir a JPEG aquí (calidad 0-100) y devolver el buffer crudo al driver cuanto antes.
    bool okc = fmt2jpg(fb->buf, fb->len, fb->width, fb->height, fb->format, 60, &conv, &frameLen);
    esp_camera_fb_return(fb);
    fb = nullptr;
    if (!okc || !conv) {
      delay(50);
      return;
    }
    jbuf = conv;
  }

  uint32_t t0 = millis();
  Ack ack;
  bool wasOpen = net->connected();
  bool wrote = openSocket() && writeFrame(jbuf, frameLen);
  if (!wrote && wasOpen) {
    // La conexión keep-alive había caducado en el servidor: reabrir y reintentar UNA vez con el mismo fotograma.
    net->stop();
    wrote = openSocket() && writeFrame(jbuf, frameLen);
  }
  if (fb) esp_camera_fb_return(fb);  // el driver reutiliza el buffer mientras esperamos la respuesta
  if (conv) free(conv);
  bool ok = false;
  if (wrote) {
    stBytes += frameLen;
    ok = readAck(ack);
  }
  if (!ok) {
    net->stop();
    stErrors++;
  }

  if (ok && ack.valid) {
    uint32_t rtt = millis() - t0;
    stFrames++;
    stRttSum += rtt;
    lastAckAt = millis();
    digitalWrite(PIN_STATUS_LED, ack.helmet ? LOW : HIGH);
    nextSendAt = t0 + ack.nextMs;
  } else {
    nextSendAt = t0 + (ok ? 3000 : 1000);  // error de servidor o de red: no martillear
  }

  if (millis() - stSince >= 5000) {
    float secs = (millis() - stSince) / 1000.0f;
    Serial.printf("[stat] %.1f fps  %.0f kB/s  rtt %lu ms  err %lu  casco=%d (%d%%)  RSSI %d\n", stFrames / secs,
                  stBytes / 1024.0f / secs, stFrames ? (unsigned long)(stRttSum / stFrames) : 0UL,
                  (unsigned long)stErrors, ack.helmet, ack.conf, WiFi.RSSI());
    stFrames = stBytes = stRttSum = stErrors = 0;
    stSince = millis();
  }
}
