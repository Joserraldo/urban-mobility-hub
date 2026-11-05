#!/bin/sh
# Genera PNG + SVG de todos los diagramas PlantUML de esta carpeta.
# Requisitos: Java, Graphviz (sudo apt install graphviz) y plantuml.jar en esta carpeta
# (no se sube a git):
#   curl -Lo plantuml.jar https://github.com/plantuml/plantuml/releases/download/v1.2025.4/plantuml-1.2025.4.jar
# Sin Graphviz usa el motor interno (Smetana): funciona, pero ordena peor los diagramas grandes.
# Uso: sh entregables/diagramas/generar.sh
cd "$(dirname "$0")"
if command -v dot >/dev/null 2>&1; then LAYOUT=""; else
  echo "Aviso: no hay Graphviz; se usa el motor interno (Smetana)."; LAYOUT="-Playout=smetana"; fi
java -jar plantuml.jar $LAYOUT -tpng -o ../img fuentes/*.puml || echo "FALLO png"
java -jar plantuml.jar $LAYOUT -tsvg -o ../img fuentes/*.puml || echo "FALLO svg"
# 01 y 02 (Python + matplotlib) y 24 (Mermaid) se generan aparte:
#   python fuentes/01-contexto-srs.py ; python fuentes/02-casos-de-uso-general.py
#   npx -p @mermaid-js/mermaid-cli mmdc -i fuentes/24-matriz-riesgos.mmd -o img/24-matriz-riesgos.png -s 3 -b white
