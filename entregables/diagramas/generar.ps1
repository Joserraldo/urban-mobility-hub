# Genera PNG + SVG de todos los diagramas PlantUML de esta carpeta.
# Requisitos: Java y plantuml.jar en esta misma carpeta (no se sube a git).
# Uso: powershell -File entregables\diagramas\generar.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
java -jar plantuml.jar -tpng -o ../img fuentes/*.puml
java -jar plantuml.jar -tsvg -o ../img fuentes/*.puml
Write-Host "Listo: imagenes en $PSScriptRoot\img"
