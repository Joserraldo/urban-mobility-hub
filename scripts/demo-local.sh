#!/bin/sh
# Demo local: API/web (8080) + visión de cámara (8090) + túnel Cloudflare opcional.
# Uso: sh scripts/demo-local.sh   -> imprime la URL (pública si hay cloudflared) y el webhook de Bold.
cd "$(dirname "$0")/.." || exit 1
LOG=$(mktemp)
PIDS=""
cleanup() { [ -n "$PIDS" ] && kill $PIDS 2>/dev/null; rm -f "$LOG"; }
trap cleanup EXIT INT TERM

# Clave de ingesta: la de tu entorno o una nueva por sesión (>= 16 caracteres), igual para visión y API.
INGEST_KEY="${INGEST_KEY:-$(node -e 'console.log(require("crypto").randomBytes(16).toString("hex"))')}"
export INGEST_KEY

URL="http://localhost:8080"
if command -v cloudflared >/dev/null 2>&1; then
  cloudflared tunnel --url http://localhost:8080 >"$LOG" 2>&1 &
  PIDS="$PIDS $!"
  T=""
  for _ in $(seq 1 30); do
    T=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG" | head -1)
    [ -n "$T" ] && break
    sleep 1
  done
  if [ -n "$T" ]; then URL="$T"; else echo "No salió la URL del túnel; sigo solo en local."; fi
else
  echo "cloudflared no está instalado: sigo sin túnel (solo este PC)."
fi
echo "=============================================="
echo "URL         : $URL"
echo "Webhook Bold: $URL/api/payments/bold/webhook"
echo "Webcam PC   : http://localhost:8080/admin  ->  Cámara PC"
echo "=============================================="

[ -f vision-service/dist/server.mjs ] || npx esbuild vision-service/server.ts --bundle --platform=node --format=esm \
  --external:onnxruntime-node --external:sharp --outfile=vision-service/dist/server.mjs || exit 1
HOST=127.0.0.1 PORT=8090 UMH_DB_PATH=data/umh.db \
  HELMET_MODEL_PATH=models/helmet.onnx HELMET_LABELS_PATH=models/helmet.labels.json \
  node vision-service/dist/server.mjs &
PIDS="$PIDS $!"
set -a; [ -f .env.bold ] && . ./.env.bold; set +a
UMH_PUBLIC_URL="$URL" UMH_SEED_DEMO=1 npm run dev:api
