#!/bin/sh
# Renderiza todos los .puml de entregables a PNG+SVG en su carpeta img/. Uso: sh _tools/render-uml.sh
# PlantaUML no se comitea (22 MB): curl -Lo _tools/plantuml.jar https://github.com/plantuml/plantuml/releases/download/v1.2025.4/plantuml-1.2025.4.jar
cd "$(dirname "$0")/.."
find analisis diseno gestion -name "*.puml" -not -path "*/_v1/*" | while read -r f; do
  d=$(dirname "$(dirname "$f")")/img
  mkdir -p "$d"
  java -jar _tools/plantuml.jar -tpng -o "$d" "$f" || echo "FALLO $f"
  java -jar _tools/plantuml.jar -tsvg -o "$d" "$f" || echo "FALLO(svg) $f"
done
