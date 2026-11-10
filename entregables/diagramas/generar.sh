#!/bin/sh
# Genera PNG + SVG de todos los diagramas PlantUML de esta carpeta.
# Requisitos: Java y plantuml.jar (en esta carpeta o en ../_tools). Graphviz es opcional:
#   sudo apt install graphviz
# Los diagramas que declaran `!pragma layout elk` usan ELK (viene dentro del jar). Los demás usan
# Graphviz si existe; si no, el motor interno Smetana (funciona, pero ordena peor los grandes).
# Uso: sh entregables/diagramas/generar.sh
cd "$(dirname "$0")"
JAR=plantuml.jar; [ -f "$JAR" ] || JAR=../_tools/plantuml.jar
if command -v dot >/dev/null 2>&1; then FALLBACK=""; else
  echo "Aviso: no hay Graphviz; los diagramas sin ELK usan Smetana."; FALLBACK="-Playout=smetana"; fi
for f in fuentes/*.puml; do
  if grep -q '^!pragma layout' "$f"; then L=""; else L="$FALLBACK"; fi
  for t in png svg; do
    java -DPLANTUML_LIMIT_SIZE=8192 -jar "$JAR" $L -t$t -o ../img "$f" || echo "FALLO $t $f"
  done
done
# 01 y 02 (Python + matplotlib) y 24 (Mermaid) se generan aparte:
#   python fuentes/01-contexto-srs.py ; python fuentes/02-casos-de-uso-general.py
#   npx -p @mermaid-js/mermaid-cli mmdc -i fuentes/24-matriz-riesgos.mmd -o img/24-matriz-riesgos.png -s 3 -b white
