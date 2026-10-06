#!/bin/sh
# Renderiza todos los .mmd a PNG con el tema unificado (escala 3). Uso: sh _tools/render.sh
# Nota: 01-casos-de-uso-uml se genera aparte con `python _tools/casos_de_uso.py`.
cd "$(dirname "$0")/.."
for f in analisis/mmd/*.mmd diseno/mmd/*.mmd gestion/mmd/*.mmd; do
  d=$(dirname "$(dirname "$f")"); b=$(basename "$f" .mmd)
  mkdir -p "$d/img"
  _tools/node_modules/.bin/mmdc -i "$f" -o "$d/img/$b.png" -p _tools/pp.json -c _tools/mermaid-theme.json -s 3 -b white -q || echo "FALLO $f"
done
